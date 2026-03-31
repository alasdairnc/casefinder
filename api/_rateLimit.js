// api/_rateLimit.js — Sliding-window rate limiter for Vercel serverless
//
// Uses Upstash Redis for persistence across serverless instances.
// Falls back to in-memory state if UPSTASH_REDIS_REST_URL is not configured.

import { Redis } from "@upstash/redis";

const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const REDIS_TIMEOUT_MS = 500;
const RETRIEVAL_HEALTH_MAX_REQUESTS = 100; // Higher limit for internal monitoring

export let redis = null;

// Support both direct Upstash env vars and Vercel KV integration env vars.
const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  "";
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  "";

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

/**
 * Check whether the given IP is within the rate limit.
 * @param {string|null} ip
 * @param {string} [endpoint] — optional endpoint name for per-route buckets
 * @returns {{ allowed: boolean, remaining: number, resetAt?: string }}
 */
export async function checkRateLimit(ip, endpoint) {
  const now = Date.now();
  const prefix = endpoint ? `rl:${endpoint}` : "rl";
  const key = `${prefix}:${ip ?? "unknown"}`;
  const maxRequests = endpoint === "retrieval-health" ? RETRIEVAL_HEALTH_MAX_REQUESTS : MAX_REQUESTS;

  try {
    // Try Redis if available
    if (redis) {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
      );
      const hitsJson = await Promise.race([redis.get(key), timeout]);
      let hits = hitsJson ? JSON.parse(hitsJson) : [];
      hits = hits.filter((t) => now - t < WINDOW_MS);

      if (hits.length >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(hits[0] + WINDOW_MS).toISOString(),
        };
      }

      hits.push(now);
      await Promise.race([
        redis.setex(key, Math.ceil(WINDOW_MS / 1000), JSON.stringify(hits)),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)),
      ]);

      return { allowed: true, remaining: maxRequests - hits.length };
    }
  } catch (err) {
    console.error("Redis rate limit check failed, falling back to in-memory:", err.message);
  }

  // Fallback: in-memory store (development or Redis unavailable)
  const hits = (store.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (hits.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(hits[0] + WINDOW_MS).toISOString(),
    };
  }

  hits.push(now);
  store.set(key, hits);

  // Prune old entries to avoid unbounded memory growth
  if (store.size > 500) {
    // Remove expired entries first
    for (const [k, v] of store) {
      if (v.every((t) => now - t >= WINDOW_MS)) store.delete(k);
    }
    // If still over limit, evict oldest entries (LRU)
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

  return { allowed: true, remaining: maxRequests - hits.length };
}

/**
 * Build standard rate limit response headers.
 * @param {{ remaining: number, resetAt?: string }} result
 */
export function rateLimitHeaders(result) {
  const headers = {
    "X-RateLimit-Limit": String(MAX_REQUESTS),
    "X-RateLimit-Remaining": String(result.remaining ?? 0),
  };
  if (result.resetAt) {
    const resetEpoch = Math.ceil(new Date(result.resetAt).getTime() / 1000);
    headers["X-RateLimit-Reset"] = String(resetEpoch);
    headers["Retry-After"] = String(Math.max(0, resetEpoch - Math.ceil(Date.now() / 1000)));
  }
  return headers;
}

/**
 * Extract the real client IP from Vercel's request headers.
 */
export function getClientIp(req) {
  // Vercel sets x-forwarded-for reliably; x-real-ip is not standard on Vercel
  const forwarded = req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const remote = req.socket?.remoteAddress;
  if (remote) return remote;
  // No identifiable IP — return a fixed key so all anonymous requests share one strict bucket
  return "unknown";
}
