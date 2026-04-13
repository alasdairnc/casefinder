/**
 * Internal filter quality dashboard
 * GET /api/filter-quality
 *
 * Requires RETRIEVAL_HEALTH_TOKEN for auth (same as /api/retrieval-health).
 * Shows current filter configuration, test success rate, and tuning status.
 */

import { randomUUID } from "crypto";
import { FILTER_CONFIG } from "./_filterConfig.js";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "./_rateLimit.js";
import {
  applyStandardApiHeaders,
  handleOptionsAndMethod,
} from "./_apiCommon.js";
import {
  logRequestStart,
  logRateLimitCheck,
  logValidationError,
  logSuccess,
  logError,
} from "./_logging.js";

export default async function handler(req, res) {
  const requestId = req.headers["x-vercel-id"] || randomUUID();
  const startMs = Date.now();
  logRequestStart(req, "filter-quality", requestId);

  applyStandardApiHeaders(req, res, "GET, OPTIONS", "Content-Type");
  if (handleOptionsAndMethod(req, res, "GET")) {
    return;
  }

  const rlResult = await checkRateLimit(getClientIp(req), "filter-quality");
  logRateLimitCheck(requestId, "filter-quality", rlResult, getClientIp(req));
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([key, value]) =>
    res.setHeader(key, value),
  );
  if (!rlResult.allowed) {
    return res
      .status(429)
      .json({ error: "Rate limit exceeded. Please try again later." });
  }

  // Check auth token (same as retrieval-health)
  const token = req.headers.authorization?.replace(/^Bearer\s+/, "");
  const expectedToken = process.env.RETRIEVAL_HEALTH_TOKEN;

  if (!expectedToken || !token || token !== expectedToken) {
    logValidationError(
      requestId,
      "filter-quality",
      "Unauthorized filter quality request",
      "authorization",
    );
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.setHeader("Cache-Control", "max-age=60");

  try {
    // Snapshot current filter config
    const filterSnapshot = {
      timestamp: new Date().toISOString(),
      thresholds: {
        ai_citation_min_token_overlap:
          FILTER_CONFIG.ai_citation_min_token_overlap,
        final_case_min_token_overlap:
          FILTER_CONFIG.final_case_min_token_overlap,
        base_points_per_token: FILTER_CONFIG.base_points_per_token,
      },
      stop_words_count: FILTER_CONFIG.stop_words.size,
      issue_patterns_count: Object.keys(FILTER_CONFIG.issue_patterns).length,
      ranking_boosts: Object.keys(FILTER_CONFIG.ranking_boost).length,
      max_results_default: FILTER_CONFIG.max_results_default,
    };

    // Build issue patterns summary (for dashboard display)
    const issuePatternsSummary = Object.entries(
      FILTER_CONFIG.issue_patterns,
    ).map(([key, config]) => ({
      id: key,
      primary: config.primary,
      sub_issues_count: config.sub_issues.length,
    }));

    // Landmark boost status
    const landmarkBoostActive = FILTER_CONFIG.ranking_boost.landmark_match > 0;

    // Response payload
    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
      filters: {
        configuration: filterSnapshot,
        issue_patterns: issuePatternsSummary,
        landmark_boost_active: landmarkBoostActive,
      },
      testing: {
        test_suite_available: true,
        test_scenarios_count: 16, // From filterTuning.test.js
        auto_tuning_script: "scripts/tune-filters.js",
        commands: [
          "node scripts/tune-filters.js --baseline      # Save baseline metrics",
          "node scripts/tune-filters.js --compare       # Compare to baseline",
          "node scripts/tune-filters.js --report        # Generate HTML report",
        ],
      },
      metrics_notes: [
        "Precision: % of returned cases that match core issue",
        "Recall: % of all relevant cases that are returned",
        "Semantic relevance: 0-10 score based on tag alignment",
        "Target pass rate: >85% across all test scenarios",
      ],
      tuning_guide: {
        if_low_precision: [
          "Increase final_case_min_token_overlap (current: " +
            FILTER_CONFIG.final_case_min_token_overlap +
            ")",
          "Add more domain-specific stop words to FILTER_CONFIG.stop_words",
          "Review and expand issue_patterns sub_issues lists",
        ],
        if_false_positives: [
          "Increase ai_citation_min_token_overlap threshold",
          "Add keyword patterns to shouldExclude in test scenarios",
          "Check ranking_boost weights for over-aggressive scores",
        ],
        if_too_few_results: [
          "Decrease min_token_overlap thresholds",
          "Expand issue_patterns or add new patterns for niche scenarios",
          "Review landmark matching in MASTER_CASE_LAW_DB",
        ],
      },
    };

    logSuccess(
      requestId,
      "filter-quality",
      200,
      Date.now() - startMs,
      rlResult,
      {
        issuePatterns: issuePatternsSummary.length,
      },
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error("Filter quality endpoint error:", error);
    logError(requestId, "filter-quality", error, 500, Date.now() - startMs);
    return res.status(500).json({ error: "Internal server error" });
  }
}
