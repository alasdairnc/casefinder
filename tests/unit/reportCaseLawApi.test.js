import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckRateLimit = vi.fn();
const mockGetClientIp = vi.fn(() => "127.0.0.1");
const mockRateLimitHeaders = vi.fn(() => ({ "X-RateLimit-Limit": "60" }));
const mockApplyCorsHeaders = vi.fn();
const mockIsOriginAllowed = vi.fn(() => true);
const mockRecordCaseLawReport = vi.fn();

vi.mock("../../api/_rateLimit.js", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: mockGetClientIp,
  rateLimitHeaders: mockRateLimitHeaders,
}));

vi.mock("../../api/_cors.js", () => ({
  applyCorsHeaders: mockApplyCorsHeaders,
  isOriginAllowed: mockIsOriginAllowed,
}));

vi.mock("../../api/_logging.js", () => ({
  logRequestStart: vi.fn(),
  logRateLimitCheck: vi.fn(),
  logValidationError: vi.fn(),
  logSuccess: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("../../api/_caseLawReportStore.js", () => ({
  recordCaseLawReport: mockRecordCaseLawReport,
}));

const { default: handler } = await import("../../api/report-case-law.js");

function createReq({ method = "POST", body = {}, headers = {} } = {}) {
  return {
    method,
    body,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  };
}

function createRes() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    ended: false,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

function makeBody() {
  return {
    analysisRequestId: "analysis_req_1",
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
      citation: "R v Example, 2024 SCC 1",
      title: "R v Example",
      court: "SCC",
      year: "2024",
      url_canlii: "https://www.canlii.org/en/ca/scc/doc/example.html",
      summary: "Example summary.",
    },
    resultIndex: 0,
    reason: "wrong_legal_issue",
    note: "Needs a better fit.",
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
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({
    allowed: true,
    limit: 60,
    remaining: 59,
    reset: 123,
  });
  mockRecordCaseLawReport.mockResolvedValue({
    reportId: "clr_test",
    reportedAt: "2026-04-15T12:00:00.000Z",
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("report-case-law handler", () => {
  it("stores a normalized report and returns 201", async () => {
    const req = createReq({ body: makeBody() });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.reportId).toBe("string");
    expect(mockRecordCaseLawReport).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisRequestId: "analysis_req_1",
        scenarioSnippet:
          "A person broke into a house at night and stole electronics.",
        resultIndex: 0,
        reason: "wrong_legal_issue",
        note: "Needs a better fit.",
        item: expect.objectContaining({
          citation: "R v Example, 2024 SCC 1",
          title: "R v Example",
        }),
      }),
    );
  });

  it("rejects a missing citation", async () => {
    const req = createReq({
      body: {
        ...makeBody(),
        item: { ...makeBody().item, citation: " " },
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "Reported item citation is required.",
    });
    expect(mockRecordCaseLawReport).not.toHaveBeenCalled();
  });

  it("rejects an invalid reason", async () => {
    const req = createReq({
      body: {
        ...makeBody(),
        reason: "bad_reason",
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid report reason." });
  });

  it("rejects notes longer than 300 characters", async () => {
    const req = createReq({
      body: {
        ...makeBody(),
        note: "x".repeat(301),
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "Note must be 300 characters or fewer.",
    });
  });

  it("rejects malformed filters and case-law metadata", async () => {
    const req = createReq({
      body: {
        ...makeBody(),
        filters: {
          ...makeBody().filters,
          courtLevel: "invalid",
        },
        caseLawMeta: {
          ...makeBody().caseLawMeta,
          verifiedCount: -1,
        },
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid filters payload." });
  });
});
