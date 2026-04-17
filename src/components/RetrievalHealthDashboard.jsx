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
const ISSUE_TREND_MIN_REQUESTS = 3;

function healthSummaryFromState({ data, status, oneHourChecks }) {
  if (!data) {
    return {
      headline: "Waiting for telemetry",
      detail: "Connect to /api/retrieval-health to calculate health checks.",
    };
  }

  const critical = oneHourChecks.filter(
    (check) => check.badge.level === "critical",
  ).length;
  const warning = oneHourChecks.filter(
    (check) => check.badge.level === "warning",
  ).length;

  if (critical > 0) {
    return {
      headline: "Needs immediate attention",
      detail: `${critical} critical signal(s) exceeded thresholds in the last hour.`,
    };
  }

  if (warning > 0 || status.label === "Warning") {
    return {
      headline: "Watch closely",
      detail: `${warning || 1} signal(s) are approaching threshold limits.`,
    };
  }

  if ((data?.totalStoredEvents || 0) === 0) {
    return {
      headline: "No recent events",
      detail: "Health cannot be assessed until retrieval traffic is observed.",
    };
  }

  return {
    headline: "System looks healthy",
    detail:
      "Key failure and latency signals are currently within target ranges.",
  };
}

export default function RetrievalHealthDashboard({ onNavigateHome }) {
  const t = useTheme();
  const { isDark, toggleTheme } = useThemeActions();
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_STORAGE_KEY) || "",
  );
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [copiedFailureKey, setCopiedFailureKey] = useState("");
  const [issueSortMode, setIssueSortMode] = useState("risk");
  const [failureArchive, setFailureArchive] = useState([]);
  const [failureArchiveOffset, setFailureArchiveOffset] = useState(0);
  const [failureArchiveHasMore, setFailureArchiveHasMore] = useState(false);
  const [loadingMoreFailures, setLoadingMoreFailures] = useState(false);

  const authHeaders = useCallback(() => {
    const headers = {};
    if (token.trim()) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }
    return headers;
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/retrieval-health?failureLimit=20", {
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setData(body);
      const initialArchive = Array.isArray(body?.failureArchive?.items)
        ? body.failureArchive.items
        : Array.isArray(body?.recentFailures)
          ? body.recentFailures
          : [];
      setFailureArchive(initialArchive);
      setFailureArchiveOffset(
        typeof body?.failureArchive?.nextOffset === "number"
          ? body.failureArchive.nextOffset
          : initialArchive.length,
      );
      setFailureArchiveHasMore(body?.failureArchive?.hasMore === true);
    } catch (e) {
      setData(null);
      setError(e.message || "Request failed");
      setFailureArchive([]);
      setFailureArchiveOffset(0);
      setFailureArchiveHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const loadMoreFailures = useCallback(async () => {
    if (!failureArchiveHasMore || !Number.isFinite(failureArchiveOffset))
      return;
    setLoadingMoreFailures(true);
    try {
      const res = await fetch(
        `/api/retrieval-health?failureLimit=20&failuresOffset=${Math.floor(failureArchiveOffset)}`,
        { headers: authHeaders() },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const items = Array.isArray(body?.failureArchive?.items)
        ? body.failureArchive.items
        : [];
      setFailureArchive((prev) => [...prev, ...items]);
      setFailureArchiveOffset(
        typeof body?.failureArchive?.nextOffset === "number"
          ? body.failureArchive.nextOffset
          : failureArchiveOffset + items.length,
      );
      setFailureArchiveHasMore(body?.failureArchive?.hasMore === true);
    } catch (e) {
      setError(e.message || "Failed to load older failures");
    } finally {
      setLoadingMoreFailures(false);
    }
  }, [authHeaders, failureArchiveHasMore, failureArchiveOffset]);

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
  const errorBadge = severityForMetric(
    oneHour?.rates?.errorRate,
    thresholds?.errorRate1h,
    "above_is_bad",
  );
  const noVerifiedBadge = severityForMetric(
    oneHour?.rates?.noVerifiedRate,
    thresholds?.noVerifiedRate1h,
    "above_is_bad",
  );
  const p95Badge = severityForMetric(
    oneHour?.latencyMs?.p95,
    thresholds?.p95LatencyMs1h,
    "above_is_bad",
  );
  const recentFailures = failureArchive;
  const improvements = Array.isArray(data?.improvements)
    ? data.improvements
    : [];
  const oneHourChecks = [
    {
      id: "error-rate",
      label: "Error rate (1h)",
      valueLabel: pct(oneHour?.rates?.errorRate),
      thresholdLabel: pct(thresholds?.errorRate1h),
      badge: errorBadge,
      whyItMatters: "High values indicate retrieval requests are failing.",
    },
    {
      id: "no-verified-rate",
      label: "No-verified rate (1h)",
      valueLabel: pct(oneHour?.rates?.noVerifiedRate),
      thresholdLabel: pct(thresholds?.noVerifiedRate1h),
      badge: noVerifiedBadge,
      whyItMatters:
        "High values mean users get no verified case law despite a response.",
    },
    {
      id: "p95-latency",
      label: "p95 latency (1h)",
      valueLabel: `${num(oneHour?.latencyMs?.p95)} ms`,
      thresholdLabel: `${num(thresholds?.p95LatencyMs1h)} ms`,
      badge: p95Badge,
      whyItMatters: "Tail latency captures the slowest user experiences.",
    },
  ];
  const healthSummary = healthSummaryFromState({ data, status, oneHourChecks });
  const alltimeIssueRowsRaw = Array.isArray(data?.alltime?.breakdowns?.byIssue)
    ? data.alltime.breakdowns.byIssue
    : [];
  const alltimeIssueRowsFiltered = alltimeIssueRowsRaw.filter(
    (row) => Number(row?.requests || 0) >= ISSUE_TREND_MIN_REQUESTS,
  );
  const alltimeIssueRowsBase =
    alltimeIssueRowsFiltered.length > 0
      ? alltimeIssueRowsFiltered
      : alltimeIssueRowsRaw;
  const alltimeIssueRows = [...alltimeIssueRowsBase].sort((a, b) => {
    if (issueSortMode === "volume") {
      return (
        Number(b?.requests || 0) - Number(a?.requests || 0) ||
        Number(b?.noVerifiedRate || 0) - Number(a?.noVerifiedRate || 0) ||
        Number(b?.errorRate || 0) - Number(a?.errorRate || 0)
      );
    }
    return (
      Number(b?.noVerifiedRate || 0) - Number(a?.noVerifiedRate || 0) ||
      Number(b?.errorRate || 0) - Number(a?.errorRate || 0) ||
      Number(b?.fallbackPathRate || 0) - Number(a?.fallbackPathRate || 0) ||
      Number(b?.requests || 0) - Number(a?.requests || 0)
    );
  });
  const issueAlerts = Array.isArray(data?.alerts)
    ? data.alerts.filter(
        (a) =>
          typeof a?.id === "string" &&
          (a.id.startsWith("retrieval_issue_no_verified_rate_1h_") ||
            a.id.startsWith("retrieval_issue_error_rate_1h_")),
      )
    : [];
  const storedEventsHint =
    data?.historyMode === "all_time_capped"
      ? `All-time history (capped at ${num(data?.historyMaxEvents)} events)`
      : "2h rolling retention (memory fallback)";
  const totalFailuresTracked = Number.isFinite(
    Number(data?.failureArchive?.totalFailures),
  )
    ? Number(data.failureArchive.totalFailures)
    : recentFailures.length;

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
      <header
        style={{
          borderBottom: `1px solid ${t.borderLight}`,
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Times New Roman', serif",
              fontSize: 22,
              margin: 0,
              fontWeight: 400,
            }}
          >
            Retrieval health
          </h1>
          <p
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 11,
              color: t.textTertiary,
              margin: "6px 0 0 0",
            }}
          >
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 10,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 8,
                }}
              >
                Retrieval System Status
              </div>
              <div
                style={{
                  fontFamily: "'Times New Roman', serif",
                  fontSize: 28,
                  color: t.text,
                  lineHeight: 1.1,
                }}
              >
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

        <div
          style={{
            border: `1px solid ${t.borderLight}`,
            padding: 16,
            marginBottom: 20,
            background: t.bg,
          }}
        >
          <div
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 10,
              letterSpacing: 3.5,
              textTransform: "uppercase",
              color: t.textTertiary,
              marginBottom: 10,
            }}
          >
            Health Overview
          </div>
          <div
            style={{
              fontFamily: "'Times New Roman', serif",
              fontSize: 26,
              color: status.color,
              marginBottom: 8,
              lineHeight: 1.2,
            }}
          >
            {healthSummary.headline}
          </div>
          <p
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 13,
              color: t.textSecondary,
              margin: "0 0 14px 0",
              lineHeight: 1.5,
            }}
          >
            {healthSummary.detail}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {oneHourChecks.map((check) => (
              <div
                key={check.id}
                style={{ border: `1px solid ${t.borderLight}`, padding: 12 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Helvetica Neue', sans-serif",
                      fontSize: 12,
                      color: t.text,
                    }}
                  >
                    {check.label}
                  </div>
                  <span
                    style={{
                      border: `1px solid ${check.badge.border}`,
                      color: check.badge.color,
                      fontFamily: "'Helvetica Neue', sans-serif",
                      fontSize: 10,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      padding: "2px 6px",
                    }}
                  >
                    {check.badge.label}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 18,
                    color: t.text,
                    marginBottom: 4,
                  }}
                >
                  {check.valueLabel}
                </div>
                <div
                  style={{
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 11,
                    color: t.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  Threshold: {check.thresholdLabel}
                </div>
                <div
                  style={{
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 11,
                    color: t.textTertiary,
                    lineHeight: 1.45,
                  }}
                >
                  {check.whyItMatters}
                </div>
              </div>
            ))}
          </div>
        </div>

        {data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <MetricCard
              label="Stored Events"
              value={num(data.totalStoredEvents)}
              hint={storedEventsHint}
              t={t}
            />
            <MetricCard
              label="5m Operational"
              value={num(fiveMin?.samples?.operational)}
              hint="Requests eligible for quality checks"
              t={t}
            />
            <MetricCard
              label="1h Error Rate"
              value={pct(oneHour?.rates?.errorRate)}
              hint="Operational retrieval failures"
              badge={errorBadge}
              t={t}
            />
            <MetricCard
              label="1h No-Verified"
              value={pct(oneHour?.rates?.noVerifiedRate)}
              hint="Quality requests with 0 verified"
              badge={noVerifiedBadge}
              t={t}
            />
            <MetricCard
              label="1h Fallback Rate"
              value={pct(oneHour?.rates?.fallbackPathRate)}
              hint="Requests using fallback retrieval paths"
              t={t}
            />
            <MetricCard
              label="1h Relevance"
              value={num(oneHour?.rates?.avgRelevanceScore)}
              hint="Average retrieval relevance score"
              t={t}
            />
            <MetricCard
              label="1h p95 Latency"
              value={`${num(oneHour?.latencyMs?.p95)} ms`}
              hint="Tail latency for retrieval path"
              badge={p95Badge}
              t={t}
            />
          </div>
        )}

        {data && issueAlerts.length > 0 && (
          <div
            style={{
              border: `1px solid ${t.borderLight}`,
              padding: 16,
              marginBottom: 20,
              background: t.bg,
            }}
          >
            <div
              style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 10,
                letterSpacing: 3.5,
                textTransform: "uppercase",
                color: t.textTertiary,
                marginBottom: 10,
              }}
            >
              Issue Alert Summary
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {issueAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    border: `1px solid ${t.borderLight}`,
                    padding: 10,
                    background: t.bg,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Helvetica Neue', sans-serif",
                      fontSize: 12,
                      color: t.text,
                      marginBottom: 4,
                    }}
                  >
                    {alert.issuePrimary || "unknown"} · {num(alert.requests)}{" "}
                    requests
                  </div>
                  <div
                    style={{
                      fontFamily: "'Helvetica Neue', sans-serif",
                      fontSize: 11,
                      color: t.textSecondary,
                    }}
                  >
                    {alert.metric === "issueNoVerifiedRate"
                      ? "No-verified"
                      : "Error"}{" "}
                    at {pct(alert.value)} (threshold {pct(alert.threshold)})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            border: `1px solid ${t.borderLight}`,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 10,
              letterSpacing: 3.5,
              textTransform: "uppercase",
              color: t.textTertiary,
              marginBottom: 10,
            }}
          >
            Access
          </div>
          <p
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 12,
              color: t.textSecondary,
              margin: "0 0 12px 0",
            }}
          >
            If RETRIEVAL_HEALTH_TOKEN is set on the server, paste the same value
            here. Stored in session storage for this tab only.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
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
            <p
              style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 11,
                color: t.textTertiary,
                margin: "12px 0 0 0",
              }}
            >
              Token on file ({token.length} chars)
            </p>
          )}
        </div>

        <div
          style={{
            border: `1px solid ${t.borderLight}`,
            padding: 16,
            marginBottom: 20,
            background: t.bg,
          }}
        >
          <div
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 10,
              letterSpacing: 3.5,
              textTransform: "uppercase",
              color: t.textTertiary,
              marginBottom: 10,
            }}
          >
            How To Read This
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <div style={{ border: `1px solid ${t.borderLight}`, padding: 10 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                  color: t.text,
                  marginBottom: 6,
                }}
              >
                1h checks drive health status
              </div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                  color: t.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                The top status focuses on the last hour because it best reflects
                current user impact.
              </div>
            </div>
            <div style={{ border: `1px solid ${t.borderLight}`, padding: 10 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                  color: t.text,
                  marginBottom: 6,
                }}
              >
                Start with critical failures
              </div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                  color: t.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                If any check is critical, review Recent Failed Scenarios before
                tuning thresholds.
              </div>
            </div>
            <div style={{ border: `1px solid ${t.borderLight}`, padding: 10 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                  color: t.text,
                  marginBottom: 6,
                }}
              >
                Use 5m vs 1h for diagnosis
              </div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                  color: t.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                A bad 5m with healthy 1h usually means a short spike, not a
                sustained degradation.
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              border: `1px solid ${t.border}`,
              padding: 12,
              marginBottom: 16,
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 13,
              color: t.text,
            }}
          >
            {error}
          </div>
        )}

        {data && (
          <>
            <p
              style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 12,
                color: t.textSecondary,
                margin: "0 0 16px 0",
              }}
            >
              Generated {fmtDate(data.generatedAt)} · Stored events:{" "}
              {data.totalStoredEvents} · Snapshot source:{" "}
              {data.snapshotSource || "—"}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <WindowPanel
                label="5 minute window"
                windowStats={data.windows?.["5m"]}
                thresholds={data.thresholds}
                t={t}
              />
              <WindowPanel
                label="1 hour window"
                windowStats={data.windows?.["1h"]}
                thresholds={data.thresholds}
                t={t}
              />
              <WindowPanel
                label="All time"
                windowStats={data.alltime}
                thresholds={data.thresholds}
                t={t}
              />
            </div>
            <div
              style={{
                border: `1px solid ${t.borderLight}`,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 10,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 8,
                }}
              >
                Trendline — last 75 min
              </div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                  color: t.textTertiary,
                  marginBottom: 10,
                }}
              >
                <span style={{ color: t.accent }}>—</span> error rate &nbsp;
                <span style={{ color: t.textSecondary }}>- -</span> no-verified
                rate
              </div>
              <TrendlineChart trendline={data.trendline} t={t} />
            </div>
            <div
              style={{
                border: `1px solid ${t.borderLight}`,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 10,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 8,
                }}
              >
                All-time by issue trend
              </div>
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 12,
                  color: t.textSecondary,
                }}
              >
                Longitudinal view of top issue classes by volume and retrieval
                quality.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIssueSortMode("risk")}
                  style={{
                    padding: "6px 10px",
                    border: `1px solid ${issueSortMode === "risk" ? t.accent : t.borderLight}`,
                    background: "transparent",
                    color:
                      issueSortMode === "risk" ? t.accent : t.textSecondary,
                    cursor: "pointer",
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 10,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  Sort: Highest risk
                </button>
                <button
                  type="button"
                  onClick={() => setIssueSortMode("volume")}
                  style={{
                    padding: "6px 10px",
                    border: `1px solid ${issueSortMode === "volume" ? t.accent : t.borderLight}`,
                    background: "transparent",
                    color:
                      issueSortMode === "volume" ? t.accent : t.textSecondary,
                    cursor: "pointer",
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 10,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  Sort: Volume
                </button>
                <span
                  style={{
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 11,
                    color: t.textTertiary,
                  }}
                >
                  Showing issues with {ISSUE_TREND_MIN_REQUESTS}+ requests when
                  available.
                </span>
              </div>
              {alltimeIssueRows.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {alltimeIssueRows.map((row) => (
                    <div
                      key={row.issuePrimary}
                      style={{
                        border: `1px solid ${t.borderLight}`,
                        padding: 10,
                        background: t.bg,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Helvetica Neue', sans-serif",
                          fontSize: 12,
                          color: t.text,
                          marginBottom: 6,
                        }}
                      >
                        <strong>{row.issuePrimary}</strong> ·{" "}
                        {num(row.requests)} requests
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          fontFamily: "'Helvetica Neue', sans-serif",
                          fontSize: 11,
                          color: t.textSecondary,
                        }}
                      >
                        <span>fallback {pct(row.fallbackPathRate)}</span>
                        <span>no-verified {pct(row.noVerifiedRate)}</span>
                        <span>error {pct(row.errorRate)}</span>
                        <span>
                          avg verified {num(row.avgVerifiedPerRequest)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 12,
                    color: t.textTertiary,
                  }}
                >
                  No issue-level aggregate data yet.
                </p>
              )}
            </div>
            <div
              style={{
                border: `1px solid ${t.borderLight}`,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 10,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 8,
                }}
              >
                Recent Failed Scenarios
              </div>
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 12,
                  color: t.textSecondary,
                }}
              >
                Operational retrieval failures (errors or 0 verified case-law).
                Use Copy prompt to hand a concrete case to an agent.
              </p>
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                  color: t.textTertiary,
                }}
              >
                Total failures tracked: {num(totalFailuresTracked)}
              </p>
              {recentFailures.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {recentFailures.map((sample, index) => {
                    const rowKey = `${sample.ts || "unknown"}-${index}`;
                    return (
                      <div
                        key={rowKey}
                        style={{
                          border: `1px solid ${t.borderLight}`,
                          padding: 12,
                          background: t.bg,
                        }}
                      >
                        {sample.scenarioSnippet && (
                          <div
                            style={{
                              fontFamily: "'Times New Roman', serif",
                              fontSize: 15,
                              color: t.text,
                              marginBottom: 6,
                            }}
                          >
                            {sample.scenarioSnippet}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            flexWrap: "wrap",
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "'Courier New', monospace",
                              fontSize: 11,
                              color: t.text,
                            }}
                          >
                            {fmtDate(sample.ts)} ·{" "}
                            {sample.endpoint || "unknown"} ·{" "}
                            {sample.reason || "unknown"}
                          </div>
                          <button
                            type="button"
                            onClick={() => copyFixPrompt(sample, index)}
                            style={{
                              padding: "6px 10px",
                              border: `1px solid ${t.borderLight}`,
                              background: "transparent",
                              color:
                                copiedFailureKey === rowKey
                                  ? t.accentGreen
                                  : t.textSecondary,
                              cursor: "pointer",
                              fontFamily: "'Helvetica Neue', sans-serif",
                              fontSize: 10,
                              letterSpacing: 1.2,
                              textTransform: "uppercase",
                            }}
                          >
                            {copiedFailureKey === rowKey
                              ? "Copied"
                              : "Copy Fix Prompt"}
                          </button>
                        </div>
                        <div
                          style={{
                            fontFamily: "'Helvetica Neue', sans-serif",
                            fontSize: 12,
                            color: t.textSecondary,
                            lineHeight: 1.5,
                            marginBottom: 8,
                          }}
                        >
                          Class: {clip(sample.classId, 120)} · Primary issue:{" "}
                          {clip(sample.issuePrimary, 120)}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                            fontFamily: "'Helvetica Neue', sans-serif",
                            fontSize: 11,
                            color: t.textTertiary,
                          }}
                        >
                          <span>final: {num(sample.finalCaseLawCount)}</span>
                          <span>verified: {num(sample.verifiedCount)}</span>
                          <span>latency: {num(sample.latencyMs)} ms</span>
                          <span>
                            fallback: {sample.fallbackPathUsed ? "yes" : "no"}
                          </span>
                          <span>
                            drops: {num(sample.semanticFilterDropCount)}
                          </span>
                        </div>
                        {sample.errorMessage && (
                          <div
                            style={{
                              marginTop: 8,
                              fontFamily: "'Courier New', monospace",
                              fontSize: 11,
                              color: t.textTertiary,
                            }}
                          >
                            {clip(sample.errorMessage, 180)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Helvetica Neue', sans-serif",
                        fontSize: 11,
                        color: t.textTertiary,
                      }}
                    >
                      Showing {num(recentFailures.length)} failed scenarios
                    </span>
                    {failureArchiveHasMore ? (
                      <button
                        type="button"
                        onClick={loadMoreFailures}
                        disabled={loadingMoreFailures}
                        style={{
                          padding: "7px 11px",
                          border: `1px solid ${t.borderLight}`,
                          background: "transparent",
                          color: loadingMoreFailures
                            ? t.textTertiary
                            : t.textSecondary,
                          cursor: loadingMoreFailures ? "default" : "pointer",
                          fontFamily: "'Helvetica Neue', sans-serif",
                          fontSize: 10,
                          letterSpacing: 1.2,
                          textTransform: "uppercase",
                        }}
                      >
                        {loadingMoreFailures
                          ? "Loading..."
                          : "Load older failures"}
                      </button>
                    ) : (
                      <span
                        style={{
                          fontFamily: "'Helvetica Neue', sans-serif",
                          fontSize: 11,
                          color: t.textTertiary,
                        }}
                      >
                        End of failure history
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 12,
                    color: t.textTertiary,
                  }}
                >
                  No recent failed scenarios.
                </p>
              )}
            </div>
            <div style={{ border: `1px solid ${t.borderLight}`, padding: 16 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 10,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 12,
                }}
              >
                Suggested Improvements
              </div>
              {improvements.length > 0 ? (
                <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                  {improvements.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: `1px solid ${t.borderLight}`,
                        padding: 10,
                        background: t.bg,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Helvetica Neue', sans-serif",
                          fontSize: 12,
                          color: t.textSecondary,
                          marginBottom: 6,
                        }}
                      >
                        <strong style={{ color: t.text }}>
                          {item.classId}
                        </strong>{" "}
                        · {item.failureCount} similar failure(s)
                      </div>
                      <div
                        style={{
                          fontFamily: "'Helvetica Neue', sans-serif",
                          fontSize: 12,
                          color: t.textSecondary,
                          marginBottom: 4,
                        }}
                      >
                        Primary issue:{" "}
                        {clip(item.issuePrimary || item.classId, 180)}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Courier New', monospace",
                          fontSize: 11,
                          color: t.textTertiary,
                        }}
                      >
                        terms:{" "}
                        {Array.isArray(item.suggestedTerms)
                          ? item.suggestedTerms.slice(0, 4).join(" | ")
                          : "n/a"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 10,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 12,
                }}
              >
                Active alerts (thresholds)
              </div>
              {Array.isArray(data.alerts) && data.alerts.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {data.alerts.map((a) => (
                    <li
                      key={a.id}
                      style={{
                        fontFamily: "'Helvetica Neue', sans-serif",
                        fontSize: 12,
                        color: t.textSecondary,
                        marginBottom: 8,
                      }}
                    >
                      <strong style={{ color: t.text }}>{a.id}</strong>:{" "}
                      {a.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 12,
                    color: t.textTertiary,
                  }}
                >
                  No threshold breaches
                </p>
              )}
            </div>
            <div
              style={{
                border: `1px solid ${t.borderLight}`,
                padding: 16,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 10,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 12,
                }}
              >
                Threshold Reference (1h)
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 12,
                    color: t.textSecondary,
                  }}
                >
                  Error rate threshold:{" "}
                  <strong style={{ color: t.text }}>
                    {pct(thresholds.errorRate1h)}
                  </strong>
                </div>
                <div
                  style={{
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 12,
                    color: t.textSecondary,
                  }}
                >
                  No-verified threshold:{" "}
                  <strong style={{ color: t.text }}>
                    {pct(thresholds.noVerifiedRate1h)}
                  </strong>
                </div>
                <div
                  style={{
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 12,
                    color: t.textSecondary,
                  }}
                >
                  p95 latency threshold:{" "}
                  <strong style={{ color: t.text }}>
                    {num(thresholds.p95LatencyMs1h)} ms
                  </strong>
                </div>
                <div
                  style={{
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 12,
                    color: t.textSecondary,
                  }}
                >
                  Fallback-path threshold:{" "}
                  <strong style={{ color: t.text }}>
                    {pct(thresholds.fallbackPathRate1h)}
                  </strong>
                </div>
                <div
                  style={{
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 12,
                    color: t.textSecondary,
                  }}
                >
                  Min relevance threshold:{" "}
                  <strong style={{ color: t.text }}>
                    {num(thresholds.avgRelevanceScoreMin1h)}
                  </strong>
                </div>
                <div
                  style={{
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 12,
                    color: t.textSecondary,
                  }}
                >
                  Min sample size:{" "}
                  <strong style={{ color: t.text }}>
                    {num(thresholds.minSampleSize1h)}
                  </strong>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
