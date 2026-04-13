import { describe, expect, it, vi } from "vitest";

import { runCaseLawRetrieval } from "../../api/_retrievalOrchestrator.js";

describe("runCaseLawRetrieval", () => {
  it("delegates to retrieve function and returns result", async () => {
    const retrieveFn = vi.fn(async () => ({
      cases: [{ citation: "2016 SCC 27" }],
      meta: { reason: "verified_results" },
    }));

    const result = await runCaseLawRetrieval({
      scenario: "trial delay",
      filters: { lawTypes: { case_law: true } },
      apiKey: "test-key",
      retrieveFn,
    });

    expect(retrieveFn).toHaveBeenCalledTimes(1);
    expect(result.cases).toHaveLength(1);
    expect(result.meta.reason).toBe("verified_results");
  });

  it("throws timeout error with isTimeout=true when budget is exceeded", async () => {
    const retrieveFn = vi.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ cases: [], meta: {} }), 20),
        ),
    );

    await expect(
      runCaseLawRetrieval({
        scenario: "test",
        filters: {},
        apiKey: "test-key",
        timeoutMs: 1,
        retrieveFn,
      }),
    ).rejects.toMatchObject({ message: "Retrieval timeout", isTimeout: true });
  });
});
