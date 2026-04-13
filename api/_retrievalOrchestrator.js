import { retrieveVerifiedCaseLaw } from "./_caseLawRetrieval.js";

/**
 * Shared retrieval runner for endpoints that need verified case-law candidates.
 * Supports an optional timeout budget to avoid long-hanging upstream searches.
 */
export async function runCaseLawRetrieval({
  scenario,
  filters,
  aiSuggestions = [],
  aiCaseLaw = [],
  landmarkMatches = [],
  criminalCode = [],
  apiKey,
  maxResults = 10,
  timeoutMs = 0,
  retrieveFn = retrieveVerifiedCaseLaw,
}) {
  const retrievalPromise = Promise.resolve(
    retrieveFn({
      scenario,
      filters,
      aiSuggestions,
      aiCaseLaw,
      landmarkMatches,
      criminalCode,
      apiKey,
      maxResults,
    }),
  );

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return retrievalPromise;
  }

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        Object.assign(new Error("Retrieval timeout"), { isTimeout: true }),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([retrievalPromise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
