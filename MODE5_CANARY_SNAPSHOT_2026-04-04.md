# Mode 5 Canary Snapshot (2026-04-04)

## Endpoint + Auth Notes

- `https://casedive.ca/api/retrieval-health` redirects to `https://www.casedive.ca/api/retrieval-health`.
- Token authenticated successfully on `www.casedive.ca`.

## Snapshot

- generatedAt: 2026-04-04T23:31:25.998Z
- snapshotSource: primary
- totalStoredEvents: 3
- alerts: none

## Metrics

### 5m window

- operational samples: 0
- error rate: 0
- no-verified rate: 0
- p95 latency: 0
- fallback-path rate: 0
- avg verified/request: 0
- avg relevance: 0

### 1h window

- operational samples: 0
- error rate: 0
- no-verified rate: 0
- p95 latency: 0
- fallback-path rate: 0
- avg verified/request: 0
- avg relevance: 0

## Gate Evaluation

### 5m canary gates

- error <= 8%: PASS
- no-verified <= 75%: PASS
- p95 <= 3000ms: PASS
- fallback-path <= 75%: PASS
- operational samples >= 5: FAIL

### 1h promotion gates

- error <= 5%: PASS
- no-verified <= 65%: PASS
- p95 <= 2500ms: PASS
- avg verified/request >= 0.35: FAIL
- fallback-path <= 60%: PASS
- avg relevance >= 4.7: FAIL
- operational samples >= 8: FAIL

## Decision

- Mode 5 canary status: INCONCLUSIVE (insufficient live operational sample volume).
- Promotion status: HOLD until sample minimums are met.

## Next Actions

1. Generate or wait for real retrieval traffic until at least 5 operational samples (5m) and 8 (1h).
2. Re-run canary check against `https://www.casedive.ca/api/retrieval-health`.
3. Re-evaluate promotion gates using this same rubric.
