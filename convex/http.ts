import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const http = httpRouter();

// Add authentication routes
auth.addHttpRoutes(http);

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("OK", { status: 200 });
  }),
});

// =============================================================================
// E2E Testing Endpoints (development only)
// =============================================================================

/**
 * Helper to check if request is from E2E test or localhost (for security).
 * In production, these endpoints will return 404.
 */
function isE2ERequest(req: Request): boolean {
  const origin = req.headers.get("origin") || "";
  const host = req.headers.get("host") || "";
  const e2eToken = req.headers.get("x-e2e-test") || "";

  // Allow requests with E2E test marker header
  if (e2eToken === "true") {
    return true;
  }

  // Also allow localhost requests (for local development)
  return (
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    host.includes("localhost") ||
    host.includes("127.0.0.1")
  );
}

/**
 * POST /e2e/mock-images
 * Mock image generation for E2E tests. Bypasses real AI.
 */
http.route({
  path: "/e2e/mock-images",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // Guard against production use
    if (!isE2ERequest(req)) {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const body = await req.json();
      const roomCode = body.roomCode as string;

      if (!roomCode) {
        return new Response(
          JSON.stringify({ error: "Missing roomCode" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get room ID by code
      const roomId = await ctx.runQuery(internal.e2eTesting.getRoomByCode, {
        code: roomCode.toUpperCase(),
      });

      if (!roomId) {
        return new Response(
          JSON.stringify({ error: "Room not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Mock the images
      const result = await ctx.runMutation(
        internal.e2eTesting.mockImageGenerationForE2E,
        { roomId }
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /e2e/room-state?code=XXXX
 * Get current room state for E2E test assertions.
 */
http.route({
  path: "/e2e/room-state",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    // Guard against production use
    if (!isE2ERequest(req)) {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");

      if (!code) {
        return new Response(
          JSON.stringify({ error: "Missing code parameter" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get room ID by code
      const roomId = await ctx.runQuery(internal.e2eTesting.getRoomByCode, {
        code: code.toUpperCase(),
      });

      if (!roomId) {
        return new Response(
          JSON.stringify({ error: "Room not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get room state
      const state = await ctx.runQuery(internal.testing.getTestRoomState, {
        roomId,
      });

      return new Response(JSON.stringify(state), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /e2e/force-transition
 * Force phase transition for current round (skip timers).
 */
http.route({
  path: "/e2e/force-transition",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // Guard against production use
    if (!isE2ERequest(req)) {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const body = await req.json();
      const roomCode = body.roomCode as string;

      if (!roomCode) {
        return new Response(
          JSON.stringify({ error: "Missing roomCode" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get room ID by code
      const roomId = await ctx.runQuery(internal.e2eTesting.getRoomByCode, {
        code: roomCode.toUpperCase(),
      });

      if (!roomId) {
        return new Response(
          JSON.stringify({ error: "Room not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get current round
      const state = await ctx.runQuery(internal.testing.getTestRoomState, {
        roomId,
      });

      if (!state.currentRound) {
        return new Response(
          JSON.stringify({ error: "No active round" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Force transition
      await ctx.runMutation(internal.testing.forcePhaseTransition, {
        roundId: state.currentRound._id,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;