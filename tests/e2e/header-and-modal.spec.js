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
  suggestions: [],
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

test.describe("Header", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the casedive title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "casedive" })).toBeVisible();
  });

  test("renders navigation actions", async ({ page }) => {
    await expect(page.getByRole("button", { name: /saved/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /criminal code explorer/i })).toBeVisible();
  });

  test("theme toggle button is visible and shows Dark in light mode", async ({ page }) => {
    // Default is light mode — button should say "Dark" (clicking will switch TO dark)
    await expect(page.getByRole("button", { name: /dark/i })).toBeVisible();
  });

  test("clicking theme toggle switches to dark mode and shows Light", async ({ page }) => {
    const toggleBtn = page.getByRole("button", { name: /dark/i });
    await toggleBtn.click();
    // After toggle, button should now say "Light"
    await expect(page.getByRole("button", { name: /light/i })).toBeVisible();
  });
});

test.describe("CaseSummaryModal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("opens modal when a case law card is clicked", async ({ page }) => {
    await page.route("/api/case-summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          facts: "The accused was present at the scene when the victim was killed.",
          held: "Wilful blindness is sufficient to establish the fault element of knowledge.",
          ratio: "Deliberate ignorance can substitute for actual knowledge in criminal law.",
          keyQuote: null,
          significance: "Clarified the doctrine of wilful blindness in Canadian criminal law.",
        }),
      });
    });

    await setupAndSearch(page);

    // Case law cards are clickable divs — click the card containing the citation
    const caseLawCitation = page.getByText("R v Briscoe, 2010 SCC 13").first();
    await expect(caseLawCitation).toBeVisible({ timeout: 5000 });
    await caseLawCitation.click();

    // Modal should appear with the citation in the header
    await expect(page.getByText("R v Briscoe, 2010 SCC 13").nth(1)).toBeVisible({ timeout: 5000 });

    // Facts section should display the mock facts text
    await expect(page.getByText("The accused was present at the scene when the victim was killed.")).toBeVisible({ timeout: 5000 });
  });

  test("modal can be closed with the Close button", async ({ page }) => {
    await page.route("/api/case-summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          facts: "Test facts content.",
          held: "Test held content.",
          ratio: "Test ratio content.",
          keyQuote: null,
          significance: "Test significance content.",
        }),
      });
    });

    await setupAndSearch(page);

    const caseLawCitation = page.getByText("R v Briscoe, 2010 SCC 13").first();
    await caseLawCitation.click();
    await expect(page.getByText("Test facts content.")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /close/i }).first().click();
    await expect(page.getByText("Test facts content.")).not.toBeVisible();
  });
});

test.describe("RetrievalHealthDashboard", () => {
  const MOCK_HEALTH_SNAPSHOT = {
    generatedAt: "2026-03-25T17:00:00.000Z",
    retentionMs: 7200000,
    totalStoredEvents: 12,
    windows: {
      "5m": {
        samples: { total: 3, retrieval: 3, cache: 0, operational: 3, quality: 3, latency: 3 },
        counts: { filterDisabled: 0, missingApiKey: 0, errors: 0, noVerified: 0, verifiedResults: 3 },
        rates: { errorRate: 0.0, noVerifiedRate: 0.0, avgVerifiedPerRequest: 2.0 },
        latencyMs: { avg: 850, p95: 1200 },
        lastEventAt: "2026-03-25T16:58:00.000Z",
      },
      "1h": {
        samples: { total: 12, retrieval: 12, cache: 0, operational: 12, quality: 12, latency: 12 },
        counts: { filterDisabled: 0, missingApiKey: 0, errors: 1, noVerified: 2, verifiedResults: 9 },
        rates: { errorRate: 0.0833, noVerifiedRate: 0.1667, avgVerifiedPerRequest: 1.5 },
        latencyMs: { avg: 920, p95: 1500 },
        lastEventAt: "2026-03-25T16:58:00.000Z",
      },
    },
  };

  test("renders the dashboard when navigating to /internal/retrieval-health", async ({ page }) => {
    await page.route("/api/retrieval-health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_HEALTH_SNAPSHOT),
      });
    });

    await page.goto("/internal/retrieval-health");

    await expect(page.getByRole("heading", { name: /retrieval health/i })).toBeVisible({ timeout: 5000 });
  });

  test("displays window panel labels after data loads", async ({ page }) => {
    await page.route("/api/retrieval-health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_HEALTH_SNAPSHOT),
      });
    });

    await page.goto("/internal/retrieval-health");

    // WindowPanel labels are uppercase via CSS — use case-insensitive match
    await expect(page.getByText(/5 minute window/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/1 hour window/i)).toBeVisible({ timeout: 5000 });
  });

  test("Back to app button navigates home", async ({ page }) => {
    await page.route("/api/retrieval-health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_HEALTH_SNAPSHOT),
      });
    });
    await page.route("/api/verify", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });

    await page.goto("/internal/retrieval-health");
    await expect(page.getByRole("button", { name: /back to app/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /back to app/i }).click();

    // Should be back on the main page with the casedive heading
    await expect(page.getByRole("heading", { name: "casedive" })).toBeVisible({ timeout: 5000 });
  });
});
