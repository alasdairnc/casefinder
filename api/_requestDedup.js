// Simple in-memory in-flight request deduplication for serverless invocations.
// Keyed by request fingerprint to avoid duplicate upstream calls for identical concurrent requests.

const inflight = new Map();

export async function withRequestDedup(key, work) {
  if (!key || typeof work !== "function") {
    return work();
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = Promise.resolve()
    .then(() => work())
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
