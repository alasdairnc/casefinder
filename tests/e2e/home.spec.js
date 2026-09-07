import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads and shows core UI elements", async ({ page }) => {
    await expect(page.getByAltText(/casedive/i)).toBeVisible();
    await expect(page.locator('[data-testid="scenario-input"]')).toBeVisible();
    await expect(
      page.getByPlaceholder("Describe your legal scenario in plain language…"),
    ).toBeVisible();
    await expect(
      page.locator("button").filter({ hasText: /research/i }),
    ).toBeVisible();
  });

  test("shows character count near input limit", async ({ page }) => {
    await page.locator('[data-testid="scenario-input"]').fill("a".repeat(4500));
    await expect(page.getByText(/^500$/)).toBeVisible();
  });

  test("filters are visible with default values", async ({ page }) => {
    await expect(
      page.getByRole("combobox", { name: /jurisdiction/i }),
    ).toHaveValue("all");
    await expect(
      page.getByRole("combobox", { name: /court level/i }),
    ).toHaveValue("all");
    await expect(
      page.getByRole("combobox", { name: /date range/i }),
    ).toHaveValue("all");
  });

  test("renders dark-only theme with no light/dark toggle", async ({
    page,
  }) => {
    await expect(
      page.locator("button").filter({ hasText: /^(dark|light)$/i }),
    ).toHaveCount(0);
    const bg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(bg).toBe("rgb(11, 18, 32)"); // #0B1220 — the only theme
  });

  test("research button is disabled when scenario is empty", async ({
    page,
  }) => {
    const btn = page.locator("button").filter({ hasText: /research/i });
    await expect(btn).toBeDisabled();
  });

  test("shows disclaimer in footer", async ({ page }) => {
    await expect(
      page.getByText(/Educational tool only .* not legal advice/i),
    ).toBeVisible();
  });
});
