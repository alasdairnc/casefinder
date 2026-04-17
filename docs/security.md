# CaseDive Security

## API Keys

- All API keys are server-side only — never exposed to the client
- Model calls route through `/api/` functions exclusively

## CORS

- Restricted to: `casedive.ca`, `www.casedive.ca`, `casedive.vercel.app`
- Centralized in `api/_cors.js` → called via `applyStandardApiHeaders()` from `_apiCommon.js`
- Never set CORS headers directly in endpoints — add origins to `_cors.js` only

## Rate Limiting

- Fixed-window atomic counters via `api/_rateLimit.js`
- Redis-backed in production when `UPSTASH_REDIS_REST_URL` or `KV_REST_API_URL` is configured
- Falls back to in-memory limiter only in dev or with explicit `ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK=1`
- Production returns `503` when the rate-limit backend is unavailable

## Input Validation

- Content-type checks on all endpoints
- Payload size caps enforced
- Schema validation on request bodies

## Security Headers

- Set on all API routes via `applyStandardApiHeaders()`
- Every new endpoint must include: rate limiting, input validation, security headers

## Data Privacy

- No user account data persisted server-side
- Search history is session-only in memory; bookmarks remain localStorage-based on the client
- Retrieval health telemetry stores classified issue data, not raw scenario text
- Sentry request data is scrubbed before events leave the server
