#!/usr/bin/env node

function pct(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function num(value) {
  if (value == null || Number.isNaN(Number(value))) return "n/a";
  return String(value);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function evaluateLocalBreaches(oneHour, thresholds) {
  const breaches = [];
  if (!oneHour || !thresholds) return breaches;

  const errorRate = toNumber(oneHour?.rates?.errorRate);
  const noVerifiedRate = toNumber(oneHour?.rates?.noVerifiedRate);
  const fallbackRate = toNumber(oneHour?.rates?.fallbackPathRate);
  const avgRelevance = toNumber(oneHour?.rates?.avgRelevanceScore);
  const p95Latency = toNumber(oneHour?.latencyMs?.p95);

  if (errorRate != null && thresholds.errorRate1h != null && errorRate > thresholds.errorRate1h) {
    breaches.push(`errorRate1h ${pct(errorRate)} > ${pct(thresholds.errorRate1h)}`);
  }
  if (
    noVerifiedRate != null &&
    thresholds.noVerifiedRate1h != null &&
    noVerifiedRate > thresholds.noVerifiedRate1h
  ) {
    breaches.push(`noVerifiedRate1h ${pct(noVerifiedRate)} > ${pct(thresholds.noVerifiedRate1h)}`);
  }
  if (
    fallbackRate != null &&
    thresholds.fallbackPathRate1h != null &&
    fallbackRate > thresholds.fallbackPathRate1h
  ) {
    breaches.push(`fallbackPathRate1h ${pct(fallbackRate)} > ${pct(thresholds.fallbackPathRate1h)}`);
  }
  if (
    avgRelevance != null &&
    thresholds.avgRelevanceScoreMin1h != null &&
    avgRelevance < thresholds.avgRelevanceScoreMin1h
  ) {
    breaches.push(`avgRelevanceScore1h ${num(avgRelevance)} < ${num(thresholds.avgRelevanceScoreMin1h)}`);
  }
  if (
    p95Latency != null &&
    thresholds.p95LatencyMs1h != null &&
    p95Latency > thresholds.p95LatencyMs1h
  ) {
    breaches.push(`p95LatencyMs1h ${num(p95Latency)} > ${num(thresholds.p95LatencyMs1h)}`);
  }

  return breaches;
}

async function run() {
  const endpoint = process.env.PERF_HEALTH_URL || "https://casedive.ca/api/retrieval-health";
  const token = process.env.RETRIEVAL_HEALTH_TOKEN || "";

  if (!token) {
    console.error("[perf-monitor] RETRIEVAL_HEALTH_TOKEN is required.");
    process.exit(2);
  }

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`[perf-monitor] Request failed (${res.status}): ${body?.error || "unknown error"}`);
    process.exit(2);
  }

  const oneHour = body?.windows?.["1h"] || {};
  const alerts = Array.isArray(body?.alerts) ? body.alerts : [];
  const thresholds = body?.thresholds || {};
  const failures = Array.isArray(body?.recentFailures) ? body.recentFailures : [];

  console.log("[perf-monitor] Retrieval health snapshot");
  console.log(`generatedAt: ${body?.generatedAt || "n/a"}`);
  console.log(`snapshotSource: ${body?.snapshotSource || "n/a"}`);
  console.log(`storedEvents: ${num(body?.totalStoredEvents)}`);
  console.log(`1h operational samples: ${num(oneHour?.samples?.operational)}`);
  console.log(`1h quality samples: ${num(oneHour?.samples?.quality)}`);
  console.log(`1h error rate: ${pct(oneHour?.rates?.errorRate)}`);
  console.log(`1h no-verified rate: ${pct(oneHour?.rates?.noVerifiedRate)}`);
  console.log(`1h fallback rate: ${pct(oneHour?.rates?.fallbackPathRate)}`);
  console.log(`1h avg relevance: ${num(oneHour?.rates?.avgRelevanceScore)}`);
  console.log(`1h p95 latency: ${num(oneHour?.latencyMs?.p95)} ms`);
  console.log(`active alerts: ${alerts.length}`);

  const topFailures = failures.slice(0, 3);
  if (topFailures.length > 0) {
    console.log("[perf-monitor] Recent failures (top 3):");
    for (const f of topFailures) {
      const scenario = (f?.scenarioSnippet || "(missing scenario)").replace(/\s+/g, " ").slice(0, 140);
      console.log(`- ${f?.ts || "n/a"} | ${f?.endpoint || "unknown"} | ${f?.reason || "unknown"} | ${scenario}`);
    }
  }

  const localBreaches = evaluateLocalBreaches(oneHour, thresholds);
  const hasIssues = alerts.length > 0 || localBreaches.length > 0;

  if (localBreaches.length > 0) {
    console.log("[perf-monitor] Threshold breaches:");
    for (const breach of localBreaches) {
      console.log(`- ${breach}`);
    }
  }

  if (hasIssues) {
    console.error("[perf-monitor] Performance gate failed.");
    process.exit(1);
  }

  console.log("[perf-monitor] OK: no active performance breaches.");
}

run().catch((err) => {
  console.error(`[perf-monitor] Unexpected failure: ${err?.message || String(err)}`);
  process.exit(2);
});
