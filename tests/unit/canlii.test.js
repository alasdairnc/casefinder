import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseCitation,
  buildCaseId,
  buildApiUrl,
  buildCaseUrl,
  buildSearchUrl,
  partiesMatch,
  lookupCase,
} from "../../src/lib/canlii.js";

// ---------------------------------------------------------------------------
// parseCitation
// ---------------------------------------------------------------------------
describe("parseCitation", () => {
  it("returns null for null input", () => {
    expect(parseCitation(null)).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(parseCitation(123)).toBeNull();
    expect(parseCitation({})).toBeNull();
  });

  it("returns null for garbage string", () => {
    expect(parseCitation("not a citation")).toBeNull();
  });

  describe("neutral citation (standard)", () => {
    it("parses bare neutral citation without parties", () => {
      const result = parseCitation("2016 SCC 27");
      expect(result).toMatchObject({
        parties: null,
        year: "2016",
        courtCode: "SCC",
        number: "27",
        isLegacy: false,
      });
      expect(result.apiDbId).toBe("csc-scc");
      expect(result.webDbId).toBe("ca/scc");
    });

    it("parses neutral citation with parties", () => {
      const result = parseCitation("R v Jordan, 2016 SCC 27");
      expect(result).toMatchObject({
        parties: "R v Jordan",
        year: "2016",
        courtCode: "SCC",
        number: "27",
        isLegacy: false,
      });
    });

    it("parses ONCA citation", () => {
      const result = parseCitation("R v Smith, 2020 ONCA 123");
      expect(result).toMatchObject({
        courtCode: "ONCA",
        apiDbId: "onca",
        webDbId: "on/onca",
        isLegacy: false,
      });
    });

    it("returns null apiDbId for unknown court", () => {
      const result = parseCitation("2020 ZZZZ 99");
      expect(result).not.toBeNull();
      expect(result.apiDbId).toBeNull();
      expect(result.webDbId).toBeNull();
    });
  });

  describe("CanLII neutral citation", () => {
    it("parses bare CanLII neutral citation", () => {
      const result = parseCitation("1988 CanLII 90 (SCC)");
      expect(result).toMatchObject({
        parties: null,
        year: "1988",
        courtCode: "SCC",
        number: "90",
        isLegacy: true,
      });
    });

    it("parses CanLII neutral with parties", () => {
      const result = parseCitation("R v Oakes, 1988 CanLII 90 (SCC)");
      expect(result).toMatchObject({
        parties: "R v Oakes",
        year: "1988",
        courtCode: "SCC",
        number: "90",
        isLegacy: true,
      });
    });
  });

  describe("SCR legacy citation", () => {
    it("parses SCR citation", () => {
      const result = parseCitation("R v Oakes, [1986] 1 SCR 103");
      expect(result).toMatchObject({
        parties: "R v Oakes",
        year: "1986",
        courtCode: "SCC",
        number: null,
        apiDbId: "csc-scc",
        webDbId: "ca/scc",
        isLegacy: true,
      });
    });
  });
});

// ---------------------------------------------------------------------------
// buildCaseId
// ---------------------------------------------------------------------------
describe("buildCaseId", () => {
  it("builds standard neutral case ID", () => {
    expect(buildCaseId({ year: "2016", courtCode: "SCC", number: "27", isLegacy: false }))
      .toBe("2016scc27");
  });

  it("builds legacy CanLII case ID", () => {
    expect(buildCaseId({ year: "1988", courtCode: "SCC", number: "90", isLegacy: true }))
      .toBe("1988canlii90");
  });

  it("returns null when number is missing for non-legacy", () => {
    expect(buildCaseId({ year: "2020", courtCode: "SCC", number: null, isLegacy: false }))
      .toBeNull();
  });

  it("returns null when year is missing", () => {
    expect(buildCaseId({ year: null, courtCode: "SCC", number: "27", isLegacy: false }))
      .toBeNull();
  });

  it("lowercases the court code in the ID", () => {
    expect(buildCaseId({ year: "2020", courtCode: "ONCA", number: "123", isLegacy: false }))
      .toBe("2020onca123");
  });
});

// ---------------------------------------------------------------------------
// buildApiUrl / buildCaseUrl / buildSearchUrl
// ---------------------------------------------------------------------------
describe("buildApiUrl", () => {
  it("builds correct URL structure", () => {
    const url = buildApiUrl("csc-scc", "2016scc27", "mykey");
    expect(url).toContain("api.canlii.org/v1/caseBrowse/en/csc-scc/2016scc27");
    expect(url).toContain("api_key=mykey");
  });

  it("URL-encodes special characters in API key", () => {
    const url = buildApiUrl("csc-scc", "2016scc27", "key with spaces");
    expect(url).toContain("key%20with%20spaces");
  });
});

describe("buildCaseUrl", () => {
  it("builds correct web URL", () => {
    const url = buildCaseUrl("ca/scc", "2016", "2016scc27");
    expect(url).toBe("https://www.canlii.org/en/ca/scc/doc/2016/2016scc27/2016scc27.html");
  });
});

describe("buildSearchUrl", () => {
  it("builds correct search URL", () => {
    const url = buildSearchUrl("R v Jordan");
    expect(url).toContain("canlii.org/en/#search/text=");
    expect(url).toContain(encodeURIComponent("R v Jordan"));
  });

  it("encodes special characters", () => {
    const url = buildSearchUrl("R v Smith & Jones");
    expect(url).toContain(encodeURIComponent("R v Smith & Jones"));
  });
});

// ---------------------------------------------------------------------------
// partiesMatch
// ---------------------------------------------------------------------------
describe("partiesMatch", () => {
  it("returns true when submittedParties is null (can't verify)", () => {
    expect(partiesMatch(null, "R v Jordan")).toBe(true);
  });

  it("returns false when canliiTitle is null", () => {
    expect(partiesMatch("R v Jordan", null)).toBe(false);
  });

  it("returns true when a meaningful token matches", () => {
    expect(partiesMatch("R v Jordan", "R v Jordan")).toBe(true);
  });

  it("returns true for partial match on one token", () => {
    expect(partiesMatch("R v Jordan", "Jordan v Canada (Attorney General)")).toBe(true);
  });

  it("returns false when no meaningful tokens match", () => {
    expect(partiesMatch("R v Smith", "H.M.B. Holdings Ltd v Canada")).toBe(false);
  });

  it("ignores stop words like r, v, the", () => {
    // Only stop words — treated as if no submitted tokens, passes through
    expect(partiesMatch("R v The", "Some Unrelated Case")).toBe(true);
  });

  it("returns true for case-insensitive match", () => {
    expect(partiesMatch("R v JORDAN", "R v jordan 2016")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// lookupCase (mocked fetch)
// ---------------------------------------------------------------------------
describe("lookupCase", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns unparseable for garbage citation", async () => {
    const result = await lookupCase("not a citation", "mykey");
    expect(result.status).toBe("unparseable");
    expect(result.searchUrl).toContain("canlii.org");
  });

  it("returns unknown_court for unrecognized court code", async () => {
    const result = await lookupCase("2020 ZZZZ 99", "mykey");
    expect(result.status).toBe("unknown_court");
  });

  it("returns unverified with URL when no API key", async () => {
    const result = await lookupCase("2016 SCC 27", null);
    expect(result.status).toBe("unverified");
    expect(result.url).toContain("canlii.org");
  });

  it("returns not_found when API responds 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 404, ok: false }));
    const result = await lookupCase("2016 SCC 27", "mykey");
    expect(result.status).toBe("not_found");
  });

  it("returns error when API responds with non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 500, ok: false }));
    const result = await lookupCase("2016 SCC 27", "mykey");
    expect(result.status).toBe("error");
  });

  it("returns verified when API confirms case and parties match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ title: "R v Jordan" }),
    }));
    const result = await lookupCase("R v Jordan, 2016 SCC 27", "mykey");
    expect(result.status).toBe("verified");
    expect(result.url).toContain("canlii.org");
    expect(result.title).toBe("R v Jordan");
  });

  it("returns not_found when API title does not match submitted parties", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ title: "H.M.B. Holdings Ltd v Canada" }),
    }));
    const result = await lookupCase("R v Smith, 2016 SCC 27", "mykey");
    expect(result.status).toBe("not_found");
  });

  it("returns error when fetch throws (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await lookupCase("2016 SCC 27", "mykey");
    expect(result.status).toBe("error");
  });
});
