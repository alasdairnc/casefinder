import { describe, expect, it } from "vitest";

import { findLandmarkSeeds } from "../../src/lib/landmarkCases.js";

describe("findLandmarkSeeds", () => {
  it("does not seed Oakes for generic Charter counsel scenarios", () => {
    const seeds = findLandmarkSeeds({
      scenario: "i was arrested and not told i could call a lawyer",
      terms: ["Charter section 10 right to counsel"],
      limit: 3,
    });

    const citations = seeds.map((s) => String(s.citation || ""));
    expect(citations.some((c) => c.includes("Oakes"))).toBe(false);
  });

  it("seeds Oakes when section 1 proportionality language appears", () => {
    const seeds = findLandmarkSeeds({
      scenario: "is this Charter limit saved by section 1 proportionality",
      terms: ["oakes test minimal impairment"],
      limit: 3,
    });

    const citations = seeds.map((s) => String(s.citation || ""));
    expect(citations.some((c) => c.includes("Oakes"))).toBe(true);
  });

  it("seeds Woods for right-to-counsel roadside scenarios", () => {
    const seeds = findLandmarkSeeds({
      scenario: "roadside stop and breath demand before speaking to lawyer",
      terms: ["right to counsel", "s. 10(b)", "breath demand"],
      limit: 3,
    });

    const citations = seeds.map((s) => String(s.citation || ""));
    expect(citations.some((c) => c.includes("Woods"))).toBe(true);
  });
});
