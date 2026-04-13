// Shared text utilities for retrieval and ranking pipelines.

export const RANK_STOP_WORDS = new Set([
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
]);

export const SIMPLE_STOP_WORDS = new Set([
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

const BASE_ALIASES = {
  searched: ["search"],
  searching: ["search"],
  searches: ["search"],
  seized: ["seize", "seizure"],
  seizing: ["seize", "seizure"],
  seizes: ["seize", "seizure"],
  seizure: ["seize", "seizure"],
  detained: ["detain", "detention"],
  detaining: ["detain", "detention"],
  detains: ["detain", "detention"],
  warrants: ["warrant"],
  warranted: ["warrant"],
};

const DELAY_ALIASES = {
  delayed: ["delay"],
  delaying: ["delay"],
  delays: ["delay"],
  adjourned: ["adjournment"],
  adjourning: ["adjournment"],
  postponed: ["postpone"],
  postponing: ["postpone"],
  backlogged: ["backlog"],
  backlogging: ["backlog"],
};

export function normalizeForMatch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/section\s+/g, "s ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeWithExpansion(
  text,
  {
    stopWords = new Set(),
    minLength = 3,
    returnType = "array",
    includeDelayAliases = false,
  } = {},
) {
  const rawTokens = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= minLength && !stopWords.has(w));

  const expanded = new Set();
  const aliases = includeDelayAliases
    ? { ...BASE_ALIASES, ...DELAY_ALIASES }
    : BASE_ALIASES;

  for (const token of rawTokens) {
    expanded.add(token);

    if (token.endsWith("ies") && token.length > 4)
      expanded.add(`${token.slice(0, -3)}y`);
    if (token.endsWith("ied") && token.length > 4)
      expanded.add(`${token.slice(0, -3)}y`);
    if (token.endsWith("ed") && token.length > 4)
      expanded.add(token.slice(0, -2));
    if (token.endsWith("ing") && token.length > 5)
      expanded.add(token.slice(0, -3));
    if (token.endsWith("es") && token.length > 4)
      expanded.add(token.slice(0, -2));
    if (token.endsWith("s") && token.length > 4)
      expanded.add(token.slice(0, -1));

    const aliasList = aliases[token];
    if (Array.isArray(aliasList)) {
      for (const alias of aliasList) expanded.add(alias);
    }
  }

  return returnType === "set" ? expanded : Array.from(expanded);
}
