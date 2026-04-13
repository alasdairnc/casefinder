import { afterEach, describe, expect, it, vi } from "vitest";

import { retrieveVerifiedCaseLaw } from "../../api/_caseLawRetrieval.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("retrieveVerifiedCaseLaw landmark URL handling", () => {
  it("uses CanLII search URL for pre-2000 landmark citations", async () => {
    const { cases } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "oakes section 1 proportionality test charter justification",
      landmarkMatches: [
        {
          citation: "R v Oakes, 1986 CanLII 46 (SCC)",
          title: "R v Oakes",
          ratio: "section 1 proportionality test",
        },
      ],
      maxResults: 10,
    });

    expect(cases.length).toBeGreaterThan(0);
    const pre2000 = cases.find((c) => /19\d{2}/.test(String(c.citation || "")));
    expect(pre2000).toBeTruthy();
    expect(pre2000.url_canlii).toContain("/en/#search/text=");
  });

  it("uses direct CanLII case URL for post-2000 landmark citations", async () => {
    const { cases } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "trial delay",
      landmarkMatches: [
        {
          citation: "R v Jordan, 2016 SCC 27",
          title: "R v Jordan",
          ratio: "section 11(b) ceilings",
        },
      ],
      maxResults: 3,
    });

    expect(cases.length).toBeGreaterThan(0);
    const jordan = cases.find((c) => c.citation === "R v Jordan, 2016 SCC 27");
    expect(jordan).toBeTruthy();
    expect(jordan.url_canlii).toBe(
      "https://www.canlii.org/en/ca/scc/doc/2016/2016scc27/2016scc27.html",
    );
  });

  it("returns verified CanLII case title for non-landmark retrieval", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ title: "R v Jordan" }),
    });

    const { cases } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      aiCaseLaw: [
        {
          citation: "2016 SCC 27",
          summary: "Delay ceiling analysis.",
        },
      ],
      maxResults: 3,
    });

    expect(cases).toHaveLength(1);
    expect(cases[0].citation).toBe("2016 SCC 27");
    expect(cases[0].title).toBe("R v Jordan");
  });

  it("uses post-verification local fallback when AI citations do not verify", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({}),
    });

    const { cases, meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario:
        "A person broke into a residential home at night through a back window and stole jewelry and electronics.",
      aiCaseLaw: [
        {
          citation: "2024 SCC 999",
          summary: "invalid citation should force fallback",
        },
      ],
      maxResults: 3,
    });

    expect(cases.length).toBeGreaterThan(0);
    expect(meta.fallbackPathUsed).toBe(true);
    expect(["local_fallback", "post_verify_local_fallback"]).toContain(
      meta.fallbackReason,
    );
  });

  it("seeds Jordan for trial-delay scenarios without explicit AI citations", async () => {
    const { cases, meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "my trial was delayed 2 years by the Crown",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(cases.length).toBeGreaterThan(0);
    expect(cases.some((c) => String(c.citation || "").includes("Jordan"))).toBe(
      true,
    );
    expect(meta.retrievalPass).toBe("landmark_seed");
  });

  it("seeds search-and-seizure landmarks for warrant scenarios without explicit AI citations", async () => {
    const { cases, meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "police searched my phone without a warrant",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(cases.length).toBeGreaterThan(0);
    expect(
      cases.some((c) =>
        /Hunter|Grant|Marakah|Vu/.test(String(c.citation || "")),
      ),
    ).toBe(true);
    expect(meta.retrievalPass).toBe("landmark_seed");
  });

  it("returns retrievalPass metadata for observability", async () => {
    const { meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "R v Jordan delay application",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(typeof meta.retrievalPass).toBe("string");
    expect([
      "landmark_seed",
      "local_fallback",
      "semantic_fallback",
      "semantic_primary",
    ]).toContain(meta.retrievalPass);
  });

  it("classifies minor traffic stop scenarios and avoids broad case-law fallbacks", async () => {
    const { MASTER_CASE_LAW_DB } =
      await import("../../src/lib/caselaw/index.js");
    const originalCases = [...MASTER_CASE_LAW_DB];
    MASTER_CASE_LAW_DB.length = 0;

    try {
      const { cases, meta } = await retrieveVerifiedCaseLaw({
        apiKey: "test-key",
        scenario: "I was pulled over for going 1 km/h over the speed limit",
        aiCaseLaw: [],
        landmarkMatches: [],
        maxResults: 3,
      });

      expect(cases).toEqual([]);
      expect(meta.issuePrimary).toBe("minor_traffic_stop");
      expect(meta.reason).toBe("no_verified");
      expect(meta.fallbackReason).toBeNull();
    } finally {
      MASTER_CASE_LAW_DB.splice(0, MASTER_CASE_LAW_DB.length, ...originalCases);
    }
  });

  it("prefers non-Oakes candidates for right-to-counsel detention scenarios", async () => {
    const { cases } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "i was arrested and not told i could call a lawyer",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(cases.length).toBeGreaterThan(0);
    expect(cases.some((c) => /Oakes/.test(String(c.citation || "")))).toBe(
      false,
    );
  });

  it("returns threat/harassment-relevant cases without generic Charter fallback", async () => {
    const { cases } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "uttering threats over text messages",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(cases.length).toBeGreaterThan(0);
    expect(cases.some((c) => /Oakes/.test(String(c.citation || "")))).toBe(
      false,
    );
  });

  it("returns dangerous-driving-relevant fallback without Oakes noise", async () => {
    const { cases } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "dangerous driving charge after high speed pursuit",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(cases.length).toBeGreaterThan(0);
    expect(cases.some((c) => /Oakes/.test(String(c.citation || "")))).toBe(
      false,
    );
  });

  it("rescues AI citations via concept overlap when token overlap is zero", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ title: "R v Suberu" }),
    });

    const { cases, meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "I was arrested and could not call my lawyer",
      aiCaseLaw: [
        {
          citation: "2009 SCC 33",
          summary: "Informational duty after detention under section 10(b).",
        },
      ],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(cases.length).toBeGreaterThan(0);
    expect(meta.prefilterDiagnostics.passedByConceptRescue).toBeGreaterThan(0);
    expect(
      meta.prefilterDiagnostics.reasonCounts.token_overlap_failed,
    ).toBeGreaterThan(0);
  });

  it("reports no_ai_citations fallback trigger reason", async () => {
    const { meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "A person broke into a home and stole electronics at night.",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(meta.fallbackPathUsed).toBe(true);
    expect(meta.fallbackDiagnostics.fallbackTriggerReason).toBe(
      "no_ai_citations",
    );
  });

  it("captures semantic-filter drop diagnostics when candidates are incompatible", async () => {
    const { MASTER_CASE_LAW_DB } =
      await import("../../src/lib/caselaw/index.js");
    const originalCases = [...MASTER_CASE_LAW_DB];
    MASTER_CASE_LAW_DB.length = 0;

    try {
      const { meta } = await retrieveVerifiedCaseLaw({
        apiKey: "test-key",
        scenario: "I was pulled over for going 1 km/h over the speed limit",
        aiCaseLaw: [
          {
            citation: "2016 SCC 27",
            summary: "Copyright royalties and digital distribution rights",
          },
        ],
        landmarkMatches: [],
        maxResults: 3,
      });

      expect(meta.prefilterDiagnostics.totalAiCandidatesParsed).toBeGreaterThan(
        0,
      );
      expect(meta.prefilterDiagnostics.rejected).toBeGreaterThan(0);
      expect(meta.fallbackDiagnostics.semanticFilteredCount).toBe(0);
    } finally {
      MASTER_CASE_LAW_DB.splice(0, MASTER_CASE_LAW_DB.length, ...originalCases);
    }
  });

  it("reports verification_failed_all fallback trigger reason", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({}),
    });

    const { meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario:
        "Someone repeatedly texted me threats and said they would hurt me",
      aiCaseLaw: [
        {
          citation: "2016 SCC 27",
          summary: "Uttering threats analysis under section 264.1",
        },
      ],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(meta.fallbackPathUsed).toBe(true);
    expect(meta.fallbackDiagnostics.fallbackTriggerReason).toBe(
      "verification_failed_all",
    );
  });

  it("classifies breath-demand roadside scenario as impaired_driving", async () => {
    const { meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario:
        "I was pulled over at a checkpoint and given a breathalyzer demand",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(meta.issuePrimary).toBe("impaired_driving");
  });

  it("classifies peace bond scenarios using s. 810 signal", async () => {
    const { meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario:
        "I was served with a peace bond under s. 810 and told to sign recognizance terms",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });

    expect(meta.issuePrimary).toBe("peace_bond");
  });

  it("separates counsel and detention issue classification", async () => {
    const counselResult = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario: "I was arrested and repeatedly denied access to my lawyer",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });
    expect(counselResult.meta.issuePrimary).toBe("charter_counsel");

    const detentionResult = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario:
        "I was arbitrarily detained without clear grounds under Charter rights",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 3,
    });
    expect(detentionResult.meta.issuePrimary).toBe("charter_detention");
  });

  it("retrieves break-and-enter cases for break-in with theft scenario", async () => {
    const { cases, meta } = await retrieveVerifiedCaseLaw({
      apiKey: "test-key",
      scenario:
        "A person was found inside an occupied house at 2 a.m. with stolen electronics. The homeowner was home during the break-in and called 911.",
      aiCaseLaw: [],
      landmarkMatches: [],
      maxResults: 5,
    });

    expect(cases.length).toBeGreaterThan(0);
    // Verify semantic filtering isn't overly aggressive (should drop < 3 for initial candidates)
    expect(meta.semanticFilterDropCount).toBeLessThanOrEqual(2);
    // At least some cases should mention relevant keywords
    expect(
      cases.some((c) =>
        /break|enter|theft|stolen|home|house|intent|s\.|348|s\s+348/i.test(
          String((c.summary || "") + (c.title || "")),
        ),
      ),
    ).toBe(true);
  });
});
