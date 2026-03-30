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
  case_law: [
    {
      citation: "R v Briscoe, 2010 SCC 13",
      title: "R v Briscoe",
      court: "SCC",
      year: "2010",
      summary: "Wilful blindness can substitute for knowledge as a fault element.",
    },
  ],
  civil_law: [],
  charter: [],
  analysis: "This scenario involves a residential break and enter.",
  suggestions: [
    { type: "canlii", term: "break and enter", label: "Search CanLII for break and enter" },
  ],
};

const MOCK_VERIFY_RESPONSE = {
  "s. 348(1)(b)": {
    status: "verified",
    url: "https://laws-lois.justice.gc.ca/eng/acts/C-46/section-348.html",
    searchUrl: "https://laws-lois.justice.gc.ca/eng/acts/C-46/section-348.html",
  },
  "R v Briscoe, 2010 SCC 13": {
    status: "verified",
    url: "https://www.canlii.org/en/ca/scc/doc/2010/2010scc13/2010scc13.html",
    searchUrl: "https://www.canlii.org/en/ca/scc/doc/2010/2010scc13/2010scc13.html",
  },
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
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_VERIFY_RESPONSE),
    });
  });
  await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house at night and stole jewelry");
  await page.locator('[data-testid="research-submit"]').click();
  await expect(page.locator('[data-testid="results-section"]')).toBeVisible({ timeout: 10000 });
}

test.describe("Results", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders scenario summary after a search", async ({ page }) => {
    await setupAndSearch(page);
    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible();
    await expect(page.getByText(MOCK_ANALYZE_RESPONSE.summary)).toBeVisible();
  });

  test("renders Criminal Code section label and Export PDF button", async ({ page }) => {
    await setupAndSearch(page);
    await expect(page.locator('[data-testid="results-section"]').getByText("Criminal Code", { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid="export-pdf-btn"]')).toBeVisible();
  });

  test("renders Legal Analysis section", async ({ page }) => {
    await setupAndSearch(page);
    await expect(page.getByText("Legal Analysis", { exact: true })).toBeVisible();
  });
});

test.describe("ResultCard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders citation text in a result card", async ({ page }) => {
    await setupAndSearch(page);
    await expect(page.getByText("s. 348(1)(b)")).toBeVisible();
  });

  test("shows verified badge for a verified criminal code citation", async ({ page }) => {
    await setupAndSearch(page);
    // Wait for verification to complete — badge text appears after /api/verify resolves
    await expect(page.getByText("Confirmed — Justice Laws")).toBeVisible({ timeout: 5000 });
  });

  test("shows verified badge for a verified case law citation", async ({ page }) => {
    await setupAndSearch(page);
    await expect(page.getByText("Verified on CanLII").first()).toBeVisible({ timeout: 5000 });
  });

  test("bookmark button is present on a result card", async ({ page }) => {
    await setupAndSearch(page);
    await expect(page.locator('[data-testid="bookmark-add"]').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("SuggestionLink", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders suggestion link with label text when suggestions are present", async ({ page }) => {
    await setupAndSearch(page);
    await expect(page.getByText("Suggested Links", { exact: true })).toBeVisible();
    // SuggestionLink renders as: suggestion.label + " ↗"
    await expect(page.getByText(/Search CanLII for break and enter/)).toBeVisible();
  });
});

test.describe("Select", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("jurisdiction select is visible in the filters panel with default value", async ({ page }) => {
    const jurisdictionSelect = page.getByRole("combobox", { name: /jurisdiction/i });
    await expect(jurisdictionSelect).toBeVisible();
    // Default jurisdiction is "all" per constants.js
    await expect(jurisdictionSelect).toHaveValue("all");
  });
});
