import { defineConfig, devices } from "@playwright/test";

const isLiveMode = process.env.PLAYWRIGHT_MODE === "live";

export default defineConfig({
  testDir: isLiveMode ? "./tests/live" : "./tests/e2e",
  fullyParallel: isLiveMode ? false : true,
  forbidOnly: !!process.env.CI,
  retries: isLiveMode ? 1 : process.env.CI ? 2 : 0,
  reporter: [
    [
      "html",
      {
        outputFolder: isLiveMode
          ? "playwright-report-live"
          : "playwright-report",
        open: "never",
      },
    ],
  ],
  timeout: isLiveMode ? 90000 : undefined,
  use: {
    baseURL: isLiveMode ? "https://www.casedive.ca" : "http://localhost:5173",
    actionTimeout: isLiveMode ? 10000 : undefined,
    navigationTimeout: isLiveMode ? 30000 : undefined,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(isLiveMode
      ? []
      : [
          { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
          { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
        ]),
  ],
  webServer: isLiveMode
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 30000,
      },
});
