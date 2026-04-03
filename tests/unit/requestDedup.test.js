import { describe, expect, it, vi } from "vitest";

import { withRequestDedup } from "../../api/_requestDedup.js";

describe("withRequestDedup", () => {
  it("executes work once for concurrent calls with the same key", async () => {
    const work = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { ok: true };
    });

    const [a, b, c] = await Promise.all([
      withRequestDedup("same-key", work),
      withRequestDedup("same-key", work),
      withRequestDedup("same-key", work),
    ]);

    expect(work).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(c).toEqual({ ok: true });
  });

  it("runs work separately for different keys", async () => {
    const work = vi.fn(async (value) => value);

    const [a, b] = await Promise.all([
      withRequestDedup("key-a", () => work("a")),
      withRequestDedup("key-b", () => work("b")),
    ]);

    expect(work).toHaveBeenCalledTimes(2);
    expect(a).toBe("a");
    expect(b).toBe("b");
  });

  it("clears inflight entries after rejection", async () => {
    const failing = vi.fn(async () => {
      throw new Error("boom");
    });
    const succeeding = vi.fn(async () => "ok");

    await expect(withRequestDedup("retry-key", failing)).rejects.toThrow("boom");

    const result = await withRequestDedup("retry-key", succeeding);
    expect(result).toBe("ok");
    expect(failing).toHaveBeenCalledTimes(1);
    expect(succeeding).toHaveBeenCalledTimes(1);
  });
});
