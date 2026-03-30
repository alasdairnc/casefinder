import { test, expect } from "@playwright/test";

test.describe("SearchArea", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders correctly with input field and submit button", async ({ page }) => {
    const input = page.getByTestId("scenario-input");
    const button = page.getByTestId("research-submit");
    
    await expect(input).toBeVisible();
    await expect(button).toBeVisible();
    await expect(button).toHaveText("Research");
    
    await expect(input).toHaveAttribute("placeholder", /Describe your legal scenario in plain language/);
  });

  test("accepts text correctly and character count updates", async ({ page }) => {
    const input = page.getByTestId("scenario-input");
    
    const scenario = "A suspect was observed entering a residential property at night.";
    await input.fill(scenario);
    await expect(input).toHaveValue(scenario);

    // Remaining count appears only when near the max-length threshold.
    await input.fill("x".repeat(4600));
    await expect(page.getByText("400")).toBeVisible();
  });

  test("form submission triggers analyzing state", async ({ page }) => {
    // Route to delay so we can see the loading state text change on the button
    await page.route("/api/analyze", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });

    const input = page.getByTestId("scenario-input");
    const button = page.getByTestId("research-submit");
    
    await input.fill("Testing the search submission state");
    await button.click();
    
    // Confirm button state changes
    await expect(button).toBeDisabled();
    await expect(button).toContainText("Analyzing");
  });

  test("keyboard shortcut (Meta+Enter) submits the form", async ({ page }) => {
    await page.route("/api/analyze", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });

    const input = page.getByTestId("scenario-input");
    const button = page.getByTestId("research-submit");
    
    await input.fill("Testing keyboard submission");
    
    const isMac = process.platform === "darwin";
    if (isMac) {
      await input.press("Meta+Enter");
    } else {
      await input.press("Control+Enter");
    }
    
    await expect(button).toBeDisabled();
    await expect(button).toContainText("Analyzing");
  });
});
