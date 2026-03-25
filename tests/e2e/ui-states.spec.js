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

async function setupAndSearch(page) {
  await page.route("/api/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ANALYZE_RESPONSE),
    });
  });
  await page.route("/api/verify", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
  await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house at night and stole jewelry");
  await page.locator('[data-testid="research-submit"]').click();
  await expect(page.locator('[data-testid="results-section"]')).toBeVisible({ timeout: 10000 });
}

test.describe("SearchHistory", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("after a search, scenario appears in history and clicking Re-run re-populates the input", async ({ page }) => {
    const scenario = "A person broke into a house at night and stole jewelry";
    await setupAndSearch(page);

    // History button should now appear
    const historyBtn = page.locator("button", { hasText: /history/i });
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    // History panel header should be visible
    await expect(page.getByText("Search History", { exact: true })).toBeVisible();

    // History entry div (not the textarea) should contain the query
    const historyEntry = page.locator('div').filter({ hasText: new RegExp(`^${scenario.slice(0, 50)}`) }).first();
    await expect(historyEntry).toBeVisible();

    // Clicking Re-run closes the panel and re-populates the input
    await page.getByRole("button", { name: /re-run/i }).click();
    await expect(page.locator('[data-testid="scenario-input"]')).toHaveValue(scenario);
  });
});

test.describe("CriminalCodeExplorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("opening the explorer and searching returns matching sections", async ({ page }) => {
    // Open explorer via the Code button in the header
    await page.getByRole("button", { name: /criminal code explorer/i }).click();

    // Explorer panel should be visible with its header span (exact match to avoid ambiguity)
    await expect(page.locator("span", { hasText: "Criminal Code of Canada" })).toBeVisible();

    // Type a search term
    await page.locator('input[placeholder*="Search section number"]').fill("theft");

    // Results count should appear
    await expect(page.locator("text=/Showing \\d+ result/")).toBeVisible({ timeout: 3000 });
  });

  test("section with enriched data can be expanded to show Definition", async ({ page }) => {
    await page.getByRole("button", { name: /criminal code explorer/i }).click();
    await expect(page.locator("span", { hasText: "Criminal Code of Canada" })).toBeVisible();

    // Search for 348 which has enriched data
    await page.locator('input[placeholder*="Search section number"]').fill("348");

    // Wait for an Enriched tag to appear
    const enrichedTag = page.locator("text=Enriched").first();
    await expect(enrichedTag).toBeVisible({ timeout: 3000 });

    // Click the section row containing the Enriched tag
    await enrichedTag.locator("xpath=ancestor::div[contains(@style,'padding: 14px')]").first().click();

    // Definition label should appear in expanded view
    await expect(page.getByText("Definition", { exact: true }).first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe("ErrorMessage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("shows error message with non-empty text when analyze returns 500", async ({ page }) => {
    await page.route("/api/analyze", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error. Please try again." }),
      });
    });

    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house");
    await page.locator('[data-testid="research-submit"]').click();

    // "Error" label (uppercase) should appear
    await expect(page.getByText("Error", { exact: true })).toBeVisible({ timeout: 10000 });

    // Error message text should be visible
    await expect(page.getByText("Internal server error. Please try again.")).toBeVisible();

    // Try Again button should be present
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
  });

  test("clicking Try Again re-submits the request", async ({ page }) => {
    let callCount = 0;

    await page.route("/api/analyze", async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error. Please try again." }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_ANALYZE_RESPONSE),
        });
      }
    });
    await page.route("/api/verify", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });

    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house");
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /try again/i }).click();

    await expect(page.locator('[data-testid="results-section"]')).toBeVisible({ timeout: 10000 });
    expect(callCount).toBe(2);
  });
});

test.describe("StagedLoading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("loading indicator is visible while analyze request is in flight", async ({ page }) => {
    await page.route("/api/analyze", async (route) => {
      // Delay response so we can observe the loading state
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYZE_RESPONSE),
      });
    });
    await page.route("/api/verify", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });

    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house");
    await page.locator('[data-testid="research-submit"]').click();

    // First stage text should appear before response arrives
    await expect(page.getByText("Analyzing scenario...")).toBeVisible({ timeout: 3000 });

    // Eventually results appear
    await expect(page.locator('[data-testid="results-section"]')).toBeVisible({ timeout: 15000 });
  });
});
