# CaseDive Security

## API Keys

- All API keys are server-side only — never exposed to the client
- Model calls route through `/api/` functions exclusively

## CORS

- Restricted to: `casedive.ca`, `www.casedive.ca`, `casedive.vercel.app`
- Centralized in `api/_cors.js` → called via `applyStandardApiHeaders()` from `_apiCommon.js`
- Never set CORS headers directly in endpoints — add origins to `_cors.js` only

## Rate Limiting

- Sliding-window based via `api/_rateLimit.js`
- Redis-backed when `UPSTASH_REDIS_REST_URL` configured
- Falls back to in-memory limiter in dev

## Input Validation

- Content-type checks on all endpoints
- Payload size caps enforced
- Schema validation on request bodies

## Security Headers

- Set on all API routes via `applyStandardApiHeaders()`
- Every new endpoint must include: rate limiting, input validation, security headers

## Data Privacy

- No user account data persisted server-side
- Search history and bookmarks are localStorage-based (client only)
- No PII collection or tracking beyond Google AdSense
