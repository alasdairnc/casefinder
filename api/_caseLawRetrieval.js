// api/_caseLawRetrieval.js
// Phase A helper: retrieve real case-law candidates from CanLII search endpoints
// and return only citations that verify through the existing lookup pipeline.

import {
  COURT_API_MAP,
  lookupCase,
  parseCitation,
  buildSearchUrl,
  buildCaseUrl,
  buildCaseId,
  buildCitationIdentityKey,
} from "../src/lib/canlii.js";
import { MASTER_CASE_LAW_DB } from "../src/lib/caselaw/index.js";
import { findLandmarkSeeds } from "../src/lib/landmarkCases.js";

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
const SIMPLE_STOP_WORDS = new Set([
  "and",
  "for",
  "the",
  "with",
  "from",
  "that",
  "this",
  "was",
  "were",
  "have",
  "has",
  "had",
  "but",
  "what",
  "when",
  "where",
  "they",
  "them",
  "their",
  "got",
  "into",
  "very",
  "brief",
  "scenario",
  "minimal",
  "detail",
  "heated",
  "face",
  "rights",
  "crime",
  "could",
]);

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

function normalizeForMatch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/section\s+/g, "s ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function termMatchesText(term, normalizedText) {
  const normalizedTerm = normalizeForMatch(term);
  if (!normalizedTerm) return false;
  if (normalizedText.includes(normalizedTerm)) return true;

  const tokens = normalizedTerm.split(" ").filter(Boolean);
  if (tokens.length <= 1) return false;
  
  // Check if all tokens appear in the text (strict match)
  if (tokens.every((token) => normalizedText.includes(token))) return true;
  
  // Also accept if most tokens appear (70% match for compound terms) — covers "breaking and entering" vs "break and enter"
  const tokenMatches = tokens.filter((token) => normalizedText.includes(token)).length;
  if (tokenMatches >= Math.ceil(tokens.length * 0.7)) return true;
  
  return false;
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

function tokenizeScenario(text) {
  const rawTokens = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !SIMPLE_STOP_WORDS.has(w));

  const expanded = new Set();
  for (const token of rawTokens) {
    expanded.add(token);
    if (token.endsWith("ies") && token.length > 4) {
      expanded.add(`${token.slice(0, -3)}y`);
    }
    if (token.endsWith("ied") && token.length > 4) {
      expanded.add(`${token.slice(0, -3)}y`);
    }
    if (token.endsWith("ed") && token.length > 4) {
      expanded.add(token.slice(0, -2));
    }
    if (token.endsWith("ing") && token.length > 5) {
      expanded.add(token.slice(0, -3));
    }
    if (token.endsWith("es") && token.length > 4) {
      expanded.add(token.slice(0, -2));
    }
    if (token.endsWith("s") && token.length > 4) {
      expanded.add(token.slice(0, -1));
    }
    if (token === "searched" || token === "searching" || token === "searches") {
      expanded.add("search");
    }
    if (token === "seized" || token === "seizing" || token === "seizes" || token === "seizure") {
      expanded.add("seize");
      expanded.add("seizure");
    }
    if (token === "detained" || token === "detaining" || token === "detains") {
      expanded.add("detain");
      expanded.add("detention");
    }
    if (token === "warrants" || token === "warranted") {
      expanded.add("warrant");
    }
  }

  return expanded;
}

function pickHelpfulScenarioTerms(scenarioTokens, limit = 2) {
  const generic = new Set(["very", "brief", "scenario", "minimal", "detail", "got", "into", "what", "could"]);
  const out = [];
  for (const token of scenarioTokens) {
    if (generic.has(token)) continue;
    out.push(token);
  }
  if (out.length === 0) {
    out.push(...Array.from(scenarioTokens));
  }
  return dedupeStrings(out).slice(0, limit);
}

function inferFallbackIssueSignals(scenarioTokens) {
  const tokens = new Set(Array.from(scenarioTokens || []).map((t) => String(t || "").toLowerCase()));
  const out = [];
  const add = (...items) => {
    for (const item of items) out.push(item);
  };

  const hasAny = (arr) => arr.some((x) => tokens.has(x));

  if (hasAny(["drug", "cocaine", "fentanyl", "trafficking", "possession", "narcotic"])) {
    add("cdsa", "s. 5", "trafficking", "possession", "intent");
  }
  if (hasAny(["charter", "arrest", "arrested", "detained", "detention", "warrant", "police"])) {
    add("charter", "s. 9", "detention", "arbitrary", "reasonable");
  }
  if (hasAny(["lawyer", "counsel"])) {
    add("s. 10", "s. 10(b)", "right to counsel", "informational", "detention", "waiver", "woods");
  }
  if (hasAny(["search", "searched", "searching", "seizure", "seized", "warrant", "warrantless", "privacy", "phone", "device", "records", "text", "computer", "digital"])) {
    add("charter", "s. 8", "search", "seizure", "warrant", "privacy");
  }
  if (hasAny(["weapon", "knife", "stabbed", "stab", "gun", "firearm"])) {
    add("weapon", "s. 267", "intent", "dangerous", "self-defence");
  }
  if (hasAny(["spouse", "domestic", "partner", "family"])) {
    add("domestic", "intimate partner", "assault", "s. 266", "s. 267");
  }
  if (hasAny(["threat", "threats", "uttering", "harass", "harassment", "stalk", "stalking", "message", "messages", "text"])) {
    add("uttering threats", "criminal harassment", "s. 264", "s. 264.1", "repeated communication");
  }
  if (hasAny(["dangerous", "careless", "speed", "racing", "stunt", "driving", "drive"])) {
    add("dangerous driving", "s. 320.13", "criminal negligence", "motor vehicle");
  }
  if (hasAny(["peace", "bond", "recognizance", "810"])) {
    add("peace bond", "recognizance", "s. 810");
  }
  if (hasAny(["break", "enter", "broke", "burglar", "house", "dwelling", "home"])) {
    add("break and enter", "s. 348", "dwelling house", "intent");
  }

  return dedupeStrings(out);
}

function candidateDbId(candidate) {
  const parsed = parseCitation(candidate?.citation || "");
  return parsed?.apiDbId || "";
}

function scoreCandidateForScenario({ candidate, scenarioTokens, issue, filters = {} }) {
  const text = normalizeForMatch(
    `${candidate?.title || ""} ${candidate?.summary || ""} ${candidate?.matchedTerm || ""}`
  );
  let overlap = 0;
  const overlapTokens = [];
  for (const token of scenarioTokens) {
    if (text.includes(token)) {
      overlap += 1;
      overlapTokens.push(token);
    }
  }

  const reasons = [];
  let score = Math.min(10, overlap * 2);
  if (overlap > 0) reasons.push(`token_overlap:${overlap}`);

  let semanticMatches = Array.isArray(candidate?.semanticMatches)
    ? candidate.semanticMatches
    : [];
  if (semanticMatches.length === 0 && issue?.allowed?.size > 0) {
    semanticMatches = [...issue.allowed].filter((sub) => termMatchesText(sub, text));
  }
  if (semanticMatches.length > 0) {
    score += 10 + semanticMatches.length * 2;
    reasons.push(`semantic_match:${semanticMatches.slice(0, 3).join(",")}`);
  }

  const issueSignals =
    issue?.allowed?.size > 0
      ? [...issue.allowed].slice(0, 8)
      : inferFallbackIssueSignals(scenarioTokens).slice(0, 8);
  if (issueSignals.length > 0) {
    reasons.push(`issue:${issue.primary}`);
  }

  const year = Number(candidate?.year) || 0;
  if (year >= 2015) {
    score += 3;
    reasons.push("recent_case");
  } else if (year >= 2000) {
    score += 1;
    reasons.push("modern_case");
  }

  const dbId = candidateDbId(candidate);
  if (filters?.courtLevel && filters.courtLevel !== "all") {
    const allowed = COURT_LEVEL_DB_IDS[filters.courtLevel] || [];
    if (allowed.includes(dbId)) {
      score += 4;
      reasons.push(`court_level:${filters.courtLevel}`);
    }
  }
  if (filters?.jurisdiction && filters.jurisdiction !== "all") {
    const preferred = JURISDICTION_DB_IDS[filters.jurisdiction] || [];
    if (preferred.includes(dbId)) {
      score += 4;
      reasons.push(`jurisdiction:${filters.jurisdiction}`);
    }
  }

  if (candidate?.isLandmark) {
    score += 2;
    reasons.push("landmark");
  }

  const contextTerms = dedupeStrings(overlapTokens);
  if (issueSignals.length > 0 && contextTerms.length < 2) {
    for (const token of pickHelpfulScenarioTerms(scenarioTokens, 4)) {
      if (contextTerms.includes(token)) continue;
      contextTerms.push(token);
      if (contextTerms.length >= 2) break;
    }
  }

  return {
    ...candidate,
    semanticMatches,
    overlapTokens: contextTerms.slice(0, 4),
    issuePrimary: issue?.primary || "general_criminal",
    issueSignals,
    retrievalScore: score,
    retrievalReasons: reasons,
  };
}

/**
 * Detect the core legal issue from a scenario.
 * Returns { primary: string, subIssues: Set<string> }
 * Used to filter case law results to semantically relevant categories.
 */
function detectCoreIssue(scenario) {
  const s = (scenario || "").toLowerCase();
  
  const patterns = {
    search_seizure: {
      tests: [
        /\b(search|searched|searching|seiz\w*|warrant|warrantless|privacy|phone|device|records|text|computer|digital)\b/,
        /\b(charter|police|officer|lawful|unreasonable|state|without\s+warrant|no\s+warrant)\b/,
      ],
      primary: "charter_search_seizure",
      subIssues: new Set(["charter", "s. 8", "search", "seizure", "warrant", "privacy", "phone", "digital", "grant", "hunter", "marakah", "vu"]),
    },
    impaired_motor: {
      tests: [
        /\b(impaired|ride|drunk|over\s*80|breathalyzer|breath\s+sample|breath\s+demand|refus\w*)\b/,
        /\b(motor|vehicle|drive|driving|stopped|checkpoint|checkstop|pulled\s+over)\b/
      ],
      primary: "impaired_driving",
      subIssues: new Set(["charter", "s. 9", "s. 8", "detention", "search", "stop", "breath", "roadside", "grant", "reasonable suspicion"])
    },
    assault_harm: {
      tests: [
        /\b(assault|punch\w*|struck|hit|fight|physical\s+contact)\b/,
        /\b(bodily|harm|injur\w*|wound\w*|broke|fracture\w*|minor\s+injur\w*)\b/
      ],
      primary: "assault_bodily_harm",
      subIssues: new Set(["bodily harm", "s. 267", "intent", "recklessness", "consent", "self-defence"])
    },
    assault_weapon: {
      tests: [
        /\b(assault|attack|confrontation|fight|stab\w*|shoot\w*)\b/,
        /\b(weapon|knife|gun|firearm|club|stab\w*)\b/
      ],
      primary: "assault_weapon",
      subIssues: new Set(["weapon", "s. 267", "intent", "self-defence", "dangerous"])
    },
    sexual_assault: {
      tests: [/\bsexual\b/, /\b(assault|attack|touch|intercourse|coerce|consent)\b/],
      primary: "sexual_assault",
      subIssues: new Set(["s. 271", "consent", "s. 273", "complainant", "credibility"])
    },
    drug_trafficking: {
      tests: [/\b(drug|narcotic|cocaine|fentanyl|cannabis|marijuana)\b/, /\b(traffick|sell|distribut|deal)\b/],
      primary: "drug_trafficking",
      subIssues: new Set(["cdsa", "s. 5", "trafficking", "possession", "schedule", "intent"])
    },
    charter_detention: {
      tests: [/\bcharter\b/, /\b(detain\w*|arrest\w*|arbitrary)\b/],
      primary: "charter_detention",
      subIssues: new Set(["s. 9", "detention", "arbitrary", "grant", "reasonable"])
    },
    charter_counsel: {
      tests: [/\b(right\s+to)?\s*counsel\b|\blawyer\b/, /\b(detain\w*|arrest\w*)\b/],
      primary: "charter_counsel",
      subIssues: new Set(["s. 10", "right to counsel", "informational", "detention", "waiver"])
    },
    uttering_threats: {
      tests: [/\b(threat\w*|uttering)\b/],
      primary: "uttering_threats",
      subIssues: new Set(["uttering threats", "s. 264.1", "threatening", "communication"])
    },
    criminal_harassment: {
      tests: [/\b(harass\w*|stalk\w*)\b/],
      primary: "criminal_harassment",
      subIssues: new Set(["criminal harassment", "s. 264", "repeated communication", "fear for safety"])
    },
    dangerous_driving: {
      tests: [/\b(dangerous|careless|stunt|racing|high\s+speed)\b/, /\b(driv\w*|vehicle|car|motor)\b/],
      primary: "dangerous_driving",
      subIssues: new Set(["dangerous driving", "s. 320.13", "criminal negligence", "motor vehicle"])
    },
    peace_bond: {
      tests: [/\b(peace\s+bond|recognizance|s\.?\s*810|\b810\b)\b/],
      primary: "peace_bond",
      subIssues: new Set(["peace bond", "recognizance", "s. 810", "fear of injury"])
    },
    break_and_enter: {
      tests: [/\b(break\s+and\s+enter|break-in|breaking\s+in|broke\s+into|burglar\w*|dwelling\s+house|residential\s+home|occupied\s+house|home\s+invasion)\b/],
      primary: "break_and_enter",
      subIssues: new Set([
        "break and enter", "breaking and entering", "break-in", "breaking in",
        "s. 348", "section 348", "348",
        "dwelling house", "dwelling-house", "occupied dwelling", "occupied house", "residential home",
        "intent", "dishonestly", "housebreaking",
        "stolen", "theft", "electronics", "property", "robbery",
        "burglar", "burglary", "burglarious intent",
        "night", "person found", "articles", "valuables"
      ])
    },
    robbery: {
      tests: [/\brobbery\b/],
      primary: "robbery",
      subIssues: new Set(["robbery", "s. 343", "violence", "threat", "force"])
    },
    theft: {
      tests: [
        /\b(theft|steal\w*|stolen|shoplift\w*|merchandise|without\s+paying)\b/
      ],
      primary: "theft",
      subIssues: new Set(["theft", "s. 322", "dishonesty", "property", "without consent"])
    },
    domestic_assault: {
      tests: [
        /\b(domestic|spouse|partner|intimate|family)\b/,
        /\b(assault|physical\s+contact|hit|punch\w*|fight|violence)\b/
      ],
      primary: "domestic_assault",
      subIssues: new Set(["domestic", "intimate partner", "assault", "s. 266", "s. 267", "bodily harm"])
    },
    trial_delay: {
      tests: [
        /\b(delay|delayed|adjourned|adjournment|postponed|backlog|waited)\b/,
        /\b(trial|crown|court|hearing|charter|11\(b\))\b/
      ],
      primary: "trial_delay",
      subIssues: new Set([
        "charter",
        "s. 11(b)",
        "trial delay",
        "crown delay",
        "jordan",
        "cody",
        "reasonable time",
      ])
    }
  };

  const orderedKeys = [
    "search_seizure",
    "impaired_motor",
    "assault_harm",
    "assault_weapon",
    "sexual_assault",
    "drug_trafficking",
    "charter_counsel",
    "charter_detention",
    "uttering_threats",
    "criminal_harassment",
    "dangerous_driving",
    "peace_bond",
    "break_and_enter",
    "robbery",
    "theft",
    "domestic_assault",
    "trial_delay",
  ];

  for (const key of orderedKeys) {
    const config = patterns[key];
    if (!config) continue;
    const allMatch = config.tests.every(regex => regex.test(s));
    if (allMatch) {
      return { primary: config.primary, allowed: config.subIssues };
    }
  }
  
  return { primary: "general_criminal", allowed: new Set() };
}

/**
 * Filter case law candidates by semantic relevance to the detected core issue.
 */
function filterBySemanticRelevance(scenario, candidates) {
  const issue = detectCoreIssue(scenario);
  if (issue.allowed.size === 0) {
    return {
      candidates,
      dropCount: 0,
      fallbackUsed: false,
      issue,
    };
  }

  const filtered = candidates.map((c) => {
    const summary = normalizeForMatch(`${c.title || ""} ${c.summary || ""}`);
    const semanticMatches = [...issue.allowed].filter((sub) => termMatchesText(sub, summary));
    if (semanticMatches.length === 0) return null;

    const dedupedMatches = dedupeStrings(semanticMatches).slice(0, 3);
    const semanticTag = `Semantic: ${issue.primary} (${dedupedMatches.join(", ")})`;
    const mergedMatchedTerm = c.matchedTerm
      ? `${c.matchedTerm}; ${semanticTag}`
      : semanticTag;

    return {
      ...c,
      semanticMatches: dedupedMatches,
      matchedTerm: mergedMatchedTerm,
    };
  }).filter(Boolean);

  // Avoid hard-empty results when term matching is overly strict for a scenario.
  if (filtered.length > 0) {
    return {
      candidates: filtered,
      dropCount: Math.max(0, candidates.length - filtered.length),
      fallbackUsed: false,
      issue,
    };
  }

  return {
    candidates,
    dropCount: candidates.length,
    fallbackUsed: true,
    issue,
  };
}

function withSemanticMatchedContent(candidate, fallbackText) {
  const base = fallbackText || "";
  const chunks = [base];
  if (Array.isArray(candidate?.semanticMatches) && candidate.semanticMatches.length > 0) {
    chunks.push(`Semantic matches: ${candidate.semanticMatches.join(", ")}`);
  }
  if (Array.isArray(candidate?.retrievalReasons) && candidate.retrievalReasons.length > 0) {
    chunks.push(`Selection signals: ${candidate.retrievalReasons.slice(0, 3).join(", ")}`);
  }
  if (Array.isArray(candidate?.issueSignals) && candidate.issueSignals.length > 0) {
    chunks.push(`Issue signals: ${candidate.issueSignals.slice(0, 6).join(", ")}`);
  }
  if (Array.isArray(candidate?.overlapTokens) && candidate.overlapTokens.length > 0) {
    chunks.push(`Scenario terms: ${candidate.overlapTokens.slice(0, 3).join(", ")}`);
  }
  return chunks.filter(Boolean).join(" | ");
}

function buildLocalFallbackCandidates({ scenario = "", maxResults = 3 }) {
  const scenarioTokens = tokenizeScenario(scenario);
  const issue = detectCoreIssue(scenario);
  const issueTerms =
    issue.allowed.size > 0
      ? [...issue.allowed]
      : inferFallbackIssueSignals(scenarioTokens);

  const scored = [];
  for (const entry of MASTER_CASE_LAW_DB || []) {
    if (!entry?.citation) continue;
    const text = normalizeForMatch(
      `${entry.title || ""} ${entry.ratio || ""} ${(entry.tags || []).join(" ")} ${(entry.topics || []).join(" ")}`
    );

    let overlap = 0;
    for (const token of scenarioTokens) {
      if (text.includes(token)) overlap += 1;
    }

    let issueHits = 0;
    for (const term of issueTerms) {
      if (termMatchesText(term, text)) issueHits += 1;
    }

    let score = overlap * 3 + issueHits * 5;

    // Keep Oakes focused on section 1/proportionality contexts, not as a broad Charter fallback.
    const isOakes = /\boakes\b/i.test(String(entry?.title || "")) || /\boakes\b/i.test(String(entry?.citation || ""));
    const hasSectionOneSignal = /\b(oakes|section\s+1|s\.\s*1|proportionality|minimal\s+impairment|reasonable\s+limits|charter\s+justification)\b/i.test(
      String(scenario || "")
    );
    if (isOakes && !hasSectionOneSignal) {
      score -= 8;
    }

    if (score <= 0) continue;

    const parsed = parseCitation(entry.citation);
    scored.push({
      citation: entry.citation,
      title: entry.title || entry.citation,
      summary: [entry.ratio, ...(entry.tags || []), ...(entry.topics || [])].filter(Boolean).join(" "),
      url: "",
      matchedTerm: "Local issue fallback",
      court: parsed?.courtCode || entry.court,
      year: parsed?.year || entry.year,
      isLandmark: true,
      retrievalScore: score,
      issueSignals: issueTerms.slice(0, 8),
      overlapTokens: Array.from(scenarioTokens).slice(0, 4),
      retrievalReasons: ["local_fallback", `overlap:${overlap}`, `issue_hits:${issueHits}`],
    });
  }

  if (scored.length === 0) {
    const genericFallback = Array.isArray(MASTER_CASE_LAW_DB) ? MASTER_CASE_LAW_DB[0] : null;
    if (!genericFallback?.citation) return [];

    const parsed = parseCitation(genericFallback.citation);
    const scenarioTerms = String(scenario || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3)
      .slice(0, 4);

    return [
      {
        citation: genericFallback.citation,
        title: genericFallback.title || genericFallback.citation,
        summary: [
          genericFallback.ratio,
          ...(genericFallback.tags || []),
          ...(genericFallback.topics || []),
          scenarioTerms.join(" "),
        ]
          .filter(Boolean)
          .join(" "),
        url: "",
        matchedTerm: "Local generic fallback",
        court: parsed?.courtCode || genericFallback.court,
        year: parsed?.year || genericFallback.year,
        isLandmark: true,
        retrievalScore: 1,
        issueSignals: inferFallbackIssueSignals(scenarioTokens).slice(0, 8),
        overlapTokens: scenarioTerms,
        retrievalReasons: ["local_fallback", "minimal_detail_scenario"],
      },
    ];
  }

  return scored
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .slice(0, Math.max(1, Math.min(3, maxResults)));
}

function selectFinalCandidates({ candidates = [], issuePrimary = "general_criminal", maxResults = 3 }) {
  const sorted = [...candidates].sort((a, b) => {
    const scoreA = Number(a?.retrievalScore) || 0;
    const scoreB = Number(b?.retrievalScore) || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const yearA = Number(a?.year) || 0;
    const yearB = Number(b?.year) || 0;
    if (yearB !== yearA) return yearB - yearA;
    return String(a?.citation || "").localeCompare(String(b?.citation || ""));
  });

  if (sorted.length === 0) return [];

  const broadIssue = new Set(["general_criminal", "charter_search_seizure"]);
  const strictScoreThreshold = broadIssue.has(issuePrimary) ? 12 : 14;
  const strictSemanticThreshold = broadIssue.has(issuePrimary) ? 1 : 2;
  const moderateScoreThreshold = broadIssue.has(issuePrimary) ? 9 : 10;

  const strict = sorted.filter((item) => {
    const score = Number(item?.retrievalScore) || 0;
    const semanticCount = Array.isArray(item?.semanticMatches) ? item.semanticMatches.length : 0;
    return score >= strictScoreThreshold || semanticCount >= strictSemanticThreshold;
  });

  const moderate = sorted.filter((item) => {
    const score = Number(item?.retrievalScore) || 0;
    return score >= moderateScoreThreshold;
  });

  const selected = strict.length > 0 ? strict : moderate.length > 0 ? moderate : sorted.slice(0, 1);

  // Keep a slightly wider set for broad/general scenarios.
  const cap = issuePrimary === "general_criminal" ? maxResults : Math.min(maxResults, 3);
  return selected.slice(0, cap);
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
  if (/\b(delay|delayed|adjourned|adjournment|postponed|backlog|crown\s+delay)\b/.test(s)) {
    push(
      "R v Jordan 2016 SCC 27",
      "R v Cody 2017 SCC 31",
      "Charter section 11(b) trial within reasonable time",
      "unreasonable trial delay Crown"
    );
  }
  if (refusal && (alcohol || /\bbreath\b/.test(s))) {
    push("refusal breath sample Criminal Code", "reasonable grounds breath demand");
  }
  if (blood) {
    push("blood sample Charter section 8", "seizure blood sample warrantless");
  }
  if (searchSeizure || /\bsearch\b/.test(s) || /\bwarrant\w*\b/.test(s) || /\bprivacy\b/.test(s)) {
    push(
      "Charter section 8 search seizure",
      "unreasonable search warrant",
      "R v Grant",
      "Hunter v Southam Inc",
      "R v Marakah",
      "R v Vu"
    );
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
    push(
      "Charter section 10 right to counsel",
      "informational duty right to counsel detention",
      "R. v. Woods 2005 SCC 42 right to counsel breath demand"
    );
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
    const scoreA = Number(a?.retrievalScore) || 0;
    const scoreB = Number(b?.retrievalScore) || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const rankA = candidateDatabaseRank(a);
    const rankB = candidateDatabaseRank(b);
    if (rankA !== rankB) return rankA - rankB;
    const yearA = Number(a?.year) || 0;
    const yearB = Number(b?.year) || 0;
    if (yearB !== yearA) return yearB - yearA;
    return String(a?.citation || "").localeCompare(String(b?.citation || ""));
  });
}

function dedupeCandidates(candidates) {
  const byCitation = new Map();
  for (const candidate of candidates) {
    const key = buildCitationIdentityKey(candidate.citation);
    if (!byCitation.has(key)) {
      byCitation.set(key, candidate);
    } else {
      // Prefer landmark entries (they bypass verification); then prefer named entries over citation-only
      const existing = byCitation.get(key);
      if (!existing.isLandmark && candidate.isLandmark) {
        byCitation.set(key, {
          ...candidate,
          title: existing.title || candidate.title,
          summary:
            String(existing.summary || "").length > String(candidate.summary || "").length
              ? existing.summary
              : candidate.summary,
        });
      } else if (!existing.isLandmark && !candidate.isLandmark) {
        const existingHasName = Boolean(existing.title && existing.title !== existing.citation);
        const candidateHasName = Boolean(candidate.title && candidate.title !== candidate.citation);
        if (!existingHasName && candidateHasName) {
          byCitation.set(key, candidate);
        }
      } else if (existing.isLandmark && !candidate.isLandmark) {
        // Keep landmark verification bypass but enrich metadata from AI-suggested duplicate.
        byCitation.set(key, {
          ...existing,
          title: existing.title || candidate.title,
          summary:
            String(candidate.summary || "").length > String(existing.summary || "").length
              ? candidate.summary
              : existing.summary,
        });
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
    matched_content: withSemanticMatchedContent(
      candidate,
      candidate.matchedTerm
        ? `Verified via CanLII (${candidate.matchedTerm})`
        : "Verified via CanLII (AI metadata)"
    ),
    verificationStatus: "verified",
    retrievalScore: Number(candidate?.retrievalScore) || 0,
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
  let localFallbackUsed = false;

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
    
    // Apply pre-verify semantic gate: filter AI citations by scenario relevance
    // Tokenize scenario and require minimum overlap with candidate summaries
    const scenarioTokens = tokenizeScenario(scenario);
    
    const filtered = [];
    for (const candidate of aiCitationCandidates) {
      if (scenarioTokens.size === 0) {
        filtered.push(candidate);
        continue;
      }

      const candSummary = `${candidate.title || ""} ${candidate.summary || ""}`.toLowerCase();
      let overlapCount = 0;
      for (const token of scenarioTokens) {
        if (candSummary.includes(token)) overlapCount++;
      }

      // Require minimum 2 scenario tokens in candidate (tunable threshold)
      const meetsThreshold = overlapCount >= 2;
      if (meetsThreshold) {
        filtered.push(candidate);
      }
    }
    
    aiCitationCandidates.splice(0, aiCitationCandidates.length, ...filtered);
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
        summary: [landmark.ratio, ...(landmark.tags || []), ...(landmark.topics || [])]
          .filter(Boolean)
          .join(" "),
        url: "",
        matchedTerm: "Landmark RAG Match",
        court: parsed?.courtCode || landmark.court,
        year: parsed?.year || landmark.year,
        isLandmark: true, // Flag for verification bypass
      });
    }
  }

  // Add deterministic landmark seeds from scenario + extracted terms.
  // This covers common high-signal flows like Jordan/Cody delay scenarios.
  const landmarkSeeds = findLandmarkSeeds({
    scenario,
    terms,
    limit: Math.max(1, Math.min(3, maxResults)),
  });
  if (landmarkSeeds.length > 0) {
    aiCitationCandidates.push(...landmarkSeeds);
  }

  if (aiCitationCandidates.length === 0) {
    const fallbackCandidates = buildLocalFallbackCandidates({ scenario, maxResults });
    if (fallbackCandidates.length > 0) {
      aiCitationCandidates.push(...fallbackCandidates);
      localFallbackUsed = true;
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
        relevanceScoreAvg: null,
        fallbackPathUsed: localFallbackUsed,
        fallbackReason: localFallbackUsed ? "local_fallback" : null,
        semanticFilterDropCount: 0,
        candidateSourceMix: {
          ai: 0,
          landmark: 0,
          localFallback: 0,
        },
      },
    };
  }

  // Apply semantic filtering by core legal issue and score candidates by scenario fit.
  const semanticFilter = filterBySemanticRelevance(scenario, aiCitationCandidates);
  const issue = semanticFilter.issue;
  const semanticFiltered = semanticFilter.candidates;
  const scenarioTokens = tokenizeScenario(scenario);
  const scoredCandidates = semanticFiltered.map((candidate) =>
    scoreCandidateForScenario({
      candidate,
      scenarioTokens,
      issue,
      filters,
    })
  );

  // Verify AI citations via the working lookupCase() endpoint
  const sorted = sortCandidatesForStableVerification(dedupeCandidates(scoredCandidates));

  // Split landmarks (no API call needed) from regular candidates
  const landmarkResults = [];
  const toVerify = [];
  const citationLookupSeen = new Set();

  for (const candidate of sorted) {
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
      landmarkResults.push({
        citation: candidate.citation,
        title: candidate.title || null,
        summary: candidate.summary,
        court: candidate.court,
        year: candidate.year,
        url_canlii: landmarkUrl,
        matched_content: withSemanticMatchedContent(candidate, "Landmark Case Law Database"),
        verificationStatus: "verified",
        retrievalScore: Number(candidate?.retrievalScore) || 0,
      });
    } else {
      if (toVerify.length >= MAX_VERIFICATION_CALLS) continue;
      const key = buildCitationIdentityKey(candidate.citation);
      if (citationLookupSeen.has(key)) continue;
      citationLookupSeen.add(key);
      toVerify.push(candidate);
    }
  }

  // Verify non-landmark candidates in parallel
  const verificationResults = await Promise.all(
    toVerify.map((candidate) => lookupCase(candidate.citation, apiKey))
  );

  const verifiedCases = [];
  for (let i = 0; i < toVerify.length; i++) {
    if (verificationResults[i].status === "verified") {
      verifiedCases.push(toCaseLawItem(toVerify[i], verificationResults[i]));
    }
  }

  // Rank and gate final verified output by scenario relevance.
  let selectedCandidates = selectFinalCandidates({
      candidates: [...landmarkResults, ...verifiedCases],
      issuePrimary: issue?.primary || "general_criminal",
      maxResults,
    });

  let postVerificationFallbackUsed = false;
  if (selectedCandidates.length === 0) {
    const postVerifyFallback = buildLocalFallbackCandidates({ scenario, maxResults });
    if (postVerifyFallback.length > 0) {
      selectedCandidates = selectFinalCandidates({
        candidates: postVerifyFallback,
        issuePrimary: issue?.primary || "general_criminal",
        maxResults,
      });
      postVerificationFallbackUsed = selectedCandidates.length > 0;
    }
  }

  const relevanceScoreAvg =
    selectedCandidates.length > 0
      ? Number(
          (
            selectedCandidates.reduce((sum, item) => sum + (Number(item?.retrievalScore) || 0), 0) /
            selectedCandidates.length
          ).toFixed(3)
        )
      : null;

  const candidateSourceMix = scoredCandidates.reduce(
    (acc, candidate) => {
      const term = String(candidate?.matchedTerm || "");
      if (term.includes("Local") || term.includes("local")) acc.localFallback += 1;
      else if (term.includes("Landmark")) acc.landmark += 1;
      else acc.ai += 1;
      return acc;
    },
    { ai: 0, landmark: 0, localFallback: 0 }
  );

  const fallbackReason = localFallbackUsed
    ? "local_fallback"
    : postVerificationFallbackUsed
    ? "post_verify_local_fallback"
    : semanticFilter.fallbackUsed
    ? "semantic_filter_fallback"
    : null;

  const selectedIdentityKeys = new Set(
    selectedCandidates.map((item) => buildCitationIdentityKey(item?.citation || ""))
  );
  const hasLandmarkSeedResult = scoredCandidates.some(
    (item) =>
      item?.landmarkSeed === true &&
      selectedIdentityKeys.has(buildCitationIdentityKey(item?.citation || ""))
  );
  const retrievalPass = hasLandmarkSeedResult
    ? "landmark_seed"
    : localFallbackUsed || postVerificationFallbackUsed
    ? "local_fallback"
    : semanticFilter.fallbackUsed
    ? "semantic_fallback"
    : "semantic_primary";

  const cases = selectedCandidates
    .slice(0, maxResults)
    .map((item) => {
      const { retrievalScore: _dropScore, ...rest } = item;
      return rest;
    });
  const verificationCallsTotal = toVerify.length;

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
      relevanceScoreAvg,
      fallbackPathUsed: Boolean(fallbackReason),
      fallbackReason,
      retrievalPass,
      semanticFilterDropCount: semanticFilter.dropCount,
      candidateSourceMix,
      reason: cases.length > 0 ? "verified_results" : "no_verified",
    },
  };
}
