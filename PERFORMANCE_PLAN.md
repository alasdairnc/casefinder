# CaseDive Performance Plan

## Goals

- Keep analyze and retrieve-caselaw responsive under normal traffic.
- Detect degradation early from retrieval health signals.
- Turn failed scenarios into fast, targeted fixes using an agent loop.

## SLO Targets

- Analyze endpoint p95 latency: <= 2500 ms
- Retrieve-caselaw endpoint p95 latency: <= 1800 ms
- Retrieval 1h error rate: <= configured threshold in retrieval-health response
- Retrieval 1h no-verified rate: <= configured threshold in retrieval-health response
- Retrieval 1h fallback-path rate: <= configured threshold in retrieval-health response
- Retrieval 1h average relevance score: >= configured minimum threshold

## Monitoring System

- Primary dashboard: retrieval health internal page.
- Automated probe: npm run perf:monitor.
- Existing quality gate remains required: npm run test:guardrails.

Environment variables required for monitor script:

- RETRIEVAL_HEALTH_TOKEN
- PERF_HEALTH_URL (optional, defaults to production retrieval-health endpoint)

## Daily Workflow (10-15 min)

1. Run npm run perf:monitor.
2. If failed, open retrieval health dashboard and inspect Recent Failed Scenarios.
3. For each top failure, use Copy Fix Prompt and run an agent fix pass.
4. Validate with:
   - npm run test:guardrails
   - targeted vitest files for touched modules

## Weekly Workflow (45 min)

1. Compare 1h and all-time trends for:
   - p95 latency
   - no-verified rate
   - fallback-path rate
   - average relevance score
2. Sample 5 recent failures and cluster by reason.
3. Apply one high-leverage retrieval improvement (query shaping, ranking, fallback tuning, or sanitizer polish).
4. Re-run guardrails and note outcome.

## Agent Optimization Loop

Use the CaseDive Retrieval Health agent for each high-priority failure.

Suggested prompt template:

Investigate and fix retrieval failure for this CaseDive scenario.

Failure context:
- ts: [timestamp]
- endpoint: [endpoint]
- reason: [reason]
- retrievalError: [true|false]
- finalCaseLawCount: [n]
- fallbackPathUsed: [true|false]
- semanticFilterDropCount: [n]
- scenario: [scenario snippet]
- errorMessage: [optional]

Tasks:
1) Identify likely root cause in retrieval pipeline.
2) Implement minimal code fix.
3) Add or update tests to prevent recurrence.
4) Run relevant tests and summarize measurable impact.

## Prioritized Optimization Backlog

1. Stage-level timing fields in analyze response logs (AI, retrieval, verification, post-processing).
2. Candidate verification call budget tuning by issue type.
3. Smarter cache TTL policy by endpoint and query complexity.
4. Optional pre-computed hot scenario fingerprints for rapid short-circuit retrieval.

## Exit Criteria

- perf:monitor stays green for 7 consecutive days.
- No user-reported slow-result regressions.
- Guardrails remain 100% passing.
