// /api/_cors.js — Shared CORS configuration for all CaseDive API routes.

export const ALLOWED_ORIGINS = [
  "https://casedive.ca",
  "https://www.casedive.ca",
  "https://casefinder-project.vercel.app",
];

/**
 * Applies CORS headers to the response.
 * @param {object} req - Vercel/Node IncomingMessage
 * @param {object} res - Vercel/Node ServerResponse
 * @param {string} methods - e.g. "POST, OPTIONS" or "GET, OPTIONS"
 * @param {string} headers - e.g. "Content-Type" or "Authorization, Content-Type"
 */
export function applyCorsHeaders(req, res, methods, headers) {
  const origin = req.headers.origin ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", headers);
  res.setHeader("Vary", "Origin");
}
