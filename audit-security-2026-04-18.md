# CaseDive Adversarial Security & Reliability Audit — 2026-04-18

**Scope:** Read-only audit, findings only, no fixes. Three parallel reviewers covered the 13 categories in the brief. Line numbers are cited from static reads; runtime behavior is marked where unverified.

---

## ⚠ CRITICAL — FLAG AT TOP

**`getClientIp` is declared twice in `api/_rateLimit.js`** (lines 194 and 219). In strict ESM this is a `SyntaxError` at module load; a local `node -e "import('./api/_rateLimit.js')"` reproduces the error. If it does load in production (Vercel's bundler may tolerate it and keep the last declaration), the _second_, stricter function wins — and it ignores `x-vercel-forwarded-for` / `x-real-ip`, falling back to an IPv4 regex that accepts invalid octets (e.g. `999.999.999.999`). Either way:

- If the module fails to load: every endpoint that imports it (all except `status.js`) 500s on cold start → site-wide outage.
- If the last declaration wins: rate-limit bucketing on Vercel is broken; the `unknown` fallback bucket is shared across all clients whose IP can't be parsed, enabling mutual DoS + trivial IP spoofing for rate-limit bypass.

**This must be verified against the deployed bundle immediately.**

---

## Executive Summary — Top 5 Risks

1. **[CRITICAL] Duplicate `getClientIp` export** — `api/_rateLimit.js:194` and `:219`. Either breaks module load or silently shadows the intended IP-attribution logic. Rate limiting is the primary abuse control; this undermines it.
2. **[HIGH] Prompt injection surface in `analyze.js`** — CanLII-retrieved case summaries are fed into the user-turn message via a deny-list sanitizer (`filterInstructionLikeText`) and `<external_content>` XML hinting, not a `type: "document"` block. `case-summary.js` does this correctly; `analyze.js` does not. Over-filter also silently corrupts legitimate legal scenarios ("executed a warrant", "mode of detention").
3. **[HIGH] Lost-update race on retrieval-health alltime accumulator** — `api/_retrievalHealthStore.js:483-588` is a GET → mutate → SET pattern on a single key. Concurrent requests lose increments. The dashboard that drives alerting under-counts errors during bursts — exactly when you need it most.
4. **[HIGH] In-memory rate-limit fallback enabled on preview deployments** — `api/_rateLimit.js:47-50` (`VERCEL_ENV !== "production"` → fallback allowed). Each Lambda container gets its own Map → effectively unlimited requests to preview URLs, which still hold real `ANTHROPIC_API_KEY` by default. Cost DoS.
5. **[HIGH] CanLII API key transported in query string** — `src/lib/canlii.js:253-255`. Query-string secrets leak via proxy logs, Sentry URL capture, and any error that quotes the URL. `api/_sentry.js` does not scrub outbound fetch URLs inside captured exception frames.

---

## Findings

### 1. Secrets & Credentials

```
[LOW] Sentry DSN embedded in client bundle (expected but shipped)
File: dist/assets/index-BscfmFrm.js (single line ~50)
Category: Secrets
Evidence: dsn:"https://17a2d4645cfe8b969d718436000eb562@o4511134746017792.ingest.de.sentry.io/4511134754209872"
Impact: DSNs are public-by-design; worst case is error-ingestion abuse.
Verified runtime: no (static read of dist bundle)
```

```
[MEDIUM] CanLII API key appended as URL query string
File: src/lib/canlii.js:253-255
Category: Secrets
Evidence:
  return `${CANLII_BASE}/caseBrowse/en/${dbId}/${caseId}/?api_key=${encodeURIComponent(apiKey)}`;
Impact: Query-string keys leak via (a) proxy access logs, (b) redirect chains, (c) Node fetch error stacks, (d) Sentry events. _sentry.js scrubs `query_string` on inbound requests but not outbound fetch URLs captured inside exception frames.
Verified runtime: no
```

```
[LOW] No .env.example checked in
File: (repo root — absent)
Category: Secrets / onboarding
Impact: Not a vuln; onboarding hazard only.
Verified runtime: n/a
```

Clean: dist bundle inspected for `sk-ant`, Upstash tokens, CanLII keys, AdSense IDs → none found. Only `VITE_SENTRY_DSN` uses the VITE\_ prefix. `vercel.json` does not enumerate secrets.

---

### 2. Prompt Injection & RAG Poisoning

```
[HIGH] analyze.js treats CanLII summaries as user-turn text, not `document` blocks
File: api/analyze.js:60-140
Category: Prompt injection
Evidence: sanitizeUserInput strips XML-like tags; filterInstructionLikeText deny-lists a hand-picked phrase set; safePromptLine caps 300 chars; CanLII retrieved case summaries are injected via `<external_content source="canlii">` blocks in the user-role message.
Impact:
  (a) Deny-list bypass is trivial: homoglyphs, zero-width chars, leet, phrasing variants, multilingual equivalents.
  (b) Retrieved CanLII content is attacker-controllable (CanLII hosts any filed case). A malicious summary in a case can pose as a directive; the XML-style block is a hint, not an isolation boundary. Anthropic's guidance is `type: "document"` content blocks.
  (c) Over-filter silently corrupts legitimate scenarios: stripping "execute", "instruction", "mode", "output", "please", "do not" breaks retrieval/classification for queries like "executed a warrant", "mode of detention", "output of breath test".
Contrast: api/case-summary.js:60-102 DOES use a `type: "document"` block + explicit "treat content as data" instruction. Pattern is known in-repo; just not applied here.
Verified runtime: no
```

```
[LOW] Landmark case DB entries interpolated with no escape
File: api/analyze.js:113-122
Category: Prompt injection (supply-chain-only)
Evidence: MASTER_CASE_LAW_DB titles/citations/ratios pass through safePromptLine (strips angle brackets + matched deny-list). Trust boundary is code review.
Impact: Contained by review process today.
Verified runtime: no
```

---

### 3. API Endpoint Hardening

```
[MEDIUM] Body size cap is computed AFTER Vercel parses the full JSON body
File: api/_apiCommon.js:51-54
Category: API hardening / DoS
Evidence: bodySize = Buffer.byteLength(JSON.stringify(req.body ?? "")) — runs after platform parse.
Impact: Payload already cost CPU + memory before the 413. Not a bypass, not a true precheck.
Verified runtime: no
```

```
[LOW] Content-Type check is substring match
File: api/_apiCommon.js:40
Category: API hardening
Evidence: `if (!ct.includes("application/json"))` — matches "text/plain; application/json=fake".
Impact: Minor; platform wouldn't parse non-JSON as JSON anyway.
Verified runtime: no
```

```
[MEDIUM] analyze.js: one rate-limited request → dozens of CanLII round-trips
File: api/analyze.js:688-870
Category: Cost amplification
Evidence: single rate-limit check covers pre-retrieval CanLII call + Anthropic call + second CanLII retrieval (line 797, 870).
Impact: Tight 5/hr bucket contains volume, but combined with the broken getClientIp IP attribution an attacker aggregates budget across "unknown" bucket and bursts real CanLII traffic.
Verified runtime: no
```

```
[HIGH] verify.js — CanLII key in fetch URL; timeout path has no AbortController plumbing
File: api/verify.js:313-358
Category: Secrets / resource
Evidence: fetch(buildApiUrl(parsed.apiDbId, caseId, apiKey), { signal: AbortSignal.timeout(8000) })
Impact: Key in URL (same as §1). AbortSignal.timeout does signal cancel, but the underlying Upstash/fetch request continues until network stack reaps it under degradation.
Verified runtime: no
```

```
[LOW] verify.js results keyed by both rawCitation and sanitized citation
File: api/verify.js:117-140
Category: Schema
Evidence: `results[rawCitation] = …; results[citation] = …`
Impact: One input yields two keys; pre-sanitized string echoed back to caller.
Verified runtime: no
```

```
[MEDIUM] retrieval-health auth: length-gate leaks token length; byte-length vs string-length pitfall
File: api/retrieval-health.js:39-49
Category: Auth
Evidence: `if (authHeader.length !== expected.length) return false;` uses JS string-length (code units) before timingSafeEqual (requires equal byte-length).
Impact: Multi-byte UTF-8 can produce string-length match with byte-length mismatch → timingSafeEqual throws → uncaught 500 (minor DoS). Separately, length oracle leaks expected token length.
Verified runtime: no
```

```
[LOW] filter-quality.js same length-oracle auth pattern
File: api/filter-quality.js:44-52
Category: Auth
Impact: Same as above.
Verified runtime: no
```

```
[LOW] filter-quality.js Cache-Control overrides applyStandardApiHeaders' no-store
File: api/filter-quality.js:30,62
Category: Cache hygiene
Evidence: applyStandardApiHeaders sets no-store; line 62 overrides with max-age=60.
Impact: Intermediate proxies cache the filter-config snapshot 60s. Not secret-bearing but worth awareness.
Verified runtime: no
```

Positives: `applyStandardApiHeaders` consistently sets X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CSP, Cache-Control no-store. Error paths remap ≥500 → 502 without leaking stacks. CORS allowlist is strict (`api/_cors.js:3-7`). `report-case-law.js` schema validation is allow-list only (good).

---

### 4. Redis / Cache Integrity

```
[HIGH] Sliding-window limiter: INCR + EXPIRE not atomic
File: api/_rateLimit.js:107-130
Category: Concurrency / cache
Evidence:
  const currentCount = await withRedisTimeout(redis.incr(key), …);
  if (currentCount === 1) { await withRedisTimeout(redis.expire(key, …)); }
Impact: If EXPIRE times out or fails after a successful INCR, the key persists with no TTL. Subsequent requests keep incrementing; the IP is banned until manual eviction (self-DoS). Standard fix: `SET … EX N NX` then INCR, or Lua.
Verified runtime: no
```

```
[HIGH] retrieval-health caches response for 7 DAYS keyed by req.url
File: api/retrieval-health.js:87, 165-176
Category: Cache integrity
Evidence: `cache:retrieval-health:v1:${req.url || "default"}` with TTL 7×24×3600.
Impact: A dashboard named "retrieval health" shows stale metrics for a week after any call. Additionally, arbitrary query strings create distinct entries — `?x=1` vs `?x=2` vs `?X=1` all separate keys → unbounded Redis growth from anyone with the bearer token (or just probing the endpoint and populating via successful auths).
Verified runtime: no
```

```
[HIGH] export-pdf cache key derived from whole body JSON.stringify
File: api/export-pdf.js:113, 378-385
Category: Cache key hygiene
Evidence: `cache:export-pdf:${sha256(JSON.stringify(body))}` TTL 7d, base64 PDF.
Impact: Key-order dependence → semantically-equivalent bodies produce different keys → duplicate entries. Hostile client with 200KB body cap can fill Redis rapidly.
Verified runtime: no
```

```
[MEDIUM] case-summary cache key includes scenario → near-zero hit rate, unbounded growth
File: api/case-summary.js:193
Category: Cache hygiene
Evidence: hash of full body (scenario included) → TTL 7d.
Impact: Cache is effectively dead weight; grows until eviction pressure.
Verified runtime: no
```

```
[LOW] withRedisTimeout doesn't cancel the underlying fetch
File: api/_redisTimeout.js:1-18
Category: Resource hygiene
Evidence: Promise.race pattern; no AbortController on the Upstash fetch.
Impact: During Redis degradation, in-flight fetches accumulate until network stack reaps them. No unhandled rejection (race attaches handlers).
Verified runtime: no
```

---

### 5. Input Validation & Injection

```
[MEDIUM] validateUrl.js — FQDN trailing-dot rejected (availability), no exploitable bypass
File: src/lib/validateUrl.js:1-16
Category: URL validation
Evidence: `parsed.hostname === d || parsed.hostname.endsWith("." + d)`; TRUSTED_DOMAINS = ["canlii.org","laws-lois.justice.gc.ca"].
Tested: `canlii.org.attacker.com` blocked; `evil.canlii.org.attacker.com` blocked; `xn--cnlii-1mc.org` (punycode IDN) blocked; `javascript:` and `data:` blocked by protocol check.
Impact: No bypass found. Flagging `endsWith(".canlii.org")` pattern as fragile for future regression.
Verified runtime: no
```

```
[MEDIUM] CANLII_API_BASE_URL env override is effectively dead
File: api/_caseLawRetrieval.js:32-36; src/lib/canlii.js:4
Category: Input validation / SSRF
Evidence: `_caseLawRetrieval.js` reads `process.env.CANLII_API_BASE_URL` but `lookupCase` uses `buildApiUrl` (canlii.js:253) which hardcodes `CANLII_BASE = "https://api.canlii.org/v1"` — not env-driven.
Impact: The "security testing" comment at line 36 is misleading; the env override doesn't reach the actual fetch path. Not directly exploitable.
Verified runtime: yes (by code read)
```

```
[LOW] parseCitation regex is bounded and anchored; no ReDoS
File: src/lib/canlii.js:176-235
Category: Injection
Evidence: lazy `.+?` inside anchored `^…$`; upstream caps at 500 chars (verify.js:130) / 180 chars (report-case-law.js:195).
Impact: Low risk.
Verified runtime: no
```

```
[LOW] XSS: no raw-HTML injection sinks in src/
File: src/components/*
Category: XSS
Evidence: grep for the React raw-HTML prop and `innerHTML` returned zero matches. All model/CanLII strings render as React children (auto-escaped). Links pass `isValidUrl`.
Impact: No XSS path found.
Verified runtime: no (static only)
```

```
[LOW] No prototype pollution sites found
File: api/analyze.js, api/report-case-law.js:63
Category: Injection
Evidence: Handlers validate known keys explicitly; no `Object.assign(target, reqBody)` pattern observed.
Verified runtime: no
```

---

### 6. CanLII Integration Correctness

```
[HIGH] CanLII API key leaks into URL
File: src/lib/canlii.js:253-255
Category: Secrets
(duplicate of §1 MED / §3 HIGH — single root cause)
```

```
[MEDIUM] Dead env override (see §5) misleads security posture
File: api/_caseLawRetrieval.js:36
```

Unverified: webDbId vs apiDbId usage across all URL build sites; graceful-degradation behavior when `CANLII_API_KEY` is unset at runtime (needs live test).

---

### 7. Client-Side

```
[LOW] useBookmarks persists to localStorage but scenario text is NOT stored
File: src/hooks/useBookmarks.js:3-25
Category: PII
Evidence: Stored fields: {id, citation, summary, type, bookmarkedAt, verification}. App.jsx:21 comment confirms "Sensitive user scenario data is no longer stored in localStorage."
Impact: Surface minimal.
Verified runtime: no
```

```
[LOW] CaseSummaryModal has no focus trap / return-focus-on-close
File: src/components/CaseSummaryModal.jsx:96-102, 160-338
Category: a11y
Evidence: Only Escape handler; no inert on background.
Impact: Keyboard users can tab out of modal. a11y, not security.
Verified runtime: no
```

Clean: no source maps in `dist/`, `vite.config.js` doesn't enable `build.sourcemap`.

---

### 8. Concurrency & State

```
[CRITICAL] Duplicate getClientIp export (see top)
File: api/_rateLimit.js:194 and :219
```

```
[MEDIUM] Fixed-window INCR: concurrent requests correctly serialize
File: api/_rateLimit.js:107-130
Category: Concurrency (positive note)
Evidence: INCR is atomic in Redis; each of 5 concurrent requests gets distinct count 1..5. No slip-through beyond limit.
Impact: GOOD — but see the INCR/EXPIRE atomicity issue in §4.
Verified runtime: no
```

```
[HIGH] In-memory rate-limit fallback enabled on preview
File: api/_rateLimit.js:47-50
Category: Concurrency / abuse
Evidence:
  function shouldAllowInMemoryFallback() {
    if (process.env.ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK === "1") return true;
    return process.env.VERCEL_ENV !== "production";
  }
Impact: On preview/dev, Redis failure silently drops to per-container Map → effectively unlimited requests. Preview deployments typically inherit production Anthropic API key → cost DoS.
Verified runtime: no
```

```
[HIGH] Retrieval-health alltime accumulator — lost-update race
File: api/_retrievalHealthStore.js:483-588
Category: Concurrency
Evidence:
  const raw = await Promise.race([redis.get(ALLTIME_KEY), timeout()]);
  // mutate 80+ fields
  await Promise.race([redis.set(ALLTIME_KEY, JSON.stringify(acc)), timeout()]);
Impact: Concurrent writers lose increments. Dashboard under-reports during bursts. Per-event RPUSH (line 761) is atomic, but derived metrics aren't. Fix: Redis hash + HINCRBY, or Lua.
Verified runtime: no
```

```
[MEDIUM] Event count diverges from event list when INCR lands but RPUSH fails
File: api/_retrievalHealthStore.js:718-793
Category: State consistency
Evidence: allSettled on INCR; separate RPUSH/LTRIM/EXPIRE.
Impact: `totalStoredEvents` drifts above actual list length.
Verified runtime: no
```

```
[MEDIUM] In-memory fallback for retrieval events — per-container, lost on cold start
File: api/_retrievalHealthStore.js:22
Category: State
Impact: Dashboard inconsistency across Lambdas; hides failures during Redis slowdowns.
Verified runtime: no
```

---

### 9. Dependency & Build Supply Chain

```
[LOW] npm audit clean
Evidence: 0 critical/high/moderate/low across 312 deps.
Verified runtime: yes
```

```
[MEDIUM] Prod deps use caret ranges; contradicts CLAUDE.md "Pin major version"
File: package.json:33-41
Evidence: @sentry/{node,react} ^10.46.0, @vercel/analytics ^2.0.1, pdfkit ^0.18.0. Only @upstash/redis, react, react-dom pinned exact.
Impact: Lockfile pins today, but `npm install` (vs `npm ci`) refreshes. Verify CI uses `npm ci`.
Verified runtime: no
```

```
[LOW] No postinstall scripts in lockfile
Evidence: grep "postinstall" → 0 matches.
Verified runtime: yes
```

Clean: vite dev-middleware imports don't leak into client bundle; ANTHROPIC_MODEL_ID is a string constant safe to ship.

---

### 10. Data Quality Traps

```
[LOW] Entry counts match CLAUDE.md claims
Evidence:
  CRIMINAL_CODE_SECTIONS.size = 1516  ✓
  CHARTER_SECTIONS.size       = 55    ✓
  CIVIL_LAW_INDEX entries     = 191   ✓
Verified runtime: yes (Node evaluated)
```

```
[LOW] No TODO/FIXME/XXX/placeholder markers in data files
Evidence: grep returned zero matches.
Verified runtime: yes
```

Gap: duplicate Map keys not verified (would need AST parse; a dup silently keeps the second value).

---

### 11. AdSense & Third-Party

```
[LOW] CSP strict — no unsafe-inline, no unsafe-eval
File: vercel.json:41-42
Evidence: script-src 'self' + one sha256 hash; connect-src limited to self + Sentry ingest.
Impact: Good. `img-src https:` broad but typical.
Verified runtime: no
```

```
[LOW] No AdSense / GTM / pagead2 loaded today
File: index.html, src/App.jsx:21
Impact: If AdSense is added later, CSP will need script-src update.
Verified runtime: no
```

---

### 12. Logging & PII

```
[MEDIUM] IP + user-agent logged per request; scenario text NOT logged (good)
File: api/_logging.js:22-37
Evidence: logRequestStart logs clientIp + userAgent (100 char cap). analyze.js:697-710 validation errors include only error codes, not scenario text. analyze.js:951 console.error passes retrievalErrMessage (from caught error; does not include scenario).
Impact: Client IP is PIPEDA-relevant PII; confirm Vercel log retention posture.
Verified runtime: no
```

```
[LOW] Sentry beforeSend scrubs scenario, matchedcontent, tokens — but not "body"/"message"/"content"
File: api/_sentry.js:5-82
Evidence: SENSITIVE_KEY_PARTS = [scenario, scenariosnippet, summary, matchedcontent, suggestions, note, authorization, cookie, token, apikey, xapikey, querystring]. Keys literally named `body`/`message`/`content`/`text` not scrubbed; Sentry HTTP instrumentation may attach request/response bodies under these.
Impact: Defense-in-depth gap.
Verified runtime: no
```

---

### 13. Deployment Config

```
[LOW] /internal/retrieval-health → / rewrite is harmless
File: vercel.json:6
Evidence: Rewrites a client-facing path to SPA root. Real API is /api/retrieval-health, bearer-gated.
Verified runtime: no
```

```
[MEDIUM] analyze.js maxDuration=60s, memory=512MB — cost-DoS amplification
File: vercel.json:11
Evidence: Anthropic call up to 25s × possible retry = ~50s per request; combined with broken getClientIp → broken rate-limit bucketing → concurrent spend.
Impact: Bounded in prod by 5/hr/IP (if the limiter works); serious on preview where in-memory fallback removes the cap.
Verified runtime: no
```

```
[HIGH] casedive.vercel.app in CORS allowlist; preview + CSRF risk
File: api/_cors.js:3-7
Evidence: ALLOWED_ORIGINS = ["https://casedive.ca","https://www.casedive.ca","https://casedive.vercel.app"]
Impact: CORS only restricts *reading* the response; `fetch(..., {mode:'no-cors'})` still makes the request. Rate limit is the only abuse defense, and that is compromised by the getClientIp bug + IPv4 regex accepting invalid octets.
Verified runtime: no
```

---

## Things That Looked Suspicious But Checked Out

- **VITE_SENTRY_DSN in bundle** — DSNs are public by design.
- **Cache-before-auth in retrieval-health** — On re-read, auth (line 76) precedes cache read (line 88). Correct order.
- **CANLII_API_BASE_URL env override** — Doesn't reach the actual fetch path (`buildApiUrl` hardcodes the base). Not exploitable; comment is misleading.
- **timingSafeEqual in retrieval-health** — Length pre-check prevents the throw; constant-time compare runs on equal-length inputs. (Caveat: string-length vs byte-length pitfall noted in §3.)
- **validateUrl protocol handling** — `javascript:`, `data:`, protocol-relative all correctly rejected.
- **Source maps in production** — None in `dist/`; `vite.config.js` doesn't enable them.
- **parseCitation ReDoS** — Bounded input + anchored regex, no catastrophic backtracking pattern.
- **Prototype pollution** — No `Object.assign(target, body)` with attacker keys observed in endpoints surveyed.
- **5 concurrent requests from one IP** — Atomic INCR correctly serializes; no slip-through beyond the documented limit (separate from the INCR/EXPIRE atomicity issue).
- **`/internal/retrieval-health` rewrite** — Serves the SPA shell only; real API is bearer-gated.
- **CSP `img-src https:`** — Broad but typical; no active exfil vector in code.
- **AdSense / GTM** — Not loaded today; CSP doesn't currently need relaxation.

---

## Gaps — Things I Could Not Verify Without Running The App Or Credentials

- **Which `getClientIp` actually wins in the deployed bundle.** Local `node` import throws; Vercel's bundler may behave differently. Must be confirmed against production.
- **Full git-history secret scan** (414 commits). Sandbox constrained `git log -p -S` over `--all`. Run `gitleaks detect --source . --log-opts="--all"` locally.
- **Preview env var posture** — whether `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL` are set in preview, and whether preview uses a separate Upstash DB.
- **Sentry outbound fetch URL scrubbing** — whether `initSentry` config sanitizes URLs in exception breadcrumbs for CanLII fetches. Needs live trigger.
- **Vercel log retention + access posture** — IP logging compliance.
- **Duplicate Map keys in data files** — needs AST parse, not grep.
- **Vercel platform body-limit** behavior before our in-handler 413.
- **Lost-update rate on alltime accumulator** — requires load test.
- **Redis eviction policy on Upstash** — affects orphaned rate-limit keys when EXPIRE fails.
- **`api/_retrievalOrchestrator.js`, `_filterScoring.js`, `_scenarioClassification.js`** — bulk of retrieval pipeline not traced end-to-end.
- **`api/status.js` minimal surface confirmed; `api/report-case-law.js` and `api/export-pdf.js` not opened beyond cache-key / schema-validation sites.**
- **BookmarksPanel.jsx, SearchHistory.jsx** — grep-wide XSS search clean, not individually traced.

---

## Recommended Order Of Remediation

**Phase 0 — Verify the critical immediately (today)**

1. Confirm which `getClientIp` executes in production. If module-load fails: emergency fix (single export). If last-wins: rate-limit bucketing + IPv4 validation are broken now.

**Phase 1 — Secrets & abuse controls (this week)** 2. Move `CanLII api_key` out of query string if CanLII supports header auth; otherwise ensure Sentry scrubs outbound URLs and add a pre-send URL sanitizer for fetch-exception frames. 3. Atomicize INCR+EXPIRE in `_rateLimit.js` (Lua or `SET … EX … NX` + INCR). Same change fixes orphaned-key self-DoS. 4. Gate in-memory rate-limit fallback to dev-only or opt-in; stop `VERCEL_ENV !== "production"` auto-allowing it on preview. 5. Confirm preview deployments don't hold production `ANTHROPIC_API_KEY` / `UPSTASH_*`.

**Phase 2 — Prompt injection & data integrity (next sprint)** 6. `analyze.js` CanLII content → use `type: "document"` content blocks with explicit data-only instructions, matching `case-summary.js` pattern. Drop the over-aggressive `filterInstructionLikeText` deny-list (it corrupts legitimate scenarios). 7. Replace alltime-accumulator GET/SET with Redis hash + HINCRBY (lost-update fix). 8. Cache-key hygiene: drop 7-day TTL on `retrieval-health` (live metrics) and `export-pdf`; normalize querystring keys; hash case-summary cache on case identity only (exclude scenario) or disable the cache.

**Phase 3 — Hardening & hygiene** 9. Pin all prod deps exactly (match CLAUDE.md rule). Ensure CI uses `npm ci`. 10. Fix retrieval-health auth byte-length check (use `Buffer.byteLength`). 11. Extend Sentry `SENSITIVE_KEY_PARTS` with "body", "message", "content", "text", "rawresponse". 12. Add focus trap + return-focus to `CaseSummaryModal`. 13. Move body-size check to a streaming reader if the platform allows; current check runs post-parse.

---

_Report generated 2026-04-18. Reviewers: 3 parallel read-only agents, findings consolidated. No fixes applied._
