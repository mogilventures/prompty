/**
 * Game Lifecycle Module
 * Handles game start, initialization, and end operations.
 */
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { GAME_CONFIG } from "../lib/constants";
import { getAuthUserId } from "@convex-dev/auth/server";
import { gameLog } from "../lib/logger";

const log = gameLog.lifecycle;

/**
 * Start the game (called by host)
 */
export const startGame = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const user = await ctx.db.get(userId);
    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can start the game");
    }

    if (room.status !== "waiting") {
      throw new Error("Game already started");
    }

    // Check minimum players
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "connected"))
      .collect();

    if (players.length < 2) {
      throw new Error("Need at least 2 players to start");
    }

    // Update room status
    await ctx.db.patch(args.roomId, {
      status: "starting",
      startedAt: Date.now(),
      currentRound: 1,
    });

    // Schedule game initialization
    await ctx.scheduler.runAfter(0, internal.game.initializeGame, {
      roomId: args.roomId,
    });

    log.info("game_started", { roomId: args.roomId, playerCount: players.length });
    return null;
  },
});

/**
 * Internal function to ensure question cards exist
 */
export const ensureQuestionCards = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existingCards = await ctx.db
      .query("questionCards")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    if (existingCards.length > 0) {
      log.debug("question_cards_found", { count: existingCards.length });
      return null;
    }

    log.info("seeding_question_cards");

    // Call the existing seed function
    await ctx.runMutation(internal.admin.seedQuestionCardsInternal, {});

    return null;
  },
});

/**
 * Initialize the game (internal)
 */
export const initializeGame = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Ensure question cards exist before proceeding
    await ctx.runMutation(internal.game.ensureQuestionCards, {});

    // Get random question card (now guaranteed to exist)
    const questionCards = await ctx.db
      .query("questionCards")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // This should never happen now, but keep as safety check
    if (questionCards.length === 0) {
      throw new Error("Failed to seed question cards");
    }

    const randomCard = questionCards[Math.floor(Math.random() * questionCards.length)];

    // Create first round
    const roundId = await ctx.db.insert("rounds", {
      roomId: args.roomId,
      roundNumber: 1,
      questionCardId: randomCard._id,
      status: "prompt",
      startedAt: Date.now(),
      phaseEndTime: Date.now() + GAME_CONFIG.PROMPT_PHASE_DURATION,
    });

    // Update room status
    await ctx.db.patch(args.roomId, {
      status: "playing",
    });

    // Schedule phase transition and store job ID for potential cancellation
    const scheduledJobId = await ctx.scheduler.runAt(
      Date.now() + GAME_CONFIG.PROMPT_PHASE_DURATION,
      internal.game.transitionPhase,
      { roundId }
    );

    // Store the scheduled job ID in the round for early progression
    await ctx.db.patch(roundId, {
      scheduledTransitionId: scheduledJobId,
    });

    log.info("game_initialized", { roomId: args.roomId, roundId });
    return null;
  },
});

/**
 * End the game
 */
export const endGame = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;

    // Update room status
    await ctx.db.patch(args.roomId, {
      status: "finished",
      finishedAt: Date.now(),
    });

    log.info("game_ended", { roomId: args.roomId });
    return null;
  },
});
