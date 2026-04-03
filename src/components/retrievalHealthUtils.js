export function pct(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function num(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return String(value);
}

export function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function clip(text, maxLen = 180) {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) return "—";
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen)}...`;
}

export function buildAgentFixPrompt(sample = {}) {
  const lines = [
    "Investigate and fix retrieval failure for this CaseDive scenario.",
    "",
    `Failure time: ${sample.ts || "unknown"}`,
    `Endpoint: ${sample.endpoint || "unknown"}`,
    `Reason: ${sample.reason || "unknown"}`,
    `Retrieval error: ${sample.retrievalError ? "yes" : "no"}`,
    `Final case-law count: ${sample.finalCaseLawCount ?? 0}`,
    `Verified count: ${sample.verifiedCount ?? 0}`,
    `Fallback used: ${sample.fallbackPathUsed ? "yes" : "no"}`,
    `Latency (ms): ${sample.latencyMs ?? "n/a"}`,
    `Semantic drops: ${sample.semanticFilterDropCount ?? 0}`,
    "",
    "Scenario:",
    sample.scenarioSnippet || "(not captured)",
  ];

  if (sample.errorMessage) {
    lines.push("", `Error message: ${sample.errorMessage}`);
  }

  lines.push(
    "",
    "Please:",
    "1) identify likely root cause in retrieval pipeline,",
    "2) propose minimal code fix,",
    "3) add or update tests to guard against recurrence,",
    "4) run relevant test commands and summarize results."
  );

  return lines.join("\n");
}

export function severityForMetric(value, threshold, direction = "above_is_bad") {
  if (value == null || threshold == null) {
    return { label: "No data", color: "#8c8c8c", border: "#b3b3b3", level: "neutral" };
  }

  if (direction === "below_is_bad") {
    if (value < threshold) return { label: "Critical", color: "#c75454", border: "#c75454", level: "critical" };
    if (value < threshold * 1.2) return { label: "Warning", color: "#d08c2f", border: "#d08c2f", level: "warning" };
    return { label: "OK", color: "#3f8d56", border: "#3f8d56", level: "ok" };
  }

  if (value > threshold) return { label: "Critical", color: "#c75454", border: "#c75454", level: "critical" };
  if (value > threshold * 0.8) return { label: "Warning", color: "#d08c2f", border: "#d08c2f", level: "warning" };
  return { label: "OK", color: "#3f8d56", border: "#3f8d56", level: "ok" };
}

export function statusFromData(data) {
  const alerts = Array.isArray(data?.alerts) ? data.alerts.length : 0;
  const oneHour = data?.windows?.["1h"];
  if (!oneHour) return { label: "No data", color: "#8c8c8c" };

  const errorRate = oneHour?.rates?.errorRate;
  const noVerifiedRate = oneHour?.rates?.noVerifiedRate;
  const p95 = oneHour?.latencyMs?.p95;
  const thresholds = data?.thresholds || {};

  if (alerts > 0) return { label: "Alerting", color: "#c75454" };
  if (
    (errorRate != null && thresholds.errorRate1h != null && errorRate > thresholds.errorRate1h * 0.8) ||
    (noVerifiedRate != null && thresholds.noVerifiedRate1h != null && noVerifiedRate > thresholds.noVerifiedRate1h * 0.8) ||
    (p95 != null && thresholds.p95LatencyMs1h != null && p95 > thresholds.p95LatencyMs1h * 0.8)
  ) {
    return { label: "Warning", color: "#d08c2f" };
  }
  if ((data?.totalStoredEvents || 0) === 0) return { label: "No events", color: "#8c8c8c" };
  return { label: "Healthy", color: "#3f8d56" };
}
