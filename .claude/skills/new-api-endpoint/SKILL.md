---
name: new-api-endpoint
description: Scaffolds a new CaseDive Vercel serverless API endpoint with rate limiting, input validation, security headers, and logging pre-wired. Invoke with the endpoint name and HTTP method.
---

# New API Endpoint

Scaffold a new endpoint file at `api/<name>.js` following the CaseDive conventions.

**Arguments**: `$ARGUMENTS` — format: `<endpoint-name> <METHOD>` (e.g. `search-cases POST`)

## Steps

1. Parse `$ARGUMENTS` to extract `<endpoint-name>` and `<METHOD>` (default METHOD to `POST` if omitted).

2. Create `api/<endpoint-name>.js` with the following structure — fill in the endpoint name and method throughout:

```js
// /api/<endpoint-name>.js
import { checkRateLimit, getClientIp, rateLimitHeaders } from "./_rateLimit.js";
import { randomUUID } from "crypto";
import {
  applyStandardApiHeaders,
  handleOptionsAndMethod,
  validateJsonRequest,
} from "./_apiCommon.js";
import {
  logRequestStart,
  logRateLimitCheck,
  logValidationError,
  logSuccess,
  logError,
} from "./_logging.js";

export default async function handler(req, res) {
  const requestId = req.headers["x-vercel-id"] || randomUUID();
  const startMs = Date.now();
  logRequestStart(req, "<endpoint-name>", requestId);
  applyStandardApiHeaders(req, res, "<METHOD>, OPTIONS", "Content-Type");

  if (handleOptionsAndMethod(req, res, "<METHOD>")) return;
  if (
    !validateJsonRequest(req, res, {
      requestId,
      endpoint: "<endpoint-name>",
      maxBytes: 10_000,
      logValidationError,
    })
  ) {
    return;
  }

  const rlResult = await checkRateLimit(getClientIp(req), "<endpoint-name>");
  logRateLimitCheck(requestId, "<endpoint-name>", rlResult, getClientIp(req));
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (!rlResult.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
  }

  // TODO: destructure and validate required body fields
  const { } = req.body || {};

  // TODO: validate required fields
  // if (!field || typeof field !== "string") {
  //   logValidationError(requestId, "<endpoint-name>", "field is required", "field");
  //   return res.status(400).json({ error: "field is required" });
  // }

  try {
    // TODO: implement business logic

    logSuccess(requestId, "<endpoint-name>", 200, Date.now() - startMs, rlResult);
    return res.status(200).json({ ok: true });
  } catch (err) {
    const statusCode = err.status ? (err.status >= 500 ? 502 : err.status) : 500;
    logError(requestId, "<endpoint-name>", err, statusCode, Date.now() - startMs);
    if (err.status) return res.status(statusCode).json({ error: "Service temporarily unavailable." });
    return res.status(500).json({ error: "Internal server error" });
  }
}
```

3. After creating the file, invoke the `api-invariant-reviewer` agent on the new file to confirm all three invariants are satisfied.

4. Confirm the file path and remind the user to:
   - Fill in the `TODO` sections
   - Add the endpoint to any relevant docs or `vercel.json` route config if needed
   - Run `npm run dev:api` (not `npm run dev`) to test it locally
