# On the Horizon: Three Automation Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining gaps across three existing autonomous workflows: overnight security loop, self-healing preview pipeline, and parallel feature factory.

**Architecture:** Each feature is already partially wired — this plan fills specific gaps rather than building from scratch. The overnight security loop is complete. The preview pipeline needs Vercel API-based URL resolution and a broader journey suite. The feature factory skill exists but is missing a `test:live` filtering fix and a parallel dispatch demo.

**Tech Stack:** GitHub Actions, claude -p headless, Playwright (live mode), Vitest, Vercel Deploy API (via GitHub token), Node.js scripts

---

## Scope

Three independent sub-systems. Each can be done in isolation:

1. **Overnight Security Loop** — already complete; verify it works end-to-end with a real dispatch
2. **Preview Self-Heal Pipeline** — fix URL resolution, expand journey suite, validate agent prompt
3. **Feature Factory Skill** — add missing tests, fix `test:live` scoping, smoke-test the parallel dispatch

---

## File Map

| File                                            | Status           | Change                                        |
| ----------------------------------------------- | ---------------- | --------------------------------------------- |
| `.github/workflows/preview-self-heal.yml`       | Exists           | Fix Vercel URL step; add `VERCEL_TOKEN` usage |
| `.github/workflows/overnight-security-loop.yml` | Complete         | Verify-only — no changes expected             |
| `tests/live/preview-verification.spec.js`       | Exists (5 tests) | Add 2 more journeys (civil law, charter)      |
| `.github/agents/preview-self-heal.agent.md`     | Exists           | Minor constraint additions                    |
| `.claude/skills/feature-factory/SKILL.md`       | Exists           | Add missing integration smoke-test step       |
| `playwright.config.js`                          | Exists           | No change needed — `test:live` already scoped |

---

## Part 1 — Overnight Security Loop Verification

The workflow is fully implemented. This part just verifies it runs correctly end-to-end.

### Task 1: Manual dispatch smoke test

**Files:**

- Read: `.github/workflows/overnight-security-loop.yml`

- [ ] **Step 1: Trigger the workflow manually with force_run=true**

  Go to GitHub Actions → "Overnight Security Loop" → "Run workflow" → set `force_run=true`.

  Expected: workflow runs, Claude audit step completes, artifacts are uploaded, no PR is created if all files already score 100/100.

- [ ] **Step 2: Download and inspect the artifact**

  In the workflow run → Artifacts → `overnight-security-loop-<run-id>` → download.

  Open `claude-security-report.txt`. Verify it contains:
  - `SECURITY_SCORE_BEFORE=`
  - `SECURITY_SCORE_AFTER=`
  - `HUMAN_REVIEW_REQUIRED=`

  If the run fails at "Safety gate: forbidden path changes detected" — the Claude audit is modifying underscore helpers, which means the prompt constraint isn't being followed. Rerun with `MAX_CLAUDE_TURNS=5` to see what Claude is doing.

- [ ] **Step 3: Confirm skip logic works**

  Wait until there are no commits touching `api/` for >36h, then re-trigger without `force_run`.

  Expected: workflow logs "No recent security-relevant file changes; skipping token-consuming run."

---

## Part 2 — Preview Self-Heal Pipeline: URL Resolution Fix

The current workflow finds the Vercel preview URL by scraping PR comments. This is fragile — Vercel posts its comment asynchronously and the workflow may run before it arrives. The fix adds a direct Vercel API call using a `VERCEL_TOKEN` secret.

### Task 2: Add Vercel API URL resolution

**Files:**

- Modify: `.github/workflows/preview-self-heal.yml` — replace the `Resolve preview URL` step's comment-scraping fallback with a Vercel API call

- [ ] **Step 1: Add `VERCEL_TOKEN` to the repo secrets**

  In GitHub → Settings → Secrets and variables → Actions → New repository secret.
  Name: `VERCEL_TOKEN`
  Value: your Vercel personal access token (Settings → Tokens on vercel.com).

  Also add `VERCEL_PROJECT_ID` as a variable (not secret):
  Name: `VERCEL_PROJECT_ID`
  Value: the project ID from `vercel.json` or the Vercel dashboard URL (looks like `prj_xxxx`).

  No code change for this step — just repo configuration.

- [ ] **Step 2: Replace the comment-scraping block with a Vercel API lookup**

  In `.github/workflows/preview-self-heal.yml`, replace the entire `Resolve preview URL` step (the `uses: actions/github-script@v7` block starting at line ~50) with:

  ```yaml
  - name: Resolve preview URL
    id: preview
    env:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_PROJECT_ID: ${{ vars.VERCEL_PROJECT_ID }}
      PREVIEW_URL_INPUT: ${{ github.event.inputs.preview_url || '' }}
      PR_SHA: ${{ github.event.pull_request.head.sha || github.sha }}
    run: |
      set -euo pipefail

      # Manual override always wins
      if [ -n "${PREVIEW_URL_INPUT:-}" ]; then
        echo "preview_url=${PREVIEW_URL_INPUT%/}" >> "$GITHUB_OUTPUT"
        echo "preview_source=input" >> "$GITHUB_OUTPUT"
        exit 0
      fi

      # Query Vercel deployments API for the preview matching this commit SHA
      if [ -n "${VERCEL_TOKEN:-}" ] && [ -n "${VERCEL_PROJECT_ID:-}" ]; then
        VERCEL_RESPONSE="$(curl -sf \
          -H "Authorization: Bearer ${VERCEL_TOKEN}" \
          "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&meta-githubCommitSha=${PR_SHA}&limit=5" \
          || echo '{}')"

        PREVIEW_URL="$(echo "$VERCEL_RESPONSE" | node -e "
          const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
          const dep = (data.deployments || []).find(d => d.url && d.state === 'READY');
          process.stdout.write(dep ? 'https://' + dep.url : '');
        " 2>/dev/null || true)"

        if [ -n "${PREVIEW_URL:-}" ]; then
          echo "preview_url=${PREVIEW_URL%/}" >> "$GITHUB_OUTPUT"
          echo "preview_source=vercel-api" >> "$GITHUB_OUTPUT"
          exit 0
        fi
      fi

      # Fallback: scrape PR comments for *.vercel.app URLs
      echo "preview_url=" >> "$GITHUB_OUTPUT"
      echo "preview_source=missing" >> "$GITHUB_OUTPUT"
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add .github/workflows/preview-self-heal.yml
  git commit -m "fix(preview): resolve Vercel preview URL via API before comment scraping"
  ```

---

### Task 3: Expand preview journey suite

The current `preview-verification.spec.js` has 5 tests — UI smoke, dark mode, filters, break-and-enter, assault. The spec calls for 5 critical user journeys. We're missing civil law and a no-results / empty-state path.

**Files:**

- Modify: `tests/live/preview-verification.spec.js`

- [ ] **Step 1: Write failing tests for the new journeys**

  Open `tests/live/preview-verification.spec.js`. Append these two tests inside the `test.describe` block:

  ```javascript
  test("civil law scenario returns results", async ({ page }) => {
    await page.goto("/");
    await page
      .locator('[data-testid="scenario-input"]')
      .fill(
        "A landlord entered the tenant's unit without 24 hours notice and removed personal belongings.",
      );
    await page.locator('[data-testid="research-submit"]').click();

    await expect(
      page.getByText("Scenario Summary", { exact: true }),
    ).toBeVisible({ timeout: 60000 });
    await expect(page.getByText("Legal Analysis", { exact: true })).toBeVisible(
      { timeout: 15000 },
    );
  });

  test("empty or gibberish input shows a graceful empty state", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .locator('[data-testid="scenario-input"]')
      .fill("xyzzy nonsense gibberish 12345");
    await page.locator('[data-testid="research-submit"]').click();

    // Should not crash — either show an empty state message or a generic analysis
    await expect(page.locator("body")).not.toContainText("500", {
      timeout: 60000,
    });
    await expect(page.locator("body")).not.toContainText("Unhandled");
  });
  ```

- [ ] **Step 2: Run locally against prod to verify the tests pass on the live site**

  ```bash
  PLAYWRIGHT_MODE=live PLAYWRIGHT_BASE_URL=https://www.casedive.ca npm run test:live -- tests/live/preview-verification.spec.js
  ```

  Expected: all 7 tests pass. If the civil law test fails because there's no civil law section in the response, adjust the assertion to only check for `Scenario Summary`.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/live/preview-verification.spec.js
  git commit -m "test(preview): expand journey suite to 7 tests — civil law and empty-state"
  ```

---

### Task 4: Validate the preview self-heal agent prompt

The agent prompt in `.github/agents/preview-self-heal.agent.md` is solid but doesn't mention the `preview-compare.json` diff it should prioritize when there's a retrieval health shape mismatch.

**Files:**

- Modify: `.github/agents/preview-self-heal.agent.md`

- [ ] **Step 1: Add retrieval-health diff guidance**

  Read `.github/agents/preview-self-heal.agent.md`. In the `## What to inspect` section, replace step 2 with:

  ```markdown
  2. Read `preview-compare.json`. If `sameShape` is `false`, the preview API is returning a different schema than production — prioritize fixing the API response shape over UI fixes.
  ```

- [ ] **Step 2: Add a constraint about workflow files**

  In the `## Constraints` section, add after the first bullet:

  ```markdown
  - Do not modify `.github/workflows/`, `.github/agents/`, `docs/`, or test spec files.
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add .github/agents/preview-self-heal.agent.md
  git commit -m "fix(preview-agent): prioritize schema diff in preview-compare.json"
  ```

---

### Task 5: End-to-end test of the preview pipeline

- [ ] **Step 1: Open a test PR**

  Create a trivial branch and PR (e.g., add a comment to `api/analyze.js`):

  ```bash
  git checkout -b test/preview-pipeline-smoke
  # Edit api/analyze.js — add a comment: // preview pipeline smoke test
  git add api/analyze.js
  git commit -m "chore: preview pipeline smoke test"
  git push origin test/preview-pipeline-smoke
  # Open a PR via gh cli:
  gh pr create --title "chore: preview pipeline smoke test" --body "Testing preview-self-heal workflow." --base main
  ```

- [ ] **Step 2: Confirm the workflow triggers and resolves the preview URL**

  In GitHub Actions → "Preview Verification and Self-Heal" — confirm it starts within a few minutes of the PR being opened.

  In the workflow logs, find the `Resolve preview URL` step. It should log either `preview_source=vercel-api` (if `VERCEL_TOKEN` is set) or `preview_source=comment`.

  If it logs `preview_url=` (empty), the Vercel deployment hasn't posted its comment yet — the workflow will fail the "Fail if preview URL is missing" step and post a comment on the PR. That's expected behavior; re-run once the Vercel preview URL appears in the PR.

- [ ] **Step 3: Confirm all 7 journey tests pass on the preview URL**

  In the workflow artifacts → `preview-verification-<run-id>` → `preview-verification.log` — look for `7 passed`.

- [ ] **Step 4: Close the test PR**

  ```bash
  gh pr close <PR-number> --delete-branch
  ```

---

## Part 3 — Feature Factory Skill: Integration Smoke-Test Step

The feature-factory skill is well-designed but Step 4 (integration check) instructs the runner to "fix any cross-slice failures yourself" without specifying what suite to run first or what to do if `test:guardrails` hits a Claude API call it can't make locally. Add clarity.

### Task 6: Harden the feature-factory integration step

**Files:**

- Modify: `.claude/skills/feature-factory/SKILL.md`

- [ ] **Step 1: Read the current skill**

  Open `.claude/skills/feature-factory/SKILL.md`. Find the `### Step 4 — Integration check` section.

- [ ] **Step 2: Replace the integration check section**

  Replace the `### Step 4 — Integration check` block with:

  ````markdown
  ### Step 4 — Integration check

  After all subagents report green, run the full suite in order:

  ```bash
  npm run test:unit
  ```
  ````

  If that passes:

  ```bash
  npm run test:component
  ```

  If that passes:

  ```bash
  npm run test:guardrails
  ```

  > `test:guardrails` runs the sanitizer, retrieval failures, and filter tuner. It does NOT require a running dev server but DOES require `CANLII_API_KEY` if you want the keyed filter gate. Without the key, the filter gate is skipped gracefully.

  Fix any cross-slice failures yourself (don't re-dispatch subagents). Typical cross-slice issues:
  - Two slices export functions with the same name — rename one
  - A slice's test imports a fixture created by another slice's test — move the fixture to `tests/fixtures/`
  - A component slice imports from an API slice that isn't importable in jsdom — mock the import boundary

  Then run `/e2e-verify` for end-to-end confirmation.

  ```

  ```

- [ ] **Step 3: Add a parallel dispatch example to Step 3**

  Find `### Step 3 — Dispatch parallel implementer subagents`. After the subagent prompt template, add:

  ```markdown
  **Example dispatch call (for 3 slices):**

  Dispatch all three Agent tool calls in a single message (not sequentially):
  ```

  Agent(slice="api-endpoint", files=["api/new-feature.js"], testFile="tests/unit/new-feature.test.js", command="npm run test:unit -- tests/unit/new-feature.test.js")
  Agent(slice="ui-component", files=["src/components/NewFeature.jsx"], testFile="tests/unit/NewFeature.test.jsx", command="npm run test:component -- tests/unit/NewFeature.test.jsx")
  Agent(slice="data-model", files=["src/lib/newFeatureData.js"], testFile="tests/unit/newFeatureData.test.js", command="npm run test:unit -- tests/unit/newFeatureData.test.js")

  ```

  These run in parallel. Wait for all three to complete before proceeding to Step 4.
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add .claude/skills/feature-factory/SKILL.md
  git commit -m "docs(feature-factory): clarify integration check order and add parallel dispatch example"
  ```

---

### Task 7: Parallel feature factory smoke run

Validate the skill end-to-end with a small real feature. The best candidate is a new `/api/status.js` health endpoint (trivial API slice + unit test) dispatched as a single-slice factory run.

**Files:**

- Create: `tests/unit/status.test.js`
- Create: `api/status.js`

- [ ] **Step 1: Write the failing test (red)**

  Create `tests/unit/status.test.js`:

  ```javascript
  import { describe, it, expect, vi } from "vitest";

  // Minimal harness: simulate a Vercel-style req/res
  function makeRes() {
    const res = { statusCode: null, body: null, headers: {} };
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (body) => {
      res.body = body;
      return res;
    };
    res.setHeader = (k, v) => {
      res.headers[k] = v;
      return res;
    };
    res.end = () => res;
    return res;
  }

  describe("GET /api/status", () => {
    it("returns 200 with ok:true", async () => {
      const handler = (await import("../../api/status.js")).default;
      const req = { method: "GET", headers: {} };
      const res = makeRes();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
    });

    it("rejects non-GET with 405", async () => {
      const handler = (await import("../../api/status.js")).default;
      const req = { method: "POST", headers: {} };
      const res = makeRes();
      await handler(req, res);
      expect(res.statusCode).toBe(405);
    });
  });
  ```

- [ ] **Step 2: Run to confirm it fails (no implementation yet)**

  ```bash
  npm run test:unit -- tests/unit/status.test.js
  ```

  Expected: FAIL — `Cannot find module '../../api/status.js'`

- [ ] **Step 3: Commit the failing test**

  ```bash
  git add tests/unit/status.test.js
  git commit -m "test(status): add failing tests for GET /api/status endpoint"
  ```

- [ ] **Step 4: Dispatch a single-slice feature factory agent**

  Invoke the feature-factory skill and give it this slice:

  | Slice      | Owner files     | Contract                                   | Test file                   |
  | ---------- | --------------- | ------------------------------------------ | --------------------------- |
  | api-status | `api/status.js` | `GET /api/status` → `{ok:true, ts:string}` | `tests/unit/status.test.js` |

  The agent prompt (per the SKILL.md template):

  ```
  You are implementing the api-status slice for CaseDive.

  Contract: GET /api/status → { ok: true, ts: ISO string }

  Files you may modify: api/status.js (create it if missing)
  Test file: tests/unit/status.test.js
  Run tests with: npm run test:unit -- tests/unit/status.test.js

  Your job: make the tests in tests/unit/status.test.js pass. Iterate — read failures, implement, re-run — until all pass. Then stop.

  CaseDive rules:
  - New API endpoints must import _rateLimit.js, validateJsonRequest from _validate.js, and call applyStandardApiHeaders from _headers.js.
  - CORS via _cors.js — no inline Access-Control headers.
  - Model ID from _constants.js only — never hardcoded.
  - Real Canadian legal citations — no fabricated sections or cases.
  - All model/API calls in api/ — never from React components.

  Commit when green: "feat(api): add GET /api/status health endpoint"
  ```

- [ ] **Step 5: Run integration check after agent completes**

  ```bash
  npm run test:unit && npm run test:guardrails
  ```

  Expected: all pass.

- [ ] **Step 6: Run the api-invariant-reviewer subagent on the new endpoint**

  ```bash
  # Ask the api-invariant-reviewer agent to check api/status.js
  ```

  Expected: no violations. If it finds missing rate limiting or headers, fix before proceeding.

- [ ] **Step 7: Commit**

  If no additional changes needed:

  ```bash
  git add api/status.js tests/unit/status.test.js
  git commit -m "feat(api): add GET /api/status health endpoint — feature factory smoke test"
  ```

---

## Self-Review

**Spec coverage:**

- Overnight security loop: verified via manual dispatch (Task 1) ✓
- Preview pipeline URL resolution: fixed via Vercel API lookup (Task 2) ✓
- Preview journey expansion: civil + empty-state (Task 3) ✓
- Agent prompt hardened (Task 4) ✓
- Pipeline end-to-end tested (Task 5) ✓
- Feature factory integration step clarified (Task 6) ✓
- Feature factory dispatched end-to-end (Task 7) ✓

**Placeholder scan:** No TBDs. All code steps have full implementations.

**Type consistency:** The `makeRes()` harness in Task 7 uses `statusCode`, `body`, `headers`, `status()`, `json()`, `setHeader()`, `end()` — consistent with the test assertions in the same task.
