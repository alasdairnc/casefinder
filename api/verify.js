// /api/verify.js — Vercel Serverless Function
// Batch-verifies AI-generated case citations against the CanLII API.
// Degrades gracefully when CANLII_API_KEY is not set.

import { checkRateLimit, getClientIp, rateLimitHeaders } from "./_rateLimit.js";
import { randomUUID } from "crypto";
import {
  parseCitation,
  buildCaseId,
  buildApiUrl,
  buildCaseUrl,
  buildSearchUrl,
  partiesMatch,
} from "../src/lib/canlii.js";
import { lookupSection, normalizeSection } from "../src/lib/criminalCodeData.js";
import { lookupCharterSection } from "../src/lib/charterData.js";
import { lookupCivilLawSection } from "../src/lib/civilLawData.js";
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
const CHARTER_PATTERN = /^(canadian\s+)?charter(\s+of\s+rights\s+and\s+freedoms)?,?\s*s\.\s*\d+|^s\.\s*\d+\s*(\(\w+\))?$/i;

// Matches civil law statute citations with a statute name prefix
const CIVIL_LAW_PATTERN = /\b(CDSA|YCJA|CHRA|CEA|CCRA|HTA|MVA|TSA|AHRA|HRC|controlled drugs|youth criminal justice|canadian human rights|human rights code|human rights act|canada evidence|corrections and conditional release|highway traffic|motor vehicle|residential tenanc|traffic safety)\b/i;

// Explicit Criminal Code check
const EXPLICIT_CC_PATTERN = /\b(criminal\s+code|CC)\b/i;


export default async function handler(req, res) {
  const requestId = req.headers['x-vercel-id'] || randomUUID();
  const startMs = Date.now();
  logRequestStart(req, "verify", requestId);
  const origin = req.headers.origin ?? "";
  const allowed = ["https://casedive.ca", "https://www.casedive.ca", "https://casefinder-project.vercel.app"];
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'none'");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json")) {
    logValidationError(requestId, "verify", "Invalid Content-Type", "content-type");
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 50_000) {
    logValidationError(requestId, "verify", "Request body too large", "content-length");
    return res.status(413).json({ error: "Request body too large" });
  }

  const rlResult = await checkRateLimit(getClientIp(req), "verify");
  logRateLimitCheck(requestId, "verify", rlResult, getClientIp(req));
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (!rlResult.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
  }

  const { citations } = req.body;

  if (!Array.isArray(citations) || citations.length === 0) {
    logValidationError(requestId, "verify", "citations array is required", "citations");
    return res.status(400).json({ error: "citations array is required" });
  }
  if (citations.length > 10) {
    logValidationError(requestId, "verify", "Too many citations", "citations");
    return res.status(400).json({ error: "Maximum 10 citations per request." });
  }

  const apiKey = process.env.CANLII_API_KEY || "";
  const results = {};

  // Process in batches of 3 to avoid hammering the CanLII API with 10 simultaneous requests.
  const CONCURRENCY = 3;
  const processCitation = async (rawCitation) => {
      if (!rawCitation || typeof rawCitation !== "string") {
        results[rawCitation] = { status: "unparseable", searchUrl: buildSearchUrl(rawCitation || "") };
        return;
      }
      // Sanitize: enforce length limit and strip non-printable characters
      const citation = rawCitation.slice(0, 500).replace(/[\x00-\x1F\x7F]/g, "").trim();
      if (!citation) {
        results[rawCitation] = { status: "unparseable", searchUrl: buildSearchUrl("") };
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
      if (CRIMINAL_CODE_PATTERN.test(citation)) {
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
        results[citation] = { status: "unparseable", searchUrl: buildSearchUrl(citation) };
        return;
      }

      if (!parsed.apiDbId) {
        results[citation] = { status: "unknown_court", searchUrl: buildSearchUrl(citation) };
        return;
      }

      const caseId = buildCaseId({ 
        year: parsed.year, 
        courtCode: parsed.courtCode, 
        number: parsed.number,
        isLegacy: parsed.isLegacy 
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
        logExternalApiCall(requestId, "verify", "canlii", apiRes.status, apiDurationMs);

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
        logError(requestId, "verify", err, 500, 0, { citationIndex: citations.indexOf(rawCitation) });
        results[citation] = { status: "error", searchUrl };
      }
  };

  for (let i = 0; i < citations.length; i += CONCURRENCY) {
    await Promise.all(citations.slice(i, i + CONCURRENCY).map(processCitation));
  }

  logSuccess(requestId, "verify", 200, Date.now() - startMs, rlResult, { citationsProcessed: citations.length });
  return res.status(200).json(results);
}
