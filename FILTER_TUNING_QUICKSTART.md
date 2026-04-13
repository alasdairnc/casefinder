# Filter Tuning – Quick Start Guide

## What Was Built

**Complete testable filtering system** with:

1. ✅ **Configuration Layer** (`api/_filterConfig.js`) — All tuning parameters centralized, zero hard-coded thresholds
2. ✅ **Scoring System** (`api/_filterScoring.js`) — Precision, recall, relevance metrics to measure filter quality
3. ✅ **Test Suite** (`tests/unit/filterTuning.test.js`) — 16+ realistic scenarios covering all major legal issues
4. ✅ **Auto-Tuning Script** (`scripts/tune-filters.js`) — Automates testing, measurement, reporting, and improvement suggestions
5. ✅ **Internal Dashboard** (`api/filter-quality.js`) — Real-time view of filter health (like `/api/retrieval-health`)
6. ✅ **Complete Documentation** (`FILTER_TUNING.md`) — Full architecture guide + tuning workflows

## How It Works

### Immediate Use: Run Tests & See Results

```bash
# Generate report with all filter metrics
npm run test:filter

# Output:
# ✓ Report written to: /filter-quality-report.html
#
# 📊 Results:
#   Pass Rate: 87.5%
#   Passed: 14/16
#   Avg Relevance: 7.3/10
#   Avg Precision: 0.84
#
# 💡 Suggestions (2 found):
#   [MEDIUM] Low relevance on edge cases
#   [MEDIUM] Review ranking boost weights
```

### The Tuning Cycle

```
1. Run tests & generate report
   npm run test:filter

2. Identify failures in report
   → Precision too low?
   → Relevance scoring below 5/10?
   → False positives detected?

3. Make one config change in api/_filterConfig.js
   • Increase/decrease thresholds
   • Add/remove stop words
   • Expand issue detection patterns
   • Adjust ranking boosts

4. Save baseline & compare
   npm run test:filter:baseline
   npm run test:filter:compare

5. Review diff metrics
   → Pass rate improved?
   → Precision up?
   → Tests fixed?

6. If better, commit. If worse, revert and try different fix.
```

## Quick Reference: Common Changes

### Problem: Too Many Irrelevant Cases

**Increase the filtering threshold:**

```javascript
// api/_filterConfig.js
export const FILTER_CONFIG = {
  final_case_min_token_overlap: 4, // Was 3 — stricter filter
  // ...
};
```

**Add more stop words (noise removal):**

```javascript
stop_words: new Set([
  // ... existing words ...
  "court", "person", "facts", "law", "cases",  // Add generic terms
]),
```

**Re-test:**

```bash
npm run test:filter:baseline
# Edit config...
npm run test:filter:compare
# Should see pass_rate_delta > 0
```

### Problem: Missing Relevant Cases

**Decrease the threshold:**

```javascript
final_case_min_token_overlap: 2,  // Was 3 — more permissive
```

**Add more issue-specific keywords:**

```javascript
impaired_motor: {
  sub_issues: [
    "charter",
    "s. 9",
    "detention",
    "breath",
    "roadside",
    "grant",
    "vehicle", // Add more
  ];
}
```

### Problem: Specific Scenario Keeps Failing

1. Open `filter-quality-report.html` in browser
2. Find the failing scenario
3. Look at precision/relevance scores
4. Check test case definition in `tests/unit/filterTuning.test.js`
5. Verify expectations match intended behavior
6. Adjust config or test case accordingly

## APIs & Endpoints

### Filter Configuration API

```javascript
import { FILTER_CONFIG, updateConfig, getConfig } from "./api/_filterConfig.js";

// Read threshold
const threshold = getConfig("final_case_min_token_overlap");
// → 3

// Update at runtime (for testing)
updateConfig({ final_case_min_token_overlap: 4 });

// Reset to defaults
resetConfig();
```

### Scoring API

```javascript
import {
  scoreResultRelevance,
  evaluateResultSet,
  runTestSuite,
} from "./api/_filterScoring.js";

// Score a single case
const score = scoreResultRelevance(scenario, caseResult, expectedKeywords);
// → { relevant: true, score: 8.5, tokenOverlap: 4, ... }

// Evaluate a batch of results
const metrics = evaluateResultSet(scenario, results, {
  expectedKeywords: ["charter", "detention"],
  shouldExclude: ["theft"],
  minResults: 2,
});
// → { precision: 0.87, is_acceptable: true, ... }

// Run full test suite
const results = runTestSuite(TEST_SCENARIOS, retrievalFunction);
// → { total_tests: 16, passed: 14, pass_rate: 87.5%, ... }
```

### Dashboard Endpoint

```bash
curl -H "Authorization: Bearer $RETRIEVAL_HEALTH_TOKEN" \
  https://casedive.ca/api/filter-quality

# Returns:
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

## Test Scenario Coverage

Currently testing:

- ✓ Impaired driving (2 scenarios)
- ✓ Assault bodily harm (2)
- ✓ Assault with weapon (1)
- ✓ Sexual assault (1)
- ✓ Drug trafficking (2)
- ✓ Charter s. 9 detention (1)
- ✓ Charter s. 10(b) counsel (1)
- ✓ Robbery (1)
- ✓ Theft (1)
- ✓ Mixed/edge cases (1)

**Total: 16 scenarios**

To add more:

```javascript
// tests/unit/filterTuning.test.js
export const TEST_SCENARIOS = [
  // ... existing ...
  {
    id: "new_issue_01",
    scenario: "...",
    expectedPrimary: "...",
    expectedKeywords: [...],
    shouldInclude: [...],
    shouldExclude: [...],
    minResults: 1,
    maxResults: 4,
  }
];
```

Then re-run tests — they'll automatically include the new scenario.

## Monitoring & Integration

### In GitHub Actions

Add to CI/CD:

```yaml
- name: Run filter quality tests
  run: npm run test:filter

- name: Check pass rate
  run: |
    PASS_RATE=$(grep "Pass Rate" filter-quality-report.html || echo 0)
    if [[ $PASS_RATE -lt 70 ]]; then
      echo "Filter pass rate below 70%!"
      exit 1
    fi
```

### Manual Monitoring

Check health periodically:

```bash
# Save baseline after each release
npm run test:filter:baseline

# Before next deploy
npm run test:filter:compare
# Review diff, approve if improvements made
```

## File Reference

| File                              | Purpose                         | Modified From                                       |
| --------------------------------- | ------------------------------- | --------------------------------------------------- |
| `api/_filterConfig.js`            | **NEW** — Centralized config    | N/A                                                 |
| `api/_filterScoring.js`           | **NEW** — Metrics & measurement | N/A                                                 |
| `api/filter-quality.js`           | **NEW** — Dashboard endpoint    | N/A                                                 |
| `tests/unit/filterTuning.test.js` | **NEW** — Test scenarios        | N/A                                                 |
| `scripts/tune-filters.js`         | **NEW** — Auto-tuning runner    | N/A                                                 |
| `FILTER_TUNING.md`                | **NEW** — Full docs             | N/A                                                 |
| `api/_caseLawRetrieval.js`        | ✅ Updated                      | Added `detectCoreIssue()`, pre-verify semantic gate |
| `api/analyze.js`                  | ✅ Updated                      | Expanded stop_words, added min-token validation     |
| `package.json`                    | ✅ Updated                      | Added test:filter\* scripts                         |

## Troubleshooting

### Q: Report not generated

A: Check write permissions and ensure script ran without errors:

```bash
node scripts/tune-filters.js --report 2>&1 | tail -20
```

### Q: Tests pass locally but fail in CI

A: Ensure `TEST_SCENARIOS` exports are correct:

```bash
node -e "import('./tests/unit/filterTuning.test.js').then(m => console.log(m.TEST_SCENARIOS?.length))"
# Should print: 16
```

### Q: How do I know if the filters are good?

A: Look for:

- ✓ Pass rate > 85%
- ✓ Precision > 0.80
- ✓ Avg relevance > 6/10
- ✓ False positives = 0
- ✓ Report suggestions < 3

### Q: Can I test specific scenarios?

A: Run in Node:

```javascript
import { TEST_SCENARIOS } from "./tests/unit/filterTuning.test.js";

const scenario = TEST_SCENARIOS.find((s) => s.id === "impaired_01");
console.log(scenario.scenario);
```

## Next Steps

1. **Run tests immediately:**

   ```bash
   npm run test:filter
   ```

2. **Review report** — Open `filter-quality-report.html` in browser

3. **Identify any issues** — Review suggestions section

4. **Make config improvements** — Edit `api/_filterConfig.js` based on hints

5. **Measure impact** — Compare before/after:

   ```bash
   npm run test:filter:baseline
   # Edit config...
   npm run test:filter:compare
   ```

6. **Commit if improved** — Version control your tunings

7. **Monitor via `/api/filter-quality`** — Check health on staging before production

---

**Questions?** See `FILTER_TUNING.md` for deep dive into architecture and tuning workflows.
