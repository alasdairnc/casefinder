import { describe, expect, it } from "vitest";

import { buildRetrievalMetrics } from "../../api/_retrievalMetrics.js";

describe("buildRetrievalMetrics", () => {
  it("normalizes phase-4 telemetry fields from retrieval meta", () => {
    const payload = buildRetrievalMetrics({
      requestId: "req-1",
      endpoint: "retrieve-caselaw",
      source: "retrieval",
      retrievalMeta: {
        termsTried: 4,
        databasesTried: 3,
        searchCalls: 0,
        candidateCount: 12,
        verificationCalls: 8,
        verifiedCount: 3,
        relevanceScoreAvg: 6.2378,
        fallbackPathUsed: true,
        fallbackReason: "semantic_filter_fallback",
        semanticFilterDropCount: 5,
        candidateSourceMix: {
          ai: 6,
          landmark: 4,
          localFallback: 2,
        },
      },
      retrievalLatencyMs: 742,
      finalCaseLawCount: 3,
      filters: {
        jurisdiction: "Ontario",
        courtLevel: "appeal",
        dateRange: "10",
      },
      scenario: "I was stopped at a RIDE checkpoint and refused the breath test after arrest.",
    });

    expect(payload.relevanceScoreAvg).toBe(6.238);
    expect(payload.fallbackPathUsed).toBe(true);
    expect(payload.fallbackReason).toBe("semantic_filter_fallback");
    expect(payload.semanticFilterDropCount).toBe(5);
    expect(payload.candidateSourceMix).toEqual({ ai: 6, landmark: 4, localFallback: 2 });
    expect(payload.scenarioSnippet).toBe("I was stopped at a RIDE checkpoint and refused the breath test after arrest.");
  });

  it("applies safe defaults for missing or invalid phase-4 fields", () => {
    const payload = buildRetrievalMetrics({
      retrievalMeta: {
        verifiedCount: 0,
        relevanceScoreAvg: "n/a",
        fallbackPathUsed: false,
        semanticFilterDropCount: -8,
        candidateSourceMix: {
          ai: -1,
          landmark: undefined,
          localFallback: null,
        },
      },
    });

    expect(payload.relevanceScoreAvg).toBeNull();
    expect(payload.fallbackPathUsed).toBe(false);
    expect(payload.fallbackReason).toBeNull();
    expect(payload.semanticFilterDropCount).toBe(0);
    expect(payload.candidateSourceMix).toEqual({ ai: 0, landmark: 0, localFallback: 0 });
    expect(payload.scenarioSnippet).toBeNull();
  });

  it("trims and truncates scenario snippets", () => {
    const payload = buildRetrievalMetrics({
      scenario: `  ${"x".repeat(400)}  `,
    });

    expect(payload.scenarioSnippet.length).toBe(280);
    expect(payload.scenarioSnippet).toBe("x".repeat(280));
  });
});
