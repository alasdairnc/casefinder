import { useState, useEffect, useCallback } from "react";
import { useTheme, useThemeActions } from "../lib/ThemeContext.jsx";
import {
  pct,
  num,
  fmtDate,
  clip,
  buildAgentFixPrompt,
  severityForMetric,
  statusFromData,
} from "./retrievalHealthUtils.js";
import {
  MetricCard,
  TrendlineChart,
  WindowPanel,
} from "./retrievalHealthPanels.jsx";

const TOKEN_STORAGE_KEY = "casediveRetrievalHealthToken";

export default function RetrievalHealthDashboard({ onNavigateHome }) {
  const t = useTheme();
  const { isDark, toggleTheme } = useThemeActions();
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_STORAGE_KEY) || "");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [copiedFailureKey, setCopiedFailureKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (token.trim()) {
        headers.Authorization = `Bearer ${token.trim()}`;
      }
      const res = await fetch("/api/retrieval-health", { headers });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setData(body);
    } catch (e) {
      setData(null);
      setError(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      load();
    }, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const saveToken = () => {
    const v = tokenInput.trim();
    sessionStorage.setItem(TOKEN_STORAGE_KEY, v);
    setToken(v);
    setTokenInput("");
  };

  const clearToken = () => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setData(null);
  };

  const status = statusFromData(data);
  const oneHour = data?.windows?.["1h"];
  const fiveMin = data?.windows?.["5m"];
  const thresholds = data?.thresholds || {};
  const errorBadge = severityForMetric(oneHour?.rates?.errorRate, thresholds?.errorRate1h, "above_is_bad");
  const noVerifiedBadge = severityForMetric(oneHour?.rates?.noVerifiedRate, thresholds?.noVerifiedRate1h, "above_is_bad");
  const p95Badge = severityForMetric(oneHour?.latencyMs?.p95, thresholds?.p95LatencyMs1h, "above_is_bad");
  const recentFailures = Array.isArray(data?.recentFailures) ? data.recentFailures : [];
  const improvements = Array.isArray(data?.improvements) ? data.improvements : [];

  const copyFixPrompt = async (sample, index) => {
    const prompt = buildAgentFixPrompt(sample);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedFailureKey(`${sample.ts || "unknown"}-${index}`);
      setTimeout(() => setCopiedFailureKey(""), 1500);
    } catch {
      setCopiedFailureKey("");
    }
  };

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text }}>
      <header style={{ borderBottom: `1px solid ${t.borderLight}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: 22, margin: 0, fontWeight: 400 }}>
            Retrieval health
          </h1>
          <p style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, color: t.textTertiary, margin: "6px 0 0 0" }}>
            Internal metrics from /api/retrieval-health
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={onNavigateHome}
            style={{
              background: "none",
              border: `1px solid ${t.borderLight}`,
              padding: "8px 14px",
              cursor: "pointer",
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: t.textSecondary,
            }}
          >
            Back to app
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              background: "none",
              border: `1px solid ${t.borderLight}`,
              padding: "8px 14px",
              cursor: "pointer",
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 11,
              color: t.textSecondary,
            }}
          >
            {isDark ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        <div
          style={{
            border: `1px solid ${t.borderLight}`,
            padding: 16,
            marginBottom: 20,
            background: `linear-gradient(135deg, ${t.bg} 0%, ${t.bg} 65%, ${t.borderLight} 100%)`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8 }}>
                Retrieval System Status
              </div>
              <div style={{ fontFamily: "'Times New Roman', serif", fontSize: 28, color: t.text, lineHeight: 1.1 }}>
                {status.label}
              </div>
            </div>
            <div
              style={{
                border: `1px solid ${status.color}`,
                color: status.color,
                padding: "6px 10px",
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 11,
                letterSpacing: 1.6,
                textTransform: "uppercase",
              }}
            >
              Live Internal Telemetry
            </div>
          </div>
        </div>

        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
            <MetricCard label="Stored Events" value={num(data.totalStoredEvents)} hint="2h rolling retention" t={t} />
            <MetricCard label="5m Operational" value={num(fiveMin?.samples?.operational)} hint="Requests eligible for quality checks" t={t} />
            <MetricCard label="1h Error Rate" value={pct(oneHour?.rates?.errorRate)} hint="Operational retrieval failures" badge={errorBadge} t={t} />
            <MetricCard label="1h No-Verified" value={pct(oneHour?.rates?.noVerifiedRate)} hint="Quality requests with 0 verified" badge={noVerifiedBadge} t={t} />
            <MetricCard label="1h Fallback Rate" value={pct(oneHour?.rates?.fallbackPathRate)} hint="Requests using fallback retrieval paths" t={t} />
            <MetricCard label="1h Relevance" value={num(oneHour?.rates?.avgRelevanceScore)} hint="Average retrieval relevance score" t={t} />
            <MetricCard label="1h p95 Latency" value={`${num(oneHour?.latencyMs?.p95)} ms`} hint="Tail latency for retrieval path" badge={p95Badge} t={t} />
          </div>
        )}

        <div style={{ border: `1px solid ${t.borderLight}`, padding: 16, marginBottom: 24 }}>
          <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 10 }}>
            Access
          </div>
          <p style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, margin: "0 0 12px 0" }}>
            If RETRIEVAL_HEALTH_TOKEN is set on the server, paste the same value here. Stored in session storage for this tab only.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={token ? "Replace token…" : "Bearer token"}
              style={{
                flex: "1 1 220px",
                minWidth: 200,
                padding: "10px 12px",
                border: `1px solid ${t.borderLight}`,
                background: t.bg,
                color: t.text,
                fontFamily: "'Courier New', monospace",
                fontSize: 12,
              }}
            />
            <button
              type="button"
              onClick={saveToken}
              style={{
                padding: "10px 16px",
                border: `1px solid ${t.accent}`,
                background: "transparent",
                color: t.accent,
                cursor: "pointer",
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Save
            </button>
            {token && (
              <button
                type="button"
                onClick={clearToken}
                style={{
                  padding: "10px 16px",
                  border: `1px solid ${t.borderLight}`,
                  background: "transparent",
                  color: t.textTertiary,
                  cursor: "pointer",
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              style={{
                padding: "10px 16px",
                border: `1px solid ${t.borderLight}`,
                background: "transparent",
                color: t.text,
                cursor: loading ? "wait" : "pointer",
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: `1px solid ${t.borderLight}`,
                padding: "8px 10px",
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 11,
                color: t.textSecondary,
              }}
            >
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh 30s
            </label>
          </div>
          {token && (
            <p style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, color: t.textTertiary, margin: "12px 0 0 0" }}>
              Token on file ({token.length} chars)
            </p>
          )}
        </div>

        {error && (
          <div style={{ border: `1px solid ${t.border}`, padding: 12, marginBottom: 16, fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13, color: t.text }}>
            {error}
          </div>
        )}

        {data && (
          <>
            <p style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, margin: "0 0 16px 0" }}>
              Generated {fmtDate(data.generatedAt)} · Stored events: {data.totalStoredEvents} · Snapshot source: {data.snapshotSource || "—"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
              <WindowPanel label="5 minute window" windowStats={data.windows?.["5m"]} thresholds={data.thresholds} t={t} />
              <WindowPanel label="1 hour window" windowStats={data.windows?.["1h"]} thresholds={data.thresholds} t={t} />
              <WindowPanel label="All time" windowStats={data.alltime} thresholds={data.thresholds} t={t} />
            </div>
            <div style={{ border: `1px solid ${t.borderLight}`, padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8 }}>
                Trendline — last 75 min
              </div>
              <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, color: t.textTertiary, marginBottom: 10 }}>
                <span style={{ color: t.accent }}>—</span> error rate &nbsp;
                <span style={{ color: t.textSecondary }}>- -</span> no-verified rate
              </div>
              <TrendlineChart trendline={data.trendline} t={t} />
            </div>
            <div style={{ border: `1px solid ${t.borderLight}`, padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8 }}>
                Recent Failed Scenarios
              </div>
              <p style={{ margin: "0 0 12px 0", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary }}>
                Operational retrieval failures (errors or 0 verified case-law). Use Copy prompt to hand a concrete case to an agent.
              </p>
              {recentFailures.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {recentFailures.map((sample, index) => {
                    const rowKey = `${sample.ts || "unknown"}-${index}`;
                    return (
                      <div key={rowKey} style={{ border: `1px solid ${t.borderLight}`, padding: 12, background: t.bg }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: t.text }}>
                            {fmtDate(sample.ts)} · {sample.endpoint || "unknown"} · {sample.reason || "unknown"}
                          </div>
                          <button
                            type="button"
                            onClick={() => copyFixPrompt(sample, index)}
                            style={{
                              padding: "6px 10px",
                              border: `1px solid ${t.borderLight}`,
                              background: "transparent",
                              color: copiedFailureKey === rowKey ? t.accentGreen : t.textSecondary,
                              cursor: "pointer",
                              fontFamily: "'Helvetica Neue', sans-serif",
                              fontSize: 10,
                              letterSpacing: 1.2,
                              textTransform: "uppercase",
                            }}
                          >
                            {copiedFailureKey === rowKey ? "Copied" : "Copy Fix Prompt"}
                          </button>
                        </div>
                        <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>
                          Scenario: {clip(sample.scenarioSnippet, 220)}
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, color: t.textTertiary }}>
                          <span>final: {num(sample.finalCaseLawCount)}</span>
                          <span>verified: {num(sample.verifiedCount)}</span>
                          <span>latency: {num(sample.latencyMs)} ms</span>
                          <span>fallback: {sample.fallbackPathUsed ? "yes" : "no"}</span>
                          <span>drops: {num(sample.semanticFilterDropCount)}</span>
                        </div>
                        {sample.errorMessage && (
                          <div style={{ marginTop: 8, fontFamily: "'Courier New', monospace", fontSize: 11, color: t.textTertiary }}>
                            {clip(sample.errorMessage, 180)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textTertiary }}>
                  No recent failed scenarios.
                </p>
              )}
            </div>
            <div style={{ border: `1px solid ${t.borderLight}`, padding: 16 }}>
              <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 12 }}>
                Suggested Improvements
              </div>
              {improvements.length > 0 ? (
                <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                  {improvements.slice(0, 5).map((item) => (
                    <div key={item.id} style={{ border: `1px solid ${t.borderLight}`, padding: 10, background: t.bg }}>
                      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>
                        <strong style={{ color: t.text }}>{item.classId}</strong> · {item.failureCount} similar failure(s)
                      </div>
                      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginBottom: 4 }}>
                        Scenario: {clip(item.scenarioSnippet, 180)}
                      </div>
                      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: t.textTertiary }}>
                        terms: {Array.isArray(item.suggestedTerms) ? item.suggestedTerms.slice(0, 4).join(" | ") : "n/a"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 12 }}>
                Active alerts (thresholds)
              </div>
              {Array.isArray(data.alerts) && data.alerts.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {data.alerts.map((a) => (
                    <li key={a.id} style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginBottom: 8 }}>
                      <strong style={{ color: t.text }}>{a.id}</strong>: {a.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textTertiary }}>No threshold breaches</p>
              )}
            </div>
            <div style={{ border: `1px solid ${t.borderLight}`, padding: 16, marginTop: 16 }}>
              <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 12 }}>
                Threshold Reference (1h)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary }}>
                  Error rate threshold: <strong style={{ color: t.text }}>{pct(thresholds.errorRate1h)}</strong>
                </div>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary }}>
                  No-verified threshold: <strong style={{ color: t.text }}>{pct(thresholds.noVerifiedRate1h)}</strong>
                </div>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary }}>
                  p95 latency threshold: <strong style={{ color: t.text }}>{num(thresholds.p95LatencyMs1h)} ms</strong>
                </div>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary }}>
                  Fallback-path threshold: <strong style={{ color: t.text }}>{pct(thresholds.fallbackPathRate1h)}</strong>
                </div>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary }}>
                  Min relevance threshold: <strong style={{ color: t.text }}>{num(thresholds.avgRelevanceScoreMin1h)}</strong>
                </div>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary }}>
                  Min sample size: <strong style={{ color: t.text }}>{num(thresholds.minSampleSize1h)}</strong>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
