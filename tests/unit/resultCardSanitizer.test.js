import { describe, it, expect } from "vitest";
import { sanitizeMatchedTextForDisplay } from "../../src/components/ResultCard.jsx";

describe("sanitizeMatchedTextForDisplay", () => {
  it("removes debug fragments split by pipes", () => {
    const raw = "Landmark Case Law Database | Semantic matches: charter, breath | token_overlap:5, issue:impaired_driving | court_level:scc";

    expect(sanitizeMatchedTextForDisplay(raw)).toBe("Landmark Case Law Database | Semantic matches: charter, breath");
  });

  it("strips known debug telemetry labels", () => {
    const raw = "Roadside ASD demand | Selection signals: breath, screen | Scenario terms: breath, refusal | overlap:4";

    expect(sanitizeMatchedTextForDisplay(raw)).toBe("Roadside ASD demand");
  });

  it("preserves normal explanatory text", () => {
    const raw = "s. 320.28(1)(a) - blood sample demand following arrest and refusal to provide breath sample";

    expect(sanitizeMatchedTextForDisplay(raw)).toBe(raw);
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeMatchedTextForDisplay("")).toBe("");
    expect(sanitizeMatchedTextForDisplay(null)).toBe("");
  });
});
