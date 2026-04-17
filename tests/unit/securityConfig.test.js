import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("security config", () => {
  it("removes AdSense assets from index.html", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).not.toContain("pagead2.googlesyndication.com");
    expect(html).not.toContain("adsbygoogle");
    expect(html).not.toContain("ca-pub-");
  });

  it("keeps CSP free of ad/GTM domains, browser Anthropic access, and inline scripts", () => {
    const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));
    const csp = vercelConfig.headers
      .find((header) => header.source === "/(.*)")
      .headers.find((header) => header.key === "Content-Security-Policy").value;

    expect(csp).not.toContain("pagead2.googlesyndication.com");
    expect(csp).not.toContain("googleads.g.doubleclick.net");
    expect(csp).not.toContain("www.googletagmanager.com");
    expect(csp).not.toContain("api.anthropic.com");
    expect(csp).not.toContain("api.canlii.org");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
