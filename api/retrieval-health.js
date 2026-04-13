// /api/retrieval-health.js — Internal retrieval health + alert status endpoint.

import { randomUUID, timingSafeEqual } from "crypto";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "./_rateLimit.js";
import {
  getFailureScenarioPage,
  getRetrievalHealthSnapshot,
  getTrendlineSnapshots,
} from "./_retrievalHealthStore.js";
import {
  evaluateRetrievalAlerts,
  RETRIEVAL_ALERT_THRESHOLDS,
} from "./_retrievalThresholds.js";
import { buildRetrievalImprovements } from "./_retrievalImprovements.js";
import {
  applyStandardApiHeaders,
  handleOptionsAndMethod,
} from "./_apiCommon.js";
import {
  logRequestStart,
  logRateLimitCheck,
  logValidationError,
  logSuccess,
  logError,
} from "./_logging.js";

const MAX_FAILURE_ARCHIVE_LIMIT = 100;
const MAX_FAILURE_ARCHIVE_OFFSET = 1000;

function parseBoundedInt(value, fallback, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const int = Math.floor(num);
  if (int < min) return fallback;
  return Math.min(max, int);
}

function isAuthorized(req) {
  const expectedToken = process.env.RETRIEVAL_HEALTH_TOKEN || "";
  if (!expectedToken) {
    // Secure by default: lock endpoint if token is not configured.
    return false;
  }
  const authHeader = req.headers.authorization || "";
  const expected = `Bearer ${expectedToken}`;
  if (authHeader.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

export default async function handler(req, res) {
  const requestId = req.headers["x-vercel-id"] || randomUUID();
  const startMs = Date.now();
  logRequestStart(req, "retrieval-health", requestId);

  applyStandardApiHeaders(
    req,
    res,
    "GET, OPTIONS",
    "Authorization, Content-Type",
  );
  if (handleOptionsAndMethod(req, res, "GET")) return;

  const rlResult = await checkRateLimit(getClientIp(req), "retrieval-health");
  logRateLimitCheck(requestId, "retrieval-health", rlResult, getClientIp(req));
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([key, value]) =>
    res.setHeader(key, value),
  );
  if (!rlResult.allowed) {
    return res
      .status(429)
      .json({ error: "Rate limit exceeded. Please try again later." });
  }

  if (!isAuthorized(req)) {
    logValidationError(
      requestId,
      "retrieval-health",
      "Unauthorized retrieval health request",
      "authorization",
    );
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const url = new URL(
      req.url || "http://localhost/api/retrieval-health",
      "http://localhost",
    );
    const failureLimit = parseBoundedInt(
      url.searchParams.get("failureLimit"),
      20,
      1,
      MAX_FAILURE_ARCHIVE_LIMIT,
    );
    const failuresBeforeTs = parseBoundedInt(
      url.searchParams.get("failuresBeforeTs"),
      null,
      1,
      Number.MAX_SAFE_INTEGER,
    );
    const failuresOffset = parseBoundedInt(
      url.searchParams.get("failuresOffset"),
      0,
      0,
      MAX_FAILURE_ARCHIVE_OFFSET,
    );

    const [snapshot, trendline, failureArchive] = await Promise.all([
      getRetrievalHealthSnapshot(),
      getTrendlineSnapshots(),
      getFailureScenarioPage({
        limit: failureLimit,
        beforeTs: failuresBeforeTs,
        offset: failuresOffset,
      }),
    ]);
    const alerts = evaluateRetrievalAlerts(snapshot);
    const improvements = buildRetrievalImprovements(
      snapshot?.recentFailures || [],
    );

    const response = {
      generatedAt: snapshot.generatedAt,
      snapshotSource: snapshot.snapshotSource,
      retentionMs: snapshot.retentionMs,
      historyMode: snapshot.historyMode,
      historyMaxEvents: snapshot.historyMaxEvents,
      totalStoredEvents: snapshot.totalStoredEvents,
      windows: snapshot.windows,
      alltime: snapshot.alltime,
      recentFailures: snapshot.recentFailures,
      failureArchive,
      improvements,
      trendline,
      thresholds: RETRIEVAL_ALERT_THRESHOLDS,
      alerts,
    };

    logSuccess(
      requestId,
      "retrieval-health",
      200,
      Date.now() - startMs,
      rlResult,
      {
        alerts: alerts.length,
        totalStoredEvents: snapshot.totalStoredEvents,
      },
    );

    return res.status(200).json(response);
  } catch (err) {
    const statusCode = err.status
      ? err.status >= 500
        ? 502
        : err.status
      : 500;
    logError(
      requestId,
      "retrieval-health",
      err,
      statusCode,
      Date.now() - startMs,
    );
    return res.status(statusCode).json({ error: "Internal server error" });
  }
}
