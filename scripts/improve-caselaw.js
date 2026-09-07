#!/usr/bin/env node
// scripts/improve-caselaw.js
// Propose-only caselaw RELEVANCE loop ("make the caselaw more relevant").
//
// Thin orchestrator over the existing retrieval scripts. It NEVER edits
// api/_filter*.js, thresholds, or any corpus file — it only surfaces
// human-reviewed proposals and acts as a regression gate.
//
// Chains, in order:
//   1. collect   — pull recent production "no caselaw" failures
//   2. propose   — when failures >= MIN_AUTOFIX_FAILURES, write a filter PLAN
//                  (never --apply)
//   3. evaluate  — run the offline retrieval-failure corpus as a regression gate
//   4. report    — refresh the filter-quality report (only if CANLII_API_KEY)
//
// Writes a dated digest to reports/retrieval-autofix/improve-<date>.md.
// Exits non-zero ONLY on a real offline regression.

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const OUT_DIR = "reports/retrieval-autofix";
const MIN_AUTOFIX_FAILURES = Number(process.env.MIN_AUTOFIX_FAILURES || 25);
const dateTag = new Date().toISOString().slice(0, 10);

// Token bridge: the collector authenticates to /api/retrieval-health via
// RETRIEVAL_HEALTH_TOKEN, but the project stores the token in the
// `.retrieval-health-token` file (same one /retrieval-health uses). Load it into
// env so a local/scheduled run authenticates without manual setup. (CI sets the
// env var directly, so this only fires when the file exists and env is empty.)
(function bridgeRetrievalHealthToken() {
  if (process.env.RETRIEVAL_HEALTH_TOKEN) return;
  try {
    const tokenPath = path.resolve(process.cwd(), ".retrieval-health-token");
    if (fs.existsSync(tokenPath)) {
      const token = fs.readFileSync(tokenPath, "utf8").trim();
      if (token) process.env.RETRIEVAL_HEALTH_TOKEN = token;
    }
  } catch {
    /* non-fatal: collector will report INPUT UNREACHABLE if it can't auth */
  }
})();

function run(cmd, cmdArgs) {
  const res = spawnSync(cmd, cmdArgs, {
    encoding: "utf8",
    env: process.env,
    timeout: 180000,
  });
  return {
    code: res.status ?? 1,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
  };
}

function node(script, scriptArgs = []) {
  return run("node", [script, ...scriptArgs]);
}

// ── 1. collect ────────────────────────────────────────────────────────────────
function collect() {
  const r = node("scripts/collect-production-no-caselaw.js", [
    "--out-dir",
    OUT_DIR,
  ]);
  const jsonPath = path.join(OUT_DIR, `daily-${dateTag}.json`);
  let payload = null;
  if (fs.existsSync(jsonPath)) {
    try {
      payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch {
      /* ignore */
    }
  }
  const events =
    payload?.events || payload?.failures || payload?.samples || [];
  const fetchError =
    payload?.error ||
    (r.code !== 0 && /unreachable|ERROR|failed/i.test(r.stdout + r.stderr)
      ? "production retrieval-health endpoint unreachable"
      : null);
  return { jsonPath, count: events.length, fetchError, raw: r };
}

// ── 2. propose (never apply) ────────────────────────────────────────────────
function propose(collectResult) {
  if (collectResult.count < MIN_AUTOFIX_FAILURES) {
    return {
      proposed: false,
      message: `below min failures (${collectResult.count} < ${MIN_AUTOFIX_FAILURES}) — no plan proposed`,
    };
  }
  const r = node("scripts/apply-retrieval-autofix.js", [
    "--report",
    collectResult.jsonPath,
  ]);
  return {
    proposed: r.code === 0,
    message:
      r.code === 0
        ? `plan written to ${OUT_DIR}/autofix-plan.md (NOT applied)`
        : `planner exited ${r.code}`,
  };
}

// ── 3. evaluate (regression gate) ───────────────────────────────────────────
function evaluate() {
  const baselinePath = path.resolve(process.cwd(), ".retrieval-failure-baseline.json");
  if (!fs.existsSync(baselinePath)) {
    // Establish a baseline on first run; not a regression.
    const r = node("scripts/evaluate-retrieval-failures.js", ["--baseline"]);
    return {
      mode: "baseline-established",
      regression: false,
      summary: parseEval(r.stdout),
      passedDelta: 0,
    };
  }
  const r = node("scripts/evaluate-retrieval-failures.js", ["--compare"]);
  const summary = parseEval(r.stdout);
  const passedDeltaMatch = r.stdout.match(/Passed delta:\s*([+-]?\d+)/);
  const passedDelta = passedDeltaMatch ? Number(passedDeltaMatch[1]) : 0;
  return {
    mode: "compared",
    regression: passedDelta < 0,
    summary,
    passedDelta,
  };
}

function parseEval(stdout) {
  const passed = stdout.match(/Passed:\s*(\d+)/);
  const failed = stdout.match(/Failed:\s*(\d+)/);
  const rate = stdout.match(/Pass rate:\s*([\d.]+)%/);
  return {
    passed: passed ? Number(passed[1]) : null,
    failed: failed ? Number(failed[1]) : null,
    passRate: rate ? Number(rate[1]) : null,
  };
}

// ── 4. filter-quality report (key-gated) ────────────────────────────────────
function report() {
  if (!process.env.CANLII_API_KEY) {
    return { ran: false, message: "skipped (CANLII_API_KEY not set — corpus eval would be hollow)" };
  }
  const r = node("scripts/tune-filters.js", ["--report"]);
  return {
    ran: r.code === 0,
    message: r.code === 0 ? "filter-quality report refreshed" : `tune-filters exited ${r.code}`,
  };
}

// ── digest ───────────────────────────────────────────────────────────────────
function renderDigest({ collectResult, proposal, evalResult, reportResult }) {
  let status;
  if (evalResult.regression) status = "🔴 REGRESSION";
  else if (collectResult.fetchError) status = "⚠ INPUT UNREACHABLE";
  else if (proposal.proposed || collectResult.count >= MIN_AUTOFIX_FAILURES)
    status = "🟡 ACTION SUGGESTED";
  else status = "🟢 STABLE / NO FUEL";

  const L = [];
  L.push(`# Caselaw relevance — improvement digest (${dateTag})`);
  L.push("");
  L.push(`**Status:** ${status}`);
  L.push("");
  L.push("_Propose-only run. No filter or threshold files were modified._");
  L.push("");
  L.push("## 1. Production fuel (no-caselaw failures)");
  L.push(`- Failures collected: **${collectResult.count}**`);
  if (collectResult.fetchError) {
    L.push(`- ⚠ Fetch error: \`${collectResult.fetchError}\``);
    L.push(
      "- Could **not** reach the production retrieval-health endpoint, so fuel was **not assessed** this run.",
    );
  }
  L.push("");
  L.push("## 2. Proposed autofix plan");
  L.push(`- ${proposal.message}`);
  L.push(
    "- Plans are **never auto-applied.** A human applies with `node scripts/apply-retrieval-autofix.js --report <f> --apply` only after review.",
  );
  L.push("");
  L.push("## 3. Offline relevance gate (retrieval-failure corpus)");
  L.push(`- Mode: ${evalResult.mode}`);
  if (evalResult.summary.passed != null) {
    L.push(
      `- Pass rate: **${evalResult.summary.passRate}%** (passed ${evalResult.summary.passed}, failed ${evalResult.summary.failed})`,
    );
  }
  L.push(`- passed delta vs baseline: ${evalResult.passedDelta >= 0 ? "+" : ""}${evalResult.passedDelta}`);
  if (evalResult.regression) {
    L.push("- 🔴 **Pass count dropped vs baseline — investigate recent `_filter*` / `_scenarioClassification` / legal-data changes first.**");
  }
  L.push("");
  L.push("## 4. Filter-quality report");
  L.push(`- ${reportResult.message}`);
  L.push("");
  L.push("## Human next steps");
  if (evalResult.regression) {
    L.push("1. **Regression** — `git log` the retrieval files; run `retrieval-regression-detector`, then `advisor()`.");
  } else if (collectResult.fetchError) {
    L.push("1. **Input unreachable** — re-run the collector from an environment with egress to `www.casedive.ca`.");
  } else if (proposal.proposed) {
    L.push("1. Review `reports/retrieval-autofix/autofix-plan.md`; apply only with explicit intent.");
  } else {
    L.push("1. Nothing required — system stable/idle.");
  }
  if (!process.env.CANLII_API_KEY) {
    L.push("2. Set `CANLII_API_KEY` locally to enable the live filter-quality corpus (section 4).");
  }
  L.push(`${process.env.CANLII_API_KEY ? "2" : "3"}. Re-run anytime with \`npm run improve:caselaw\`.`);
  L.push("");
  return L.join("\n");
}

// ── main ─────────────────────────────────────────────────────────────────────
function main() {
  fs.mkdirSync(path.resolve(process.cwd(), OUT_DIR), { recursive: true });

  const collectResult = collect();
  const proposal = propose(collectResult);
  const evalResult = evaluate();
  const reportResult = report();

  const md = renderDigest({ collectResult, proposal, evalResult, reportResult });
  const mdPath = path.join(OUT_DIR, `improve-${dateTag}.md`);
  fs.writeFileSync(mdPath, md);

  process.stdout.write(
    `caselaw relevance: ${collectResult.count} failures, eval ${evalResult.mode} ` +
      `(passed delta ${evalResult.passedDelta}) → ${path.relative(process.cwd(), mdPath)}\n`,
  );

  // Non-zero ONLY on a real offline regression.
  process.exit(evalResult.regression ? 1 : 0);
}

main();
