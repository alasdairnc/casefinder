// api/_logging.js — Structured logging utility for all endpoints
// Provides consistent JSON-formatted logging for debugging, monitoring, and audit trails

/**
 * Generate structured log entry as JSON string
 * @param {Object} data - Log data object with any fields
 * @returns {string} JSON stringified log entry with timestamp
 */
export function createLog(data) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Log request start
 * @param {Object} req - Vercel request object
 * @param {string} endpoint - API endpoint name (e.g., "analyze", "verify")
 * @param {string} requestId - Unique request ID
 */
export function logRequestStart(req, endpoint, requestId) {
  console.log(
    createLog({
      requestId,
      event: "request_start",
      endpoint,
      method: req.method,
      url: req.url,
      clientIp: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] ? req.headers["user-agent"].substring(0, 100) : "unknown",
    })
  );
}

/**
 * Log rate limit check result
 * @param {string} requestId - Unique request ID
 * @param {string} endpoint - API endpoint name
 * @param {Object} rlResult - Rate limit result from checkRateLimit()
 * @param {string} clientIp - Client IP address
 */
export function logRateLimitCheck(requestId, endpoint, rlResult, clientIp) {
  console.log(
    createLog({
      requestId,
      event: rlResult.allowed ? "rate_limit_ok" : "rate_limit_exceeded",
      endpoint,
      clientIp,
      rateLimitRemaining: rlResult.remaining,
      rateLimitResetAt: rlResult.resetAt,
    })
  );
}

/**
 * Log validation error
 * @param {string} requestId - Unique request ID
 * @param {string} endpoint - API endpoint name
 * @param {string} message - Error message
 * @param {string} field - (optional) Field that failed validation
 */
export function logValidationError(requestId, endpoint, message, field = null) {
  console.log(
    createLog({
      requestId,
      event: "validation_error",
      endpoint,
      message,
      field,
    })
  );
}

/**
 * Log cache hit
 * @param {string} requestId - Unique request ID
 * @param {string} endpoint - API endpoint name
 * @param {string} cacheKey - The cache key used
 */
export function logCacheHit(requestId, endpoint, cacheKey) {
  console.log(
    createLog({
      requestId,
      event: "cache_hit",
      endpoint,
      cacheKeyHash: cacheKey.substring(0, 16), // log first 16 chars only
    })
  );
}

/**
 * Log cache miss
 * @param {string} requestId - Unique request ID
 * @param {string} endpoint - API endpoint name
 */
export function logCacheMiss(requestId, endpoint) {
  console.log(
    createLog({
      requestId,
      event: "cache_miss",
      endpoint,
    })
  );
}

/**
 * Log external API call (Anthropic, CanLII, etc)
 * @param {string} requestId - Unique request ID
 * @param {string} endpoint - API endpoint name
 * @param {string} apiName - External API name (e.g., "anthropic", "canlii")
 * @param {number} statusCode - HTTP status code from external API
 * @param {number} durationMs - Request duration in milliseconds
 * @param {Object} opts - Optional additional data
 */
export function logExternalApiCall(requestId, endpoint, apiName, statusCode, durationMs, opts = {}) {
  console.log(
    createLog({
      requestId,
      event: "external_api_call",
      endpoint,
      apiName,
      statusCode,
      durationMs,
      ...opts,
    })
  );
}

/**
 * Log successful response
 * @param {string} requestId - Unique request ID
 * @param {string} endpoint - API endpoint name
 * @param {number} statusCode - HTTP status code
 * @param {number} durationMs - Request duration in milliseconds
 * @param {Object} rlResult - Rate limit result (has remaining count)
 * @param {Object} opts - Optional additional data (e.g., itemCount, cacheUsed)
 */
export function logSuccess(requestId, endpoint, statusCode, durationMs, rlResult, opts = {}) {
  console.log(
    createLog({
      requestId,
      event: "request_success",
      endpoint,
      statusCode,
      durationMs,
      rateLimitRemaining: rlResult.remaining,
      ...opts,
    })
  );
}

/**
 * Log error
 * @param {string} requestId - Unique request ID
 * @param {string} endpoint - API endpoint name
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code to return
 * @param {number} durationMs - Request duration in milliseconds
 * @param {Object} opts - Optional additional data (e.g., errorType, isRetry)
 */
export function logError(requestId, endpoint, error, statusCode, durationMs, opts = {}) {
  console.log(
    createLog({
      requestId,
      event: "request_error",
      endpoint,
      statusCode,
      durationMs,
      errorMessage: error.message || "Unknown error",
      errorType: error.constructor.name,
      errorStatus: error.status || null,
      ...opts,
    })
  );
}

/**
 * Helper to extract client IP from request
 * @param {Object} req - Vercel request object
 * @returns {string} Client IP address
 */
export function getClientIpForLogging(req) {
  return req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
}
