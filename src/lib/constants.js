export const jurisdictions = [
  { value: "all", label: "All Jurisdictions" },
  { value: "Ontario", label: "Ontario" },
  { value: "British Columbia", label: "British Columbia" },
  { value: "Alberta", label: "Alberta" },
  { value: "Quebec", label: "Quebec" },
  { value: "Manitoba", label: "Manitoba" },
  { value: "Saskatchewan", label: "Saskatchewan" },
  { value: "Nova Scotia", label: "Nova Scotia" },
  { value: "New Brunswick", label: "New Brunswick" },
  { value: "Newfoundland and Labrador", label: "Newfoundland & Lab." },
  { value: "Prince Edward Island", label: "PEI" },
  { value: "Yukon", label: "Yukon" },
  { value: "Northwest Territories", label: "NWT" },
  { value: "Nunavut", label: "Nunavut" },
];

export const courtLevels = [
  { value: "all", label: "All Courts" },
  { value: "scc", label: "Supreme Court" },
  { value: "appeal", label: "Court of Appeal" },
  { value: "superior", label: "Superior Court" },
  { value: "provincial", label: "Provincial Court" },
];

export const dateRanges = [
  { value: "all", label: "Any Date" },
  { value: "5", label: "Last 5 Years" },
  { value: "10", label: "Last 10 Years" },
  { value: "20", label: "Last 20 Years" },
];

export const lawTypeOptions = [
  { key: "criminal_code", label: "Criminal Code" },
  { key: "case_law", label: "Case Law" },
  { key: "civil_law", label: "Civil Law" },
  { key: "charter", label: "Charter Rights" },
];

export const defaultLawTypes = {
  criminal_code: true,
  case_law: true,
  civil_law: true,
  charter: true,
};
