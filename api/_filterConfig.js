/**
 * Centralized filter configuration for case law retrieval.
 * Tunable parameters for semantic filtering, ranking, and issue detection.
 * All thresholds can be adjusted here without code changes.
 */

export const FILTER_CONFIG = {
  // ── Pre-verify semantic gate ──────────────────────────────────────────────
  // Minimum scenario token overlap required for AI citations to enter verification
  ai_citation_min_token_overlap: 2,

  // ── Final selection gate ──────────────────────────────────────────────────
  // Minimum scenario token overlap for cases in final result set
  final_case_min_token_overlap: 3,

  // ── Stop words (low-signal tokens removed from tokenization) ───────────────
  stop_words: new Set([
    // Common English
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "into",
    "were",
    "was",
    "when",
    "where",
    "while",
    "have",
    "has",
    "had",
    "over",
    "under",
    "they",
    "their",
    "them",
    "than",
    "then",
    "been",
    "about",
    "would",
    "could",
    "should",
    "after",
    "before",
    "because",
    "through",
    "between",
    // Legal / domain noise
    "driver",
    "person",
    "police",
    "case",
    "law",
    "court",
    "officer",
    "crown",
    "defendant",
    "accused",
    "facts",
    "held",
    "found",
    "order",
    "section",
    "said",
    "made",
    "day",
    "time",
    "year",
    "called",
    "also",
    "may",
    "does",
    "even",
  ]),

  // ── Core issue detection patterns ─────────────────────────────────────────
  // Regex tests identify scenario category; sub_issues filter results
  issue_patterns: {
    impaired_motor: {
      tests: [
        /\\b(impaired|ride|drunk|over\\s*80|breathalyzer)\\b/,
        /\\b(motor|vehicle|drive|driving|stopped)\\b/,
      ],
      primary: "impaired_driving",
      sub_issues: [
        "charter",
        "s. 9",
        "s. 8",
        "detention",
        "search",
        "stop",
        "breath",
        "roadside",
        "grant",
        "reasonable suspension",
      ],
    },
    assault_bodily_harm: {
      tests: [/\\bassault\\b/, /\\b(bodily|harm|injury|wound|injur)\\b/],
      primary: "assault_bodily_harm",
      sub_issues: [
        "bodily harm",
        "s. 267",
        "intent",
        "recklessness",
        "consent",
        "self-defence",
      ],
    },
    assault_weapon: {
      tests: [/\\bassault\\b/, /\\b(weapon|knife|gun|firearm|club|stab)\\b/],
      primary: "assault_with_weapon",
      sub_issues: ["weapon", "s. 267", "intent", "self-defence", "deadly"],
    },
    sexual_assault: {
      tests: [
        /\\bsexual\\b/,
        /\\b(assault|attack|touch|intercourse|coerce|consent)\\b/,
      ],
      primary: "sexual_assault",
      sub_issues: ["s. 271", "consent", "s. 273", "complainant", "credibility"],
    },
    drug_trafficking: {
      tests: [
        /\\b(drug|narcotic|cocaine|fentanyl|cannabis|marijuana)\\b/,
        /\\b(traffick|sell|distribut|deal)\\b/,
      ],
      primary: "drug_trafficking",
      sub_issues: [
        "cdsa",
        "s. 5",
        "trafficking",
        "possession",
        "schedule",
        "intent",
      ],
    },
    charter_detention: {
      tests: [/\\bcharter\\b/, /\\b(detain|arrest|arbitrary)\\b/],
      primary: "charter_detention",
      sub_issues: ["s. 9", "detention", "arbitrary", "grant", "reasonable"],
    },
    charter_counsel: {
      tests: [
        /\\b(right\\s+to)?\\s*counsel\\b|\\blawyer\\b/,
        /\\b(detain|arrest)\\b/,
      ],
      primary: "charter_counsel",
      sub_issues: [
        "s. 10",
        "right to counsel",
        "informational",
        "detention",
        "waiver",
      ],
    },
    robbery: {
      tests: [/\\brobbery\\b/],
      primary: "robbery",
      sub_issues: ["robbery", "s. 343", "violence", "threat", "force"],
    },
    theft: {
      tests: [/\\b(theft|steal|stolen)\\b/],
      primary: "theft",
      sub_issues: ["theft", "s. 322", "dishonesty", "consent"],
    },
  },

  // ── Ranking boost weights ─────────────────────────────────────────────────
  // Points added to scoring based on case metadata
  ranking_boost: {
    scc_case: 1.5, // Supreme Court boost
    onca_case: 1, // Ontario Court of Appeal
    recent_case: 0.4, // Post-2000 cases
    landmark_match: 8, // Local landmark RAG match

    // Issue-specific boosts (within scenario detection)
    impaired_charter_mention: 2,
    assault_bodily_harm_mention: 3,
    drug_trafficking_mention: 3,
    consent_mention: 3,
  },

  // ── Token overlap scoring ─────────────────────────────────────────────────
  // Points per overlapping token in ranking function
  base_points_per_token: 4,

  // ── Max results to return ────────────────────────────────────────────────
  max_results_default: 3,

  // ── Relevance scoring defaults (override via env for calibration) ───────
  relevance_min_score: 4,
  relevance_min_token_overlap: 2,
  relevance_min_concept_overlap: 1,
};

export const FALLBACK_ISSUE_SIGNAL_RULES = [
  {
    tokens: [
      "drug",
      "cocaine",
      "fentanyl",
      "trafficking",
      "possession",
      "narcotic",
    ],
    signals: ["cdsa", "s. 5", "trafficking", "possession", "intent"],
  },
  {
    tokens: [
      "charter",
      "arrest",
      "arrested",
      "detained",
      "detention",
      "warrant",
      "police",
    ],
    signals: ["charter", "s. 9", "detention", "arbitrary", "reasonable"],
  },
  {
    tokens: ["lawyer", "counsel"],
    signals: [
      "s. 10",
      "s. 10(b)",
      "right to counsel",
      "informational",
      "detention",
      "waiver",
      "woods",
    ],
  },
  {
    tokens: [
      "search",
      "searched",
      "searching",
      "seizure",
      "seized",
      "warrant",
      "warrantless",
      "privacy",
      "phone",
      "device",
      "records",
      "text",
      "computer",
      "digital",
    ],
    signals: ["charter", "s. 8", "search", "seizure", "warrant", "privacy"],
  },
  {
    tokens: ["weapon", "knife", "stabbed", "stab", "gun", "firearm"],
    signals: ["weapon", "s. 267", "intent", "dangerous", "self-defence"],
  },
  {
    tokens: ["spouse", "domestic", "partner", "family"],
    signals: ["domestic", "intimate partner", "assault", "s. 266", "s. 267"],
  },
  {
    tokens: [
      "threat",
      "threats",
      "uttering",
      "harass",
      "harassment",
      "stalk",
      "stalking",
      "message",
      "messages",
      "text",
    ],
    signals: [
      "uttering threats",
      "criminal harassment",
      "s. 264",
      "s. 264.1",
      "repeated communication",
    ],
  },
  {
    tokens: [
      "dangerous",
      "careless",
      "speed",
      "racing",
      "stunt",
      "driving",
      "drive",
    ],
    signals: [
      "dangerous driving",
      "s. 320.13",
      "criminal negligence",
      "motor vehicle",
    ],
  },
  {
    tokens: ["peace", "bond", "recognizance", "810"],
    signals: ["peace bond", "recognizance", "s. 810"],
  },
  {
    tokens: ["break", "enter", "broke", "burglar", "house", "dwelling", "home"],
    signals: ["break and enter", "s. 348", "dwelling house", "intent"],
  },
  {
    tokens: [
      "robbery",
      "robbed",
      "mugged",
      "mugging",
      "theft",
      "stolen",
      "steal",
      "shoplift",
      "shoplifting",
    ],
    signals: [
      "robbery",
      "theft",
      "s. 343",
      "s. 322",
      "dishonesty",
      "without consent",
      "force",
      "threat",
      "stolen",
    ],
  },
];

export const ISSUE_DOMAIN_RULES = {
  charter_detention: {
    requiredConceptBuckets: [["detention", "s9"]],
    discouragedConcepts: ["impaired"],
    allowDiscouragedWhenScenarioHas: ["impaired"],
  },
  impaired_driving: {
    requiredConceptBuckets: [["impaired", "trafficStop", "detention", "s9"]],
    discouragedConcepts: ["counsel", "s10b"],
    allowDiscouragedWhenScenarioHas: ["counsel", "s10b"],
    allowDiscouragedWhenCandidateHasAny: ["detention", "s9", "search", "s8"],
  },
  charter_counsel: {
    requiredConceptBuckets: [["counsel", "s10b"]],
  },
  charter_search_seizure: {
    requiredConceptBuckets: [["search", "s8"]],
  },
  robbery: {
    requiredConceptBuckets: [["robbery", "theft"]],
  },
  theft: {
    requiredConceptBuckets: [["theft", "robbery"]],
  },
  drug_trafficking: {
    requiredConceptBuckets: [["drug"]],
  },
  sexual_assault: {
    requiredConceptBuckets: [["sexualAssault"]],
  },
  trial_delay: {
    requiredConceptBuckets: [["trialDelay"]],
  },
};

/**
 * Get current config value (enables runtime overrides via env vars in future)
 */
export function getConfig(key, defaultValue = null) {
  return FILTER_CONFIG[key] ?? defaultValue;
}

/**
 * Update filter config (for runtime tuning/testing)
 */
export function updateConfig(overrides = {}) {
  Object.assign(FILTER_CONFIG, overrides);
}

/**
 * Reset to defaults
 */
export function resetConfig() {
  // Re-export original values if needed
  // For now, this is a no-op since FILTER_CONFIG is the source of truth
}
