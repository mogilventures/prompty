import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E testing.
 *
 * Prerequisites:
 * 1. Run `npx convex dev` in one terminal (Convex backend)
 * 2. The webServer config below will start `npm run dev` automatically
 *
 * Or run both manually and use `reuseExistingServer: true`
 */
export default defineConfig({
  testDir: "./e2e/tests",

  // Run tests sequentially for multi-user coordination
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests (more retries in CI)
  retries: process.env.CI ? 2 : 1,

  // Single worker for coordinated multi-user tests
  workers: 1,

  // Reporter configuration
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the app
    baseURL: "http://localhost:8080",

    // Collect trace on first retry
    trace: "on-first-retry",

    // Take screenshots only on failure
    screenshot: "only-on-failure",

    // Record video only on failure
    video: "on-first-retry",

    // Timeout for actions like click, fill, etc.
    actionTimeout: 10000,

    // Timeout for navigation
    navigationTimeout: 30000,
  },

  // Global timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Uncomment to test on more browsers
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
