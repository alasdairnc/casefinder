function normalizeScenarioText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CLASSIFICATION_RULES = [
  {
    classId: "trial_delay",
    pattern:
      /\b(delay|delayed|adjourned|adjournment|crown\s+delay|11\s*b|trial)\b/,
    labels: [
      "R v Jordan 2016 SCC 27",
      "R v Cody 2017 SCC 31",
      "Charter section 11(b)",
    ],
  },
  {
    classId: "break_enter",
    pattern:
      /\b(broke\s+into|break\s+in|break\s+and\s+enter|burglary|home\s+invasion)\b/,
    labels: ["break and enter Criminal Code section 348", "dwelling house"],
  },
  {
    classId: "mischief",
    pattern: /\b(scratch|scratched|vandal|damage|mischief)\b/,
    labels: ["mischief Criminal Code section 430", "property damage"],
  },
  {
    classId: "charter_detention",
    pattern: /\b(detain|detention|arrest|charter|search|seizure)\b/,
    labels: [
      "R v Grant 2009 SCC 32",
      "Charter section 9",
      "Charter section 8",
    ],
  },
];

function getRuleByClassId(classId) {
  return CLASSIFICATION_RULES.find((rule) => rule.classId === classId) || null;
}

export function classifyScenarioText(value) {
  const normalized = normalizeScenarioText(value);
  if (!normalized) {
    return { classId: "unknown", labels: [] };
  }

  for (const rule of CLASSIFICATION_RULES) {
    if (rule.pattern.test(normalized)) {
      return { classId: rule.classId, labels: rule.labels };
    }
  }

  return {
    classId: "general_criminal",
    labels: ["criminal code", "canadian criminal case law"],
  };
}

export function getScenarioClassLabels(classId) {
  if (typeof classId !== "string" || !classId.trim()) return [];
  const rule = getRuleByClassId(classId.trim());
  if (rule) return [...rule.labels];
  if (classId === "general_criminal") {
    return ["criminal code", "canadian criminal case law"];
  }
  return [];
}
