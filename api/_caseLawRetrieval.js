// api/_caseLawRetrieval.js
// Phase A helper: retrieve real case-law candidates from CanLII search endpoints
// and return only citations that verify through the existing lookup pipeline.

import { COURT_API_MAP, lookupCase, parseCitation } from "../src/lib/canlii.js";

const CANLII_API_BASE = "https://api.canlii.org/v1";
const SEARCH_TIMEOUT_MS = 1800;
const MAX_TERMS = 2;
const MAX_DATABASES = 3;
const MAX_SEARCH_CALLS = 4;
const MAX_CANDIDATES = 6;
const MAX_VERIFICATION_CALLS = 6;

const DEFAULT_DB_IDS = ["csc-scc", "onca", "onsc", "bcca", "abca"];

const JURISDICTION_DB_IDS = {
  Ontario: ["onca", "onsc", "oncj"],
  "British Columbia": ["bcca", "bcsc", "bcpc"],
  Alberta: ["abca", "abqb", "abpc"],
  Quebec: ["qcca", "qccs", "qccq"],
  Manitoba: ["mbca", "mbqb", "mbpc"],
  Saskatchewan: ["skca", "skqb", "skpc"],
  "Nova Scotia": ["nsca", "nssc", "nspc"],
  "New Brunswick": ["nbca", "nbqb", "nbpc"],
  "Newfoundland and Labrador": ["nlca", "nlsc", "nlpc"],
  "Prince Edward Island": ["peca"],
};

const COURT_LEVEL_DB_IDS = {
  scc: ["csc-scc"],
  appeal: ["onca", "bcca", "abca", "qcca", "mbca", "skca", "nsca", "nbca", "nlca", "peca"],
  superior: ["onsc", "bcsc", "abqb", "qccs", "mbqb", "skqb", "nssc", "nbqb", "nlsc"],
  provincial: ["oncj", "bcpc", "abpc", "qccq", "mbpc", "skpc", "nspc", "nbpc", "nlpc"],
};

const DB_TO_COURT_CODE = (() => {
  const map = new Map();
  for (const [code, dbId] of Object.entries(COURT_API_MAP)) {
    if (!dbId) continue;
    if (!map.has(dbId)) {
      map.set(dbId, code);
      continue;
    }
    // Prefer the shorter/common code where there are aliases (e.g., SCC over CSC).
    const existing = map.get(dbId);
    if (code.length < existing.length) {
      map.set(dbId, code);
    }
  }
  if (map.has("csc-scc")) map.set("csc-scc", "SCC");
  return map;
})();

function getString(value) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  if (typeof value.en === "string") return value.en.trim();
  if (typeof value.fr === "string") return value.fr.trim();
  return "";
}

function sanitizeTerm(term) {
  if (typeof term !== "string") return "";
  return term.replace(/\s+/g, " ").trim();
}

function dedupeStrings(values) {
  const seen = new Set();
  const deduped = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(value);
  }
  return deduped;
}

function extractCaseLawSearchTerms({ scenario, aiSuggestions }) {
  const terms = [];

  if (Array.isArray(aiSuggestions)) {
    for (const suggestion of aiSuggestions) {
      if (!suggestion || suggestion.type !== "canlii") continue;
      const value = sanitizeTerm(suggestion.term || suggestion.label || "");
      if (value) terms.push(value);
    }
  }

  const scenarioFallback = sanitizeTerm(scenario || "")
    .split(" ")
    .slice(0, 12)
    .join(" ");
  if (scenarioFallback) {
    terms.push(scenarioFallback);
  }

  return dedupeStrings(terms).slice(0, MAX_TERMS);
}

function pickDatabaseTargets(filters = {}) {
  const { jurisdiction = "all", courtLevel = "all" } = filters || {};

  if (courtLevel === "scc") return ["csc-scc"];

  let ids = [];
  if (jurisdiction !== "all" && JURISDICTION_DB_IDS[jurisdiction]) {
    ids = [...JURISDICTION_DB_IDS[jurisdiction]];
  } else {
    ids = [...DEFAULT_DB_IDS];
  }

  if (courtLevel !== "all" && COURT_LEVEL_DB_IDS[courtLevel]) {
    const levelSet = new Set(COURT_LEVEL_DB_IDS[courtLevel]);
    const filtered = ids.filter((dbId) => levelSet.has(dbId));
    ids = filtered.length > 0 ? filtered : COURT_LEVEL_DB_IDS[courtLevel];
  }

  return dedupeStrings(ids).slice(0, MAX_DATABASES);
}

function buildSearchUrls(term, dbId, apiKey) {
  const encTerm = encodeURIComponent(term);
  const encDb = encodeURIComponent(dbId);
  const encKey = encodeURIComponent(apiKey);

  return [
    `${CANLII_API_BASE}/search/?text=${encTerm}&databaseId=${encDb}&api_key=${encKey}`,
    `${CANLII_API_BASE}/cases?db=${encDb}&keywords=${encTerm}&api_key=${encKey}`,
  ];
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeCitationText(citation, titleHint = "") {
  const raw = sanitizeTerm(citation);
  if (!raw) return null;
  if (parseCitation(raw)) return raw;

  // Neutral only: "2021 SCC 10" -> "R v X, 2021 SCC 10"
  const neutralOnly = raw.match(/^(\d{4})\s+([A-Z]{2,8})\s+(\d+)$/);
  if (neutralOnly && titleHint) {
    return `${titleHint}, ${neutralOnly[1]} ${neutralOnly[2]} ${neutralOnly[3]}`;
  }

  // Missing comma before neutral citation: "R v X 2021 SCC 10"
  const missingComma = raw.match(/^(.+?)\s+(\d{4})\s+([A-Z]{2,8})\s+(\d+)$/);
  if (missingComma) {
    return `${missingComma[1].trim()}, ${missingComma[2]} ${missingComma[3]} ${missingComma[4]}`;
  }

  return null;
}

function citationFromCaseId(caseIdValue, titleHint, dbId) {
  const caseId = sanitizeTerm(caseIdValue).toLowerCase();
  if (!caseId || !titleHint) return null;

  // Supports "2024onca123", "2024-onca-123", "2024onca123a"
  const compact = caseId.replace(/[^a-z0-9]/g, "");
  const match = compact.match(/(\d{4})([a-z]{2,8})(\d{1,6})/);
  if (!match) return null;

  const year = match[1];
  const number = String(parseInt(match[3], 10));
  const courtCode = DB_TO_COURT_CODE.get(dbId) || match[2].toUpperCase();
  return `${titleHint}, ${year} ${courtCode} ${number}`;
}

function candidateFromObject(obj, dbId, term) {
  if (!obj || typeof obj !== "object") return null;

  const title = getString(obj.title) || getString(obj.parties) || getString(obj.styleOfCause) || getString(obj.caseName);
  const citationRaw =
    getString(obj.citation) ||
    getString(obj.caseCitation) ||
    getString(obj.neutralCitation) ||
    getString(obj.neutral);

  let citation = normalizeCitationText(citationRaw, title);
  if (!citation && title) {
    const caseId = getString(obj.caseId) || getString(obj.id);
    citation = citationFromCaseId(caseId, title, dbId);
  }
  if (!citation) return null;

  const parsed = parseCitation(citation);
  if (!parsed) return null;

  return {
    citation,
    title: title || parsed.parties,
    summary: getString(obj.summary) || getString(obj.abstract) || getString(obj.snippet),
    url: getString(obj.url) || getString(obj.caseUrl),
    matchedTerm: term,
    court: parsed.courtCode,
    year: parsed.year,
  };
}

function collectCandidates(node, dbId, term, out, depth = 0) {
  if (!node || depth > 4 || out.length >= MAX_CANDIDATES * 3) return;

  if (Array.isArray(node)) {
    for (const item of node) {
      collectCandidates(item, dbId, term, out, depth + 1);
      if (out.length >= MAX_CANDIDATES * 3) return;
    }
    return;
  }

  if (typeof node !== "object") return;

  const candidate = candidateFromObject(node, dbId, term);
  if (candidate) {
    out.push(candidate);
  }

  for (const value of Object.values(node)) {
    collectCandidates(value, dbId, term, out, depth + 1);
    if (out.length >= MAX_CANDIDATES * 3) return;
  }
}

async function searchCandidatesForTerm(term, dbId, apiKey) {
  const urls = buildSearchUrls(term, dbId, apiKey);
  for (const url of urls) {
    const payload = await fetchJson(url);
    if (!payload) continue;

    const candidates = [];
    collectCandidates(payload, dbId, term, candidates);
    if (candidates.length > 0) {
      return candidates;
    }
  }
  return [];
}

function dedupeCandidates(candidates) {
  const byCitation = new Map();
  for (const candidate of candidates) {
    const key = candidate.citation.toLowerCase();
    if (!byCitation.has(key)) {
      byCitation.set(key, candidate);
    }
  }
  return Array.from(byCitation.values());
}

function toCaseLawItem(candidate, verification) {
  const parsed = parseCitation(candidate.citation);
  const court = parsed?.courtCode || candidate.court || "";
  const year = parsed?.year || candidate.year || "";
  const summary =
    candidate.summary ||
    `${candidate.title || candidate.citation} (${court}${year ? ` ${year}` : ""})`;

  return {
    citation: candidate.citation,
    summary,
    court,
    year,
    url_canlii: verification?.url || candidate.url || "",
    matched_content: `Retrieved from CanLII search for "${candidate.matchedTerm}"`,
  };
}

export async function retrieveVerifiedCaseLaw({
  scenario = "",
  filters = {},
  aiSuggestions = [],
  apiKey = "",
  maxResults = 3,
} = {}) {
  if (!apiKey) {
    return {
      cases: [],
      meta: {
        reason: "missing_api_key",
        termsTried: 0,
        databasesTried: 0,
        searchCalls: 0,
        candidateCount: 0,
        verificationCalls: 0,
      },
    };
  }

  const terms = extractCaseLawSearchTerms({ scenario, aiSuggestions });
  const dbTargets = pickDatabaseTargets(filters);
  if (terms.length === 0 || dbTargets.length === 0) {
    return {
      cases: [],
      meta: {
        reason: "no_terms_or_databases",
        termsTried: terms.length,
        databasesTried: dbTargets.length,
        searchCalls: 0,
        candidateCount: 0,
        verificationCalls: 0,
      },
    };
  }

  const rawCandidates = [];
  let searchCalls = 0;

  for (const term of terms) {
    for (const dbId of dbTargets) {
      if (searchCalls >= MAX_SEARCH_CALLS) break;
      searchCalls += 1;

      const found = await searchCandidatesForTerm(term, dbId, apiKey);
      rawCandidates.push(...found);

      if (rawCandidates.length >= MAX_CANDIDATES * 3) break;
    }
    if (searchCalls >= MAX_SEARCH_CALLS || rawCandidates.length >= MAX_CANDIDATES * 3) break;
  }

  const uniqueCandidates = dedupeCandidates(rawCandidates).slice(0, MAX_CANDIDATES);
  const cases = [];
  let verificationCalls = 0;

  for (const candidate of uniqueCandidates) {
    if (verificationCalls >= MAX_VERIFICATION_CALLS) break;
    verificationCalls += 1;

    const verification = await lookupCase(candidate.citation, apiKey);
    if (verification.status !== "verified") continue;

    cases.push(toCaseLawItem(candidate, verification));
    if (cases.length >= maxResults) break;
  }

  return {
    cases,
    meta: {
      termsTried: terms.length,
      databasesTried: dbTargets.length,
      searchCalls,
      candidateCount: uniqueCandidates.length,
      verificationCalls,
      verifiedCount: cases.length,
    },
  };
}
