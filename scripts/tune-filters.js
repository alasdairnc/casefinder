/**
 * Auto-tuning script for case law filters.
 * Runs test scenarios, measures performance, suggests improvements.
 *
 * Usage:
 *   node scripts/tune-filters.js [--compare] [--report]
 *   node scripts/tune-filters.js --baseline    # Save baseline metrics
 *   node scripts/tune-filters.js --compare     # Compare to baseline
 *   node scripts/tune-filters.js --report      # Generate HTML report
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { retrieveVerifiedCaseLaw } from "../api/_caseLawRetrieval.js";
import { MASTER_CASE_LAW_DB } from "../src/lib/caselaw/index.js";
import { FILTER_CONFIG } from "../api/_filterConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, "..");

let cachedCanliiKey = null;

function readEnvFileKey(filePath, keyName) {
  if (!fs.existsSync(filePath)) return "";
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const envKey = line.slice(0, eqIndex).trim();
    if (envKey !== keyName) continue;
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return "";
}

function getCanliiApiKey() {
  if (cachedCanliiKey !== null) return cachedCanliiKey;

  const fromProcess = process.env.CANLII_API_KEY || "";
  if (fromProcess) {
    cachedCanliiKey = fromProcess;
    return cachedCanliiKey;
  }

  const envLocalPath = path.join(BASE_DIR, ".env.local");
  const envPath = path.join(BASE_DIR, ".env");
  const fromEnvLocal = readEnvFileKey(envLocalPath, "CANLII_API_KEY");
  const fromEnv = readEnvFileKey(envPath, "CANLII_API_KEY");
  const resolved = fromEnvLocal || fromEnv || "";

  if (resolved) {
    process.env.CANLII_API_KEY = resolved;
  }

  cachedCanliiKey = resolved;
  return cachedCanliiKey;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !FILTER_CONFIG.stop_words.has(token));
}

function scoreLandmarkCase(scenario, caseLaw) {
  const scenarioText = String(scenario || "").toLowerCase();
  const scenarioTokens = new Set(tokenize(scenarioText));
  let score = 0;

  for (const tag of caseLaw.tags || []) {
    if (scenarioText.includes(String(tag || "").toLowerCase())) score += 10;
  }

  const tagTokens = new Set();
  for (const tag of caseLaw.tags || []) {
    String(tag || "")
      .toLowerCase()
      .split(/\s+/)
      .forEach((token) => tagTokens.add(token));
  }
  for (const topic of caseLaw.topics || []) {
    String(topic || "")
      .toLowerCase()
      .split(/\s+/)
      .forEach((token) => tagTokens.add(token));
  }
  String(caseLaw.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .forEach((token) => tagTokens.add(token));

  for (const token of scenarioTokens) {
    if (tagTokens.has(token)) score += 3;
  }

  const normalizedTitle = String(caseLaw.title || "").toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const normalizedScenario = scenarioText.replace(/[^a-z0-9\s]/g, "");
  if (normalizedScenario.includes(normalizedTitle) && normalizedTitle) score += 20;

  return score;
}

function buildLandmarkMatches(scenario, limit = 3) {
  return [...MASTER_CASE_LAW_DB]
    .map((caseLaw) => ({ caseLaw, score: scoreLandmarkCase(scenario, caseLaw) }))
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.caseLaw);
}

async function realRetrievalFn(scenario, testCase = {}) {
  const apiKey = getCanliiApiKey();
  const landmarkMatches = buildLandmarkMatches(scenario, testCase.maxResults || 3);
  const aiCaseLaw = landmarkMatches.map((caseLaw) => ({
    citation: caseLaw.citation,
    title: caseLaw.title,
    summary: [caseLaw.ratio, ...(caseLaw.tags || []), ...(caseLaw.topics || [])].filter(Boolean).join(" "),
  }));

  if (!apiKey) {
    if (aiCaseLaw.length === 0) {
      return {
        cases: [],
        skip: true,
        skipReason: "no_local_landmark_coverage",
      };
    }

    return {
      cases: aiCaseLaw.map((candidate) => ({
      citation: candidate.citation,
      title: candidate.title,
      summary: candidate.summary,
      court: "",
      year: "",
      url_canlii: "",
      matched_content: "Local landmark fallback",
      verificationStatus: "verified",
      })),
    };
  }

  const { cases } = await retrieveVerifiedCaseLaw({
    scenario,
    filters: testCase.filters || {},
    aiSuggestions: [],
    aiCaseLaw,
    landmarkMatches,
    criminalCode: [],
    apiKey,
    maxResults: testCase.maxResults || 3,
  });
  return Array.isArray(cases) ? { cases } : { cases: [] };
}

// Load and prepare scoring utilities
async function loadScoringTools() {
  const scenariosMod = await import("../tests/unit/filterScenarios.js");
  const scoringMod = await import("../api/_filterScoring.js");
  const TEST_SCENARIOS = scenariosMod.TEST_SCENARIOS || [];
  const { runTestSuite, evaluateResultSet } = scoringMod;
  return { TEST_SCENARIOS, runTestSuite, evaluateResultSet };
}

/**
 * Analyze test results and suggest filter improvements
 */
function suggestImprovements(testResults) {
  const evaluatedResults = testResults.results.filter((r) => !r.skipped);

  if (evaluatedResults.length === 0) {
    return [
      {
        priority: "HIGH",
        issue: "No evaluable scenarios",
        details: "All scenarios were skipped due to missing local coverage or retrieval data.",
        recommendation: "Set CANLII_API_KEY to run full retrieval-backed evaluation.",
      },
    ];
  }

  const suggestions = [];

  // Identify consistently failing scenarios
  const failingScenarios = evaluatedResults
    .filter(r => !r.is_acceptable)
    .sort((a, b) => a.precision - b.precision);

  if (failingScenarios.length > 0) {
    suggestions.push({
      priority: "HIGH",
      issue: `${failingScenarios.length} test scenarios failing`,
      details: failingScenarios.slice(0, 3).map(r => r.scenario_summary),
      recommendation: "Review issue detection patterns or ranking thresholds",
    });
  }

  // Alert on low precision
  const lowPrecisionCases = evaluatedResults.filter(r => r.precision < 0.6);
  if (lowPrecisionCases.length > evaluatedResults.length * 0.2) {
    suggestions.push({
      priority: "HIGH",
      issue: "Low precision across multiple scenarios",
      details: `${lowPrecisionCases.length} cases with precision < 0.6`,
      recommendation:
        "Increase min_token_overlap threshold or expand stop_words list to filter noise",
    });
  }

  // Alert on low relevance
  if (testResults.avg_relevance_global < 6) {
    suggestions.push({
      priority: "MEDIUM",
      issue: "Average semantic relevance below threshold",
      details: `Current avg: ${testResults.avg_relevance_global.toFixed(2)}/10`,
      recommendation: "Add more issue-specific keywords to semantic filtering",
    });
  }

  // False positives in excluded patterns
  const excludedFound = evaluatedResults.filter(r => r.excluded_found.length > 0);
  if (excludedFound.length > 0) {
    suggestions.push({
      priority: "MEDIUM",
      issue: "Excluded patterns found in results",
      details: excludedFound.map(
        r => `${r.scenario_summary}: ${r.excluded_found.map(e => e.pattern).join(", ")}`
      ),
      recommendation: "Review ranking boosts or add more exclude patterns to test cases",
    });
  }

  return suggestions;
}

/**
 * Generate HTML report
 */
function generateHtmlReport(testResults, suggestions, filename = "filter-quality-report.html") {
  const timestamp = new Date().toISOString();
  const passRate = testResults.pass_rate.toFixed(1);
  const avgRelevance = testResults.avg_relevance_global.toFixed(2);
  const avgPrecision = testResults.avg_precision_global.toFixed(2);

  const resultsRows = testResults.results
    .map(
      r => `
    <tr class="${r.skipped ? "skip" : r.is_acceptable ? "pass" : "fail"}">
      <td>${r.scenario_summary}</td>
      <td>${r.precision.toFixed(2)}</td>
      <td>${r.avg_relevance.toFixed(2)}</td>
      <td>${r.total_returned}</td>
      <td>${r.skipped ? "- SKIP" : r.is_acceptable ? "✓ PASS" : "✗ FAIL"}</td>
    </tr>
  `
    )
    .join("");

  const suggestionsRows = suggestions
    .map(
      s => `
    <div class="suggestion ${s.priority.toLowerCase()}">
      <h4>${s.priority}: ${s.issue}</h4>
      <p><strong>Details:</strong> ${Array.isArray(s.details) ? s.details.join("<br>") : s.details}</p>
      <p><strong>Recommendation:</strong> ${s.recommendation}</p>
    </div>
  `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CaseDive Filter Quality Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 20px; background: #f5f5f5; }
    .header { background: #2c2825; color: #faf7f2; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    h1 { margin: 0; font-size: 24px; }
    .timestamp { font-size: 12px; opacity: 0.8; margin-top: 10px; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .metric { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #d4a040; }
    .metric-value { font-size: 28px; font-weight: bold; color: #d4a040; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
    th { background: #f0f0f0; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    tr.pass { background: #f0fef0; }
    tr.fail { background: #fef0f0; }
    tr.skip { background: #f5f7fb; }
    .suggestion { margin-bottom: 15px; padding: 15px; border-radius: 8px; border-left: 4px solid; }
    .suggestion.high { border-color: #d32f2f; background: #ffebee; }
    .suggestion.medium { border-color: #f57c00; background: #fff3e0; }
    .suggestion.low { border-color: #fbc02d; background: #fffde7; }
    h4 { margin: 0 0 10px 0; }
    p { margin: 5px 0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CaseDive Filter Quality Report</h1>
    <div class="timestamp">Generated ${timestamp}</div>
  </div>

  <div class="metrics">
    <div class="metric">
      <div class="metric-value">${passRate}%</div>
      <div class="metric-label">Pass Rate</div>
    </div>
    <div class="metric">
      <div class="metric-value">${testResults.passed}/${testResults.evaluated_tests}</div>
      <div class="metric-label">Tests Passed</div>
    </div>
    <div class="metric">
      <div class="metric-value">${avgRelevance}</div>
      <div class="metric-label">Avg Relevance (0-10)</div>
    </div>
    <div class="metric">
      <div class="metric-value">${avgPrecision}</div>
      <div class="metric-label">Avg Precision</div>
    </div>
  </div>

  <h2>Test Results</h2>
  <table>
    <thead>
      <tr>
        <th>Scenario</th>
        <th>Precision</th>
        <th>Relevance</th>
        <th>Results</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${resultsRows}
    </tbody>
  </table>

  <h2 style="margin-top: 30px;">Improvement Suggestions</h2>
  ${suggestionsRows || '<p style="color: #666;">✓ All tests passing – no improvements needed at this time.</p>'}

  <div style="margin-top: 30px; padding: 15px; background: #f0f0f0; border-radius: 8px; font-size: 12px; color: #666;">
    This report evaluates filter effectiveness across ${testResults.total_tests} test scenarios.
    Results are ranked by relevance and precision. Adjust thresholds in <code>api/_filterConfig.js</code> based on suggestions above.
  </div>
</body>
</html>
  `;

  const reportPath = path.join(BASE_DIR, filename);
  fs.writeFileSync(reportPath, html, "utf-8");
  console.log(`✓ Report written to: ${reportPath}`);
  return reportPath;
}

/**
 * Save baseline metrics for comparison
 */
function saveBaseline(testResults, filename = ".filter-baseline.json") {
  const baselinePath = path.join(BASE_DIR, filename);
  fs.writeFileSync(baselinePath, JSON.stringify(testResults, null, 2), "utf-8");
  console.log(`✓ Baseline saved to: ${baselinePath}`);
}

/**
 * Load and compare to baseline
 */
function compareToBaseline(newResults, filename = ".filter-baseline.json") {
  const baselinePath = path.join(BASE_DIR, filename);

  if (!fs.existsSync(baselinePath)) {
    console.log("⚠ No baseline found. Run with --baseline to create one.");
    return null;
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));

  return {
    pass_rate_delta: newResults.pass_rate - baseline.pass_rate,
    avg_relevance_delta: newResults.avg_relevance_global - baseline.avg_relevance_global,
    avg_precision_delta: newResults.avg_precision_global - baseline.avg_precision_global,
    tests_fixed: newResults.passed - baseline.passed,
    better: newResults.pass_rate > baseline.pass_rate ? "YES ✓" : "NO ✗",
  };
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const doBaseline = args.includes("--baseline");
  const doCompare = args.includes("--compare");
  const doReport = args.includes("--report") || !args.length;

  console.log("CaseDive Filter Tuning System\n");

  try {
    const { TEST_SCENARIOS, runTestSuite } = await loadScoringTools();
    console.log(`Loaded ${TEST_SCENARIOS.length} test scenarios`);
    console.log("Using shared retrieval helper: api/_caseLawRetrieval.js");
    if (!getCanliiApiKey()) {
      console.log("Warning: CANLII_API_KEY is not set; using local landmark fallback mode.");
    }

    // Run test suite with the real retrieval endpoint
    console.log("Running test suite...");
    const testResults = await runTestSuite(TEST_SCENARIOS, realRetrievalFn);

    console.log(`\n📊 Results:
  Pass Rate: ${testResults.pass_rate.toFixed(1)}%
  Passed: ${testResults.passed}/${testResults.evaluated_tests}
  Evaluated: ${testResults.evaluated_tests}
  Skipped: ${testResults.skipped_tests}
  Avg Relevance: ${testResults.avg_relevance_global.toFixed(2)}/10
  Avg Precision: ${testResults.avg_precision_global.toFixed(2)}`);

    // Compare to baseline if requested
    if (doCompare) {
      const comparison = compareToBaseline(testResults);
      if (comparison) {
        console.log(`\n📈 Comparison to baseline:
  Pass Rate Delta: ${comparison.pass_rate_delta > 0 ? "+" : ""}${comparison.pass_rate_delta.toFixed(1)}%
  Tests Fixed: ${comparison.tests_fixed}
  Improved: ${comparison.better}`);
      }
    }

    // Save baseline if requested
    if (doBaseline) {
      saveBaseline(testResults);
    }

    // Generate suggestions and report
    const suggestions = suggestImprovements(testResults);
    if (suggestions.length > 0) {
      console.log(`\n💡 Suggestions (${suggestions.length} found):`);
      suggestions.forEach(s => {
        console.log(`  [${s.priority}] ${s.issue}`);
      });
    }

    if (doReport) {
      generateHtmlReport(testResults, suggestions);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
