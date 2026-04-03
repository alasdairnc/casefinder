import { afterEach, describe, expect, it, vi } from "vitest";

import { RETRIEVAL_FAILURE_SET } from "./retrievalFailureSet.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("retrieval failure set", () => {
  it("keeps the labeled false-positive scenarios empty and preserves the positive control", async () => {
    const { retrieveVerifiedCaseLaw } = await import("../../api/_caseLawRetrieval.js");
    const { MASTER_CASE_LAW_DB } = await import("../../src/lib/caselaw/index.js");
    const originalCases = [...MASTER_CASE_LAW_DB];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    MASTER_CASE_LAW_DB.length = 0;

    try {
      for (const testCase of RETRIEVAL_FAILURE_SET) {
        const { cases, meta } = await retrieveVerifiedCaseLaw({
          apiKey: "test-key",
          scenario: testCase.scenario,
          aiCaseLaw: [],
          landmarkMatches: testCase.landmarkMatches || [],
          maxResults: testCase.maxResults,
        });

        if ((testCase.maxResults || 0) === 0) {
          expect(cases).toEqual([]);
          expect(meta.reason).toBe("no_verified");
        } else {
          expect(cases.length).toBeGreaterThanOrEqual(testCase.minResults);
          const caseText = JSON.stringify(cases);
          for (const included of testCase.shouldInclude || []) {
            expect(caseText).toContain(included);
          }
        }

        for (const excluded of testCase.shouldExclude || []) {
          expect(JSON.stringify(cases)).not.toContain(excluded);
        }

        
      }
    } finally {
      MASTER_CASE_LAW_DB.splice(0, MASTER_CASE_LAW_DB.length, ...originalCases);
    }
  });
});