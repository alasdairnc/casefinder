// api/_rateLimit.js — Fixed-window rate limiter for Vercel serverless
//
// Uses atomic Redis counters in production.
// Falls back to in-memory state only in local development or via explicit opt-in.

import { Redis } from "@upstash/redis";
import { RATE_LIMIT_REDIS_TIMEOUT_MS } from "./_constants.js";
import { withRedisTimeout } from "./_redisTimeout.js";

const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const REDIS_TIMEOUT_MS = RATE_LIMIT_REDIS_TIMEOUT_MS;
const RETRIEVAL_HEALTH_MAX_REQUESTS = 100; // Higher limit for internal monitoring
const BACKEND_UNAVAILABLE_RETRY_AFTER_SECONDS = 60;

export let redis = null;

// Support both direct Upstash env vars and Vercel KV integration env vars.
const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

export const redisConfigSource = process.env.UPSTASH_REDIS_REST_URL
  ? "UPSTASH_REDIS_REST_*"
  : process.env.KV_REST_API_URL
    ? "KV_REST_API_*"
    : "none";

// Initialize Redis client only if credentials are provided
if (redisUrl && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
}

// Fallback in-memory store for development
const store = new Map();

function getLimitForEndpoint(endpoint) {
  return endpoint === "retrieval-health"
    ? RETRIEVAL_HEALTH_MAX_REQUESTS
    : MAX_REQUESTS;
}

function shouldAllowInMemoryFallback() {
  if (process.env.ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK === "1") return true;
  return process.env.VERCEL_ENV !== "production";
}

function buildKey(endpoint, ip, bucketId) {
  const prefix = endpoint ? `rl:${endpoint}` : "rl";
  return `${prefix}:${ip ?? "unknown"}:${bucketId}`;
}

function buildWindowResult({ allowed, count, limit, resetAt, reason = null }) {
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    reason,
  };
}

function markBackendUnavailable(limit) {
  const resetAt = new Date(
    Date.now() + BACKEND_UNAVAILABLE_RETRY_AFTER_SECONDS * 1000,
  ).toISOString();
  return {
    allowed: false,
    limit,
    remaining: 0,
    resetAt,
    reason: "backend_unavailable",
    retryAfterSeconds: BACKEND_UNAVAILABLE_RETRY_AFTER_SECONDS,
  };
}

function updateInMemoryCounter(key, bucketId) {
  const current = store.get(key);
  if (!current || current.bucketId !== bucketId) {
    const next = { bucketId, count: 1 };
    store.set(key, next);
    return next.count;
  }

  current.count += 1;
  store.set(key, current);
  return current.count;
}

/**
 * Check whether the given IP is within the rate limit.
 * @param {string|null} ip
 * @param {string} [endpoint] — optional endpoint name for per-route buckets
 * @returns {{ allowed: boolean, remaining: number, resetAt?: string, limit: number, reason?: string }}
 */
export async function checkRateLimit(ip, endpoint) {
  const now = Date.now();
  const maxRequests = getLimitForEndpoint(endpoint);
  const bucketId = Math.floor(now / WINDOW_MS);
  const key = buildKey(endpoint, ip, bucketId);
  const resetAt = new Date((bucketId + 1) * WINDOW_MS).toISOString();

  if (redis) {
    try {
      // Use atomic INCR+EXPIRE for fixed window
      // Set expiry only if key is new (INCR returns 1)
      const currentCount = await withRedisTimeout(
        redis.incr(key),
        REDIS_TIMEOUT_MS,
      );
      if (!Number.isFinite(currentCount) || currentCount <= 0) {
        throw new Error("Invalid Redis counter value");
      }
      if (currentCount === 1) {
        // Set expiry for the window
        await withRedisTimeout(
          redis.expire(key, Math.ceil(WINDOW_MS / 1000) + 5),
          REDIS_TIMEOUT_MS,
        );
      }
      return buildWindowResult({
        allowed: currentCount <= maxRequests,
        count: currentCount,
        limit: maxRequests,
        resetAt,
      });
    } catch (err) {
      console.error("Redis rate limit check failed:", err.message);
      if (!shouldAllowInMemoryFallback()) {
        return markBackendUnavailable(maxRequests);
      }
    }
  }

  // Fallback: in-memory store (development or Redis unavailable)
  const currentCount = updateInMemoryCounter(key, bucketId);

  // Prune old entries to avoid unbounded memory growth
  if (store.size > 500) {
    for (const [storeKey, value] of store) {
      if (!value || value.bucketId !== bucketId) {
        store.delete(storeKey);
      }
    }
    if (store.size > 500) {
      const targetSize = 430;
      const excess = store.size - targetSize;
      if (excess > 0) {
        const oldestKeys = Array.from(store.keys()).slice(0, excess);
        for (const staleKey of oldestKeys) {
          store.delete(staleKey);
        }
      }
    }
  }

  return buildWindowResult({
    allowed: currentCount <= maxRequests,
    count: currentCount,
    limit: maxRequests,
    resetAt,
  });
}

/**
 * Build standard rate limit response headers.
 * @param {{ remaining: number, resetAt?: string }} result
 */
export function rateLimitHeaders(result) {
  const headers = {
    "X-RateLimit-Limit": String(result.limit ?? MAX_REQUESTS),
    "X-RateLimit-Remaining": String(result.remaining ?? 0),
  };
  if (result.resetAt) {
    const resetEpoch = Math.ceil(new Date(result.resetAt).getTime() / 1000);
    headers["X-RateLimit-Reset"] = String(resetEpoch);
    headers["Retry-After"] = String(
      result.reason === "backend_unavailable"
        ? (result.retryAfterSeconds ?? BACKEND_UNAVAILABLE_RETRY_AFTER_SECONDS)
        : Math.max(0, resetEpoch - Math.ceil(Date.now() / 1000)),
    );
  }
  return headers;
}

// Only trust X-Forwarded-For from known proxies (Vercel); otherwise, use req.socket.remoteAddress.
export function getClientIp(req) {
  const trustedVercel =
    req.headers["x-vercel-proxied-for"] || req.headers["x-vercel-id"];
  let ip = null;
  if (trustedVercel && req.headers["x-forwarded-for"]) {
    // Only trust X-Forwarded-For if Vercel proxy headers are present
    ip = req.headers["x-forwarded-for"].split(",")[0]?.trim();
  }
  if (!ip) {
    ip = req.socket?.remoteAddress;
  }
  // Basic validation: must look like an IPv4 or IPv6 address
  if (
    typeof ip === "string" &&
    /^(\d{1,3}\.){3}\d{1,3}$|^[a-fA-F0-9:]+$/.test(ip)
  ) {
    return ip;
  }
  return "unknown";
}
