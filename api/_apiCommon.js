import { applyCorsHeaders } from "./_cors.js";

export function applyStandardApiHeaders(req, res, methods = "POST, OPTIONS", allowHeaders = "Content-Type") {
  applyCorsHeaders(req, res, methods, allowHeaders);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'none'");
  res.setHeader("Cache-Control", "no-store");
}

export function handleOptionsAndMethod(req, res, method) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  if (req.method !== method) {
    res.status(405).json({ error: "Method not allowed" });
    return true;
  }
  return false;
}

export function validateJsonRequest(req, res, {
  requestId,
  endpoint,
  maxBytes,
  logValidationError,
}) {
  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json")) {
    logValidationError(requestId, endpoint, "Invalid Content-Type", "content-type");
    res.status(415).json({ error: "Content-Type must be application/json" });
    return false;
  }

  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (Number.isFinite(maxBytes) && contentLength > maxBytes) {
    logValidationError(requestId, endpoint, "Request body too large", "content-length");
    res.status(413).json({ error: "Request body too large" });
    return false;
  }

  return true;
}
