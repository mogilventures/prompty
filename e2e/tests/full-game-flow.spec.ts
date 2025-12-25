import { test, expect } from "../fixtures/auth";
import { Page } from "@playwright/test";
import {
  mockImageGeneration,
  getRoomState,
  waitForPhase,
  waitForVoteCount,
} from "../helpers/convex";

/**
 * Full Game Flow E2E Tests
 *
 * These tests verify the complete game flow with two players:
 * 1. Host creates a room
 * 2. Player joins via room code
 * 3. Host starts the game
 * 4. Both players complete prompt phase
 * 5. Game progresses through generating/voting/results phases
 */

// Helper function to set up a game room with 2 players and start the game
async function setupAndStartGame(
  hostPage: Page,
  playerPage: Page
): Promise<string> {
  // Host creates room
  await hostPage.getByTestId("create-room-button").click();
  await hostPage.waitForURL(/\/room\//, { timeout: 10000 });

  const roomCodeBadge = hostPage.getByTestId("room-code");
  await expect(roomCodeBadge).toBeVisible({ timeout: 5000 });
  const roomCode = await roomCodeBadge.textContent();

  if (!roomCode || !/^[A-Z0-9]{6}$/.test(roomCode)) {
    throw new Error(`Invalid room code: ${roomCode}`);
  }

  // Player joins
  await playerPage.getByTestId("join-room-button").click();
  const roomCodeInput = playerPage.getByPlaceholder(/enter 6-letter code/i);
  await expect(roomCodeInput).toBeVisible({ timeout: 5000 });
  await roomCodeInput.fill(roomCode);
  await playerPage.getByRole("button", { name: /^join$/i }).click();
  await playerPage.waitForURL(/\/room\//, { timeout: 10000 });

  // Wait for both players to be visible
  await expect(hostPage.getByTestId("player-count")).toContainText("2/8", {
    timeout: 10000,
  });

  // Host starts the game
  const startButton = hostPage.getByRole("button", { name: /start game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Both navigate to play page
  await Promise.all([
    hostPage.waitForURL(/\/play\//, { timeout: 15000 }),
    playerPage.waitForURL(/\/play\//, { timeout: 15000 }),
  ]);

  return roomCode;
}

// Helper to submit prompts for both players
async function submitPrompts(
  hostPage: Page,
  playerPage: Page,
  hostPrompt = "A happy robot playing guitar",
  playerPrompt = "A sleepy cat on a cloud"
): Promise<void> {
  // Wait for prompt inputs to be visible
  await expect(hostPage.getByTestId("prompt-input")).toBeVisible({
    timeout: 10000,
  });
  await expect(playerPage.getByTestId("prompt-input")).toBeVisible({
    timeout: 10000,
  });

  // Host submits first
  await hostPage.getByTestId("prompt-input").fill(hostPrompt);
  await hostPage.getByTestId("submit-prompt-button").click();
  // Wait for host's submission indicator (host should stay in prompt phase since player hasn't submitted)
  await expect(hostPage.getByTestId("prompt-submitted-indicator")).toBeVisible({
    timeout: 5000,
  });

  // Player submits - this will trigger game auto-transition since all players submitted
  await playerPage.getByTestId("prompt-input").fill(playerPrompt);
  await playerPage.getByTestId("submit-prompt-button").click();

  // After second player submits, the game may immediately transition to generating phase
  // Accept either: submission indicator shown OR generating heading appears (race condition)
  await Promise.race([
    expect(playerPage.getByTestId("prompt-submitted-indicator")).toBeVisible({ timeout: 5000 }),
    expect(playerPage.getByRole("heading", { name: /generating ai masterpieces/i })).toBeVisible({ timeout: 5000 }),
  ]);
}

// Helper to complete voting (each player votes for the other's image)
async function completeVoting(
  hostPage: Page,
  playerPage: Page
): Promise<void> {
  // Host votes for player's image (the one without "Your Image" badge)
  const hostVotableImage = hostPage
    .locator('[data-testid^="image-card-"]')
    .filter({
      hasNot: hostPage.locator('[data-testid="own-image-indicator"]'),
    })
    .first();
  await hostVotableImage.click();
  await hostPage.getByTestId("vote-confirm-button").click();
  // Host votes first, should stay in voting phase
  await expect(hostPage.getByTestId("vote-submitted-indicator")).toBeVisible({
    timeout: 5000,
  });

  // Player votes for host's image
  const playerVotableImage = playerPage
    .locator('[data-testid^="image-card-"]')
    .filter({
      hasNot: playerPage.locator('[data-testid="own-image-indicator"]'),
    })
    .first();
  await playerVotableImage.click();
  await playerPage.getByTestId("vote-confirm-button").click();
  // After second player votes, game may auto-transition to results
  // Accept either: vote indicator shown OR results phase appears
  await Promise.race([
    expect(playerPage.getByTestId("vote-submitted-indicator")).toBeVisible({ timeout: 5000 }),
    expect(playerPage.getByTestId("results-phase")).toBeVisible({ timeout: 5000 }),
  ]);
}

test.describe("Full Game Flow", () => {
  test("two players can create and join a room", async ({
    hostUser,
    playerUser,
  }) => {
    const { page: hostPage } = hostUser;
    const { page: playerPage } = playerUser;

    // Step 1: Host should be on dashboard after fixture setup
    await expect(hostPage).toHaveURL(/\/app\/dashboard/);
    await expect(playerPage).toHaveURL(/\/app\/dashboard/);

    // Step 2: Host creates a room
    await hostPage.getByTestId("create-room-button").click();

    // Wait for navigation to room page
    await hostPage.waitForURL(/\/room\//, { timeout: 10000 });

    // Step 3: Extract room code from the room page
    const roomCodeBadge = hostPage.getByTestId("room-code");
    await expect(roomCodeBadge).toBeVisible({ timeout: 5000 });
    const roomCode = await roomCodeBadge.textContent();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    console.log(`Room code: ${roomCode}`);

    // Step 4: Verify host sees player count
    await expect(hostPage.getByTestId("player-count")).toBeVisible();

    // Step 5: Player 2 joins the room
    await playerPage.getByTestId("join-room-button").click();

    // Wait for join dialog to appear
    const roomCodeInput = playerPage.getByPlaceholder(/enter 6-letter code/i);
    await expect(roomCodeInput).toBeVisible({ timeout: 5000 });

    // Enter room code
    await roomCodeInput.fill(roomCode!);

    // Click join button in dialog
    await playerPage.getByRole("button", { name: /^join$/i }).click();

    // Wait for player to navigate to room
    await playerPage.waitForURL(/\/room\//, { timeout: 10000 });

    // Step 6: Verify both players see 2 players in the room (use testid for specificity)
    await expect(hostPage.getByTestId("player-count")).toContainText("2/8", { timeout: 10000 });
    await expect(playerPage.getByTestId("player-count")).toContainText("2/8", { timeout: 10000 });

    // Step 7: Verify host sees "Start Game" button enabled
    const startButton = hostPage.getByRole("button", { name: /start game/i });
    await expect(startButton).toBeEnabled({ timeout: 5000 });
  });

  test("host can start game with 2 players", async ({
    hostUser,
    playerUser,
  }) => {
    const { page: hostPage } = hostUser;
    const { page: playerPage } = playerUser;

    // Create and join room (reuse logic from first test)
    await hostPage.getByTestId("create-room-button").click();
    await hostPage.waitForURL(/\/room\//, { timeout: 10000 });

    const roomCodeBadge = hostPage.getByTestId("room-code");
    await expect(roomCodeBadge).toBeVisible({ timeout: 5000 });
    const roomCode = await roomCodeBadge.textContent();

    // Player joins
    await playerPage.getByTestId("join-room-button").click();
    const roomCodeInput = playerPage.getByPlaceholder(/enter 6-letter code/i);
    await roomCodeInput.fill(roomCode!);
    await playerPage.getByRole("button", { name: /^join$/i }).click();
    await playerPage.waitForURL(/\/room\//, { timeout: 10000 });

    // Wait for both players to be visible (use testid for specificity)
    await expect(hostPage.getByTestId("player-count")).toContainText("2/8", { timeout: 10000 });

    // Host starts the game
    const startButton = hostPage.getByRole("button", { name: /start game/i });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // Both should navigate to play page
    await Promise.all([
      hostPage.waitForURL(/\/play\//, { timeout: 15000 }),
      playerPage.waitForURL(/\/play\//, { timeout: 15000 }),
    ]);

    // Verify both are in the game
    await expect(hostPage.locator("body")).toContainText(/round/i);
    await expect(playerPage.locator("body")).toContainText(/round/i);
  });

  test("players can complete prompt phase", async ({ hostUser, playerUser }) => {
    const { page: hostPage } = hostUser;
    const { page: playerPage } = playerUser;

    // Setup: Create room, join, start game
    const roomCode = await setupAndStartGame(hostPage, playerPage);

    // Submit prompts
    await submitPrompts(hostPage, playerPage);

    // Verify generating phase begins (early transition when all submit)
    await expect(hostPage.getByRole("heading", { name: /generating ai masterpieces/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(playerPage.getByRole("heading", { name: /generating ai masterpieces/i })).toBeVisible({
      timeout: 15000,
    });

    // Mock image generation via HTTP endpoint
    const result = await mockImageGeneration(roomCode);
    expect(result.success).toBe(true);
    expect(result.imageCount).toBe(2); // One per player
  });

  test("players can complete voting phase", async ({ hostUser, playerUser }) => {
    const { page: hostPage } = hostUser;
    const { page: playerPage } = playerUser;

    // Setup game and complete prompt phase
    const roomCode = await setupAndStartGame(hostPage, playerPage);
    await submitPrompts(hostPage, playerPage);

    // Wait for generating phase and mock images
    await expect(hostPage.getByRole("heading", { name: /generating ai masterpieces/i })).toBeVisible({
      timeout: 15000,
    });
    const mockResult = await mockImageGeneration(roomCode);
    expect(mockResult.success).toBe(true);

    // Wait for voting phase
    await waitForPhase(roomCode, "voting");
    await expect(hostPage.getByTestId("voting-phase")).toBeVisible({
      timeout: 15000,
    });
    await expect(playerPage.getByTestId("voting-phase")).toBeVisible({
      timeout: 15000,
    });

    // Verify images are displayed (should be 2 images)
    await expect(hostPage.getByTestId("image-card-0")).toBeVisible();
    await expect(hostPage.getByTestId("image-card-1")).toBeVisible();

    // Complete voting
    await completeVoting(hostPage, playerPage);

    // Verify votes were registered via backend
    const state = await getRoomState(roomCode);
    expect(state.voteCount).toBe(2); // Both players voted
  });

  test("results phase shows winner and scores correctly", async ({
    hostUser,
    playerUser,
  }) => {
    const { page: hostPage } = hostUser;
    const { page: playerPage } = playerUser;

    // Full setup through voting
    const roomCode = await setupAndStartGame(hostPage, playerPage);
    await submitPrompts(hostPage, playerPage);
    await expect(hostPage.getByRole("heading", { name: /generating ai masterpieces/i })).toBeVisible({
      timeout: 15000,
    });
    await mockImageGeneration(roomCode);
    await waitForPhase(roomCode, "voting");
    await expect(hostPage.getByTestId("voting-phase")).toBeVisible({
      timeout: 15000,
    });
    await completeVoting(hostPage, playerPage);

    // Wait for results phase (should auto-transition since all voted)
    await waitForPhase(roomCode, "results");

    // Verify results UI elements
    await expect(hostPage.getByTestId("results-phase")).toBeVisible({
      timeout: 15000,
    });
    await expect(hostPage.getByTestId("winner-image")).toBeVisible();
    await expect(hostPage.getByTestId("winner-prompt")).toBeVisible();
    await expect(hostPage.getByTestId("scoreboard")).toBeVisible();

    // Verify scores updated via API
    const roomState = await getRoomState(roomCode);
    // Both players voted, so both get at least participation points (10 each)
    expect(roomState.players.every((p) => p.score >= 10)).toBe(true);
  });

  test("complete game flow: prompt -> generating -> voting -> results", async ({
    hostUser,
    playerUser,
  }) => {
    const { page: hostPage } = hostUser;
    const { page: playerPage } = playerUser;

    // === PHASE 1: Room Setup ===
    await hostPage.getByTestId("create-room-button").click();
    await hostPage.waitForURL(/\/room\//, { timeout: 10000 });

    const roomCodeBadge = hostPage.getByTestId("room-code");
    const roomCode = (await roomCodeBadge.textContent())!;

    await playerPage.getByTestId("join-room-button").click();
    await playerPage.getByPlaceholder(/enter 6-letter code/i).fill(roomCode);
    await playerPage.getByRole("button", { name: /^join$/i }).click();
    await playerPage.waitForURL(/\/room\//, { timeout: 10000 });

    await expect(hostPage.getByTestId("player-count")).toContainText("2/8", {
      timeout: 10000,
    });

    // === PHASE 2: Start Game ===
    await hostPage.getByRole("button", { name: /start game/i }).click();
    await Promise.all([
      hostPage.waitForURL(/\/play\//, { timeout: 15000 }),
      playerPage.waitForURL(/\/play\//, { timeout: 15000 }),
    ]);

    // === PHASE 3: Prompt Phase ===
    await expect(hostPage.getByTestId("prompt-input")).toBeVisible({
      timeout: 10000,
    });

    await hostPage.getByTestId("prompt-input").fill("A robot playing chess");
    await hostPage.getByTestId("submit-prompt-button").click();
    await expect(
      hostPage.getByTestId("prompt-submitted-indicator")
    ).toBeVisible({ timeout: 5000 });

    await playerPage.getByTestId("prompt-input").fill("A cat flying a spaceship");
    await playerPage.getByTestId("submit-prompt-button").click();
    // After second player submits, game auto-transitions - accept either indicator or generating
    await Promise.race([
      expect(playerPage.getByTestId("prompt-submitted-indicator")).toBeVisible({ timeout: 5000 }),
      expect(playerPage.getByRole("heading", { name: /generating ai masterpieces/i })).toBeVisible({ timeout: 5000 }),
    ]);

    // === PHASE 4: Mock Image Generation ===
    await expect(hostPage.getByRole("heading", { name: /generating ai masterpieces/i })).toBeVisible({
      timeout: 15000,
    });

    const mockResult = await mockImageGeneration(roomCode);
    expect(mockResult.success).toBe(true);
    expect(mockResult.imageCount).toBe(2);

    // === PHASE 5: Voting Phase ===
    await waitForPhase(roomCode, "voting");
    await expect(hostPage.getByTestId("voting-phase")).toBeVisible({
      timeout: 15000,
    });

    // Each player votes for the other's image
    const hostVotable = hostPage
      .locator('[data-testid^="image-card-"]')
      .filter({
        hasNot: hostPage.locator('[data-testid="own-image-indicator"]'),
      })
      .first();
    await hostVotable.click();
    await hostPage.getByTestId("vote-confirm-button").click();

    const playerVotable = playerPage
      .locator('[data-testid^="image-card-"]')
      .filter({
        hasNot: playerPage.locator('[data-testid="own-image-indicator"]'),
      })
      .first();
    await playerVotable.click();
    await playerPage.getByTestId("vote-confirm-button").click();

    // Verify votes were registered
    await waitForVoteCount(roomCode, 2);
    const stateAfterVoting = await getRoomState(roomCode);
    expect(stateAfterVoting.voteCount).toBe(2);

    // === PHASE 6: Results Phase ===
    await waitForPhase(roomCode, "results");
    await expect(hostPage.getByTestId("results-phase")).toBeVisible({
      timeout: 15000,
    });
    await expect(playerPage.getByTestId("results-phase")).toBeVisible({
      timeout: 15000,
    });

    // Verify winner announcement
    await expect(hostPage.getByTestId("winner-image")).toBeVisible();
    await expect(hostPage.getByTestId("scoreboard")).toBeVisible();

    // Verify final scores
    const finalState = await getRoomState(roomCode);
    console.log("Final game state:", JSON.stringify(finalState, null, 2));

    // Both players should have scores (participation + potential win)
    expect(finalState.players.every((p) => p.score > 0)).toBe(true);
    expect(finalState.voteCount).toBe(2);
  });
});

test.describe("Authentication Flow", () => {
  test("user can sign up and reach dashboard", async ({ hostUser }) => {
    const { page } = hostUser;

    // The fixture should have handled signup/signin
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/);

    // Verify welcome message is visible
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test("user can sign out", async ({ hostUser }) => {
    const { page } = hostUser;

    // Find and click sign out button
    await page.getByRole("button", { name: /sign out/i }).click();

    // Should redirect to home page - verify by checking for landing page content
    // The landing page shows "AI Image Party" title and "Create Room" button
    await expect(page.getByRole("heading", { name: /ai image party/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Room Management", () => {
  test("player sees waiting message when not host", async ({
    hostUser,
    playerUser,
  }) => {
    const { page: hostPage } = hostUser;
    const { page: playerPage } = playerUser;

    // Host creates room
    await hostPage.getByTestId("create-room-button").click();
    await hostPage.waitForURL(/\/room\//, { timeout: 10000 });

    const roomCodeBadge = hostPage.getByTestId("room-code");
    const roomCode = await roomCodeBadge.textContent();

    // Player joins
    await playerPage.getByTestId("join-room-button").click();
    await playerPage.getByPlaceholder(/enter 6-letter code/i).fill(roomCode!);
    await playerPage.getByRole("button", { name: /^join$/i }).click();
    await playerPage.waitForURL(/\/room\//, { timeout: 10000 });

    // Player should see "Waiting for host" message (mobile shows "Waiting for host...", desktop shows full text)
    await expect(
      playerPage.getByText(/waiting for host/i).first()
    ).toBeVisible({ timeout: 5000 });

    // Player should NOT see start button
    const playerStartButton = playerPage.getByRole("button", {
      name: /start game/i,
    });
    await expect(playerStartButton).not.toBeVisible();
  });

  test("can copy room code", async ({ hostUser }) => {
    const { page } = hostUser;

    // Create room
    await page.getByTestId("create-room-button").click();
    await page.waitForURL(/\/room\//, { timeout: 10000 });

    // Verify room code badge is visible
    const roomCodeBadge = page.getByTestId("room-code");
    await expect(roomCodeBadge).toBeVisible();

    // Click copy button (it should exist and be clickable)
    const copyButton = page.getByLabel(/copy code/i);
    await copyButton.click();

    // Verify click didn't cause an error - the button should still be visible
    await expect(copyButton).toBeVisible();
  });
});
