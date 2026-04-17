npm run dev:api # Full stack via Vercel CLI — USE THIS for any API work
npm run test:component # Vitest component tests (.test.jsx only)
npm run test:guardrails # Pre-PR: sanitizer + retrieval-failures + hallucination filter

# CaseDive - Claude Context File

AI-powered Canadian legal research tool. Stack: React 18 + Vite, Vercel serverless `/api/`, Anthropic API, Upstash Redis, CanLII API. Live at [casedive.ca](https://casedive.ca).

## Action Bias & Testing

- Act directly when intent is clear; avoid verbose narration
- Always start dev server (`npm run dev:api`) before E2E/Playwright tests
- Run full test suite after code changes; fix failures before declaring done
- Add regression tests when fixing bugs

## Dependencies & Build

- Pin major version upgrades; do not auto-bump
- Verify build after any dependency change

## Active Dev Context

Focus: case-law retrieval quality (query shaping, fallback calibration, empty-state UX). Test target: retrieval failure corpus (`npm run test:retrieval-failures`).

## Commands

`npm run dev` (frontend), `npm run dev:api` (full stack), `npm run build`, `npm test`, `npm run test:unit`, `npm run test:component`, `npm run test:guardrails`, `npm run test:retrieval-failures`

## Memory & Session

Save non-obvious decisions/gotchas to `.claude/projects/*/memory/` immediately.

## Critical Rules

- No CSS framework (all styling via ThemeContext)
- Model/API calls server-side only
- New endpoints: rate limiting, input validation, security headers
- CORS via `_cors.js` only
- Model ID from `_constants.js` only
- Use real Canadian legal citations only
- Preserve grouped response schema: `criminal_code`, `case_law`, `civil_law`, `charter`
- Never commit `.env`/secrets or push to git without explicit instruction
- Claude-token workflows: default skip, require opt-in, concurrency cancel, precheck for low-value

## Key Gotchas

- `npm run dev` ≠ `npm run dev:api` (use `dev:api` for `/api/`)
- `test:unit` excludes `.test.jsx` (use `test:component` for JSX)
- `criminalCodeData.js` is 316KB (import `criminalCodeParts.js` for parts list)
- Redis falls back to in-memory in dev
- CanLII API key optional; Sentry no-ops if unset

## Reference Files (read on demand)

- `docs/README.md` (documentation index)
- `docs/architecture.md`, `docs/design-system.md`, `docs/security.md`
- `docs/filtering/FILTER_TUNING.md`, `docs/filtering/FILTER_TUNING_QUICKSTART.md`
- `docs/operations/` (runbooks, snapshots, performance plan, audit log)
- `artifacts/` (generated outputs, including `filter-quality-report.html`)

## Agent Skills & Subagents

Auto-loaded from `.claude/skills/` (e.g., `casedive-audit`, `new-api-endpoint`).

- `api-invariant-reviewer`: Checks `api/*.js` for rate limiting, input validation, security headers
- `legal-data-validator`: Validates schema of legal data files

## Workflow Rules (from claude-doctor)

- Read the full file before editing; plan all changes, then make ONE complete edit
- If a file is edited 3+ times, re-read requirements
- Re-read the last user message before responding; follow every instruction
- Every few turns, re-read the original request to avoid drift
- When corrected, quote back the request and confirm before proceeding
- When stuck, summarize attempts and ask for guidance
- Double-check output before presenting; verify it addresses the request
- After 2 consecutive tool failures, change approach and explain
