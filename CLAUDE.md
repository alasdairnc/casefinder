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
│   └── verify.js               # POST /api/verify — CanLII citation check
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── FiltersPanel.jsx
│   │   ├── SearchArea.jsx
│   │   ├── StagedLoading.jsx
│   │   ├── Results.jsx
│   │   ├── ChargeCard.jsx
│   │   ├── CaseCard.jsx
│   │   ├── RelatedCharges.jsx
│   │   ├── SentencingPanel.jsx
│   │   ├── SearchHistory.jsx
│   │   ├── ErrorMessage.jsx
│   │   └── Select.jsx
│   ├── hooks/
│   │   └── useSearchHistory.js # localStorage history, 7-day TTL
│   ├── lib/
│   │   ├── themes.js           # Light/dark theme objects
│   │   ├── constants.js        # Filter options, example scenarios
│   │   ├── prompts.js          # System prompt builder for Claude
│   │   ├── canlii.js           # Citation parser, URL builder, court DB map (~35 courts)
│   │   ├── chargeRelations.js  # Related charges data
│   │   └── sentencingData.js   # Sentencing ranges data
│   ├── App.jsx
│   ├── ThemeContext.jsx
│   ├── main.jsx
│   └── index.css
├── Skills/                     # Custom + ECC skill files
│   ├── criminal-code-builder-SKILL.md
│   ├── canlii-case-verification-SKILL.md
│   ├── canlii-prompt-engineering-SKILL.md
│   ├── civil-law-database-builder-SKILL.md
│   └── ecc/                    # Extended Claude Code community skills
├── tests/                      # Playwright E2E tests
├── MIGRATION_GUIDE.md
├── Master Instructions/
│   └── CASEFINDER UPGRADE PLAN.md
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

Read the relevant skill file BEFORE starting any task in these categories. Skills are in `Skills/` (custom) and `Skills/ecc/` (community).

### Custom CaseFinder Skills (always read first)

| Task | Skill File | When to Read |
|------|-----------|--------------|
| Adding/expanding Criminal Code sections | `Skills/criminal-code-builder-SKILL.md` | Any work on `criminalCodeData.js` or Criminal Code JSON. Has the 50-section priority list, JSON template, validation checklist, batch workflow. |
| CanLII API integration & debugging | `Skills/canlii-case-verification-SKILL.md` | Any work on `api/verify.js`, `src/lib/canlii.js`, or citation verification. Has endpoint formats, rate limit patterns, response parsing, caching strategy, real test citations. |
| Updating Claude system prompt | `Skills/canlii-prompt-engineering-SKILL.md` | Any work on `src/lib/prompts.js`. Has citation format requirements (neutral citation only: YYYY COURT #), example outputs, evaluation criteria, iteration workflow. |
| Building civil law / Charter databases | `Skills/civil-law-database-builder-SKILL.md` | Any work on civil law JSON, Charter data, or federal statute references. Has federal statutes checklist, JSON template, provincial structure, relevance mapping. |

### ECC Skills (read when relevant)

| Task | Skill | Path |
|------|-------|------|
| Building/modifying API endpoints | `api-design` | `Skills/ecc/api-design/SKILL.md` |
| React component work | `frontend-patterns` | `Skills/ecc/frontend-patterns/SKILL.md` |
| Claude API calls or SDK usage | `claude-api` | `Skills/ecc/claude-api/SKILL.md` |
| Security hardening, input validation | `security-review` | `Skills/ecc/security-review/SKILL.md` |
| E2E testing with Playwright | `e2e-testing` | `Skills/ecc/e2e-testing/SKILL.md` |
| Deployment, CI/CD, Vercel | `deployment-patterns` | `Skills/ecc/deployment-patterns/SKILL.md` |
| Post-feature verification | `verification-loop` | `Skills/ecc/verification-loop/SKILL.md` |
| Prompt optimization | `prompt-optimizer` | `Skills/ecc/prompt-optimizer/SKILL.md` |

### Skill Usage Rules

1. **Read before coding.** Open the skill file, scan for the section matching your task, then proceed.
2. **Custom skills override ECC skills.** If `criminal-code-builder` and `api-design` both apply, follow `criminal-code-builder` for domain-specific patterns and `api-design` for general REST conventions.
3. **Validation checklists are mandatory.** Every custom skill has one. Run through it before committing.
4. **Don't skip the test cases.** `canlii-case-verification` has real SCC citations for testing — use them.

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

### Now
- [ ] Wire `/api/verify.js` into Results component — verify citations live after analysis
- [ ] Build Criminal Code JSON database (start with 50 priority sections from skill)
- [ ] Build civil law JSON database (federal statutes from skill checklist)
- [ ] Build Charter rights JSON (all 35 sections)

### Next
- [ ] PDF export from Results
- [ ] Case bookmarking (localStorage)
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
