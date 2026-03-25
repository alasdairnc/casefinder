---
name: casefinder-audit
description: Self-updating audit skill for the CaseDive project. Scans API security, test coverage, legal data quality, config hygiene, and performance. Appends findings to a persistent audit log with diff-against-history tracking.
---

# CaseDive Project Audit

> Invoke with `/casefinder-audit`. Audit only — never fix anything.

## Overview

This skill performs a comprehensive audit of the CaseDive codebase across five domains: API/Security, Testing, Legal Data, Config/Docs, and Performance. It tracks findings over time in a persistent append-only log and diffs each run against previous results to surface what is new, what is still open, and what has been fixed.

## When to Use This Skill

Activate this skill when:
- Running a periodic health check of the CaseDive codebase
- Preparing for a deploy and wanting a pre-flight audit
- Checking whether previously logged issues have been resolved
- Reviewing security posture of all API endpoints

## Model and Effort

- **Recommended model**: Opus 4.6
- **Effort level**: high
- **Budget**: 3-5 minutes

## Constraints

- **Audit only** — do not fix, refactor, or modify any application code
- **Never overwrite** previous entries in `AUDIT_LOG.md` — only append
- **Use Explore subagent** at "very thorough" level for Phase 2 investigation
- **Report file + line number** for every finding
- **Do not invent issues** not actually found in the code

## Execution Phases

### Phase 1 — Load History

1. Read `.claude/skills/casefinder-audit/AUDIT_LOG.md` from the project root.
2. Parse all previously logged issues and their status tags: `FIXED`, `OPEN`, `WONT_FIX`.
3. Build an internal tracking list of prior findings keyed by issue description.

### Phase 2 — Investigate

Launch an Explore subagent at **very thorough** level. Run the following checks in parallel where possible. For every finding, record the file path and line number.

#### API / Security

- **Rate limiting buckets**: Verify every `api/*.js` file uses rate limiting with a **named bucket** (not a default/unnamed bucket). Check the `_rateLimit.js` import and the bucket string argument.
- **CORS import**: Verify every `api/*.js` file imports CORS handling from `api/_cors.js` (not inline CORS headers). Flag any file that sets CORS headers directly.
- **Security headers**: Verify every `api/*.js` file sets all three security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a `Content-Security-Policy` header.
- **vercel.json coverage**: Verify `vercel.json` has a `functions` config entry for every `.js` file in the `api/` directory (excluding `_`-prefixed internal modules).
- **Fetch timeouts**: Verify no `api/*.js` file makes an external `fetch()` call without `AbortSignal.timeout()` or an equivalent abort controller with a timeout.

#### Testing

- **Component E2E coverage**: List every `src/components/*.jsx` file that has **zero** corresponding E2E test coverage (no test file references the component).
- **Lib unit coverage**: List every `src/lib/*.js` file that has **zero** corresponding unit test file.
- **Playwright mobile profiles**: Check `playwright.config.js` (or equivalent) for whether mobile device profiles (e.g., `iPhone`, `Pixel`, or Playwright `devices[...]`) are configured.

#### Legal Data

- **Criminal Code placeholders**: Scan `src/lib/criminalCodeData.js` for entries whose summary or description contains placeholder text (e.g., `"TODO"`, `"placeholder"`, `"TBD"`, `"..."`, or suspiciously short/generic descriptions).
- **Civil law placeholders**: Same check on `src/lib/civilLawData.js`.
- **Charter placeholders**: Same check on `src/lib/charterData.js`.

#### Config / Docs

- **Stale root .md files**: Identify any root-level `.md` files that appear to be stale audit reports, migration logs, or deployment checklists (by name or content).
- **Unlinked skills**: Check whether any files in the `.claude/skills/` folder tree are not referenced or linked from `.claude/skills/` index or `CLAUDE.md`.
- **CLAUDE.md roadmap accuracy**: Compare the "Roadmap Status" section in `CLAUDE.md` against actual code state — flag any item marked "Completed" that appears missing in code, or any shipped feature not reflected in the roadmap.
- **package.json package manager**: Check whether the `packageManager` field in `package.json` is present and matches the lock file actually in the repo (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`).

#### Performance

- **Uncached endpoints**: Identify which `api/*.js` endpoints (excluding `_`-prefixed internal modules) have **no** Redis caching (`get`/`set` calls via Upstash or similar).
- **Redis operation timeouts**: Check `_rateLimit.js` for whether Redis operations have explicit timeouts (e.g., `AbortSignal.timeout()`, `Promise.race` with a timeout, or a library-level timeout config).

### Phase 3 — Diff Against History

Compare every finding from Phase 2 against the history loaded in Phase 1:

- If a finding matches an issue previously logged as `OPEN` and it **still exists** → tag it `[STILL OPEN]`
- If an issue was previously logged as `OPEN` but the problem is **no longer present** in the code → tag it `[FIXED -- auto-detected]`
- If a finding is **not in the history** at all → tag it `[NEW]`

### Phase 4 — Output Prioritized Action Plan

Group all findings by severity using this rubric:

| Severity | Criteria |
|----------|----------|
| **Critical** | Security vulnerability or production outage risk |
| **High** | Correctness bug or missing test for a core flow |
| **Medium** | Maintainability issue or operational risk |
| **Low** | Cleanup, docs, or tooling improvement |

Output a single markdown table with all findings:

| # | Status | Issue | File:Line | Severity |
|---|--------|-------|-----------|----------|
| 1 | [NEW] | Missing rate limit bucket name in export-pdf.js | api/export-pdf.js:14 | Critical |
| 2 | [STILL OPEN] | No E2E test for CaseSummaryModal | src/components/CaseSummaryModal.jsx | High |

*(The above are examples only — use actual findings.)*

### Phase 5 — Append to AUDIT_LOG.md

Open `.claude/skills/casefinder-audit/AUDIT_LOG.md` and **append** (never overwrite) a new dated section at the end of the file:

```markdown
## Audit — YYYY-MM-DD
### Fixed since last run
- [item description]
### New findings
- [item description] | severity | file:line
### Still open
- [item description] | severity | file:line
```

Use today's date. If there are no items in a subsection, write `- None`.

## Best Practices

### Do

- Run this audit before major deploys or after large feature merges
- Review the action plan table and triage items into your backlog
- Use the AUDIT_LOG.md history to track resolution velocity over time
- Re-run after fixing issues to auto-detect resolutions

### Don't

- Don't use this skill to make code changes — it is read-only
- Don't manually edit AUDIT_LOG.md entries from previous runs
- Don't skip Phase 1 history loading — the diff tracking is the core value
- Don't treat Low-severity items as ignorable — they compound

---

*This skill was created for the CaseDive project (casedive.ca). Maintained by Alasdair NC.*
