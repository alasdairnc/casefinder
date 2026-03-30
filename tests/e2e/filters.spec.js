import { test, expect } from "@playwright/test";

const MOCK_ANALYZE_RESPONSE = {
  summary: "A person entered a residential property at night without permission and stole jewelry.",
  criminal_code: [
    {
      citation: "s. 348(1)(b)",
      title: "Breaking and Entering",
      summary: "Breaking and entering a place with intent to commit an indictable offence.",
    },
  ],
  case_law: [],
  civil_law: [],
  charter: [],
  analysis: "This scenario involves a residential break and enter.",
  suggestions: [],
};

test.describe("FiltersPanel", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/verify", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole("button", { name: "Case Law" })).toBeVisible({ timeout: 5000 });
  });

  test("toggling a law type off removes it from the analyze request payload", async ({ page }) => {
    let analyzePayload;

    await page.route("/api/analyze", async (route) => {
      analyzePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYZE_RESPONSE),
      });
    });

    await page.getByRole("button", { name: "Case Law" }).click();

    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house");
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 10000 });
    expect(analyzePayload.filters.lawTypes.case_law).toBe(false);
    expect(analyzePayload.filters.lawTypes.criminal_code).toBe(true);
  });

  test("toggling a law type back on restores it in the payload", async ({ page }) => {
    let analyzePayload;

    await page.route("/api/analyze", async (route) => {
      analyzePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYZE_RESPONSE),
      });
    });

    const caseLawToggle = page.getByRole("button", { name: "Case Law" });
    await caseLawToggle.click();
    await caseLawToggle.click();

    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house");
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 10000 });
    expect(analyzePayload.filters.lawTypes.case_law).toBe(true);
  });

  test("changing jurisdiction updates the payload jurisdiction field", async ({ page }) => {
    let analyzePayload;

    await page.route("/api/analyze", async (route) => {
      analyzePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYZE_RESPONSE),
      });
    });

    // Jurisdiction is the first <select> in the filters panel
    await page.locator('select').nth(0).selectOption("Ontario");

    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house");
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 10000 });
    expect(analyzePayload.filters.jurisdiction).toBe("Ontario");
  });
});
