import { test, expect } from "@playwright/test";

const MOCK_ANALYZE_RESPONSE = {
  summary: "A person entered a residential property at night without permission and stole jewelry.",
  criminal_code: [
    { citation: "s. 348(1)(b)", title: "Breaking and Entering", summary: "Breaking and entering a place with intent to commit an indictable offence." },
  ],
  case_law: [
    { citation: "R v Dorfer, 2014 BCCA 449", title: "R v Dorfer", description: "Sentencing principles for residential break and enter." },
  ],
  civil_law: [],
  charter: [],
  analysis: "This scenario involves a classic residential break and enter with theft.",
  searchTerms: ["residential break and enter"],
};

const MOCK_VERIFY_RESPONSE = {
  "R v Dorfer, 2014 BCCA 449": {
    status: "verified",
    url: "https://www.canlii.org/en/bc/bcca/doc/2014/2014bcca449/2014bcca449.html",
    searchUrl: "https://www.canlii.org/en/#search/text=R+v+Dorfer",
    title: "R v Dorfer",
  },
};

test.describe("Bookmarks", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/analyze", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ANALYZE_RESPONSE) });
    });
    await page.route("/api/verify", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_VERIFY_RESPONSE) });
    });
    // Clear localStorage before each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  async function runSearch(page) {
    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house at night and stole jewelry");
    await page.locator('[data-testid="research-submit"]').click();
    await expect(page.locator('[data-testid="results-section"]')).toBeVisible({ timeout: 10000 });
  }

  test("bookmark button appears on result cards after search", async ({ page }) => {
    await runSearch(page);
    const addBtn = page.locator('[data-testid="bookmark-add"]').first();
    await expect(addBtn).toBeVisible();
  });

  test("clicking bookmark fills the icon and switches to remove state", async ({ page }) => {
    await runSearch(page);
    const addBtn = page.locator('[data-testid="bookmark-add"]').first();
    await addBtn.click();
    await expect(page.locator('[data-testid="bookmark-remove"]').first()).toBeVisible();
  });

  test("bookmark count badge appears in header after bookmarking", async ({ page }) => {
    await runSearch(page);
    await page.locator('[data-testid="bookmark-add"]').first().click();
    // Badge should show 1
    await expect(page.locator("text=1").first()).toBeVisible();
  });

  test("BookmarksPanel shows saved citation after bookmarking", async ({ page }) => {
    await runSearch(page);
    await page.locator('[data-testid="bookmark-add"]').first().click();
    // Open bookmarks panel via header button
    await page.locator("button", { hasText: /saved/i }).click();
    await expect(page.locator("text=s. 348").first()).toBeVisible();
  });

  test("removing bookmark from panel updates the list", async ({ page }) => {
    await runSearch(page);
    await page.locator('[data-testid="bookmark-add"]').first().click();
    await page.locator("button", { hasText: /saved/i }).click();
    const panel = page.locator('[data-testid="bookmarks-panel"]');
    await expect(panel).toBeVisible();
    await panel.locator('button[aria-label="Remove bookmark"]').first().click();
    await expect(panel.locator("text=s. 348(1)(b)")).not.toBeVisible();
  });
});
