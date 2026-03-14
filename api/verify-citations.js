// /api/verify-citations.js — CanLII citation verification
// Verifies legal citations against CanLII API with rate limiting

import {
  parseCitation,
  buildCaseId,
  buildCaseUrl,
  buildSearchUrl,
} from "../src/lib/canlii.js";
import { checkRateLimit, getClientIp } from "./_rateLimit.js";

const FETCH_TIMEOUT_MS = 5000;

const ALLOWED_ORIGINS = ["https://casedive.ca", "https://casefinder-project.vercel.app"];

async function verifyCitation(citation, apiKey) {
  const parsed = parseCitation(citation);

  if (!parsed) {
    return {
      citation,
      status: "unparseable",
      searchUrl: buildSearchUrl(citation),
    };
  }

  if (!parsed.dbId) {
    return {
      citation,
      status: "unknown_court",
      searchUrl: buildSearchUrl(citation),
    };
  }

  const caseId = buildCaseId({
    year: parsed.year,
    courtCode: parsed.courtCode,
    number: parsed.number,
  });

  if (!caseId) {
    return {
      citation,
      status: "unparseable",
      searchUrl: buildSearchUrl(citation),
    };
  }

  const url = buildCaseUrl(parsed.dbId, parsed.year, caseId);
  const searchUrl = buildSearchUrl(citation);

  if (!apiKey) {
    return { citation, status: "unverified", url, searchUrl };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const apiUrl = `https://api.canlii.org/v1/caseBrowse/en/${parsed.dbId}/${caseId}/?api_key=${encodeURIComponent(
      apiKey
    )}`;

    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.status === 404) {
      return { citation, status: "not_found", searchUrl };
    }

    if (!res.ok) {
      return { citation, status: "error", searchUrl };
    }

    const data = await res.json();
    return {
      citation,
      status: "verified",
      title: data.title || citation,
      url,
      searchUrl,
    };
  } catch (err) {
    if (err.name === "AbortError") {
      return { citation, status: "timeout", searchUrl };
    }
    return { citation, status: "error", searchUrl };
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "Method not allowed" });
  }

  // Rate limit check
  const { allowed, remaining, resetAt } = await checkRateLimit(getClientIp(req));
  if (!allowed) {
    res.setHeader("Retry-After", resetAt);
    return res.status(429).json({
      error: `Rate limit exceeded. Try again after ${resetAt}.`,
      remaining,
      resetAt,
    });
  }

  const { citations } = req.body ?? {};

  // Input validation
  if (!Array.isArray(citations)) {
    return res.status(400).json({ error: "citations must be an array" });
  }

  if (citations.length === 0) {
    return res.status(400).json({ error: "citations array cannot be empty" });
  }

  if (citations.length > 20) {
    return res
      .status(400)
      .json({ error: "Maximum 20 citations per request" });
  }

  // Validate each citation
  for (const citation of citations) {
    if (typeof citation !== "string") {
      return res
        .status(400)
        .json({ error: "Each citation must be a string" });
    }
    if (citation.length === 0 || citation.length > 200) {
      return res
        .status(400)
        .json({
          error: "Each citation must be 1-200 characters",
          received: citation.length,
        });
    }
  }

  const apiKey = process.env.CANLII_API_KEY || "";

  try {
    const results = await Promise.all(
      citations.map((citation) => verifyCitation(citation, apiKey))
    );

    return res.status(200).json({
      results,
      remaining,
    });
  } catch (err) {
    console.error("Verification endpoint error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
