---
name: e2e
description: Run Playwright E2E tests safely — starts dev server, waits for ready, runs single-worker first to isolate parallelism issues before scaling up. Use when debugging E2E failures or verifying a feature end-to-end.
---

# E2E Test Runner

Invoke with `/e2e`. Starts the dev server, waits for it to be ready, then runs Playwright with --workers=1 first to rule out concurrency issues.

## Steps

1. **Check server**:

   ```bash
   lsof -i :3000 | grep LISTEN && echo "running" || echo "not running"
   ```

   If not running:

   ```bash
   npm run dev:api &
   npx wait-on http://localhost:3000 --timeout 30000
   ```

2. **Run single-worker pass** to establish a clean baseline:

   ```bash
   npx playwright test --workers=1
   ```

   - If all pass: note count and move to step 3.
   - If failures: diagnose here — single-worker failures are real regressions, not parallelism artifacts.

3. **Run full parallel suite** (only if single-worker passed):

   ```bash
   npm test
   ```

4. **Report**:
   - Grouped: Passed / Failed (with root cause) / Skipped
   - If 10+ tests fail simultaneously → suspect parallelism or a missing server, not individual bugs

5. **Teardown** if you started the server:

   ```bash
   kill $(lsof -ti :3000) 2>/dev/null || true
   ```

## Constraints

- Always use `npm run dev:api`, never `npm run dev`
- Do not modify test files during this skill — diagnose and report only
- Do not declare work done if any test is failing without a confirmed root cause
