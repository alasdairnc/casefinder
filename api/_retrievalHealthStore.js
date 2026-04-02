// api/_retrievalHealthStore.js
// Rolling retrieval metrics store with Redis + in-memory fallback.

import { redis } from "./_rateLimit.js";

const EVENT_LIST_KEY = "metrics:retrieval:events:v1";
const LAST_EVENT_KEY = "metrics:retrieval:last-event:v1";
const EVENT_COUNT_KEY = "metrics:retrieval:event-count:v1";
const ALLTIME_KEY = "metrics:retrieval:alltime:v1";
const REDIS_TIMEOUT_MS = 2000;
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
    endpoint: typeof event.endpoint === "string" ? event.endpoint : "unknown",
    source: typeof event.source === "string" ? event.source : "retrieval",
    reason: typeof event.reason === "string" ? event.reason : "unknown",
    retrievalError: Boolean(event.retrievalError),
    caseLawFilterEnabled: event.caseLawFilterEnabled !== false,
    cacheHit: Boolean(event.cacheHit),
    retrievalLatencyMs: latency != null && latency >= 0 ? Math.floor(latency) : null,
    finalCaseLawCount: toNonNegativeInt(event.finalCaseLawCount),
    verifiedCount: toNonNegativeInt(event.verifiedCount),
    relevanceScoreAvg: (() => {
      const score = toNumber(event.relevanceScoreAvg);
      if (score == null || score < 0) return null;
      return Number(score.toFixed(3));
    })(),
    fallbackPathUsed: event.fallbackPathUsed === true,
    semanticFilterDropCount: toNonNegativeInt(event.semanticFilterDropCount),
    candidateSourceMix: {
      ai: toNonNegativeInt(event?.candidateSourceMix?.ai),
      landmark: toNonNegativeInt(event?.candidateSourceMix?.landmark),
      localFallback: toNonNegativeInt(event?.candidateSourceMix?.localFallback),
    },
    scenarioSnippet:
      typeof event.scenarioSnippet === "string" && event.scenarioSnippet.trim().length > 0
        ? event.scenarioSnippet.trim().slice(0, 280)
        : null,
    errorMessage:
      typeof event.errorMessage === "string" && event.errorMessage.trim().length > 0
        ? event.errorMessage.trim().slice(0, 200)
        : null,
  };
}

function buildStoredEvent(metricsPayload = {}) {
  return normalizeEvent({
    ts: Date.now(),
    endpoint: metricsPayload.endpoint,
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
    relevanceScoreAvg: metricsPayload.relevanceScoreAvg,
    fallbackPathUsed: metricsPayload.fallbackPathUsed === true,
    semanticFilterDropCount: metricsPayload.semanticFilterDropCount,
    candidateSourceMix: metricsPayload.candidateSourceMix,
    scenarioSnippet: metricsPayload.scenarioSnippet,
    errorMessage: metricsPayload.errorMessage,
  });
}

function getRecentFailureScenarios(events = [], limit = 20) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const failed = events.filter((event) => {
    const isOperational =
      event.source === "retrieval" &&
      event.caseLawFilterEnabled &&
      event.reason !== "filter_disabled";
    if (!isOperational) return false;
    return event.retrievalError || event.finalCaseLawCount === 0;
  });

  return failed
    .slice()
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
    .map((event) => ({
      ts: new Date(event.ts).toISOString(),
      endpoint: event.endpoint || "unknown",
      reason: event.reason || "unknown",
      retrievalError: Boolean(event.retrievalError),
      finalCaseLawCount: toNonNegativeInt(event.finalCaseLawCount),
      verifiedCount: toNonNegativeInt(event.verifiedCount),
      fallbackPathUsed: event.fallbackPathUsed === true,
      latencyMs: Number.isFinite(event.retrievalLatencyMs) ? event.retrievalLatencyMs : null,
      semanticFilterDropCount: toNonNegativeInt(event.semanticFilterDropCount),
      scenarioSnippet: event.scenarioSnippet || null,
      errorMessage: event.errorMessage || null,
    }));
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
  const raw = await Promise.race([redis.get(EVENT_LIST_KEY), timeout]);
  let rows = raw;

  if (typeof raw === "string") {
    try {
      rows = JSON.parse(raw);
    } catch {
      rows = [];
    }
  }

  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const row of rows) {
    const normalized = normalizeEvent(row);
    if (normalized) out.push(normalized);
  }
  return out;
}

async function readRedisLastEvent() {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
  );
  const raw = await Promise.race([redis.get(LAST_EVENT_KEY), timeout]);
  return normalizeEvent(raw);
}

async function writeRedisLastEvent(event) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
  );
  await Promise.race([
    redis.setex(LAST_EVENT_KEY, Math.ceil(MAX_RETENTION_MS / 1000), JSON.stringify(event)),
    timeout,
  ]);
}

async function incrementRedisEventCount() {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
  );
  const count = await Promise.race([redis.incr(EVENT_COUNT_KEY), timeout]);
  await Promise.race([
    redis.expire(EVENT_COUNT_KEY, Math.ceil(MAX_RETENTION_MS / 1000)),
    timeout,
  ]);
  const num = Number(count);
  return Number.isFinite(num) ? num : null;
}

async function readRedisEventCount() {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
  );
  const raw = await Promise.race([redis.get(EVENT_COUNT_KEY), timeout]);
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
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
  const relevanceScores = qualityEvents
    .map((event) => event.relevanceScoreAvg)
    .filter((value) => Number.isFinite(value));
  const fallbackPathCount = operationalEvents.filter((event) => event.fallbackPathUsed).length;
  const semanticFilterDrops = operationalEvents.reduce(
    (sum, event) => sum + toNonNegativeInt(event.semanticFilterDropCount),
    0
  );
  const sourceMixTotals = operationalEvents.reduce(
    (acc, event) => {
      acc.ai += toNonNegativeInt(event?.candidateSourceMix?.ai);
      acc.landmark += toNonNegativeInt(event?.candidateSourceMix?.landmark);
      acc.localFallback += toNonNegativeInt(event?.candidateSourceMix?.localFallback);
      return acc;
    },
    { ai: 0, landmark: 0, localFallback: 0 }
  );
  const sourceTotal = sourceMixTotals.ai + sourceMixTotals.landmark + sourceMixTotals.localFallback;
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
      fallbackPath: fallbackPathCount,
      semanticFilterDrops,
    },
    rates: {
      errorRate: ratio(errorEvents.length, operationalEvents.length),
      noVerifiedRate: ratio(noVerifiedEvents.length, qualityEvents.length),
      avgVerifiedPerRequest: qualityEvents.length
        ? Number((verifiedTotal / qualityEvents.length).toFixed(4))
        : null,
      fallbackPathRate: ratio(fallbackPathCount, operationalEvents.length),
      avgRelevanceScore: relevanceScores.length
        ? Number((relevanceScores.reduce((sum, value) => sum + value, 0) / relevanceScores.length).toFixed(4))
        : null,
      avgSemanticFilterDrops: operationalEvents.length
        ? Number((semanticFilterDrops / operationalEvents.length).toFixed(4))
        : null,
      candidateSourceMix: sourceTotal > 0
        ? {
            ai: Number((sourceMixTotals.ai / sourceTotal).toFixed(4)),
            landmark: Number((sourceMixTotals.landmark / sourceTotal).toFixed(4)),
            localFallback: Number((sourceMixTotals.localFallback / sourceTotal).toFixed(4)),
          }
        : null,
    },
    latencyMs: {
      avg: average(latencyValues),
      p95: percentile(latencyValues, 0.95),
    },
    lastEventAt: lastEvent ? new Date(lastEvent.ts).toISOString() : null,
  };
}

async function updateAlltimeAccumulator(event) {
  const timeout = () =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
    );

  const raw = await Promise.race([redis.get(ALLTIME_KEY), timeout()]);
  let acc = {};
  if (raw) {
    try {
      acc = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (typeof acc !== "object" || acc === null) acc = {};
    } catch {
      acc = {};
    }
  }

  const isRetrieval = event.source !== "cache";
  const isCache = event.source === "cache";
  const isOperational =
    isRetrieval && event.caseLawFilterEnabled && event.reason !== "filter_disabled";
  const isError =
    isOperational &&
    (event.retrievalError ||
      event.reason === "retrieval_error" ||
      event.reason === "missing_api_key");
  const isQuality = isOperational && !isError;
  const hasLatency = isOperational && Number.isFinite(event.retrievalLatencyMs);

  acc.firstTs = acc.firstTs ? Math.min(acc.firstTs, event.ts) : event.ts;
  acc.lastTs = Math.max(acc.lastTs || 0, event.ts);
  acc.total = (acc.total || 0) + 1;
  acc.retrieval = (acc.retrieval || 0) + (isRetrieval ? 1 : 0);
  acc.cache = (acc.cache || 0) + (isCache ? 1 : 0);
  acc.operational = (acc.operational || 0) + (isOperational ? 1 : 0);
  acc.quality = (acc.quality || 0) + (isQuality ? 1 : 0);
  acc.latencyCount = (acc.latencyCount || 0) + (hasLatency ? 1 : 0);
  acc.filterDisabled =
    (acc.filterDisabled || 0) + (isRetrieval && event.reason === "filter_disabled" ? 1 : 0);
  acc.missingApiKey =
    (acc.missingApiKey || 0) + (isRetrieval && event.reason === "missing_api_key" ? 1 : 0);
  acc.errors = (acc.errors || 0) + (isError ? 1 : 0);
  acc.noVerified =
    (acc.noVerified || 0) + (isQuality && event.finalCaseLawCount === 0 ? 1 : 0);
  acc.verifiedResults =
    (acc.verifiedResults || 0) + (isQuality && event.finalCaseLawCount > 0 ? 1 : 0);
  acc.verifiedTotal = (acc.verifiedTotal || 0) + (isQuality ? event.finalCaseLawCount : 0);
  acc.latencySum = (acc.latencySum || 0) + (hasLatency ? event.retrievalLatencyMs : 0);
  acc.fallbackPath = (acc.fallbackPath || 0) + (isOperational && event.fallbackPathUsed ? 1 : 0);
  acc.semanticFilterDrops =
    (acc.semanticFilterDrops || 0) + (isOperational ? toNonNegativeInt(event.semanticFilterDropCount) : 0);
  acc.relevanceScoreCount =
    (acc.relevanceScoreCount || 0) + (isQuality && Number.isFinite(event.relevanceScoreAvg) ? 1 : 0);
  acc.relevanceScoreSum =
    (acc.relevanceScoreSum || 0) + (isQuality && Number.isFinite(event.relevanceScoreAvg) ? event.relevanceScoreAvg : 0);
  acc.sourceAi =
    (acc.sourceAi || 0) + (isOperational ? toNonNegativeInt(event?.candidateSourceMix?.ai) : 0);
  acc.sourceLandmark =
    (acc.sourceLandmark || 0) + (isOperational ? toNonNegativeInt(event?.candidateSourceMix?.landmark) : 0);
  acc.sourceLocalFallback =
    (acc.sourceLocalFallback || 0) + (isOperational ? toNonNegativeInt(event?.candidateSourceMix?.localFallback) : 0);

  await Promise.race([redis.set(ALLTIME_KEY, JSON.stringify(acc)), timeout()]);
}

async function getAlltimeSnapshot(events) {
  if (redis) {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
      );
      const raw = await Promise.race([redis.get(ALLTIME_KEY), timeout]);
      if (raw) {
        const acc = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (acc && typeof acc === "object") {
          const {
            total = 0,
            retrieval = 0,
            cache = 0,
            operational = 0,
            quality = 0,
            latencyCount = 0,
            filterDisabled = 0,
            missingApiKey = 0,
            errors = 0,
            noVerified = 0,
            verifiedResults = 0,
            verifiedTotal = 0,
            latencySum = 0,
            fallbackPath = 0,
            semanticFilterDrops = 0,
            relevanceScoreCount = 0,
            relevanceScoreSum = 0,
            sourceAi = 0,
            sourceLandmark = 0,
            sourceLocalFallback = 0,
          } = acc;
          const sourceTotal = sourceAi + sourceLandmark + sourceLocalFallback;
          return {
            firstEventAt: acc.firstTs ? new Date(acc.firstTs).toISOString() : null,
            samples: { total, retrieval, cache, operational, quality, latency: latencyCount },
            counts: {
              filterDisabled,
              missingApiKey,
              errors,
              noVerified,
              verifiedResults,
              fallbackPath,
              semanticFilterDrops,
            },
            rates: {
              errorRate: ratio(errors, operational),
              noVerifiedRate: ratio(noVerified, quality),
              avgVerifiedPerRequest: quality
                ? Number((verifiedTotal / quality).toFixed(4))
                : null,
              fallbackPathRate: ratio(fallbackPath, operational),
              avgRelevanceScore: relevanceScoreCount
                ? Number((relevanceScoreSum / relevanceScoreCount).toFixed(4))
                : null,
              avgSemanticFilterDrops: operational
                ? Number((semanticFilterDrops / operational).toFixed(4))
                : null,
              candidateSourceMix: sourceTotal > 0
                ? {
                    ai: Number((sourceAi / sourceTotal).toFixed(4)),
                    landmark: Number((sourceLandmark / sourceTotal).toFixed(4)),
                    localFallback: Number((sourceLocalFallback / sourceTotal).toFixed(4)),
                  }
                : null,
            },
            latencyMs: {
              avg: latencyCount > 0 ? Math.round(latencySum / latencyCount) : null,
              p95: null,
            },
            lastEventAt: acc.lastTs ? new Date(acc.lastTs).toISOString() : null,
          };
        }
      }
    } catch {
      // fall through to in-memory computation
    }
  }

  // In-memory fallback: compute from all stored events (no window cutoff)
  return computeWindowStats(events, Date.now(), Infinity);
}

export async function recordRetrievalMetricsEvent(metricsPayload = {}) {
  const event = buildStoredEvent(metricsPayload);
  if (!event) return false;

  if (redis) {
    // Guaranteed lightweight writes first.
    try {
      await Promise.allSettled([writeRedisLastEvent(event), incrementRedisEventCount()]);
    } catch {
      // Ignore; continue to best-effort primary write path.
    }

    // Best-effort alltime accumulator update (no TTL — persists indefinitely).
    try {
      await updateAlltimeAccumulator(event);
    } catch {
      // Non-fatal.
    }

    try {
      const timeout = () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
        );
      const existing = await Promise.race([readRedisEvents(), timeout()]);
      const merged = [...existing, event];
      const cutoff = Date.now() - MAX_RETENTION_MS;
      const pruned = merged.filter((e) => e.ts >= cutoff);
      const capped = pruned.length > MAX_EVENTS ? pruned.slice(pruned.length - MAX_EVENTS) : pruned;

      await Promise.race([
        redis.setex(EVENT_LIST_KEY, Math.ceil(MAX_RETENTION_MS / 1000), JSON.stringify(capped)),
        timeout(),
      ]);

      // Backup channel: keep at least the latest event available for health checks.
      try {
        await writeRedisLastEvent(event);
      } catch {
        // Non-fatal backup write failure.
      }
      return true;
    } catch {
      // fall through to in-memory store
      try {
        await writeRedisLastEvent(event);
      } catch {
        // Ignore backup write failures.
      }
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

export async function getTrendlineSnapshots({ nowMs = Date.now(), buckets = 15, bucketMs = 5 * 60 * 1000 } = {}) {
  const events = await getRetrievalEvents({ nowMs });
  const windowStart = nowMs - buckets * bucketMs;

  const result = [];
  for (let i = 0; i < buckets; i++) {
    const bucketStart = windowStart + i * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    const ts = bucketEnd;

    const bucketEvents = events.filter((e) => e.ts >= bucketStart && e.ts < bucketEnd);
    const operational = bucketEvents.filter(
      (e) => e.source === "retrieval" && e.caseLawFilterEnabled && e.reason !== "filter_disabled"
    );
    const quality = operational.filter(
      (e) => e.reason !== "retrieval_error" && e.reason !== "missing_api_key"
    );
    const errors = operational.filter((e) => e.retrievalError);
    const noVerified = quality.filter((e) => e.finalCaseLawCount === 0);
    const latencies = operational.map((e) => e.retrievalLatencyMs).filter((v) => Number.isFinite(v));

    result.push({
      ts,
      errorRate: operational.length > 0 ? Number((errors.length / operational.length).toFixed(4)) : null,
      noVerifiedRate: quality.length > 0 ? Number((noVerified.length / quality.length).toFixed(4)) : null,
      avgLatencyMs: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
    });
  }

  return result;
}

export async function getRetrievalHealthSnapshot({ nowMs = Date.now() } = {}) {
  const events = await getRetrievalEvents({ nowMs });
  const windows = {};
  let snapshotSource = "primary";

  for (const [label, windowMs] of Object.entries(RETRIEVAL_WINDOWS)) {
    windows[label] = computeWindowStats(events, nowMs, windowMs);
  }

  let totalStoredEvents = events.length;

  // Backup read path: if primary storage returns no events, fall back to count + latest event keys.
  if (totalStoredEvents === 0 && redis) {
    try {
      const backupCount = await readRedisEventCount();
      const lastEvent = await readRedisLastEvent();
      if (backupCount > 0 || (lastEvent && lastEvent.ts >= nowMs - MAX_RETENTION_MS)) {
        totalStoredEvents = Math.max(backupCount, 1);
        snapshotSource = "backup_last_event";

        for (const [label, windowMs] of Object.entries(RETRIEVAL_WINDOWS)) {
          if (lastEvent.ts >= nowMs - windowMs) {
            const stats = windows[label];
            stats.samples.total = Math.max(1, stats.samples.total);
            if (lastEvent.source === "cache") {
              stats.samples.cache = Math.max(1, stats.samples.cache);
            } else {
              stats.samples.retrieval = Math.max(1, stats.samples.retrieval);
            }
            if (!stats.lastEventAt) {
              stats.lastEventAt = new Date(lastEvent.ts).toISOString();
            }
          }
        }
      }
    } catch {
      // Ignore fallback read failures and keep empty snapshot.
      snapshotSource = "empty";
    }
  } else if (totalStoredEvents === 0) {
    snapshotSource = "empty";
  }

  const alltime = await getAlltimeSnapshot(events);
  const recentFailures = getRecentFailureScenarios(events);

  return {
    generatedAt: new Date(nowMs).toISOString(),
    snapshotSource,
    retentionMs: MAX_RETENTION_MS,
    totalStoredEvents,
    windows,
    alltime,
    recentFailures,
  };
}
