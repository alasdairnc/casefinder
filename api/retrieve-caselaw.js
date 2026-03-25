// /api/retrieve-caselaw.js — Phase A retrieval endpoint
// Retrieves real, verified case-law candidates from CanLII search + verification.

import { randomUUID } from "crypto";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "./_rateLimit.js";
import { applyCorsHeaders } from "./_cors.js";
import { retrieveVerifiedCaseLaw } from "./_caseLawRetrieval.js";
import { logRetrievalMetrics } from "./_retrievalMetrics.js";
import {
  logRequestStart,
  logRateLimitCheck,
  logValidationError,
  logExternalApiCall,
  logSuccess,
  logError,
} from "./_logging.js";

function sanitizeUserInput(input) {
  if (typeof input !== "string") return "";
  return input.replace(/<\/?[a-zA-Z_][a-zA-Z0-9_]*(?:\s[^>\s][^>]*)?>/g, "");
}

export default async function handler(req, res) {
  const requestId = req.headers["x-vercel-id"] || randomUUID();
  const startMs = Date.now();
  logRequestStart(req, "retrieve-caselaw", requestId);

  applyCorsHeaders(req, res, "POST, OPTIONS", "Content-Type");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'none'");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json")) {
    logValidationError(requestId, "retrieve-caselaw", "Invalid Content-Type", "content-type");
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 50_000) {
    logValidationError(requestId, "retrieve-caselaw", "Request body too large", "content-length");
    return res.status(413).json({ error: "Request body too large" });
  }

  const rlResult = await checkRateLimit(getClientIp(req), "retrieve-caselaw");
  logRateLimitCheck(requestId, "retrieve-caselaw", rlResult, getClientIp(req));
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (!rlResult.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
  }

  const body = req.body || {};
  const scenario = sanitizeUserInput(body.scenario || "").trim();
  const filters = body.filters && typeof body.filters === "object" ? body.filters : {};
  const suggestions = Array.isArray(body.suggestions) ? body.suggestions.slice(0, 12) : [];

  if (!scenario) {
    logValidationError(requestId, "retrieve-caselaw", "scenario is required", "scenario");
    return res.status(400).json({ error: "scenario is required" });
  }

  const apiKey = process.env.CANLII_API_KEY || "";
  if (!apiKey) {
    await logRetrievalMetrics({
      requestId,
      endpoint: "retrieve-caselaw",
      source: "retrieval",
      filters,
      reason: "missing_api_key",
      retrievalLatencyMs: 0,
      finalCaseLawCount: 0,
      retrievalMeta: {
        termsTried: 0,
        databasesTried: 0,
        searchCalls: 0,
        candidateCount: 0,
        verificationCalls: 0,
        verifiedCount: 0,
      },
      retrievalError: true,
      errorMessage: "CANLII_API_KEY is not configured",
    });
    logValidationError(requestId, "retrieve-caselaw", "CANLII_API_KEY is not configured", "environment");
    return res.status(503).json({ error: "Case law retrieval service temporarily unavailable." });
  }

  const retrievalStartMs = Date.now();
  try {
    const { cases, meta } = await retrieveVerifiedCaseLaw({
      scenario,
      filters,
      aiSuggestions: suggestions,
      apiKey,
      maxResults: 3,
    });
    const retrievalDurationMs = Date.now() - retrievalStartMs;

    logExternalApiCall(requestId, "retrieve-caselaw", "canlii-retrieval", 200, retrievalDurationMs, {
      ...meta,
      casesReturned: cases.length,
    });
    await logRetrievalMetrics({
      requestId,
      endpoint: "retrieve-caselaw",
      source: "retrieval",
      filters,
      reason: meta?.reason || (cases.length > 0 ? "verified_results" : "no_verified"),
      retrievalMeta: meta,
      retrievalLatencyMs: retrievalDurationMs,
      finalCaseLawCount: cases.length,
    });
    logSuccess(requestId, "retrieve-caselaw", 200, Date.now() - startMs, rlResult, {
      casesReturned: cases.length,
    });

    return res.status(200).json({ case_law: cases, meta });
  } catch (err) {
    const retrievalDurationMs = Date.now() - retrievalStartMs;
    await logRetrievalMetrics({
      requestId,
      endpoint: "retrieve-caselaw",
      source: "retrieval",
      filters,
      reason: "retrieval_error",
      retrievalLatencyMs: retrievalDurationMs,
      finalCaseLawCount: 0,
      retrievalError: true,
      errorMessage: err?.message || "Case law retrieval failed",
    });
    const statusCode = err.status ? (err.status >= 500 ? 502 : err.status) : 500;
    logError(requestId, "retrieve-caselaw", err, statusCode, Date.now() - startMs);
    if (err.status) {
      return res.status(statusCode).json({ error: "Case law retrieval service temporarily unavailable." });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
