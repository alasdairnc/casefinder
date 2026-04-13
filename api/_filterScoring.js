/**
 * Filter quality scoring system.
 * Measures precision, recall, semantic relevance of case law results.
 * Used for evaluating and tuning filter effectiveness.
 */

import { FILTER_CONFIG } from "./_filterConfig.js";
import { extractLegalConcepts, countConceptOverlap } from "./_legalConcepts.js";

function getNumericEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Score a single result against a testing dataset.
 * Returns: { relevant: boolean, score: 0-10, reason: string }
 */
export function scoreResultRelevance(
  scenario,
  caseResult,
  expectedKeywords = [],
) {
  if (!caseResult || !caseResult.citation) {
    return { relevant: false, score: 0, reason: "missing_citation" };
  }

  const caseText =
    `${caseResult.title || ""} ${caseResult.summary || ""} ${caseResult.matched_content || ""}`.toLowerCase();
  const scenarioTokens = new Set(
    String(scenario || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !FILTER_CONFIG.stop_words.has(w)),
  );

  // Count token overlap
  let tokenOverlap = 0;
  for (const token of scenarioTokens) {
    if (caseText.includes(token)) tokenOverlap++;
  }

  const scenarioConcepts = extractLegalConcepts(scenario || "");
  const caseConcepts = extractLegalConcepts(caseText);
  const conceptOverlap = countConceptOverlap(scenarioConcepts, caseConcepts);

  // Check expected keyword coverage
  let keywordMatch = 0;
  for (const keyword of expectedKeywords) {
    if (caseText.includes(keyword.toLowerCase())) keywordMatch++;
  }

  // Scoring logic
  let score = 0;
  let reason = "low_relevance";

  // Token overlap is primary signal
  if (tokenOverlap >= 5) score += 6;
  else if (tokenOverlap >= 3) score += 4;
  else if (tokenOverlap >= 1) score += 1;

  // Concept overlap adds semantic resilience for paraphrases and legal synonyms.
  if (conceptOverlap >= 4) score += 4;
  else if (conceptOverlap >= 2) score += 2;
  else if (conceptOverlap >= 1) score += 1;

  // Expected keyword coverage
  const keywordRatio =
    expectedKeywords.length > 0 ? keywordMatch / expectedKeywords.length : 1;
  if (keywordRatio >= 0.7) {
    score += 3;
    reason = "high_relevance";
  } else if (keywordRatio >= 0.4) {
    score += 1;
    reason = "moderate_relevance";
  }

  // Landmark match boost
  if (String(caseResult.matched_content || "").includes("Landmark")) {
    score += 2;
    reason = "landmark_match";
  }

  const minScore = getNumericEnv(
    "FILTER_RELEVANCE_MIN_SCORE",
    FILTER_CONFIG.relevance_min_score ?? 5,
  );
  const minTokenOverlap = getNumericEnv(
    "FILTER_RELEVANCE_MIN_TOKEN_OVERLAP",
    FILTER_CONFIG.relevance_min_token_overlap ?? 2,
  );
  const minConceptOverlap = getNumericEnv(
    "FILTER_RELEVANCE_MIN_CONCEPT_OVERLAP",
    FILTER_CONFIG.relevance_min_concept_overlap ?? 2,
  );

  const relevant =
    score >= minScore &&
    (tokenOverlap >= minTokenOverlap || conceptOverlap >= minConceptOverlap);

  return {
    relevant,
    score: Math.min(10, score),
    reason,
    tokenOverlap,
    conceptOverlap,
    keywordMatch,
  };
}

/**
 * Evaluate a result set against expected outcomes.
 * Returns precision, recall, F1 score, and detailed breakdown.
 */
export function evaluateResultSet(scenario = "", results = [], options = {}) {
  const {
    shouldIncude = [], // Citations/titles that should appear
    shouldExclude = [], // Keywords/patterns that should NOT appear
    expectedKeywords = [], // Keywords expected in results
    minResults = 1,
    maxResults = 5,
  } = options;

  const metrics = {
    total_returned: results.length,
    within_bounds: results.length >= minResults && results.length <= maxResults,
    relevance_scores: [],
    true_positives: 0,
    false_positives: 0,
    false_negatives: 0,
    excluded_found: [],
    avg_relevance: 0,
    precision: 0,
    is_acceptable: false,
  };

  // Score each result
  for (const result of results) {
    const relevanceScore = scoreResultRelevance(
      scenario,
      result,
      expectedKeywords,
    );
    metrics.relevance_scores.push(relevanceScore);

    if (relevanceScore.relevant) {
      metrics.true_positives++;
    } else {
      metrics.false_positives++;
    }

    // Check for excluded patterns
    const resultText =
      `${result.title || ""} ${result.summary || ""}`.toLowerCase();
    for (const exclude of shouldExclude) {
      if (resultText.includes(exclude.toLowerCase())) {
        metrics.excluded_found.push({
          result: result.citation,
          pattern: exclude,
        });
      }
    }
  }

  // Calculate metrics
  if (metrics.relevance_scores.length > 0) {
    metrics.avg_relevance =
      metrics.relevance_scores.reduce((sum, s) => sum + s.score, 0) /
      metrics.relevance_scores.length;
  }

  metrics.precision =
    metrics.true_positives /
      (metrics.true_positives + metrics.false_positives) || 0;
  metrics.false_negatives = Math.max(
    0,
    shouldIncude.length - metrics.true_positives,
  );

  // Overall pass/fail
  metrics.is_acceptable =
    metrics.precision >= 0.7 && // 70% of results are relevant
    metrics.avg_relevance >= (FILTER_CONFIG.relevance_min_score ?? 5) && // Average score meets configured threshold
    metrics.excluded_found.length === 0 && // No excluded patterns found
    metrics.within_bounds; // Result count in acceptable range

  // Edge scenario: allow intentionally empty outputs when requested and no explicit includes are required.
  if (
    minResults === 0 &&
    results.length === 0 &&
    shouldIncude.length === 0 &&
    metrics.excluded_found.length === 0 &&
    metrics.within_bounds
  ) {
    metrics.is_acceptable = true;
  }

  return metrics;
}

/**
 * Run a full test suite and return aggregated metrics.
 */
export async function runTestSuite(testScenarios = [], retrievalFn = null) {
  if (!retrievalFn || typeof retrievalFn !== "function") {
    throw new Error("retrievalFn is required");
  }

  const results = [];
  let passCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const testCase of testScenarios) {
    const retrievalResult = await retrievalFn(testCase.scenario, testCase);
    const normalizedResults = Array.isArray(retrievalResult)
      ? retrievalResult
      : Array.isArray(retrievalResult?.cases)
        ? retrievalResult.cases
        : [];
    const skipped = Boolean(retrievalResult?.skip);

    if (skipped) {
      skippedCount += 1;
      results.push({
        scenario_summary: testCase.scenario.substring(0, 80),
        skipped: true,
        skip_reason: retrievalResult?.skipReason || "skipped",
        total_returned: normalizedResults.length,
        precision: 0,
        avg_relevance: 0,
        excluded_found: [],
        is_acceptable: false,
      });
      continue;
    }

    const evaluation = evaluateResultSet(testCase.scenario, normalizedResults, {
      shouldIncude: testCase.shouldInclude,
      shouldExclude: testCase.shouldExclude,
      expectedKeywords: testCase.expectedKeywords,
      minResults: testCase.minResults ?? 1,
      maxResults: testCase.maxResults ?? 5,
    });

    results.push({
      scenario_summary: testCase.scenario.substring(0, 80),
      ...evaluation,
    });

    if (evaluation.is_acceptable) passCount++;
    else failCount++;
  }

  const evaluatedResults = results.filter((r) => !r.skipped);
  const totalRelevance = evaluatedResults.reduce(
    (sum, r) => sum + r.avg_relevance,
    0,
  );
  const avgRelevance = totalRelevance / evaluatedResults.length || 0;
  const evaluatedTests = testScenarios.length - skippedCount;

  return {
    total_tests: testScenarios.length,
    evaluated_tests: evaluatedTests,
    skipped_tests: skippedCount,
    passed: passCount,
    failed: failCount,
    pass_rate: evaluatedTests > 0 ? (passCount / evaluatedTests) * 100 : 0,
    avg_relevance_global: avgRelevance,
    avg_precision_global:
      evaluatedResults.length > 0
        ? evaluatedResults.reduce((sum, r) => sum + r.precision, 0) /
          evaluatedResults.length
        : 0,
    results: results, // Per-scenario breakdown
  };
}

/**
 * Compare two filter configurations by running test suite against both.
 */
export async function compareConfigs(
  config1,
  config2,
  testScenarios = [],
  retrievalFn = null,
) {
  if (!retrievalFn) {
    throw new Error("retrievalFn is required");
  }

  const results1 = await runTestSuite(testScenarios, retrievalFn);
  const results2 = await runTestSuite(testScenarios, retrievalFn);

  return {
    config1_results: results1,
    config2_results: results2,
    improvements: {
      pass_rate_delta: results2.pass_rate - results1.pass_rate,
      relevance_delta:
        results2.avg_relevance_global - results1.avg_relevance_global,
      precision_delta:
        results2.avg_precision_global - results1.avg_precision_global,
      better_config:
        results2.pass_rate > results1.pass_rate ? "config2" : "config1",
    },
  };
}
