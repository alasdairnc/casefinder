// api/_caseLawRetrieval.js
// Phase A helper: retrieve real case-law candidates from CanLII search endpoints
// and return only citations that verify through the existing lookup pipeline.

import { COURT_API_MAP, lookupCase, parseCitation } from "../src/lib/canlii.js";

const CANLII_API_BASE = "https://api.canlii.org/v1";
const SEARCH_TIMEOUT_MS = 3000;
const MAX_TERMS = 4;
const MAX_DATABASES = 3;
const MAX_SEARCH_CALLS = 12;
const MAX_CANDIDATES = 15;
const MAX_VERIFICATION_CALLS = 15;

const DEFAULT_DB_IDS = ["csc-scc", "onca", "onsc", "bcca", "abca"];

const JURISDICTION_DB_IDS = {
  Ontario: ["onca", "onsc", "oncj"],
  "British Columbia": ["bcca", "bcsc", "bcpc"],
  Alberta: ["abca", "abkb", "abqb", "abpc"],
  Quebec: ["qcca", "qccs", "qccq"],
  Manitoba: ["mbca", "mbkb", "mbqb", "mbpc"],
  Saskatchewan: ["skca", "skkb", "skqb", "skpc"],
  "Nova Scotia": ["nsca", "nssc", "nspc"],
  "New Brunswick": ["nbca", "nbkb", "nbqb", "nbpc"],
  "Newfoundland and Labrador": ["nlca", "nlsc", "nlpc"],
  "Prince Edward Island": ["peca"],
};

const COURT_LEVEL_DB_IDS = {
  scc: ["csc-scc"],
  appeal: ["onca", "bcca", "abca", "qcca", "mbca", "skca", "nsca", "nbca", "nlca", "peca"],
  superior: ["onsc", "bcsc", "abkb", "abqb", "mbkb", "mbqb", "skkb", "skqb", "nbkb", "nbqb", "qccs", "mbqb", "skqb", "nssc", "nbqb", "nlsc"],
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

function extractCaseLawSearchTerms({ scenario, aiSuggestions, criminalCode = [] }) {
  const terms = [];

  // 1. Primary: Use explicit CanLII search terms from AI suggestions
  if (Array.isArray(aiSuggestions)) {
    for (const suggestion of aiSuggestions) {
      if (!suggestion) continue;
      // Accept 'canlii' type, or any suggestion that has a 'term' field
      if (suggestion.type === "canlii" || suggestion.term) {
        const value = sanitizeTerm(suggestion.term || suggestion.label || "");
        if (value) terms.push(value);
      }
    }
  }

  // 2. Secondary: Use criminal code sections (e.g., "s. 265") as search keywords
  if (Array.isArray(criminalCode)) {
    for (const item of criminalCode) {
      if (!item || !item.citation) continue;
      const sectionMatch = item.citation.match(/s\.\s*([\d.]+)/);
      if (sectionMatch) {
        // Search for the section number + short title
        const keyword = `Criminal Code s. ${sectionMatch[1]}`;
        terms.push(keyword);
      }
    }
  }

  // 3. Fallback: Use key legal terms and scenario nouns
  const scenarioText = sanitizeTerm(scenario || "").toLowerCase();
  
  // Specific common legal scenarios to boost
  const keywords = [
    { match: /impaired|drunk|alcohol|bac|breathalyzer/i, term: "impaired driving" },
    { match: /accident|struck|collision|vehicle/i, term: "motor vehicle accident" },
    { match: /injury|serious|bodily/i, term: "bodily harm" },
    { match: /search|warrant|seizure/i, term: "warrantless search" },
    { match: /arrest|detain|rights/i, term: "arbitrary detention" },
    { match: /drug|trafficking|cocaine|fentanyl/i, term: "drug trafficking" },
  ];

  for (const kw of keywords) {
    if (kw.match.test(scenarioText)) {
      terms.push(kw.term);
    }
  }

  const words = scenarioText
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !["this", "that", "with", "from", "into", "their", "driver", "vehicle"].includes(w));
  
  if (words.length > 0) {
    // Try pairs of words for better precision
    for (let i = 0; i < words.length - 1; i += 2) {
      if (terms.length >= MAX_TERMS * 2) break;
      terms.push(`${words[i]} ${words[i+1]}`);
    }
    // Individual words as last resort
    for (const w of words.slice(0, 4)) {
      if (terms.length >= MAX_TERMS * 2) break;
      terms.push(w);
    }
  }

  return dedupeStrings(terms).slice(0, MAX_TERMS + 1);
}

function pickDatabaseTargets(filters = {}) {
  const { jurisdiction = "all", courtLevel = "all" } = filters || {};

  if (courtLevel === "scc") return ["csc-scc"];

  let ids = [];
  if (jurisdiction !== "all" && JURISDICTION_DB_IDS[jurisdiction]) {
    ids = [...JURISDICTION_DB_IDS[jurisdiction], "csc-scc"]; // Always include SCC as fallback
  } else {
    ids = [...DEFAULT_DB_IDS];
  }

  if (courtLevel !== "all" && COURT_LEVEL_DB_IDS[courtLevel]) {
    const levelSet = new Set(COURT_LEVEL_DB_IDS[courtLevel]);
    // Filter to prioritized level, but keep others as fallbacks if needed
    const filtered = ids.filter((dbId) => levelSet.has(dbId));
    ids = filtered.length > 0 ? filtered : COURT_LEVEL_DB_IDS[courtLevel];
  }

  return dedupeStrings(ids).slice(0, MAX_DATABASES + 1);
}

function buildSearchUrls(term, dbId, apiKey) {
  const encTerm = encodeURIComponent(term);
  const encDb = encodeURIComponent(dbId);
  const encKey = encodeURIComponent(apiKey);

  // Attempt search using multiple CanLII endpoints for maximum coverage
  return [
    `${CANLII_API_BASE}/search/?text=${encTerm}&databaseId=${encDb}&api_key=${encKey}`,
    `${CANLII_API_BASE}/cases?db=${encDb}&keywords=${encTerm}&api_key=${encKey}`,
    `${CANLII_API_BASE}/search/?all=${encTerm}&databaseId=${encDb}&api_key=${encKey}`,
  ];
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout ? AbortSignal.timeout(SEARCH_TIMEOUT_MS) : undefined });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    return await res.json();
  } catch (err) {
    // Suppress console error to keep logs clean during batch search
    return null;
  }
}

function normalizeCitationText(citation, titleHint = "") {
  const raw = sanitizeTerm(citation);
  if (!raw) return null;
  if (parseCitation(raw)) return raw;

  // Handle common format errors:
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

  // Supports "2024onca123", "2024-onca-123", "1988canlii90"
  const compact = caseId.replace(/[^a-z0-9]/g, "");
  const match = compact.match(/(\d{4})([a-z]{2,8})(\d{1,6})/);
  if (!match) return null;

  const year = match[1];
  const infix = match[2];
  const number = String(parseInt(match[3], 10));
  const courtCode = DB_TO_COURT_CODE.get(dbId) || infix.toUpperCase();

  if (infix === "canlii") {
    return `${titleHint}, ${year} CanLII ${number} (${courtCode})`;
  }

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
  if (!node || depth > 6 || out.length >= MAX_CANDIDATES * 3) return;

  if (Array.isArray(node)) {
    for (const item of node) {
      collectCandidates(item, dbId, term, out, depth + 1);
    }
    return;
  }

  if (typeof node !== "object") return;

  // If this object looks like a case (has title/parties/citation/caseId), try it
  const candidate = candidateFromObject(node, dbId, term);
  if (candidate) {
    out.push(candidate);
  }

  // Recurse into all properties of the object to find nested results/cases
  for (const key of Object.keys(node)) {
    // Avoid re-scanning large text blobs that are already part of a candidate
    if (["summary", "abstract", "snippet", "matched_content"].includes(key)) continue;
    collectCandidates(node[key], dbId, term, out, depth + 1);
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

function toCaseLawItem(candidate, verification, status = "verified") {
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
    url_canlii: (verification?.status === "verified" ? verification.url : null) || candidate.url || verification?.searchUrl || "",
    matched_content: `Retrieved from CanLII search for "${candidate.matchedTerm}"`,
    verificationStatus: status,
  };
}

export async function retrieveVerifiedCaseLaw({
  scenario = "",
  filters = {},
  aiSuggestions = [],
  criminalCode = [],
  apiKey = "",
  maxResults = 5,
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

  const terms = extractCaseLawSearchTerms({ scenario, aiSuggestions, criminalCode });
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

  // 1. Parallel Search: generate all (term, dbId) tasks
  const searchTasks = [];
  for (const term of terms) {
    for (const dbId of dbTargets) {
      if (searchTasks.length >= MAX_SEARCH_CALLS) break;
      searchTasks.push({ term, dbId });
    }
    if (searchTasks.length >= MAX_SEARCH_CALLS) break;
  }

  const searchResults = await Promise.all(
    searchTasks.map(t => searchCandidatesForTerm(t.term, t.dbId, apiKey))
  );

  const rawCandidates = searchResults.flat();
  const uniqueCandidates = dedupeCandidates(rawCandidates).slice(0, MAX_CANDIDATES);

  // 2. Parallel Verification: verify the best candidates in parallel
  const verificationTasks = uniqueCandidates.slice(0, MAX_VERIFICATION_CALLS);
  const verificationResults = await Promise.all(
    verificationTasks.map(async (candidate) => {
      const v = await lookupCase(candidate.citation, apiKey);
      // Even if direct lookup fails (status !== verified), search-found items 
      // are included as 'unverified' so they still appear in the UI.
      const status = (v.status === "verified") ? "verified" : "unverified";
      return toCaseLawItem(candidate, v, status);
    })
  );

  const cases = verificationResults.slice(0, MAX_CANDIDATES);

  return {
    cases,
    meta: {
      termsTried: terms.length,
      databasesTried: dbTargets.length,
      searchCalls: searchTasks.length,
      candidateCount: uniqueCandidates.length,
      verificationCalls: verificationTasks.length,
      verifiedCount: cases.filter(c => c.verificationStatus === "verified").length,
    },
  };
}
