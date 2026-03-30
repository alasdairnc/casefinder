import { test, expect } from "@playwright/test";

const MOCK_ANALYZE_RESPONSE = {
  summary: "A multi-jurisdictional scenario.",
  criminal_code: [],
  case_law: [],
  civil_law: [
    {
      citation: "Highway Traffic Act, s. 53",
      title: "Highway Traffic Act",
      summary: "Ontario traffic statute.",
    },
    {
      citation: "Motor Vehicle Act, s. 144",
      title: "Motor Vehicle Act",
      summary: "BC traffic statute.",
    },
    {
      citation: "Traffic Safety Act, s. 115",
      title: "Traffic Safety Act",
      summary: "Alberta traffic statute.",
    },
    {
      citation: "Controlled Drugs and Substances Act, s. 4",
      title: "CDSA",
      summary: "Federal drug statute.",
    },
  ],
  charter: [],
  analysis: "This scenario involves statutes from ON, BC, AB, and Federal jurisdictions.",
  suggestions: [
    { type: "canlii", label: "traffic safety act", term: "traffic safety act" },
    { type: "canlii", label: "motor vehicle act", term: "motor vehicle act" },
  ],
};

const MOCK_VERIFY_RESPONSE = {
  "Highway Traffic Act, s. 53": {
    status: "verified",
    jurisdiction: "Ontario",
    statute: "Highway Traffic Act",
  },
  "Motor Vehicle Act, s. 144": {
    status: "verified",
    jurisdiction: "British Columbia",
    statute: "Motor Vehicle Act",
  },
  "Traffic Safety Act, s. 115": {
    status: "verified",
    jurisdiction: "Alberta",
    statute: "Traffic Safety Act",
  },
  "Controlled Drugs and Substances Act, s. 4": {
    status: "verified",
    jurisdiction: "Federal",
    statute: "Controlled Drugs and Substances Act",
  },
};

test.describe("Jurisdiction Grouping Expansion", () => {
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
    await page.goto("/");
  });

  test("groups statutes by ON, BC, AB, and Federal jurisdictions", async ({ page }) => {
    await page.locator('[data-testid="scenario-input"]').fill("testing provincial grouping");
    await page.locator('[data-testid="research-submit"]').click();

    // Check for grouping headers
    await expect(page.getByText("Ontario Statutes")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("British Columbia Statutes")).toBeVisible();
    await expect(page.getByText("Alberta Statutes")).toBeVisible();
    await expect(page.getByText("Federal Statutes")).toBeVisible();

    // Check grouped citations are rendered under each section.
    await expect(page.getByText("Highway Traffic Act, s. 53")).toBeVisible();
    await expect(page.getByText("Motor Vehicle Act, s. 144")).toBeVisible();
    await expect(page.getByText("Traffic Safety Act, s. 115")).toBeVisible();
    await expect(page.getByText("Controlled Drugs and Substances Act, s. 4")).toBeVisible();
  });
});
