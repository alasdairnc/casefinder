import { fmtDate, num, pct, severityForMetric } from "./retrievalHealthUtils.js";

export function MetricCard({ label, value, hint, badge, t }) {
  return (
    <div
      style={{
        border: `1px solid ${t.borderLight}`,
        padding: 14,
        background: t.bg,
      }}
    >
      <div
        style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 10,
          letterSpacing: 2.8,
          textTransform: "uppercase",
          color: t.textTertiary,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {badge && (
        <div
          style={{
            display: "inline-block",
            border: `1px solid ${badge.border}`,
            color: badge.color,
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            padding: "2px 6px",
            marginBottom: 8,
          }}
        >
          {badge.label}
        </div>
      )}
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: t.text, marginBottom: 6 }}>{value}</div>
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, color: t.textSecondary }}>{hint}</div>
    </div>
  );
}

function StatusChip({ badge }) {
  return (
    <span
      style={{
        display: "inline-block",
        border: `1px solid ${badge.border}`,
        color: badge.color,
        fontFamily: "'Helvetica Neue', sans-serif",
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        padding: "2px 6px",
      }}
    >
      {badge.label}
    </span>
  );
}

function BarRow({ label, value, max, t, color }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, color: t.textSecondary }}>{label}</span>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: t.text }}>{typeof value === "number" ? value.toFixed(2) : value}</span>
      </div>
      <div style={{ height: 6, background: t.borderLight, borderRadius: 1 }}>
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            background: color || t.accent,
            borderRadius: 1,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

export function TrendlineChart({ trendline, t }) {
  if (!Array.isArray(trendline) || trendline.length === 0) {
    return (
      <p style={{ margin: 0, fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textTertiary }}>
        No trendline data
      </p>
    );
  }

  const width = 300;
  const height = 60;
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  function toPoints(getValue) {
    const values = trendline.map(getValue);
    const defined = values.filter((v) => v != null);
    if (defined.length === 0) return null;
    const max = Math.max(...defined, 0.01);
    return trendline
      .map((_, i) => {
        const v = values[i];
        if (v == null) return null;
        const x = pad + (i / (trendline.length - 1)) * innerW;
        const y = pad + innerH - (v / max) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  const errorPoints = toPoints((d) => d.errorRate);
  const noVerifiedPoints = toPoints((d) => d.noVerifiedRate);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: width, display: "block" }}>
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={t.borderLight} strokeWidth="1" />
      {errorPoints && (
        <polyline points={errorPoints} fill="none" stroke={t.accent} strokeWidth="1.5" strokeLinejoin="round" />
      )}
      {noVerifiedPoints && (
        <polyline points={noVerifiedPoints} fill="none" stroke={t.textSecondary} strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="3 2" />
      )}
    </svg>
  );
}

export function WindowPanel({ label, windowStats, thresholds, t }) {
  if (!windowStats) {
    return (
      <div style={{ border: `1px solid ${t.borderLight}`, padding: 16 }}>
        <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 12 }}>
          {label}
        </div>
        <p style={{ margin: 0, fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textTertiary }}>No data</p>
      </div>
    );
  }

  const rates = windowStats.rates || {};
  const latency = windowStats.latencyMs || {};
  const samples = windowStats.samples || {};
  const err = rates.errorRate ?? 0;
  const noV = rates.noVerifiedRate ?? 0;
  const fallbackRate = rates.fallbackPathRate ?? 0;
  const p95 = latency.p95 ?? null;
  const barMax = Math.max(
    0.5,
    err,
    noV,
    fallbackRate,
    thresholds?.errorRate1h ?? 0.05,
    thresholds?.noVerifiedRate1h ?? 0.45,
    thresholds?.fallbackPathRate1h ?? 0.65
  );
  const errBadge = severityForMetric(rates.errorRate, thresholds?.errorRate1h);
  const noVBadge = severityForMetric(rates.noVerifiedRate, thresholds?.noVerifiedRate1h);
  const fallbackBadge = severityForMetric(rates.fallbackPathRate, thresholds?.fallbackPathRate1h);
  const p95Badge = severityForMetric(p95, thresholds?.p95LatencyMs1h);
  const relevanceBadge = severityForMetric(
    rates.avgRelevanceScore,
    thresholds?.avgRelevanceScoreMin1h,
    "below_is_bad"
  );

  return (
    <div style={{ border: `1px solid ${t.borderLight}`, padding: 16, background: t.bg }}>
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, lineHeight: 1.6, marginBottom: 12 }}>
        <div>Samples (operational / quality / latency): {num(samples.operational)} / {num(samples.quality)} / {num(samples.latency)}</div>
        {windowStats.firstEventAt && (
          <div>Since: {fmtDate(windowStats.firstEventAt)}</div>
        )}
        <div>Last event: {fmtDate(windowStats.lastEventAt)}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <StatusChip badge={errBadge} />
        <StatusChip badge={noVBadge} />
        <StatusChip badge={fallbackBadge} />
        <StatusChip badge={relevanceBadge} />
        <StatusChip badge={p95Badge} />
      </div>
      <BarRow label={`Error rate (${pct(err)})`} value={err} max={barMax} t={t} color={errBadge.color} />
      <BarRow label={`No-verified rate (${pct(noV)})`} value={noV} max={barMax} t={t} color={noVBadge.color} />
      <BarRow
        label={`Fallback-path rate (${pct(fallbackRate)})`}
        value={fallbackRate}
        max={barMax}
        t={t}
        color={fallbackBadge.color}
      />
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginTop: 12 }}>
        Avg verified / request: {num(rates.avgVerifiedPerRequest)}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginTop: 4 }}>
        Avg relevance score: {num(rates.avgRelevanceScore)}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginTop: 4 }}>
        Avg semantic drops / request: {num(rates.avgSemanticFilterDrops)}
      </div>
      {rates.candidateSourceMix && (
        <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginTop: 4 }}>
          Source mix (AI/Landmark/Local): {pct(rates.candidateSourceMix.ai)} / {pct(rates.candidateSourceMix.landmark)} / {pct(rates.candidateSourceMix.localFallback)}
        </div>
      )}
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginTop: 4 }}>
        {latency.p95 != null
          ? `Latency avg / p95: ${num(latency.avg)} ms / ${num(latency.p95)} ms`
          : `Latency avg: ${num(latency.avg)} ms`}
      </div>
    </div>
  );
}
