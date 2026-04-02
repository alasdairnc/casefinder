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
            fallbackPathRate: RETRIEVAL_ALERT_THRESHOLDS.fallbackPathRate1h + 0.05,
            avgRelevanceScore: RETRIEVAL_ALERT_THRESHOLDS.avgRelevanceScoreMin1h + 0.5,
          },
          latencyMs: { p95: 900 },
        },
      },
    });

    expect(alerts.some((a) => a.id === "retrieval_fallback_path_rate_1h")).toBe(true);
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
            avgRelevanceScore: RETRIEVAL_ALERT_THRESHOLDS.avgRelevanceScoreMin1h - 0.5,
          },
          latencyMs: { p95: 900 },
        },
      },
    });

    expect(alerts.some((a) => a.id === "retrieval_avg_relevance_score_1h")).toBe(true);
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
            fallbackPathRate: RETRIEVAL_ALERT_THRESHOLDS.fallbackPathRate1h - 0.1,
            avgRelevanceScore: RETRIEVAL_ALERT_THRESHOLDS.avgRelevanceScoreMin1h + 0.1,
          },
          latencyMs: { p95: 900 },
        },
      },
    });

    expect(alerts.some((a) => a.id === "retrieval_fallback_path_rate_1h")).toBe(false);
    expect(alerts.some((a) => a.id === "retrieval_avg_relevance_score_1h")).toBe(false);
  });
});
