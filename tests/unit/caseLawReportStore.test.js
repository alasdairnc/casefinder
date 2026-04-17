import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockRedis = null;

vi.mock("../../api/_rateLimit.js", () => ({
  get redis() {
    return mockRedis;
  },
}));

const {
  recordCaseLawReport,
  getStoredCaseLawReports,
  resetInMemoryCaseLawReports,
} = await import("../../api/_caseLawReportStore.js");

function makeReport(index = 1) {
  return {
    reportId: `clr_${index}`,
    reportedAt: "2026-04-15T12:00:00.000Z",
    analysisRequestId: "req_123",
    scenarioSnippet:
      "A person broke into a house at night and stole electronics.",
    filters: {
      jurisdiction: "all",
      courtLevel: "all",
      dateRange: "all",
      lawTypes: {
        criminal_code: true,
        case_law: true,
        civil_law: true,
        charter: true,
      },
    },
    item: {
      citation: `R v Example ${index}, 2024 SCC ${index}`,
      title: "R v Example",
      court: "SCC",
      year: "2024",
      url_canlii: "https://www.canlii.org/en/ca/scc/doc/example.html",
      summary: "Example summary",
    },
    resultIndex: 0,
    reason: "wrong_legal_issue",
    note: "Needs a tighter factual match.",
    caseLawMeta: {
      source: "retrieval_ranked",
      reason: "verified_results",
      issuePrimary: "theft",
      retrievalPass: "phase_b_ranked",
      fallbackReason: null,
      verifiedCount: 1,
    },
  };
}

beforeEach(() => {
  mockRedis = null;
  resetInMemoryCaseLawReports();
});

afterEach(() => {
  mockRedis = null;
  resetInMemoryCaseLawReports();
  vi.restoreAllMocks();
});

describe("case-law report store", () => {
  it("normalizes and stores a report in memory fallback", async () => {
    await recordCaseLawReport({
      ...makeReport(),
      scenarioSnippet:
        "   A person broke into a house at night and stole electronics.   ",
      item: {
        ...makeReport().item,
        title: "  R v Example   ",
        url_canlii: "not-a-url",
        summary: "  Example summary with extra spacing.  ",
      },
      note: "  Needs a tighter factual match.  ",
    });

    const stored = await getStoredCaseLawReports();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      scenarioSnippet:
        "A person broke into a house at night and stole electronics.",
      item: {
        citation: "R v Example 1, 2024 SCC 1",
        title: "R v Example",
        summary: "Example summary with extra spacing.",
        url_canlii: null,
      },
      note: "Needs a tighter factual match.",
      caseLawMeta: {
        source: "retrieval_ranked",
        reason: "verified_results",
        issuePrimary: "theft",
      },
    });
  });

  it("keeps only the most recent bounded number of reports", async () => {
    for (let index = 0; index < 1005; index += 1) {
      await recordCaseLawReport(makeReport(index));
    }

    const stored = await getStoredCaseLawReports();
    expect(stored).toHaveLength(1000);
    expect(stored[0].reportId).toBe("clr_5");
    expect(stored.at(-1).reportId).toBe("clr_1004");
  });
});
