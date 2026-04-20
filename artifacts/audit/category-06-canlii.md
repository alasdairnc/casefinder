# Category 6: CanLII Integration

## Findings (2026-04-17)

- **[Medium] CANLII_API_BASE_URL env override enables operator-controlled SSRF/prompt-injection**
  - File: api/\_caseLawRetrieval.js:32-36
  - Evidence: `CANLII_API_BASE = process.env.CANLII_API_BASE_URL ?? "https://api.canlii.org/v1";`
  - Attack: An attacker with Vercel env-var write access can redirect all CanLII API calls to an attacker-controlled server. This enables SSRF and prompt-injection amplification.
  - Impact: Requires privileged access. Blast radius is high if exploited.

- **No webDbId/apiDbId mix-up found**
  - All CanLII API and web URL construction uses closed maps and validated fields; no user-controlled SSRF found.

- **All fetches to CanLII use AbortSignal.timeout via helpers**
  - No missing timeout found in direct calls.
    Evidence:

```js
function normalizeCitationInput(citation) {
  return String(citation || "").replace(/\s+/g, " ").trim();
}
export function parseCitation(citation) {
  if (!citation || typeof citation !== "string") return null;
```

Empty string, null, undefined, overly long strings: `parseCitation` returns null → callers return `{ status: "unparseable", searchUrl: ... }`. No crash.
For extremely long strings (>5000 chars): `scenario` is capped at 5000 chars in `analyze.js:660-665` before reaching citation parsing. `citations` array elements are capped at 500 chars in `verify.js:132`. Safe.
Impact: None — graceful degradation confirmed.
Trace confidence: High

### [Low] CANLII_API_KEY absent → correct graceful degrade (not fail-open)

File: src/lib/canlii.js:357-360, api/retrieve-caselaw.js:87-88, api/verify.js:308-310
Evidence:

```js
if (!apiKey) {
  return { status: "unverified", url: caseUrl, searchUrl };
}
```

When key is absent: returns `"unverified"` with a best-guess URL. Does not skip validation — it simply cannot verify against the API. Does not fail open to "verified". Correct behavior.
Trace confidence: High

## False Alarms

- **COURT_DB_MAP vs COURT_WEB_MAP confusion**: `COURT_DB_MAP` is explicitly aliased to `COURT_API_MAP` (canlii.js:106). Any caller of `COURT_DB_MAP` gets API IDs, not web IDs. No mix-up.
- **`caseId` injection via citation parsing**: citation number component is extracted by `/(\d+)$/` pattern — pure digits. Court code is uppercased and then looked up in a closed map; unknown courts short-circuit. No user-controlled freeform in URL path.
- **Database scoping by jurisdiction**: `JURISDICTION_DB_IDS` map in `_caseLawRetrieval.js:42-52` maps province names (from a whitelisted `VALID_JURISDICTIONS` set validated in `analyze.js:668-713`) to their court DB IDs. An attacker cannot request Quebec courts when Ontario is selected via the normal API — the jurisdiction value is allowlisted.

## Coverage Gaps

- `api/_caseLawRetrieval.js` is ~2700 lines — full content not read. The CanLII full-text search endpoint (`/v1/search/...`) may be called somewhere in that file; whether those calls have timeouts was not verified line-by-line.
- `_retrievalOrchestrator.js` not read in detail — assumed to call into canlii.js helpers which have 8s timeouts.
- No runtime test of the actual CanLII API to confirm URL construction correctness for edge-case jurisdictions (CMAC, TCC, NUCJ).
