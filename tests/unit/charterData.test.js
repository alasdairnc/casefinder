import { describe, it, expect } from "vitest";
import {
  normalizeCharterSection,
  lookupCharterSection,
  CHARTER_SECTIONS,
} from "../../src/lib/charterData.js";

describe("normalizeCharterSection", () => {
  it("strips 's. ' prefix", () => {
    expect(normalizeCharterSection("s. 7")).toBe("7");
  });

  it("strips 'section ' prefix", () => {
    expect(normalizeCharterSection("section 11")).toBe("11");
  });

  it("strips full Charter prefix", () => {
    expect(
      normalizeCharterSection("Canadian Charter of Rights and Freedoms, s. 8"),
    ).toBe("8");
  });

  it("passes through subsection format like '11(b)'", () => {
    expect(normalizeCharterSection("s. 11(b)")).toBe("11(b)");
  });

  it("returns null for null input", () => {
    expect(normalizeCharterSection(null)).toBeNull();
  });
});

describe("lookupCharterSection", () => {
  it("returns entry for section 7", () => {
    const entry = lookupCharterSection("s. 7");
    expect(entry).not.toBeNull();
    expect(entry.title).toContain("Life");
    expect(entry).toHaveProperty("part");
    expect(entry).toHaveProperty("url");
  });

  it("returns entry for section 2(b)", () => {
    const entry = lookupCharterSection("s. 2(b)");
    expect(entry).not.toBeNull();
    expect(entry.title).toContain("expression");
  });

  it("returns null for unknown section", () => {
    expect(lookupCharterSection("s. 999")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(lookupCharterSection("")).toBeNull();
  });

  it("handles full Charter prefix format", () => {
    const entry = lookupCharterSection("Charter s. 8");
    expect(entry).not.toBeNull();
  });
});

describe("CHARTER_SECTIONS", () => {
  it("is a Map with entries", () => {
    expect(CHARTER_SECTIONS).toBeInstanceOf(Map);
    expect(CHARTER_SECTIONS.size).toBeGreaterThan(10);
  });

  it("each entry has title, part, and url", () => {
    for (const [, entry] of CHARTER_SECTIONS) {
      expect(typeof entry.title).toBe("string");
      expect(typeof entry.part).toBe("string");
      expect(typeof entry.url).toBe("string");
    }
  });
});
