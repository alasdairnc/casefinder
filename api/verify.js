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

// Matches Criminal Code section references like "s. 348(1)(b)" or "s. 7"
const CRIMINAL_CODE_PATTERN = /^s\.\s*\d+/i;

export default async function handler(req, res) {
  const origin = req.headers.origin ?? "";
  const allowed = ["https://casedive.ca", "https://casefinder-project.vercel.app"];
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
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 50_000) return res.status(413).json({ error: "Request body too large" });

  const rlResult = await checkRateLimit(getClientIp(req));
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (!rlResult.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
  }

  const { citations } = req.body;

  if (!Array.isArray(citations) || citations.length === 0) {
    return res.status(400).json({ error: "citations array is required" });
  }
  if (citations.length > 10) {
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

      // Criminal Code section references — validate against lookup table
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
        const apiRes = await fetch(buildApiUrl(parsed.dbId, caseId, apiKey));

        if (apiRes.status === 404) {
          results[citation] = { status: "not_found", searchUrl };
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
      } catch {
        results[citation] = { status: "error", searchUrl };
      }
    })
  );

  return res.status(200).json(results);
}
