// /api/analyze.js — Vercel Serverless Function
// Keeps the Anthropic API key server-side

import { createHash } from "crypto";
import { buildSystemPrompt } from "../src/lib/prompts.js";
import { checkRateLimit, getClientIp, redis } from "./_rateLimit.js";

// Strip XML-like tags from user input to prevent delimiter escape
function sanitizeUserInput(input) {
  return input.replace(/<\/?[a-zA-Z_][a-zA-Z0-9_]*(?:\s[^>]*)?>/g, "");
}

const CACHE_TTL_S = 60 * 60 * 24; // 24 hours

function cacheKey(scenario, filters) {
  return "cache:analyze:" + createHash("sha256").update(scenario + JSON.stringify(filters)).digest("hex");
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
      max_tokens: 1200,
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

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 50_000) return res.status(413).json({ error: "Request body too large" });

  const { allowed: rateLimitAllowed, remaining, resetAt } = await checkRateLimit(getClientIp(req), "analyze");
  if (!rateLimitAllowed) {
    return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
  }

  const { scenario, filters: rawFilters } = req.body;

  if (!scenario || typeof scenario !== "string" || !scenario.trim()) {
    return res.status(400).json({ error: "Scenario is required" });
  }
  if (scenario.length > 5000) {
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
    // Check cache first
    if (redis) {
      try {
        const cached = await redis.get(cacheKey(scenario, filters));
        if (cached) return res.status(200).json(typeof cached === "string" ? JSON.parse(cached) : cached);
      } catch { /* cache miss — proceed normally */ }
    }

    const { result, raw, retryRaw } = await analyzeWithRetry(
      scenario,
      filters,
      process.env.ANTHROPIC_API_KEY
    );

    if (!result) {
      return res.status(422).json({
        error:
          "The AI returned an unstructured response for this scenario. Try adding more detail — specify the location, what happened, and any relevant context.",
      });
    }

    // Store in cache (fire-and-forget)
    if (redis) {
      redis.setex(cacheKey(scenario, filters), CACHE_TTL_S, JSON.stringify(result)).catch(() => {});
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Analyze error:", err);
    if (err.status) {
      return res.status(err.status >= 500 ? 502 : err.status).json({ error: "Analysis service temporarily unavailable." });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
