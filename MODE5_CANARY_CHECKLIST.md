# Mode 5 Canary Checklist

## Current Status

- Live retrieval-health fetch result: Unauthorized (401)
- Canary evaluation is blocked until the retrieval health token is refreshed or corrected.

## Command To Run

```bash
VAL="$(cat .retrieval-health-token | tr -d '\n')"
if [[ "$VAL" == Bearer* ]]; then AUTH="$VAL"; else AUTH="Bearer $VAL"; fi
curl -sSL -H "Authorization: $AUTH" https://casedive.ca/api/retrieval-health
```

## Canary Gates (5m)

Use as early-warning indicators during rollout:

- error rate <= 8%
- no-verified rate <= 75%
- p95 latency <= 3000ms
- fallback-path rate <= 75%
- operational samples >= 5 before acting

## Promotion Gates (1h)

Use as release/promotion criteria:

- error rate <= 5%
- no-verified rate <= 65%
- p95 latency <= 2500ms
- avg verified/request >= 0.35
- fallback-path rate <= 60%
- avg relevance >= 4.7
- issue-level alerts only actionable where request volume >= 8

## Alert Hygiene Rules During Tuning

- Treat 5m threshold breaches as warning unless extreme (for example error rate > 20%).
- Promote only on sustained 1h health, not single 5m windows.
- Prioritize issue-level regressions over global spikes when triaging.

## Correlate With Test Signals

If live canary degrades:

1. Run npm run test:retrieval-failures:compare
2. Run npm run test:filter:compare
3. If failures cluster by issue domain, investigate detectCoreIssue patterns before ranking changes.

## Current Local Quality State

- retrieval-failures: 52/52 pass
- guardrails: pass
- filter suite: pass
