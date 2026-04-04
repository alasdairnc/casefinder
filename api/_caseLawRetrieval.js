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
import {
  SIMPLE_STOP_WORDS,
  normalizeForMatch,
  tokenizeWithExpansion,
} from "./_textUtils.js";
import { FALLBACK_ISSUE_SIGNAL_RULES, ISSUE_DOMAIN_RULES } from "./_filterConfig.js";
import {
  extractLegalConcepts,
  countConceptOverlap,
  hasAnyConcept,
  missingRequiredConceptBuckets,
} from "./_legalConcepts.js";

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
  return tokenizeWithExpansion(text, {
    stopWords: SIMPLE_STOP_WORDS,
    returnType: "set",
  });
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
  const hasAny = (arr = []) => arr.some((x) => tokens.has(x));

  for (const rule of FALLBACK_ISSUE_SIGNAL_RULES) {
    if (!hasAny(rule?.tokens)) continue;
    for (const signal of rule?.signals || []) {
      out.push(signal);
    }
  }

  return dedupeStrings(out);
}

function isMinorTrafficStopScenario(scenario) {
  const s = String(scenario || "").toLowerCase();
  if (!s) return false;

  const hasTrafficStopContext = /\b(pulled\s+over|traffic\s+stop|roadside|stopped|speed\s+limit|speeding|speeding\s+stop|ticket|citation|fine)\b/.test(s);
  const hasMinorSpeedContext = /\b(\d+\s*km\/h|km\/h|over\s*the\s*limit|over\s*\d+\s*km\/h|speed\s*overage|speeding\s+ticket|speeding\s+stop)\b/.test(s);
  const hasSeriousCharterOrCriminalContext = /\b(charter|detain\w*|arrest\w*|search\w*|seiz\w*|counsel|warrant|impaired|breath|drunk|dangerous|careless)\b/.test(s);

  return (
    (hasTrafficStopContext && hasMinorSpeedContext) ||
    (hasTrafficStopContext && !hasSeriousCharterOrCriminalContext && /\b(speed\s+limit|speeding\s+stop|speeding\s+ticket)\b/.test(s))
  );
}

function candidateDbId(candidate) {
  const parsed = parseCitation(candidate?.citation || "");
  return parsed?.apiDbId || "";
}

function scoreCandidateForScenario({ candidate, scenarioTokens, issue, filters = {} }) {
  const rawCandidateText = `${candidate?.title || ""} ${candidate?.summary || ""} ${candidate?.matchedTerm || ""}`;
  const text = normalizeForMatch(rawCandidateText);
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

  const compatibilityAdjustment = Number(candidate?.compatibilityAdjustment) || 0;
  if (compatibilityAdjustment !== 0) {
    score += compatibilityAdjustment;
    reasons.push(`compat:${compatibilityAdjustment}`);
  }

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

  const issuePrimary = issue?.primary || "general_criminal";
  const scenarioTokenText = Array.isArray(scenarioTokens)
    ? scenarioTokens.join(" ")
    : scenarioTokens instanceof Set
    ? [...scenarioTokens].join(" ")
    : String(scenarioTokens || "");
  const scenarioHasImpairedSignal = /\b(impaired|drunk|breath|breathalyzer|ride|checkstop|roadside|over\s*80|refus\w*)\b/.test(
    scenarioTokenText
  );
  const scenarioHasCounselSignal = /\b(counsel|lawyer|10\(b\)|10\s*b|right\s+to\s+counsel)\b/.test(scenarioTokenText);
  if (issuePrimary !== "general_criminal") {
    if (issuePrimary === "charter_detention") {
      if (/\b(detention|detained|arbitrary|grant|s\.?\s*9|section\s*9)\b/.test(text)) score += 6;
      if (/\b(search|seizure|warrant|privacy)\b/.test(text) && !/\b(detention|detained|arbitrary|grant)\b/.test(text)) score -= 4;
      if (!scenarioHasImpairedSignal && /\b(impaired|breath|breathalyzer|drunk\s*driving|over\s*80)\b/.test(text)) score -= 5;
    }
    if (issuePrimary === "charter_counsel") {
      if (/\b(counsel|lawyer|10\(b\)|10\s*b|woods|informational\s+duty)\b/.test(text)) score += 6;
      if (!/\b(counsel|lawyer|10\(b\)|10\s*b)\b/.test(text)) score -= 4;
    }
    if (issuePrimary === "drug_trafficking") {
      if (/\b(cdsa|traffick|drug|fentanyl|cocaine|possession|s\.?\s*5)\b/.test(text)) score += 6;
      else score -= 4;
    }
    if (issuePrimary === "assault_bodily_harm" || issuePrimary === "assault_weapon") {
      if (/\b(bodily\s+harm|weapon|self\s*defence|self-defence|s\.?\s*267|assault)\b/.test(text)) score += 4;
      if (/\b(sexual\s+assault|consent|complainant|s\.?\s*271)\b/.test(text)) score -= 6;
    }
    if (issuePrimary === "robbery") {
      if (/\b(robbery|robbed|mugging|mugged|s\.?\s*343|force|threat)\b/.test(text)) score += 5;
      else score -= 4;
    }
    if (issuePrimary === "theft") {
      if (/\b(theft|stolen|steal|shoplift|s\.?\s*322|dishonesty|without\s+consent)\b/.test(text)) score += 5;
      else score -= 4;
    }
    if (issuePrimary === "impaired_driving" && !scenarioHasCounselSignal) {
      if (/\b(counsel|lawyer|10\(b\)|10\s*b|informational\s+duty)\b/.test(text) && !/\b(reasonable\s+suspicion|s\.?\s*9|grant|checkpoint|checkstop)\b/.test(text)) {
        score -= 5;
      }
    }
  }

  const scenarioConcepts = extractLegalConcepts(scenarioTokenText);
  const candidateConcepts = extractLegalConcepts(rawCandidateText);
  const conceptOverlap = countConceptOverlap(scenarioConcepts, candidateConcepts);
  if (conceptOverlap >= 3) {
    score += 6;
    reasons.push(`concept_overlap:${conceptOverlap}`);
  } else if (conceptOverlap >= 2) {
    score += 4;
    reasons.push(`concept_overlap:${conceptOverlap}`);
  } else if (conceptOverlap >= 1) {
    score += 1;
    reasons.push("concept_overlap:1");
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

  if (isMinorTrafficStopScenario(s)) {
    return {
      primary: "minor_traffic_stop",
      allowed: new Set(["speed limit", "speeding ticket", "traffic stop", "roadside stop", "motor vehicle"]),
    };
  }
  
  const patterns = {
    search_seizure: {
      tests: [
        /\b(search|searched|searching|seiz\w*|warrant|warrantless|privacy|phone|device|records|text|computer|digital)\b/,
        /\b(charter|police|officer\w*|lawful|unreasonable|state|without\s+warrant|no\s+warrant)\b/,
      ],
      primary: "charter_search_seizure",
      subIssues: new Set(["charter", "s. 8", "search", "seizure", "warrant", "privacy", "phone", "digital", "grant", "hunter", "marakah", "vu"]),
    },
    impaired_motor: {
      tests: [
        /\b(impaired|ride|drunk|over\s*80|breathalyzer|breath\s+sample|breath\s+demand|refus\w*)\b/,
        /\b(motor|vehicle|drive|driving|stop|stopped|checkpoint|checkstop|pulled\s+over|station)\b/
      ],
      primary: "impaired_driving",
      subIssues: new Set(["s. 9", "detention", "stop", "breath", "roadside", "grant", "reasonable suspicion", "breath demand", "impaired"])
    },
    assault_harm: {
      tests: [
        /\b(assault|punch\w*|struck|hit|fight|physical\s+contact)\b/,
        /\b(bodily|harm|injur\w*|wound\w*|broke|broken|fracture\w*|stitches?|minor\s+injur\w*)\b/
      ],
      primary: "assault_bodily_harm",
      subIssues: new Set(["bodily harm", "s. 267", "recklessness", "self-defence", "punch"])
    },
    assault_weapon: {
      tests: [
        /\b(assault|attack|confrontation|fight|stab\w*|shoot\w*)\b/,
        /\b(weapon|knife|gun|firearm|club|stab\w*)\b/
      ],
      primary: "assault_weapon",
      subIssues: new Set(["weapon", "s. 267", "self-defence", "dangerous", "knife", "firearm"])
    },
    sexual_assault: {
      tests: [
        /\b(sexual|complainant|mistaken\s+belief\s+in\s+consent)\b/,
        /\b(assault|attack|touch|intercourse|coerce|consent)\b/
      ],
      primary: "sexual_assault",
      subIssues: new Set(["s. 271", "consent", "s. 273", "complainant", "credibility"])
    },
    drug_trafficking: {
      tests: [/\b(drug|narcotic|cocaine|fentanyl|cannabis|marijuana)\b/, /\b(traffick\w*|sell|sold|distribut\w*|deal\w*)\b/],
      primary: "drug_trafficking",
      subIssues: new Set(["cdsa", "s. 5", "trafficking", "possession", "schedule", "intent"])
    },
    charter_detention: {
      tests: [
        /\b(charter|detain\w*|arbitrary|free\s+to\s+leave|boxed\s+in)\b/,
        /\b(detain\w*|arbitrary|free\s+to\s+leave|boxed\s+in|questioned)\b/
      ],
      primary: "charter_detention",
      subIssues: new Set(["s. 9", "detention", "arbitrary", "grant", "psychological detention"])
    },
    charter_counsel: {
      tests: [/\b(right\s+to)?\s*counsel\b|\blawyer\b/, /\b(detain\w*|detention|arrest\w*)\b/],
      primary: "charter_counsel",
      subIssues: new Set(["s. 10", "s. 10(b)", "right to counsel", "informational", "detention", "waiver", "woods", "suberu"])
    },
    minor_traffic_stop: {
      tests: [
        /\b(pulled\s+over|traffic\s+stop|roadside)\b/,
        /\b(speed\s+limit|speeding|km\/h|over\s*\d+\s*km\/h|over\s+the\s+limit)\b/,
      ],
      primary: "minor_traffic_stop",
      subIssues: new Set(["speed limit", "speeding ticket", "traffic stop", "roadside stop", "motor vehicle"]),
    },
    uttering_threats: {
      tests: [
        /\b(threat\w*|uttering)\b/,
        /\b(text|message|call|phone|email|voicemail|said|told|communicat\w*)\b/,
      ],
      primary: "uttering_threats",
      subIssues: new Set(["uttering threats", "s. 264.1", "threatening", "communication"])
    },
    criminal_harassment: {
      tests: [
        /\b(harass\w*|stalk\w*)\b/,
        /\b(repeat\w*|follow\w*|fear|safety|communicat\w*)\b/,
      ],
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
      tests: [/\b(robbery|robbed|mugg(?:ed|ing)?)\b|\b(took|take|stole|steal\w*|grabbed|snatched)\b.*\b(wallet|cash|money|property|phone|bag|purse|backpack)\b.*\b(force|threat|threatened|violence|violent|knife|gun|firearm|shove\w*)\b|\b(force|threat|threatened|violence|violent|knife|gun|firearm|shove\w*)\b.*\b(took|take|stole|steal\w*|grabbed|snatched)\b.*\b(wallet|cash|money|property|phone|bag|purse|backpack)\b/],
      primary: "robbery",
      subIssues: new Set(["robbery", "robbed", "mugging", "s. 343", "violence", "threat", "force"])
    },
    theft: {
      tests: [
        /\b(theft|steal\w*|stole|stolen|shoplift\w*|merchandise|without\s+paying)\b/
      ],
      primary: "theft",
      subIssues: new Set(["theft", "s. 322", "dishonesty", "without consent", "stolen", "taking"])
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
        /\b(trial|case|charge\w*|crown|court|hearing|charter|11\(b\))\b/
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
    // Specificity-first ordering: narrow/high-signal classes before broad Charter buckets.
    "minor_traffic_stop",
    "peace_bond",
    "trial_delay",
    "charter_counsel",
    "search_seizure",
    "impaired_motor",
    "charter_detention",
    "break_and_enter",
    "robbery",
    "theft",
    "drug_trafficking",
    "sexual_assault",
    "assault_weapon",
    "domestic_assault",
    "assault_harm",
    "uttering_threats",
    "criminal_harassment",
    "dangerous_driving",
  ];

  for (const key of orderedKeys) {
    const config = patterns[key];
    if (!config) continue;
    const allMatch = config.tests.every(regex => regex.test(s));
    if (allMatch) {
      const allowed = new Set(config.subIssues || []);
      if (config.primary === "assault_bodily_harm" && !/\b(self\s*-?defence|self defense)\b/.test(s)) {
        allowed.delete("self-defence");
      }
      return { primary: config.primary, allowed };
    }
  }
  
  return { primary: "general_criminal", allowed: new Set() };
}

function detectCandidateDomains(candidate) {
  const haystack = normalizeForMatch(
    `${candidate?.citation || ""} ${candidate?.title || ""} ${candidate?.summary || ""} ${candidate?.matchedTerm || ""}`
  );
  const out = new Set();

  const hasSexualAssaultSignal = /\b(sexual\s+assault|consent|complainant|s\.?\s*271)\b/.test(haystack);

  if (/\b(jordan|cody|11\s*b|11\(b\)|trial\s+delay|reasonable\s+time|crown\s+delay|adjournment)\b/.test(haystack)) out.add("trial_delay");
  if (/\b(oakes|section\s+1|s\.?\s*1|proportionality|minimal\s+impairment|reasonable\s+limits)\b/.test(haystack)) out.add("charter_section1");
  if (/\b(counsel|lawyer|10\s*b|10\(b\)|informational\s+duty|woods)\b/.test(haystack)) out.add("charter_counsel");
  if (/\b(search|seizure|warrant|privacy|hunter|marakah|vu|8\s*\)|s\.?\s*8)\b/.test(haystack)) out.add("charter_search_seizure");
  if (/\b(detention|detained|arbitrary|grant|s\.?\s*9|9\s*\))\b/.test(haystack)) out.add("charter_detention");
  if (/\b(impaired|breath|breathalyzer|over\s*80|roadside|checkstop|drunk\s+driving)\b/.test(haystack)) out.add("impaired_driving");
  if (/\b(robbery|robbed|mugging|mugged|s\.?\s*343)\b/.test(haystack)) out.add("robbery");
  if (/\b(theft|stolen|steal|shoplift|s\.?\s*322)\b/.test(haystack)) out.add("theft");
  if (/\b(assault|bodily\s+harm|weapon|self\s*defence|self-defence|s\.?\s*267)\b/.test(haystack) && !hasSexualAssaultSignal) out.add("assault");
  if (/\b(cdsa|trafficking|drug|narcotic|possession|s\.?\s*5)\b/.test(haystack)) out.add("drug");
  if (/\b(domestic|intimate\s+partner|family\s+violence|spouse)\b/.test(haystack)) out.add("domestic");
  if (hasSexualAssaultSignal) out.add("sexual_assault");
  if (/\b(peace\s+bond|recognizance|s\.?\s*810)\b/.test(haystack)) out.add("peace_bond");
  if (/\b(break\s+and\s+enter|break-in|s\.?\s*348|dwelling\s+house)\b/.test(haystack)) out.add("break_and_enter");
  if (/\b(criminal\s+harassment|stalk|s\.?\s*264)\b/.test(haystack)) out.add("criminal_harassment");
  if (/\b(uttering\s+threats|threatening|s\.?\s*264\.1)\b/.test(haystack)) out.add("uttering_threats");

  if (/\b(copyright|royalt(?:y|ies)|socan|intellectual\s+property|making\s+a\s+work\s+available|digital\s+copyright)\b/.test(haystack)) out.add("ip_copyright");
  if (/\b(constitution|federalism|secession|senate\s+reform|amending\s+formula|same-sex\s+marriage|impact\s+assessment|trade\s+and\s+commerce|freedom\s+of\s+religion|assisted\s+dying|security\s+of\s+the\s+person|cruel\s+and\s+unusual|section\s+12|s\.?\s*12|section\s+7|s\.?\s*7|fundamental\s+justice)\b/.test(haystack)) out.add("constitutional_general");
  if (/\b(administrative\s+law|judicial\s+review|procedural\s+fairness|standard\s+of\s+review|tribunal\s+decision)\b/.test(haystack)) out.add("administrative_general");
  if (/\b(indigenous|aboriginal\s+title|treaty\s+rights|duty\s+to\s+consult|first\s+nation)\b/.test(haystack)) out.add("indigenous_general");

  return out;
}

function isClearlyNonCriminalScenario(scenario) {
  const scenarioDomainHints = detectCandidateDomains({ summary: scenario });
  const nonCriminalScenarioDomains = [
    "ip_copyright",
    "administrative_general",
    "constitutional_general",
    "indigenous_general",
  ];
  const criminalScenarioDomains = [
    "trial_delay",
    "charter_section1",
    "charter_counsel",
    "charter_search_seizure",
    "charter_detention",
    "impaired_driving",
    "robbery",
    "theft",
    "assault",
    "drug",
    "domestic",
    "sexual_assault",
    "peace_bond",
    "break_and_enter",
    "criminal_harassment",
    "uttering_threats",
  ];
  const scenarioHasNonCriminalDomain = nonCriminalScenarioDomains.some((d) => scenarioDomainHints.has(d));
  const scenarioHasCriminalDomain = criminalScenarioDomains.some((d) => scenarioDomainHints.has(d));
  return scenarioHasNonCriminalDomain && !scenarioHasCriminalDomain;
}

function isCandidateCompatibleWithIssue(issuePrimary, candidateDomains) {
  if (!issuePrimary) return true;
  const hasDomains = candidateDomains instanceof Set && candidateDomains.size > 0;

  const criminalDomains = new Set([
    "trial_delay",
    "charter_section1",
    "charter_counsel",
    "charter_search_seizure",
    "charter_detention",
    "impaired_driving",
    "robbery",
    "theft",
    "assault",
    "drug",
    "domestic",
    "sexual_assault",
    "peace_bond",
    "break_and_enter",
    "criminal_harassment",
    "uttering_threats",
  ]);
  const clearlyNonCriminal = new Set([
    "ip_copyright",
    "constitutional_general",
    "administrative_general",
    "indigenous_general",
  ]);

  if (issuePrimary === "general_criminal") {
    if (!hasDomains) return true;
    let hasCriminalSignal = false;
    let hasOnlyNonCriminalSignals = true;
    for (const domain of candidateDomains) {
      if (criminalDomains.has(domain)) {
        hasCriminalSignal = true;
        hasOnlyNonCriminalSignals = false;
      } else if (!clearlyNonCriminal.has(domain)) {
        hasOnlyNonCriminalSignals = false;
      }
    }
    if (hasCriminalSignal) return true;
    return !hasOnlyNonCriminalSignals;
  }

  // For specific issues, keep strictness where broad landmark leakage is common.
  if (!hasDomains) {
    const strictUnknownDomainIssues = new Set(["theft", "robbery", "trial_delay"]);
    return !strictUnknownDomainIssues.has(issuePrimary);
  }

  const compatibility = {
    charter_search_seizure: new Set(["charter_search_seizure", "charter_detention", "impaired_driving"]),
    impaired_driving: new Set(["impaired_driving", "charter_search_seizure", "charter_detention", "charter_counsel"]),
    charter_detention: new Set(["charter_detention", "charter_search_seizure", "charter_counsel"]),
    charter_counsel: new Set(["charter_counsel", "charter_detention", "impaired_driving"]),
    minor_traffic_stop: new Set(["minor_traffic_stop", "impaired_driving"]),
    trial_delay: new Set(["trial_delay"]),
    charter_section1: new Set(["charter_section1"]),
    robbery: new Set(["robbery", "theft", "assault"]),
    theft: new Set(["theft", "robbery"]),
    assault_bodily_harm: new Set(["assault", "domestic"]),
    assault_weapon: new Set(["assault", "domestic"]),
    domestic_assault: new Set(["domestic", "assault"]),
    drug_trafficking: new Set(["drug"]),
    sexual_assault: new Set(["sexual_assault"]),
    break_and_enter: new Set(["break_and_enter", "theft"]),
    peace_bond: new Set(["peace_bond", "criminal_harassment", "uttering_threats"]),
    criminal_harassment: new Set(["criminal_harassment", "uttering_threats", "peace_bond"]),
    uttering_threats: new Set(["uttering_threats", "criminal_harassment", "peace_bond"]),
    dangerous_driving: new Set(["impaired_driving"]),
  };

  const allowed = compatibility[issuePrimary];
  if (!allowed) return true;

  for (const domain of candidateDomains) {
    if (allowed.has(domain)) return true;
  }
  return false;
}

function hasOnlyClearlyNonCriminalDomains(candidateDomains) {
  if (!(candidateDomains instanceof Set) || candidateDomains.size === 0) return false;
  const clearlyNonCriminal = new Set([
    "ip_copyright",
    "constitutional_general",
    "administrative_general",
    "indigenous_general",
  ]);
  let sawNonCriminal = false;
  for (const domain of candidateDomains) {
    if (!clearlyNonCriminal.has(domain)) return false;
    sawNonCriminal = true;
  }
  return sawNonCriminal;
}

function compatibilityAdjustmentForIssue(issuePrimary, candidateDomains) {
  if (issuePrimary === "general_criminal") {
    return hasOnlyClearlyNonCriminalDomains(candidateDomains) ? -6 : 0;
  }
  if (!(candidateDomains instanceof Set) || candidateDomains.size === 0) return -1;
  if (hasOnlyClearlyNonCriminalDomains(candidateDomains)) return -8;
  return isCandidateCompatibleWithIssue(issuePrimary, candidateDomains) ? 0 : -4;
}

function issueExpansionHints(issuePrimary) {
  const map = {
    robbery: ["robbery", "s. 343", "violence", "threat", "force", "stolen"],
    theft: ["theft", "s. 322", "dishonesty", "without consent", "stolen", "taking"],
    charter_search_seizure: ["s. 8", "search", "seizure", "warrant", "privacy", "phone"],
    charter_counsel: ["s. 10", "s. 10(b)", "right to counsel", "lawyer", "informational duty", "woods", "suberu"],
    charter_detention: ["s. 9", "detention", "arbitrary", "grant", "psychological detention"],
    trial_delay: ["charter", "s. 11(b)", "trial delay", "reasonable time", "jordan", "cody"],
    impaired_driving: ["impaired", "breath", "roadside", "detention", "reasonable suspicion"],
    break_and_enter: ["break and enter", "s. 348", "dwelling", "intent"],
    domestic_assault: ["domestic", "intimate partner", "assault", "s. 266", "s. 267"],
    assault_bodily_harm: ["assault", "bodily harm", "s. 267", "intent"],
    assault_weapon: ["assault", "weapon", "s. 267", "dangerous"],
    drug_trafficking: ["cdsa", "s. 5", "trafficking", "possession", "intent"],
    sexual_assault: ["sexual assault", "s. 271", "consent", "complainant"],
    criminal_harassment: ["criminal harassment", "s. 264", "repeated communication"],
    uttering_threats: ["uttering threats", "s. 264.1", "threat"],
    peace_bond: ["peace bond", "recognizance", "s. 810"],
  };
  return map[issuePrimary] || [];
}

/**
 * Filter case law candidates by semantic relevance to the detected core issue.
 */
function filterBySemanticRelevance(scenario, candidates) {
  const issue = detectCoreIssue(scenario);
  const scenarioTokens = tokenizeScenario(scenario);
  const scenarioConcepts = extractLegalConcepts(scenario);
  if (isClearlyNonCriminalScenario(scenario)) {
    return {
      candidates: [],
      dropCount: Array.isArray(candidates) ? candidates.length : 0,
      fallbackUsed: false,
      issue,
    };
  }
  const scenarioDelaySignal = /\b(delay|delayed|adjourned|adjournment|postponed|backlog|waited|11\(b\)|reasonable\s+time|crown\s+delay)\b/i.test(
    String(scenario || "")
  );
  const isTrialDelayCandidate = (candidate) => {
    const haystack = normalizeForMatch(
      `${candidate?.citation || ""} ${candidate?.title || ""} ${candidate?.summary || ""} ${candidate?.matchedTerm || ""}`
    );
    return /\b(jordan|cody|11\s*b|11\(b\)|trial\s+delay|reasonable\s+time|crown\s+delay)\b/i.test(haystack);
  };

  const withoutDelayLeaks = Array.isArray(candidates)
    ? candidates.filter((candidate) => {
        if (!candidate) return false;
        if (issue.primary === "trial_delay" || scenarioDelaySignal) return true;
        return !isTrialDelayCandidate(candidate);
      })
    : [];

  // Phase 2: demote incompatible domains instead of hard-dropping them.
  const compatibilityRanked = withoutDelayLeaks.map((candidate) => {
    const domains = detectCandidateDomains(candidate);
    return {
      ...candidate,
      compatibilityAdjustment: compatibilityAdjustmentForIssue(issue.primary, domains),
      candidateDomains: Array.from(domains),
    };
  });

  const issueStrictFiltered = compatibilityRanked.filter((candidate) => {
    const summary = normalizeForMatch(`${candidate?.title || ""} ${candidate?.summary || ""}`);
    const scenarioNorm = normalizeForMatch(scenario || "");
    const candidateConcepts = extractLegalConcepts(summary);
    const scenarioHasImpairedSignal = /\b(impaired|drunk|breath|breathalyzer|ride|checkstop|roadside|over\s*80|refus\w*)\b/.test(scenarioNorm);
    const scenarioHasCounselSignal = /\b(counsel|lawyer|10\(b\)|10\s*b|right\s+to\s+counsel)\b/.test(scenarioNorm);

    const domainRule = ISSUE_DOMAIN_RULES[issue.primary];
    if (domainRule) {
      if (missingRequiredConceptBuckets(candidateConcepts, domainRule.requiredConceptBuckets || [])) {
        return false;
      }

      if (Array.isArray(domainRule.discouragedConcepts) && domainRule.discouragedConcepts.length > 0) {
        const candidateHasDiscouraged = hasAnyConcept(candidateConcepts, domainRule.discouragedConcepts);
        if (candidateHasDiscouraged) {
          const scenarioAllows = hasAnyConcept(
            scenarioConcepts,
            domainRule.allowDiscouragedWhenScenarioHas || []
          );
          const candidateHasAllowingConcept = hasAnyConcept(
            candidateConcepts,
            domainRule.allowDiscouragedWhenCandidateHasAny || []
          );
          if (!scenarioAllows && !candidateHasAllowingConcept) return false;
        }
      }
    }

    if (issue.primary === "charter_detention") {
      const hasDetentionCore = /\b(detention|detained|arbitrary|grant|s\.?\s*9|section\s*9|arrest\w*)\b/.test(summary);
      const hasImpairedOnly = /\b(impaired|breath|breathalyzer|drunk\s*driving|over\s*80|checkstop|roadside)\b/.test(summary);
      if (!hasDetentionCore) return false;
      if (!scenarioHasImpairedSignal && hasImpairedOnly && !/\b(s\.?\s*9|arbitrary|grant)\b/.test(summary)) return false;
    }

    if (issue.primary === "impaired_driving") {
      const hasImpairedCore = /\b(impaired|breath|breathalyzer|drunk\s*driving|over\s*80|checkstop|roadside|refus\w*)\b/.test(summary);
      const hasTrafficDetentionCore = /\b(detention|detained|s\.?\s*9|grant|reasonable\s+suspicion|motor\s+vehicle\s+stop|checkpoint|checkstop)\b/.test(summary);
      const hasCounselCore = /\b(counsel|lawyer|10\(b\)|10\s*b|informational\s+duty)\b/.test(summary);
      const hasDetentionOrSearchCore = /\b(detention|detained|s\.?\s*9|grant|search|seizure|warrant|reasonable)\b/.test(summary);
      if (!hasImpairedCore && !hasTrafficDetentionCore) return false;
      if (!scenarioHasCounselSignal && hasCounselCore && !hasDetentionOrSearchCore) return false;
    }

    if (issue.primary === "charter_counsel") {
      return /\b(counsel|lawyer|10\(b\)|10\s*b|woods|suberu)\b/.test(summary);
    }
    if (issue.primary === "assault_bodily_harm") {
      const scenarioHasSelfDefenceSignal = /\b(self\s*-?defence|self defense)\b/.test(scenarioNorm);
      const hasAssaultCore = /\bassault\b/.test(summary);
      const hasBodilyHarmSignal = /\b(bodily\s+harm|injur\w*|wound\w*|s\.?\s*267)\b/.test(summary);
      const hasSelfDefenceOnlySignal = /\b(self\s*-?defence|self defense)\b/.test(summary) && !hasBodilyHarmSignal;
      if (!hasAssaultCore) return false;
      if (hasSelfDefenceOnlySignal && !scenarioHasSelfDefenceSignal) return false;
      return (hasBodilyHarmSignal || (scenarioHasSelfDefenceSignal && hasSelfDefenceOnlySignal)) && !/\b(sexual\s+assault|consent|complainant|s\.?\s*271)\b/.test(summary);
    }
    if (issue.primary === "assault_weapon") {
      return /\b(weapon|knife|firearm|stab|s\.?\s*267|assault)\b/.test(summary) && !/\b(sexual\s+assault|consent|complainant|s\.?\s*271)\b/.test(summary);
    }
    if (issue.primary === "domestic_assault") {
      return /\b(domestic|spouse|partner|family|intimate|assault|violence)\b/.test(summary);
    }
    return true;
  });

  if (issue.allowed.size === 0) {
    return {
      candidates: issueStrictFiltered,
      dropCount: Math.max(0, (candidates || []).length - issueStrictFiltered.length),
      fallbackUsed: false,
      issue,
    };
  }

  const filtered = issueStrictFiltered.map((c) => {
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
      compatibilityAdjustment: Number(c?.compatibilityAdjustment) || 0,
    };
  }).filter(Boolean);

  // Avoid hard-empty results when term matching is overly strict for a scenario.
  if (filtered.length > 0) {
    return {
      candidates: filtered,
      dropCount: Math.max(0, issueStrictFiltered.length - filtered.length) + Math.max(0, (candidates || []).length - issueStrictFiltered.length),
      fallbackUsed: false,
      issue,
    };
  }

  // Controlled expansion pass: widen terms, but still require a semantic match and some scenario overlap.
  const expandedTermSet = new Set([
    ...issue.allowed,
    ...inferFallbackIssueSignals(scenarioTokens),
    ...issueExpansionHints(issue.primary),
  ]);

  const expandedTerms = [...expandedTermSet].filter(Boolean);
  const expanded = issueStrictFiltered
    .map((candidate) => {
      const summary = normalizeForMatch(`${candidate.title || ""} ${candidate.summary || ""}`);
      const semanticMatches = expandedTerms.filter((sub) => termMatchesText(sub, summary));
      if (semanticMatches.length === 0) return null;

      let tokenOverlap = 0;
      for (const token of scenarioTokens) {
        if (summary.includes(token)) tokenOverlap += 1;
      }
      if (tokenOverlap === 0 && semanticMatches.length < 2) return null;

      const dedupedMatches = dedupeStrings(semanticMatches).slice(0, 3);
      const semanticTag = `Semantic-expanded: ${issue.primary} (${dedupedMatches.join(", ")})`;
      const mergedMatchedTerm = candidate.matchedTerm
        ? `${candidate.matchedTerm}; ${semanticTag}`
        : semanticTag;

      return {
        ...candidate,
        semanticMatches: dedupedMatches,
        matchedTerm: mergedMatchedTerm,
        compatibilityAdjustment: Number(candidate?.compatibilityAdjustment) || 0,
      };
    })
    .filter(Boolean);

  if (expanded.length > 0) {
    return {
      candidates: expanded,
      dropCount: Math.max(0, issueStrictFiltered.length - expanded.length) + Math.max(0, (candidates || []).length - issueStrictFiltered.length),
      fallbackUsed: true,
      issue,
    };
  }

  return {
    candidates: [],
    dropCount: Math.max(0, (candidates || []).length),
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
  if (isClearlyNonCriminalScenario(scenario)) return [];

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

    const candidateDomains = detectCandidateDomains({
      citation: entry.citation,
      title: entry.title,
      summary: `${entry.ratio || ""} ${(entry.tags || []).join(" ")} ${(entry.topics || []).join(" ")}`,
    });
    const compatibilityAdjustment = compatibilityAdjustmentForIssue(issue.primary, candidateDomains);
    score += compatibilityAdjustment;

    // For specific issues, require at least one issue-term hit; token overlap alone is too noisy.
    if (issue.primary !== "general_criminal" && issueHits === 0) continue;

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
      retrievalReasons: [
        "local_fallback",
        `overlap:${overlap}`,
        `issue_hits:${issueHits}`,
        `compat:${compatibilityAdjustment}`,
      ],
    });
  }

  if (scored.length === 0) {
    // Prefer no case-law result over an unrelated broad landmark when there is no strong issue signal.
    if (issue.primary === "general_criminal") return [];

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
  const narrowTrafficIssue = new Set(["minor_traffic_stop"]);
  const strictScoreThreshold = narrowTrafficIssue.has(issuePrimary) ? 16 : broadIssue.has(issuePrimary) ? 12 : 10;
  const strictSemanticThreshold = narrowTrafficIssue.has(issuePrimary) ? 2 : broadIssue.has(issuePrimary) ? 1 : 2;
  const moderateScoreThreshold = narrowTrafficIssue.has(issuePrimary) ? 14 : broadIssue.has(issuePrimary) ? 9 : 8;

  const strict = sorted.filter((item) => {
    const score = Number(item?.retrievalScore) || 0;
    const semanticCount = Array.isArray(item?.semanticMatches) ? item.semanticMatches.length : 0;
    const retrievalReasons = Array.isArray(item?.retrievalReasons) ? item.retrievalReasons : [];
    const isBroadLandmark =
      String(item?.matchedTerm || "").includes("Landmark RAG Match") ||
      retrievalReasons.includes("landmark_seed");
    if (item?.isLandmark && isBroadLandmark) {
      return score >= strictScoreThreshold && (semanticCount >= strictSemanticThreshold || score >= strictScoreThreshold + 2);
    }
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

function determineFallbackTriggerReason({
  aiCandidatesParsed = 0,
  semanticFilteredCount = 0,
  verificationRequested = 0,
  verificationSucceeded = 0,
  landmarkDirectMatches = 0,
  selectedBeforeFallback = 0,
}) {
  if (aiCandidatesParsed === 0) return "no_ai_citations";
  if (semanticFilteredCount === 0) return "semantic_filter_dropped_all";
  if (verificationRequested > 0 && verificationSucceeded === 0 && landmarkDirectMatches === 0) {
    return "verification_failed_all";
  }
  if (selectedBeforeFallback === 0) return "unknown";
  return null;
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
    push(
      "R v Grant reasonable suspicion",
      "motor vehicle stop Charter",
      "checkstop Charter section 9",
      "R. v. Woods 2005 SCC 42 right to counsel breath demand",
      "roadside detention right to call lawyer"
    );
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
        issuePrimary: detectCoreIssue(scenario).primary,
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
  const detectedIssue = detectCoreIssue(scenario);
  let localFallbackUsed = false;
  const prefilterDiagnostics = {
    totalAiCandidatesParsed: 0,
    passed: 0,
    passedByTokenOverlap: 0,
    passedByConceptOverlap: 0,
    passedByConceptRescue: 0,
    rejected: 0,
    reasonCounts: {
      token_overlap_failed: 0,
      concept_overlap_failed: 0,
      both_failed: 0,
    },
  };

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
      prefilterDiagnostics.totalAiCandidatesParsed += 1;
    }
    
    // Apply pre-verify semantic gate: filter AI citations by scenario relevance
    // Candidate passes when there is either lexical or concept overlap.
    const scenarioTokens = tokenizeScenario(scenario);
    const scenarioConcepts = extractLegalConcepts(scenario);
    
    const filtered = [];
    for (const candidate of aiCitationCandidates) {
      if (scenarioTokens.size === 0) {
        filtered.push(candidate);
        prefilterDiagnostics.passed += 1;
        prefilterDiagnostics.passedByTokenOverlap += 1;
        continue;
      }

      const candSummary = `${candidate.title || ""} ${candidate.summary || ""}`.toLowerCase();
      let overlapCount = 0;
      for (const token of scenarioTokens) {
        if (candSummary.includes(token)) overlapCount++;
      }

      const candidateConcepts = extractLegalConcepts(candSummary);
      const conceptOverlap = countConceptOverlap(scenarioConcepts, candidateConcepts);

      const meetsTokenThreshold = overlapCount >= 1;
      const meetsConceptThreshold = conceptOverlap >= 2;

      if (!meetsTokenThreshold) prefilterDiagnostics.reasonCounts.token_overlap_failed += 1;
      if (!meetsConceptThreshold) prefilterDiagnostics.reasonCounts.concept_overlap_failed += 1;

      if (meetsTokenThreshold || meetsConceptThreshold) {
        prefilterDiagnostics.passed += 1;
        if (meetsTokenThreshold) prefilterDiagnostics.passedByTokenOverlap += 1;
        if (meetsConceptThreshold) prefilterDiagnostics.passedByConceptOverlap += 1;
        if (!meetsTokenThreshold && meetsConceptThreshold) {
          prefilterDiagnostics.passedByConceptRescue += 1;
        }
        filtered.push({
          ...candidate,
          prefilterSignal: meetsTokenThreshold ? "token_overlap" : "concept_overlap",
        });
      } else {
        prefilterDiagnostics.rejected += 1;
        prefilterDiagnostics.reasonCounts.both_failed += 1;
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
        issuePrimary: detectedIssue.primary,
        termsTried: terms.length,
        databasesTried: dbTargets.length,
        searchCalls: 0,
        candidateCount: 0,
        verificationCalls: 0,
        verifiedCount: 0,
        relevanceScoreAvg: null,
        fallbackPathUsed: localFallbackUsed,
        fallbackReason: localFallbackUsed ? "local_fallback" : null,
        prefilterDiagnostics,
        fallbackDiagnostics: {
          aiCandidatesParsed: prefilterDiagnostics.totalAiCandidatesParsed,
          semanticFilteredCount: 0,
          verificationRequested: 0,
          verificationSucceeded: 0,
          landmarkDirectMatches: 0,
          selectedBeforeFallback: 0,
          fallbackRequired: localFallbackUsed,
          fallbackTriggerReason: localFallbackUsed ? "no_ai_citations" : null,
        },
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
  const selectedBeforeFallbackCount = selectedCandidates.length;

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

  const fallbackTriggerReason = fallbackReason
    ? determineFallbackTriggerReason({
        aiCandidatesParsed: prefilterDiagnostics.totalAiCandidatesParsed,
        semanticFilteredCount: semanticFiltered.length,
        verificationRequested: toVerify.length,
        verificationSucceeded: verifiedCases.length,
        landmarkDirectMatches: landmarkResults.length,
        selectedBeforeFallback: selectedBeforeFallbackCount,
      })
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
      issuePrimary: semanticFilter?.issue?.primary || detectedIssue.primary || "general_criminal",
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
      prefilterDiagnostics,
      fallbackDiagnostics: {
        aiCandidatesParsed: prefilterDiagnostics.totalAiCandidatesParsed,
        semanticFilteredCount: semanticFiltered.length,
        verificationRequested: toVerify.length,
        verificationSucceeded: verifiedCases.length,
        landmarkDirectMatches: landmarkResults.length,
        selectedBeforeFallback: selectedBeforeFallbackCount,
        fallbackRequired: Boolean(fallbackReason),
        fallbackTriggerReason,
      },
      retrievalPass,
      semanticFilterDropCount: semanticFilter.dropCount,
      candidateSourceMix,
      reason: cases.length > 0 ? "verified_results" : "no_verified",
    },
  };
}
