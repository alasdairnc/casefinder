import { defineConfig, devices } from "@playwright/test";

// Runs against the production site at casedive.ca.
// No webServer block — we don't start a local server.
// Tests are serial (fullyParallel: false) to respect rate limiting.
// Each test has a 90-second timeout because real Claude API calls can be slow.

export default defineConfig({
  testDir: "./tests/live",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  reporter: [["html", { outputFolder: "playwright-report-live", open: "never" }]],
  timeout: 90000,
  use: {
    baseURL: "https://www.casedive.ca",
    actionTimeout: 10000,
    navigationTimeout: 30000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
