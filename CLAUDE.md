# CaseDive - Claude Context File

Last updated: March 30, 2026 (verify+retrieval-health tests + docs sync)

## About
Built by Alasdair NC, Justice Studies student at University of Guelph-Humber. Toronto-based.
Live at [casedive.ca](https://casedive.ca) - Repo: `alasdairnc/casefinder`

## What This Is
AI-powered Canadian legal research tool. User describes a legal scenario in plain language and gets Criminal Code sections, case law, civil law statutes, Charter rights analysis, and CanLII/Justice Laws-linked citations.

## Roadmap Status (Current)
- Completed: Core product flow is production-ready (scenario input -> AI analysis -> grouped legal output -> citation verification).
- Completed: Serverless API suite includes analysis, citation verification, case summary generation, and PDF export.
- Completed: Expanded legal datasets now back local verification for Criminal Code, civil law statutes, and Charter citations.
- Completed (Phase A): retrieval-assisted case-law pipeline added (CanLII term search -> verify -> merge into analyze output).
- Completed (Phase B): analyze output is retrieval-first for case law (model-generated case_law is no longer used in final output).
- Completed (Phase C-A): structured retrieval metrics logging added for analyze/retrieve-caselaw (reason, call counts, verification yield, latency).
- Completed (Phase C-B): rolling retrieval health aggregates (5m/1h) added with Redis + in-memory fallback.
- Completed (Phase C-C): threshold alert evaluation + deduped alert logs + internal retrieval health endpoint.
- Completed: optional `RETRIEVAL_ALERT_WEBHOOK_URL` POST for deduped threshold alerts; case-law fallback search + expanded DB targets when primary pass verifies nothing; internal dashboard at `/internal/retrieval-health`.
- Completed: Redis operation timeout guards (500ms Promise.race) added to all Redis call sites in _rateLimit.js, _retrievalThresholds.js, and _retrievalHealthStore.js.
- Completed (pending user testing): Data quality refinement — fixed 5 duplicate Map keys in civilLawData.js, replaced ~160 placeholder summaries with exact statute text across all 15 statute Maps (0 placeholders remaining, 191 entries, all lookups verified).
- Completed: targeted unit test coverage for edge citation formats in CanLII parsing/ID generation paths.
- Completed: retrieval-health endpoint unit tests for auth, method guards, rate limiting, CORS/security headers, and upstream error mapping.
- Completed: verify endpoint unit tests for timeout handling, non-JSON upstream responses, and mixed citation batches.
- Completed: retrieval-health dashboard E2E coverage for auth failure (401) and successful render after token save.
- Completed: docs sync for current retrieval telemetry + alert status.
- Next priorities:
  - Optional: retrieval health trendlines over time (dashboard shows 5m/1h snapshots today)
  - Continue case-law retrieval quality tuning (query shaping and empty-state UX)

## Tech Stack
- Frontend: React 18 + Vite, inline styles with ThemeContext (no CSS framework by design)
- Backend: Vercel serverless functions (`/api/`)
- AI: Anthropic Messages API (currently `claude-haiku-4-5-20251001`)
- Legal data:
  - CanLII API for case verification metadata
  - Local legal lookup datasets for Criminal Code, civil law statutes, and Charter sections
- Rate limiting/cache: Upstash Redis (falls back to in-memory in dev)
- Monetization: Google AdSense (`ca-pub-5931276184603899`, 4 ad slots), Buy Me a Coffee
- Domain: casedive.ca via Namecheap -> Vercel

## Project Structure
```text
casedive/
|- api/
|  |- _logging.js            # Structured request/API/error logs
|  |- _retrievalMetrics.js   # Structured retrieval telemetry payload/log helper
|  |- _retrievalHealthStore.js # Rolling retrieval event storage + 5m/1h aggregation
|  |- _retrievalThresholds.js # Retrieval threshold evaluator + deduped alert emission
|  |- _rateLimit.js          # Sliding-window limiter (Redis + in-memory fallback)
|  |- analyze.js             # POST /api/analyze - main AI legal analysis handler
|  |- verify.js              # POST /api/verify - citation verification (max 10 citations)
|  |- retrieve-caselaw.js    # POST /api/retrieve-caselaw - Phase A retrieval endpoint
|  |- retrieval-health.js    # GET /api/retrieval-health - internal retrieval metrics/alerts snapshot
|  |- case-summary.js        # POST /api/case-summary - structured case summary via Anthropic
|  \- export-pdf.js         # POST /api/export-pdf - branded PDF export
|- src/
|  |- components/
|  |  |- Header.jsx
|  |  |- FiltersPanel.jsx
|  |  |- SearchArea.jsx
|  |  |- StagedLoading.jsx
|  |  |- Results.jsx
|  |  |- ResultCard.jsx
|  |  |- SuggestionLink.jsx
|  |  |- CaseSummaryModal.jsx
|  |  |- SearchHistory.jsx
|  |  |- BookmarksPanel.jsx
|  |  |- CriminalCodeExplorer.jsx
|  |  |- RetrievalHealthDashboard.jsx
|  |  |- ErrorMessage.jsx
|  |  \- Select.jsx
|  |- hooks/
|  |  |- useSearchHistory.js
|  |  |- useBookmarks.js
|  |  |- useCriminalCodeSearch.js
|  |  \- useTypewriter.js
|  |- lib/
|  |  |- ThemeContext.jsx
|  |  |- themes.js
|  |  |- constants.js
|  |  |- prompts.js
|  |  |- canlii.js
|  |  |- criminalCodeData.js
|  |  |- civilLawData.js
|  |  |- charterData.js
|  |  \- validateUrl.js
|  |- App.jsx
|  |- main.jsx
|  \- index.css
|- public/
|- vercel.json
|- vite.config.js
\- README.md
```

## Key Architecture Decisions

### Response Format
The AI response is JSON with top-level keys:
`summary`, `criminal_code`, `case_law`, `civil_law`, `charter`, `analysis`, `suggestions`.

This is not the legacy `charges`/`cases` format.

### Verification Pipeline
1. AI returns grouped citations in legal sections.
2. Client extracts citations from `criminal_code`, `case_law`, `civil_law`, `charter`.
3. Client calls `/api/verify` with up to 10 citations.
4. Server validates against:
   - local Criminal Code dataset
   - local civil law dataset
   - local Charter dataset
   - CanLII API for case citations
5. UI renders verification status badges/links in `ResultCard`.

### Scalable Case Law Architecture (RAG)
- **Short-Term (0-500 cases)**: Isolated JSON modules within `src/lib/caselaw/` (e.g., `criminal.js`, `charter.js`) that are merged into `index.js`. `api/analyze.js` performs lightning-fast substring matching against this unified memory array.
- **Long-Term (>500 cases)**: To prevent Serverless memory bloat and execution timeouts, a formal SQL migration (Postgres/Supabase) MUST occur once the threshold is crossed. The schema (`citation`, `topics`, `tags`, `facts`, `ratio`) maps 1:1 to SQL columns.

### Law Type Filtering
`FiltersPanel` controls `criminal_code`, `case_law`, `civil_law`, `charter` booleans.
These are passed into `buildSystemPrompt()` and enforced server-side via allowlisted filter values.

### Search History and Bookmarks
- `useSearchHistory`: localStorage history (up to 20 entries, 7-day TTL)
- `useBookmarks`: localStorage bookmark persistence for citations/results

## Legal Data Snapshot (March 24, 2026)
- Criminal Code index: 1516 sections (`src/lib/criminalCodeData.js`)
- Civil law index: 191 entries (`src/lib/civilLawData.js`)
- Charter index: 55 entries (`src/lib/charterData.js`, including key base sections and common subsections)

## Agent Skills (Claude)
- `casedive-audit`: Comprehensive codebase auditing tool
- `casedive-skill-router`: Internal skill routing logic
- `everything-claude-code`: Master rulebook for agent behaviors

## Environment Variables
```bash
ANTHROPIC_API_KEY=sk-ant-...          # Required for /api/analyze and /api/case-summary
CANLII_API_KEY=...                     # Optional; verification degrades gracefully without it
UPSTASH_REDIS_REST_URL=...             # Optional; enables shared limiter/cache
UPSTASH_REDIS_REST_TOKEN=...           # Required if UPSTASH_REDIS_REST_URL is set
RETRIEVAL_HEALTH_TOKEN=...             # Optional; protects GET /api/retrieval-health when set
RETRIEVAL_ALERT_WEBHOOK_URL=...        # Optional; Slack/generic webhook for deduped retrieval threshold alerts
RETRIEVAL_ALERT_WEBHOOK_HOST_ALLOWLIST=hooks.slack.com # Optional; comma-separated host allowlist for webhook destination
RETRIEVAL_ALERT_WEBHOOK_ALLOW_HTTP=false # Optional; set true only for local/dev webhook endpoints
```

## Design System
- Headlines: Times New Roman (serif)
- Body/UI: Helvetica Neue (sans-serif)
- Code/sections: Courier New (monospace)
- Labels: Helvetica Neue, 10px, uppercase, letter-spacing 3.5px
- Light: `#FAF7F2` bg, `#2c2825` text, `#d4a040` accent
- Dark: `#1a1814` bg, `#e8e0d0` text, `#d4a040` accent
- Styling remains inline via ThemeContext (no CSS framework)

## Security
- API keys are server-side only.
- CORS is restricted to `casedive.ca`, `www.casedive.ca`, and `casedive.vercel.app`.
- Security headers are set on all API routes.
- Input validation includes content-type, payload size caps, and schema checks.
- Rate limiting is sliding-window based via `_rateLimit.js` (Redis-backed when configured).
- No user account data is persisted server-side; search history/bookmarks are localStorage-based.

## Rules for AI Assistants
- Do not add a CSS framework; preserve the inline ThemeContext styling system.
- Keep all model/API calls server-side via `/api/` functions.
- Any new endpoint must include rate limiting, input validation, and security headers.
- Use real Canadian legal citations only (no fabricated sections/cases).
- Case citations must follow Canadian neutral citation format where applicable.
- Preserve the grouped response schema (`criminal_code`, `case_law`, `civil_law`, `charter`).
- Preserve legal-disclaimer behavior in the UI.
- Use clear, scoped commit messages; separate unrelated changes.
- Never commit `.env` or secrets.
## Communication Style (Alasdair's Preferences)
- Be concise. Confirm actions in one sentence. Don't over-explain.
- If something is ambiguous, ask one clarifying question only.
- No time estimates.
- Never commit or push to git without being explicitly told to.

## Current Focus
- CanLII case law retrieval semi-working — some cases not found, some summaries inaccurate, actively improving
- Next major focus: retrieval quality tuning and incremental test hardening
