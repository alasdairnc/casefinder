import { test, expect } from "@playwright/test";

// Live smoke tests against https://www.casedive.ca
// These hit the real Claude API and CanLII — no mocks.
// Assertions are structural only (not exact text) since Claude output is non-deterministic.
// Tests run serially to respect API rate limits.

test.describe("Live: UI Smoke", () => {
  test("page loads and shows core UI elements", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByAltText("CaseDive")).toBeVisible();
    await expect(page.locator('[data-testid="scenario-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="research-submit"]')).toBeVisible();
    await expect(page.locator('[data-testid="research-submit"]')).toBeDisabled();
  });

  test("dark mode toggle works", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("button").filter({ hasText: /dark|light/i });
    const before = await toggle.textContent();
    await toggle.click();
    const after = await toggle.textContent();
    expect(after).not.toBe(before);
  });

  test("filters controls are visible and interactive", async ({ page }) => {
    await page.goto("/");

    const jurisdiction = page.getByLabel("Jurisdiction");
    const courtLevel = page.getByLabel("Court level");
    const dateRange = page.getByLabel("Date range");

    await expect(jurisdiction).toBeVisible();
    await expect(courtLevel).toBeVisible();
    await expect(dateRange).toBeVisible();

    await jurisdiction.selectOption("Ontario");
    await expect(jurisdiction).toHaveValue("Ontario");

    await jurisdiction.selectOption("all");
    await expect(jurisdiction).toHaveValue("all");
  });
});

test.describe("Live: Real API — Impaired Driving", () => {
  test("returns results for an over-80 scenario", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-testid="scenario-input"]').fill(
      "A driver was stopped at a checkpoint and blew 0.14 on a breathalyzer. Police arrested them for impaired driving."
    );
    await page.locator('[data-testid="research-submit"]').click();

    // Wait for results — real Claude API call, allow up to 60s
    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 60000 });

    // Results section rendered
    await expect(page.locator('[data-testid="results-section"]')).toBeVisible();

    // Legal analysis section appears (rendered via typewriter — wait up to 15s)
    await expect(page.getByText("Legal Analysis", { exact: true })).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Live: Real API — Break and Enter", () => {
  test("returns results for a residential break and enter scenario", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-testid="scenario-input"]').fill(
      "A person broke into a residential home at night through a back window and stole jewelry and electronics."
    );
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 60000 });
    await expect(page.locator('[data-testid="results-section"]')).toBeVisible();
    await expect(page.getByText("Legal Analysis", { exact: true })).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Live: Real API — Assault", () => {
  test("returns results for an assault causing bodily harm scenario", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-testid="scenario-input"]').fill(
      "During an argument, the accused punched the victim several times causing a broken nose and requiring hospital treatment."
    );
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 60000 });
    await expect(page.locator('[data-testid="results-section"]')).toBeVisible();
    await expect(page.getByText("Legal Analysis", { exact: true })).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Live: Criminal Code Explorer", () => {
  test("opens explorer and finds results for 'assault'", async ({ page }) => {
    await page.goto("/");

    // The explorer button is in the header with aria-label "Criminal Code Explorer"
    const explorerBtn = page.getByRole("button", { name: "Criminal Code Explorer" });
    await expect(explorerBtn).toBeVisible();
    await explorerBtn.click();

    // Bottom-sheet should open — look for a search input
    const searchInput = page.locator('input[type="search"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill("assault");

    // At least one result mentioning "assault" should appear (case-insensitive)
    await expect(page.locator("body")).toContainText("assault", { timeout: 5000 });
  });
});
