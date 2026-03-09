// /api/analyze.js — Vercel Serverless Function
// Keeps the Anthropic API key server-side

import { buildSystemPrompt } from "../src/lib/prompts.js";

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { scenario, filters } = req.body;

  if (!scenario || typeof scenario !== "string" || !scenario.trim()) {
    return res.status(400).json({ error: "Scenario is required" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: buildSystemPrompt(filters || {}),
        messages: [{ role: "user", content: scenario }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errData.error?.message || `Anthropic API error: ${response.status}`,
      });
    }

    const data = await response.json();
    const text = data.content?.map((b) => b.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response", raw: clean });
    }
  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
