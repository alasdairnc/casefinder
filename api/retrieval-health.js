// /api/retrieval-health.js — Internal retrieval health + alert status endpoint.

import { randomUUID } from "crypto";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "./_rateLimit.js";
import { applyCorsHeaders } from "./_cors.js";
import { getRetrievalHealthSnapshot, getTrendlineSnapshots } from "./_retrievalHealthStore.js";
import { evaluateRetrievalAlerts, RETRIEVAL_ALERT_THRESHOLDS } from "./_retrievalThresholds.js";
import {
  logRequestStart,
  logRateLimitCheck,
  logValidationError,
  logSuccess,
  logError,
} from "./_logging.js";

function isAuthorized(req) {
  const expectedToken = process.env.RETRIEVAL_HEALTH_TOKEN || "";
  if (!expectedToken) {
    // Secure by default: lock endpoint if token is not configured.
    return false;
  }
  const authHeader = req.headers.authorization || "";
  return authHeader === `Bearer ${expectedToken}`;
}

export default async function handler(req, res) {
  const requestId = req.headers["x-vercel-id"] || randomUUID();
  const startMs = Date.now();
  logRequestStart(req, "retrieval-health", requestId);

  applyCorsHeaders(req, res, "GET, OPTIONS", "Authorization, Content-Type");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'none'");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const rlResult = await checkRateLimit(getClientIp(req), "retrieval-health");
  logRateLimitCheck(requestId, "retrieval-health", rlResult, getClientIp(req));
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([key, value]) => res.setHeader(key, value));
  if (!rlResult.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
  }

  if (!isAuthorized(req)) {
    logValidationError(requestId, "retrieval-health", "Unauthorized retrieval health request", "authorization");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [snapshot, trendline] = await Promise.all([
      getRetrievalHealthSnapshot(),
      getTrendlineSnapshots(),
    ]);
    const alerts = evaluateRetrievalAlerts(snapshot);

    const response = {
      generatedAt: snapshot.generatedAt,
      snapshotSource: snapshot.snapshotSource,
      retentionMs: snapshot.retentionMs,
      totalStoredEvents: snapshot.totalStoredEvents,
      windows: snapshot.windows,
      alltime: snapshot.alltime,
      recentFailures: snapshot.recentFailures,
      trendline,
      thresholds: RETRIEVAL_ALERT_THRESHOLDS,
      alerts,
    };

    logSuccess(requestId, "retrieval-health", 200, Date.now() - startMs, rlResult, {
      alerts: alerts.length,
      totalStoredEvents: snapshot.totalStoredEvents,
    });

    return res.status(200).json(response);
  } catch (err) {
    const statusCode = err.status ? (err.status >= 500 ? 502 : err.status) : 500;
    logError(requestId, "retrieval-health", err, statusCode, Date.now() - startMs);
    return res.status(statusCode).json({ error: "Internal server error" });
  }
}
