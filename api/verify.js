// /api/verify.js — Vercel Serverless Function
// Batch-verifies AI-generated case citations against the CanLII API.
// Degrades gracefully when CANLII_API_KEY is not set.

import { checkRateLimit, getClientIp, rateLimitHeaders } from "./_rateLimit.js";
import {
  parseCitation,
  buildCaseId,
  buildApiUrl,
  buildCaseUrl,
  buildSearchUrl,
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

// Matches bare Criminal Code section references like "s. 348(1)(b)" or "s. 7"
// (no statute name prefix — those are handled by civil law lookup)
const CRIMINAL_CODE_PATTERN = /^s\.\s*\d+/i;

// Matches Charter citations: "s. 7", "s. 11(b)", "Charter s. 24(2)", "section 8"
const CHARTER_PATTERN = /^(canadian\s+)?charter(\s+of\s+rights\s+and\s+freedoms)?,?\s*s\.\s*\d+|^s\.\s*\d+\s*(\(\w+\))?$/i;

// Matches civil law statute citations with a statute name prefix
const CIVIL_LAW_PATTERN = /\b(CDSA|YCJA|CHRA|CEA|CCRA|controlled drugs|youth criminal justice|canadian human rights|canada evidence|corrections and conditional release|criminal code)\b/i;

// Fallback: search CanLII by party name + year when direct case ID lookup returns 404.
// Handles pre-2000 cases that predate the neutral citation system.
// Returns the first matching case object, or null if not found / API error.
async function searchCanLII(dbId, parties, year, apiKey) {
  const query = encodeURIComponent(`${parties} ${year}`);
  const url = `https://api.canlii.org/v1/cases?db=${dbId}&keywords=${query}`;
  const apiRes = await fetch(url, {
    headers: { Authorization: `apikey ${apiKey}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!apiRes.ok) return null;
  const ct = apiRes.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  const data = await apiRes.json();
  const cases = data?.cases;
  if (!Array.isArray(cases) || cases.length === 0) return null;
  // Prefer a case whose ID starts with the expected year (most relevant match)
  return cases.find((c) => String(c.caseId || "").startsWith(year)) || cases[0] || null;
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).slice(2, 10);
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

  const rlResult = await checkRateLimit(getClientIp(req));
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

  await Promise.all(
    citations.map(async (rawCitation) => {
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

      // Civil law statute citations (CDSA, YCJA, CHRA, etc.) — validate against local DB
      if (CIVIL_LAW_PATTERN.test(citation.trim())) {
        const found = lookupCivilLawSection(citation);
        if (found) {
          results[citation] = {
            status: "verified",
            url: found.entry.url,
            searchUrl: buildSearchUrl(citation),
            title: found.entry.title,
            statute: found.entry.statute,
          };
        } else {
          results[citation] = {
            status: "unverified",
            searchUrl: buildSearchUrl(citation),
          };
        }
        return;
      }

      // Charter citations with explicit "Charter" prefix — validate against Charter DB
      if (/charter/i.test(citation.trim())) {
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

      // Bare Criminal Code section references — validate against lookup table
      if (CRIMINAL_CODE_PATTERN.test(citation.trim())) {
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
          // Section format is valid but not in our lookup — could be real, we just can't confirm
          const sectionNum = normalizeSection(citation);
          const url = sectionNum
            ? `https://laws-lois.justice.gc.ca/eng/acts/c-46/section-${sectionNum}.html`
            : "https://laws-lois.justice.gc.ca/eng/acts/c-46/";
          results[citation] = {
            status: "unverified",
            url,
            searchUrl: buildSearchUrl(citation),
          };
        }
        return;
      }

      const parsed = parseCitation(citation);

      if (!parsed) {
        results[citation] = { status: "unparseable", searchUrl: buildSearchUrl(citation) };
        return;
      }

      if (!parsed.dbId) {
        results[citation] = { status: "unknown_court", searchUrl: buildSearchUrl(citation) };
        return;
      }

      const caseId = buildCaseId({ year: parsed.year, courtCode: parsed.courtCode, number: parsed.number });
      const caseUrl = buildCaseUrl(parsed.webDbId, parsed.year, caseId);
      const searchUrl = buildSearchUrl(citation);

      if (!apiKey) {
        results[citation] = { status: "unverified", url: caseUrl, searchUrl };
        return;
      }

      try {
        const apiStartMs = Date.now();
        const apiRes = await fetch(buildApiUrl(parsed.dbId, caseId, apiKey));
        const apiDurationMs = Date.now() - apiStartMs;
        logExternalApiCall(requestId, "verify", "canlii", apiRes.status, apiDurationMs);

        if (apiRes.status === 404) {
          // Respect CanLII 2 req/sec limit before the fallback call
          await new Promise(r => setTimeout(r, 500));
          try {
            const fallbackStartMs = Date.now();
            const match = await searchCanLII(parsed.dbId, parsed.parties, parsed.year, apiKey);
            logExternalApiCall(requestId, "verify", "canlii-search", match ? 200 : 404, Date.now() - fallbackStartMs);
            if (match) {
              const actualCaseId = match.caseId || caseId;
              const verifiedUrl = buildCaseUrl(parsed.webDbId, parsed.year, actualCaseId);
              results[citation] = { status: "verified", url: verifiedUrl, searchUrl, title: match.title || citation };
            } else {
              results[citation] = { status: "not_found", searchUrl };
            }
          } catch {
            results[citation] = { status: "not_found", searchUrl };
          }
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
        results[citation] = {
          status: "verified",
          url: caseUrl,
          searchUrl,
          title: data.title || citation,
        };
      } catch (err) {
        logError(requestId, "verify", err, 500, 0, { citationIndex: citations.indexOf(rawCitation) });
        results[citation] = { status: "error", searchUrl };
      }
    })
  );

  logSuccess(requestId, "verify", 200, Date.now() - startMs, rlResult, { citationsProcessed: citations.length });
  return res.status(200).json(results);
}
