---
name: new-endpoint
description: Scaffold a new CaseDive Vercel serverless API endpoint with all mandatory boilerplate pre-wired
allowed_tools: ["Bash", "Write", "Read", "Glob"]
version: "1.0.0"
rollback: "delete the scaffolded api/<endpoint-name>.js if the invariant review fails or the endpoint is no longer needed"
observation_hooks:
  - verify: "ls api/*.js | sort"
feedback_hooks:
  - on_failure: "confirm the api-invariant-reviewer passed before adding business logic"
---

# /new-endpoint

Scaffold a new CaseDive Vercel serverless API endpoint with all mandatory boilerplate pre-wired.

**Usage:** `/new-endpoint <endpoint-name> [METHOD]`

- `endpoint-name`: kebab-case filename without extension (e.g. `search-cases`)
- `METHOD`: HTTP verb (default: `POST`)

**Example:** `/new-endpoint search-cases POST`

allowed_tools: Bash, Write, Read, Glob

## Steps

1. Parse `$ARGUMENTS` to extract `<endpoint-name>` and `<METHOD>` (default `POST` if omitted).

2. Write `api/<endpoint-name>.js` with the following content — substitute the actual endpoint name and method throughout:

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
    return res
      .status(429)
      .json({ error: "Rate limit exceeded. Please try again later." });
  }

  // TODO: destructure and validate required body fields
  const {} = req.body || {};

  // TODO: validate required fields
  // if (!field || typeof field !== "string") {
  //   logValidationError(requestId, "<endpoint-name>", "field is required", "field");
  //   return res.status(400).json({ error: "field is required" });
  // }

  try {
    // TODO: implement business logic

    logSuccess(
      requestId,
      "<endpoint-name>",
      200,
      Date.now() - startMs,
      rlResult,
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    const statusCode = err.status
      ? err.status >= 500
        ? 502
        : err.status
      : 500;
    logError(
      requestId,
      "<endpoint-name>",
      err,
      statusCode,
      Date.now() - startMs,
    );
    if (err.status)
      return res
        .status(statusCode)
        .json({ error: "Service temporarily unavailable." });
    return res.status(500).json({ error: "Internal server error" });
  }
}
```

3. Invoke the `api-invariant-reviewer` agent on `api/<endpoint-name>.js` to confirm all three invariants pass (rate limiting, input validation, security headers) before any business logic is written.

4. Report the created file path and remind the user to:
   - Fill in the `TODO` sections (body fields, validation, business logic)
   - Add the endpoint to `vercel.json` functions config if needed
   - Run `npm run dev:api` (not `npm run dev`) to test locally
