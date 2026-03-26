// /api/analyze.js — Vercel Serverless Function
// Keeps the Anthropic API key server-side

import { createHash, randomUUID } from "crypto";
import { buildSystemPrompt } from "../src/lib/prompts.js";
import { MASTER_CASE_LAW_DB } from "../src/lib/caselaw/index.js";
import { checkRateLimit, getClientIp, rateLimitHeaders, redis } from "./_rateLimit.js";
import { applyCorsHeaders } from "./_cors.js";
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
  return (
    "cache:analyze:v3:" + createHash("sha256").update(scenario + JSON.stringify(filters)).digest("hex")
  );
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

// ── Deterministic retrieval ranking ──────────────────────────────────────────

const RANK_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "were", "was", "when", "where",
  "while", "have", "has", "had", "over", "under", "they", "their", "them", "than", "then", "been",
  "about", "would", "could", "should", "after", "before", "because", "through", "between",
  "driver", "person", "police", "case", "law",
]);

function tokenizeForRanking(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !RANK_STOP_WORDS.has(w));
}

function scoreRetrievedCase(scenarioTokens, item) {
  const haystack = `${item?.citation || ""} ${item?.summary || ""} ${item?.matched_content || ""}`.toLowerCase();
  const haystackTokens = new Set(tokenizeForRanking(haystack));

  let overlap = 0;
  for (const token of scenarioTokens) {
    if (haystackTokens.has(token)) overlap += 1;
  }

  let score = overlap * 4;

  // Domain-specific boosts for common impaired-driving / search-and-seizure scenarios.
  const impairedScenario = scenarioTokens.has("ride") || scenarioTokens.has("breath") || scenarioTokens.has("breathalyzer") || scenarioTokens.has("impaired") || scenarioTokens.has("drunk");
  if (impairedScenario) {
    if (/\bcharter\b/.test(haystack)) score += 2;
    if (/\bdetention\b|\barrest\b/.test(haystack)) score += 2;
    if (/\bsearch\b|\bseizure\b/.test(haystack)) score += 2;
    if (/\bbreath\b|\bblood\b|\bimpaired\b/.test(haystack)) score += 3;
    if (/\bgrant\b/.test(haystack)) score += 6;
  }

  const bloodScenario = scenarioTokens.has("blood");
  if (bloodScenario && /\bblood\b/.test(haystack)) score += 2;

  // Assault scenarios
  const assaultScenario = scenarioTokens.has("assault") || scenarioTokens.has("struck") || scenarioTokens.has("punch");
  if (assaultScenario) {
    if (/\bbodily\s+harm\b/.test(haystack)) score += 3;
    if (/\bweapon\b/.test(haystack)) score += 2;
    if (/\bdefence\b|\bself[\s-]?defence\b/.test(haystack)) score += 2;
    if (/\bconsent\b/.test(haystack)) score += 1;
  }

  // Drug / CDSA scenarios
  const drugScenario = scenarioTokens.has("drug") || scenarioTokens.has("cocaine") || scenarioTokens.has("fentanyl") || scenarioTokens.has("trafficking") || scenarioTokens.has("cdsa");
  if (drugScenario) {
    if (/\btraffick\w*\b/.test(haystack)) score += 3;
    if (/\bcdsa\b|\bcontrolled\s+substance\b/.test(haystack)) score += 3;
    if (/\bpossession\b/.test(haystack)) score += 2;
    if (/\bschedule\b/.test(haystack)) score += 1;
  }

  // Theft / robbery scenarios
  const theftScenario = scenarioTokens.has("theft") || scenarioTokens.has("steal") || scenarioTokens.has("robbery") || scenarioTokens.has("stolen");
  if (theftScenario) {
    if (/\btheft\b/.test(haystack)) score += 2;
    if (/\brobbery\b/.test(haystack)) score += 3;
    if (/\bstolen\b|\bproperty\b/.test(haystack)) score += 1;
  }

  // Sexual assault scenarios
  const sexualScenario = scenarioTokens.has("sexual") || scenarioTokens.has("rape");
  if (sexualScenario) {
    if (/\bconsent\b/.test(haystack)) score += 3;
    if (/\bcomplainant\b/.test(haystack)) score += 2;
    if (/\bsexual\b/.test(haystack)) score += 2;
  }

  // Charter scenarios
  const charterScenario = scenarioTokens.has("charter") || scenarioTokens.has("rights") || scenarioTokens.has("detention");
  if (charterScenario) {
    if (/\bcharter\b/.test(haystack)) score += 3;
    if (/\bsection\s+[89]\b|\bs\.\s*[89]\b/.test(haystack)) score += 2;
    if (/\bsection\s+24\b|\bs\.\s*24\b/.test(haystack)) score += 2;
    if (/\bexclusion\b|\b24\s*\(2\)/.test(haystack)) score += 2;
  }

  // Homicide / manslaughter scenarios
  const homicideScenario = scenarioTokens.has("murder") || scenarioTokens.has("manslaughter") || scenarioTokens.has("homicide") || scenarioTokens.has("kill");
  if (homicideScenario) {
    if (/\bmurder\b/.test(haystack)) score += 3;
    if (/\bmanslaughter\b/.test(haystack)) score += 3;
    if (/\bcriminal\s+negligence\b/.test(haystack)) score += 2;
    if (/\bintent\b|\bmens\s+rea\b/.test(haystack)) score += 2;
  }

  if (/\bSCC\b/i.test(item?.citation || "")) score += 1.5;
  if (/\bONCA\b/i.test(item?.citation || "")) score += 1;

  const yearNum = Number(item?.year);
  if (Number.isFinite(yearNum) && yearNum >= 2000) score += 0.4;

  if (String(item?.matched_content || "").includes("Landmark RAG Match")) {
    score += 8; // Massive boost to ensure landmarks surface if they are relevant
  }

  return score;
}

function selectTopRetrievedCases(scenario, retrievedCases, limit = 3) {
  const cases = Array.isArray(retrievedCases) ? [...retrievedCases] : [];
  const scenarioTokens = new Set(tokenizeForRanking(scenario));

  cases.sort((a, b) => {
    const scoreDiff = scoreRetrievedCase(scenarioTokens, b) - scoreRetrievedCase(scenarioTokens, a);
    if (scoreDiff !== 0) return scoreDiff;

    const yearA = Number(a?.year) || 0;
    const yearB = Number(b?.year) || 0;
    if (yearB !== yearA) return yearB - yearA;

    return String(a?.citation || "").localeCompare(String(b?.citation || ""));
  });

  return cases.slice(0, limit);
}

// ── Deterministic RAG Token Matching ─────────────────────────────────────────
function matchLandmarkCases(scenario) {
  if (!scenario) return [];
  const s = scenario.toLowerCase();
  const scenarioTokens = new Set(tokenizeForRanking(s));
  const matched = [];

  for (const caseLaw of MASTER_CASE_LAW_DB) {
    let score = 0;
    
    // 1. Literal Substring Matches (High Signal)
    for (const tag of caseLaw.tags) {
      if (s.includes(tag.toLowerCase())) score += 10;
    }
    
    // 2. Token Overlap (Fuzzy Signal)
    const tagTokens = new Set();
    caseLaw.tags.forEach(t => t.toLowerCase().split(/\s+/).forEach(token => tagTokens.add(token)));
    caseLaw.topics.forEach(t => t.toLowerCase().split(/\s+/).forEach(token => tagTokens.add(token)));
    // Also add title tokens to the matching pool!
    caseLaw.title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).forEach(token => tagTokens.add(token));
    
    for (const token of scenarioTokens) {
      if (tagTokens.has(token)) score += 3;
    }

    // 3. Case Name Match (Direct Signal - punctuation insensitive)
    const normalizedTitle = caseLaw.title.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const normalizedS = s.replace(/[^a-z0-9\s]/g, "");
    if (normalizedS.includes(normalizedTitle)) score += 20;

    if (score >= 3) {
      matched.push({ caseLaw, score });
    }
  }

  matched.sort((a, b) => b.score - a.score);
  return matched.slice(0, 3).map((m) => m.caseLaw);
}

// ── Parse with one retry ─────────────────────────────────────────────────────

async function analyzeWithRetry(scenario, filters, apiKey) {
  let system = buildSystemPrompt(filters || {});
  let matchedLandmarks = [];
  
  if (filters?.lawTypes?.case_law !== false) {
    matchedLandmarks = matchLandmarkCases(scenario);
    if (matchedLandmarks.length > 0) {
      const contextStr = matchedLandmarks.map((c) => `- ${c.title} (${c.citation}): ${c.ratio}`).join("\n");
      system += `\n\nCRITICAL CONTEXT: Based on the user's scenario, you MUST consider applying the following Supreme Court of Canada landmark cases:\n${contextStr}\nEnsure you accurately cite these specific cases and strictly apply their ratios to the analysis where relevant.`;
    }
  }

  const sanitized = sanitizeUserInput(scenario);
  const messages = [{ role: "user", content: `<user_input>\n${sanitized}\n</user_input>` }];

  // First attempt
  const raw = await callAnthropic(messages, system, apiKey);
  try {
    return { result: JSON.parse(raw), raw, matchedLandmarks };
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
      return { result: JSON.parse(retryRaw), raw, retryRaw, matchedLandmarks };
    } catch {
      return { result: null, raw, retryRaw, matchedLandmarks };
    }
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const requestId = req.headers['x-vercel-id'] || randomUUID();
  const startMs = Date.now();
  logRequestStart(req, "analyze", requestId);
  applyCorsHeaders(req, res, "POST, OPTIONS", "Content-Type");

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
    const { result, raw, retryRaw, matchedLandmarks } = await analyzeWithRetry(
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

    // Phase B retrieval-first path: use retrieved verified case-law as final source.
    const meta = ensureMetaContainer(result);
    
    if (filters.lawTypes.case_law !== false) {
      const canliiKey = process.env.CANLII_API_KEY || "";
      const retrievalStartMs = Date.now();
      
      if (!canliiKey || canliiKey.trim() === "") {
        result.case_law = [];
        meta.case_law = {
          source: "retrieval",
          verifiedCount: 0,
          reason: "missing_api_key",
        };
        await logRetrievalMetrics({
          requestId,
          endpoint: "analyze",
          source: "retrieval",
          filters,
          reason: "missing_api_key",
          retrievalLatencyMs: 0,
          finalCaseLawCount: 0,
        });
      } else {
        try {
          const { cases: retrievedCases, meta: retrievalMeta } = await retrieveVerifiedCaseLaw({
            scenario: scenario.trim(),
            filters,
            aiSuggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
            aiCaseLaw: Array.isArray(result.case_law) ? result.case_law : [],
            landmarkMatches: matchedLandmarks,
            criminalCode: Array.isArray(result.criminal_code) ? result.criminal_code : [],
            apiKey: canliiKey,
            maxResults: 10,
          });
        const retrievalDurationMs = Date.now() - retrievalStartMs;

        if ((retrievalMeta.searchCalls || 0) > 0 || (retrievalMeta.verificationCalls || 0) > 0) {
          logExternalApiCall(requestId, "analyze", "canlii-retrieval", 200, retrievalDurationMs, {
            ...retrievalMeta,
            casesReturned: retrievedCases.length,
          });
        }

        result.case_law = selectTopRetrievedCases(scenario, retrievedCases, 3);

        const reason = retrievalMeta.reason || (result.case_law.length > 0 ? "verified_results" : "no_verified");
        meta.case_law = {
          source: "retrieval_ranked",
          verifiedCount: result.case_law.length,
          reason,
          retrieval: {
            fallbackSearchUsed: Boolean(retrievalMeta.fallbackSearchUsed),
            searchCalls: retrievalMeta.searchCalls ?? 0,
            verificationCalls: retrievalMeta.verificationCalls ?? 0,
            candidateCount: retrievalMeta.candidateCount ?? 0,
            termsTried: retrievalMeta.termsTried ?? 0,
          },
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
        // Keep retrieval-first behavior even on retrieval failures.
        console.error(`[analyze] Retrieval failed for requestId ${requestId}:`, retrievalErr);
        logError(requestId, "analyze-retrieval", retrievalErr, 500, Date.now() - retrievalStartMs);
        
        result.case_law = [];
        const errorMsg = retrievalErr.message || String(retrievalErr);
        meta.case_law = {
          source: "retrieval_error",
          verifiedCount: 0,
          reason: "retrieval_error",
          error: errorMsg,
        };
      }
    }
  } else {
      result.case_law = [];
      meta.case_law = {
        source: "retrieval",
        verifiedCount: 0,
        reason: "filter_disabled",
      };
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
