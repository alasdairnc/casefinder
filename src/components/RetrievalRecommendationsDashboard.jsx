import { useState, useEffect, useCallback } from "react";
import { useTheme, useThemeActions } from "../lib/ThemeContext.jsx";

const TOKEN_STORAGE_KEY = "casediveRetrievalHealthToken";

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function clip(text, maxLen = 180) {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) return "-";
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen)}...`;
}

function buildRecommendationPrompt(item = {}) {
  const terms = Array.isArray(item.suggestedTerms)
    ? item.suggestedTerms.slice(0, 6).join(" | ")
    : "";

  return [
    "Investigate and improve retrieval quality for this failure cluster.",
    "",
    `Class: ${item.classId || "general_criminal"}`,
    `Observed failures: ${item.failureCount || 0}`,
    `Representative scenario: ${item.scenarioSnippet || "(none)"}`,
    `Suggested terms: ${terms || "(none)"}`,
    "",
    "Please do all of the following:",
    "1) update query shaping and fallback ordering for this class,",
    "2) keep latency flat (no broad extra network calls),",
    "3) add regression tests for this scenario cluster,",
    "4) report before/after retrieval metrics.",
  ].join("\n");
}

function RecommendationCard({ item, t }) {
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildRecommendationPrompt(item));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={{ border: `1px solid ${t.borderLight}`, padding: 14, background: t.bg }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary }}>
          <strong style={{ color: t.text }}>{item.classId || "general_criminal"}</strong>
          {" "}
          | {item.failureCount || 0} similar failure(s)
        </div>
        <button
          type="button"
          onClick={copyPrompt}
          style={{
            border: `1px solid ${t.borderLight}`,
            background: "transparent",
            color: copied ? t.accentGreen : t.textSecondary,
            padding: "6px 10px",
            cursor: "pointer",
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          {copied ? "Copied" : "Copy Action Prompt"}
        </button>
      </div>

      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, marginBottom: 8, lineHeight: 1.5 }}>
        Scenario: {clip(item.scenarioSnippet, 220)}
      </div>

      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: t.textTertiary }}>
        terms: {Array.isArray(item.suggestedTerms) && item.suggestedTerms.length > 0
          ? item.suggestedTerms.slice(0, 6).join(" | ")
          : "n/a"}
      </div>
    </div>
  );
}

export default function RetrievalRecommendationsDashboard({ onNavigateHome, onNavigateHealth }) {
  const t = useTheme();
  const { isDark, toggleTheme } = useThemeActions();

  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_STORAGE_KEY) || "");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
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

  const improvements = Array.isArray(data?.improvements) ? data.improvements : [];
  const failures = Array.isArray(data?.recentFailures) ? data.recentFailures : [];
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text }}>
      <header style={{ borderBottom: `1px solid ${t.borderLight}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: 22, margin: 0, fontWeight: 400 }}>
            Retrieval recommendations
          </h1>
          <p style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, color: t.textTertiary, margin: "6px 0 0 0" }}>
            Action-focused view from /api/retrieval-health improvements
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={onNavigateHome} style={{ background: "none", border: `1px solid ${t.borderLight}`, padding: "8px 14px", cursor: "pointer", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: t.textSecondary }}>
            Back to app
          </button>
          <button type="button" onClick={onNavigateHealth} style={{ background: "none", border: `1px solid ${t.borderLight}`, padding: "8px 14px", cursor: "pointer", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: t.textSecondary }}>
            Health dashboard
          </button>
          <button type="button" onClick={toggleTheme} style={{ background: "none", border: `1px solid ${t.borderLight}`, padding: "8px 14px", cursor: "pointer", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, color: t.textSecondary }}>
            {isDark ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <div style={{ border: `1px solid ${t.borderLight}`, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={token ? "Replace token..." : "Bearer token"}
              style={{ flex: "1 1 220px", minWidth: 200, padding: "10px 12px", border: `1px solid ${t.borderLight}`, background: t.bg, color: t.text, fontFamily: "'Courier New', monospace", fontSize: 12 }}
            />
            <button type="button" onClick={saveToken} style={{ padding: "10px 16px", border: `1px solid ${t.accent}`, background: "transparent", color: t.accent, cursor: "pointer", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Save
            </button>
            {token && (
              <button type="button" onClick={clearToken} style={{ padding: "10px 16px", border: `1px solid ${t.borderLight}`, background: "transparent", color: t.textTertiary, cursor: "pointer", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11 }}>
                Clear
              </button>
            )}
            <button type="button" onClick={load} disabled={loading} style={{ padding: "10px 16px", border: `1px solid ${t.borderLight}`, background: "transparent", color: t.text, cursor: loading ? "wait" : "pointer", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {token && (
            <p style={{ margin: "10px 0 0 0", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, color: t.textTertiary }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
              <div style={{ border: `1px solid ${t.borderLight}`, padding: 12 }}>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 2.8, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8 }}>
                  Improvements
                </div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 22 }}>{improvements.length}</div>
              </div>
              <div style={{ border: `1px solid ${t.borderLight}`, padding: 12 }}>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 2.8, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8 }}>
                  Recent Failures
                </div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 22 }}>{failures.length}</div>
              </div>
              <div style={{ border: `1px solid ${t.borderLight}`, padding: 12 }}>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 2.8, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8 }}>
                  Active Alerts
                </div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 22 }}>{alerts.length}</div>
              </div>
            </div>

            <p style={{ margin: "0 0 14px 0", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary }}>
              Generated {fmtDate(data.generatedAt)}
            </p>

            <div style={{ border: `1px solid ${t.borderLight}`, padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 10 }}>
                Recommended Retrieval Actions
              </div>
              {improvements.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {improvements.slice(0, 8).map((item) => (
                    <RecommendationCard key={item.id || `${item.classId}-${item.scenarioSnippet}`} item={item} t={t} />
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textTertiary }}>
                  No recommendations yet.
                </p>
              )}
            </div>

            <div style={{ border: `1px solid ${t.borderLight}`, padding: 16 }}>
              <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 10 }}>
                Recent Failed Scenarios
              </div>
              {failures.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {failures.slice(0, 8).map((f, i) => (
                    <div key={`${f.ts || "unknown"}-${i}`} style={{ border: `1px solid ${t.borderLight}`, padding: 10, background: t.bg }}>
                      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: t.text, marginBottom: 6 }}>
                        {fmtDate(f.ts)} | {f.endpoint || "unknown"} | {f.reason || "unknown"}
                      </div>
                      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary, lineHeight: 1.5 }}>
                        {clip(f.scenarioSnippet, 220)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textTertiary }}>
                  No recent failures.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
