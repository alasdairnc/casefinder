// /api/verify.js — Vercel Serverless Function
// Batch-verifies AI-generated case citations against the CanLII API.
// Degrades gracefully when CANLII_API_KEY is not set.

import {
  redis,
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_rateLimit.js";
import { randomUUID, createHash } from "crypto";
import {
  applyStandardApiHeaders,
  handleOptionsAndMethod,
  validateJsonRequest,
} from "./_apiCommon.js";
import {
  parseCitation,
  buildCaseId,
  buildApiUrl,
  buildCaseUrl,
  buildSearchUrl,
  partiesMatch,
} from "../src/lib/canlii.js";
import {
  lookupSection,
  normalizeSection,
} from "../src/lib/criminalCodeData.js";
import { lookupCharterSection } from "../src/lib/charterData.js";
import { lookupCivilLawSection } from "../src/lib/civilLawData.js";
import { API_REDIS_TIMEOUT_MS } from "./_constants.js";
import {
  logRequestStart,
  logRateLimitCheck,
  logValidationError,
  logExternalApiCall,
  logSuccess,
  logError,
} from "./_logging.js";

// Matches bare Criminal Code section references like "s. 348(1)(b)", "section 7", "348"
const CRIMINAL_CODE_PATTERN = /^(s\.\s*|section\s+)?\d+/i;

// Matches Charter citations: "s. 7", "s. 11(b)", "Charter s. 24(2)", "section 8"
const CHARTER_PATTERN =
  /^(canadian\s+)?charter(\s+of\s+rights\s+and\s+freedoms)?,?\s*s\.\s*\d+|^s\.\s*\d+\s*(\(\w+\))?$/i;

// Matches civil law statute citations with a statute name prefix
const CIVIL_LAW_PATTERN =
  /\b(CDSA|YCJA|CHRA|CEA|CCRA|HTA|MVA|TSA|AHRA|HRC|controlled drugs|youth criminal justice|canadian human rights|human rights code|human rights act|canada evidence|corrections and conditional release|highway traffic|motor vehicle|residential tenanc|traffic safety)\b/i;

// Explicit Criminal Code check
const EXPLICIT_CC_PATTERN = /\b(criminal\s+code|CC)\b/i;

export default async function handler(req, res) {
  const requestId = req.headers["x-vercel-id"] || randomUUID();
  const startMs = Date.now();
  logRequestStart(req, "verify", requestId);
  applyStandardApiHeaders(req, res, "POST, OPTIONS", "Content-Type");

  if (handleOptionsAndMethod(req, res, "POST")) return;
  if (
    !validateJsonRequest(req, res, {
      requestId,
      endpoint: "verify",
      maxBytes: 50_000,
      logValidationError,
    })
  ) {
    return;
  }

  const rlResult = await checkRateLimit(getClientIp(req), "verify");
  logRateLimitCheck(requestId, "verify", rlResult, getClientIp(req));
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (!rlResult.allowed) {
    return res
      .status(429)
      .json({ error: "Rate limit exceeded. Please try again later." });
  }

  const { citations } = req.body;

  if (!Array.isArray(citations) || citations.length === 0) {
    logValidationError(
      requestId,
      "verify",
      "citations array is required",
      "citations",
    );
    return res.status(400).json({ error: "citations array is required" });
  }
  if (citations.length > 10) {
    logValidationError(requestId, "verify", "Too many citations", "citations");
    return res.status(400).json({ error: "Maximum 10 citations per request." });
  }

  const cacheKey = `cache:verify:${createHash("sha256").update(JSON.stringify(citations)).digest("hex")}`;
  if (redis) {
    try {
      const timeoutGet = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), API_REDIS_TIMEOUT_MS),
      );
      const cached = await Promise.race([redis.get(cacheKey), timeoutGet]);
      if (cached) {
        logSuccess(requestId, "verify", 200, Date.now() - startMs, rlResult, {
          cached: true,
          citationsProcessed: citations.length,
        });
        return res
          .status(200)
          .json(typeof cached === "string" ? JSON.parse(cached) : cached);
      }
    } catch (err) {}
  }

  const apiKey = process.env.CANLII_API_KEY || "";
  const results = {};

  // Process in batches of 3 to avoid hammering the CanLII API with 10 simultaneous requests.
  const CONCURRENCY = 3;
  const processCitation = async (rawCitation) => {
    if (!rawCitation || typeof rawCitation !== "string") {
      results[rawCitation] = {
        status: "unparseable",
        searchUrl: buildSearchUrl(rawCitation || ""),
      };
      return;
    }
    // Sanitize: enforce length limit and strip non-printable characters
    const citation = rawCitation
      .slice(0, 500)
      .replace(/[\x00-\x1F\x7F]/g, "")
      .trim();
    if (!citation) {
      results[rawCitation] = {
        status: "unparseable",
        searchUrl: buildSearchUrl(""),
      };
      return;
    }

    // 1. Check for explicit Criminal Code references (e.g., "Criminal Code s. 348")
    if (EXPLICIT_CC_PATTERN.test(citation)) {
      const entry = lookupSection(citation);
      if (entry) {
        results[citation] = {
          status: "verified",
          url: entry.url,
          searchUrl: buildSearchUrl(citation),
          title: entry.title,
          severity: entry.severity,
          maxPenalty: entry.maxPenalty,
        };
        return;
      }
      // If not in main CC, check sentencing subset in civil law
      const foundCivil = lookupCivilLawSection(citation);
      if (foundCivil) {
        results[citation] = {
          status: "verified",
          url: foundCivil.entry.url,
          searchUrl: buildSearchUrl(citation),
          title: foundCivil.entry.title,
          statute: foundCivil.entry.statute,
          jurisdiction: foundCivil.entry.jurisdiction,
        };
        return;
      }
    }

    // 2. Civil law statute citations (CDSA, YCJA, CHRA, etc.)
    if (CIVIL_LAW_PATTERN.test(citation)) {
      const found = lookupCivilLawSection(citation);
      if (found) {
        results[citation] = {
          status: "verified",
          url: found.entry.url,
          searchUrl: buildSearchUrl(citation),
          title: found.entry.title,
          statute: found.entry.statute,
          jurisdiction: found.entry.jurisdiction,
        };
      } else {
        results[citation] = {
          status: "unverified",
          searchUrl: buildSearchUrl(citation),
        };
      }
      return;
    }

    // 3. Charter citations with explicit "Charter" prefix — validate against Charter DB
    if (/charter/i.test(citation)) {
      const entry = lookupCharterSection(citation);
      if (entry) {
        results[citation] = {
          status: "verified",
          url: entry.url,
          searchUrl: buildSearchUrl(citation),
          title: entry.title,
          part: entry.part,
        };
      } else {
        results[citation] = {
          status: "unverified",
          url: "https://laws-lois.justice.gc.ca/eng/const/page-15.html",
          searchUrl: buildSearchUrl(citation),
        };
      }
      return;
    }

    // 4. Bare section references (could be CC or Charter)
    // Guard: skip if this parses as a case citation — year-like numbers (e.g. [1992] in SCR
    // citations) must not be misclassified as Criminal Code section numbers.
    if (CRIMINAL_CODE_PATTERN.test(citation) && !parseCitation(citation)) {
      const sectionNum = normalizeSection(citation);
      const num = parseFloat(sectionNum);

      // Prioritize Charter for bare references in the 1-35 range (except if explicitly specified as CC earlier)
      if (num >= 1 && num <= 35) {
        const charterEntry = lookupCharterSection(citation);
        if (charterEntry) {
          results[citation] = {
            status: "verified",
            url: charterEntry.url,
            searchUrl: buildSearchUrl(citation),
            title: charterEntry.title,
            part: charterEntry.part,
          };
          return;
        }
      }

      // Otherwise check Criminal Code
      const entry = lookupSection(citation);
      if (entry) {
        results[citation] = {
          status: "verified",
          url: entry.url,
          searchUrl: buildSearchUrl(citation),
          title: entry.title,
          severity: entry.severity,
          maxPenalty: entry.maxPenalty,
        };
      } else {
        // Final check for Charter (in case it wasn't caught by the 1-35 check)
        const charterEntry = lookupCharterSection(citation);
        if (charterEntry) {
          results[citation] = {
            status: "verified",
            url: charterEntry.url,
            searchUrl: buildSearchUrl(citation),
            title: charterEntry.title,
          };
        } else {
          // Unverified section — format is valid but not in our lookup
          const url = sectionNum
            ? `https://laws-lois.justice.gc.ca/eng/acts/c-46/section-${sectionNum}.html`
            : "https://laws-lois.justice.gc.ca/eng/acts/c-46/";
          results[citation] = {
            status: "unverified",
            url,
            searchUrl: buildSearchUrl(citation),
          };
        }
      }
      return;
    }

    const parsed = parseCitation(citation);

    if (!parsed) {
      results[citation] = {
        status: "unparseable",
        searchUrl: buildSearchUrl(citation),
      };
      return;
    }

    if (!parsed.apiDbId) {
      results[citation] = {
        status: "unknown_court",
        searchUrl: buildSearchUrl(citation),
      };
      return;
    }

    const caseId = buildCaseId({
      year: parsed.year,
      courtCode: parsed.courtCode,
      number: parsed.number,
      isLegacy: parsed.isLegacy,
    });

    const searchUrl = buildSearchUrl(citation);

    if (!caseId) {
      // Valid citation format but no direct CanLII ID (e.g. SCR citation)
      results[citation] = { status: "unverified", searchUrl };
      return;
    }

    const caseUrl = buildCaseUrl(parsed.webDbId, parsed.year, caseId);

    if (!apiKey) {
      results[citation] = { status: "unverified", url: caseUrl, searchUrl };
      return;
    }

    try {
      const apiStartMs = Date.now();
      const apiRes = await fetch(buildApiUrl(parsed.apiDbId, caseId, apiKey), {
        signal: AbortSignal.timeout(8_000),
      });
      const apiDurationMs = Date.now() - apiStartMs;
      logExternalApiCall(
        requestId,
        "verify",
        "canlii",
        apiRes.status,
        apiDurationMs,
      );

      if (apiRes.status === 404) {
        // Pre-2000 cases use legacy CanLII IDs — constructed URL won't resolve, use search instead
        results[citation] = { status: "unverified", searchUrl };
        return;
      }
      if (!apiRes.ok) {
        results[citation] = { status: "error", searchUrl };
        return;
      }

      const ct = apiRes.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        results[citation] = { status: "error", searchUrl };
        return;
      }
      const data = await apiRes.json();
      const canliiTitle = data.title || "";
      if (!partiesMatch(parsed.parties, canliiTitle)) {
        results[citation] = { status: "not_found", searchUrl };
        return;
      }
      results[citation] = {
        status: "verified",
        url: caseUrl,
        searchUrl,
        title: canliiTitle || citation,
      };
    } catch (err) {
      logError(requestId, "verify", err, 500, 0, {
        citationIndex: citations.indexOf(rawCitation),
      });
      results[citation] = { status: "error", searchUrl };
    }
  };

  for (let i = 0; i < citations.length; i += CONCURRENCY) {
    await Promise.all(citations.slice(i, i + CONCURRENCY).map(processCitation));
  }

  if (redis) {
    try {
      const timeoutSet = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), API_REDIS_TIMEOUT_MS),
      );
      await Promise.race([
        redis.setex(cacheKey, 7 * 24 * 60 * 60, JSON.stringify(results)),
        timeoutSet,
      ]);
    } catch (err) {}
  }

  logSuccess(requestId, "verify", 200, Date.now() - startMs, rlResult, {
    citationsProcessed: citations.length,
  });
  return res.status(200).json(results);
}
