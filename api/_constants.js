// Centralized API/runtime constants for easier tuning.

export const ANALYZE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_TIMEOUT_MS = 25_000;
export const ANTHROPIC_MODEL_ID = process.env.ANTHROPIC_MODEL_ID || "claude-haiku-4-5-20251001";

export const API_REDIS_TIMEOUT_MS = 500;

// Redis timeouts are endpoint-specific because threshold checks must fail fast.
export const RATE_LIMIT_REDIS_TIMEOUT_MS = 500;
export const RETRIEVAL_THRESHOLDS_REDIS_TIMEOUT_MS = 500;
export const RETRIEVAL_HEALTH_STORE_REDIS_TIMEOUT_MS = 2000;
