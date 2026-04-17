const VALID_JURISDICTIONS = new Set([
  "all",
  "Ontario",
  "British Columbia",
  "Alberta",
  "Quebec",
  "Manitoba",
  "Saskatchewan",
  "Nova Scotia",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Prince Edward Island",
]);

const VALID_COURT_LEVELS = new Set([
  "all",
  "scc",
  "appeal",
  "superior",
  "provincial",
]);

const VALID_DATE_RANGES = new Set(["all", "5", "10", "20"]);
const VALID_LAW_TYPES = [
  "criminal_code",
  "case_law",
  "civil_law",
  "charter",
];

export function normalizeFilters(rawFilters = {}) {
  const rawLawTypes =
    rawFilters?.lawTypes && typeof rawFilters.lawTypes === "object"
      ? rawFilters.lawTypes
      : {};
  const lawTypes = {};

  for (const key of VALID_LAW_TYPES) {
    lawTypes[key] = rawLawTypes[key] === false ? false : true;
  }

  return {
    jurisdiction: VALID_JURISDICTIONS.has(rawFilters?.jurisdiction)
      ? rawFilters.jurisdiction
      : "all",
    courtLevel: VALID_COURT_LEVELS.has(rawFilters?.courtLevel)
      ? rawFilters.courtLevel
      : "all",
    dateRange: VALID_DATE_RANGES.has(rawFilters?.dateRange)
      ? rawFilters.dateRange
      : "all",
    lawTypes,
  };
}
