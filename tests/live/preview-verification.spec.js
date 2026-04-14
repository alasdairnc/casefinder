import { test, expect } from "@playwright/test";

test.describe("Preview verification", () => {
  test("loads the core UI", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByAltText("CaseDive")).toBeVisible();
    await expect(page.locator('[data-testid="scenario-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="research-submit"]')).toBeVisible();
  });

  test("dark mode toggle remains interactive", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("button").filter({ hasText: /dark|light/i });
    const before = await toggle.textContent();
    await toggle.click();
    const after = await toggle.textContent();
    expect(after).not.toBe(before);
  });

  test("filters remain visible and usable", async ({ page }) => {
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

  test("break and enter still returns verified case law", async ({ page }) => {
    await page.goto("/");
    await page
      .locator('[data-testid="scenario-input"]')
      .fill(
        "A person broke into a residential home at night through a back window and stole jewelry and electronics.",
      );
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({
      timeout: 60000,
    });
    await expect(page.getByText("Legal Analysis", { exact: true })).toBeVisible({
      timeout: 15000,
    });
    const neutralCitations = page
      .getByText(
        /\b(19|20)\d{2}\s+(SCC|ONCA|ABCA|BCCA|QCCA|NSCA|NBCA|SKCA|MBCA|CanLII)\s+\d+\b/i,
      )
      .first();
    await expect(neutralCitations).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("link", { name: /Verified on CanLII/i }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("assault scenario still returns results", async ({ page }) => {
    await page.goto("/");
    await page
      .locator('[data-testid="scenario-input"]')
      .fill(
        "During an argument, the accused punched the victim several times causing a broken nose and requiring hospital treatment.",
      );
    await page.locator('[data-testid="research-submit"]').click();

    await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({
      timeout: 60000,
    });
    await expect(page.getByText("Legal Analysis", { exact: true })).toBeVisible({
      timeout: 15000,
    });
  });
});
