# CaseFinder — Claude Code Context

## Project
AI-powered Canadian criminal law research tool. Users describe a scenario → get charges, Criminal Code sections, case law, sentencing, and legal analysis. Live at casedive.ca. Portfolio project by Alasdair NC (Justice Studies, University of Guelph-Humber).

## Repo
`alasdairnc/casefinder` — auto-deploys to Vercel on push to main.

## Stack
- React 18 + Vite (frontend)
- Node.js serverless functions in `/api/` (backend)
- Anthropic Claude API — `claude-sonnet-4-20250514`
- CanLII API for citation verification (5,000 queries/day, 2 req/sec, metadata + summaries only)
- Upstash Redis for persistent rate limiting
- Vercel (deployment) + Namecheap (casedive.ca)
- Playwright for E2E testing

## File Structure
```
casefinder/
├── api/
│   ├── _rateLimit.js           # Sliding-window rate limiter (Upstash Redis)
│   ├── analyze.js              # POST /api/analyze — Claude API call
│   ├── verify.js               # POST /api/verify — CanLII citation check
│   └── export-pdf.js           # POST /api/export-pdf — branded PDF generation
├── src/
│   ├── components/
│   │   ├── BookmarksPanel.jsx   # Bottom-sheet saved citations panel
│   │   ├── CaseSummaryModal.jsx # Modal for detailed case view
│   │   ├── ErrorMessage.jsx
│   │   ├── FiltersPanel.jsx
│   │   ├── Header.jsx           # Top bar with theme toggle, bookmarks, coffee link
│   │   ├── ResultCard.jsx       # Individual citation card with verification badge
│   │   ├── Results.jsx          # Main results container with PDF export
│   │   ├── SearchArea.jsx       # Scenario textarea + submit
│   │   ├── SearchHistory.jsx    # History bottom-sheet
│   │   ├── Select.jsx
│   │   └── StagedLoading.jsx    # Multi-stage loading animation
│   ├── hooks/
│   │   ├── useBookmarks.js      # localStorage bookmarks, 30-day TTL, max 50
│   │   ├── useSearchHistory.js  # localStorage history, 7-day TTL
│   │   └── useTypewriter.js     # Character-by-character text animation
│   ├── lib/
│   │   ├── ThemeContext.jsx     # Theme provider + useTheme hook
│   │   ├── canlii.js           # Citation parser, URL builder, ~35 courts
│   │   ├── constants.js        # Filter options, default law types
│   │   ├── charterData.js      # 35 Charter sections + subsections with relevance mapping
│   │   ├── civilLawData.js     # CDSA, YCJA, CHRA, CC sentencing, CEA, CCRA
│   │   ├── criminalCodeData.js # 490 sections, 46 enriched with definitions/defences
│   │   ├── prompts.js          # System prompt builder for Claude
│   │   ├── themes.js           # Light/dark theme objects
│   │   └── validateUrl.js      # URL validation utility
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── Skills/                     # Custom + ECC skill files
│   ├── criminal-code-builder-SKILL.md
│   ├── canlii-case-verification-SKILL.md
│   ├── canlii-prompt-engineering-SKILL.md
│   ├── civil-law-database-builder-SKILL.md
│   └── ecc/                    # Extended Claude Code community skills
├── tests/                      # Playwright E2E tests
└── CLAUDE.md                   # This file
```

---

## Architecture Rules — Never Break These

1. **All API keys stay server-side.** Anthropic and CanLII keys only in `/api/` functions. Never in `src/`.
2. **No CSS frameworks.** Styling is inline styles via ThemeContext. Intentional.
3. **Verification pipeline.** Claude suggests citations → `/api/verify.js` checks against CanLII → only verified cases display with badge.
4. **Rate limiting on every endpoint.** Use existing Upstash Redis middleware in `api/_rateLimit.js`.
5. **Input validation both sides.** Client-side before submit, server-side in the function.
6. **Real Criminal Code sections only.** No made-up section numbers.
7. **Never commit `.env` or `.env.local`.**
8. **Separate commits per feature/fix** with clear messages. Feature branches → merge to main.

---

## Distilled Rules (from Skills)

Cross-cutting principles extracted from all 9 skill files. Follow these in addition to Architecture Rules.

1. **Validate before committing.** Every domain (legal data, API endpoints, components) has a checklist in its skill file. Run through it before finalizing work.
2. **Neutral citation format only.** Case law citations must use `YYYY COURT #` format (e.g., `2020 SCC 5`). Reject or normalize case-name-only citations.
3. **Error handling matrix.** For any integration point (CanLII API, Claude API, Redis), document: Error Type → Root Cause → Recovery → Debug Steps.
4. **Rate limit consistently.** 500ms minimum between external API calls. Return `X-RateLimit-*` and `Retry-After` headers on every rate-limited endpoint.
5. **Fewer results > fabricated results.** Return empty arrays rather than uncertain citations. This applies to both the Claude system prompt and any data-building task.
6. **Test with real data.** Use the real SCC citations in `canlii-case-verification-SKILL.md` for testing verification. Use real Criminal Code sections for database testing. Never mock legal data in integration tests.
7. **JSON templates are contracts.** When adding fields to `criminalCodeData.js` or other data files, follow the exact template in the relevant skill. Don't invent new fields or skip required ones.
8. **System prompts need evaluation criteria.** When modifying `prompts.js`, define what "better" means (fewer hallucinations, correct JSON structure, proper citation format) before changing the prompt.

---

## Design Tokens

### Light Theme (`#FAF7F2` base)
- Background: `#FAF7F2` | Text: `#2c2825` | Accent: `#d4a040`
- Red: `#8a3020` | Green: `#3a6a4a` | Border: `#d8d0c4`

### Dark Theme (`#1a1814` base)
- Background: `#1a1814` | Text: `#e8e0d0` | Accent: `#d4a040`
- Red: `#d4654a` | Green: `#6aaa7a` | Border: `#3a3530`

### Typography
- Headlines/citations: `Times New Roman` (serif)
- UI/body: `Helvetica Neue` (sans-serif)
- Code/sections: `Courier New` (monospace)
- Labels: Helvetica Neue, 10px, uppercase, letter-spacing 3.5px

### Responsive
- Use `clamp()` for font sizes
- `flex-wrap` on layouts
- All UI must work on mobile

---

## Key Libraries & Utilities

### `src/lib/canlii.js`
- `parseCitation(citation)` — parses "R v Smith, 2020 ONCA 123" → `{ parties, year, courtCode, number, dbId }`
- `lookupCase(citation, apiKey)` — verifies against CanLII API
- Status values: `verified | not_found | unverified | unparseable | unknown_court | error`
- COURT_DB_MAP covers ~35 Canadian courts

### `src/lib/prompts.js`
- `buildSystemPrompt(filters)` — builds Claude system prompt with jurisdiction/court/date filters
- Output JSON: `{ summary, criminal_code[], case_law[], civil_law[], charter[], analysis, searchTerms[] }`

### `api/_rateLimit.js`
- Sliding-window rate limiter backed by Upstash Redis
- `checkRateLimit(ip)` → `{ allowed, resetAt }`
- Apply to every new endpoint

---

## Environment Variables
```
ANTHROPIC_API_KEY=       # server-side only, /api/analyze.js
CANLII_API_KEY=          # server-side only, /api/verify.js
UPSTASH_REDIS_REST_URL=  # rate limiting
UPSTASH_REDIS_REST_TOKEN=
```
Local: `.env.local` (gitignored). Production: set in Vercel dashboard.

---

## Skills System

Read the relevant skill file BEFORE starting any non-trivial task. Skills are in `Skills/` (custom) and `Skills/ecc/` (community).

Default routing order:
1. Match the task to a CaseFinder custom skill if one exists.
2. Layer 1-2 ECC skills for the engineering concern (API, security, UI, testing, deployment).
3. Run the matching command after the change (`/verify`, `/security-scan`).
4. If multiple skills apply, custom skills win on domain rules and ECC skills fill in engineering patterns.

### Custom CaseFinder Skills (always read first)

| Task | Skill File | When to Read |
|------|-----------|--------------|
| Adding/expanding Criminal Code sections | `Skills/criminal-code-builder-SKILL.md` | Any work on `criminalCodeData.js` or Criminal Code JSON. Has the 50-section priority list, JSON template, validation checklist, batch workflow. |
| CanLII API integration & debugging | `Skills/canlii-case-verification-SKILL.md` | Any work on `api/verify.js`, `src/lib/canlii.js`, or citation verification. Has endpoint formats, rate limit patterns, response parsing, caching strategy, real test citations. |
| Updating Claude system prompt | `Skills/canlii-prompt-engineering-SKILL.md` | Any work on `src/lib/prompts.js`. Has citation format requirements (neutral citation only: YYYY COURT #), example outputs, evaluation criteria, iteration workflow. |
| Building civil law / Charter databases | `Skills/civil-law-database-builder-SKILL.md` | Any work on civil law JSON, Charter data, or federal statute references. Has federal statutes checklist, JSON template, provincial structure, relevance mapping. |

### Primary ECC Skills

| Skill | Use it for | Path |
|------|------------|------|
| `api-design` | REST response shapes, status codes, validation errors, rate-limit contracts | `Skills/ecc/api-design/SKILL.md` |
| `backend-patterns` | Caching, middleware, logging, retry flow, server-side structure in `api/` | `Skills/ecc/backend-patterns/SKILL.md` |
| `frontend-patterns` | React component work, state flow, rendering, accessibility, responsive behavior | `Skills/ecc/frontend-patterns/SKILL.md` |
| `claude-api` | Anthropic request shape, model choice, streaming, retries, SDK/API usage | `Skills/ecc/claude-api/SKILL.md` |
| `security-review` | Input validation, secrets, CORS, third-party API calls, endpoint hardening | `Skills/ecc/security-review/SKILL.md` |
| `e2e-testing` | Playwright tests, flows, fixtures, flaky test cleanup | `Skills/ecc/e2e-testing/SKILL.md` |
| `deployment-patterns` | Vercel release flow, env setup, rollout checks, production readiness | `Skills/ecc/deployment-patterns/SKILL.md` |
| `verification-loop` | Final build/test/security pass after meaningful code changes | `Skills/ecc/verification-loop/SKILL.md` |

### Situational ECC Skills

| Skill | Use it for | Path |
|------|------------|------|
| `search-first` | Researching dependencies or existing solutions before building custom code | `Skills/ecc/search-first/SKILL.md` |
| `documentation-lookup` | Current library docs for React, Vite, Playwright, Vercel, Anthropic, Upstash, etc. | `Skills/ecc/documentation-lookup/SKILL.md` |
| `click-path-audit` | Buttons, modals, toggles, or multi-step UI flows that behave inconsistently | `Skills/ecc/click-path-audit/SKILL.md` |
| `ai-regression-testing` | Regression coverage after AI-edited API routes, JSON contracts, or backend logic | `Skills/ecc/ai-regression-testing/SKILL.md` |
| `cost-aware-llm-pipeline` | Model routing, budget control, retry policy, prompt caching, latency/cost tradeoffs | `Skills/ecc/cost-aware-llm-pipeline/SKILL.md` |
| `security-scan` | Scanning `.claude/` skills, commands, settings, and hooks for config risk | `Skills/ecc/security-scan/SKILL.md` |
| `codebase-onboarding` | New contributors, fresh agent sessions, repo walkthroughs, CLAUDE.md refreshes | `Skills/ecc/codebase-onboarding/SKILL.md` |
| `prompt-optimizer` | Rewriting prompts when the user wants prompt help, not direct implementation | `Skills/ecc/prompt-optimizer/SKILL.md` |
| `skill-stocktake` | Auditing the quality and overlap of installed Claude skills/commands | `Skills/ecc/skill-stocktake/SKILL.md` |

### Task-to-Skill Routing

| Task or files | Read first | Layer next | Finish with |
|---------------|------------|------------|-------------|
| `api/analyze.js`, `api/case-summary.js`, `api/export-pdf.js` | `security-review` | `claude-api`, `api-design`, `backend-patterns`; add `cost-aware-llm-pipeline` when changing model/cost/cache/retry logic | `/verify` |
| `api/verify.js`, `src/lib/canlii.js` | `canlii-case-verification` | `api-design`, `security-review`, `backend-patterns` | `/verify` |
| `src/lib/prompts.js` or prompt quality/citation formatting work | `canlii-prompt-engineering` | `claude-api`; use `prompt-optimizer` only when the user wants help rewriting the prompt itself | `/verify` if code changed |
| `criminalCodeData.js` or Criminal Code enrichment | `criminal-code-builder` | `search-first` only if adding new ingestion/scraping tooling | `/verify` if app behavior changed |
| `src/lib/civilLawData.js`, `src/lib/charterData.js` | `civil-law-database-builder` | `search-first` only if changing sourcing/build workflow | `/verify` if app behavior changed |
| `src/components/*`, `src/App.jsx`, `src/index.css` | `frontend-patterns` | `click-path-audit` for state bugs, `e2e-testing` for user flows | `/verify` |
| New dependency, SDK, or external integration | `search-first` | `documentation-lookup`, `security-review` | `/verify` |
| `.claude/commands/*`, `.claude/skills/*`, `CLAUDE.md`, agent config | `security-scan` | `skill-stocktake` for broad skill audits, `codebase-onboarding` when refreshing repo guidance | `/security-scan` |
| Vercel config, deploy flow, env changes | `deployment-patterns` | `security-review` | `/verify` |
| First session in the repo or handoff to a new agent | `codebase-onboarding` | Then route to the relevant custom/ECC skill above | none |

### Skill Usage Rules

1. **Read before coding.** Open the skill file, scan for the section matching your task, then proceed.
2. **Custom skills override ECC skills.** If `criminal-code-builder` and `api-design` both apply, follow `criminal-code-builder` for domain-specific patterns and `api-design` for general REST conventions.
3. **Keep the active stack small.** Default to one custom skill plus one or two ECC skills unless the task truly spans multiple domains.
4. **Use `security-review` for app code and `security-scan` for `.claude/` config.** They are not interchangeable.
5. **Use `prompt-optimizer` only for prompt rewriting.** If the user wants the code changed directly, implement the change instead.
6. **Validation checklists are mandatory.** Every custom skill has one. Run through it before committing.
7. **Don't skip the test cases.** `canlii-case-verification` has real SCC citations for testing — use them.

### Preferred Commands

- `/verify` after API, UI, prompt, data, or deployment changes.
- `/security-scan` after changing `.claude/` files or before pushing agent config.
- `/prompt-optimizer` only when the task is "improve this prompt" rather than "make the change."

---

## CanLII API Quick Reference

- **Base URL:** `https://api.canlii.org/v1`
- **Auth:** `Authorization: apikey {CANLII_API_KEY}`
- **Rate limits:** 5,000/day, 2 req/sec, 1 at a time → use 500ms delay between calls
- **Returns:** metadata + summaries only (NO full text)
- **Key DBs:** `csc-scc` (SCC), `onca` (Ontario CA), `onsc` (Ontario SC), `bcca` (BC CA), `fca-caf` (Federal CA)
- **Case ID format:** `{year}{courtcode}{number}` lowercase, no separators (e.g., `1988scc30`)
- **Verification flow:** Parse citation → build case ID → hit API → cache result (24hr TTL)
- **Graceful degradation:** If no API key set, return `status: "unverified"` with constructed CanLII URL

---

## Active Roadmap

### Done
- [x] Wire `/api/verify.js` into Results — live citation verification with badges
- [x] Build Criminal Code JSON database (490 sections, 46 enriched with definitions/defences)
- [x] PDF export from Results (`/api/export-pdf.js`, pdfkit, branded)
- [x] Case bookmarking (localStorage, 30-day TTL, max 50, BookmarksPanel)
- [x] Rate limit headers (`X-RateLimit-*`, `Retry-After`) on all endpoints
- [x] Structured JSON logging on analyze.js
- [x] Distilled rules from ECC skills into CLAUDE.md

### Now
- [x] Build civil law JSON database — `src/lib/civilLawData.js` (CDSA, YCJA, CHRA, CC sentencing, CEA, CCRA)
- [x] Build Charter rights JSON — `src/lib/charterData.js` (all 35 sections + subsections)

### Next
- [ ] Citation export in legal formats
- [ ] Vercel Analytics
- [ ] SEO + Open Graph meta improvements

### Later
- [ ] Provincial court expansion (ONCA, BCCA, FCA)
- [ ] Provincial statutes in civil law database
- [ ] Embedded case viewer modal
- [ ] Search within Criminal Code
- [ ] B2B outreach to law schools / legal aid

---

## Communication Style
- Concise. Confirm actions in one sentence.
- No time estimates.
- Ask one clarifying question max if ambiguous.
- No over-explaining.
