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
      "https://www.canlii.org/en/ca/scc/doc/2016/2016scc27/2016scc27.html"
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
    expect(["local_fallback", "post_verify_local_fallback"]).toContain(meta.fallbackReason);
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
    expect(cases.some((c) => String(c.citation || "").includes("Jordan"))).toBe(true);
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
      cases.some((c) => /Hunter|Grant|Marakah|Vu/.test(String(c.citation || "")))
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
    expect(["landmark_seed", "local_fallback", "semantic_fallback", "semantic_primary"]).toContain(
      meta.retrievalPass
    );
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
    expect(cases.some((c) => /Oakes/.test(String(c.citation || "")))).toBe(false);
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
    expect(cases.some((c) => /Oakes/.test(String(c.citation || "")))).toBe(false);
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
    expect(cases.some((c) => /Oakes/.test(String(c.citation || "")))).toBe(false);
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
          String((c.summary || "") + (c.title || ""))
        )
      )
    ).toBe(true);
  });
});
