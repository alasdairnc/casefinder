import { afterEach, describe, expect, it, vi } from "vitest";

import { findLandmarkSeeds } from "../../src/lib/landmarkCases.js";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

// Scenarios shaped to force the local issue fallback (no AI candidates, failing
// fetch, no inline landmark matches) so that cases added to MASTER_CASE_LAW_DB
// in the 2026-06 expansion are exercised. Without this, corpus additions are
// invisible to the existing retrievalFailureSet test, which empties the DB.
const FALLBACK_EXPECTATIONS = [
  {
    scenario:
      "Police walked into my backyard and detained me even though I was just talking with friends and doing nothing wrong.",
    expectCitation: "2019 SCC 34",
    label: "R. v. Le (s. 9 arbitrary detention)",
  },
  {
    scenario:
      "I am facing a three year mandatory minimum sentence for possessing a loaded prohibited firearm.",
    expectCitation: "2015 SCC 15",
    label: "R. v. Nur (s. 12 mandatory minimum)",
  },
  {
    scenario:
      "My ex sent me text messages threatening to kill me and beat me up badly.",
    expectCitation: "[1991] 3 SCR 72",
    label: "R. v. McCraw (uttering threats)",
  },
  {
    scenario:
      "The judge had to decide my credibility and whether my testimony left a reasonable doubt.",
    expectCitation: "[1991] 1 SCR 742",
    label: "R. v. W.(D.) (credibility / reasonable doubt)",
  },
  {
    scenario:
      "I drove the getaway car but I did not know my friends were going to hurt anyone.",
    expectCitation: "2010 SCC 13",
    label: "R. v. Briscoe (party liability / aiding)",
  },
  // Note: Antic (bail) and Roy (dangerous driving) are also landmark seeds, so
  // they surface via findLandmarkSeeds (covered in the seed describe block below)
  // rather than the corpus fallback, and carry the seed citation format.
];

describe("case-law corpus fallback (2026-06 expansion)", () => {
  it("surfaces newly added cases via the local issue fallback", async () => {
    const { retrieveVerifiedCaseLaw } =
      await import("../../api/_caseLawRetrieval.js");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    for (const { scenario, expectCitation, label } of FALLBACK_EXPECTATIONS) {
      const { cases } = await retrieveVerifiedCaseLaw({
        apiKey: "test-key",
        scenario,
        aiCaseLaw: [],
        landmarkMatches: [],
        maxResults: 3,
      });
      const citations = cases.map((c) => c.citation);
      expect(
        citations,
        `${label} should surface for: "${scenario}" — got ${JSON.stringify(citations)}`,
      ).toContain(expectCitation);
    }
  });

  it("includes the new verified cases in MASTER_CASE_LAW_DB with their real citations", async () => {
    const { MASTER_CASE_LAW_DB } =
      await import("../../src/lib/caselaw/index.js");
    const byTitle = Object.fromEntries(
      MASTER_CASE_LAW_DB.map((c) => [c.title, c.citation]),
    );

    expect(byTitle["R. v. Spencer"]).toBe("2014 SCC 43");
    expect(byTitle["R. v. Fearon"]).toBe("2014 SCC 77");
    expect(byTitle["R. v. Le"]).toBe("2019 SCC 34");
    expect(byTitle["R. v. McCraw"]).toBe("[1991] 3 SCR 72");
    expect(byTitle["R. v. W.(D.)"]).toBe("[1991] 1 SCR 742");
    expect(byTitle["R. v. Nur"]).toBe("2015 SCC 15");
    expect(byTitle["R. v. Martineau"]).toBe("[1990] 2 SCR 633");
    expect(byTitle["R. v. Creighton"]).toBe("[1993] 3 SCR 3");
    expect(byTitle["R. v. Oickle"]).toBe("2000 SCC 38");
    expect(byTitle["R. v. Briscoe"]).toBe("2010 SCC 13");
    expect(byTitle["R. v. Antic"]).toBe("2017 SCC 27");
    expect(byTitle["R. v. Roy"]).toBe("2012 SCC 26");
    expect(byTitle["R. v. Golden"]).toBe("2001 SCC 83");
    expect(byTitle["R. v. Sinclair"]).toBe("2010 SCC 35");
    expect(byTitle["R. v. Mack"]).toBe("[1988] 2 SCR 903");
    expect(byTitle["R. v. Hart"]).toBe("2014 SCC 52");
  });

  it("contains no fabricated pre-2000 'YYYY SCC N' neutral citations (integrity guard)", async () => {
    // SCC neutral citations did not exist before 2000; any pre-2000 'SCC' cite
    // is fabricated. This guards against re-introducing the defect fixed 2026-06.
    const { MASTER_CASE_LAW_DB } =
      await import("../../src/lib/caselaw/index.js");
    const fabricated = MASTER_CASE_LAW_DB.filter((c) =>
      /^19\d{2}\s+SCC\s+\d+$/.test(String(c.citation || "")),
    ).map((c) => `${c.title}: ${c.citation}`);

    expect(fabricated).toEqual([]);
  });
});

describe("digital-privacy landmark seeds (2026-06 expansion)", () => {
  const titlesFor = (scenario) =>
    findLandmarkSeeds({ scenario, terms: [], limit: 3 }).map((s) => s.title);

  it("surfaces Spencer for internet / IP / ISP subscriber scenarios", () => {
    const titles = titlesFor(
      "The police got my name and address from my internet service provider using my IP address without a warrant.",
    );
    expect(titles).toContain("R v Spencer");
  });

  it("surfaces Fearon for explicit cell-phone search scenarios", () => {
    const titles = titlesFor(
      "Police searched my cell phone without a warrant right after arresting me and read my text messages.",
    );
    expect(titles).toContain("R v Fearon");
  });

  it("does NOT fire the digital seeds on a bare 'phone' search (keeps Hunter as the s. 8 authority)", () => {
    const titles = titlesFor(
      "Police searched my phone without a warrant after they stopped me.",
    );
    expect(titles).not.toContain("R v Spencer");
    expect(titles).not.toContain("R v Fearon");
  });

  it("does NOT over-fire the digital seeds on a generic physical search", () => {
    const titles = titlesFor("Police searched my house without a warrant.");
    expect(titles).not.toContain("R v Spencer");
    expect(titles).not.toContain("R v Fearon");
  });

  it("surfaces Ewanchuk for sexual assault / consent scenarios", () => {
    const titles = titlesFor(
      "He sexually assaulted me at his apartment and then claimed I had consented.",
    );
    expect(titles).toContain("R v Ewanchuk");
  });

  it("surfaces Khill for self-defence scenarios", () => {
    const titles = titlesFor(
      "I shot an intruder in self defence when he came at me in my driveway at night.",
    );
    expect(titles).toContain("R v Khill");
  });

  it("does NOT fire the sexual-assault seed on a non-sexual consensual fight", () => {
    const titles = titlesFor(
      "We both agreed to a bare-knuckle fistfight and he got badly hurt.",
    );
    expect(titles).not.toContain("R v Ewanchuk");
  });

  it("surfaces Antic for bail scenarios", () => {
    const titles = titlesFor(
      "I was denied bail and the justice wants a large cash deposit before releasing me.",
    );
    expect(titles).toContain("R v Antic");
  });

  it("surfaces Roy for dangerous-driving scenarios", () => {
    const titles = titlesFor(
      "I was charged with dangerous driving causing death after a highway crash.",
    );
    expect(titles).toContain("R v Roy");
  });

  it("does NOT fire the dangerous-driving seed on an impaired-driving scenario", () => {
    const titles = titlesFor(
      "I was pulled over and charged with impaired driving over 80.",
    );
    expect(titles).not.toContain("R v Roy");
  });
});

describe("family-law expansion (2026-06)", () => {
  const FAMILY_SEEDS = ["Gordon v Goertz", "Moge v Moge", "Kerr v Baranow"];
  const titlesFor = (scenario) =>
    findLandmarkSeeds({ scenario, terms: [], limit: 3 }).map((s) => s.title);

  it("surfaces Gordon v Goertz for custody / relocation scenarios", () => {
    expect(
      titlesFor("We are in a custody battle over our kids and parenting time."),
    ).toContain("Gordon v Goertz");
    expect(
      titlesFor("I want to relocate with my child but my ex objects."),
    ).toContain("Gordon v Goertz");
  });

  it("surfaces Moge for spousal-support scenarios", () => {
    expect(
      titlesFor("I want spousal support after my divorce from a long marriage."),
    ).toContain("Moge v Moge");
  });

  it("surfaces Kerr v Baranow for common-law property scenarios", () => {
    expect(
      titlesFor(
        "My common law partner and I are dividing property; is there unjust enrichment?",
      ),
    ).toContain("Kerr v Baranow");
  });

  it("does NOT over-fire family seeds on criminal scenarios that share family vocabulary", () => {
    const criminalWithFamilyWords = [
      "I was held in custody by the police for several hours.",
      "I got a custodial sentence of two years in prison.",
      "They seized my property during the search of my house.",
      "He assaulted me and I want him charged with a crime.",
    ];
    for (const scenario of criminalWithFamilyWords) {
      const titles = titlesFor(scenario);
      for (const seed of FAMILY_SEEDS) {
        expect(
          titles,
          `family seed "${seed}" must not fire for: "${scenario}"`,
        ).not.toContain(seed);
      }
    }
  });

  it("includes the family cases in MASTER_CASE_LAW_DB with their real citations", async () => {
    const { MASTER_CASE_LAW_DB } =
      await import("../../src/lib/caselaw/index.js");
    const byTitle = Object.fromEntries(
      MASTER_CASE_LAW_DB.map((c) => [c.title, c.citation]),
    );
    expect(byTitle["Bracklow v. Bracklow"]).toBe("[1999] 1 SCR 420");
    expect(byTitle["Moge v. Moge"]).toBe("[1992] 3 SCR 813");
    expect(byTitle["Gordon v. Goertz"]).toBe("[1996] 2 SCR 27");
    expect(byTitle["Barendregt v. Grebliunas"]).toBe("2022 SCC 22");
    expect(byTitle["Kerr v. Baranow"]).toBe("2011 SCC 10");
    expect(byTitle["Pettkus v. Becker"]).toBe("[1980] 2 SCR 834");
  });

  it("has exactly one Moge entry after moving it from administrative.js to family.js", async () => {
    const { MASTER_CASE_LAW_DB } =
      await import("../../src/lib/caselaw/index.js");
    const moge = MASTER_CASE_LAW_DB.filter((c) => c.title === "Moge v. Moge");
    expect(moge.length).toBe(1);
  });

  it("classifies family scenarios and returns family cases (not criminal) from the fallback", async () => {
    const { retrieveVerifiedCaseLaw } =
      await import("../../api/_caseLawRetrieval.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    const expectations = [
      ["I want spousal support after my divorce.", "family_support"],
      [
        "We are in a custody battle over our kids and parenting time.",
        "family_custody",
      ],
      [
        "My common law partner and I are dividing property; is there unjust enrichment?",
        "family_property",
      ],
    ];
    for (const [scenario, expectedIssue] of expectations) {
      const { meta } = await retrieveVerifiedCaseLaw({
        apiKey: "test-key",
        scenario,
        aiCaseLaw: [],
        landmarkMatches: [],
        maxResults: 3,
      });
      expect(meta.issuePrimary, `issue for: "${scenario}"`).toBe(expectedIssue);
    }
  });

  it("does NOT leak family corpus cases into criminal/general results (reciprocal guard)", async () => {
    const { retrieveVerifiedCaseLaw } =
      await import("../../api/_caseLawRetrieval.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    const FAMILY_TITLES = [
      "Bracklow v. Bracklow",
      "Moge v. Moge",
      "Gordon v. Goertz",
      "Barendregt v. Grebliunas",
      "Kerr v. Baranow",
      "Pettkus v. Becker",
    ];
    const criminalWithFamilyWords = [
      "I am facing a child abuse charge.",
      "They seized my property during the search of my house.",
      "Someone stole my child's bike from our property.",
      "My spouse assaulted me and I want him charged.",
    ];
    for (const scenario of criminalWithFamilyWords) {
      const { cases } = await retrieveVerifiedCaseLaw({
        apiKey: "test-key",
        scenario,
        aiCaseLaw: [],
        landmarkMatches: [],
        maxResults: 3,
      });
      const titles = cases.map((c) => c.title);
      for (const fam of FAMILY_TITLES) {
        expect(
          titles,
          `family case "${fam}" must not leak for: "${scenario}"`,
        ).not.toContain(fam);
      }
    }
  });
});
