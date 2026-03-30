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
      scenario: "charter detention",
      landmarkMatches: [
        {
          citation: "R v Oakes, 1986 CanLII 46 (SCC)",
          title: "R v Oakes",
          ratio: "section 1 proportionality test",
        },
      ],
      maxResults: 3,
    });

    expect(cases).toHaveLength(1);
    expect(cases[0].citation).toBe("R v Oakes, 1986 CanLII 46 (SCC)");
    expect(cases[0].url_canlii).toContain("/en/#search/text=");
    expect(cases[0].url_canlii).toContain("R%20v%20Oakes%20R%20v%20Oakes%2C%201986%20CanLII%2046%20(SCC)");
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

    expect(cases).toHaveLength(1);
    expect(cases[0].citation).toBe("R v Jordan, 2016 SCC 27");
    expect(cases[0].url_canlii).toBe(
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
});
