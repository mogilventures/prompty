/**
 * E2E Test Helper Functions for Convex
 *
 * These functions call the E2E HTTP endpoints on the Convex backend
 * to mock image generation, get room state, and force phase transitions.
 */

// Get the Convex HTTP URL from environment or use default
function getConvexHttpUrl(): string {
  // For E2E tests, we use the Convex site URL for HTTP endpoints
  // HTTP routes are served from .convex.site, not .convex.cloud
  const convexUrl =
    process.env.VITE_CONVEX_URL || "https://judicious-spaniel-983.convex.cloud";
  // Convert .convex.cloud to .convex.site for HTTP endpoints
  return convexUrl.replace(".convex.cloud", ".convex.site");
}

export interface MockImageResult {
  success: boolean;
  imageCount: number;
}

export interface RoomState {
  room: {
    status: string;
    currentRound?: number;
  };
  players: Array<{
    _id: string;
    score: number;
    status: string;
  }>;
  currentRound?: {
    _id: string;
    status: string;
    roundNumber: number;
  };
  promptCount: number;
  imageCount: number;
  voteCount: number;
}

/**
 * Mock image generation for a room.
 * Bypasses real AI and creates placeholder images for all prompts.
 */
export async function mockImageGeneration(
  roomCode: string
): Promise<MockImageResult> {
  const response = await fetch(`${getConvexHttpUrl()}/e2e/mock-images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:8080",
      "x-e2e-test": "true", // Marker for E2E test requests
    },
    body: JSON.stringify({ roomCode: roomCode.toUpperCase() }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to mock images: ${response.status} - ${text}`);
  }

  return response.json();
}

/**
 * Get the current state of a room for assertions.
 */
export async function getRoomState(roomCode: string): Promise<RoomState> {
  const response = await fetch(
    `${getConvexHttpUrl()}/e2e/room-state?code=${roomCode.toUpperCase()}`,
    {
      headers: {
        Origin: "http://localhost:8080",
        "x-e2e-test": "true",
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get room state: ${response.status} - ${text}`);
  }

  return response.json();
}

/**
 * Force a phase transition for the current round.
 * Useful for speeding up tests without waiting for timers.
 */
export async function forcePhaseTransition(roomCode: string): Promise<void> {
  const response = await fetch(`${getConvexHttpUrl()}/e2e/force-transition`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:8080",
      "x-e2e-test": "true",
    },
    body: JSON.stringify({ roomCode: roomCode.toUpperCase() }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to force transition: ${response.status} - ${text}`
    );
  }
}

/**
 * Wait for a room to reach a specific phase.
 * Polls the room state until the target phase is reached or timeout.
 */
export async function waitForPhase(
  roomCode: string,
  targetPhase: string,
  timeoutMs = 30000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const state = await getRoomState(roomCode);

      if (state.currentRound?.status === targetPhase) {
        return;
      }

      // Log current state for debugging
      console.log(
        `[waitForPhase] Current: ${state.currentRound?.status}, waiting for: ${targetPhase}`
      );
    } catch (error) {
      console.log(`[waitForPhase] Error getting state:`, error);
    }

    // Poll every 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Timeout waiting for phase: ${targetPhase} after ${timeoutMs}ms`
  );
}

/**
 * Wait for vote count to reach expected value.
 * Useful for verifying votes were registered.
 */
export async function waitForVoteCount(
  roomCode: string,
  expectedCount: number,
  timeoutMs = 10000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const state = await getRoomState(roomCode);

      if (state.voteCount >= expectedCount) {
        console.log(
          `[waitForVoteCount] Vote count reached: ${state.voteCount}`
        );
        return;
      }

      console.log(
        `[waitForVoteCount] Current: ${state.voteCount}, waiting for: ${expectedCount}`
      );
    } catch (error) {
      console.log(`[waitForVoteCount] Error getting state:`, error);
    }

    // Poll every 300ms
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(
    `Timeout waiting for vote count: ${expectedCount} after ${timeoutMs}ms`
  );
}
