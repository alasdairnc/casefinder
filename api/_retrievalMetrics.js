// api/_retrievalMetrics.js
// Shared retrieval metrics payload builder + logger for case-law telemetry.

import { createLog } from "./_logging.js";
import { getRetrievalHealthSnapshot, recordRetrievalMetricsEvent } from "./_retrievalHealthStore.js";
import { emitRetrievalAlerts } from "./_retrievalThresholds.js";

const METRIC_FIELDS = [
  "termsTried",
  "databasesTried",
  "searchCalls",
  "candidateCount",
  "verificationCalls",
  "verifiedCount",
  "semanticFilterDropCount",
];

function toNonNegativeInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

function toDurationMs(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
}

function toReason(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toNullableFloat(value, decimals = 3) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Number(num.toFixed(decimals));
}

function normalizeSourceMix(raw = {}) {
  return {
    ai: toNonNegativeInt(raw?.ai),
    landmark: toNonNegativeInt(raw?.landmark),
    localFallback: toNonNegativeInt(raw?.localFallback),
  };
}

function toScenarioSnippet(value, maxLen = 280) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}

function inferReason({ reason, finalCaseLawCount, retrievalError }) {
  const explicit = toReason(reason);
  if (explicit) return explicit;
  if (retrievalError) return "retrieval_error";
  return finalCaseLawCount > 0 ? "verified_results" : "no_verified";
}

function normalizeMetrics(retrievalMeta = {}) {
  const out = {};
  for (const field of METRIC_FIELDS) {
    out[field] = toNonNegativeInt(retrievalMeta[field]);
  }
  return out;
}

export function buildRetrievalMetrics(input = {}) {
  const {
    requestId = "unknown",
    endpoint = "unknown",
    source = "retrieval",
    retrievalMeta = {},
    retrievalLatencyMs = null,
    finalCaseLawCount = null,
    reason = "",
    retrievalError = false,
    cacheHit = false,
    filters = {},
    errorMessage = "",
    scenario = "",
  } = input;

  const metrics = normalizeMetrics(retrievalMeta);
  const sourceMix = normalizeSourceMix(retrievalMeta?.candidateSourceMix);
  const finalCount = toNonNegativeInt(
    finalCaseLawCount == null ? metrics.verifiedCount : finalCaseLawCount
  );
  const normalizedReason = inferReason({
    reason,
    finalCaseLawCount: finalCount,
    retrievalError,
  });
  const isError =
    Boolean(retrievalError) ||
    normalizedReason === "retrieval_error" ||
    normalizedReason === "missing_api_key";

  return {
    requestId,
    event: "retrieval_metrics",
    endpoint,
    source,
    reason: normalizedReason,
    retrievalLatencyMs: toDurationMs(retrievalLatencyMs),
    finalCaseLawCount: finalCount,
    termsTried: metrics.termsTried,
    databasesTried: metrics.databasesTried,
    searchCalls: metrics.searchCalls,
    candidateCount: metrics.candidateCount,
    verificationCalls: metrics.verificationCalls,
    verifiedCount: metrics.verifiedCount,
    relevanceScoreAvg: toNullableFloat(retrievalMeta?.relevanceScoreAvg),
    fallbackPathUsed: retrievalMeta?.fallbackPathUsed === true,
    fallbackReason: toReason(retrievalMeta?.fallbackReason) || null,
    semanticFilterDropCount: metrics.semanticFilterDropCount,
    candidateSourceMix: sourceMix,
    caseLawFilterEnabled: filters?.lawTypes?.case_law !== false,
    cacheHit: Boolean(cacheHit),
    retrievalError: isError,
    jurisdiction: typeof filters?.jurisdiction === "string" ? filters.jurisdiction : "all",
    courtLevel: typeof filters?.courtLevel === "string" ? filters.courtLevel : "all",
    dateRange: typeof filters?.dateRange === "string" ? filters.dateRange : "all",
    errorMessage: isError ? String(errorMessage || "unknown").slice(0, 200) : null,
    scenarioSnippet: toScenarioSnippet(scenario),
  };
}

export async function logRetrievalMetrics(input = {}) {
  const payload = buildRetrievalMetrics(input);
  console.log(createLog(payload));

  let healthSnapshot = null;
  try {
    await recordRetrievalMetricsEvent(payload);
    healthSnapshot = await getRetrievalHealthSnapshot();
  } catch {
    return payload;
  }

  if (payload.source === "retrieval" && payload.reason !== "filter_disabled") {
    try {
      await emitRetrievalAlerts({
        requestId: payload.requestId,
        endpoint: payload.endpoint,
        healthSnapshot,
      });
    } catch {
      // Ignore threshold check failures; request flow must not fail on metrics.
    }
  }

  return payload;
}
