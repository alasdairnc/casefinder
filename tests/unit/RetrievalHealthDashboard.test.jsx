// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RetrievalHealthDashboard from "../../src/components/RetrievalHealthDashboard.jsx";
import { ThemeProvider } from "../../src/lib/ThemeContext.jsx";

function renderDashboard() {
  return render(
    <ThemeProvider>
      <RetrievalHealthDashboard onNavigateHome={() => {}} />
    </ThemeProvider>,
  );
}

function makeHealthResponse(overrides = {}) {
  return {
    generatedAt: new Date().toISOString(),
    totalStoredEvents: 20,
    snapshotSource: "memory",
    windows: {
      "5m": {
        samples: { operational: 2, quality: 2, latency: 2 },
        rates: {
          errorRate: 0,
          noVerifiedRate: 0.5,
          fallbackPathRate: 0.5,
          avgVerifiedPerRequest: 0.5,
          avgRelevanceScore: 6,
          avgSemanticFilterDrops: 1,
          avgConceptRescues: 0.5,
          candidateSourceMix: { ai: 0.5, landmark: 0.25, localFallback: 0.25 },
        },
        latencyMs: { avg: 120, p95: 170 },
        firstEventAt: new Date(Date.now() - 300000).toISOString(),
        lastEventAt: new Date().toISOString(),
        breakdowns: { byIssue: [] },
      },
      "1h": {
        samples: { operational: 6, quality: 6, latency: 6 },
        rates: {
          errorRate: 0.05,
          noVerifiedRate: 0.35,
          fallbackPathRate: 0.4,
          avgVerifiedPerRequest: 1.2,
          avgRelevanceScore: 6.4,
          avgSemanticFilterDrops: 1.8,
          avgConceptRescues: 0.8,
          candidateSourceMix: { ai: 0.6, landmark: 0.2, localFallback: 0.2 },
        },
        latencyMs: { avg: 180, p95: 340 },
        firstEventAt: new Date(Date.now() - 3600000).toISOString(),
        lastEventAt: new Date().toISOString(),
        breakdowns: { byIssue: [] },
      },
    },
    alltime: {
      samples: { total: 20, operational: 20, quality: 20, latency: 20 },
      rates: {
        errorRate: 0.1,
        noVerifiedRate: 0.3,
        fallbackPathRate: 0.5,
        avgVerifiedPerRequest: 1.1,
        avgRelevanceScore: 6.1,
        avgSemanticFilterDrops: 1.9,
        avgConceptRescues: 0.7,
      },
      latencyMs: { avg: 220, p95: null },
      breakdowns: {
        byIssue: [
          {
            issuePrimary: "theft",
            requests: 10,
            fallbackPathRate: 0.2,
            noVerifiedRate: 0.1,
            errorRate: 0.01,
            avgVerifiedPerRequest: 2.1,
          },
          {
            issuePrimary: "robbery",
            requests: 4,
            fallbackPathRate: 0.1,
            noVerifiedRate: 0.8,
            errorRate: 0.2,
            avgVerifiedPerRequest: 0.4,
          },
          {
            issuePrimary: "charter_search_seizure",
            requests: 2,
            fallbackPathRate: 0.2,
            noVerifiedRate: 0.95,
            errorRate: 0.3,
            avgVerifiedPerRequest: 0.2,
          },
          {
            issuePrimary: "assault",
            requests: 5,
            fallbackPathRate: 0.7,
            noVerifiedRate: 0.5,
            errorRate: 0.1,
            avgVerifiedPerRequest: 0.9,
          },
        ],
      },
      firstEventAt: new Date(Date.now() - 86400000).toISOString(),
      lastEventAt: new Date().toISOString(),
    },
    trendline: [],
    thresholds: {
      errorRate1h: 0.2,
      noVerifiedRate1h: 0.7,
      p95LatencyMs1h: 2000,
      fallbackPathRate1h: 0.65,
      avgRelevanceScoreMin1h: 5,
      minSampleSize1h: 8,
    },
    recentFailures: [],
    improvements: [],
    alerts: [],
    ...overrides,
  };
}

function extractIssueOrder(container) {
  const matches = [
    ...container.textContent.matchAll(/([a-z_]+)\s*·\s*\d+\s*requests/g),
  ];
  return matches.map((m) => m[1]);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RetrievalHealthDashboard all-time issue trends", () => {
  it("defaults to risk-first order and falls back to volume sort on toggle", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeHealthResponse(),
      }),
    );

    const { container } = renderDashboard();

    await screen.findByText("All-time by issue trend");

    await waitFor(() => {
      const order = extractIssueOrder(container);
      expect(order.slice(0, 3)).toEqual(["robbery", "assault", "theft"]);
      expect(order).not.toContain("charter_search_seizure");
    });

    fireEvent.click(screen.getByRole("button", { name: "Sort: Volume" }));

    await waitFor(() => {
      const order = extractIssueOrder(container);
      expect(order.slice(0, 3)).toEqual(["theft", "assault", "robbery"]);
      expect(order).not.toContain("charter_search_seizure");
    });
  });

  it("falls back to showing all issue rows when every issue is below min sample threshold", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          makeHealthResponse({
            alltime: {
              samples: { total: 6, operational: 6, quality: 6, latency: 6 },
              rates: {
                errorRate: 0.1,
                noVerifiedRate: 0.3,
                fallbackPathRate: 0.5,
                avgVerifiedPerRequest: 0.9,
                avgRelevanceScore: 5.8,
                avgSemanticFilterDrops: 1.2,
                avgConceptRescues: 0.4,
              },
              latencyMs: { avg: 180, p95: null },
              breakdowns: {
                byIssue: [
                  {
                    issuePrimary: "theft",
                    requests: 2,
                    fallbackPathRate: 0.2,
                    noVerifiedRate: 0.1,
                    errorRate: 0,
                    avgVerifiedPerRequest: 1.3,
                  },
                  {
                    issuePrimary: "robbery",
                    requests: 1,
                    fallbackPathRate: 0.6,
                    noVerifiedRate: 0.9,
                    errorRate: 0.2,
                    avgVerifiedPerRequest: 0.2,
                  },
                ],
              },
              firstEventAt: new Date(Date.now() - 3600000).toISOString(),
              lastEventAt: new Date().toISOString(),
            },
          }),
      }),
    );

    const { container } = renderDashboard();

    await screen.findByText("All-time by issue trend");

    await waitFor(() => {
      const order = extractIssueOrder(container);
      expect(order).toContain("theft");
      expect(order).toContain("robbery");
      expect(order).toHaveLength(2);
    });
  });

  it("renders compact issue alert summary when issue-level alerts are present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          makeHealthResponse({
            alerts: [
              {
                id: "retrieval_issue_no_verified_rate_1h_robbery",
                metric: "issueNoVerifiedRate",
                issuePrimary: "robbery",
                requests: 8,
                value: 0.9,
                threshold: 0.85,
                message: "Issue robbery is degraded.",
              },
            ],
          }),
      }),
    );

    renderDashboard();

    await screen.findByText("Issue Alert Summary");
    expect(screen.getByText("robbery · 8 requests")).toBeTruthy();
    expect(
      screen.getByText("No-verified at 90.0% (threshold 85.0%)"),
    ).toBeTruthy();
  });
});
