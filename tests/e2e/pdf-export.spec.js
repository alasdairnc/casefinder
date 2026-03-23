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

test.describe("PDF Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/analyze", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ANALYZE_RESPONSE) });
    });
    await page.route("/api/verify", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_VERIFY_RESPONSE) });
    });
    await page.goto("/");
  });

  async function runSearch(page) {
    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house at night and stole jewelry");
    await page.locator('[data-testid="research-submit"]').click();
    await expect(page.locator('[data-testid="results-section"]')).toBeVisible({ timeout: 10000 });
  }

  test("Export PDF button is visible after search results load", async ({ page }) => {
    await runSearch(page);
    await expect(page.locator('[data-testid="export-pdf-btn"]')).toBeVisible();
  });

  test("clicking Export PDF fires request to /api/export-pdf", async ({ page }) => {
    // Mock the PDF endpoint to return a minimal PDF-like response
    let pdfRequested = false;
    await page.route("/api/export-pdf", async (route) => {
      pdfRequested = true;
      // Return a minimal valid response (not a real PDF, just enough to not throw)
      await route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: Buffer.from("%PDF-1.4 minimal"),
      });
    });

    await runSearch(page);
    await page.locator('[data-testid="export-pdf-btn"]').click();

    // Wait briefly for the request to fire
    await page.waitForTimeout(500);
    expect(pdfRequested).toBe(true);
  });

  test("no error message shown after successful PDF export", async ({ page }) => {
    await page.route("/api/export-pdf", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: Buffer.from("%PDF-1.4 minimal"),
      });
    });

    await runSearch(page);
    await page.locator('[data-testid="export-pdf-btn"]').click();
    await page.waitForTimeout(500);

    // No error message should be visible
    await expect(page.locator("text=/pdf error|export failed/i")).not.toBeVisible();
  });
});
