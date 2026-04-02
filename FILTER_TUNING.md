# Filter Tuning System – Complete Guide

## Overview

CaseDive now has a **fully planned, testable, and auto-tunable** case law filtering system. This document explains how it works and how to use it.

## Architecture

### 1. **Filter Configuration** (`api/_filterConfig.js`)
Central hub for all tuning parameters. No hard-coded thresholds scattered across code.

**Key parameters:**
- `ai_citation_min_token_overlap`: Min scenario tokens for AI suggestions (default: 2)
- `final_case_min_token_overlap`: Min scenario tokens for final results (default: 3)
- `stop_words`: Noise tokens removed from ranking (set of ~50 words)
- `issue_patterns`: Regex patterns + sub-issue keywords for 8+ legal categories
- `ranking_boost`: Points for SCC cases, recent cases, landmark matches, etc.

**Usage:**
```javascript
import { FILTER_CONFIG, updateConfig, getConfig } from "./api/_filterConfig.js";

// Read a threshold
const minOverlap = getConfig("ai_citation_min_token_overlap");

// Update at runtime (for testing)
updateConfig({
  ai_citation_min_token_overlap: 3,
  final_case_min_token_overlap: 4,
});

// Reset to defaults
resetConfig();
```

### 2. **Filter Scoring System** (`api/_filterScoring.js`)
Measures and evaluates filter effectiveness using multiple metrics.

**Key Functions:**
- `scoreResultRelevance()`: Score a single case (0-10) against scenario
- `evaluateResultSet()`: Judge a result set → precision, recall, F1, pass/fail
- `runTestSuite()`: Run all test scenarios and aggregate metrics
- `compareConfigs()`: A/B test two configurations against test suite

**Example:**
```javascript
import { evaluateResultSet, runTestSuite } from "./api/_filterScoring.js";

const metrics = evaluateResultSet(
  scenario,
  casesReturned,
  {
    expectedKeywords: ["charter", "s. 9", "detention"],
    shouldExclude: ["theft", "robbery"],
    minResults: 1,
    maxResults: 5,
  }
);

if (metrics.is_acceptable) {
  console.log("✓ Test passed");
  console.log(`Precision: ${metrics.precision.toFixed(2)}`);
} else {
  console.log("✗ Test failed");
}
```

### 3. **Test Suite** (`tests/unit/filterTuning.test.js`)
16+ realistic scenarios covering all major legal issues.

**Each test defines:**
- `scenario`: User's legal question
- `expectedPrimary`: Core issue category (e.g., "impaired_driving")
- `expectedKeywords`: Keywords that should appear in results
- `shouldInclude`: Citations/topics that should appear
- `shouldExclude`: Cases/keywords that should NOT appear
- `minResults`, `maxResults`: Expected result count range

**Coverage:**
- ✓ Impaired driving (2 scenarios)
- ✓ Assault with bodily harm (2 scenarios)
- ✓ Assault with weapon (1)
- ✓ Sexual assault (1)
- ✓ Drug trafficking (2)
- ✓ Charter detention (1)
- ✓ Charter right to counsel (1)
- ✓ Robbery (1)
- ✓ Theft (1)
- ✓ Mixed/edge cases (1)

### 4. **Auto-Tuning Script** (`scripts/tune-filters.js`)
Automates test execution, measurement, and reporting.

**Commands:**

```bash
# Run all tests and generate report
node scripts/tune-filters.js --report

# Save current metrics as baseline
node scripts/tune-filters.js --baseline

# Compare current performance to baseline
node scripts/tune-filters.js --compare

# Analyze and suggest improvements
node scripts/tune-filters.js --suggest
```

**Output:**
- Console summary (pass rate, precision, relevance)
- HTML report with per-scenario breakdowns
- Improvement suggestions prioritized by impact
- Diff comparisons to baseline

### 5. **Internal Dashboard** (`api/filter-quality.js`)
Real-time view of filter configuration and health.

**Endpoint:** `GET /api/filter-quality`  
**Auth:** Same as `/api/retrieval-health` (Bearer token)  
**Response:**
```json
{
  "filters": {
    "configuration": {
      "ai_citation_min_token_overlap": 2,
      "final_case_min_token_overlap": 3,
      ...
    },
    "issue_patterns": [...],
    "landmark_boost_active": true
  },
  "testing": {
    "test_scenarios_count": 16,
    "commands": [...]
  },
  "tuning_guide": {
    "if_low_precision": [...],
    "if_false_positives": [...]
  }
}
```

## Workflow: Test → Measure → Improve

### Step 1: Run All Tests
```bash
node scripts/tune-filters.js --report
```
Generates `filter-quality-report.html` with all metrics.

### Step 2: Analyze Results
Look for:
- **Low precision** (<70%): Too many irrelevant cases
- **Low relevance** (<6/10): Cases are tangentially related
- **False positives** (excluded patterns found): Wrong case types returned
- **Consistent failures**: Specific scenarios always fail

### Step 3: Identify Root Cause
Use the suggestions in the report:
```
[HIGH] Low precision across multiple scenarios
  Details: 5 cases with precision < 0.6
  Recommendation: Increase min_token_overlap threshold or expand stop_words
```

### Step 4: Update Config (`api/_filterConfig.js`)
```javascript
export const FILTER_CONFIG = {
  // Tuned values
  ai_citation_min_token_overlap: 3,     // Was 2
  final_case_min_token_overlap: 4,      // Was 3
  stop_words: new Set([
    // ... existing words ...
    "facts", "court", "person",         // Add more noise words
  ]),
  // ...
};
```

### Step 5: Save Baseline & Re-test
```bash
# Save the old config as baseline
node scripts/tune-filters.js --baseline

# Make your changes to _filterConfig.js

# Re-run and compare
node scripts/tune-filters.js --compare
```

Output:
```
📈 Comparison to baseline:
  Pass Rate Delta: +8.5%
  Tests Fixed: 2
  Improved: YES ✓
```

### Step 6: Validate in Production
After committing config changes:
1. Deploy to staging
2. Monitor `/api/retrieval-health` for retrieval quality metrics
3. Test with real scenarios from `/api/filter-quality`
4. Deploy to production if metrics improve

## Tuning Guidelines

### Scenario: False Positives (Irrelevant Cases Returned)

**Diagnosis:**
- Precision < 70%
- Excluded patterns appearing in results

**Fix Priority:**
1. **Increase token overlap threshold**
   ```javascript
   final_case_min_token_overlap: 3 → 4
   ```
   Requires more scenario words in case summaries.

2. **Expand stop_words**
   ```javascript
   stop_words: new Set([
     ...,
     "law", "case", "court",  // Remove very generic words
   ])
   ```
   Prevents cases from matching on generic terms.

3. **Refine issue patterns**
   Add more specific sub_issues to reduce false positives:
   ```javascript
   impaired_motor: {
     sub_issues: [
       "charter", "s. 9", "detention",
       "breath", "roadside",  // More specific
     ]
   }
   ```

### Scenario: False Negatives (Missing Relevant Cases)

**Diagnosis:**
- Pass rate < 80%
- Results count below `minResults`

**Fix Priority:**
1. **Decrease token overlap threshold**
   ```javascript
   final_case_min_token_overlap: 3 → 2
   ```

2. **Expand issue patterns**
   Add new patterns or sub-issues categories.

3. **Add landmark cases**
   Ensure key cases (R v Grant, R v Jordan, etc.) are in `MASTER_CASE_LAW_DB`.

### Scenario: Inconsistent Results

**Diagnosis:**
- Some similar scenarios pass, others fail

**Fix Priority:**
1. Review test case definitions — ensure consistency
2. Check if scenarios need more specificity
3. Verify landmark database has all key cases

## Metrics Definitions

| Metric | Definition | Target | Action If Low |
|--------|-----------|--------|---------------|
| **Precision** | % of returned cases relevant to core issue | >85% | Increase thresholds |
| **Recall** | % of relevant cases that are returned | >80% | Decrease thresholds or expand patterns |
| **Relevance (0-10)** | Semantic alignment score | >6 | Add more sub-issue keywords |
| **Pass Rate** | % of scenarios meeting criteria | >85% | Review failing scenarios |
| **False Positives** | Excluded patterns appearing | 0 | Refine stop words or ranking boosts |

## Integration with Existing Code

The filter config is used by:
- `api/_caseLawRetrieval.js` — `detectCoreIssue()` uses issue_patterns
- `api/analyze.js` — `selectTopRetrievedCases()` uses min_token_overlap and stop_words
- `api/_filterScoring.js` — All metrics reference FILTER_CONFIG
- Test suite — All thresholds come from config

To migrate existing hard-coded values to config:
```javascript
// OLD (hard-coded)
const AI_MIN_OVERLAP = 2;
const FINAL_MIN_OVERLAP = 3;

// NEW (configured)
import { getConfig } from "./_filterConfig.js";
const AI_MIN_OVERLAP = getConfig("ai_citation_min_token_overlap");
const FINAL_MIN_OVERLAP = getConfig("final_case_min_token_overlap");
```

## Running Tests in CI/CD

Add to `package.json`:
```json
{
  "scripts": {
    "test:filter-quality": "node scripts/tune-filters.js --report",
    "test:filter-baseline": "node scripts/tune-filters.js --baseline"
  }
}
```

In CI pipeline:
```yaml
- name: Run filter quality tests
  run: npm run test:filter-quality
  
- name: Compare to baseline
  run: npm run test:filter-compare
```

Fail the build if pass_rate < 70%.

## Monitoring & Alerting

Set up with `/api/filter-quality` endpoint:
```javascript
// Health check
const health = await fetch(
  "https://casedive.ca/api/filter-quality",
  { headers: { Authorization: `Bearer ${token}` } }
);
const { filters } = await health.json();

// Alert if thresholds drift
if (filters.configuration.ai_citation_min_token_overlap > 3) {
  alertSlack("Filter thresholds increased unexpectedly");
}
```

## Examples

### Example 1: Improving Low Precision for Impaired Driving

**Problem:** Impaired driving scenarios returning theft cases.

**Diagnosis:**
1. Run tests: `node scripts/tune-filters.js --report`
2. See: Impaired driving scenarios have precision < 70%
3. Check failures: Seeing cases like "R v Theft" returned

**Fix:**
```javascript
// In api/_filterConfig.js
impaired_motor: {
  tests: [...],
  sub_issues: [
    "charter", "s. 9", "detention", "breath",
    "roadside", "grant", "reasonable",
    "vehicle", "stop"  // Add more specific keywords
  ]
}

// Also increase threshold
final_case_min_token_overlap: 3 → 4
```

**Test:**
```bash
node scripts/tune-filters.js --compare
```
Output: Pass rate +12%, Precision improved to 87%.

### Example 2: Adding New Issue Category

**Need:** Sexual assault scenario support

**Steps:**
1. Add to test suite (`tests/unit/filterTuning.test.js`):
   ```javascript
   {
     id: "sexual_assault_01",
     scenario: "I'm accused of...",
     expectedPrimary: "sexual_assault",
     expectedKeywords: ["consent", "s. 271"],
     // ...
   }
   ```

2. Add to config (`api/_filterConfig.js`):
   ```javascript
   sexual_assault: {
     tests: [/sexual/, /assault|attack|consent/],
     primary: "sexual_assault",
     sub_issues: ["s. 271", "consent", "credibility", "s. 273"]
   }
   ```

3. Test: `node scripts/tune-filters.js --report`

4. Adjust if needed based on results.

## Troubleshooting

### Tests hanging or failing
- Check mock retrieval function in `scripts/tune-filters.js`
- Ensure `TEST_SCENARIOS` is properly exported from test file
- Verify no real API calls are being made during test runs

### HTML report not generated
- Check write permissions in repo root
- Verify `scripts/tune-filters.js` has proper path config
- Run with: `node scripts/tune-filters.js --report 2>&1`

### Baseline comparison showing no improvement
- Ensure baseline was saved with old config: `node scripts/tune-filters.js --baseline`
- Change config in `api/_filterConfig.js`
- Run: `node scripts/tune-filters.js --compare`

## Next Steps

1. **Integrate with CI/CD** — Add filter tests to GitHub Actions
2. **Build dashboard UI** — Create React component showing filter health
3. **Add real API testing** — Replace mock retrieval with actual `/api/retrieve-caselaw` calls
4. **Historical tracking** — Store metrics over time to spot trends
5. **Automated tuning** — Use ML to suggest optimal thresholds

---

**Maintainer:** Alasdair NC  
**Last Updated:** April 1, 2026
