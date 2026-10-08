import { defineConfig, devices } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT || "3100";
/**
 * Tests whose subject is the desk's real-time WebGL: animations measured in
 * frames, pointer-driven deformation and remounting the scene. CI renders
 * WebGL in software, where one frame of the desk can outlast the animation
 * under test, so these run on GPU-backed machines only (before each merge;
 * see README) and CI skips them.
 */
const gpuOnly = new RegExp(
  [
    "desk actions and keyboard access",
    "review objects accept direct pointer clicks",
    "opening portrait stays sharp",
    "exits promptly after the full view",
    "cosmic grid remains active",
    "journey bar hides after travel",
    "changing the motion preference restores the journey",
    "step buttons bring monitor content into view",
    "the MacBook's balls",
    "desk controls stay out of sight",
  ].join("|"),
);

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
  grepInvert: process.env.CI ? gpuOnly : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    // CI renders WebGL in software, which the site gives the plain flow
    // (src/lib/quality.ts); the desk's tests ask for the full desk.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${port}`,
          localStorage: [{ name: "portfolio:quality", value: "high" }],
        },
      ],
    },
  },
  webServer: {
    // The production build behind a proxy that keeps image optimization
    // from hanging when a test closes its page mid-load (scripts/e2e).
    command: `node scripts/e2e/server.mjs`,
    env: { PORT: port },
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
