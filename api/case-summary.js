// /api/case-summary.js — Generate structured case summary via Claude
import { checkRateLimit, getClientIp } from "./_rateLimit.js";

const ALLOWED_ORIGINS = ["https://casedive.ca", "https://casefinder-project.vercel.app"];

async function callAnthropic(prompt, apiKey) {
  const system = `You are a Canadian legal research assistant. Given case metadata and context, produce a concise structured summary of the case. Return ONLY valid JSON with these exact keys: facts, held, ratio, keyQuote, significance. Keep each field to 1-3 sentences. For keyQuote, use a verbatim or near-verbatim passage if one appears in the provided context — otherwise omit it by setting it to null. Never fabricate holdings, quotes, or outcomes. If you are uncertain about a field, say so briefly rather than guessing.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    signal: AbortSignal.timeout(25_000),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: prompt }],
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

export default async function handler(req, res) {
  const origin = req.headers.origin ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
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

  const { allowed: rateLimitAllowed, resetAt } = await checkRateLimit(getClientIp(req));
  if (!rateLimitAllowed) {
    res.setHeader("Retry-After", resetAt);
    return res.status(429).json({ error: `Rate limit exceeded. Try again after ${resetAt}.` });
  }

  const { citation, title, court, year, summary, matchedContent, scenario } = req.body || {};

  if (!citation || typeof citation !== "string") {
    return res.status(400).json({ error: "citation is required" });
  }

  const prompt = [
    `Citation: ${citation}`,
    title ? `Title: ${title}` : null,
    court ? `Court: ${court}` : null,
    year ? `Year: ${year}` : null,
    summary ? `Existing summary: ${summary}` : null,
    matchedContent ? `Matched context: ${matchedContent}` : null,
    scenario ? `User scenario: ${scenario}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await callAnthropic(prompt, process.env.ANTHROPIC_API_KEY);
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      return res.status(422).json({ error: "Could not parse structured summary." });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error("case-summary error:", err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
}
