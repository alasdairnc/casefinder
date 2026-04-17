import { test, expect } from "@playwright/test";

function makeAnalyzeResponse(requestId = "analysis-1") {
  return {
    summary:
      "A person entered a residential property at night without permission and stole jewelry.",
    criminal_code: [
      {
        citation: "s. 348(1)(b)",
        title: "Breaking and Entering",
        summary:
          "Breaking and entering a place with intent to commit an indictable offence.",
      },
    ],
    case_law: [
      {
        citation: "R v Dorfer, 2014 BCCA 449",
        title: "R v Dorfer",
        summary: "Sentencing principles for residential break and enter.",
        court: "BCCA",
        year: "2014",
        url_canlii:
          "https://www.canlii.org/en/bc/bcca/doc/2014/2014bcca449/2014bcca449.html",
      },
    ],
    civil_law: [],
    charter: [],
    analysis:
      "This scenario involves a classic residential break and enter with theft.",
    suggestions: [],
    meta: {
      requestId,
      case_law: {
        source: "retrieval_ranked",
        verifiedCount: 1,
        reason: "verified_results",
        retrieval: {
          issuePrimary: "theft",
          retrievalPass: "phase_b_ranked",
          fallbackReason: null,
        },
      },
    },
  };
}

const MOCK_VERIFY_RESPONSE = {
  "s. 348(1)(b)": {
    status: "verified",
    url: "https://laws-lois.justice.gc.ca/eng/acts/C-46/section-348.html",
    searchUrl: "https://laws-lois.justice.gc.ca/eng/acts/C-46/section-348.html",
  },
  "R v Dorfer, 2014 BCCA 449": {
    status: "verified",
    url: "https://www.canlii.org/en/bc/bcca/doc/2014/2014bcca449/2014bcca449.html",
    searchUrl:
      "https://www.canlii.org/en/bc/bcca/doc/2014/2014bcca449/2014bcca449.html",
  },
};

async function runSearch(
  page,
  query = "A person broke into a house at night and stole jewelry",
) {
  await page.locator('[data-testid="scenario-input"]').fill(query);
  await page.locator('[data-testid="research-submit"]').click();
  await expect(page.locator('[data-testid="results-section"]')).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Case-law reporting", () => {
  test.beforeEach(async ({ page }) => {
    let analyzeCount = 0;

    await page.route("/api/analyze", async (route) => {
      analyzeCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeAnalyzeResponse(`analysis-${analyzeCount}`)),
      });
    });

    await page.route("/api/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_VERIFY_RESPONSE),
      });
    });

    await page.goto("/");
  });

  test("renders a report button only for case-law cards", async ({ page }) => {
    await runSearch(page);

    await expect(
      page.locator('[data-testid="report-case-law-open"]'),
    ).toHaveCount(1);
  });

  test("opens the report panel without triggering the case-summary modal", async ({
    page,
  }) => {
    let caseSummaryCalls = 0;

    await page.route("/api/case-summary", async (route) => {
      caseSummaryCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          facts: "Facts",
          held: "Held",
          ratio: "Ratio",
          keyQuote: null,
          significance: "Significance",
        }),
      });
    });

    await runSearch(page);
    await page.locator('[data-testid="report-case-law-open"]').click();

    await expect(
      page.locator('[data-testid="report-case-law-panel"]'),
    ).toBeVisible();
    expect(caseSummaryCalls).toBe(0);
    await expect(page.getByRole("button", { name: "Close" })).toHaveCount(0);
  });

  test("submits a report, keeps the card visible, and shows the acknowledgment", async ({
    page,
  }) => {
    let reportPayload;

    await page.route("/api/report-case-law", async (route) => {
      reportPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          reportId: "clr_1",
          reportedAt: "2026-04-15T12:00:00.000Z",
        }),
      });
    });

    await runSearch(page);

    await page.locator('[data-testid="report-case-law-open"]').click();
    await page
      .locator('[data-testid="report-case-law-reason"]')
      .selectOption("wrong_legal_issue");
    await page
      .locator('[data-testid="report-case-law-note"]')
      .fill("This result is too sentencing-focused for these facts.");
    await page.locator('[data-testid="report-case-law-submit"]').click();

    await expect(
      page.locator('[data-testid="report-case-law-success"]'),
    ).toBeVisible();
    await expect(page.getByText("R v Dorfer", { exact: true })).toBeVisible();

    expect(reportPayload).toEqual({
      analysisRequestId: "analysis-1",
      scenarioSnippet: "A person broke into a house at night and stole jewelry",
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
      item: {
        citation: "R v Dorfer, 2014 BCCA 449",
        title: "R v Dorfer",
        court: "BCCA",
        year: "2014",
        url_canlii:
          "https://www.canlii.org/en/bc/bcca/doc/2014/2014bcca449/2014bcca449.html",
        summary: "Sentencing principles for residential break and enter.",
      },
      resultIndex: 0,
      reason: "wrong_legal_issue",
      note: "This result is too sentencing-focused for these facts.",
      caseLawMeta: {
        source: "retrieval_ranked",
        reason: "verified_results",
        issuePrimary: "theft",
        retrievalPass: "phase_b_ranked",
        fallbackReason: null,
        verifiedCount: 1,
      },
    });
  });

  test("shows an inline retryable error when submission fails", async ({
    page,
  }) => {
    await page.route("/api/report-case-law", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Could not save the report. Please try again.",
        }),
      });
    });

    await runSearch(page);

    await page.locator('[data-testid="report-case-law-open"]').click();
    await page
      .locator('[data-testid="report-case-law-reason"]')
      .selectOption("wrong_legal_issue");
    await page.locator('[data-testid="report-case-law-submit"]').click();

    await expect(
      page.locator('[data-testid="report-case-law-error"]'),
    ).toContainText("Could not save the report. Please try again.");
    await expect(
      page.locator('[data-testid="report-case-law-success"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="report-case-law-submit"]'),
    ).toBeVisible();
  });

  test("resets the reported state on a new search", async ({ page }) => {
    await page.route("/api/report-case-law", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          reportId: "clr_1",
          reportedAt: "2026-04-15T12:00:00.000Z",
        }),
      });
    });

    await runSearch(page);
    await page.locator('[data-testid="report-case-law-open"]').click();
    await page
      .locator('[data-testid="report-case-law-reason"]')
      .selectOption("wrong_legal_issue");
    await page.locator('[data-testid="report-case-law-submit"]').click();

    await expect(
      page.locator('[data-testid="report-case-law-success"]'),
    ).toBeVisible();

    await runSearch(
      page,
      "A person broke into a house at night and stole jewelry again",
    );

    await expect(
      page.locator('[data-testid="report-case-law-open"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="report-case-law-success"]'),
    ).toHaveCount(0);
  });
});
