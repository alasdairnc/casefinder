# CaseDive Audit Log
Append-only. Each run adds a dated section. Never overwrite previous entries.

## Audit — 2026-03-25
### Fixed since last run
- None (first run)
### New findings
- 13/14 React components have zero test coverage | High | src/components/*.jsx
- 7/9 lib files have zero unit test coverage | High | src/lib/*.js
- No explicit timeouts on Redis operations | Medium | api/_rateLimit.js:38,51 + api/_retrievalThresholds.js:187,189
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
- No explicit timeouts on Redis operations in api/_rateLimit.js + api/_retrievalThresholds.js — Promise.race(500ms) added to all 4 call sites
- CLAUDE.md roadmap accuracy — all 4 flagged components (CriminalCodeExplorer, SearchHistory, BookmarksPanel, CaseSummaryModal) confirmed present in code
### New findings
- Redis operations in _retrievalHealthStore.js have no timeout protection | Medium | api/_retrievalHealthStore.js:85,181-183
- RetrievalHealthDashboard.jsx exists but not documented in CLAUDE.md project structure | Medium | CLAUDE.md:55-68
- ThemeContext.jsx has no unit test (narrowed from prior "7/9 lib files" finding) | Medium | src/lib/ThemeContext.jsx
### Still open
- 13/14 React components have zero E2E test coverage | High | src/components/*.jsx
- No Playwright mobile device profiles configured | Medium | playwright.config.js:14-16
- 4/6 API endpoints have no response caching (verify, case-summary, retrieve-caselaw, export-pdf) | Low | api/verify.js, api/case-summary.js, api/retrieve-caselaw.js, api/export-pdf.js
- 7 stale audit/migration/deploy .md files in project root | Low | DEPLOYMENT_VALIDATION_REPORT.md, POST_DEPLOYMENT_VERIFICATION_REPORT.md, SECURITY_AUDIT_REPORT.md, SECURITY_AUDIT_REPORT_III.md, SECURITY_REVIEW_FOLLOW_UP.md, MIGRATION_GUIDE.md, phase-b-complete-prompt.md
- Missing packageManager field in package.json | Low | package.json
