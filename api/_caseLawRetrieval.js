// api/_caseLawRetrieval.js
// Phase A helper: retrieve real case-law candidates from CanLII search endpoints
// and return only citations that verify through the existing lookup pipeline.

import { COURT_API_MAP, lookupCase, parseCitation, buildSearchUrl, buildCaseUrl, buildCaseId } from "../src/lib/canlii.js";

// SECURITY TESTING: Set CANLII_API_BASE_URL env var to redirect to a mock server.
// Also update the matching constant in src/lib/canlii.js (where HTTP calls originate).
// Revert both after testing. See scripts/README-security-testing.md.
const CANLII_API_BASE = process.env.CANLII_API_BASE_URL ?? "https://api.canlii.org/v1";
const MAX_TERMS = 4;
const MAX_DATABASES = 3;

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

// ── Candidate ranking ────────────────────────────────────────────────────────

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

function extractNeutralCitation(citation) {
  const match = String(citation || "").match(/(\d{4}\s+[A-Z]+\s+\d+)/i);
  return match ? match[1].replace(/\s+/g, " ").toUpperCase() : null;
}

function dedupeCandidates(candidates) {
  const byCitation = new Map();
  for (const candidate of candidates) {
    const neutral = extractNeutralCitation(candidate.citation);
    const key = neutral ?? candidate.citation.toLowerCase();
    if (!byCitation.has(key)) {
      byCitation.set(key, candidate);
    } else {
      // Prefer landmark entries (they bypass verification); then prefer named entries over citation-only
      const existing = byCitation.get(key);
      if (!existing.isLandmark && candidate.isLandmark) {
        byCitation.set(key, candidate);
      } else if (!existing.isLandmark && !candidate.isLandmark) {
        const existingHasName = Boolean(existing.title && existing.title !== existing.citation);
        const candidateHasName = Boolean(candidate.title && candidate.title !== candidate.citation);
        if (!existingHasName && candidateHasName) {
          byCitation.set(key, candidate);
        }
      }
    }
  }
  return Array.from(byCitation.values());
}

function toCaseLawItem(candidate, verification) {
  const parsed = parseCitation(candidate.citation);
  const court = parsed?.courtCode || candidate.court || "";
  const year = parsed?.year || candidate.year || "";
  const title = verification?.title || candidate.title || null;
  const summary =
    candidate.summary ||
    `${title || candidate.citation} (${court}${year ? ` ${year}` : ""})`;

  return {
    citation: candidate.citation,
    title,
    summary,
    court,
    year,
    url_canlii: verification?.url || candidate.url || "",
    matched_content: candidate.matchedTerm
      ? `Verified via CanLII (${candidate.matchedTerm})`
      : "Verified via CanLII (AI metadata)",
    verificationStatus: "verified",
  };
}

// ── Main retrieval function ──────────────────────────────────────────────────
// NOTE: The CanLII API has NO text search endpoint. The only working endpoint
// is /v1/caseBrowse/en/{dbId}/{caseId}/ for per-case lookup by exact ID.
// This function verifies AI-generated citations directly via lookupCase().

const MAX_VERIFICATION_CALLS = 10;

export async function retrieveVerifiedCaseLaw({
  scenario = "",
  filters = {},
  aiSuggestions = [],
  aiCaseLaw = [],
  landmarkMatches = [],
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
      },
    };
  }

  const terms = extractCaseLawSearchTerms({ scenario, aiSuggestions, criminalCode });
  const dbTargets = pickDatabaseTargets(filters);

  // Build candidates from AI-generated case citations
  const aiCitationCandidates = [];
  if (Array.isArray(aiCaseLaw)) {
    for (const item of aiCaseLaw) {
      if (!item || !item.citation) continue;
      const citation = sanitizeTerm(item.citation);
      const parsed = parseCitation(citation);
      if (!parsed) continue;
      aiCitationCandidates.push({
        citation,
        title: parsed.parties || sanitizeTerm(item.title || "") || null,
        summary: item.summary || "",
        url: "",
        matchedTerm: "AI suggestion",
        court: parsed.courtCode,
        year: parsed.year,
      });
    }
  }

  // Inject Local Landmark RAG Matches into the verification pool
  if (Array.isArray(landmarkMatches)) {
    for (const landmark of landmarkMatches) {
      if (!landmark || !landmark.citation) continue;
      const citation = sanitizeTerm(landmark.citation);
      const parsed = parseCitation(citation);
      aiCitationCandidates.push({
        citation,
        title: landmark.title || citation,
        summary: landmark.ratio || "",
        url: "",
        matchedTerm: "Landmark RAG Match",
        court: parsed?.courtCode || landmark.court,
        year: parsed?.year || landmark.year,
        isLandmark: true, // Flag for verification bypass
      });
    }
  }

  if (aiCitationCandidates.length === 0) {
    return {
      cases: [],
      meta: {
        reason: terms.length === 0 ? "no_terms_or_databases" : "no_verified",
        termsTried: terms.length,
        databasesTried: dbTargets.length,
        searchCalls: 0,
        candidateCount: 0,
        verificationCalls: 0,
        verifiedCount: 0,
      },
    };
  }

  // Verify AI citations via the working lookupCase() endpoint
  const sorted = sortCandidatesForStableVerification(dedupeCandidates(aiCitationCandidates));
  const citationLookupTried = new Set();
  let verificationCallsTotal = 0;
  const cases = [];

  for (const candidate of sorted) {
    if (cases.length >= maxResults) break;

    // Use absolute bypass for Local Landmarks (we already know they're valid)
    if (candidate.isLandmark) {
      let landmarkUrl = candidate.url || "";
      if (!landmarkUrl) {
        const parsed = parseCitation(candidate.citation);
        const searchQuery = candidate.title && candidate.title !== candidate.citation
          ? `${candidate.title} ${candidate.citation}`
          : candidate.citation;
        // Pre-2000 cases predate the neutral citation scheme — no reliable direct CanLII URL.
        // Use name+citation search URL for those; prefer direct URL for post-2000.
        const useDirectUrl = parsed?.webDbId && Number(parsed.year) >= 2000;
        if (useDirectUrl) {
          const caseId = buildCaseId({ year: parsed.year, courtCode: parsed.courtCode, number: parsed.number, isLegacy: parsed.isLegacy });
          landmarkUrl = caseId ? buildCaseUrl(parsed.webDbId, parsed.year, caseId) : buildSearchUrl(searchQuery);
        } else {
          landmarkUrl = buildSearchUrl(searchQuery);
        }
      }
      cases.push({
        citation: candidate.citation,
        title: candidate.title || null,
        summary: candidate.summary,
        court: candidate.court,
        year: candidate.year,
        url_canlii: landmarkUrl,
        matched_content: "Landmark Case Law Database",
        verificationStatus: "verified"
      });
      continue;
    }

    if (verificationCallsTotal >= MAX_VERIFICATION_CALLS) break;

    const neutral = extractNeutralCitation(candidate.citation);
    const key = neutral ?? candidate.citation.toLowerCase();
    if (citationLookupTried.has(key)) continue;
    citationLookupTried.add(key);
    verificationCallsTotal += 1;

    const verification = await lookupCase(candidate.citation, apiKey);
    if (verification.status !== "verified") continue;

    cases.push(toCaseLawItem(candidate, verification));
  }

  return {
    cases,
    meta: {
      termsTried: terms.length,
      databasesTried: dbTargets.length,
      searchCalls: 0,
      candidateCount: aiCitationCandidates.length,
      verificationCalls: verificationCallsTotal,
      verifiedCount: cases.length,
      aiCitationsVerified: aiCitationCandidates.length,
      reason: cases.length > 0 ? "verified_results" : "no_verified",
    },
  };
}
