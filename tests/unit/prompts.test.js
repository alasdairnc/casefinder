import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../../src/lib/prompts.js";

describe("buildSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildSystemPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("includes the CaseDive persona", () => {
    expect(buildSystemPrompt()).toContain("CaseDive");
  });

  it("includes the untrusted input warning", () => {
    expect(buildSystemPrompt()).toContain("<user_input>");
    expect(buildSystemPrompt()).toContain("UNTRUSTED");
  });

  it("instructs JSON-only response", () => {
    expect(buildSystemPrompt()).toContain("ONLY with a JSON object");
  });

  it("enforces structured canlii suggestion label requirements", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("label");
    expect(prompt).toContain("issue + statutory anchor");
    expect(prompt).toContain("charter detention - s. 9");
  });

  it("requires canlii term to include issue, statutory anchor, and doctrinal phrase", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("term");
    expect(prompt).toContain("issue phrase");
    expect(prompt).toContain("statutory anchor token");
    expect(prompt).toContain("doctrinal phrase");
    expect(prompt).toContain("reasonable grounds");
    expect(prompt).toContain("informational duty");
  });

  it("includes anti-noise examples for weak suggestion terms", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Avoid noisy/generic query fragments");
    expect(prompt).toContain("what are my rights");
    expect(prompt).toContain("criminal law case");
  });

  it("includes scenario-specific boolean templates for common categories", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Impaired driving");
    expect(prompt).toContain("Charter counsel");
    expect(prompt).toContain("Drug trafficking");
    expect(prompt).toContain("Assault with weapon");
    expect(prompt).toContain('"CDSA s. 5"');
    expect(prompt).toContain('"s. 267"');
  });

  // ── Jurisdiction filter ────────────────────────────────────────────────────

  it("injects known jurisdiction with court codes", () => {
    const prompt = buildSystemPrompt({ jurisdiction: "Ontario" });
    expect(prompt).toContain("Ontario");
    expect(prompt).toContain("ONCA");
    expect(prompt).toContain("ONSC");
  });

  it("injects jurisdiction without court codes for unknown province", () => {
    const prompt = buildSystemPrompt({ jurisdiction: "Yukon" });
    expect(prompt).toContain("Yukon");
    // Should not add court codes since it's not in the map
    expect(prompt).not.toContain("YKCA"); // not injected by prompts.js for Yukon (not in JURISDICTION_COURTS)
  });

  it("does not inject jurisdiction filter when value is 'all'", () => {
    const prompt = buildSystemPrompt({ jurisdiction: "all" });
    expect(prompt).not.toContain("Focus on cases from");
  });

  // ── Court level filter ─────────────────────────────────────────────────────

  it("injects court level for scc", () => {
    const prompt = buildSystemPrompt({ courtLevel: "scc" });
    expect(prompt).toContain("Supreme Court of Canada");
  });

  it("injects court level for appeal", () => {
    const prompt = buildSystemPrompt({ courtLevel: "appeal" });
    expect(prompt).toContain("Courts of Appeal");
  });

  it("does not inject court level filter when value is 'all'", () => {
    const prompt = buildSystemPrompt({ courtLevel: "all" });
    expect(prompt).not.toContain("Prioritize cases from");
  });

  // ── Date range filter ──────────────────────────────────────────────────────

  it("injects 5-year date range", () => {
    const prompt = buildSystemPrompt({ dateRange: "5" });
    expect(prompt).toContain("last 5 years");
  });

  it("injects 10-year date range", () => {
    const prompt = buildSystemPrompt({ dateRange: "10" });
    expect(prompt).toContain("last 10 years");
  });

  it("injects 20-year date range", () => {
    const prompt = buildSystemPrompt({ dateRange: "20" });
    expect(prompt).toContain("last 20 years");
  });

  it("does not inject date range for 'all'", () => {
    const prompt = buildSystemPrompt({ dateRange: "all" });
    expect(prompt).not.toContain("last");
  });

  // ── Law type filter ────────────────────────────────────────────────────────

  it("injects law type restrictions when some types are disabled", () => {
    const prompt = buildSystemPrompt({
      lawTypes: { criminal_code: true, case_law: false, civil_law: false, charter: true },
    });
    expect(prompt).toContain("Only include results for");
    expect(prompt).toContain("Criminal Code sections");
    expect(prompt).toContain("Charter rights implications");
    expect(prompt).toContain("case law");
    expect(prompt).toContain("civil law");
  });

  it("does not inject law type instructions when all types are enabled", () => {
    const prompt = buildSystemPrompt({
      lawTypes: { criminal_code: true, case_law: true, civil_law: true, charter: true },
    });
    expect(prompt).not.toContain("Only include results for");
  });

  it("does not inject law type instructions when lawTypes is absent", () => {
    const prompt = buildSystemPrompt({});
    expect(prompt).not.toContain("Only include results for");
  });

  // ── Combined filters ───────────────────────────────────────────────────────

  it("combines jurisdiction, court level, and date range", () => {
    const prompt = buildSystemPrompt({
      jurisdiction: "British Columbia",
      courtLevel: "appeal",
      dateRange: "10",
    });
    expect(prompt).toContain("British Columbia");
    expect(prompt).toContain("BCCA");
    expect(prompt).toContain("Courts of Appeal");
    expect(prompt).toContain("last 10 years");
  });
});
