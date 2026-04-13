import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { retrieveVerifiedCaseLaw } from "../api/_caseLawRetrieval.js";
import { RETRIEVAL_FAILURE_SET } from "../tests/unit/retrievalFailureSet.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, "..");
const BASELINE_FILE = ".retrieval-failure-baseline.json";

function createRetrievalFn() {
  return async (scenario, testCase = {}) => {
    const { cases, meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario,
      aiCaseLaw: Array.isArray(testCase.aiCaseLaw) ? testCase.aiCaseLaw : [],
      landmarkMatches: Array.isArray(testCase.landmarkMatches)
        ? testCase.landmarkMatches
        : [],
      maxResults: testCase.maxResults ?? 3,
    });

    return { cases, meta };
  };
}

function evaluateFailureScenario(testCase, cases) {
  const resultText = JSON.stringify(cases);
  const isEmptyExpected = (testCase.maxResults ?? 0) === 0;

  if (isEmptyExpected) {
    const excludedHit = (testCase.shouldExclude || []).find((term) =>
      resultText.includes(term),
    );
    return {
      pass: cases.length === 0 && !excludedHit,
      reason:
        cases.length === 0
          ? "no_direct_case_law"
          : `unexpected_case:${cases[0]?.citation || "unknown"}`,
    };
  }

  const includedHit = (testCase.shouldInclude || []).some((term) =>
    resultText.includes(term),
  );
  const excludedHit = (testCase.shouldExclude || []).find((term) =>
    resultText.includes(term),
  );

  return {
    pass:
      cases.length >= (testCase.minResults || 1) && includedHit && !excludedHit,
    reason: includedHit ? "relevant_case_law" : "missing_expected_case_law",
  };
}

function printSummary(results) {
  console.log("CaseDive Retrieval Failure Loop\n");
  console.log(`Scenarios: ${results.total_tests}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Pass rate: ${results.pass_rate.toFixed(1)}%`);
  console.log(`Avg returned cases: ${results.avg_relevance_global.toFixed(2)}`);
  console.log(`Success ratio: ${results.avg_precision_global.toFixed(2)}\n`);

  const rows = results.results.map((row) => ({
    scenario: row.scenario_summary,
    issue: row.issuePrimary || "unknown",
    results: row.total_returned,
    status: row.skipped
      ? `SKIP (${row.skip_reason || "skipped"})`
      : row.passed
        ? "PASS"
        : "FAIL",
    reason: row.reason || "n/a",
  }));

  console.table(rows);

  const failures = results.results.filter((row) => !row.skipped && !row.passed);
  if (failures.length > 0) {
    console.log("\nFailing scenarios:");
    for (const failure of failures) {
      console.log(
        `- ${failure.scenario_summary} (${failure.reason || "unknown"})`,
      );
    }
  }
}

function readBaseline() {
  const baselinePath = path.join(BASE_DIR, BASELINE_FILE);
  if (!fs.existsSync(baselinePath)) return null;
  return JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
}

function writeBaseline(results) {
  const baselinePath = path.join(BASE_DIR, BASELINE_FILE);
  fs.writeFileSync(baselinePath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\n✓ Baseline saved to ${baselinePath}`);
}

function compareToBaseline(results) {
  const baseline = readBaseline();
  if (!baseline) {
    console.log(
      "\n⚠ No baseline found. Run with --baseline to save one first.",
    );
    return;
  }

  const delta = {
    pass_rate: results.pass_rate - baseline.pass_rate,
    avg_precision: results.avg_precision_global - baseline.avg_precision_global,
    avg_relevance: results.avg_relevance_global - baseline.avg_relevance_global,
    passed: results.passed - baseline.passed,
    failed: results.failed - baseline.failed,
  };

  console.log("\nComparison to baseline:");
  console.log(
    `  Pass rate delta: ${delta.pass_rate >= 0 ? "+" : ""}${delta.pass_rate.toFixed(1)}%`,
  );
  console.log(
    `  Avg precision delta: ${delta.avg_precision >= 0 ? "+" : ""}${delta.avg_precision.toFixed(2)}`,
  );
  console.log(
    `  Avg relevance delta: ${delta.avg_relevance >= 0 ? "+" : ""}${delta.avg_relevance.toFixed(2)}`,
  );
  console.log(`  Passed delta: ${delta.passed >= 0 ? "+" : ""}${delta.passed}`);
  console.log(`  Failed delta: ${delta.failed >= 0 ? "+" : ""}${delta.failed}`);
}

async function main() {
  const args = process.argv.slice(2);
  const doBaseline = args.includes("--baseline");
  const doCompare = args.includes("--compare");
  const retrievalFn = createRetrievalFn();

  const rows = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let totalReturned = 0;

  for (const testCase of RETRIEVAL_FAILURE_SET) {
    const retrievalResult = await retrievalFn(testCase.scenario, testCase);
    const cases = Array.isArray(retrievalResult?.cases)
      ? retrievalResult.cases
      : [];
    const skippedRow = Boolean(retrievalResult?.skip);

    if (skippedRow) {
      skipped += 1;
      rows.push({
        scenario_summary: testCase.scenario.substring(0, 80),
        skipped: true,
        skip_reason: retrievalResult?.skipReason || "skipped",
        total_returned: cases.length,
        passed: false,
        reason: retrievalResult?.skipReason || "skipped",
        issuePrimary:
          retrievalResult?.meta?.issuePrimary || testCase.expectedPrimary,
      });
      continue;
    }

    const verdict = evaluateFailureScenario(testCase, cases);
    totalReturned += cases.length;

    rows.push({
      scenario_summary: testCase.scenario.substring(0, 80),
      skipped: false,
      total_returned: cases.length,
      passed: verdict.pass,
      reason: verdict.reason,
      issuePrimary:
        retrievalResult?.meta?.issuePrimary || testCase.expectedPrimary,
    });

    if (verdict.pass) passed += 1;
    else failed += 1;
  }

  const evaluated = {
    total_tests: RETRIEVAL_FAILURE_SET.length,
    evaluated_tests: RETRIEVAL_FAILURE_SET.length - skipped,
    skipped_tests: skipped,
    passed,
    failed,
    pass_rate:
      RETRIEVAL_FAILURE_SET.length - skipped > 0
        ? (passed / (RETRIEVAL_FAILURE_SET.length - skipped)) * 100
        : 0,
    avg_relevance_global:
      RETRIEVAL_FAILURE_SET.length - skipped > 0
        ? totalReturned / (RETRIEVAL_FAILURE_SET.length - skipped)
        : 0,
    avg_precision_global:
      RETRIEVAL_FAILURE_SET.length - skipped > 0
        ? passed / (RETRIEVAL_FAILURE_SET.length - skipped)
        : 0,
    results: rows,
  };

  printSummary(evaluated);

  if (doCompare) {
    compareToBaseline(evaluated);
  }

  if (doBaseline) {
    writeBaseline(evaluated);
  }

  const hasFailures = evaluated.results.some(
    (row) => !row.skipped && !row.passed,
  );
  process.exitCode = hasFailures ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
