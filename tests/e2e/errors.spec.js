import { test, expect } from "@playwright/test";

test.describe("Error handling", () => {
  test("shows error when API returns 500", async ({ page }) => {
    await page.route("/api/analyze", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal server error" }) });
    });
    await page.goto("/");
    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house");
    await page.locator('[data-testid="research-submit"]').click();
    await expect(page.locator("text=/error|something went wrong|try again/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("shows rate limit message when API returns 429", async ({ page }) => {
    await page.route("/api/analyze", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "Rate limit reached. Try again in 3 minutes." }),
        headers: { "Retry-After": "180" },
      });
    });
    await page.goto("/");
    await page.locator('[data-testid="scenario-input"]').fill("A person broke into a house");
    await page.locator('[data-testid="research-submit"]').click();
    await expect(page.locator("text=/rate limit|try again|minutes/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("research button is disabled when textarea is empty", async ({ page }) => {
    await page.goto("/");
    const btn = page.locator('[data-testid="research-submit"]');
    await expect(btn).toBeDisabled();
  });

  test("character counter updates when typing in textarea", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('[data-testid="scenario-input"]');
    await input.fill("a".repeat(4500));
    // Counter appears only near limit and shows remaining characters.
    await expect(page.getByText(/^500$/)).toBeVisible();
  });
});
