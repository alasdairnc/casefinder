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

function fail(code, message) {
  const text = `[perf-monitor] ${message}`;
  console.error(text);
  if (process.env.GITHUB_ACTIONS === "true") {
    // Surface a clear annotation in Actions instead of only "exit code N".
    console.log(`::error::${message}`);
  }
  process.exit(code);
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
  const endpoint = process.env.PERF_HEALTH_URL || "https://www.casedive.ca/api/retrieval-health";
  const token = process.env.RETRIEVAL_HEALTH_TOKEN || "";
  const outputFormat = (process.env.PERF_MONITOR_OUTPUT || "text").toLowerCase();

  if (!token) {
    fail(3, "RETRIEVAL_HEALTH_TOKEN is required.");
  }

  let res;
  try {
    res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    fail(6, `Network/TLS error fetching retrieval-health endpoint: ${err?.message || String(err)}`);
  }

  const rawText = await res.text();
  let body = {};
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    body = {};
  }
  if (!res.ok) {
    const rawPreview = typeof rawText === "string" ? rawText.replace(/\s+/g, " ").trim().slice(0, 220) : "";
    const details = body?.error || rawPreview || "unknown error";
    const looksLikeHtml = /^<!doctype html>/i.test(rawPreview);
    const looksLikeCloudflareChallenge =
      /just a moment/i.test(rawPreview) || /cf-chl|cloudflare/i.test(rawPreview);
    const looksLikeDeploymentNotFound =
      /deployment_not_found/i.test(rawPreview) || /this deployment cannot be found/i.test(rawPreview);

    if (res.status === 404 && looksLikeDeploymentNotFound) {
      fail(
        6,
        `Invalid Vercel deployment hostname in PERF_HEALTH_URL. Set PERF_HEALTH_URL to your real production domain/API URL (for example: https://<your-project>.vercel.app/api/retrieval-health), then re-run.`
      );
    }

    if (res.status === 403 && (looksLikeHtml || looksLikeCloudflareChallenge)) {
      fail(
        6,
        `Blocked by edge protection (403 challenge page). Use PERF_HEALTH_URL with your actual Vercel production API hostname or allowlist this route in Cloudflare. Preview: ${details}`
      );
    }
    if (res.status === 401) {
      fail(4, `Unauthorized (401) from retrieval-health endpoint: ${details}`);
    }
    if (res.status === 429) {
      fail(5, `Rate limited (429) by retrieval-health endpoint: ${details}`);
    }
    if (res.status >= 500) {
      fail(6, `Server error (${res.status}) from retrieval-health endpoint: ${details}`);
    }
    fail(2, `Request failed (${res.status}) from retrieval-health endpoint: ${details}`);
  }

  const oneHour = body?.windows?.["1h"] || {};
  const alerts = Array.isArray(body?.alerts) ? body.alerts : [];
  const thresholds = body?.thresholds || {};
  const failures = Array.isArray(body?.recentFailures) ? body.recentFailures : [];
  const improvements = Array.isArray(body?.improvements) ? body.improvements : [];

  if (outputFormat !== "json") {
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
  }

  if (outputFormat !== "json" && alerts.length > 0) {
    console.log("[perf-monitor] Active alerts:");
    for (const alert of alerts.slice(0, 5)) {
      console.log(`- ${alert?.id || "unknown"}: ${alert?.message || "(no message)"}`);
    }
  }

  const topFailures = failures.slice(0, 3);
  if (outputFormat !== "json" && topFailures.length > 0) {
    console.log("[perf-monitor] Recent failures (top 3):");
    for (const f of topFailures) {
      const scenario = (f?.scenarioSnippet || "(missing scenario)").replace(/\s+/g, " ").slice(0, 140);
      console.log(`- ${f?.ts || "n/a"} | ${f?.endpoint || "unknown"} | ${f?.reason || "unknown"} | ${scenario}`);
    }
  }

  const topImprovements = improvements.slice(0, 3);
  if (outputFormat !== "json" && topImprovements.length > 0) {
    console.log("[perf-monitor] Suggested retrieval improvements (top 3):");
    for (const item of topImprovements) {
      const scenario = (item?.scenarioSnippet || "(missing scenario)").replace(/\s+/g, " ").slice(0, 120);
      const terms = Array.isArray(item?.suggestedTerms) ? item.suggestedTerms.slice(0, 3).join(" | ") : "";
      console.log(`- ${item?.classId || "general"} | ${item?.failureCount || 0}x | ${scenario}`);
      if (terms) console.log(`  terms: ${terms}`);
    }
  }

  const localBreaches = evaluateLocalBreaches(oneHour, thresholds);
  const hasIssues = alerts.length > 0 || localBreaches.length > 0;

  const payload = {
    generatedAt: body?.generatedAt || null,
    snapshotSource: body?.snapshotSource || null,
    storedEvents: toNumber(body?.totalStoredEvents),
    oneHour: {
      errorRate: oneHour?.rates?.errorRate ?? null,
      noVerifiedRate: oneHour?.rates?.noVerifiedRate ?? null,
      fallbackRate: oneHour?.rates?.fallbackPathRate ?? null,
      avgRelevance: oneHour?.rates?.avgRelevanceScore ?? null,
      p95LatencyMs: oneHour?.latencyMs?.p95 ?? null,
    },
    alerts,
    thresholds,
    recentFailures: failures,
    improvements,
    localBreaches,
    hasIssues,
  };

  if (outputFormat === "json") {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (outputFormat !== "json" && localBreaches.length > 0) {
    console.log("[perf-monitor] Threshold breaches:");
    for (const breach of localBreaches) {
      console.log(`- ${breach}`);
    }
  }

  if (hasIssues) {
    console.error("[perf-monitor] Performance gate failed.");
    if (process.env.GITHUB_ACTIONS === "true") {
      console.log("::error::Performance threshold breach detected (quality issue). Review alerts/recentFailures in log output.");
    }
    process.exit(1);
  }

  if (outputFormat !== "json") {
    console.log("[perf-monitor] OK: no active performance breaches.");
  }
}

run().catch((err) => {
  fail(2, `Unexpected failure: ${err?.message || String(err)}`);
});
