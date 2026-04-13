import { describe, expect, it, vi } from "vitest";

vi.mock("../../api/_rateLimit.js", () => ({ redis: null }));

async function loadStore() {
  vi.resetModules();
  return import("../../api/_retrievalHealthStore.js");
}

describe("retrieval health store recent failures", () => {
  it("includes cache-backed zero-result events in recent failures", async () => {
    const { recordRetrievalMetricsEvent, getRetrievalHealthSnapshot } =
      await loadStore();
    const futureNow = Date.now() + 60_000;

    await recordRetrievalMetricsEvent({
      endpoint: "analyze",
      source: "cache",
      reason: "no_verified",
      caseLawFilterEnabled: true,
      finalCaseLawCount: 0,
      verifiedCount: 0,
      scenarioSnippet: "neighbor built fence onto my property",
    });

    const snapshot = await getRetrievalHealthSnapshot({ nowMs: futureNow });

    expect(snapshot.recentFailures).toHaveLength(1);
    expect(snapshot.recentFailures[0]).toMatchObject({
      endpoint: "analyze",
      reason: "no_verified",
      scenarioSnippet: "neighbor built fence onto my property",
      finalCaseLawCount: 0,
    });
  });

  it("aggregates by-issue rates and concept rescues in window snapshots", async () => {
    const { recordRetrievalMetricsEvent, getRetrievalHealthSnapshot } =
      await loadStore();
    const futureNow = Date.now() + 60_000;

    await recordRetrievalMetricsEvent({
      endpoint: "analyze",
      source: "retrieval",
      reason: "verified_results",
      caseLawFilterEnabled: true,
      finalCaseLawCount: 2,
      verifiedCount: 2,
      issuePrimary: "robbery",
      fallbackPathUsed: false,
      retrievalError: false,
      prefilterConceptRescueCount: 2,
      semanticFilterDropCount: 1,
    });

    await recordRetrievalMetricsEvent({
      endpoint: "analyze",
      source: "retrieval",
      reason: "no_verified",
      caseLawFilterEnabled: true,
      finalCaseLawCount: 0,
      verifiedCount: 0,
      issuePrimary: "robbery",
      fallbackPathUsed: true,
      retrievalError: false,
      prefilterConceptRescueCount: 0,
      semanticFilterDropCount: 3,
    });

    await recordRetrievalMetricsEvent({
      endpoint: "analyze",
      source: "retrieval",
      reason: "retrieval_error",
      caseLawFilterEnabled: true,
      finalCaseLawCount: 0,
      verifiedCount: 0,
      issuePrimary: "charter_counsel",
      fallbackPathUsed: true,
      retrievalError: true,
      prefilterConceptRescueCount: 1,
      semanticFilterDropCount: 2,
    });

    const snapshot = await getRetrievalHealthSnapshot({ nowMs: futureNow });
    const oneHour = snapshot.windows["1h"];

    expect(oneHour.rates.avgConceptRescues).toBeCloseTo(1);
    expect(Array.isArray(oneHour.breakdowns.byIssue)).toBe(true);
    expect(oneHour.breakdowns.byIssue[0]).toMatchObject({
      issuePrimary: "robbery",
      requests: 2,
      fallbackPathRate: 0.5,
      noVerifiedRate: 0.5,
      errorRate: 0,
      avgVerifiedPerRequest: 1,
    });
    expect(oneHour.breakdowns.byIssue[1]).toMatchObject({
      issuePrimary: "charter_counsel",
      requests: 1,
      fallbackPathRate: 1,
      noVerifiedRate: 1,
      errorRate: 1,
      avgVerifiedPerRequest: 0,
    });
  });

  it("returns paginated failure archive pages", async () => {
    const { recordRetrievalMetricsEvent, getFailureScenarioPage } =
      await loadStore();
    const now = Date.now();

    await recordRetrievalMetricsEvent({
      endpoint: "analyze",
      source: "retrieval",
      reason: "no_verified",
      caseLawFilterEnabled: true,
      finalCaseLawCount: 0,
      verifiedCount: 0,
      scenarioSnippet: "first scenario",
    });

    await recordRetrievalMetricsEvent({
      endpoint: "analyze",
      source: "retrieval",
      reason: "no_verified",
      caseLawFilterEnabled: true,
      finalCaseLawCount: 0,
      verifiedCount: 0,
      scenarioSnippet: "second scenario",
    });

    await recordRetrievalMetricsEvent({
      endpoint: "analyze",
      source: "retrieval",
      reason: "retrieval_error",
      caseLawFilterEnabled: true,
      finalCaseLawCount: 0,
      verifiedCount: 0,
      scenarioSnippet: "third scenario",
    });

    const firstPage = await getFailureScenarioPage({
      nowMs: now + 60_000,
      limit: 2,
    });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextOffset).toBe(2);
    expect(firstPage.totalFailures).toBe(3);

    const secondPage = await getFailureScenarioPage({
      nowMs: now + 60_000,
      limit: 2,
      offset: firstPage.nextOffset,
    });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.hasMore).toBe(false);
    expect(secondPage.nextOffset).toBe(null);
    expect(secondPage.totalFailures).toBe(3);
  });
});
