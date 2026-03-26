import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Redis so _retrievalHealthStore uses in-memory fallback
vi.mock("../..", () => ({}));
vi.mock("../../api/_rateLimit.js", () => ({ redis: null }));

const { getTrendlineSnapshots, recordRetrievalMetricsEvent } = await import("../../api/_retrievalHealthStore.js");

const BASE_NOW = 1_700_000_000_000;
const BUCKET_MS = 5 * 60 * 1000;
const BUCKETS = 15;

beforeEach(() => {
  // Clear in-memory events between tests by reimporting is not easy —
  // instead we test via nowMs offset so old events fall outside the window
});

describe("getTrendlineSnapshots", () => {
  it("returns exactly `buckets` entries", async () => {
    const result = await getTrendlineSnapshots({ nowMs: BASE_NOW, buckets: BUCKETS, bucketMs: BUCKET_MS });
    expect(result).toHaveLength(BUCKETS);
  });

  it("returns all-null rates when no events exist in window", async () => {
    const nowMs = BASE_NOW + 999_999_999; // far future — no events will match
    const result = await getTrendlineSnapshots({ nowMs, buckets: BUCKETS, bucketMs: BUCKET_MS });
    for (const bucket of result) {
      expect(bucket.errorRate).toBeNull();
      expect(bucket.noVerifiedRate).toBeNull();
      expect(bucket.avgLatencyMs).toBeNull();
    }
  });

  it("each entry has ts, errorRate, noVerifiedRate, avgLatencyMs keys", async () => {
    const result = await getTrendlineSnapshots({ nowMs: BASE_NOW, buckets: 3, bucketMs: BUCKET_MS });
    for (const bucket of result) {
      expect(bucket).toHaveProperty("ts");
      expect(bucket).toHaveProperty("errorRate");
      expect(bucket).toHaveProperty("noVerifiedRate");
      expect(bucket).toHaveProperty("avgLatencyMs");
    }
  });

  it("bucket ts values are spaced by bucketMs", async () => {
    const result = await getTrendlineSnapshots({ nowMs: BASE_NOW, buckets: 3, bucketMs: BUCKET_MS });
    expect(result[1].ts - result[0].ts).toBe(BUCKET_MS);
    expect(result[2].ts - result[1].ts).toBe(BUCKET_MS);
  });

  it("last bucket ts equals nowMs", async () => {
    const result = await getTrendlineSnapshots({ nowMs: BASE_NOW, buckets: BUCKETS, bucketMs: BUCKET_MS });
    expect(result[result.length - 1].ts).toBe(BASE_NOW);
  });
});
