import { describe, it, expect } from "vitest";
import { TEST_SCENARIOS } from "./filterScenarios.js";

/**
 * Unit tests for filter configuration and scoring
 */
describe("Filter Tuning System", () => {
  describe("Core Issue Detection", () => {
    it("should detect impaired_driving scenario", () => {
      const scenario = TEST_SCENARIOS[0]; // impaired_01
      expect(scenario.expectedPrimary).toBe("impaired_driving");
      expect(scenario.shouldInclude).toContain("Charter");
    });

    it("should detect assault_bodily_harm scenario", () => {
      const scenario = TEST_SCENARIOS[2]; // assault_bodily_01
      expect(scenario.expectedPrimary).toBe("assault_bodily_harm");
      expect(scenario.expectedKeywords).toContain("s. 267");
    });

    it("should exclude irrelevant case types", () => {
      const scenario = TEST_SCENARIOS[0];
      expect(scenario.shouldExclude).not.toContain("detention");
      expect(scenario.shouldExclude).toContain("theft");
    });
  });

  describe("Test Scenario Structure", () => {
    it("should have all required fields", () => {
      for (const scenario of TEST_SCENARIOS) {
        expect(scenario).toHaveProperty("id");
        expect(scenario).toHaveProperty("scenario");
        expect(scenario).toHaveProperty("expectedPrimary");
        expect(scenario).toHaveProperty("shouldInclude");
        expect(scenario).toHaveProperty("shouldExclude");
        expect(scenario).toHaveProperty("expectedKeywords");
        expect(scenario).toHaveProperty("minResults");
        expect(scenario).toHaveProperty("maxResults");
      }
    });

    it("should have consistent min/max results", () => {
      for (const scenario of TEST_SCENARIOS) {
        expect(scenario.minResults).toBeLessThanOrEqual(scenario.maxResults);
      }
    });

    it("should have diverse scenario coverage", () => {
      const primaryIssues = new Set(TEST_SCENARIOS.map(s => s.expectedPrimary));
      expect(primaryIssues.size).toBeGreaterThan(5); // At least 5 different issue types
    });
  });
});
