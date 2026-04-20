# Category 01: Secrets & Credentials

## Findings (2026-04-17)

### [Medium] `VITE_SENTRY_DSN` exposed in client bundle

File: src/main.jsx:9

### [Low] AdSense publisher ID public in HTML/JS

File: index.html:63, src/App.jsx:180-181

### [Low] No runtime guard on `CANLII_API_BASE_URL` override

File: api/\_caseLawRetrieval.js:32-36

### [Info] No secrets found in tracked files

- Only `.env.example` tracked (expected)
- No secrets in JS/JSX/JSON, public, or dist/
- API endpoints read secrets via `process.env.VAR_NAME` only; no env value is echoed in responses/logs

---

# Category 02: Prompt Injection & RAG Poisoning

## Findings (2026-04-17)

### [High] CanLII-derived case title/summary concatenated into system prompt without delimiters

File: api/analyze.js:570-583

### [High] Landmark-case ratio/title concatenated into system prompt without delimiters

File: api/analyze.js:552-567

---

# Category 03: API Endpoint Hardening

## Findings (2026-04-17)

### [High] X-Forwarded-For is fully trusted (rate-limit bypass)

File: api/\_rateLimit.js:150-158

### [Medium] CORS allowlist is advisory, not enforced

File: api/\_cors.js:16-24

---

# Category 04: Redis / Cache Integrity

## Findings (2026-04-17)

### [High] Sliding-window rate limiter is not atomic (race allows bypass)

File: api/\_rateLimit.js:45-83

### [High] Retrieval-health events list grows unbounded on write race

File: api/\_retrievalHealthStore.js:743-761

---

(See previous audit logs for additional context and historical findings.)
