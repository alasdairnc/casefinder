import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckRateLimit = vi.fn();
const mockGetClientIp = vi.fn(() => "127.0.0.1");
const mockRateLimitHeaders = vi.fn(() => ({ "X-RateLimit-Limit": "60" }));
const mockApplyCorsHeaders = vi.fn();

vi.mock("../../api/_rateLimit.js", () => ({
  redis: null,
  checkRateLimit: mockCheckRateLimit,
  getClientIp: mockGetClientIp,
  rateLimitHeaders: mockRateLimitHeaders,
}));

vi.mock("../../api/_cors.js", () => ({
  applyCorsHeaders: mockApplyCorsHeaders,
}));

vi.mock("../../api/_logging.js", () => ({
  logRequestStart: vi.fn(),
  logRateLimitCheck: vi.fn(),
  logValidationError: vi.fn(),
  logExternalApiCall: vi.fn(),
  logSuccess: vi.fn(),
  logError: vi.fn(),
}));

const { default: handler } = await import("../../api/verify.js");

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

describe("verify handler", () => {
  const originalApiKey = process.env.CANLII_API_KEY;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, limit: 60, remaining: 59, reset: 123 });
    process.env.CANLII_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.CANLII_API_KEY = originalApiKey;
    globalThis.fetch = originalFetch;
  });

  it("returns error status for citation when upstream fetch times out", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("TimeoutError"));

    const req = createReq({ body: { citations: ["2016 SCC 27"] } });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body["2016 SCC 27"]).toMatchObject({ status: "error" });
    expect(res.body["2016 SCC 27"].searchUrl).toContain("canlii.org");
  });

  it("returns 415 when content-type is not application/json", async () => {
    const req = createReq({
      body: { citations: ["2016 SCC 27"] },
      headers: { "content-type": "text/plain" },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(415);
    expect(res.body).toEqual({ error: "Content-Type must be application/json" });
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("returns 413 when content-length exceeds 50kb", async () => {
    const req = createReq({
      body: { citations: ["2016 SCC 27"] },
      headers: { "content-length": "50001" },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(413);
    expect(res.body).toEqual({ error: "Request body too large" });
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("returns 429 when verify rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, limit: 60, remaining: 0, reset: 123 });
    const req = createReq({ body: { citations: ["2016 SCC 27"] } });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: "Rate limit exceeded. Please try again later." });
  });

  it("returns error status when upstream responds with non-JSON content type", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: vi.fn(() => "text/html") },
      json: vi.fn(),
    });

    const req = createReq({ body: { citations: ["2016 SCC 27"] } });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body["2016 SCC 27"]).toMatchObject({ status: "error" });
  });

  it("handles mixed citation batches across verified and error branches", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: vi.fn(() => "application/json") },
      json: async () => ({ title: "R v Jordan" }),
    });

    const req = createReq({
      body: {
        citations: [
          "2016 SCC 27",
          "not a citation",
          "2020 ZZZZ 99",
        ],
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body["2016 SCC 27"]).toMatchObject({ status: "verified", title: "R v Jordan" });
    expect(res.body["not a citation"]).toMatchObject({ status: "unparseable" });
    expect(res.body["2020 ZZZZ 99"]).toMatchObject({ status: "unknown_court" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
