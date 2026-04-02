// src/lib/landmarkCases.js
// High-signal landmark case seeds used by retrieval fallback/query enrichment.

const LANDMARK_CASES = [
  {
    citation: "R v Jordan, 2016 SCC 27",
    title: "R v Jordan",
    summary:
      "Sets presumptive ceilings for trial delay under Charter s. 11(b) and provides the modern framework for delay applications.",
    topics: ["trial delay", "charter 11(b)", "crown delay", "reasonable time"],
  },
  {
    citation: "R v Cody, 2017 SCC 31",
    title: "R v Cody",
    summary:
      "Clarifies and applies Jordan, including treatment of defence conduct and institutional delay in s. 11(b) analysis.",
    topics: ["trial delay", "charter 11(b)", "institutional delay", "jordan framework"],
  },
  {
    citation: "R v Askov, [1990] 2 SCR 1199",
    title: "R v Askov",
    summary:
      "Foundational pre-Jordan delay case on Charter s. 11(b) rights and unreasonable trial delay.",
    topics: ["trial delay", "charter 11(b)", "unreasonable delay"],
  },
  {
    citation: "R v Grant, 2009 SCC 32",
    title: "R v Grant",
    summary:
      "Major Charter detention decision refining s. 9 analysis and exclusion of evidence framework.",
    topics: ["charter 9", "detention", "arbitrary detention", "exclusion of evidence"],
  },
  {
    citation: "R v Oakes, [1986] 1 SCR 103",
    title: "R v Oakes",
    summary:
      "Establishes the Oakes test for Charter s. 1 justification of rights limits.",
    topics: ["charter", "section 1", "oakes test", "proportionality"],
  },
  {
    citation: "Hunter v Southam Inc, [1984] 2 SCR 145",
    title: "Hunter v Southam Inc",
    summary:
      "Foundational s. 8 Charter case on unreasonable search and seizure.",
    topics: ["charter 8", "search", "seizure", "privacy"],
  },
  {
    citation: "R v Stinchcombe, [1991] 3 SCR 326",
    title: "R v Stinchcombe",
    summary:
      "Defines Crown disclosure obligations in criminal proceedings.",
    topics: ["disclosure", "crown", "criminal procedure"],
  },
  {
    citation: "R v Gladue, [1999] 1 SCR 688",
    title: "R v Gladue",
    summary:
      "Landmark sentencing case on consideration of Indigenous circumstances under s. 718.2(e).",
    topics: ["sentencing", "indigenous", "gladue", "criminal code 718.2(e)"],
  },
];

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLandmark(caseItem, haystack) {
  const text = norm([caseItem.title, caseItem.citation, caseItem.summary, ...(caseItem.topics || [])].join(" "));
  if (!text) return 0;

  let score = 0;
  if (haystack.includes(norm(caseItem.title))) score += 12;
  if (haystack.includes(norm(caseItem.citation))) score += 14;

  for (const topic of caseItem.topics || []) {
    const t = norm(topic);
    if (!t) continue;
    if (haystack.includes(t)) score += 4;
    const tokens = t.split(" ").filter(Boolean);
    if (tokens.length > 1 && tokens.every((tok) => haystack.includes(tok))) {
      score += 2;
    }
  }

  return score;
}

export function findLandmarkSeeds({ scenario = "", terms = [], limit = 3 } = {}) {
  const haystack = norm([scenario, ...(terms || [])].join(" "));
  if (!haystack) return [];

  const scored = LANDMARK_CASES.map((item) => ({ item, score: scoreLandmark(item, haystack) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit))
    .map((entry) => ({
      citation: entry.item.citation,
      title: entry.item.title,
      summary: entry.item.summary,
      matchedTerm: "Landmark seed",
      isLandmark: true,
      landmarkSeed: true,
      retrievalScore: 20 + entry.score,
      retrievalReasons: ["landmark_seed", `seed_score:${entry.score}`],
      semanticMatches: [],
      issueSignals: entry.item.topics.slice(0, 6),
      overlapTokens: [],
    }));

  return scored;
}

export { LANDMARK_CASES };
