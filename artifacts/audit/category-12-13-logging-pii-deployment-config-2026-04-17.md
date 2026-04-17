# Category 12: Logging & PII

## Findings (2026-04-17)

### [High] `_retrievalHealthStore` persists scenario snippets indefinitely in Redis
File: api/_retrievalHealthStore.js:34-103, api/analyze.js (cacheHit/miss paths calling recordRetrievalMetricsEvent)

### [High] Sentry receives full exception objects with no `beforeSend` scrubbing hook (historical)
File: api/_sentry.js:5-13 (previous, now mitigated)

### [Medium] `logRequestStart` logs `req.url` including any query parameters
File: api/_logging.js:22-37

### [Low] Vercel Analytics (`@vercel/analytics`) may capture page-view metadata
File: src/main.jsx:3, 17-21

### [Low] User-submitted report `note` (up to 300 chars) stored in backend
File: api/report-case-law.js:180-240, api/_caseLawReportStore.js:61-120

### [Info] No scenario text in stdout logger functions
File: api/_logging.js:1-240

### [Info] All log functions log operational metadata only (IDs, counts, durations, error messages) — not user content
File: api/_logging.js:1-240

### [Info] All API endpoints use structured logging; no direct `console.log` of user content
File: api/_logging.js:1-240

### [Info] All scenario text in PDF export is sanitized and capped before use
File: api/export-pdf.js:1-420

### [Info] All scenario text in case summary is sanitized and capped before use
File: api/case-summary.js:1-360

### [Info] All scenario text in retrieval is sanitized and capped before use
File: api/retrieve-caselaw.js:1-240

### [Info] All scenario text in verification is sanitized and capped before use
File: api/verify.js:1-420

### [Info] All scenario text in filter-quality and retrieval-health endpoints is not logged or stored
File: api/filter-quality.js:1-180, api/retrieval-health.js:1-180

---

# Category 13: Deployment Config

## Findings (2026-04-17)

### [High] `vercel.json` does not cover all `api/*.js` endpoints
File: vercel.json:8-18
Evidence: Only 7 endpoints listed; missing: report-case-law.js, status.js

### [Medium] No explicit environment variable validation for required secrets
File: api/_constants.js:1-60, .env.example:1-10

### [Info] All API endpoints use `applyStandardApiHeaders` for security headers
File: api/_apiCommon.js:1-60

### [Info] All API endpoints use shared CORS config
File: api/_cors.js:1-60, api/_apiCommon.js:1-60

### [Info] All API endpoints use named rate limit buckets
File: api/_rateLimit.js:1-240

### [Info] No secrets or credentials found in repo (only .env.example tracked)
File: .env.example:1-10

### [Info] No direct process.env reads in frontend code
File: src/

### [Info] No hardcoded API keys or model IDs in codebase
File: api/_constants.js:1-60

### [Info] All API endpoints use server-side only model/API calls
File: api/analyze.js:1-1040, api/retrieve-caselaw.js:1-240, api/case-summary.js:1-360, api/verify.js:1-420, api/export-pdf.js:1-420, api/report-case-law.js:1-300

---

(See previous audit logs for additional context and historical findings.)
