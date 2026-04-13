import { describe, expect, it } from "vitest";

import {
  evaluateRetrievalAlerts,
  RETRIEVAL_ALERT_THRESHOLDS,
} from "../../api/_retrievalThresholds.js";

describe("evaluateRetrievalAlerts", () => {
  it("emits fallback-path alert when 1h fallback rate exceeds threshold", () => {
    const alerts = evaluateRetrievalAlerts({
      windows: {
        "1h": {
          samples: { operational: 10, quality: 10, latency: 10 },
          rates: {
            errorRate: 0,
            noVerifiedRate: 0.1,
            avgVerifiedPerRequest: 1.2,
            fallbackPathRate:
              RETRIEVAL_ALERT_THRESHOLDS.fallbackPathRate1h + 0.05,
            avgRelevanceScore:
              RETRIEVAL_ALERT_THRESHOLDS.avgRelevanceScoreMin1h + 0.5,
          },
          latencyMs: { p95: 900 },
        },
      },
    });

    expect(alerts.some((a) => a.id === "retrieval_fallback_path_rate_1h")).toBe(
      true,
    );
  });

  it("emits low-relevance alert when 1h relevance average drops below threshold", () => {
    const alerts = evaluateRetrievalAlerts({
      windows: {
        "1h": {
          samples: { operational: 10, quality: 10, latency: 10 },
          rates: {
            errorRate: 0,
            noVerifiedRate: 0.1,
            avgVerifiedPerRequest: 1.2,
            fallbackPathRate: 0.1,
            avgRelevanceScore:
              RETRIEVAL_ALERT_THRESHOLDS.avgRelevanceScoreMin1h - 0.5,
          },
          latencyMs: { p95: 900 },
        },
      },
    });

    expect(
      alerts.some((a) => a.id === "retrieval_avg_relevance_score_1h"),
    ).toBe(true);
  });

  it("does not emit phase-4 alerts under threshold", () => {
    const alerts = evaluateRetrievalAlerts({
      windows: {
        "1h": {
          samples: { operational: 10, quality: 10, latency: 10 },
          rates: {
            errorRate: 0,
            noVerifiedRate: 0.1,
            avgVerifiedPerRequest: 1.2,
            fallbackPathRate:
              RETRIEVAL_ALERT_THRESHOLDS.fallbackPathRate1h - 0.1,
            avgRelevanceScore:
              RETRIEVAL_ALERT_THRESHOLDS.avgRelevanceScoreMin1h + 0.1,
          },
          latencyMs: { p95: 900 },
        },
      },
    });

    expect(alerts.some((a) => a.id === "retrieval_fallback_path_rate_1h")).toBe(
      false,
    );
    expect(
      alerts.some((a) => a.id === "retrieval_avg_relevance_score_1h"),
    ).toBe(false);
  });

  it("emits by-issue no-verified alert when issue has enough volume and sustained degradation", () => {
    const alerts = evaluateRetrievalAlerts({
      windows: {
        "1h": {
          samples: { operational: 12, quality: 12, latency: 12 },
          rates: {
            errorRate: 0.01,
            noVerifiedRate: 0.2,
            avgVerifiedPerRequest: 1.1,
            fallbackPathRate: 0.2,
            avgRelevanceScore: 6.0,
          },
          latencyMs: { p95: 800 },
          breakdowns: {
            byIssue: [
              {
                issuePrimary: "robbery",
                requests: RETRIEVAL_ALERT_THRESHOLDS.issueMinRequests1h,
                noVerifiedRate:
                  RETRIEVAL_ALERT_THRESHOLDS.issueNoVerifiedRate1h + 0.05,
                errorRate: 0.1,
              },
            ],
          },
        },
      },
    });

    const issueAlert = alerts.find(
      (a) => a.id === "retrieval_issue_no_verified_rate_1h_robbery",
    );
    expect(issueAlert).toBeTruthy();
    expect(issueAlert).toMatchObject({
      metric: "issueNoVerifiedRate",
      issuePrimary: "robbery",
      requests: RETRIEVAL_ALERT_THRESHOLDS.issueMinRequests1h,
    });
  });

  it("does not emit by-issue alert below issue request floor", () => {
    const alerts = evaluateRetrievalAlerts({
      windows: {
        "1h": {
          samples: { operational: 12, quality: 12, latency: 12 },
          rates: {
            errorRate: 0.01,
            noVerifiedRate: 0.2,
            avgVerifiedPerRequest: 1.1,
            fallbackPathRate: 0.2,
            avgRelevanceScore: 6.0,
          },
          latencyMs: { p95: 800 },
          breakdowns: {
            byIssue: [
              {
                issuePrimary: "theft",
                requests: RETRIEVAL_ALERT_THRESHOLDS.issueMinRequests1h - 1,
                noVerifiedRate: 1,
                errorRate: 1,
              },
            ],
          },
        },
      },
    });

    expect(
      alerts.some((a) =>
        a.id.includes("retrieval_issue_no_verified_rate_1h_theft"),
      ),
    ).toBe(false);
    expect(
      alerts.some((a) => a.id.includes("retrieval_issue_error_rate_1h_theft")),
    ).toBe(false);
  });
});
