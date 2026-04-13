import { describe, expect, it } from "vitest";

import { __testables } from "../../api/analyze.js";

describe("selectTopRetrievedCases fallback", () => {
  it("keeps ranked candidates when strict overlap filter excludes all results", () => {
    const scenario = "i was hit over the back of the head with a baseball bat";
    const retrievedCases = [
      {
        citation: "R v Example, 2018 SCC 10",
        summary:
          "Assault causing bodily harm with a weapon and intent evidence.",
        matched_content: "Landmark RAG Match",
        year: 2018,
      },
      {
        citation: "R v Sample, 2011 SCC 5",
        summary:
          "Criminal assault facts with injuries and evidentiary analysis.",
        matched_content: "Landmark RAG Match",
        year: 2011,
      },
    ];

    const selected = __testables.selectTopRetrievedCases(
      scenario,
      retrievedCases,
      3,
    );

    expect(selected.length).toBeGreaterThan(0);
    expect(selected[0].citation).toBe("R v Example, 2018 SCC 10");
  });
});
