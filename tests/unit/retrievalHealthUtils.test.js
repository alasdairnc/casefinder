import { describe, expect, it } from "vitest";

import {
  buildAgentFixPrompt,
  clip,
  fmtDate,
  num,
  pct,
  severityForMetric,
  statusFromData,
} from "../../src/components/retrievalHealthUtils.js";

describe("retrievalHealthUtils", () => {
  it("formats percent and number with fallback", () => {
    expect(pct(0.125)).toBe("12.5%");
    expect(pct(null)).toBe("—");
    expect(num(42)).toBe("42");
    expect(num(undefined)).toBe("—");
  });

  it("clips long text and handles empty values", () => {
    expect(clip("  short  ", 10)).toBe("short");
    expect(clip("abcdefghijklmnopqrstuvwxyz", 5)).toBe("abcde...");
    expect(clip("   ")).toBe("—");
  });

  it("formats dates with fallback for invalid inputs", () => {
    expect(fmtDate("not-a-date")).toBe("—");
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate("2026-01-01T00:00:00.000Z")).not.toBe("—");
  });

  it("builds agent fix prompt with scenario and optional error", () => {
    const prompt = buildAgentFixPrompt({
      ts: "2026-04-02T00:00:00.000Z",
      endpoint: "analyze",
      reason: "retrieval_error",
      scenarioSnippet: "trial delay issue",
      errorMessage: "network failure",
    });

    expect(prompt).toContain("Investigate and fix retrieval failure");
    expect(prompt).toContain("trial delay issue");
    expect(prompt).toContain("Error message: network failure");
  });

  it("computes severity and status from thresholded values", () => {
    expect(severityForMetric(0.9, 1.0).label).toBe("Warning");
    expect(severityForMetric(1.1, 1.0).label).toBe("Critical");
    expect(severityForMetric(6, 5, "below_is_bad").label).toBe("OK");

    const status = statusFromData({
      alerts: [],
      totalStoredEvents: 10,
      thresholds: {
        errorRate1h: 0.1,
        noVerifiedRate1h: 0.3,
        p95LatencyMs1h: 3000,
      },
      windows: {
        "1h": {
          rates: { errorRate: 0.02, noVerifiedRate: 0.1 },
          latencyMs: { p95: 900 },
        },
      },
    });

    expect(status.label).toBe("Healthy");
  });
});
