export const MAX_CASE_LAW_REPORT_NOTE_LENGTH = 300;
export const MAX_CASE_LAW_REPORT_SCENARIO_SNIPPET_LENGTH = 280;
export const MAX_CASE_LAW_REPORT_SUMMARY_LENGTH = 300;

export const CASE_LAW_REPORT_REASONS = [
  {
    value: "not_relevant_to_facts",
    label: "Not relevant to the facts",
  },
  {
    value: "too_broad_or_generic",
    label: "Too broad or generic",
  },
  {
    value: "wrong_legal_issue",
    label: "Wrong legal issue",
  },
  {
    value: "wrong_jurisdiction_or_court",
    label: "Wrong jurisdiction or court",
  },
  {
    value: "duplicate_of_another_result",
    label: "Duplicate of another result",
  },
  {
    value: "other",
    label: "Other",
  },
];

export const CASE_LAW_REPORT_REASON_VALUES = CASE_LAW_REPORT_REASONS.map(
  (reason) => reason.value,
);

export const CASE_LAW_REPORT_REASON_SET = new Set(
  CASE_LAW_REPORT_REASON_VALUES,
);
