---
name: canlii-case-verification
description: Verify cases against CanLII API, handle rate limiting, manage caching, and parse responses. Use this skill whenever working with CanLII API integration, testing case verification, debugging API responses, handling rate limits, or caching verified cases. Provides API endpoint patterns, rate limit handling, response parsing, error handling, cache strategy, test cases, and debugging checklist.
---

# CanLII Case Verification

## What This Skill Does

- Shows **correct CanLII API endpoint format** for different courts
- Explains **rate limiting** (2 requests/second, 1 at a time)
- Provides **response parsing** (extract metadata + summary)
- Covers **error handling** (case not found, API errors, malformed citations)
- Details **caching strategy** (24-hour TTL, when to cache)
- Includes **test cases** (real SCC citations you can verify)
- Debugging checklist for common issues

---

## CanLII API Basics

### Your Setup

- **API Key:** Stored in `.env` as `CANLII_API_KEY`
- **Rate Limits:** 5,000 queries/day, 2 requests/second, 1 at a time
- **Base URL:** `https://api.canlii.org/v1`
- **Authentication:** Bearer token in Authorization header

### What You Can Get

✅ Case metadata (citation, parties, date, court)
✅ Case summary (abstract from CanLII)
❌ Full case text (NOT available via API)
❌ Text search within cases (NOT available via API)

---

## API Endpoint Formats

### Supreme Court of Canada (SCC)

**To verify a case like: `"R v. Morgentaler, 1988 SCC 30"`**

1. **Parse the citation:**
   - Year: `1988`
   - Court: `SCC`
   - Number: `30`

2. **Build the API call:**

   ```
   GET https://api.canlii.org/v1/cases?db=csc-scc&keywords=Morgentaler%201988
   ```

   OR (if you have case ID):

   ```
   GET https://api.canlii.org/v1/cases/csc-scc/1988scc30
   ```

3. **Add authentication header:**
   ```
   Authorization: apikey YOUR_CANLII_API_KEY
   ```

### Court Database IDs

```
Federal Courts:
  Supreme Court of Canada (SCC): csc-scc
  Federal Court of Appeal (FCA): fca
  Federal Court (FCC/FCT): fct
  Tax Court of Canada (TCC): tcc
  Court Martial Appeal Court (CMAC): cmac

Ontario:
  Court of Appeal (ONCA): onca
  Superior Court (ONSC): onsc
  Ontario Court of Justice (ONCJ): oncj
  Divisional Court (ONDC): ondc

British Columbia:
  Court of Appeal (BCCA): bcca
  Supreme Court (BCSC): bcsc
  Provincial Court (BCPC): bcpc

Alberta:
  Court of Appeal (ABCA): abca
  Court of King's Bench (ABQB/ABKB): abqb
  Provincial Court (ABPC): abpc

Quebec:
  Cour d'appel (QCCA): qcca
  Cour supérieure (QCCS): qccs
  Cour du Québec (QCCQ): qccq

Manitoba:
  Court of Appeal (MBCA): mbca
  Court of King's Bench (MBQB): mbqb
  Provincial Court (MBPC): mbpc

Saskatchewan:
  Court of Appeal (SKCA): skca
  Court of King's Bench (SKQB): skqb
  Provincial Court (SKPC): skpc

Atlantic Provinces:
  Nova Scotia (NSCA, NSSC, NSPC): nsca, nssc, nspc
  New Brunswick (NBCA, NBQB, NBPC): nbca, nbqb, nbpc
  PEI (PECA, PEISC): peca, peisc
  Newfoundland (NLCA, NLSC, NLPC): nlca, nlsc, nlpc

Territories:
  Yukon (YKCA, YKSC, YKPC): ykca, yksc, ykpc
  NWT (NWTCA, NWTSC): nwtca, nwtsc
  Nunavut (NUCJ): nucj
```

---

## Response Parsing

### Success Response (Case Found)

```json
{
  "caseId": {
    "en": "1988-scc-30"
  },
  "citation": "R v. Morgentaler, 1988 SCC 30",
  "citations": [
    {
      "en": "R v. Morgentaler, 1988 SCC 30"
    }
  ],
  "parties": "R v. Morgentaler",
  "neutral": "1988 SCC 30",
  "title": "R v. Morgentaler",
  "summary": "[CanLII summary text]",
  "judgments": [
    {
      "en": "[Full judgment text if available]"
    }
  ],
  "url": "https://canlii.org/en/ca/scc/doc/1988/1988scc30/1988scc30.html"
}
```

### Parse This Into:

```json
{
  "citation": "R v. Morgentaler, 1988 SCC 30",
  "parties": "R v. Morgentaler",
  "year": 1988,
  "court": "SCC",
  "summary": "[CanLII summary]",
  "canliiUrl": "https://canlii.org/en/ca/scc/doc/1988/1988scc30/1988scc30.html",
  "verified": true,
  "verifiedAt": "2026-03-13T12:00:00Z"
}
```

### Error Response (Case Not Found)

```json
{
  "error": "Case not found"
}
```

### Handle As:

```json
{
  "citation": "R v. FakeCitation, 2000 SCC 999",
  "verified": false,
  "reason": "Case not found on CanLII",
  "verifiedAt": "2026-03-13T12:00:00Z"
}
```

---

## Rate Limiting Implementation

### The Problem

- You have **2 requests/second** limit
- If you verify 5 cases at once, you'll hit rate limit
- Solution: **Queue them sequentially**

### Implementation Pattern

```javascript
// Pseudocode for sequential verification

async function verifyMultipleCases(citations) {
  const verified = [];
  const unverified = [];

  for (const citation of citations) {
    try {
      // Wait before request to respect 2 req/sec limit
      await delay(500); // 500ms = 2 requests/second max

      // Make API call
      const result = await verifyCaseAgainstCanLII(citation);

      if (result.found) {
        verified.push(result);
      } else {
        unverified.push({
          citation,
          verified: false,
          reason: "Case not found on CanLII",
        });
      }
    } catch (error) {
      unverified.push({
        citation,
        verified: false,
        reason: `API error: ${error.message}`,
      });
    }
  }

  return { verified, unverified };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Key Points

- **500ms delay between requests** = 2 requests per second (safe)
- **Catch errors gracefully** — don't crash if one case fails
- **Track unverified cases** — show user which ones failed
- **Don't retry indefinitely** — if it fails once, mark as unverified

---

## Caching Strategy

### Why Cache?

- Avoid verifying the same case twice
- Stay under 5,000 daily API quota
- Reduce latency (local cache is instant)
- Prevent redundant API calls

### Cache Key Format

```
KEY: "case:{citation}"
VALUE: { verified case data }
TTL: 24 hours
```

### Example Cache Entries

```
cache["case:1988 SCC 30"] = {
  citation: "R v. Morgentaler, 1988 SCC 30",
  parties: "R v. Morgentaler",
  summary: "[CanLII summary]",
  canliiUrl: "...",
  verified: true,
  verifiedAt: "2026-03-13T12:00:00Z"
}

cache["case:2000 SCC 999"] = {
  citation: "R v. FakeCitation, 2000 SCC 999",
  verified: false,
  reason: "Case not found on CanLII",
  verifiedAt: "2026-03-13T12:00:00Z"
}
```

### Cache Implementation

```javascript
// Use in-memory cache with 24-hour TTL

const caseCache = new Map(); // citation -> { data, expiresAt }

function getCachedCase(citation) {
  const cached = caseCache.get(citation);
  if (!cached) return null;

  // Check if expired
  if (Date.now() > cached.expiresAt) {
    caseCache.delete(citation);
    return null;
  }

  return cached.data;
}

function setCacheCase(citation, data) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  caseCache.set(citation, { data, expiresAt });
}

async function verifyCase(citation) {
  // Check cache first
  const cached = getCachedCase(citation);
  if (cached) return cached;

  // Not in cache, call API
  const result = await callCanLIIAPI(citation);

  // Cache result (both verified and unverified)
  setCacheCase(citation, result);

  return result;
}
```

---

## Test Cases (Wide Variety)

Use these to test your implementation across different jurisdictions and levels:

### ✅ Supreme Court of Canada (SCC)

1. **R v. Morgentaler, 1988 SCC 30** (Abortion/Charter)
2. **R v. Jordan, 2016 SCC 27** (Trial delay)
3. **R v. Grant, 2009 SCC 32** (Section 24(2) Charter)

### ✅ Ontario (ONCA/ONSC/ONCJ)

1. **R v. Sullivan, 2022 SCC 19** (Originated in ON, striking down s. 33.1)
2. **R v. Sharma, 2022 SCC 39** (Sentencing, ON)
3. **R v. McColman, 2023 SCC 9** (Random breath testing, ON)

### ✅ British Columbia (BCCA/BCSC)

1. **R v. Ndhlovu, 2022 SCC 38** (SOIRA, BC)
2. **R v. Samaniego, 2022 SCC 9** (Trial fairness, BC)

### ✅ Alberta (ABCA/ABQB)

1. **R v. Hills, 2023 SCC 2** (Mandatory minimums, AB)
2. **R v. Canfield, 2020 ABCA 383** (Cell phone search at border)

### ✅ Other Provinces & Territories

1. **R v. Comeau, 2018 SCC 15** (Interprovincial trade, NB)
2. **R v. Tessier, 2022 SCC 35** (Voluntary statements, NL)
3. **R v. C.P., 2021 SCC 19** (Youth sentencing, SK)
4. **R v. J.F., 2022 SCC 17** (Trial delay, QC)

### ❌ Cases That Should NOT Verify (Use to Test Error Handling)

1. **R v. FakeName, 2000 SCC 999** (Doesn't exist)
2. **R v. MadeUp, 1950 SCC 1** (Doesn't exist)
3. **Invalid Citation Format** (Malformed)
4. **R. v. Morgentaler, [1988] 1 S.C.R. 30** (Different format, might not match)

### How to Test

```bash
# Test one case
curl -H "Authorization: apikey YOUR_API_KEY" \
  "https://api.canlii.org/v1/cases?db=csc-scc&keywords=Morgentaler%201988"

# Should return case data if found
```

---

## Error Handling

### Common API Errors

| Error                   | Cause               | Solution                                                        |
| ----------------------- | ------------------- | --------------------------------------------------------------- |
| `401 Unauthorized`      | Bad/missing API key | Check `.env` file, verify key is correct                        |
| `429 Too Many Requests` | Rate limit exceeded | Add longer delay between requests (use 1000ms instead of 500ms) |
| `404 Not Found`         | Case doesn't exist  | Mark as unverified, continue                                    |
| `500 Server Error`      | CanLII API down     | Retry after 5 seconds, mark as unverified if retries fail       |
| `400 Bad Request`       | Malformed citation  | Log the citation, skip it, continue                             |
| `Network timeout`       | Connection lost     | Retry with exponential backoff                                  |

### Implementation

```javascript
async function verifyCaseWithErrorHandling(citation, apiKey) {
  let retries = 3;
  let delay = 1000; // ms

  while (retries > 0) {
    try {
      const response = await fetch(
        `https://api.canlii.org/v1/cases?db=csc-scc&keywords=${encodeURIComponent(citation)}`,
        {
          headers: { Authorization: `apikey ${apiKey}` },
          timeout: 10000, // 10 second timeout
        },
      );

      // Handle status codes
      if (response.status === 401) {
        throw new Error("Invalid API key");
      }
      if (response.status === 429) {
        // Rate limited — wait and retry
        console.log("Rate limited, waiting...");
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2; // Exponential backoff
        retries--;
        continue;
      }
      if (response.status === 404 || response.status === 400) {
        // Case not found or bad request
        return { verified: false, reason: "Case not found or invalid format" };
      }
      if (response.status >= 500) {
        // Server error — retry
        retries--;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }

      const data = await response.json();
      return parseCanLIIResponse(data);
    } catch (error) {
      console.error(`Error verifying ${citation}:`, error.message);
      retries--;
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }

  // All retries failed
  return { verified: false, reason: "API error after retries" };
}
```

---

## Citation Format Handling

### Citation Formats Claude Might Generate

Claude might output cases in different formats:

```
1. Neutral citation: "1988 SCC 30"
2. With parties: "R v. Morgentaler, 1988 SCC 30"
3. Bracket format: "R v. Morgentaler, [1988] 1 S.C.R. 30"
4. Reporter format: "R v. Morgentaler (1988), 63 O.R. (2d) 281 (C.A.)"
```

**Solution:** Normalize to neutral citation before API call

```javascript
function normalizeCitation(citation) {
  // Extract neutral citation: YYYY COURT NUMBER
  const match = citation.match(/(\d{4})\s+([A-Z]{2,4})\s+(\d+)/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return citation; // Return as-is if can't parse
}

// Test
console.log(normalizecitation("R v. Morgentaler, 1988 SCC 30"));
// Output: "1988 SCC 30"

console.log(normalizeCase("R v. Morgentaler, [1988] 1 S.C.R. 30"));
// Output: "1988 S.C.R. 30" (might not match if SCR != SCC)
```

---

## Debugging Checklist

When case verification fails:

- [ ] Check API key in `.env` is correct
- [ ] Test with a known good case (R v. Morgentaler, 1988 SCC 30)
- [ ] Check rate limiting isn't triggered (are you making too many requests?)
- [ ] Verify citation format is normalized (should be "YYYY COURT #")
- [ ] Check CanLII API is online (try in browser: canlii.org)
- [ ] Look at full API response (not just status code)
- [ ] Check cache isn't returning stale data
- [ ] Try disabling cache temporarily to isolate issue
- [ ] Log all API requests and responses for debugging
- [ ] Check timeout setting (should be at least 10 seconds)

---

## Next Steps

Once you've implemented this:

1. Create `/api/verify-cases` endpoint that uses this logic
2. Test with the test cases above
3. Monitor API quota usage (log each call)
4. Cache verified cases for 24 hours
5. Ready to integrate with Claude analysis results
