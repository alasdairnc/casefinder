# Category 8: Concurrency & State

## Findings (2026-04-17)

- **[Critical] Cross-user response leak via request dedup key**
  - File: api/_requestDedup.js:4-23, api/analyze.js:817-821
  - Evidence: In-memory Promise deduplication keyed only by scenario+filters. Concurrent requests from different users with the same scenario+filters can share a Promise and leak requestId and response object.

- **[High] In-memory fallback for rate limiting is not atomic**
  - File: api/_rateLimit.js:37-123
  - Evidence: In-memory fallback uses a non-atomic read-modify-write pattern. Attackers can bypass or evict legitimate entries in dev or Redis outage scenarios.

- **[Medium] In-memory state is module-scoped and persists across requests on a warm Vercel instance**
  - File: api/_retrievalHealthStore.js:21, api/_rateLimit.js:37, api/_requestDedup.js:4
  - Evidence: In-memory state (metrics, rate-limit, dedup) is module-scoped and survives across requests on a reused Vercel instance, leading to possible state bleed between users.

- **[Low] Non-atomic read-modify-write to Redis for metrics**
  - File: api/_retrievalHealthStore.js:486-591, api/_retrievalHealthStore.js:751-761
  - Evidence: Metrics accumulator and event list use non-atomic read-modify-write. Concurrent updates can cause data loss (reliability issue, not security).
const dedupeKey = `inflight:analyze:${cacheKey(scenario, filters)}`;
const { result, ... } = await withRequestDedup(
  dedupeKey,
  () => analyzeWithRetry(scenario, filters, apiKey, preRetrievedCases),
);
```

Race scenario:

1. User A (`requestId=A`) POSTs scenario "I was pulled over for speeding" with default filters at t=0ms; cache miss in Redis.
2. `withRequestDedup` stores `inflight:analyze:<hashS+F>` → Promise_A on the warm Vercel instance.
3. User B (`requestId=B`, different IP, different rate-limit bucket, possibly different auth context) POSTs the identical scenario + filters at t=200ms while Anthropic is still responding.
4. Cache is still empty (Anthropic not returned). Dedup map has the key. User B receives Promise_A.
5. Both responses include `meta.requestId` derived from A's request (the Anthropic body is shared; A's request id is logged server-side but the response-shape re-inserts `requestId` at serialize time per-request, see `withRequestId` at `api/analyze.js:1018` — this one is actually per-caller because it runs _after_ `await`, mitigating that specific leak, but the response body itself is still identical to A's).
   Impact: Two users sharing an identical scenario fingerprint will share a single upstream Anthropic response object. The response is content-equivalent (by definition, same scenario + filters) so semantic leakage is minor, BUT: (a) the dedup runs on every cache-miss regardless of authentication boundary, (b) retrieved CanLII meta (search calls, fallback reasons, per-request retrieval pass) belongs to A's pipeline and is surfaced to B, and (c) an authenticated deployment extension (future: per-user rate plan, per-tenant prompt) would leak tenant-scoped response data because the key has no tenant component. Also, if `analyzeWithRetry` throws, both users receive the same rejection — a single bad input can poison all concurrent identical requests. CRITICAL severity is conditional: today the response is content-addressed so the observable leak is metadata (retrieval stats, landmark match order) and timing; as soon as the endpoint gains any per-user shaping the leak becomes a full cross-user response disclosure.
   Trace confidence: High (key construction is explicit at `api/analyze.js:817`, dedup map is module-scoped).

### [HIGH] Rate limiter read-modify-write race permits burst over quota

File: `api/_rateLimit.js:56-84`
Evidence:

```
const hitsJson = await Promise.race([redis.get(key), timeout]);
let hits = hitsJson ? JSON.parse(hitsJson) : [];
hits = hits.filter((t) => now - t < WINDOW_MS);

if (hits.length >= maxRequests) {
  return { allowed: false, ... };
}

hits.push(now);
await Promise.race([
  redis.setex(key, Math.ceil(WINDOW_MS / 1000), JSON.stringify(hits)),
  ...
]);

return { allowed: true, remaining: maxRequests - hits.length };
```

Race scenario:

1. Attacker currently has `hits = [t1, t2, t3, t4]` stored in Redis (4/5 used).
2. Attacker fires 5 parallel requests at t=now, all within a few ms.
3. Each invocation calls `redis.get(key)` — Upstash REST is fully async; all five reads complete before any `setex` lands. Each reads `[t1, t2, t3, t4]`.
4. Each independently computes `hits.length == 4 < 5`, pushes its own `now`, and calls `setex`. Each returns `allowed: true`.
5. Final Redis value is the last writer’s 5-element array. The attacker just executed 5 additional calls against a nominal 5-per-hour limit (double quota) with zero downstream detection.
   Impact: Doubling/burning the per-hour quota is practical; with N concurrent invocations the attacker can fire up to N extra calls per window (bounded by Vercel concurrency, but the Anthropic/CanLII spend scales linearly). Because the limiter is the only gate before a paid upstream (`callAnthropic`, `runCaseLawRetrieval`), this is a direct cost-amplification vector. Because all five pass, this also defeats the DoS protection the limiter nominally provides.
   Trace confidence: High. Upstash REST client does not offer atomic sliding-window primitives here (no `ZADD` + `ZREMRANGEBYSCORE` pipeline, no Lua EVAL).

### [HIGH] Rate-limit fallback silently opens on Redis timeout/failure

File: `api/_rateLimit.js:85-125`
Evidence:

```
} catch (err) {
  console.error(
    "Redis rate limit check failed, falling back to in-memory:",
    err.message,
  );
}

// Fallback: in-memory store (development or Redis unavailable)
const hits = (store.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
```

Race scenario:

1. Attacker finds/induces Redis latency > `RATE_LIMIT_REDIS_TIMEOUT_MS`, or Redis is transiently unavailable (Upstash maintenance, token rotation).
2. `Promise.race` rejects; control flows to the in-memory fallback.
3. On each cold/new Vercel instance, the in-memory `store` is empty — the attacker is at 0/5 regardless of their true quota.
4. Vercel load-balances bursts across multiple instances; each fresh instance is another empty bucket.
   Impact: Full rate-limit bypass during Redis outages or via any technique that can induce Redis slowness (e.g., triggering a large retrieval health read on the same Redis from another endpoint). No alert fires; the `console.error` is silent to the client, and the response is a normal `allowed: true`. Combine with instance churn and per-IP quota is effectively unbounded. Also note the fallback LRU (`api/_rateLimit.js:107-123`) allows a flood of distinct IP keys (spoofable via `x-forwarded-for`) to evict legitimate entries, further amplifying bypass.
   Trace confidence: High.

### [MEDIUM] Retrieval health alltime accumulator loses writes under concurrency

File: `api/_retrievalHealthStore.js:486-591`, `721-783`
Evidence:

```
async function updateAlltimeAccumulator(event) {
  ...
  const raw = await Promise.race([redis.get(ALLTIME_KEY), timeout()]);
  let acc = {};
  if (raw) { acc = typeof raw === "string" ? JSON.parse(raw) : raw; ... }
  ...
  acc.total = (acc.total || 0) + 1;
  ...
  await Promise.race([redis.set(ALLTIME_KEY, JSON.stringify(acc)), timeout()]);
}
```

Race scenario: Two concurrent analyze invocations finish at ~the same ms. Both call `recordRetrievalMetricsEvent` → `updateAlltimeAccumulator`. Both `GET` the same `acc`; each increments locally; each `SET`s. The later write clobbers the earlier’s increments. Same pattern for `EVENT_LIST_KEY` at `api/_retrievalHealthStore.js:751-761`.
Impact: Under moderate concurrent load the `alltime` counters undercount, making the retrieval-health dashboard under-report real traffic and failures. Not a security issue, but a data-integrity finding that could mask attacks (e.g., a burst of retrieval errors gets partially lost, so alerting thresholds aren’t hit).
Trace confidence: High.

### [MEDIUM] In-memory dedup survives across users on warm Vercel instance

File: `api/_requestDedup.js:4-23`
Evidence: `const inflight = new Map();` at module scope — not cleared on handler entry, only on Promise settle (`.finally(() => inflight.delete(key))`).
Race scenario: Tied to the CRITICAL finding above. Called out separately because the underlying state model (module-scoped Map survives across requests on reused instances) is the enabling mechanism and would compound with any future per-user response customization.
Impact: Same as CRITICAL finding re: cross-user sharing on warm instance.
Trace confidence: High.

### [LOW] `pruneMemory` and fallback LRU contain-but-don’t-protect against spoofed IP floods

File: `api/_rateLimit.js:107-123`, `api/_retrievalHealthStore.js:225-233`
Evidence:

```
if (store.size > 500) {
  ...
  const targetSize = 430;
  const excess = store.size - targetSize;
  if (excess > 0) {
    const oldestKeys = Array.from(store.keys()).slice(0, excess);
    for (const staleKey of oldestKeys) { store.delete(staleKey); }
  }
}
```

Race scenario: Insertion-order LRU means an attacker flooding unique spoofed `x-forwarded-for` IPs evicts the oldest 70 entries when size passes 500, which likely includes legitimate users’ live buckets. On the next request from an evicted user, they’re at 0/5 again.
Impact: Bypass/DoS amplification under Redis-unavailable conditions. Low severity because prod normally has Redis; conditional on HIGH finding above.
Trace confidence: Medium (depends on whether the fallback branch is ever reached in prod).

### [LOW] `getRetrievalEvents` mutates `memoryEvents` as a side effect of a read

File: `api/_retrievalHealthStore.js:785-812`
Evidence:

```
const cutoff = nowMs - MEMORY_RETENTION_MS;
const recent = sorted.filter((event) => event.ts >= cutoff);

memoryEvents.length = 0;
memoryEvents.push(...recent);
pruneMemory(nowMs);
```

Race scenario: A read path concurrent with a write path (`recordRetrievalMetricsEvent` calling `memoryEvents.push(event)`) interleaves the `memoryEvents.length = 0` with an in-flight push. Because Node is single-threaded the actual splice/push calls can’t interleave at the statement level, but the sequence `length = 0; push(...recent)` can drop a concurrent `push` that happens between those two lines if `recent` was computed earlier. In practice this is cosmetic.
Impact: Occasional dropped in-memory metrics events in dev/Redis-down mode.
Trace confidence: Medium.

---

## False Alarms

- **EVENT_COUNT_KEY increment**: uses `redis.incr` atomically (`api/_retrievalHealthStore.js:278-285`). No race.
- **Cross-instance in-memory rate-limit bypass in prod**: real risk, but covered under the HIGH Redis-fallback finding — not an independent issue when Redis is up.
- **`withRequestId` leaking requestIds across users**: `withRequestId` runs on the handler side of the dedup `await` (`api/analyze.js:1018`), so each caller wraps the shared `result` with their own `requestId`. Not a leak by itself. The shared `result.meta.case_law.retrieval.*` stats however are not per-caller — see CRITICAL.
- **Cache key collision**: `cacheKey` is `sha256(scenario + JSON.stringify(filters))` (`api/analyze.js:64-71`). Content-addressed caching is intentional and not a cross-user leak per se; it only becomes one if responses ever contain per-user data, which they currently don’t.

## Coverage Gaps

- Did not trace every other endpoint’s use of `checkRateLimit` (e.g., `api/report-case-law.js`, retrieval-health, feedback). The atomicity finding applies to all of them uniformly because it’s in `_rateLimit.js`.
- Did not inspect `api/_caseLawReportStore.js` (new untracked file) for similar GET/SET race patterns; worth a follow-up given the pattern is repeated across stores in this codebase.
- Did not reproduce the dedup cross-user race empirically (no load test harness) — finding is based on static analysis of key construction and state scope.
- Did not audit Upstash client internals for connection-pool ordering; assumed REST calls are independent and commutative.
- Did not examine whether `x-vercel-id` is deterministic enough that two concurrent dedup’d callers could be distinguished in logs; this matters for post-incident forensics of the CRITICAL finding.
