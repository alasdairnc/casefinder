---
name: verify-before-push
description: Full pre-push verification — dev server, unit tests, E2E tests, security scan. Run before any git push to catch regressions without running the full suite unnecessarily.
---

# Verify Before Push

Invoke with `/verify-before-push`. Runs the full verification stack in order: unit tests → E2E → security scan. Aborts on first failure.

## Steps

1. **Start dev server** if not already running:

   ```bash
   lsof -i :3000 | grep LISTEN || npm run dev:api &
   npx wait-on http://localhost:3000 --timeout 30000
   ```

2. **Run unit tests** (fast, no server needed):

   ```bash
   npm run test:unit && npm run test:component
   ```

   Abort if any fail — do not proceed to E2E with broken unit tests.

3. **Run E2E suite** with single worker first:

   ```bash
   npx playwright test --workers=1
   ```

   If failures occur, diagnose before scaling up workers (parallelism can mask real issues).

4. **Run guardrails** (sanitizer + retrieval-failures + hallucination filter):

   ```bash
   npm run test:guardrails
   ```

5. **Report**:
   - Pass: "All checks passed — safe to push."
   - Fail: Name the failing step and the first failing test. Do not push.

## Constraints

- Always use `npm run dev:api` — not `npm run dev`
- Do not modify test files or source code during this skill
- Do not push to git — report only
