---
name: verify
description: Run full verification loop — build, security scan, and E2E tests
allowed_tools: ["Bash", "Read", "Grep", "Glob"]
version: "1.0.0"
rollback: "revert the last change set if build, scan, or tests expose a regression"
observation_hooks:
  - verify: "git diff --stat"
feedback_hooks:
  - on_failure: "fix the failing build, scan finding, or test before considering the change ready"
---

# /verify — Verification Loop

Run after any significant change before pushing.

## Phase 1: Build
```bash
npm run build 2>&1 | tail -20
```
If build fails, STOP and fix.

## Phase 2: Security scan
```bash
npx ecc-agentshield scan
```
Report any new findings.

## Phase 3: E2E Tests
```bash
npx playwright test 2>&1 | tail -30
```
Report pass/fail counts.

## Phase 4: Diff review
```bash
git diff --stat
```
Check for unintended changes.

## Output Format
```
VERIFICATION REPORT
===================
Build:    [PASS/FAIL]
Security: [PASS/FAIL] (score/100)
E2E:      [PASS/FAIL] (X/Y passed)
Diff:     [X files changed]

Overall: [READY / NOT READY] to push
```
