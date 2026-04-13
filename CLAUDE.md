# CaseDive - Claude Context File

## About

AI-powered Canadian legal research tool. Live at [casedive.ca](https://casedive.ca). Repo: `alasdairnc/casefinder`
Stack: React 18 + Vite, Vercel serverless `/api/`, Anthropic API, Upstash Redis, CanLII API.

## Active Development Context

Current focus: case-law retrieval quality — query shaping, fallback calibration, and empty-state UX.
Retrieval failure corpus is the active test target (`npm run test:retrieval-failures`).

## Commands

```bash
npm run dev          # Vite frontend only (localhost:5173)
npm run dev:api      # Full stack via Vercel CLI — USE THIS for any API work
npm run build        # Production build
npm test             # Playwright E2E
npm run test:unit    # Vitest JS unit tests (excludes .test.jsx)
npm run test:component  # Vitest component tests (.test.jsx only)
npm run test:guardrails # Pre-PR: sanitizer + retrieval-failures + hallucination filter
npm run test:retrieval-failures  # Labeled retrieval failure scenarios
```

## Critical Rules

- No CSS framework — all styling is inline via ThemeContext
- All model/API calls server-side only (never from React components)
- New endpoints must have: rate limiting, input validation, security headers
- CORS is centralized in `_cors.js` — don't set headers directly in endpoints
- Model ID comes from `_constants.js` — change it in one place only
- Use real Canadian legal citations only (no fabricated sections/cases)
- Preserve grouped response schema: `criminal_code`, `case_law`, `civil_law`, `charter`
- Never commit `.env` or secrets
- Never commit or push to git without being explicitly told to

## Key Gotchas

- `npm run dev` ≠ `npm run dev:api` — use `dev:api` when touching `/api/`
- `test:unit` excludes `.test.jsx` — use `test:component` for JSX tests
- `criminalCodeData.js` is 316KB — import `criminalCodeParts.js` for just the parts list
- Redis falls back to in-memory in dev (no Upstash needed locally)
- CanLII API key is optional — verification degrades gracefully without it
- Sentry no-ops if `SENTRY_DSN` is not set

## Reference Files (read on demand, not every turn)

- `docs/architecture.md` — project structure, response format, verification pipeline, case law DB, filtering, env vars
- `docs/design-system.md` — fonts, colors, theme tokens
- `docs/security.md` — CORS, rate limiting, input validation, key handling

## Agent Skills

Auto-loaded from `.claude/skills/`. Key ones: `casedive-audit`, `new-api-endpoint`.

## Subagents

- `api-invariant-reviewer`: Checks `api/*.js` for rate limiting, input validation, security headers.
- `legal-data-validator`: Validates schema of entries in `criminalCodeData.js`, `civilLawData.js`, `charterData.js` — required fields, correct types, no duplicate keys. Run after adding any legal data entry.
- `pre-push-checklist`: Compound pre-push gate. Chains: (1) full /verify loop, (2) console.log scan across src/ and api/, (3) .env drift check. Run before any git push.
