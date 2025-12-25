/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, BrowserContext, Page } from "@playwright/test";

/**
 * Test user fixture data.
 */
export type TestUser = {
  email: string;
  password: string;
  displayName: string;
  username: string;
  context: BrowserContext;
  page: Page;
};

/**
 * Custom fixtures for E2E game tests.
 */
export type GameTestFixtures = {
  hostUser: TestUser;
  playerUser: TestUser;
};

/**
 * Generate unique test credentials.
 */
function generateTestCredentials(role: "host" | "player") {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    email: `e2e-${role}-${timestamp}-${random}@test.local`,
    password: `TestPassword123!${timestamp}`,
    displayName: role === "host" ? "Test Host" : "Test Player",
    username: `test${role}_${timestamp}`.substring(0, 20),
  };
}

/**
 * Sign up and sign in a user via the Password provider on the test login page.
 */
async function signInTestUser(
  page: Page,
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  // Navigate to test login page
  await page.goto("/test-login");

  // Wait for the page to load
  await page.waitForSelector('[data-testid="test-login-page"]', {
    timeout: 10000,
  });

  // First, try to sign up (create the account)
  await page.getByTestId("signup-tab").click();

  // Fill in the sign up form
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill(password);
  await page.getByTestId("name-input").fill(displayName);

  // Submit sign up
  await page.getByTestId("submit-button").click();

  // Wait for auth to complete or error
  // Either we get redirected to dashboard, or we see an error and need to sign in instead
  const result = await Promise.race([
    page
      .waitForURL(/\/app\/dashboard/i, { timeout: 15000 })
      .then(() => "success" as const),
    page
      .getByTestId("error-message")
      .waitFor({ timeout: 10000 })
      .then(() => "error" as const),
  ]).catch(() => "timeout" as const);

  // If signup failed (account exists), try signing in
  if (result === "error" || result === "timeout") {
    // Switch to sign in tab
    await page.getByTestId("signin-tab").click();

    // Fill in sign in form
    await page.getByTestId("email-input").fill(email);
    await page.getByTestId("password-input").fill(password);

    // Submit sign in
    await page.getByTestId("submit-button").click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/app\/dashboard/i, { timeout: 15000 });
  }

  // Verify we're on the dashboard
  await page.waitForLoadState("networkidle");
}

/**
 * Complete onboarding if the user is redirected to it.
 * Handles:
 * 1. The multi-step "Welcome to Prompty!" onboarding wizard
 * 2. The UsernameDialog that appears when a user doesn't have a username set
 */
async function handleOnboardingIfNeeded(
  page: Page,
  displayName: string,
  username: string
): Promise<void> {
  // Handle the multi-step "Welcome to Prompty!" onboarding wizard
  const welcomeWizardVisible = await page
    .getByText(/welcome to prompty/i)
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (welcomeWizardVisible) {
    // Click through all steps of the onboarding wizard
    for (let step = 0; step < 10; step++) {
      // Look for any action button in the wizard
      const actionBtn = page.getByRole("button", {
        name: /let's get started|next|continue|skip|finish|done|save|get started/i,
      });

      if (await actionBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await actionBtn.click();
        await page.waitForTimeout(500);
      }

      // Fill username if this step asks for it
      const usernameInput = page.getByLabel(/username/i);
      if (await usernameInput.isVisible({ timeout: 500 }).catch(() => false)) {
        await usernameInput.fill(username);
        await page.waitForTimeout(300);
      }

      // Fill display name if this step asks for it
      const nameInput = page.getByLabel(/display name|name/i);
      if (await nameInput.isVisible({ timeout: 500 }).catch(() => false)) {
        await nameInput.fill(displayName);
        await page.waitForTimeout(300);
      }

      // Check if wizard is done (no more wizard dialogs visible)
      const stillVisible = await page
        .getByText(/welcome to prompty|step \d|of \d/i)
        .isVisible({ timeout: 500 })
        .catch(() => false);

      if (!stillVisible) {
        break;
      }
    }

    await page.waitForLoadState("networkidle");
  }

  // Handle the standalone username dialog (if it appears after wizard)
  const usernameDialogVisible = await page
    .getByRole("heading", { name: /choose a username/i })
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (usernameDialogVisible) {
    const usernameInput = page.getByLabel(/username/i);
    await usernameInput.fill(username);
    await page.waitForTimeout(500);

    const saveBtn = page.getByRole("button", { name: /save/i });
    await saveBtn.click();

    await page
      .getByRole("heading", { name: /choose a username/i })
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});

    await page.waitForLoadState("networkidle");
  }
}

/**
 * Extended Playwright test with multi-user fixtures.
 */
export const test = base.extend<GameTestFixtures>({
  /**
   * Host user fixture - creates a new browser context and signs in.
   */
  hostUser: async ({ browser }, use) => {
    const credentials = generateTestCredentials("host");

    // Create a new browser context for isolation
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Sign in via test login page
      await signInTestUser(
        page,
        credentials.email,
        credentials.password,
        credentials.displayName
      );

      // Handle onboarding if needed
      await handleOnboardingIfNeeded(
        page,
        credentials.displayName,
        credentials.username
      );

      // Provide the fixture to the test
      await use({
        ...credentials,
        context,
        page,
      });
    } finally {
      // Cleanup
      await context.close();
    }
  },

  /**
   * Player user fixture - creates a second browser context for multi-user tests.
   */
  playerUser: async ({ browser }, use) => {
    const credentials = generateTestCredentials("player");

    // Create a new browser context for isolation
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Sign in via test login page
      await signInTestUser(
        page,
        credentials.email,
        credentials.password,
        credentials.displayName
      );

      // Handle onboarding if needed
      await handleOnboardingIfNeeded(
        page,
        credentials.displayName,
        credentials.username
      );

      // Provide the fixture to the test
      await use({
        ...credentials,
        context,
        page,
      });
    } finally {
      // Cleanup
      await context.close();
    }
  },
});

export { expect } from "@playwright/test";
