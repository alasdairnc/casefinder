// api/_rateLimit.js — Sliding-window rate limiter for Vercel serverless
//
// Uses Upstash Redis for persistence across serverless instances.
// Falls back to in-memory state if UPSTASH_REDIS_REST_URL is not configured.

import { Redis } from "@upstash/redis";

const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

let redis = null;

// Initialize Redis client only if credentials are provided
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
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

  try {
    // Try Redis if available
    if (redis) {
      const hitsJson = await redis.get(key);
      let hits = hitsJson ? JSON.parse(hitsJson) : [];
      hits = hits.filter((t) => now - t < WINDOW_MS);

      if (hits.length >= MAX_REQUESTS) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(hits[0] + WINDOW_MS).toISOString(),
        };
      }

      hits.push(now);
      await redis.setex(key, Math.ceil(WINDOW_MS / 1000), JSON.stringify(hits));

      return { allowed: true, remaining: MAX_REQUESTS - hits.length };
    }
  } catch (err) {
    console.error("Redis rate limit check failed, falling back to in-memory:", err.message);
  }

  // Fallback: in-memory store (development or Redis unavailable)
  const hits = (store.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (hits.length >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(hits[0] + WINDOW_MS).toISOString(),
    };
  }

  hits.push(now);
  store.set(key, hits);

  // Prune old entries to avoid unbounded memory growth
  if (store.size > 10_000) {
    for (const [k, v] of store) {
      if (v.every((t) => now - t >= WINDOW_MS)) store.delete(k);
    }
  }

  return { allowed: true, remaining: MAX_REQUESTS - hits.length };
}

/**
 * Extract the real client IP from Vercel's request headers.
 */
export function getClientIp(req) {
  return (
    req.headers["x-real-ip"] ??
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    null
  );
}
