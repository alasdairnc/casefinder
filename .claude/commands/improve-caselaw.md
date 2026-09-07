---
name: improve-caselaw
description: Run the propose-only caselaw-relevance improvement loop and interpret the digest
allowed_tools: ["Read", "Bash", "Grep", "Glob"]
version: "1.0.0"
rollback: "this command never edits filter/threshold files; nothing to roll back. If a baseline was refreshed, `git checkout -- .retrieval-failure-baseline.json` to restore."
observation_hooks:
  - verify: "ls -t reports/retrieval-autofix/improve-*.md 2>/dev/null | head -1 | xargs -r cat"
feedback_hooks:
  - on_failure: "inspect the latest digest in reports/retrieval-autofix/ and re-run `npm run improve:caselaw` to identify which stage failed (collect/propose/evaluate/report)"
---

# /improve-caselaw — Continuous caselaw-relevance loop (propose-only)

A thin orchestrator over the existing retrieval scripts. It **never** edits
`api/_filter*.js` or thresholds — it only surfaces human-reviewed proposals.

## Step 1: Run the loop

```bash
npm run improve:caselaw
```

This chains, in order:

1. **collect** — `collect-production-no-caselaw.js` pulls recent "no caselaw"
   failures from production (`https://casedive.ca/api/retrieval-health`).
2. **propose** — when failures ≥ `MIN_AUTOFIX_FAILURES` (default 25), runs the
   autofix planner to write a filter-config PLAN to
   `reports/retrieval-autofix/autofix-plan.md`. **Never `--apply`.**
3. **evaluate** — runs the offline retrieval-failure corpus as a regression
   gate. Auto-establishes/refreshes `.retrieval-failure-baseline.json` when the
   corpus size changes; otherwise compares and flags a drop in passed count.
4. **report** — refreshes the filter-quality report **only if `CANLII_API_KEY`
   is set** (skipped + noted otherwise).

It writes a dated digest to `reports/retrieval-autofix/improve-<date>.md` and
exits non-zero **only on a real regression**.

## Step 2: Read the digest

Open `reports/retrieval-autofix/improve-<date>.md` and report its **Status**:

- 🟢 **STABLE / NO FUEL** — nothing to do; either no prod failures or no change.
- 🟡 **ACTION SUGGESTED** — a fix is proposed or there is prod fuel; see step 3.
- 🔴 **REGRESSION** — offline corpus pass count dropped vs baseline; investigate
  recent `_filter*` / `_scenarioClassification` / legal-data changes first.

## Step 3: Act on proposals (human-gated)

Only when the user explicitly asks to apply a fix:

1. Read `reports/retrieval-autofix/autofix-plan.md`.
2. Apply with `node scripts/apply-retrieval-autofix.js --report <file> --apply`.
3. Run the **`retrieval-regression-detector`** agent, then **`advisor()`**, then
   `npm run test:guardrails` before any commit/push (per CLAUDE.md gates).

## Notes

- No fuel? Production may simply have no recorded no-caselaw events. The system
  is valid but idle until traffic generates failures.
- Set `CANLII_API_KEY` to make the live filter-quality corpus meaningful.
- Cadence: run weekly, or wire `npm run improve:caselaw` into a scheduled agent.
