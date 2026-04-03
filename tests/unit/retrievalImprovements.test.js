import { describe, expect, it } from "vitest";

import { buildRetrievalImprovements } from "../../api/_retrievalImprovements.js";

describe("buildRetrievalImprovements", () => {
  it("classifies impaired driving failures with targeted terms", () => {
    const improvements = buildRetrievalImprovements([
      {
        reason: "no_verified",
        scenarioSnippet:
          "I was charged after a drunk driving stop and they said I refused a sample",
      },
    ]);

    expect(improvements).toHaveLength(1);
    expect(improvements[0].classId).toBe("impaired_driving");
    expect(
      improvements[0].suggestedTerms.some((t) =>
        t.includes("impaired driving"),
      ),
    ).toBe(true);
  });

  it("classifies trial delay failures with Jordan/Cody terms", () => {
    const improvements = buildRetrievalImprovements([
      {
        reason: "no_verified",
        scenarioSnippet: "my trial was delayed by the crown for over 2 years",
      },
    ]);

    expect(improvements).toHaveLength(1);
    expect(improvements[0].classId).toBe("trial_delay");
    expect(
      improvements[0].suggestedTerms.some((t) => t.includes("Jordan")),
    ).toBe(true);
  });

  it("aggregates repeated failures for same scenario", () => {
    const improvements = buildRetrievalImprovements([
      { reason: "no_verified", scenarioSnippet: "car was scratched" },
      { reason: "no_verified", scenarioSnippet: "car was scratched" },
    ]);

    expect(improvements).toHaveLength(1);
    expect(improvements[0].failureCount).toBe(2);
    expect(improvements[0].confidence).toBe("high");
  });

  it("classifies theft, assault, and drug scenarios", () => {
    const improvements = buildRetrievalImprovements([
      {
        reason: "no_verified",
        scenarioSnippet: "someone stole my bike and shoplifted from the store",
      },
      {
        reason: "no_verified",
        scenarioSnippet: "they punched me and caused bodily harm",
      },
      {
        reason: "no_verified",
        scenarioSnippet: "possession of cocaine and trafficking",
      },
    ]);

    expect(improvements.map((item) => item.classId)).toEqual(
      expect.arrayContaining(["theft", "assault", "drug_offence"]),
    );
  });
});
