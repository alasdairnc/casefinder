---
name: retrieval-health
description: Fetch the live retrieval health snapshot, diagnose issues, and optionally apply fixes
allowed_tools: ["Read", "WebFetch", "Bash", "Grep", "Glob", "Edit"]
version: "1.0.0"
rollback: "revert any retrieval pipeline edits if re-running the health check shows the same or worse metrics"
observation_hooks:
  - verify: "git diff --stat api/_retrievalHealthStore.js api/retrieve-caselaw.js"
feedback_hooks:
  - on_failure: "check snapshotSource, Redis write path, and CanLII API key config before retrying"
---

# /retrieval-health — Retrieval Health Check + Fix

## Step 1: Load auth token

Read the token from `.retrieval-health-token` in the project root:

```bash
cat .retrieval-health-token 2>/dev/null || echo "NO_TOKEN"
```

If the file is missing or empty, proceed without an Authorization header (endpoint is open if `RETRIEVAL_HEALTH_TOKEN` is not set in Vercel).

## Step 2: Fetch live health snapshot

Fetch `https://casedive.ca/api/retrieval-health` with:

- `Authorization: Bearer <token>` (if token found)
- `Accept: application/json`

Parse the JSON response. If the request fails or returns non-200, report the error and stop.

## Step 3: Analyze the snapshot

Report the following in a structured summary:

```
RETRIEVAL HEALTH SNAPSHOT
=========================
Generated:     <generatedAt>
Snapshot src:  <snapshotSource>
Stored events: <totalStoredEvents>

WINDOWS
-------
5m  — operational: X | error rate: X% | no-verified: X% | p95: Xms
1h  — operational: X | error rate: X% | no-verified: X% | p95: Xms
All — operational: X | error rate: X% | no-verified: X% | avg: Xms

ALERTS
------
<list any active threshold alerts, or "None">

THRESHOLDS
----------
Error rate:    X% (1h limit)
No-verified:   X% (1h limit)
p95 latency:   Xms (1h limit)
Min samples:   X
```

## Step 4: Diagnose

Flag any of the following as issues:

- `snapshotSource` is `"empty"` → no events recorded since deploy
- `snapshotSource` is `"backup_last_event"` → primary Redis list may be stale
- 1h error rate > threshold → retrieval failures spiking
- 1h no-verified rate > threshold → CanLII verification returning nothing
- p95 latency > threshold → retrieval calls too slow
- `totalStoredEvents` is 0 but the site has had traffic → Redis write path may be broken

## Step 5: Fix (only when user says to fix)

If the user explicitly asks to fix issues, apply targeted fixes based on the diagnosis:

| Issue                       | Where to look                                               | Likely fix                                        |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| Redis write failures        | `api/_retrievalHealthStore.js`                              | Check timeout values, key TTLs, serialization     |
| High no-verified rate       | `api/retrieve-caselaw.js`                                   | Tune query shaping, expand fallback DB targets    |
| High error rate             | `api/analyze.js`, `api/retrieve-caselaw.js`                 | Check CanLII API key config, error handling       |
| Slow latency                | `api/retrieve-caselaw.js`                                   | Check CanLII request timeouts, caching            |
| Alltime accumulator missing | `api/_retrievalHealthStore.js` → `updateAlltimeAccumulator` | Verify it's being called and Redis key is written |

Read the relevant files before making any edits. After fixing, tell the user to redeploy and re-run `/retrieval-health` to confirm.
