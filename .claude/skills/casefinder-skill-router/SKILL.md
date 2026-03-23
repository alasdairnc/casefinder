---
name: casefinder-skill-router
description: Use when working in the CaseFinder repo to choose the right custom CaseFinder skills, ECC skills, and slash commands based on the task, files touched, or bug type. Applies to API routes, React UI, CanLII verification, prompt work, legal data updates, Claude config, testing, and deployment.
---

# CaseFinder Skill Router

Use this skill before any non-trivial work in this repository.

## Selection Order

1. Match the task to one CaseFinder custom skill if possible.
2. Add one or two ECC skills for the engineering concern.
3. Run the matching command after the change.
4. Keep the active stack small unless the task genuinely crosses domains.

## CaseFinder Custom Skills

- `Skills/criminal-code-builder-SKILL.md`
  Use for `criminalCodeData.js`, section enrichment, Criminal Code structure, and validation.
- `Skills/canlii-case-verification-SKILL.md`
  Use for `api/verify.js`, `src/lib/canlii.js`, citation normalization, CanLII caching, and verification bugs.
- `Skills/canlii-prompt-engineering-SKILL.md`
  Use for `src/lib/prompts.js`, citation formatting rules, output quality, and prompt changes.
- `Skills/civil-law-database-builder-SKILL.md`
  Use for `src/lib/civilLawData.js`, `src/lib/charterData.js`, and statute dataset expansion.

## ECC Routing Rules

- `api/analyze.js`, `api/case-summary.js`, `api/export-pdf.js`
  Start with `security-review`.
  Add `claude-api`, `api-design`, and `backend-patterns`.
  Add `cost-aware-llm-pipeline` for model, retry, latency, caching, or budget work.
- `api/verify.js`, `src/lib/canlii.js`
  Start with `canlii-case-verification`.
  Add `api-design`, `security-review`, and `backend-patterns`.
- `src/lib/prompts.js`
  Start with `canlii-prompt-engineering`.
  Add `claude-api`.
  Use `prompt-optimizer` only when the user wants the prompt rewritten rather than the code changed.
- `src/components/*`, `src/App.jsx`, `src/index.css`
  Start with `frontend-patterns`.
  Add `click-path-audit` for inconsistent UI state or broken button flows.
  Add `e2e-testing` for user-flow coverage.
- New packages, SDKs, or third-party integrations
  Start with `search-first`.
  Add `documentation-lookup` and `security-review`.
- `.claude/commands/*`, `.claude/skills/*`, `CLAUDE.md`
  Start with `security-scan`.
  Add `skill-stocktake` for full skill audits.
  Add `codebase-onboarding` when refreshing onboarding guidance.
- Deployment and environment work
  Start with `deployment-patterns`.
  Add `security-review`.

## Command Routing

- Run `/verify` after API, UI, prompt, legal-data, or deployment changes.
- Run `/security-scan` after `.claude/` changes or before pushing agent config.
- Run `/prompt-optimizer` only for prompt-improvement requests.

## Guardrails

- Custom CaseFinder skills override ECC skills on legal-domain rules.
- Do not load more skills than needed.
- Use `security-review` for application code and `security-scan` for Claude configuration.
- If the task does not clearly match a custom skill, choose the closest ECC skill by file and concern.
