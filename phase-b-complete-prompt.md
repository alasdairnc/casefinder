# Phase B — Criminal Code Validation + Prompt Hardening + Badge Fix

## What this fixes

Based on a full audit of the live repo (single commit `879327d`), there are four issues to fix in one pass:

1. **Criminal Code sections get zero verification** — `verify-citations.js` passes every citation through `parseCitation()` which only matches case law (e.g. `R v Smith, 2020 ONCA 123`). Any Criminal Code section like `s. 348(1)(b)` falls through as `"unparseable"`. No badge renders.
2. **`criminalCodeData.js` is orphaned** — the 490-section lookup table is sitting at the project root. Nothing imports it.
3. **System prompt needs hardening** — it says "Never construct, invent, or hallucinate citations" but doesn't tell the AI that fewer results is better than fabricated ones.
4. **`VerificationBadge` doesn't distinguish Criminal Code from case law** — the `type` prop isn't passed through, so even if CC verification worked, it would say "Verified on CanLII" instead of "Confirmed — Justice Laws."

---

## Step 1: Move `criminalCodeData.js` to `src/lib/`

```bash
mv criminalCodeData.js src/lib/criminalCodeData.js
```

Verify the file starts with `export const CRIMINAL_CODE_SECTIONS = new Map([` and ends with `export function lookupSection(citation)`. It should have 490 entries.

---

## Step 2: Add Criminal Code handling to `api/verify-citations.js`

The `verifyCitation` function currently jumps straight to `parseCitation()` which only handles case law. We need to intercept Criminal Code sections BEFORE that call.

### 2a. Add the import

At the top of `api/verify-citations.js`, after the existing imports, add:

```javascript
import { lookupSection, normalizeSection } from "../src/lib/criminalCodeData.js";
```

### 2b. Add the Criminal Code pattern constant

After `const FETCH_TIMEOUT_MS = 5000;`, add:

```javascript
const CRIMINAL_CODE_PATTERN = /^s\.\s*\d+/i;
```

### 2c. Add Criminal Code handling inside `verifyCitation`

The current function starts like this:
```javascript
async function verifyCitation(citation, apiKey) {
  const parsed = parseCitation(citation);

  if (!parsed) {
    return {
      citation,
      status: "unparseable",
      searchUrl: buildSearchUrl(citation),
    };
  }
```

Replace it with:
```javascript
async function verifyCitation(citation, apiKey) {
  // ── Criminal Code sections ─────────────────────────────────
  // Check BEFORE parseCitation, which only handles case law.
  if (CRIMINAL_CODE_PATTERN.test(citation.trim())) {
    const entry = lookupSection(citation);
    if (entry) {
      return {
        citation,
        status: "verified",
        url: entry.url,
        searchUrl: buildSearchUrl(citation),
        title: entry.title,
        severity: entry.severity,
        maxPenalty: entry.maxPenalty,
      };
    }
    // Valid format but not in our 490-section lookup — could still be real
    const sectionNum = normalizeSection(citation);
    const url = sectionNum
      ? `https://laws-lois.justice.gc.ca/eng/acts/c-46/section-${sectionNum}.html`
      : "https://laws-lois.justice.gc.ca/eng/acts/c-46/";
    return {
      citation,
      status: "unverified",
      url,
      searchUrl: buildSearchUrl(citation),
    };
  }

  // ── Case law citations ─────────────────────────────────────
  const parsed = parseCitation(citation);

  if (!parsed) {
    return {
      citation,
      status: "unparseable",
      searchUrl: buildSearchUrl(citation),
    };
  }
```

Leave the rest of the function unchanged.

---

## Step 3: Harden the system prompt in `src/lib/prompts.js`

Find the last line of the template string that currently reads:

```
Use real Criminal Code sections only. Only use real, verified cases you are confident about. Never construct, invent, or hallucinate citations. For civil_law, include relevant provincial statutes, regulations, or tort law. For charter, identify any Charter rights engaged by the scenario. Always respond with valid JSON only.
```

Replace it with:

```
Use real Criminal Code sections only — do not invent or approximate section numbers. For case_law, ONLY cite cases you are confident are real. If you cannot recall a real case with certainty, return fewer results rather than fabricating citations. It is better to return 1 verified case than 4 plausible-sounding fake ones. Never construct, invent, or hallucinate case names, citation numbers, or court references. For civil_law, include relevant provincial statutes, regulations, or tort law. For charter, identify any Charter rights engaged by the scenario. Always respond with valid JSON only.
```

**Verify after:** `grep -n "construct plausible\|plausible.*citation\|if uncertain.*construct" src/lib/prompts.js` should return nothing.

---

## Step 4: Update `ResultCard.jsx` — pass `type` to `VerificationBadge`

### 4a. Update the `VerificationBadge` function signature

Change:
```javascript
function VerificationBadge({ verification, t }) {
```
To:
```javascript
function VerificationBadge({ verification, t, type }) {
```

### 4b. Update the `verified` status block

Replace:
```javascript
  if (status === "verified") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: t.accentGreen, textDecoration: "none", marginTop: 8,
          letterSpacing: 0.5,
        }}
      >
        {"\u2713"} Verified on CanLII {"\u2197"}
      </a>
    );
  }
```

With:
```javascript
  if (status === "verified") {
    const label = type === "criminal_code"
      ? "Confirmed — Justice Laws"
      : "Verified on CanLII";
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: t.accentGreen, textDecoration: "none", marginTop: 8,
          letterSpacing: 0.5,
        }}
      >
        {"\u2713"} {label} {"\u2197"}
      </a>
    );
  }
```

### 4c. Update the `not_found` status block

Replace:
```javascript
  if (status === "not_found") {
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: t.accentRed, textDecoration: "none", marginTop: 8,
          letterSpacing: 0.5,
        }}
      >
        {"\u26A0"} Not found {"\u2014"} search CanLII {"\u2197"}
      </a>
    );
  }
```

With:
```javascript
  if (status === "not_found") {
    const label = type === "criminal_code"
      ? "Section not confirmed"
      : "Not found \u2014 search CanLII";
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: t.accentRed, textDecoration: "none", marginTop: 8,
          letterSpacing: 0.5,
        }}
      >
        {"\u26A0"} {label} {"\u2197"}
      </a>
    );
  }
```

### 4d. Pass `type` where `VerificationBadge` is rendered

In the `ResultCard` component, find:
```jsx
{showCanLII && <VerificationBadge verification={verification} t={t} />}
```

Change to:
```jsx
{showCanLII && <VerificationBadge verification={verification} t={t} type={type} />}
```

---

## Step 5: Add ground truth enrichment box in `ResultCard.jsx`

After the "Why It Matched" section (after the closing `)}` of the `{matchedText && (` block), and before the `VerificationBadge` line, add:

```jsx
      {/* Ground truth from Criminal Code lookup */}
      {type === "criminal_code" && verification?.status === "verified" && verification.title && (
        <div style={{
          marginTop: 8, padding: "8px 12px",
          background: t.bgAlt, border: `1px solid ${t.borderLight}`,
          fontFamily: "'Courier New', monospace", fontSize: 12,
          color: t.textSecondary, lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 700, color: t.text }}>{verification.title}</span>
          {verification.severity && (
            <span> · {verification.severity}</span>
          )}
          {verification.maxPenalty && (
            <span> · Max: {verification.maxPenalty}</span>
          )}
        </div>
      )}
```

This shows the official title, severity, and max penalty from the Criminal Code directly below the AI's summary. If the AI says "Break and enter" but the Act says "Breaking and entering with intent, committing offence or breaking out", the user sees it.

---

## Step 6: Handle response format in `Results.jsx`

The `Results.jsx` component parses the verify response as `json.results` (an array of objects). The verify endpoint returns `{ results: [...], remaining: N }`.

Each result object includes `{ citation, status, url, searchUrl, title, ... }`. The component builds a map keyed by `citation`:

```javascript
json.results.forEach((result) => {
  verificationMap[result.citation] = { status: result.status, url: result.url, ... };
});
```

The new Criminal Code verification adds `severity` and `maxPenalty` to the response object, but `Results.jsx` doesn't destructure those into the map. Update the mapping in `Results.jsx` to pass all fields through.

Find:
```javascript
verificationMap[result.citation] = {
  status: result.status,
  url: result.url,
  searchUrl: result.searchUrl,
  title: result.title,
};
```

Replace with:
```javascript
verificationMap[result.citation] = {
  status: result.status,
  url: result.url,
  searchUrl: result.searchUrl,
  title: result.title,
  severity: result.severity,
  maxPenalty: result.maxPenalty,
};
```

---

## Testing

After all changes, run `npm run dev` and submit the impaired driving example scenario.

### Expected behavior:

1. **Network tab:** POST to `/api/verify-citations` fires. Response includes Criminal Code entries with `status: "verified"`, e.g.:
   ```json
   { "citation": "s. 320.14(1)(a)", "status": "verified", "title": "Operation while impaired", "severity": "Hybrid", "maxPenalty": "10 years / life if death", "url": "https://laws-lois.justice.gc.ca/eng/acts/c-46/section-320.14.html" }
   ```
2. **Criminal Code cards:** Show green "✓ Confirmed — Justice Laws ↗" badge linking to the specific section
3. **Ground truth box:** Courier New box below AI summary showing: **Operation while impaired** · Hybrid · Max: 10 years / life if death
4. **Case law cards:** Still show grey "→ Search CanLII ↗" (until you get the CANLII_API_KEY set in Vercel env, at which point they'd show green "Verified on CanLII")
5. **Prompt:** The AI should return fewer but more confident results

### Edge cases to test:
- Section NOT in the 490-entry table (e.g. AI returns `s. 487`) → shows "unverified" with link to Justice Laws section page
- Charter sections (e.g. `s. 7`, `s. 11(b)`) → no badge (since `showCanLII` is only true for `case_law` and `criminal_code`)
- Old format results → still handled by the `isOldFormat` check

---

## Final checklist

- [ ] `criminalCodeData.js` moved from root to `src/lib/criminalCodeData.js`
- [ ] `api/verify-citations.js` imports `lookupSection` and `normalizeSection`
- [ ] `api/verify-citations.js` has `CRIMINAL_CODE_PATTERN` and handles CC before `parseCitation`
- [ ] `src/lib/prompts.js` has "return fewer results rather than fabricating" language
- [ ] `ResultCard.jsx` `VerificationBadge` accepts and uses `type` prop
- [ ] `ResultCard.jsx` has ground truth enrichment box for verified Criminal Code items
- [ ] `Results.jsx` passes `severity` and `maxPenalty` through in the verification map
- [ ] `npm run dev` starts without errors
- [ ] Impaired driving scenario: CC sections show green "Confirmed" badges
- [ ] `grep "construct plausible" src/lib/prompts.js` returns nothing

## Commit message
```
feat: Criminal Code validation + prompt hardening + badge fix

- Move criminalCodeData.js (490 sections) to src/lib/
- Add Criminal Code pattern detection to verify-citations.js
- Validate AI sections against official Criminal Code data
- Harden system prompt: prefer fewer real results over fabricated ones
- Pass type prop to VerificationBadge for context-aware labels
- Show "Confirmed — Justice Laws" for verified CC sections
- Display ground truth title/severity/penalty from the Act
- Link directly to specific section on laws-lois.justice.gc.ca
```
