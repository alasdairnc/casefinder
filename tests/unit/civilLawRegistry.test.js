import { describe, expect, it } from "vitest";

import { createCivilLawRegistry } from "../../src/lib/civilLawRegistry.js";

describe("createCivilLawRegistry", () => {
  const sampleMap = new Map([
    ["4", { title: "Possession" }],
    ["5", { title: "Trafficking" }],
  ]);

  const registry = createCivilLawRegistry({
    indexSources: [{ prefix: "CDSA", map: sampleMap }],
    aliases: [
      { pattern: /controlled drugs/i, prefix: "CDSA", map: sampleMap },
      { pattern: /\bCDSA\b/i, prefix: "CDSA", map: sampleMap },
    ],
  });

  it("builds index entries using configured prefixes", () => {
    expect(registry.index.get("CDSA s. 4")).toEqual({ title: "Possession" });
    expect(registry.index.get("CDSA s. 5")).toEqual({ title: "Trafficking" });
  });

  it("resolves statute aliases and section extraction", () => {
    const found = registry.lookup("Controlled Drugs and Substances Act s. 4");
    expect(found).toEqual({ entry: { title: "Possession" }, prefix: "CDSA" });
  });

  it("falls back from subsection to base section", () => {
    const found = registry.lookup("CDSA s. 4(1)");
    expect(found).toEqual({ entry: { title: "Possession" }, prefix: "CDSA" });
  });

  it("returns null when citation cannot be matched", () => {
    expect(registry.lookup("Unrelated Act s. 9")).toBeNull();
  });
});
