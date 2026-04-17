import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function resetRateLimitEnv() {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL;
}

async function loadRateLimitModule({ redisImpl = null } = {}) {
  vi.resetModules();
  if (redisImpl) {
    vi.doMock("@upstash/redis", () => ({
      Redis: class MockRedis {
        constructor() {
          return redisImpl;
        }
      },
    }));
  } else {
    vi.doMock("@upstash/redis", () => ({
      Redis: class MockRedis {
        constructor() {
          throw new Error("Redis constructor should not be called in this test");
        }
      },
    }));
  }
  return import("../../api/_rateLimit.js");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("@upstash/redis");
  process.env = { ...ORIGINAL_ENV };
});

describe("rate limiter", () => {
  it("uses atomic Redis counters and sets expiry on the first hit", async () => {
    resetRateLimitEnv();
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.VERCEL_ENV = "production";

    const redisImpl = {
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
    };

    const { checkRateLimit } = await loadRateLimitModule({ redisImpl });
    const result = await checkRateLimit("1.2.3.4", "analyze");

    expect(redisImpl.incr).toHaveBeenCalledTimes(1);
    expect(redisImpl.expire).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      allowed: true,
      limit: 5,
      remaining: 4,
      reason: null,
    });
  });

  it("fails closed in production when Redis is unavailable", async () => {
    resetRateLimitEnv();
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.VERCEL_ENV = "production";

    const redisImpl = {
      incr: vi.fn().mockRejectedValue(new Error("redis down")),
      expire: vi.fn(),
    };

    const { checkRateLimit } = await loadRateLimitModule({ redisImpl });
    const result = await checkRateLimit("1.2.3.4", "analyze");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("backend_unavailable");
    expect(result.retryAfterSeconds).toBe(60);
  });

  it("falls back to in-memory counters in development", async () => {
    resetRateLimitEnv();
    process.env.VERCEL_ENV = "development";

    const { checkRateLimit } = await loadRateLimitModule();

    let result = null;
    for (let i = 0; i < 6; i += 1) {
      result = await checkRateLimit("1.2.3.4", "analyze");
    }

    expect(result).toMatchObject({
      allowed: false,
      limit: 5,
      remaining: 0,
      reason: null,
    });
  });

  it("prefers trusted platform IP headers and ignores spoofed x-forwarded-for on Vercel", async () => {
    resetRateLimitEnv();
    process.env.VERCEL_ENV = "production";

    const { getClientIp } = await loadRateLimitModule();
    const ip = getClientIp({
      headers: {
        "x-vercel-id": "iad1::abc",
        "x-real-ip": "2.2.2.2",
        "x-forwarded-for": "9.9.9.9",
      },
      socket: {},
    });

    expect(ip).toBe("2.2.2.2");
  });

  it("prefers x-vercel-forwarded-for over other candidates", async () => {
    resetRateLimitEnv();
    process.env.VERCEL_ENV = "production";

    const { getClientIp } = await loadRateLimitModule();
    const ip = getClientIp({
      headers: {
        "x-vercel-forwarded-for": "4.4.4.4, 5.5.5.5",
        "x-real-ip": "2.2.2.2",
        "x-forwarded-for": "9.9.9.9",
      },
      socket: {},
    });

    expect(ip).toBe("4.4.4.4");
  });
});
