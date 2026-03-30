// api/_retrievalThresholds.js
// Threshold evaluation + deduped alert logging for retrieval health.

import { createLog } from "./_logging.js";
import { redis } from "./_rateLimit.js";
import { isIP } from "node:net";

const REDIS_TIMEOUT_MS = 500;
import { getRetrievalHealthSnapshot } from "./_retrievalHealthStore.js";

const ALERT_DEDUPE_SECONDS = 15 * 60;
const ALERT_KEY_PREFIX = "metrics:retrieval:alert";
const MIN_SAMPLE_SIZE = 10;

const memoryAlertState = new Map();

const WEBHOOK_TIMEOUT_MS = 8000;

function isPrivateOrLocalHost(hostname = "") {
  const host = String(hostname).trim().toLowerCase();
  if (!host) return true;
  if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local")) return true;

  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const [a, b] = host.split(".").map((v) => Number.parseInt(v, 10));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }

  if (ipVersion === 6) {
    if (host === "::1") return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true; // ULA
    if (host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb")) return true; // link-local
  }

  return false;
}

function isAllowedWebhookHost(hostname = "") {
  const allowlistRaw = process.env.RETRIEVAL_ALERT_WEBHOOK_HOST_ALLOWLIST || "";
  const allowlist = allowlistRaw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) return true;
  const host = String(hostname).trim().toLowerCase();
  return allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function getAlertWebhookUrl() {
  const url = process.env.RETRIEVAL_ALERT_WEBHOOK_URL || "";
  if (typeof url !== "string" || !url.trim()) return "";

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return "";
  }

  const allowInsecureHttp = process.env.RETRIEVAL_ALERT_WEBHOOK_ALLOW_HTTP === "true";
  if (parsed.protocol !== "https:" && !allowInsecureHttp) return "";
  if (isPrivateOrLocalHost(parsed.hostname)) return "";
  if (!isAllowedWebhookHost(parsed.hostname)) return "";

  return parsed.toString();
}

function buildWebhookBody(alert) {
  const line = [
    "[CaseDive] Retrieval threshold breach",
    alert.message,
    `Alert: ${alert.id} | metric=${alert.metric} | window=${alert.window}`,
    `value=${alert.value} | threshold=${alert.threshold} | at=${alert.evaluatedAt}`,
  ].join("\n");
  return {
    text: line,
    content: line,
    alert,
    source: "casedive-retrieval",
  };
}

async function postAlertToWebhook(alert, webhookUrl) {
  if (!webhookUrl) return { ok: false, skipped: true };

  const body = JSON.stringify(buildWebhookBody(alert));
  const signal =
    typeof AbortSignal !== "undefined" && AbortSignal.timeout
      ? AbortSignal.timeout(WEBHOOK_TIMEOUT_MS)
      : undefined;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      ...(signal ? { signal } : {}),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, skipped: false };
  }
}

export const RETRIEVAL_ALERT_THRESHOLDS = {
  errorRate1h: 0.05,
  noVerifiedRate1h: 0.45,
  p95LatencyMs1h: 2500,
  avgVerifiedPerRequestMin1h: 0.6,
  minSampleSize1h: MIN_SAMPLE_SIZE,
};

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatFloat(value) {
  return Number(value).toFixed(3);
}

function buildAlert(id, metric, window, value, threshold, message) {
  return {
    id,
    metric,
    window,
    value,
    threshold,
    message,
    evaluatedAt: new Date().toISOString(),
  };
}

export function evaluateRetrievalAlerts(healthSnapshot = {}) {
  const oneHour = healthSnapshot?.windows?.["1h"];
  if (!oneHour) return [];

  const alerts = [];
  const operationalSamples = oneHour?.samples?.operational || 0;
  const qualitySamples = oneHour?.samples?.quality || 0;
  const latencySamples = oneHour?.samples?.latency || 0;

  const errorRate = oneHour?.rates?.errorRate;
  if (
    operationalSamples >= RETRIEVAL_ALERT_THRESHOLDS.minSampleSize1h &&
    errorRate != null &&
    errorRate > RETRIEVAL_ALERT_THRESHOLDS.errorRate1h
  ) {
    alerts.push(
      buildAlert(
        "retrieval_error_rate_1h",
        "errorRate",
        "1h",
        errorRate,
        RETRIEVAL_ALERT_THRESHOLDS.errorRate1h,
        `Retrieval error rate is ${formatPercent(errorRate)} over 1h (threshold ${formatPercent(
          RETRIEVAL_ALERT_THRESHOLDS.errorRate1h
        )}).`
      )
    );
  }

  const noVerifiedRate = oneHour?.rates?.noVerifiedRate;
  if (
    qualitySamples >= RETRIEVAL_ALERT_THRESHOLDS.minSampleSize1h &&
    noVerifiedRate != null &&
    noVerifiedRate > RETRIEVAL_ALERT_THRESHOLDS.noVerifiedRate1h
  ) {
    alerts.push(
      buildAlert(
        "retrieval_no_verified_rate_1h",
        "noVerifiedRate",
        "1h",
        noVerifiedRate,
        RETRIEVAL_ALERT_THRESHOLDS.noVerifiedRate1h,
        `No-verified rate is ${formatPercent(noVerifiedRate)} over 1h (threshold ${formatPercent(
          RETRIEVAL_ALERT_THRESHOLDS.noVerifiedRate1h
        )}).`
      )
    );
  }

  const p95Latency = oneHour?.latencyMs?.p95;
  if (
    latencySamples >= RETRIEVAL_ALERT_THRESHOLDS.minSampleSize1h &&
    p95Latency != null &&
    p95Latency > RETRIEVAL_ALERT_THRESHOLDS.p95LatencyMs1h
  ) {
    alerts.push(
      buildAlert(
        "retrieval_p95_latency_1h",
        "p95LatencyMs",
        "1h",
        p95Latency,
        RETRIEVAL_ALERT_THRESHOLDS.p95LatencyMs1h,
        `Retrieval p95 latency is ${p95Latency}ms over 1h (threshold ${RETRIEVAL_ALERT_THRESHOLDS.p95LatencyMs1h}ms).`
      )
    );
  }

  const avgVerified = oneHour?.rates?.avgVerifiedPerRequest;
  if (
    qualitySamples >= RETRIEVAL_ALERT_THRESHOLDS.minSampleSize1h &&
    avgVerified != null &&
    avgVerified < RETRIEVAL_ALERT_THRESHOLDS.avgVerifiedPerRequestMin1h
  ) {
    alerts.push(
      buildAlert(
        "retrieval_avg_verified_per_request_1h",
        "avgVerifiedPerRequest",
        "1h",
        avgVerified,
        RETRIEVAL_ALERT_THRESHOLDS.avgVerifiedPerRequestMin1h,
        `Average verified results/request is ${formatFloat(avgVerified)} over 1h (threshold ${formatFloat(
          RETRIEVAL_ALERT_THRESHOLDS.avgVerifiedPerRequestMin1h
        )}).`
      )
    );
  }

  return alerts;
}

function pruneMemoryAlertState(nowMs) {
  for (const [key, expiresAt] of memoryAlertState.entries()) {
    if (expiresAt <= nowMs) memoryAlertState.delete(key);
  }
}

async function shouldEmitAlert(alertId, nowMs = Date.now()) {
  const key = `${ALERT_KEY_PREFIX}:${alertId}`;

  if (redis) {
    try {
      const timeout = () => new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
      );
      const existing = await Promise.race([redis.get(key), timeout()]);
      if (existing) return false;
      await Promise.race([redis.setex(key, ALERT_DEDUPE_SECONDS, String(nowMs)), timeout()]);
      return true;
    } catch {
      // fallback to in-memory dedupe
    }
  }

  pruneMemoryAlertState(nowMs);
  const existingExpiry = memoryAlertState.get(key);
  if (existingExpiry && existingExpiry > nowMs) return false;
  memoryAlertState.set(key, nowMs + ALERT_DEDUPE_SECONDS * 1000);
  return true;
}

export async function emitRetrievalAlerts({ requestId = "unknown", endpoint = "unknown", healthSnapshot = null } = {}) {
  const snapshot = healthSnapshot || (await getRetrievalHealthSnapshot());
  const alerts = evaluateRetrievalAlerts(snapshot);
  if (alerts.length === 0) {
    return { alerts, emitted: [] };
  }

  const webhookUrl = getAlertWebhookUrl();
  const emitted = [];
  for (const alert of alerts) {
    // eslint-disable-next-line no-await-in-loop
    const shouldEmit = await shouldEmitAlert(alert.id);
    if (!shouldEmit) continue;
    emitted.push(alert);
    console.log(
      createLog({
        requestId,
        endpoint,
        event: "retrieval_alert",
        dedupeSeconds: ALERT_DEDUPE_SECONDS,
        ...alert,
      })
    );
    // eslint-disable-next-line no-await-in-loop
    const webhookResult = await postAlertToWebhook(alert, webhookUrl);
    if (webhookUrl && webhookResult && !webhookResult.ok && !webhookResult.skipped) {
      console.log(
        createLog({
          requestId,
          endpoint,
          event: "retrieval_alert_webhook_failed",
          alertId: alert.id,
          webhookStatus: webhookResult.status ?? null,
        })
      );
    }
  }

  return { alerts, emitted };
}
