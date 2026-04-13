import { normalizeForMatch } from "./_textUtils.js";

const CONCEPT_PATTERNS = {
  charter: /\bcharter\b/,
  detention: /\b(detention|detained|detain\w*|arrest\w*|arbitrary)\b/,
  s9: /\b(s\.?\s*9|section\s*9|grant)\b/,
  counsel: /\b(counsel|lawyer|right\s+to\s+counsel|informational\s+duty)\b/,
  s10b: /\b(s\.?\s*10\s*\(?b\)?|10\(b\)|section\s*10\(b\))\b/,
  search: /\b(search|searched|seizure|seized|warrant|privacy|digital|phone)\b/,
  s8: /\b(s\.?\s*8|section\s*8|hunter|marakah|vu)\b/,
  impaired:
    /\b(impaired|drunk|breath|breathalyzer|breath\s+demand|over\s*80|roadside|checkstop|ride|refus\w*)\b/,
  trafficStop:
    /\b(traffic\s+stop|pulled\s+over|motor\s+vehicle|checkpoint|checkstop|roadside)\b/,
  robbery: /\b(robbery|robbed|mugging|mugged|s\.?\s*343|threat|force)\b/,
  theft: /\b(theft|stolen|steal\w*|shoplift\w*|s\.?\s*322|dishonesty)\b/,
  assault:
    /\b(assault|bodily\s+harm|weapon|s\.?\s*267|self\s*-?defence|punch\w*|hit|struck|fight|injur\w*|wound\w*)\b/,
  sexualAssault: /\b(sexual\s+assault|consent|complainant|s\.?\s*271)\b/,
  drug: /\b(cdsa|drug|traffick\w*|fentanyl|cocaine|possession|s\.?\s*5)\b/,
  trialDelay:
    /\b(jordan|cody|11\(b\)|s\.?\s*11\(b\)|trial\s+delay|reasonable\s+time|adjourn\w*)\b/,
};

function toSet(values) {
  return values instanceof Set ? values : new Set(values || []);
}

export function extractLegalConcepts(text) {
  const normalized = normalizeForMatch(text || "");
  const out = new Set();
  for (const [name, pattern] of Object.entries(CONCEPT_PATTERNS)) {
    if (pattern.test(normalized)) out.add(name);
  }
  return out;
}

export function countConceptOverlap(left, right) {
  const a = toSet(left);
  const b = toSet(right);
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const concept of a) {
    if (b.has(concept)) overlap += 1;
  }
  return overlap;
}

export function hasAnyConcept(concepts, required = []) {
  const conceptSet = toSet(concepts);
  for (const concept of required) {
    if (conceptSet.has(concept)) return true;
  }
  return false;
}

export function missingRequiredConceptBuckets(concepts, buckets = []) {
  const conceptSet = toSet(concepts);
  if (!Array.isArray(buckets) || buckets.length === 0) return false;
  for (const bucket of buckets) {
    const options = Array.isArray(bucket) ? bucket : [bucket];
    let matched = false;
    for (const option of options) {
      if (conceptSet.has(option)) {
        matched = true;
        break;
      }
    }
    if (!matched) return true;
  }
  return false;
}
