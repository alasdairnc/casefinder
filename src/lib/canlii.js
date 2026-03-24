// src/lib/canlii.js — CanLII citation utilities
// Citation parsing, URL building, and API lookup

const CANLII_BASE = "https://api.canlii.org/v1";
const CANLII_WEB = "https://www.canlii.org";

// Maps court abbreviations → CanLII web URL path (jurisdiction/court)
export const COURT_WEB_MAP = {
  SCC: "ca/scc",   CSC: "ca/scc",
  FCA: "ca/fca",   FCC: "ca/fct",   FCT: "ca/fct",
  ONCA: "on/onca", ONSC: "on/onsc", ONCJ: "on/oncj", ONDC: "on/ondc",
  BCCA: "bc/bcca", BCSC: "bc/bcsc", BCPC: "bc/bcpc",
  ABCA: "ab/abca", ABKB: "ab/abkb", ABQB: "ab/abqb", ABPC: "ab/abpc",
  QCCA: "qc/qcca", QCCS: "qc/qccs", QCCQ: "qc/qccq",
  MBCA: "mb/mbca", MBQB: "mb/mbqb", MBPC: "mb/mbpc",
  SKCA: "sk/skca", SKQB: "sk/skqb", SKPC: "sk/skpc",
  NSCA: "ns/nsca", NSSC: "ns/nssc", NSPC: "ns/nspc",
  NBCA: "nb/nbca", NBQB: "nb/nbqb", NBPC: "nb/nbpc",
  PECA: "pe/peca", PEICA: "pe/peca",
  NLCA: "nl/nlca", NLSC: "nl/nlsc", NLPC: "nl/nlpc",
  NWTCA: "nt/nwtca", NWTSC: "nt/nwtsc",
  NUCJ: "nu/nucj",  NUCI: "nu/nucj",
  YKCA: "yk/ykca",  YKSC: "yk/yksc", YKPC: "yk/ykpc",
  TCC: "ca/tcc",    CMAC: "ca/cmac",
};

// Maps court abbreviations → CanLII API database ID (flat, from /v1/caseBrowse/en/)
export const COURT_API_MAP = {
  SCC: "csc-scc",  CSC: "csc-scc",
  FCA: "fca",      FCC: "fct",      FCT: "fct",
  ONCA: "onca",    ONSC: "onsc",    ONCJ: "oncj",    ONDC: "ondc",
  BCCA: "bcca",    BCSC: "bcsc",    BCPC: "bcpc",
  ABCA: "abca",    ABKB: "abkb",    ABQB: "abqb",    ABPC: "abpc",
  QCCA: "qcca",    QCCS: "qccs",    QCCQ: "qccq",
  MBCA: "mbca",    MBQB: "mbqb",    MBPC: "mbpc",
  SKCA: "skca",    SKQB: "skqb",    SKPC: "skpc",
  NSCA: "nsca",    NSSC: "nssc",    NSPC: "nspc",
  NBCA: "nbca",    NBQB: "nbqb",    NBPC: "nbpc",
  PECA: "peca",    PEICA: "peca",
  NLCA: "nlca",    NLSC: "nlsc",    NLPC: "nlpc",
  NWTCA: "nwtca",  NWTSC: "nwtsc",
  NUCJ: "nucj",    NUCI: "nucj",
  YKCA: "ykca",    YKSC: "yksc",    YKPC: "ykpc",
  TCC: "tcc",      CMAC: "cmac",
};

// Keep COURT_DB_MAP as alias for backwards compat
export const COURT_DB_MAP = COURT_API_MAP;

/**
 * Parse a Canadian case citation.
 * Handles:
 * - Neutral citation: "R v Smith, 2020 ONCA 123" or "2020 ONCA 123"
 * - CanLII neutral: "R v Smith, 2020 CanLII 123 (SCC)" or "2020 CanLII 123 (SCC)"
 * - SCR citation: "R v Smith, [1988] 1 SCR 30"
 * Returns { parties, year, courtCode, number, apiDbId, webDbId, isLegacy } or null.
 */
export function parseCitation(citation) {
  if (!citation || typeof citation !== "string") return null;

  const trimmed = citation.trim();

  // 1. Standard neutral citation: "Parties, YYYY COURT NUM" or bare "YYYY COURT NUM"
  const neutral = trimmed.match(/^(?:(.+?),\s*)?(\d{4})\s+([A-Z]{2,8})\s+(\d+)$/);
  if (neutral) {
    const [, parties, year, courtCode, number] = neutral;
    const upper = courtCode.toUpperCase();
    return {
      parties: parties ? parties.trim() : null,
      year,
      courtCode: upper,
      number,
      apiDbId: COURT_API_MAP[upper] || null,
      webDbId: COURT_WEB_MAP[upper] || null,
      isLegacy: false,
    };
  }

  // 2. CanLII neutral citation: "Parties, YYYY CanLII NUM (COURT)" or bare "YYYY CanLII NUM (COURT)"
  const canliiNeutral = trimmed.match(/^(?:(.+?),\s*)?(\d{4})\s+CanLII\s+(\d+)\s+\(([A-Z]{2,8})\)$/i);
  if (canliiNeutral) {
    const [, parties, year, number, courtCode] = canliiNeutral;
    const upper = courtCode.toUpperCase();
    return {
      parties: parties ? parties.trim() : null,
      year,
      courtCode: upper,
      number,
      apiDbId: COURT_API_MAP[upper] || null,
      webDbId: COURT_WEB_MAP[upper] || null,
      isLegacy: true, // Uses "canlii" as part of ID: YYYYcanliiNNN
    };
  }

  // 3. SCR citation: "Parties, [YYYY] N SCR NNN"
  const scr = trimmed.match(/^(?:(.+?),\s*)?\[(\d{4})\]\s+\d+\s+SCR\s+\d+$/i);
  if (scr) {
    const [, parties, year] = scr;
    return {
      parties: parties ? parties.trim() : null,
      year,
      courtCode: "SCC",
      number: null, // SCR doesn't map directly to CanLII number without lookup
      apiDbId: "csc-scc",
      webDbId: "ca/scc",
      isLegacy: true,
    };
  }

  return null;
}

/**
 * Build the CanLII internal case ID.
 * Handles both neutral (2020onca123) and CanLII-neutral (1988canlii90).
 */
export function buildCaseId({ year, courtCode, number, isLegacy }) {
  if (!year || !courtCode) return null;
  if (isLegacy && number) {
    return `${year}canlii${number}`;
  }
  if (!number) return null;
  return `${year}${courtCode.toLowerCase()}${number}`;
}

/**
 * Build a CanLII API URL for a specific case (requires API key).
 */
export function buildApiUrl(dbId, caseId, apiKey) {
  return `${CANLII_BASE}/caseBrowse/en/${dbId}/${caseId}/?api_key=${encodeURIComponent(apiKey)}`;
}

/**
 * Build a CanLII web URL for a case (no API key, public).
 * Format: /en/{dbId}/doc/{year}/{caseId}/{caseId}.html
 */
export function buildCaseUrl(dbId, year, caseId) {
  return `${CANLII_WEB}/en/${dbId}/doc/${year}/${caseId}/${caseId}.html`;
}

/**
 * Build a CanLII full-text search URL for a citation string.
 */
export function buildSearchUrl(citation) {
  return `${CANLII_WEB}/en/#search/text=${encodeURIComponent(citation)}`;
}

/**
 * Check whether submitted party names plausibly match the CanLII API title.
 * Protects against ID collisions where a hallucinated citation shares a year+court+number
 * with a real but unrelated case (e.g. "R v Penno, 2021 SCC 44" → H.M.B. Holdings Ltd.).
 */
export function partiesMatch(submittedParties, canliiTitle) {
  if (!submittedParties) return true; // Can't verify if not provided, assume match
  if (!canliiTitle) return false;

  const STOP_WORDS = new Set([
    "r", "v", "the", "her", "his", "majesty", "queen", "king",
    "attorney", "general", "and", "of", "in", "a", "an",
    "ltd", "inc", "corp", "co", "et", "al",
    "des", "du", "le", "la", "les",
  ]);

  const tokenize = (s) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const submitted = tokenize(submittedParties);
  const canlii = new Set(tokenize(canliiTitle));

  // If we can't extract tokens from submitted parties, allow through
  if (submitted.length === 0) return true;
  return submitted.some((word) => canlii.has(word));
}

/**
 * Look up a single citation against the CanLII API.
 * Returns a verification result object:
 *   { status: "verified" | "not_found" | "unverified" | "unparseable" | "unknown_court" | "error", url?, searchUrl, title? }
 *
 * Degrades gracefully when apiKey is absent (returns "unverified" with a direct URL).
 */
export async function lookupCase(citation, apiKey) {
  const parsed = parseCitation(citation);

  if (!parsed) {
    return { status: "unparseable", searchUrl: buildSearchUrl(citation) };
  }

  if (!parsed.apiDbId) {
    return { status: "unknown_court", searchUrl: buildSearchUrl(citation) };
  }

  const caseId = buildCaseId({ year: parsed.year, courtCode: parsed.courtCode, number: parsed.number });
  if (!caseId) {
    return { status: "unparseable", searchUrl: buildSearchUrl(citation) };
  }

  const caseUrl = buildCaseUrl(parsed.webDbId, parsed.year, caseId);
  const searchUrl = buildSearchUrl(citation);

  // No API key — return unverified with a best-guess URL
  if (!apiKey) {
    return { status: "unverified", url: caseUrl, searchUrl };
  }

  try {
    const res = await fetch(buildApiUrl(parsed.apiDbId, caseId, apiKey));

    if (res.status === 404) {
      return { status: "not_found", searchUrl };
    }
    if (!res.ok) {
      return { status: "error", searchUrl };
    }

    const data = await res.json();
    const canliiTitle = data.title || "";
    if (!partiesMatch(parsed.parties, canliiTitle)) {
      return { status: "not_found", searchUrl };
    }
    return {
      status: "verified",
      url: caseUrl,
      searchUrl,
      title: canliiTitle || citation,
    };
  } catch {
    return { status: "error", searchUrl };
  }
}
