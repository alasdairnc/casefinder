import { describe, it, expect } from "vitest";
import { isValidUrl } from "../../src/lib/validateUrl.js";

describe("isValidUrl", () => {
  it("accepts a valid canlii.org URL", () => {
    expect(
      isValidUrl(
        "https://www.canlii.org/en/ca/scc/doc/2016/2016scc27/2016scc27.html",
      ),
    ).toBe(true);
  });

  it("accepts a valid laws-lois.justice.gc.ca URL", () => {
    expect(
      isValidUrl(
        "https://laws-lois.justice.gc.ca/eng/acts/c-46/section-348.html",
      ),
    ).toBe(true);
  });

  it("rejects http (non-https) URLs", () => {
    expect(isValidUrl("http://www.canlii.org/en/ca/scc/")).toBe(false);
  });

  it("rejects an untrusted domain", () => {
    expect(isValidUrl("https://example.com/law")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidUrl(null)).toBe(false);
  });

  it("rejects a malformed URL", () => {
    expect(isValidUrl("not a url at all")).toBe(false);
  });
});
