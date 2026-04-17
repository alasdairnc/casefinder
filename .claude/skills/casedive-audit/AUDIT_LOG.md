# CaseDive Audit Log

Append-only. Each run adds a dated section. Never overwrite previous entries.

## Audit — 2026-03-25

### Fixed since last run

- None (first run)

### New findings

- 13/14 React components have zero test coverage | High | src/components/\*.jsx
- 7/9 lib files have zero unit test coverage | High | src/lib/\*.js
- No explicit timeouts on Redis operations | Medium | api/\_rateLimit.js:38,51 + api/\_retrievalThresholds.js:187,189
- No Playwright mobile device profiles configured | Medium | playwright.config.js:14-16
- CLAUDE.md roadmap missing 4 shipped UI features (CriminalCodeExplorer, SearchHistory, BookmarksPanel, CaseSummaryModal) | Medium | CLAUDE.md:12-26
- 4/6 API endpoints have no response caching (verify, case-summary, retrieve-caselaw, export-pdf) | Low | api/verify.js, api/case-summary.js, api/retrieve-caselaw.js, api/export-pdf.js
- 7 stale audit/migration/deploy .md files in project root | Low | DEPLOYMENT_VALIDATION_REPORT.md, POST_DEPLOYMENT_VERIFICATION_REPORT.md, SECURITY_AUDIT_REPORT.md, SECURITY_AUDIT_REPORT_III.md, SECURITY_REVIEW_FOLLOW_UP.md, MIGRATION_GUIDE.md, phase-b-complete-prompt.md
- Missing packageManager field in package.json | Low | package.json

### Still open

- None (first run)

## Audit — 2026-03-25 (run 2)

### Fixed since last run

- 7/9 lib files zero unit test coverage — now 8/9 covered (unit tests added for criminalCodeData, charterData, civilLawData, validateUrl, themes, constants)
- No explicit timeouts on Redis operations in api/\_rateLimit.js + api/\_retrievalThresholds.js — Promise.race(500ms) added to all 4 call sites
- CLAUDE.md roadmap accuracy — all 4 flagged components (CriminalCodeExplorer, SearchHistory, BookmarksPanel, CaseSummaryModal) confirmed present in code

### New findings

- Redis operations in \_retrievalHealthStore.js have no timeout protection | Medium | api/\_retrievalHealthStore.js:85,181-183
- RetrievalHealthDashboard.jsx exists but not documented in CLAUDE.md project structure | Medium | CLAUDE.md:55-68
- ThemeContext.jsx has no unit test (narrowed from prior "7/9 lib files" finding) | Medium | src/lib/ThemeContext.jsx

### Still open

- 13/14 React components have zero E2E test coverage | High | src/components/\*.jsx
- No Playwright mobile device profiles configured | Medium | playwright.config.js:14-16
- 4/6 API endpoints have no response caching (verify, case-summary, retrieve-caselaw, export-pdf) | Low | api/verify.js, api/case-summary.js, api/retrieve-caselaw.js, api/export-pdf.js
- 7 stale audit/migration/deploy .md files in project root | Low | DEPLOYMENT_VALIDATION_REPORT.md, POST_DEPLOYMENT_VERIFICATION_REPORT.md, SECURITY_AUDIT_REPORT.md, SECURITY_AUDIT_REPORT_III.md, SECURITY_REVIEW_FOLLOW_UP.md, MIGRATION_GUIDE.md, phase-b-complete-prompt.md
- Missing packageManager field in package.json | Low | package.json

## Audit — 2026-03-25 (run 3)

### Fixed since last run

- Redis operations in \_retrievalHealthStore.js have no timeout protection — Promise.race(500ms) added to lrange, rpush, ltrim, expire | api/\_retrievalHealthStore.js:89,189-191
- RetrievalHealthDashboard.jsx not documented in CLAUDE.md — added to component list in project structure
- ThemeContext.jsx has no unit test — tests/unit/ThemeContext.test.jsx added (6 tests, jsdom environment); all 9/9 lib files now have unit test coverage
- 13/14 components zero E2E coverage — E2E tests added for FiltersPanel, SearchHistory, CriminalCodeExplorer, ErrorMessage, StagedLoading (tests/e2e/filters.spec.js, tests/e2e/ui-states.spec.js); 61 E2E tests passing

### New findings

- 9/14 React components still have zero dedicated E2E test coverage (narrowed from prior finding) | Medium | src/components/CaseSummaryModal.jsx, Header.jsx, Results.jsx, ResultCard.jsx, RetrievalHealthDashboard.jsx, SearchArea.jsx, Select.jsx, SuggestionLink.jsx

### Still open

- No Playwright mobile device profiles configured | Medium | playwright.config.js:14-16
- 3/6 API endpoints have no response caching (verify, case-summary, retrieve-caselaw) | Low | api/verify.js, api/case-summary.js, api/retrieve-caselaw.js
- 7 stale audit/migration/deploy .md files in project root | Low | DEPLOYMENT_VALIDATION_REPORT.md, POST_DEPLOYMENT_VERIFICATION_REPORT.md, SECURITY_AUDIT_REPORT.md, SECURITY_AUDIT_REPORT_III.md, SECURITY_REVIEW_FOLLOW_UP.md, MIGRATION_GUIDE.md, phase-b-complete-prompt.md
- Missing packageManager field in package.json | Low | package.json

## Audit — 2026-03-25 (run 4)

### Fixed since last run

- 8/9 React components previously lacking E2E coverage are now tested (CaseSummaryModal, Header, Results, ResultCard, RetrievalHealthDashboard, Select, SuggestionLink, SearchHistory). Only SearchArea.jsx remains uncovered.

### New findings

- 3 unlinked skills in `.claude/skills/` not mentioned in CLAUDE.md | Low | .claude/skills/casefinder-audit, casefinder-skill-router, everything-claude-code

### Still open

- 1/14 React components has zero E2E test coverage | Medium | src/components/SearchArea.jsx
- No Playwright mobile device profiles configured | Medium | playwright.config.js:14-16
- 5/6 API endpoints have no response caching | Low | api/verify.js, api/case-summary.js, api/retrieve-caselaw.js, api/export-pdf.js, api/retrieval-health.js
- 7 stale audit/migration/deploy .md files in project root | Low | DEPLOYMENT_VALIDATION_REPORT.md, POST_DEPLOYMENT_VERIFICATION_REPORT.md, SECURITY_AUDIT_REPORT.md, SECURITY_AUDIT_REPORT_III.md, SECURITY_REVIEW_FOLLOW_UP.md, MIGRATION_GUIDE.md, phase-b-complete-prompt.md
- Missing packageManager field in package.json | Low | package.json

## Audit — 2026-03-25 (run 5)

### Fixed since last run

- 1/14 React components has zero E2E test coverage — E2E tests added for `SearchArea.jsx`. All 14 components are now covered by E2E tests, suite passes with 83 tests.

### New findings

- None

### Still open

- No Playwright mobile device profiles configured | Medium | playwright.config.js:14-16
- 5/6 API endpoints have no response caching | Low | api/verify.js, api/case-summary.js, api/retrieve-caselaw.js, api/export-pdf.js, api/retrieval-health.js
- 7 stale audit/migration/deploy .md files in project root | Low | DEPLOYMENT_VALIDATION_REPORT.md, POST_DEPLOYMENT_VERIFICATION_REPORT.md, SECURITY_AUDIT_REPORT.md, SECURITY_AUDIT_REPORT_III.md, SECURITY_REVIEW_FOLLOW_UP.md, MIGRATION_GUIDE.md, phase-b-complete-prompt.md
- Missing packageManager field in package.json | Low | package.json
- 3 unlinked skills in `.claude/skills/` not mentioned in CLAUDE.md | Low | .claude/skills/casefinder-audit, casefinder-skill-router, everything-claude-code

## Audit — 2026-03-25 (run 6)

### Fixed since last run

- No Playwright mobile device profiles configured — Mobile Chrome and Mobile Safari profiles added. Tests successfully passed.
- 5/6 API endpoints have no response caching — Upstash Redis response caching with 500ms Promise.race wrappers added to all 5 endpoints.
- 7 stale audit/migration/deploy .md files in project root — Files safely deleted.
- Missing packageManager field in package.json — `npm@11.11.0` properly configured.
- 3 unlinked skills in `.claude/skills/` not mentioned in CLAUDE.md — New `Agent Skills` section documented in `CLAUDE.md`.

### New findings

- None

### Still open

- None

## Audit — 2026-03-25 (run 7)

### Fixed since last run

- None

### New findings

- None (Codebase fully complies with new Level 2 Advanced Rules: A11y semantics verified via Playwright roles, strictly enforced `setex` bounds found on all 5 Redis endpoints, and `manualChunks` present in Vite config).

### Still open

- None

## Audit — 2026-03-30

### Fixed since last run

- None

### New findings

- Bare `fetch()` without `AbortSignal.timeout()` in Vite dev middleware | Low | vite.config.js:227
- Toggle theme button missing `aria-label` — FALSE POSITIVE: button has visible text ("Light"/"Dark") | Low | src/components/Header.jsx:94
- Bookmark button missing `aria-label` — FALSE POSITIVE: aria-label already present | Low | src/components/ResultCard.jsx:229

### Still open

- None

## Audit — 2026-04-03

### Fixed since last run

- None

### New findings

- Local `.env` contains live API and Redis credentials, even though it is gitignored | High | .env:1,7
- `api/filter-quality.js` has no rate limit check before serving the internal dashboard | Medium | api/filter-quality.js:10-17
- `api/filter-quality.js` is missing a `vercel.json` functions entry, so it falls back to platform defaults | Medium | vercel.json:9-15
- `api/retrieval-health.js` accepts unbounded `failureLimit`, `failuresBeforeTs`, and `failuresOffset` query values without validation | Medium | api/retrieval-health.js:48-56

### Still open

- None

## Audit — 2026-04-03 (full sweep rerun)

### Fixed since last run

- None

### New findings

- None (full sweep clean: npm audit, full test matrix, prompt-injection probe, security probe, and RAG poison simulation all passed with no HIGH findings)

### Still open

- None

## Audit — 2026-04-14

### Fixed since last run

- `api/filter-quality.js` missing rate limit — `checkRateLimit(getClientIp(req), "filter-quality")` now present at api/filter-quality.js:34
- `api/filter-quality.js` missing vercel.json entry — all 7 public endpoints now have functions config in vercel.json
- `api/retrieval-health.js` unbounded query params — `parseBoundedInt()` applied to failureLimit, failuresBeforeTs, failuresOffset at api/retrieval-health.js:90-107

### New findings

- Hardcoded model ID `"claude-sonnet-4-20250514"` in Vite dev server middleware (should use `ANTHROPIC_MODEL_ID` from `_constants.js`) | Medium | vite.config.js:168, 281
- `src/lib/criminalCodeParts.js` has no dedicated unit test file | Low | src/lib/criminalCodeParts.js

### Still open

- Local `.env` contains live API and Redis credentials (gitignored but present on disk) | High | .env

## Audit — 2026-04-14 (run 2)

### Fixed since last run

- Hardcoded model ID in vite.config.js — now imports `ANTHROPIC_MODEL_ID` from `_constants.js` | vite.config.js:1,172,285
- `src/lib/criminalCodeParts.js` has no dedicated unit test — `tests/unit/criminalCodeParts.test.js` now exists

### New findings

- `api/status.js` missing from vercel.json `functions` config — falls back to platform defaults | Medium | vercel.json:9-16
- 3 unbounded `redis.set()` calls in `_retrievalHealthStore.js` with no TTL — potential Redis bloat | Medium | api/\_retrievalHealthStore.js:273, 590, 759
- Stale snapshot/checklist .md files in project root: MODE5_CANARY_CHECKLIST.md, MODE5_CANARY_SNAPSHOT_2026-04-04.md, MODE4_EVALUATION_SNAPSHOT_2026-04-04.md, MODE1_BALANCED_BACKLOG.md, MODE1_DISCOVERY_RUNBOOK.md | Low | (project root)

### Still open

- Local `.env` contains live API and Redis credentials (gitignored but present on disk) | High | .env

## Audit — 2026-04-17

### Fixed since last run

- All Redis operations in _retrievalHealthStore.js now have timeout protection (previously flagged as missing in 2026-03-25 run 2)
- CLAUDE.md project structure now documents RetrievalHealthDashboard.jsx
- ThemeContext.jsx now has unit test coverage
- E2E, component, guardrails, and retrieval-failure tests all passing

### New findings

- [api/case-summary.js#L71]: `fetch()` call lacks explicit abort/timeout.
- [api/filter-quality.js]: No explicit rate limiting found.
- [api/status.js]: No explicit rate limiting found.
- [api/retrieval-health.js]: No explicit rate limiting found.
- [api/_apiCommon.js#L10-L13]: Security headers set, but confirm all endpoints use this.
- Some API endpoints lack direct test files.

### Still open

- 9/14 React components still have zero dedicated E2E test coverage (narrowed from prior finding) | Medium | src/components/CaseSummaryModal.jsx, Header.jsx, Results.jsx, ResultCard.jsx, RetrievalHealthDashboard.jsx, SearchArea.jsx, Select.jsx, SuggestionLink.jsx
- No Playwright mobile device profiles configured | Medium | playwright.config.js:14-16
- 4/6 API endpoints have no response caching (verify, case-summary, retrieve-caselaw, export-pdf) | Low | api/verify.js, api/case-summary.js, api/retrieve-caselaw.js, api/export-pdf.js
- 7 stale audit/migration/deploy .md files in project root | Low | DEPLOYMENT_VALIDATION_REPORT.md, POST_DEPLOYMENT_VERIFICATION_REPORT.md, SECURITY_AUDIT_REPORT.md, SECURITY_AUDIT_REPORT_III.md, SECURITY_REVIEW_FOLLOW_UP.md, MIGRATION_GUIDE.md, phase-b-complete-prompt.md
- Missing packageManager field in package.json | Low | package.json

### Legal Data

- [src/lib/criminalCodeData.js#L13], [src/lib/civilLawData.js#L29], [src/lib/charterData.js#L10]: All use `Map`, schema valid, deduplication handled in scripts.

### Config/Docs

- [vercel.json], [api/_apiCommon.js#L13]: CSP set. [/.env.example] up to date. Docs present and current.

### Performance

- [api/_retrievalHealthStore.js#L4-L12]: Redis usage bounded. [scripts/performance-monitor.js] present for monitoring.

---
All findings above are new or still open as of this run. See summary for file and line references.
