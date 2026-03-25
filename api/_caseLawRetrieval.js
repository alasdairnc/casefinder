// api/_caseLawRetrieval.js
// Phase A helper: retrieve real case-law candidates from CanLII search endpoints
// and return only citations that verify through the existing lookup pipeline.

import { COURT_API_MAP, lookupCase, parseCitation } from "../src/lib/canlii.js";

const CANLII_API_BASE = "https://api.canlii.org/v1";
const SEARCH_TIMEOUT_MS = 1800;
const MAX_TERMS = 4;
const MAX_DATABASES = 3;
const MAX_SEARCH_CALLS_PHASE1 = 4;
const MAX_SEARCH_CALLS_TOTAL = 10;
const MAX_FALLBACK_TERMS = 5;
const MAX_DATABASES_FALLBACK = 8;
const MAX_CANDIDATES = 8;
/** Run this many unique (term × SCC) searches before widening to other databases. */
const SCC_FIRST_SEARCH_SLOTS = 2;
const MAX_VERIFICATION_CALLS = 6;
const MAX_VERIFICATION_CALLS_PHASE1 = Math.ceil(MAX_VERIFICATION_CALLS / 2);
const MAX_VERIFICATION_CALLS_FALLBACK = Math.floor(MAX_VERIFICATION_CALLS / 2);

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

const FEDERAL_DATABASE_IDS = ["csc-scc", "fca", "fct"];

/** When a province-specific search under-fetches, add appellate courts from other major jurisdictions. */
const ADJACENT_JURISDICTION_DB_IDS = {
  Ontario: ["bcca", "abca", "qcca"],
  "British Columbia": ["onca", "abca", "qcca"],
  Alberta: ["onca", "bcca", "qcca"],
  Quebec: ["onca", "bcca", "abca"],
  Manitoba: ["onca", "bcca", "skca"],
  Saskatchewan: ["onca", "bcca", "abca"],
  "Nova Scotia": ["onca", "nbca", "nlca"],
  "New Brunswick": ["onca", "nsca", "nlca"],
  "Newfoundland and Labrador": ["onca", "nsca", "nbca"],
  "Prince Edward Island": ["onca", "nsca", "nbca"],
};

const NATIONAL_SPREAD_DB_IDS = ["csc-scc", "fca", "fct", "onca", "bcca", "abca", "qcca", "mbca"];

/** Lower rank = verify / display earlier (deterministic ordering). */
const DATABASE_VERIFY_RANK = (() => {
  const order = [
    "csc-scc",
    "fca",
    "fct",
    "onca",
    "bcca",
    "abca",
    "qcca",
    "mbca",
    "skca",
    "nsca",
    "nbca",
    "nlca",
    "peca",
    "onsc",
    "bcsc",
    "abqb",
    "qccs",
    "mbqb",
    "skqb",
    "nssc",
    "nbqb",
    "nlsc",
    "oncj",
    "bcpc",
    "abpc",
    "qccq",
    "mbpc",
    "skpc",
    "nspc",
    "nbpc",
    "nlpc",
  ];
  const map = new Map();
  order.forEach((id, i) => map.set(id, i));
  return map;
})();

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

/**
 * High-signal CanLII keyword phrases from common Canadian criminal patterns (no fabricated citations).
 */
function curatedTermsFromScenario(scenario) {
  const s = sanitizeTerm(scenario || "").toLowerCase();
  if (!s) return [];

  const out = [];
  const push = (...xs) => {
    for (const x of xs) {
      const v = sanitizeTerm(x);
      if (v) out.push(v);
    }
  };

  // ── Impaired driving / RIDE ─────────────────────────────────────────────────
  const ride = /\bride\b|\broadside\b|\bcheck\s*point\b|\bcheckpoint\b/.test(s);
  const alcohol =
    /\balcohol\b|\bbreath\b|\bbreathalyzer\b|\bimpaired\b|\bintoxicat\b|\bdrunk\b|\bdwi\b|\bover\s*80\b/.test(s) ||
    /\b80\b/.test(s);
  const refusal = /\brefus\w*\b|\brefused\b/.test(s);
  const blood = /\bblood\b/.test(s);
  const searchSeizure = /\bsearch\b/.test(s) && /\bseiz\w*\b/.test(s);

  if (ride && alcohol) {
    push("R v Grant reasonable suspicion", "motor vehicle stop Charter", "checkstop Charter section 9");
  }
  if (refusal && (alcohol || /\bbreath\b/.test(s))) {
    push("refusal breath sample Criminal Code", "reasonable grounds breath demand");
  }
  if (blood) {
    push("blood sample Charter section 8", "seizure blood sample warrantless");
  }
  if (/\bcharter\b/.test(s) && (searchSeizure || /\bsearch\b/.test(s))) {
    push("Charter section 8 search seizure");
  }

  // ── Assault ─────────────────────────────────────────────────────────────────
  const assault = /\bassault\w*\b|\bstruck\b|\bhit\b|\bbatter\w*\b|\bbeat\w*\b|\bphysical\s+force\b/.test(s);
  const weapon = /\bweapon\b|\bknife\b|\bgun\b|\bfirearm\b|\bclub\b|\bstab\w*\b/.test(s);
  if (assault && weapon) {
    push("assault with weapon Criminal Code section 267", "R v assault weapon bodily harm");
  } else if (assault && /\bbodily\s+harm\b|\binjur\w*\b|\bbroke\b|\bfracture\b/.test(s)) {
    push("assault causing bodily harm Criminal Code section 267", "R v bodily harm assault");
  } else if (assault) {
    push("assault Criminal Code section 266", "common assault consent defence");
  }

  // ── Sexual assault ───────────────────────────────────────────────────────────
  const sexual = /\bsexual\b|\bsex\b/.test(s);
  if (sexual && /\bassault\b|\battack\b|\btouch\w*\b|\bintercourse\b|\bcoerce\w*\b/.test(s)) {
    push("sexual assault Criminal Code section 271", "R v consent sexual assault");
  }

  // ── Drug offences ────────────────────────────────────────────────────────────
  const drugs = /\bdrug\w*\b|\bcocaine\b|\bfentanyl\b|\bheroin\b|\bmarijuana\b|\bcannabis\b|\bnarcotic\b|\bCDSA\b|\bcontrolled\s+substance\b/.test(s);
  const trafficking = /\btraffick\w*\b|\bsell\w*\b|\bdistribut\w*\b|\bdeal\w*\b/.test(s);
  if (drugs && trafficking) {
    push("drug trafficking CDSA section 5", "possession for purpose of trafficking");
  } else if (drugs && /\bpossession\b/.test(s)) {
    push("possession controlled substance CDSA section 4", "simple possession drug offence");
  } else if (drugs) {
    push("CDSA controlled substance offence", "drug possession trafficking Canada");
  }

  // ── Theft / robbery / fraud ───────────────────────────────────────────────────
  const theft = /\btheft\b|\bstole\b|\bsteal\w*\b|\bshoplifting\b|\bstolen\b/.test(s);
  const robbery = /\brobbery\b|\bheld\s+up\b/.test(s);
  const fraud = /\bfraud\b|\bextort\w*\b|\bdeceiv\w*\b|\bforger\w*\b/.test(s);
  if (robbery) {
    push("robbery Criminal Code section 343", "theft violence or threats robbery");
  } else if (fraud) {
    push("fraud Criminal Code section 380", "fraudulent misrepresentation Criminal Code");
  } else if (theft) {
    push("theft Criminal Code section 322", "theft under over 5000 Criminal Code");
  }

  // ── Break and enter ───────────────────────────────────────────────────────────
  if (/\bbreak\s+and\s+enter\b|\bbreaking\s+and\s+enter\w*\b|\bbreaking\s+enter\w*\b|\bbroke\s+into\b|\bburglar\w*\b/.test(s)) {
    push("break and enter dwelling house Criminal Code section 348", "B&E intent commit offence");
  }

  // ── Homicide / manslaughter ────────────────────────────────────────────────────
  const homicide = /\bmurder\b|\bmanslaughter\b|\bhomicide\b|\bkill\w*\b|\bdeath\b/.test(s);
  if (homicide) {
    if (/\bfirst\s+degree\b|\bplanned\b|\bdeliberat\w*\b/.test(s)) {
      push("first degree murder planned deliberate Criminal Code section 231");
    } else if (/\bmanslaughter\b/.test(s)) {
      push("manslaughter Criminal Code section 234", "criminal negligence causing death");
    } else {
      push("second degree murder Criminal Code section 235", "murder intent subjective mens rea");
    }
  }

  // ── Charter s. 9 — arbitrary detention ────────────────────────────────────────
  const detention = /\bdetain\w*\b|\bdetention\b|\barrest\w*\b/.test(s);
  if (detention && /\bcharter\b|\barbitrar\w*\b/.test(s)) {
    push("Charter section 9 arbitrary detention", "R v Grant arbitrary detention analysis");
  }

  // ── Charter s. 10(b) — right to counsel ───────────────────────────────────────
  if (/\blawyer\b|\bcounsel\b|\blegal\s+aid\b/.test(s) || (detention && /\bcharter\b/.test(s))) {
    push("Charter section 10 right to counsel", "informational duty right to counsel detention");
  }

  // ── Domestic violence ─────────────────────────────────────────────────────────
  if (/\bdomestic\b|\bspouse\b|\bintimate\s+partner\b|\bfamily\s+violence\b/.test(s) && assault) {
    push("domestic assault intimate partner violence Criminal Code");
  }

  // ── Uttering threats ──────────────────────────────────────────────────────────
  if (/\bthreat\w*\b|\buttering\b/.test(s)) {
    push("uttering threats Criminal Code section 264.1", "threatening death bodily harm Criminal Code");
  }

  // ── Criminal harassment / stalking ────────────────────────────────────────────
  if (/\bharassment\b|\bstalk\w*\b/.test(s)) {
    push("criminal harassment Criminal Code section 264", "repeated following communication harassment");
  }

  // ── Mischief ──────────────────────────────────────────────────────────────────
  if (/\bmischief\b|\bvandal\w*\b|\bdestroy\w*\b|\bdamage\w*\b/.test(s) && !/\bbodily\b/.test(s)) {
    push("mischief Criminal Code section 430", "wilful damage property Criminal Code");
  }

  // ── Firearm / weapons ─────────────────────────────────────────────────────────
  if (weapon && !assault) {
    push("possession firearm Criminal Code section 91", "unauthorized possession firearm Criminal Code");
  }

  // ── DUI / impaired without RIDE ───────────────────────────────────────────────
  if (alcohol && !ride) {
    push("impaired driving Criminal Code section 320.14", "over 80 blood alcohol concentration");
  }

  // ── Dangerous / careless driving ──────────────────────────────────────────────
  if (/\bdangerous\s+driv\w*\b|\bcareless\s+driv\w*\b|\bstreet\s+rac\w*\b|\bstunt\s+driv\w*\b/.test(s)) {
    push("dangerous driving Criminal Code section 320.13", "criminal negligence operation motor vehicle");
  }

  // ── Bail / surety / breach of conditions ───────────────────────────────────────
  if (/\bbail\b|\bsurety\b|\brelease\s+condition\w*\b|\bbreach\s+of\s+condition\w*\b|\bbreach\s+condition\w*\b/.test(s)) {
    push("bail release conditions Criminal Code section 145", "breach recognizance undertaking Criminal Code");
  }

  // ── Child exploitation / luring ────────────────────────────────────────────────
  if (/\bchild\s+pornograph\w*\b|\bluring\b|\bchild\s+exploit\w*\b|\bchild\s+sexual\b/.test(s)) {
    push("child luring Criminal Code section 172.1", "child exploitation sexual offence Criminal Code");
  }

  // ── Peace bond ────────────────────────────────────────────────────────────────
  if (/\bpeace\s+bond\b|\brecognizance\b|\bs\.?\s*810\b/.test(s)) {
    push("peace bond recognizance Criminal Code section 810", "fear of injury peace bond");
  }

  // ── Obstruction of justice / resisting arrest ─────────────────────────────────
  if (/\bobstruct\w*\b|\bresist\w*\s+arrest\w*\b|\bevad\w*\b|\bflee\w*\b|\bflight\b/.test(s)) {
    push("obstruct justice Criminal Code section 139", "resist arrest obstruct peace officer section 129");
  }

  // ── Arson ──────────────────────────────────────────────────────────────────────
  if (/\barson\b|\bset\s+fire\b|\bburn\w*\b/.test(s) && /\bproperty\b|\bhouse\b|\bbuild\w*\b/.test(s)) {
    push("arson Criminal Code section 434", "intentionally setting fire property Criminal Code");
  }

  return dedupeStrings(out);
}

/**
 * Detect Canadian case-name patterns (e.g. "R v Jordan", "Jordan v Canada")
 * and return them as high-priority CanLII search terms.
 */
function extractCaseNameTerms(scenario) {
  const s = sanitizeTerm(scenario || "");
  if (!s) return [];

  const out = [];

  // Normalize "R." → "R", "v." → "v" for consistent search
  const normalize = (name) =>
    name.replace(/\bR\./gi, "R").replace(/\bv\./gi, "v").replace(/\s+/g, " ").trim();

  // Full-string match: entire input is a case name (with optional trailing citation)
  const fullMatch = s.match(/^(R\.?\s+v\.?\s+[A-Za-z][A-Za-z' -]+?)(?:,?\s+\d{4}\s+[A-Z]{2,8}\s+\d+)?$/i);
  if (fullMatch) {
    out.push(normalize(fullMatch[1]));
    // Also push the full string if it includes a neutral citation
    if (s.length > fullMatch[1].length + 2) out.push(s);
  }

  // Civil-style: "Smith v Jones" / "Company v Canada" (only short inputs, not full sentences)
  if (!fullMatch && s.split(/\s+/).length <= 6) {
    const civilMatch = s.match(/^([A-Za-z][A-Za-z' -]+)\s+v\.?\s+([A-Za-z][A-Za-z' -]+?)(?:,?\s+\d{4}\s+[A-Z]{2,8}\s+\d+)?$/i);
    if (civilMatch) {
      out.push(normalize(`${civilMatch[1]} v ${civilMatch[2]}`));
      // Also push full string if it includes a neutral citation
      if (s.length > civilMatch[1].length + civilMatch[2].length + 4) out.push(s);
    }
  }

  // Embedded case refs within a longer scenario: "the decision in R v Grant about detention"
  const embedded = [...s.matchAll(/\bR\.?\s+v\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g)];
  for (const m of embedded) {
    out.push(normalize(`R v ${m[1]}`));
  }

  return dedupeStrings(out);
}

function extractCaseLawSearchTerms({ scenario, aiSuggestions, criminalCode = [] }) {
  const terms = [];

  // 0. Highest priority: case-name terms ("R v Jordan" → direct search)
  const caseNameTerms = extractCaseNameTerms(scenario);
  for (const c of caseNameTerms) terms.push(c);

  const curated = curatedTermsFromScenario(scenario);
  for (const c of curated) terms.push(c);

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

  // 3. Short scenarios (≤ 80 chars): use the raw text as a direct search term
  const trimmedScenario = sanitizeTerm(scenario || "");
  if (trimmedScenario.length > 0 && trimmedScenario.length <= 80) {
    terms.push(trimmedScenario);
  }

  // 4. Fallback: Take a few key nouns/verbs from the scenario
  const words = trimmedScenario
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !["this", "that", "with", "from", "into", "into", "their"].includes(w));
  
  if (words.length > 0 && terms.length < MAX_TERMS) {
    const fallback = words.slice(0, 5).join(" ");
    if (fallback) terms.push(fallback);
  }

  // Allow extra term slots when case-name detected
  const extraSlots = caseNameTerms.length > 0 ? 2 : 0;
  return dedupeStrings(terms).slice(0, MAX_TERMS + Math.min(3, curated.length) + extraSlots);
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

/**
 * Broaden database targets with federal courts and (when applicable) adjacent appellate courts.
 * Used only when the primary search pass yields no verified cases.
 */
export function expandDatabaseTargetsForFallback(filters = {}, primaryDbIds = []) {
  const { jurisdiction = "all" } = filters || {};
  const primary = Array.isArray(primaryDbIds) ? primaryDbIds : [];

  const extra =
    jurisdiction === "all"
      ? [...FEDERAL_DATABASE_IDS, ...NATIONAL_SPREAD_DB_IDS]
      : [
          ...FEDERAL_DATABASE_IDS,
          ...(ADJACENT_JURISDICTION_DB_IDS[jurisdiction] || []),
        ];

  return dedupeStrings([...primary, ...extra]).slice(0, MAX_DATABASES_FALLBACK);
}

const FALLBACK_STOPWORDS = new Set([
  "this",
  "that",
  "with",
  "from",
  "into",
  "their",
  "there",
  "where",
  "which",
  "would",
  "could",
  "should",
  "being",
  "after",
  "before",
]);

function buildFallbackSearchTerms({ scenario = "", terms = [], criminalCode = [] }) {
  const out = [];

  for (const term of terms) {
    const parts = sanitizeTerm(term)
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 4) {
      out.push(parts.slice(0, 2).join(" "));
      out.push(parts.slice(0, 3).join(" "));
    } else if (parts.length === 3) {
      out.push(parts.slice(0, 2).join(" "));
      out.push(parts[0]);
    } else if (parts.length === 2) {
      out.push(parts[0]);
    }
  }

  const scenWords = sanitizeTerm(scenario || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !FALLBACK_STOPWORDS.has(w));
  out.push(...scenWords.slice(0, 4));

  if (Array.isArray(criminalCode)) {
    for (const item of criminalCode) {
      if (!item?.citation) continue;
      const sectionMatch = item.citation.match(/s\.\s*([\d.]+)/);
      if (sectionMatch) out.push(sectionMatch[1]);
    }
  }

  return dedupeStrings(out).slice(0, MAX_FALLBACK_TERMS);
}

async function gatherSearchCandidates(terms, dbTargets, apiKey, maxCalls, sccFirstSlots = 0) {
  const rawCandidates = [];
  let searchCalls = 0;
  const tried = new Set();

  const tryPair = async (term, dbId) => {
    if (searchCalls >= maxCalls || rawCandidates.length >= MAX_CANDIDATES * 3) return;
    const key = `${term}|${dbId}`;
    if (tried.has(key)) return;
    tried.add(key);
    searchCalls += 1;
    const found = await searchCandidatesForTerm(term, dbId, apiKey);
    rawCandidates.push(...found);
  };

  if (sccFirstSlots > 0 && dbTargets.includes("csc-scc")) {
    let sccUsed = 0;
    for (const term of terms) {
      if (searchCalls >= maxCalls || sccUsed >= sccFirstSlots || rawCandidates.length >= MAX_CANDIDATES * 3) break;
      await tryPair(term, "csc-scc");
      sccUsed += 1;
    }
  }

  for (const term of terms) {
    for (const dbId of dbTargets) {
      if (searchCalls >= maxCalls || rawCandidates.length >= MAX_CANDIDATES * 3) break;
      await tryPair(term, dbId);
    }
    if (searchCalls >= maxCalls || rawCandidates.length >= MAX_CANDIDATES * 3) break;
  }

  return { rawCandidates, searchCalls };
}

function candidateDatabaseRank(candidate) {
  const parsed = parseCitation(candidate?.citation || "");
  const db = parsed?.apiDbId || "";
  if (DATABASE_VERIFY_RANK.has(db)) return DATABASE_VERIFY_RANK.get(db);
  return 500;
}

function sortCandidatesForStableVerification(candidates) {
  return [...candidates].sort((a, b) => {
    const rankA = candidateDatabaseRank(a);
    const rankB = candidateDatabaseRank(b);
    if (rankA !== rankB) return rankA - rankB;
    const yearA = Number(a?.year) || 0;
    const yearB = Number(b?.year) || 0;
    if (yearB !== yearA) return yearB - yearA;
    return String(a?.citation || "").localeCompare(String(b?.citation || ""));
  });
}

function buildSearchUrls(term, dbId, apiKey) {
  const encTerm = encodeURIComponent(term);
  const encDb = encodeURIComponent(dbId);
  const encKey = encodeURIComponent(apiKey);

  // Attempt search using both the /search (text) and /cases (keywords) endpoints
  return [
    `${CANLII_API_BASE}/search/?text=${encTerm}&databaseId=${encDb}&api_key=${encKey}`,
    `${CANLII_API_BASE}/cases?db=${encDb}&keywords=${encTerm}&api_key=${encKey}`,
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
    verificationStatus: "verified",
  };
}

export async function retrieveVerifiedCaseLaw({
  scenario = "",
  filters = {},
  aiSuggestions = [],
  criminalCode = [],
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
        verifiedCount: 0,
        fallbackSearchUsed: false,
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
        fallbackSearchUsed: false,
      },
    };
  }

  let rawCandidates = [];
  let searchCalls = 0;

  const phase1 = await gatherSearchCandidates(
    terms,
    dbTargets,
    apiKey,
    MAX_SEARCH_CALLS_PHASE1,
    dbTargets.includes("csc-scc") ? SCC_FIRST_SEARCH_SLOTS : 0
  );
  rawCandidates = phase1.rawCandidates;
  searchCalls = phase1.searchCalls;

  let uniqueCandidates = sortCandidatesForStableVerification(dedupeCandidates(rawCandidates)).slice(0, MAX_CANDIDATES);

  const citationLookupTried = new Set();
  let verificationCallsTotal = 0;

  async function verifyCandidates(candidates, maxVerificationCalls) {
    const out = [];
    let verificationCallsThisPass = 0;
    for (const candidate of candidates) {
      if (out.length >= maxResults) break;
      const key = candidate.citation.toLowerCase();
      if (citationLookupTried.has(key)) continue;
      citationLookupTried.add(key);
      if (verificationCallsThisPass >= maxVerificationCalls) break;
      verificationCallsThisPass += 1;
      verificationCallsTotal += 1;

      const verification = await lookupCase(candidate.citation, apiKey);
      if (verification.status !== "verified") continue;

      out.push(toCaseLawItem(candidate, verification));
    }
    return out;
  }

  let cases = await verifyCandidates(uniqueCandidates, MAX_VERIFICATION_CALLS_PHASE1);
  let fallbackSearchUsed = false;

  if (cases.length === 0 && searchCalls < MAX_SEARCH_CALLS_TOTAL) {
    const fbTerms = buildFallbackSearchTerms({ scenario, terms, criminalCode });
    const fbDbs = expandDatabaseTargetsForFallback(filters, dbTargets);
    const remaining = MAX_SEARCH_CALLS_TOTAL - searchCalls;

    if (remaining > 0 && fbTerms.length > 0 && fbDbs.length > 0) {
      const phase2 = await gatherSearchCandidates(
        fbTerms,
        fbDbs,
        apiKey,
        remaining,
        fbDbs.includes("csc-scc") ? SCC_FIRST_SEARCH_SLOTS : 0
      );
      searchCalls += phase2.searchCalls;
      // Prioritize newly discovered fallback candidates before phase-1 candidates.
      // Otherwise, slice(0, MAX_CANDIDATES) can starve fallback results.
      rawCandidates = [...phase2.rawCandidates, ...rawCandidates];
      fallbackSearchUsed = true;
      uniqueCandidates = sortCandidatesForStableVerification(dedupeCandidates(rawCandidates)).slice(0, MAX_CANDIDATES);
      cases = await verifyCandidates(uniqueCandidates, MAX_VERIFICATION_CALLS_FALLBACK);
    }
  }

  return {
    cases,
    meta: {
      termsTried: terms.length,
      databasesTried: dbTargets.length,
      searchCalls,
      candidateCount: uniqueCandidates.length,
      verificationCalls: verificationCallsTotal,
      verifiedCount: cases.length,
      fallbackSearchUsed,
      reason: cases.length > 0 ? "verified_results" : "no_verified",
    },
  };
}
