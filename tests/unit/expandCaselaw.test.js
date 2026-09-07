import { describe, it, expect } from "vitest";
import {
  bucketVerdicts,
  extractCitations,
} from "../../scripts/expand-caselaw.js";
import { buildCitationIdentityKey } from "../../src/lib/canlii.js";

// The bucketing is the anti-fabrication core of the expansion agent: only
// CanLII-verified, not-yet-in-corpus cases may ever be proposed. These tests
// drive that logic with synthetic verdicts (no network / no API key needed),
// covering every bucket the live CanLII lookup can land a candidate in.
describe("expand-caselaw bucketVerdicts", () => {
  const corpus = new Set(
    ["2016 SCC 27"].map((c) => buildCitationIdentityKey(c)),
  );

  it("routes a verified, NOT-in-corpus case to proposals", () => {
    const { proposals, duplicates } = bucketVerdicts(
      [{ citation: "2021 SCC 43", status: "verified" }],
      corpus,
    );
    expect(proposals.map((p) => p.citation)).toContain("2021 SCC 43");
    expect(duplicates).toHaveLength(0);
  });

  it("routes a verified case ALREADY in the corpus to duplicates", () => {
    const { proposals, duplicates } = bucketVerdicts(
      [{ citation: "R v Jordan, 2016 SCC 27", status: "verified" }],
      corpus,
    );
    expect(duplicates).toHaveLength(1);
    expect(proposals).toHaveLength(0);
  });

  it("routes a not_found cite to rejected (fabrication signal)", () => {
    const { rejected, proposals, unresolved } = bucketVerdicts(
      [{ citation: "2019 SCC 9999", status: "not_found" }],
      corpus,
    );
    expect(rejected.map((r) => r.citation)).toContain("2019 SCC 9999");
    expect(proposals).toHaveLength(0);
    expect(unresolved).toHaveLength(0);
  });

  it("routes an un-API-verifiable legacy SCR cite to unresolved, NOT rejected", () => {
    // Legacy [YYYY] N SCR cites parse with no CanLII number and return
    // 'unverified' — they must never be labelled a fabrication.
    const { unresolved, rejected } = bucketVerdicts(
      [{ citation: "R v Askov, [1990] 2 SCR 1199", status: "unverified" }],
      corpus,
    );
    expect(unresolved).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("drops needs_key verdicts (never proposes without verification)", () => {
    const { proposals, rejected, unresolved, duplicates } = bucketVerdicts(
      [{ citation: "2021 SCC 43", status: "needs_key" }],
      corpus,
    );
    expect(proposals).toHaveLength(0);
    expect(rejected).toHaveLength(0);
    expect(unresolved).toHaveLength(0);
    expect(duplicates).toHaveLength(0);
  });
});

describe("expand-caselaw extractCitations", () => {
  it("pulls neutral and SCR citations out of free text", () => {
    const text =
      "See R v Jordan, 2016 SCC 27 and the older R v Askov, [1990] 2 SCR 1199.";
    const cites = extractCitations(text);
    expect(cites).toContain("2016 SCC 27");
    expect(cites.some((c) => /1990.*SCR/.test(c))).toBe(true);
  });

  it("returns nothing for text with no citations", () => {
    expect(extractCitations("no cases here")).toEqual([]);
    expect(extractCitations("")).toEqual([]);
  });
});
