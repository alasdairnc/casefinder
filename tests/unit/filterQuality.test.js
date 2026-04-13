import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckRateLimit = vi.fn();
const mockGetClientIp = vi.fn(() => "127.0.0.1");
const mockRateLimitHeaders = vi.fn(() => ({ "X-RateLimit-Limit": "60" }));

vi.mock("../../api/_rateLimit.js", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: mockGetClientIp,
  rateLimitHeaders: mockRateLimitHeaders,
}));

vi.mock("../../api/_logging.js", () => ({
  logRequestStart: vi.fn(),
  logRateLimitCheck: vi.fn(),
  logValidationError: vi.fn(),
  logSuccess: vi.fn(),
  logError: vi.fn(),
}));

const { default: handler } = await import("../../api/filter-quality.js");

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

describe("filter-quality handler", () => {
  const originalToken = process.env.RETRIEVAL_HEALTH_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      reset: 123,
    });
    process.env.RETRIEVAL_HEALTH_TOKEN = "test-token";
  });

  afterEach(() => {
    process.env.RETRIEVAL_HEALTH_TOKEN = originalToken;
  });

  it("returns 401 when token is missing or invalid", async () => {
    const req = { method: "GET", headers: { authorization: "Bearer wrong" } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when the token is not configured", async () => {
    process.env.RETRIEVAL_HEALTH_TOKEN = "";
    const req = {
      method: "GET",
      headers: { authorization: "Bearer test-token" },
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      reset: 123,
    });
    const req = {
      method: "GET",
      headers: { authorization: "Bearer test-token" },
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({
      error: "Rate limit exceeded. Please try again later.",
    });
  });

  it("returns the dashboard payload for authorized requests", async () => {
    const req = {
      method: "GET",
      headers: { authorization: "Bearer test-token" },
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      filters: {
        configuration: expect.any(Object),
        issue_patterns: expect.any(Array),
        landmark_boost_active: expect.any(Boolean),
      },
    });
    expect(res.headers["X-RateLimit-Limit"]).toBe("60");
    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
  });
});
