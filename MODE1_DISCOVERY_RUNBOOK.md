# Mode 1 Discovery Runbook (Balanced Expansion)

## Objective

Expand retrieval-failure coverage with a balanced split between:

- False-positive prevention scenarios (zero_expected)
- Recall/precision positive-control scenarios (nonzero_required)

Target for next wave: 25 new scenarios

- 13 false-positive prevention
- 12 recall/precision controls

## Current Baseline

- Command run: npm run test:retrieval-failures:baseline
- Baseline file: .retrieval-failure-baseline.json
- Current corpus size: 25
- Current pass rate: 100%

## Scope For Mode 1 (Read-Only + Planning)

Do not tune retrieval logic in this mode.
Do not change ranking thresholds in this mode.
Only build and validate the scenario backlog and labeling quality.

## Skills And Agents

Primary skill:

- casedive-skill-router

Secondary skill:

- everything-claude-code

Agents:

- Explore (thorough): map coverage gaps and scenario classes
- CaseDive Retrieval Health: map ops gating metrics per phase

Use prompt-optimizer only if both conditions are true:

1. Two tuning rounds in later modes plateau on recall/false-positive improvements.
2. Evidence indicates AI suggestion noise is driving regressions.

## Balanced Backlog Requirements

Each new scenario must include:

- id
- scenario
- expectedPrimary
- expectedResult
- shouldInclude
- shouldExclude
- expectedKeywords
- minResults
- maxResults
- landmarkMatches

Rules:

- zero_expected scenarios should have strong exclusion terms in shouldExclude
- nonzero_required scenarios should have at least one legal anchor in shouldInclude
- avoid ambiguous anchors unless scenario is intentionally an ambiguity test

## Coverage Targets For Next 25

Prioritize classes that are underrepresented or missing:

- impaired_driving
- drug_trafficking
- sexual_assault
- assault_bodily_harm
- assault_with_weapon
- charter_detention vs charter_counsel disambiguation
- peace_bond and low-signal out-of-scope traps

Recommended split:

- 8 impaired_driving/drug_trafficking
- 6 sexual_assault/assault variants
- 5 charter disambiguation
- 6 out-of-scope and low-signal traps

## Mode 1 Checkpoints

1. Backlog quality check complete

- Every proposed scenario mapped to one of the target classes
- Balanced split holds at 13:12 or 12:13

2. Label integrity check complete

- No missing required fields
- expectedResult aligns with minResults/maxResults
- shouldInclude/shouldExclude are not empty by accident

3. Dry validation complete

- Scenario text is realistic and specific enough to avoid accidental matches from generic words only

## Exit Criteria (Mode 1 Done)

- Backlog of 25 scenarios prepared and reviewed
- Balanced split confirmed
- Ready to move to Mode 2 implementation (editing tests/unit/retrievalFailureSet.js)

## Next Commands After Mode 1

- npm run test:retrieval-failures
- npm run test:retrieval-failures:compare
- npm run test:guardrails
