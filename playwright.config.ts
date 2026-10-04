import { defineConfig, devices } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT || "3100";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // The suite renders WebGL through one shared GPU process. Serial workers keep
  // short demand-rendered animations observable under headless Chromium.
  workers: Number(process.env.PLAYWRIGHT_WORKERS || 1),
  // Software WebGL on CI runners is several times slower than a laptop GPU.
  timeout: process.env.CI ? 135000 : 45000,
  expect: { timeout: process.env.CI ? 15000 : 5000 },
  // CI retries once so a slow software-WebGL frame does not fail the run, and
  // a stray test.only cannot pass silently.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: `http://localhost:${port}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
});
