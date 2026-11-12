import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 45_000,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3200",
    launchOptions: process.env.PIXELFORGE_BROWSER ? { executablePath: process.env.PIXELFORGE_BROWSER } : undefined,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3200",
    url: "http://localhost:3200/studio/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
