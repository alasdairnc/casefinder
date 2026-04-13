# Mode 4 Evaluation Snapshot (2026-04-04)

## Scope

Post-Mode 3 classification tuning snapshot for retrieval-failure corpus expansion.

## Commands Run

- npm run test:retrieval-failures
- npm run test:guardrails
- npm run test:retrieval-failures:compare

## Results

- Retrieval failures: 52/52 passed (100.0%)
- Guardrails: passed
  - resultCardSanitizer tests passed
  - retrieval-failures passed
  - filter tuning suite passed
- Compare vs baseline (.retrieval-failure-baseline.json):
  - pass rate delta: +0.0%
  - avg precision delta: +0.00
  - avg relevance delta: +0.06
  - passed delta: +27
  - failed delta: +0

## Mode 4 Gate Status

- Regression gate: PASS
- Expanded corpus gate: PASS
- Guardrails gate: PASS
- Promotion to next step (Mode 5 operational monitoring/canary): READY

## Classification Improvements (Mode 3)

Targeted positives now classify into issue-specific categories instead of general_criminal where applicable:

- robbery_bus_knife_positive -> robbery
- theft_backpack_positive -> theft
- search_home_warrant_positive -> charter_search_seizure
- roadside_counsel_variant_positive -> charter_counsel
- drug_trafficking_chat_logs_positive -> drug_trafficking
- robbery_force_alley_positive -> robbery

Traffic-style zero-expected scenarios now consistently classify as minor_traffic_stop where intended:

- traffic_minor_grant
- traffic_minor_oakes
- traffic_ticket_only_zero
- impaired_minor_ticket_negative

## Next Step (Mode 5)

- Pull retrieval-health snapshot (5m and 1h windows)
- Validate canary/promotion thresholds on:
  - error rate
  - no-verified rate
  - p95 latency
  - avg verified per request
  - fallback-path rate
- Keep tuning changes frozen during canary readout window
