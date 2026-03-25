// api/_retrievalHealthStore.js
// Rolling retrieval metrics store with Redis + in-memory fallback.

import { redis } from "./_rateLimit.js";

const EVENT_LIST_KEY = "metrics:retrieval:events:v1";
const REDIS_TIMEOUT_MS = 500;
const MAX_EVENTS = 2500;
const MAX_RETENTION_MS = 2 * 60 * 60 * 1000;

export const RETRIEVAL_WINDOWS = {
  "5m": 5 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

const memoryEvents = [];

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNonNegativeInt(value) {
  const num = toNumber(value);
  if (num == null || num < 0) return 0;
  return Math.floor(num);
}

function normalizeEvent(raw) {
  let event = raw;
  if (typeof raw === "string") {
    try {
      event = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!event || typeof event !== "object") return null;

  const ts = toNumber(event.ts);
  if (ts == null || ts <= 0) return null;

  const latency = toNumber(event.retrievalLatencyMs);

  return {
    ts: Math.floor(ts),
    source: typeof event.source === "string" ? event.source : "retrieval",
    reason: typeof event.reason === "string" ? event.reason : "unknown",
    retrievalError: Boolean(event.retrievalError),
    caseLawFilterEnabled: event.caseLawFilterEnabled !== false,
    cacheHit: Boolean(event.cacheHit),
    retrievalLatencyMs: latency != null && latency >= 0 ? Math.floor(latency) : null,
    finalCaseLawCount: toNonNegativeInt(event.finalCaseLawCount),
    verifiedCount: toNonNegativeInt(event.verifiedCount),
  };
}

function buildStoredEvent(metricsPayload = {}) {
  return normalizeEvent({
    ts: Date.now(),
    source: metricsPayload.source,
    reason: metricsPayload.reason,
    retrievalError:
      metricsPayload.retrievalError === true ||
      metricsPayload.reason === "retrieval_error" ||
      metricsPayload.reason === "missing_api_key",
    caseLawFilterEnabled: metricsPayload.caseLawFilterEnabled !== false,
    cacheHit: metricsPayload.cacheHit === true,
    retrievalLatencyMs: metricsPayload.retrievalLatencyMs,
    finalCaseLawCount: metricsPayload.finalCaseLawCount,
    verifiedCount: metricsPayload.verifiedCount,
  });
}

function pruneMemory(nowMs = Date.now()) {
  const cutoff = nowMs - MAX_RETENTION_MS;
  while (memoryEvents.length > 0 && memoryEvents[0].ts < cutoff) {
    memoryEvents.shift();
  }
  if (memoryEvents.length > MAX_EVENTS) {
    memoryEvents.splice(0, memoryEvents.length - MAX_EVENTS);
  }
}

async function readRedisEvents() {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
  );
  const rows = await Promise.race([redis.lrange(EVENT_LIST_KEY, 0, -1), timeout]);
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const row of rows) {
    const normalized = normalizeEvent(row);
    if (normalized) out.push(normalized);
  }
  return out;
}

function ratio(numerator, denominator) {
  if (!denominator) return null;
  return Number((numerator / denominator).toFixed(4));
}

function percentile(values, pct) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(pct * sorted.length) - 1);
  return sorted[Math.min(index, sorted.length - 1)];
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

function computeWindowStats(events, nowMs, windowMs) {
  const cutoff = nowMs - windowMs;
  const windowEvents = events.filter((event) => event.ts >= cutoff);
  const retrievalEvents = windowEvents.filter((event) => event.source === "retrieval");
  const cacheEvents = windowEvents.filter((event) => event.source === "cache");

  const filterDisabledCount = retrievalEvents.filter((event) => event.reason === "filter_disabled").length;
  const missingApiKeyCount = retrievalEvents.filter((event) => event.reason === "missing_api_key").length;

  const operationalEvents = retrievalEvents.filter(
    (event) => event.caseLawFilterEnabled && event.reason !== "filter_disabled"
  );
  const errorEvents = operationalEvents.filter(
    (event) =>
      event.retrievalError ||
      event.reason === "retrieval_error" ||
      event.reason === "missing_api_key"
  );
  const qualityEvents = operationalEvents.filter(
    (event) => event.reason !== "retrieval_error" && event.reason !== "missing_api_key"
  );
  const noVerifiedEvents = qualityEvents.filter((event) => event.finalCaseLawCount === 0);
  const verifiedEvents = qualityEvents.filter((event) => event.finalCaseLawCount > 0);

  const latencyValues = operationalEvents
    .map((event) => event.retrievalLatencyMs)
    .filter((value) => Number.isFinite(value));

  const verifiedTotal = qualityEvents.reduce((sum, event) => sum + event.finalCaseLawCount, 0);
  const lastEvent = windowEvents.length > 0 ? windowEvents[windowEvents.length - 1] : null;

  return {
    samples: {
      total: windowEvents.length,
      retrieval: retrievalEvents.length,
      cache: cacheEvents.length,
      operational: operationalEvents.length,
      quality: qualityEvents.length,
      latency: latencyValues.length,
    },
    counts: {
      filterDisabled: filterDisabledCount,
      missingApiKey: missingApiKeyCount,
      errors: errorEvents.length,
      noVerified: noVerifiedEvents.length,
      verifiedResults: verifiedEvents.length,
    },
    rates: {
      errorRate: ratio(errorEvents.length, operationalEvents.length),
      noVerifiedRate: ratio(noVerifiedEvents.length, qualityEvents.length),
      avgVerifiedPerRequest: qualityEvents.length
        ? Number((verifiedTotal / qualityEvents.length).toFixed(4))
        : null,
    },
    latencyMs: {
      avg: average(latencyValues),
      p95: percentile(latencyValues, 0.95),
    },
    lastEventAt: lastEvent ? new Date(lastEvent.ts).toISOString() : null,
  };
}

export async function recordRetrievalMetricsEvent(metricsPayload = {}) {
  const event = buildStoredEvent(metricsPayload);
  if (!event) return false;

  if (redis) {
    try {
      const timeout = () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
        );
      await Promise.race([redis.rpush(EVENT_LIST_KEY, JSON.stringify(event)), timeout()]);
      await Promise.race([redis.ltrim(EVENT_LIST_KEY, -MAX_EVENTS, -1), timeout()]);
      await Promise.race([redis.expire(EVENT_LIST_KEY, Math.ceil(MAX_RETENTION_MS / 1000)), timeout()]);
      return true;
    } catch {
      // fall through to in-memory store
    }
  }

  memoryEvents.push(event);
  pruneMemory(event.ts);
  return true;
}

export async function getRetrievalEvents({ nowMs = Date.now() } = {}) {
  let events = [];
  if (redis) {
    try {
      events = await readRedisEvents();
    } catch {
      events = [...memoryEvents];
    }
  } else {
    events = [...memoryEvents];
  }

  const cutoff = nowMs - MAX_RETENTION_MS;
  const recent = events.filter((event) => event.ts >= cutoff).sort((a, b) => a.ts - b.ts);

  if (!redis) {
    memoryEvents.length = 0;
    memoryEvents.push(...recent);
    pruneMemory(nowMs);
  }

  return recent;
}

export async function getRetrievalHealthSnapshot({ nowMs = Date.now() } = {}) {
  const events = await getRetrievalEvents({ nowMs });
  const windows = {};

  for (const [label, windowMs] of Object.entries(RETRIEVAL_WINDOWS)) {
    windows[label] = computeWindowStats(events, nowMs, windowMs);
  }

  return {
    generatedAt: new Date(nowMs).toISOString(),
    retentionMs: MAX_RETENTION_MS,
    totalStoredEvents: events.length,
    windows,
  };
}
