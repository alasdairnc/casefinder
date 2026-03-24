// /api/analyze.js — Vercel Serverless Function
// Keeps the Anthropic API key server-side

import { createHash, randomUUID } from "crypto";
import { buildSystemPrompt } from "../src/lib/prompts.js";
import { checkRateLimit, getClientIp, rateLimitHeaders, redis } from "./_rateLimit.js";
import { retrieveVerifiedCaseLaw } from "./_caseLawRetrieval.js";
import { logRetrievalMetrics } from "./_retrievalMetrics.js";
import {
  logRequestStart,
  logRateLimitCheck,
  logValidationError,
  logCacheHit,
  logCacheMiss,
  logExternalApiCall,
  logSuccess,
  logError,
} from "./_logging.js";

// Strip XML-like tags from user input to prevent delimiter escape.
// Uses [^>\s]* instead of [^>]* to avoid catastrophic backtracking (ReDoS).
function sanitizeUserInput(input) {
  return input.replace(/<\/?[a-zA-Z_][a-zA-Z0-9_]*(?:\s[^>\s][^>]*)?>/g, "");
}

const CACHE_TTL_S = 60 * 60 * 24; // 24 hours

function cacheKey(scenario, filters) {
  return "cache:analyze:" + createHash("sha256").update(scenario + JSON.stringify(filters)).digest("hex");
}

function ensureMetaContainer(result) {
  if (!result.meta || typeof result.meta !== "object" || Array.isArray(result.meta)) {
    result.meta = {};
  }
  return result.meta;
}

// ── Anthropic call ───────────────────────────────────────────────────────────

async function callAnthropic(messages, system, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    signal: AbortSignal.timeout(25_000), // 25s — Vercel serverless limit is 30s
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const err = new Error(errData.error?.message || `Anthropic API error: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data.content?.map((b) => b.text || "").join("") || "";
  return text.replace(/```json|```/g, "").trim();
}

// ── Parse with one retry ─────────────────────────────────────────────────────

async function analyzeWithRetry(scenario, filters, apiKey) {
  const system = buildSystemPrompt(filters || {});
  const sanitized = sanitizeUserInput(scenario);
  const messages = [{ role: "user", content: `<user_input>\n${sanitized}\n</user_input>` }];

  // First attempt
  const raw = await callAnthropic(messages, system, apiKey);
  try {
    return { result: JSON.parse(raw), raw };
  } catch {
    // Retry: feed Claude its bad output back and ask for valid JSON only
    const retryMessages = [
      ...messages,
      { role: "assistant", content: raw },
      {
        role: "user",
        content:
          "Your previous response was not valid JSON. Return only the JSON object as specified — no explanation, no preamble, no markdown fences. Just the raw JSON.",
      },
    ];

    const retryRaw = await callAnthropic(retryMessages, system, apiKey);
    try {
      return { result: JSON.parse(retryRaw), raw, retryRaw };
    } catch {
      return { result: null, raw, retryRaw };
    }
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const requestId = req.headers['x-vercel-id'] || randomUUID();
  const startMs = Date.now();
  logRequestStart(req, "analyze", requestId);
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
    logValidationError(requestId, "analyze", "Invalid Content-Type", "content-type");
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 50_000) {
    logValidationError(requestId, "analyze", "Request body too large", "content-length");
    return res.status(413).json({ error: "Request body too large" });
  }

  const rlResult = await checkRateLimit(getClientIp(req), "analyze");
  logRateLimitCheck(requestId, "analyze", rlResult, getClientIp(req));
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (!rlResult.allowed) {
    const retryAfter = rlHeaders["Retry-After"] ? Math.ceil(Number(rlHeaders["Retry-After"]) / 60) : null;
    const msg = retryAfter
      ? `Rate limit reached. Try again in ${retryAfter} minute${retryAfter !== 1 ? "s" : ""}.`
      : "Rate limit exceeded. Please try again later.";
    return res.status(429).json({ error: msg });
  }

  const { scenario, filters: rawFilters } = req.body;

  if (!scenario || typeof scenario !== "string" || !scenario.trim()) {
    logValidationError(requestId, "analyze", "Scenario is required", "scenario");
    return res.status(400).json({ error: "Scenario is required" });
  }
  if (scenario.length > 5000) {
    logValidationError(requestId, "analyze", "Scenario too long", "scenario");
    return res.status(400).json({ error: "Scenario must be 5,000 characters or fewer." });
  }

  // Whitelist filter values — prevents prompt injection via filter fields
  const VALID_JURISDICTIONS = new Set([
    "all","Ontario","British Columbia","Alberta","Quebec",
    "Manitoba","Saskatchewan","Nova Scotia","New Brunswick",
    "Newfoundland and Labrador","Prince Edward Island",
  ]);
  const VALID_COURT_LEVELS = new Set(["all","scc","appeal","superior","provincial"]);
  const VALID_DATE_RANGES   = new Set(["all","5","10","20"]);
  const VALID_LAW_TYPES     = new Set(["criminal_code","case_law","civil_law","charter"]);

  // Validate lawTypes — only allow known keys with boolean values, default true
  const rawLawTypes = rawFilters?.lawTypes || {};
  const lawTypes = {};
  for (const key of VALID_LAW_TYPES) {
    lawTypes[key] = rawLawTypes[key] === false ? false : true;
  }

  const filters = {
    jurisdiction: VALID_JURISDICTIONS.has(rawFilters?.jurisdiction) ? rawFilters.jurisdiction : "all",
    courtLevel:   VALID_COURT_LEVELS.has(rawFilters?.courtLevel)    ? rawFilters.courtLevel   : "all",
    dateRange:    VALID_DATE_RANGES.has(rawFilters?.dateRange)       ? rawFilters.dateRange    : "all",
    lawTypes,
  };

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logValidationError(requestId, "analyze", "ANTHROPIC_API_KEY is not configured", "environment");
      return res.status(503).json({ error: "Analysis service temporarily unavailable." });
    }

    // Check cache first
    if (redis) {
      try {
        const cacheKeyStr = cacheKey(scenario, filters);
        const cached = await redis.get(cacheKeyStr);
        if (cached) {
          const cachedResult = typeof cached === "string" ? JSON.parse(cached) : cached;
          if (filters.lawTypes.case_law !== false) {
            const cachedCaseLaw = Array.isArray(cachedResult?.case_law) ? cachedResult.case_law : [];
            const cachedCaseLawMeta =
              cachedResult?.meta && typeof cachedResult.meta === "object"
                ? cachedResult.meta.case_law || {}
                : {};

            await logRetrievalMetrics({
              requestId,
              endpoint: "analyze",
              source: "cache",
              filters,
              reason:
                typeof cachedCaseLawMeta.reason === "string"
                  ? cachedCaseLawMeta.reason
                  : cachedCaseLaw.length > 0
                  ? "verified_results"
                  : "unknown_cached",
              retrievalLatencyMs: 0,
              finalCaseLawCount: cachedCaseLaw.length,
              retrievalMeta: {
                verifiedCount:
                  typeof cachedCaseLawMeta.verifiedCount === "number"
                    ? cachedCaseLawMeta.verifiedCount
                    : cachedCaseLaw.length,
              },
              cacheHit: true,
            });
          }

          logCacheHit(requestId, "analyze", cacheKeyStr);
          logSuccess(requestId, "analyze", 200, Date.now() - startMs, rlResult, { cacheUsed: true });
          return res.status(200).json(cachedResult);
        }
        logCacheMiss(requestId, "analyze");
      } catch { /* cache miss — proceed normally */ }
    }

    const anthropicStartMs = Date.now();
    const { result, raw, retryRaw } = await analyzeWithRetry(
      scenario,
      filters,
      apiKey
    );
    const anthropicDurationMs = Date.now() - anthropicStartMs;
    logExternalApiCall(requestId, "analyze", "anthropic", 200, anthropicDurationMs, { retried: !!retryRaw });

    if (!result) {
      logValidationError(requestId, "analyze", "AI returned unstructured response", "ai_output");
      return res.status(422).json({
        error:
          "The AI returned an unstructured response for this scenario. Try adding more detail — specify the location, what happened, and any relevant context.",
      });
    }

    // Phase B retrieval-first path: case_law output is retrieval-authoritative only.
    const meta = ensureMetaContainer(result);
    if (filters.lawTypes.case_law !== false) {
      const canliiKey = process.env.CANLII_API_KEY || "";
      const retrievalStartMs = Date.now();
      try {
        const { cases: retrievedCases, meta: retrievalMeta } = await retrieveVerifiedCaseLaw({
          scenario: scenario.trim(),
          filters,
          aiSuggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
          apiKey: canliiKey,
          maxResults: 3,
        });
        const retrievalDurationMs = Date.now() - retrievalStartMs;

        if ((retrievalMeta.searchCalls || 0) > 0 || (retrievalMeta.verificationCalls || 0) > 0) {
          logExternalApiCall(requestId, "analyze", "canlii-retrieval", 200, retrievalDurationMs, {
            ...retrievalMeta,
            casesReturned: retrievedCases.length,
          });
        }

        result.case_law = Array.isArray(retrievedCases) ? retrievedCases : [];
        const reason = retrievalMeta.reason || (result.case_law.length > 0 ? "verified_results" : "no_verified");
        meta.case_law = {
          source: "retrieval",
          verifiedCount: result.case_law.length,
          reason,
        };
        await logRetrievalMetrics({
          requestId,
          endpoint: "analyze",
          source: "retrieval",
          filters,
          reason,
          retrievalMeta,
          retrievalLatencyMs: retrievalDurationMs,
          finalCaseLawCount: result.case_law.length,
        });
      } catch (retrievalErr) {
        const retrievalDurationMs = Date.now() - retrievalStartMs;
        result.case_law = [];
        meta.case_law = {
          source: "retrieval",
          verifiedCount: 0,
          reason: "retrieval_error",
        };
        await logRetrievalMetrics({
          requestId,
          endpoint: "analyze",
          source: "retrieval",
          filters,
          reason: "retrieval_error",
          retrievalLatencyMs: retrievalDurationMs,
          finalCaseLawCount: 0,
          retrievalError: true,
          errorMessage: retrievalErr?.message || "Case law retrieval failed",
        });
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            requestId,
            event: "retrieval_warning",
            endpoint: "analyze",
            message: retrievalErr?.message || "Case law retrieval failed",
          })
        );
      }
    } else {
      result.case_law = [];
      meta.case_law = {
        source: "retrieval",
        verifiedCount: 0,
        reason: "filter_disabled",
      };
      await logRetrievalMetrics({
        requestId,
        endpoint: "analyze",
        source: "retrieval",
        filters,
        reason: "filter_disabled",
        retrievalLatencyMs: 0,
        finalCaseLawCount: 0,
      });
    }

    // Store in cache (fire-and-forget)
    if (redis) {
      redis.setex(cacheKey(scenario, filters), CACHE_TTL_S, JSON.stringify(result)).catch(() => {});
    }

    logSuccess(requestId, "analyze", 200, Date.now() - startMs, rlResult, { cached: true });
    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.status ? (err.status >= 500 ? 502 : err.status) : 500;
    logError(requestId, "analyze", err, statusCode, Date.now() - startMs);
    if (err.status) {
      return res.status(statusCode).json({ error: "Analysis service temporarily unavailable." });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
