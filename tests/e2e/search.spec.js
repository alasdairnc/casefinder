import { test, expect } from "@playwright/test";

const MOCK_ANALYZE_RESPONSE = {
  summary: "A person entered a residential property at night without permission and stole jewelry.",
  criminal_code: [
    {
      citation: "s. 348(1)(b)",
      title: "Breaking and Entering",
      summary: "Breaking and entering a place with intent to commit an indictable offence.",
    },
    {
      citation: "s. 334(b)",
      title: "Theft Under $5,000",
      summary: "Theft of property valued under $5,000.",
    },
  ],
  case_law: [
    {
      citation: "R v Dorfer, 2014 BCCA 449",
      title: "R v Dorfer",
      summary: "Sentencing principles for residential break and enter.",
      court: "BCCA",
      year: "2014",
      matched_content: "Residential break and enter sentencing principles tied to the user scenario.",
    },
  ],
  civil_law: [],
  charter: [],
  analysis: "This scenario involves a classic residential break and enter with theft.",
  searchTerms: ["residential break and enter", "theft under 5000"],
};

const MOCK_VERIFY_RESPONSE = {
  "R v Dorfer, 2014 BCCA 449": {
    status: "verified",
    url: "https://www.canlii.org/en/bc/bcca/doc/2014/2014bcca449/2014bcca449.html",
    searchUrl: "https://www.canlii.org/en/#search/text=R+v+Dorfer+2014+BCCA+449",
    title: "R v Dorfer",
  },
};

test.describe("Search flow", () => {
  test.beforeEach(async ({ page }) => {
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
    await page.route("/api/case-summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          facts: "The accused entered a home at night and stole jewelry.",
          held: "The court upheld the sentence for the residential break and enter.",
          ratio: "Residential break and enter engages denunciation and deterrence.",
          keyQuote: "\"Residential break and enter is a serious offence.\"",
          significance: "The case is often cited for sentencing principles in home invasion cases.",
        }),
      });
    });
    await page.goto("/");
  });

  test("submits scenario and shows results", async ({ page }) => {
    await page.locator("textarea").fill("A person broke into a house at night and stole jewelry");
    await page.locator("button").filter({ hasText: /research/i }).click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("A person entered a residential property")).toBeVisible();
  });

  test("shows criminal code section", async ({ page }) => {
    await page.locator("textarea").fill("A person broke into a house at night and stole jewelry");
    await page.locator("button").filter({ hasText: /research/i }).click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/s\. 348/)).toBeVisible();
    await expect(page.getByText(/Breaking and entering/)).toBeVisible();
  });

  test("shows case law section with verified citation", async ({ page }) => {
    await page.locator("textarea").fill("A person broke into a house at night and stole jewelry");
    await page.locator("button").filter({ hasText: /research/i }).click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("R v Dorfer")).toBeVisible();
  });

  test("sends citation batch to verify and renders the verified badge", async ({ page }) => {
    let verifyPayload;

    await page.unroute("/api/verify");
    await page.route("/api/verify", async (route) => {
      verifyPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_VERIFY_RESPONSE),
      });
    });

    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house at night and stole jewelry");
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("R v Dorfer")).toBeVisible({ timeout: 10000 });
    expect(verifyPayload).toEqual({
      citations: ["s. 348(1)(b)", "s. 334(b)", "R v Dorfer, 2014 BCCA 449"],
    });
    await expect(page.getByRole("link", { name: /Verified on CanLII/i })).toBeVisible();
  });

  test("shows legal analysis", async ({ page }) => {
    await page.locator("textarea").fill("A person broke into a house at night and stole jewelry");
    await page.locator("button").filter({ hasText: /research/i }).click();

    await expect(page.getByText("Legal Analysis")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("This scenario involves a classic residential break and enter with theft.")).toBeVisible();
  });

  test("shows CanLII search terms", async ({ page }) => {
    await page.locator("textarea").fill("A person broke into a house at night and stole jewelry");
    await page.locator("button").filter({ hasText: /research/i }).click();

    await expect(page.getByText("Suggested CanLII Searches")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: /residential break and enter/i })).toBeVisible();
  });

  test("Cmd+Enter submits the form", async ({ page }) => {
    await page.locator("textarea").fill("A person broke into a house at night and stole jewelry");
    await page.locator("textarea").press("Meta+Enter");

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("sends trimmed analyze payload with filters", async ({ page }) => {
    let analyzePayload;

    await page.unroute("/api/analyze");
    await page.route("/api/analyze", async (route) => {
      analyzePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYZE_RESPONSE),
      });
    });

    await page.goto("/");
    await page.locator('[data-testid="scenario-input"]').fill("  A person broke into a house at night and stole jewelry  ");
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 10000 });
    expect(analyzePayload).toEqual({
      scenario: "A person broke into a house at night and stole jewelry",
      filters: {
        jurisdiction: "all",
        courtLevel: "all",
        dateRange: "all",
        lawTypes: {
          criminal_code: true,
          case_law: true,
          civil_law: true,
          charter: true,
        },
      },
    });
  });

  test("opens case summary modal and sends expected payload", async ({ page }) => {
    let caseSummaryPayload;

    await page.unroute("/api/case-summary");
    await page.route("/api/case-summary", async (route) => {
      caseSummaryPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          facts: "The accused entered a home at night and stole jewelry.",
          held: "The court upheld the sentence for the residential break and enter.",
          ratio: "Residential break and enter engages denunciation and deterrence.",
          keyQuote: "\"Residential break and enter is a serious offence.\"",
          significance: "The case is often cited for sentencing principles in home invasion cases.",
        }),
      });
    });

    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house at night and stole jewelry");
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("R v Dorfer")).toBeVisible({ timeout: 10000 });
    await page.getByText("R v Dorfer").click();

    await expect(page.getByText("Facts")).toBeVisible();
    await expect(page.getByText("Ratio Decidendi")).toBeVisible();
    await expect(page.getByText("Residential break and enter is a serious offence.")).toBeVisible();
    expect(caseSummaryPayload).toEqual({
      citation: "R v Dorfer, 2014 BCCA 449",
      title: "R v Dorfer",
      court: "BCCA",
      year: "2014",
      summary: "Sentencing principles for residential break and enter.",
      matchedContent: "Residential break and enter sentencing principles tied to the user scenario.",
      scenario: "A person broke into a house at night and stole jewelry",
    });
  });

  test("shows error when case summary request fails", async ({ page }) => {
    await page.unroute("/api/case-summary");
    await page.route("/api/case-summary", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Summary service temporarily unavailable." }),
      });
    });

    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house at night and stole jewelry");
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("R v Dorfer")).toBeVisible({ timeout: 10000 });
    await page.getByText("R v Dorfer").click();
    await expect(page.getByText("Summary service temporarily unavailable.")).toBeVisible();
  });
});
