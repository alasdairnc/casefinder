import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckRateLimit = vi.fn();
const mockGetClientIp = vi.fn(() => "127.0.0.1");
const mockRateLimitHeaders = vi.fn(() => ({ "X-RateLimit-Limit": "60" }));
const mockApplyCorsHeaders = vi.fn();
const mockGetRetrievalHealthSnapshot = vi.fn();
const mockGetTrendlineSnapshots = vi.fn();
const mockEvaluateRetrievalAlerts = vi.fn(() => []);

vi.mock("../../api/_rateLimit.js", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: mockGetClientIp,
  rateLimitHeaders: mockRateLimitHeaders,
}));

vi.mock("../../api/_cors.js", () => ({
  applyCorsHeaders: mockApplyCorsHeaders,
}));

vi.mock("../../api/_retrievalHealthStore.js", () => ({
  getRetrievalHealthSnapshot: mockGetRetrievalHealthSnapshot,
  getTrendlineSnapshots: mockGetTrendlineSnapshots,
}));

vi.mock("../../api/_retrievalThresholds.js", () => ({
  evaluateRetrievalAlerts: mockEvaluateRetrievalAlerts,
  RETRIEVAL_ALERT_THRESHOLDS: {
    highErrorRate: 0.2,
    highNoVerifiedRate: 0.7,
  },
}));

vi.mock("../../api/_logging.js", () => ({
  logRequestStart: vi.fn(),
  logRateLimitCheck: vi.fn(),
  logValidationError: vi.fn(),
  logSuccess: vi.fn(),
  logError: vi.fn(),
}));

const { default: handler } = await import("../../api/retrieval-health.js");

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

describe("retrieval-health handler", () => {
  const originalToken = process.env.RETRIEVAL_HEALTH_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, limit: 60, remaining: 59, reset: 123 });
    mockGetRetrievalHealthSnapshot.mockResolvedValue({
      generatedAt: new Date(0).toISOString(),
      retentionMs: 86_400_000,
      totalStoredEvents: 10,
      windows: { fiveMinutes: {}, oneHour: {} },
      recentFailures: [
        {
          ts: new Date(1).toISOString(),
          endpoint: "analyze",
          reason: "no_verified",
          scenarioSnippet: "sample scenario",
        },
      ],
    });
    mockGetTrendlineSnapshots.mockResolvedValue([{ ts: 1, errorRate: null, noVerifiedRate: null, avgLatencyMs: null }]);
    process.env.RETRIEVAL_HEALTH_TOKEN = "test-token";
  });

  afterEach(() => {
    process.env.RETRIEVAL_HEALTH_TOKEN = originalToken;
  });

  it("returns 200 for OPTIONS preflight", async () => {
    const req = { method: "OPTIONS", headers: {} };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.ended).toBe(true);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockApplyCorsHeaders).toHaveBeenCalledWith(
      req,
      res,
      "GET, OPTIONS",
      "Authorization, Content-Type"
    );
  });

  it("returns 405 for non-GET methods", async () => {
    const req = { method: "POST", headers: {} };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: "Method not allowed" });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, limit: 60, remaining: 0, reset: 123 });
    const req = { method: "GET", headers: { authorization: "Bearer test-token" } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: "Rate limit exceeded. Please try again later." });
  });

  it("returns 401 when auth token is missing or invalid", async () => {
    const req = { method: "GET", headers: { authorization: "Bearer wrong" } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when token is not configured", async () => {
    process.env.RETRIEVAL_HEALTH_TOKEN = "";
    const req = { method: "GET", headers: { authorization: "Bearer anything" } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns health snapshot payload for authorized requests", async () => {
    mockEvaluateRetrievalAlerts.mockReturnValue([{ code: "high_error_rate" }]);
    const req = { method: "GET", headers: { authorization: "Bearer test-token" } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      generatedAt: new Date(0).toISOString(),
      retentionMs: 86_400_000,
      totalStoredEvents: 10,
      recentFailures: [
        {
          ts: new Date(1).toISOString(),
          endpoint: "analyze",
          reason: "no_verified",
          scenarioSnippet: "sample scenario",
        },
      ],
      trendline: [{ ts: 1, errorRate: null, noVerifiedRate: null, avgLatencyMs: null }],
      alerts: [{ code: "high_error_rate" }],
      thresholds: {
        highErrorRate: 0.2,
        highNoVerifiedRate: 0.7,
      },
    });
    expect(res.headers["X-RateLimit-Limit"]).toBe("60");
    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(res.headers["X-Frame-Options"]).toBe("DENY");
    expect(res.headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(res.headers["Content-Security-Policy"]).toBe("default-src 'none'");
  });

  it("passes through upstream 4xx errors unchanged", async () => {
    const upstreamError = new Error("bad request");
    upstreamError.status = 400;
    mockGetRetrievalHealthSnapshot.mockRejectedValue(upstreamError);
    const req = { method: "GET", headers: { authorization: "Bearer test-token" } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Internal server error" });
  });

  it("maps upstream 5xx errors to 502", async () => {
    const upstreamError = new Error("upstream failed");
    upstreamError.status = 503;
    mockGetRetrievalHealthSnapshot.mockRejectedValue(upstreamError);
    const req = { method: "GET", headers: { authorization: "Bearer test-token" } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
