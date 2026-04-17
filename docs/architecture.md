# CaseDive Architecture

## Project Structure

```text
casedive/
|- api/
|  |- _apiCommon.js           # applyStandardApiHeaders() + handleOptionsAndMethod() — import in every endpoint
|  |- _caseLawRetrieval.js    # Phase A: CanLII search + local DB verification pipeline
|  |- _constants.js           # Centralized tunable constants (model ID, timeouts, TTLs)
|  |- _cors.js                # ALLOWED_ORIGINS list + applyCorsHeaders() — CORS source of truth
|  |- _filterConfig.js        # Tunable thresholds for semantic filtering/ranking
|  |- _filterScoring.js       # Filter quality scoring: precision, recall, semantic relevance
|  |- _legalConcepts.js       # Regex concept patterns + overlap counting for retrieval ranking
|  |- _logging.js             # Structured request/API/error logs
|  |- _rateLimit.js           # Sliding-window limiter (Redis + in-memory fallback)
|  |- _requestDedup.js        # In-memory in-flight deduplication for concurrent identical requests
|  |- _retrievalHealthStore.js # Rolling retrieval event storage + 5m/1h aggregation
|  |- _retrievalImprovements.js # Deterministic tuning suggestions from recent retrieval failures
|  |- _retrievalMetrics.js    # Structured retrieval telemetry payload/log helper
|  |- _retrievalOrchestrator.js # Shared retrieval runner used by endpoints needing verified case-law
|  |- _retrievalThresholds.js # Retrieval threshold evaluator + deduped alert emission
|  |- _sentry.js              # Sentry init wrapper (no-ops if SENTRY_DSN not set)
|  |- _textUtils.js           # Shared text normalization + stop-word sets for retrieval/ranking
|  |- analyze.js              # POST /api/analyze — main AI legal analysis handler
|  |- case-summary.js         # POST /api/case-summary — structured case summary via Anthropic
|  |- export-pdf.js           # POST /api/export-pdf — branded PDF export
|  |- filter-quality.js       # GET /api/filter-quality — internal filter dashboard (auth-gated)
|  |- retrieval-health.js     # GET /api/retrieval-health — retrieval metrics/alerts snapshot (auth-gated)
|  |- retrieve-caselaw.js     # POST /api/retrieve-caselaw — Phase A retrieval endpoint
|  \- verify.js               # POST /api/verify — citation verification (max 10 citations)
|- src/
|  |- components/             # Header, FiltersPanel, SearchArea, StagedLoading, Results,
|  |                          # ResultCard, SuggestionLink, CaseSummaryModal, SearchHistory,
|  |                          # BookmarksPanel, CriminalCodeExplorer, RetrievalHealthDashboard,
|  |                          # ErrorMessage, Select
|  |- hooks/                  # useSearchHistory, useBookmarks, useCriminalCodeSearch, useTypewriter
|  |- lib/
|  |  |- ThemeContext.jsx     # Theme provider (inline styles, no CSS framework)
|  |  |- themes.js            # Light/dark theme definitions
|  |  |- constants.js         # Frontend constants
|  |  |- prompts.js           # System prompt builder
|  |  |- canlii.js            # CanLII API client
|  |  |- criminalCodeData.js  # 1516 sections (316KB — use criminalCodeParts.js for parts only)
|  |  |- civilLawData.js      # 191 entries
|  |  |- charterData.js       # 55 entries
|  |  |- landmarkCases.js     # Seeds for retrieval fallback/query enrichment
|  |  |- validateUrl.js
|  |  \- caselaw/             # Live case-law DB merged via index.js → MASTER_CASE_LAW_DB
|  |- App.jsx, main.jsx, index.css
|- tests/ (e2e/, unit/, live/)
|- scripts/ (evaluate-retrieval-failures, tune-filters, performance-monitor, security-probe)
```

## Response Format

AI response JSON top-level keys: `summary`, `criminal_code`, `case_law`, `civil_law`, `charter`, `analysis`, `suggestions`.
NOT the legacy `charges`/`cases` format.

## Case Summary (`/api/case-summary`)

Returns: `facts`, `held`, `ratio`, `keyQuote`, `significance`, `citations` (Anthropic Citations API array).
Case text passed as `type: "document"` with `citations: { enabled: true }`.
Beta headers: `citations-2023-12-31` + `prompt-caching-2024-07-31`.
Do NOT add `output_config.format` — structured output is incompatible with Citations.

## Verification Pipeline

1. AI returns grouped citations → 2. Client extracts from sections → 3. `/api/verify` (max 10) → 4. Server validates against local datasets + CanLII → 5. UI renders badges in `ResultCard`

## Case Law Database (`src/lib/caselaw/`)

Domain-split modules merged by `index.js` into `MASTER_CASE_LAW_DB`.
**Add domain**: create `src/lib/caselaw/<domain>.js`, export array, spread in `index.js`.
**Scaling**: at >500 cases, migrate to SQL. Schema maps 1:1.

## Filtering

`FiltersPanel` controls booleans → `buildSystemPrompt()` → enforced server-side via allowlist.

## Client Storage

- `useSearchHistory`: in-memory only for the active session, capped at 20 entries
- `useBookmarks`: localStorage persistence

## Environment Variables

```
ANTHROPIC_API_KEY          # Required
CANLII_API_KEY             # Optional — degrades gracefully
UPSTASH_REDIS_REST_URL     # Optional — enables Redis limiter/cache
UPSTASH_REDIS_REST_TOKEN   # Required if URL set
ANTHROPIC_MODEL_ID         # Optional — overrides default haiku
RETRIEVAL_HEALTH_TOKEN     # Optional — protects health endpoint
RETRIEVAL_ALERT_WEBHOOK_URL / _HOST_ALLOWLIST / _ALLOW_HTTP  # Optional
SENTRY_DSN                 # Optional — no-ops if absent
```
