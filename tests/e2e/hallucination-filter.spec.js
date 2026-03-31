import { test, expect } from "@playwright/test";

const BASE_ANALYZE = {
  summary: "Test scenario summary.",
  criminal_code: [],
  civil_law: [],
  charter: [],
  analysis: "Test analysis.",
  suggestions: [],
};

test.describe("Hallucination filtering", () => {
  test("hides not_found case law citations", async ({ page }) => {
    await page.route("/api/analyze", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...BASE_ANALYZE,
          case_law: [
            { citation: "R v Fake, 2099 ONCA 999", title: "R v Fake", description: "Hallucinated case." },
          ],
        }),
      })
    );
    await page.route("/api/verify", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          "R v Fake, 2099 ONCA 999": {
            status: "not_found",
            searchUrl: "https://www.canlii.org/en/#search/text=R+v+Fake",
          },
        }),
      })
    );

    await page.goto("/");
    await page.locator("textarea").fill("test scenario");
    await page.locator("button").filter({ hasText: /research/i }).click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    await expect(page.getByText("R v Fake")).not.toBeVisible();
    await expect(page.getByText("No case law citations could be verified")).toBeVisible();
  });

  test("shows verified citation and green banner", async ({ page }) => {
    await page.route("/api/analyze", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...BASE_ANALYZE,
          case_law: [
            { citation: "R v Dorfer, 2014 BCCA 449", title: "R v Dorfer", description: "Real case." },
          ],
        }),
      })
    );
    await page.route("/api/verify", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          "R v Dorfer, 2014 BCCA 449": {
            status: "verified",
            url: "https://www.canlii.org/en/bc/bcca/doc/2014/2014bcca449/2014bcca449.html",
            searchUrl: "https://www.canlii.org/en/#search/text=R+v+Dorfer",
            title: "R v Dorfer",
          },
        }),
      })
    );

    await page.goto("/");
    await page.locator("textarea").fill("test scenario");
    await page.locator("button").filter({ hasText: /research/i }).click();

    await expect(page.getByText("R v Dorfer, 2014 BCCA 449")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("1 of 1 citation verified on CanLII")).toBeVisible();
  });

  test("shows amber banner when some citations removed", async ({ page }) => {
    await page.route("/api/analyze", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...BASE_ANALYZE,
          case_law: [
            { citation: "R v Dorfer, 2014 BCCA 449", title: "R v Dorfer", description: "Real case." },
            { citation: "R v Fake, 2099 ONCA 999", title: "R v Fake", description: "Hallucinated." },
          ],
        }),
      })
    );
    await page.route("/api/verify", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          "R v Dorfer, 2014 BCCA 449": { status: "verified", url: "https://www.canlii.org/en/bc/bcca/doc/2014/2014bcca449/2014bcca449.html", searchUrl: "https://www.canlii.org/en/#search/text=R+v+Dorfer", title: "R v Dorfer" },
          "R v Fake, 2099 ONCA 999": { status: "not_found", searchUrl: "https://www.canlii.org/en/#search/text=R+v+Fake" },
        }),
      })
    );

    await page.goto("/");
    await page.locator("textarea").fill("test scenario");
    await page.locator("button").filter({ hasText: /research/i }).click();

    await expect(page.getByText("R v Dorfer, 2014 BCCA 449")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("R v Fake")).not.toBeVisible();
    await expect(page.getByText("1 of 2 verified — 1 unconfirmed removed")).toBeVisible({ timeout: 10000 });
  });
});
