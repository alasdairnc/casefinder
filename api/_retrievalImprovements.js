// api/_retrievalImprovements.js
// Build lightweight, deterministic tuning suggestions from recent retrieval failures.

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyScenario(snippet) {
  const s = normalize(snippet);
  if (!s) return { classId: "unknown", labels: [] };

  if (/\b(delay|delayed|adjourned|adjournment|crown\s+delay|11\s*b|trial)\b/.test(s)) {
    return {
      classId: "trial_delay",
      labels: ["R v Jordan 2016 SCC 27", "R v Cody 2017 SCC 31", "Charter section 11(b)"],
    };
  }

  if (/\b(broke\s+into|break\s+in|break\s+and\s+enter|burglary|home\s+invasion)\b/.test(s)) {
    return {
      classId: "break_enter",
      labels: ["break and enter Criminal Code section 348", "dwelling house"],
    };
  }

  if (/\b(scratch|scratched|vandal|damage|mischief)\b/.test(s)) {
    return {
      classId: "mischief",
      labels: ["mischief Criminal Code section 430", "property damage"],
    };
  }

  if (/\b(detain|detention|arrest|charter|search|seizure)\b/.test(s)) {
    return {
      classId: "charter_detention",
      labels: ["R v Grant 2009 SCC 32", "Charter section 9", "Charter section 8"],
    };
  }

  return { classId: "general_criminal", labels: ["criminal code", "canadian criminal case law"] };
}

export function buildRetrievalImprovements(recentFailures = []) {
  if (!Array.isArray(recentFailures) || recentFailures.length === 0) {
    return [];
  }

  const grouped = new Map();
  for (const failure of recentFailures) {
    const scenarioSnippet = String(failure?.scenarioSnippet || "").trim();
    const key = scenarioSnippet || "(missing scenario)";
    const classification = classifyScenario(scenarioSnippet);

    if (!grouped.has(key)) {
      grouped.set(key, {
        scenarioSnippet: key,
        classId: classification.classId,
        count: 0,
        reasons: new Set(),
        suggestedTerms: new Set(classification.labels),
      });
    }

    const entry = grouped.get(key);
    entry.count += 1;
    if (failure?.reason) entry.reasons.add(String(failure.reason));
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((entry, idx) => ({
      id: `improve-${idx + 1}`,
      scenarioSnippet: entry.scenarioSnippet,
      classId: entry.classId,
      failureCount: entry.count,
      reasons: Array.from(entry.reasons),
      suggestedTerms: Array.from(entry.suggestedTerms).slice(0, 6),
      action: "tune_query_terms",
      confidence: entry.count >= 2 ? "high" : "medium",
    }));
}
