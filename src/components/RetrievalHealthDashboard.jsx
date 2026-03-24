import { useState, useEffect, useCallback } from "react";
import { useTheme, useThemeActions } from "../lib/ThemeContext.jsx";

const TOKEN_STORAGE_KEY = "casediveRetrievalHealthToken";

function pct(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function num(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return String(value);
}

function BarRow({ label, value, max, t }) {
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
            background: t.accent,
            borderRadius: 1,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

function WindowPanel({ label, windowStats, thresholds, t }) {
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
  const barMax = Math.max(0.5, err, noV, thresholds?.errorRate1h ?? 0.05, thresholds?.noVerifiedRate1h ?? 0.45);

  return (
    <div style={{ border: `1px solid ${t.borderLight}`, padding: 16 }}>
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, lineHeight: 1.6, marginBottom: 12 }}>
        <div>Samples (operational / quality / latency): {num(samples.operational)} / {num(samples.quality)} / {num(samples.latency)}</div>
        <div>Last event: {windowStats.lastEventAt || "—"}</div>
      </div>
      <BarRow label={`Error rate (${pct(err)})`} value={err} max={barMax} t={t} />
      <BarRow label={`No-verified rate (${pct(noV)})`} value={noV} max={barMax} t={t} />
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginTop: 12 }}>
        Avg verified / request: {num(rates.avgVerifiedPerRequest)}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginTop: 4 }}>
        Latency avg / p95: {num(latency.avg)} ms / {num(latency.p95)} ms
      </div>
    </div>
  );
}

export default function RetrievalHealthDashboard({ onNavigateHome }) {
  const t = useTheme();
  const { isDark, toggleTheme } = useThemeActions();
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_STORAGE_KEY) || "");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
              Generated {data.generatedAt} · Stored events: {data.totalStoredEvents}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
              <WindowPanel label="5 minute window" windowStats={data.windows?.["5m"]} thresholds={data.thresholds} t={t} />
              <WindowPanel label="1 hour window" windowStats={data.windows?.["1h"]} thresholds={data.thresholds} t={t} />
            </div>
            <div style={{ border: `1px solid ${t.borderLight}`, padding: 16 }}>
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
          </>
        )}
      </div>
    </div>
  );
}
