/**
 * Game Prompts Module
 * Handles prompt submission and tracking.
 */
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { gameLog } from "../lib/logger";

const log = gameLog.prompts;

/**
 * Submit a prompt
 */
export const submitPrompt = mutation({
  args: {
    roomId: v.id("rooms"),
    prompt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    log.info("submission_started", { roomId: args.roomId });

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate prompt with better error messages and consistent limits
    const trimmedPrompt = args.prompt.trim();

    if (trimmedPrompt.length < 3) {
      throw new Error("Prompt must be at least 3 characters long");
    }
    if (trimmedPrompt.length > 200) {
      throw new Error("Prompt must be less than 200 characters");
    }

    const promptToUse = trimmedPrompt;

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Get current round
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.currentRound) {
      throw new Error("No active round");
    }
    const currentRoundNumber = room.currentRound;

    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_and_number", (q) =>
        q.eq("roomId", args.roomId).eq("roundNumber", currentRoundNumber)
      )
      .unique();

    if (!round || round.status !== "prompt") {
      throw new Error("Not in prompt phase");
    }

    // Get player
    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .unique();

    if (!player) throw new Error("Player not in room");

    // Check if already submitted
    const existing = await ctx.db
      .query("prompts")
      .withIndex("by_round_and_player", (q) =>
        q.eq("roundId", round._id).eq("playerId", player._id)
      )
      .unique();

    if (existing) {
      // Update existing prompt
      await ctx.db.patch(existing._id, {
        text: promptToUse,
        submittedAt: Date.now(),
      });
      log.info("prompt_updated", { promptId: existing._id, playerId: player._id });
    } else {
      // Create new prompt
      const newPromptId = await ctx.db.insert("prompts", {
        roundId: round._id,
        playerId: player._id,
        text: promptToUse,
        submittedAt: Date.now(),
      });
      log.info("prompt_created", { promptId: newPromptId, playerId: player._id });
    }

    // Check if all players have submitted and trigger early transition if so
    await ctx.scheduler.runAfter(0, internal.game.checkAllPlayersSubmitted, {
      roundId: round._id,
    });

    log.info("submission_complete", { roomId: args.roomId, playerId: player._id });
    return null;
  },
});

/**
 * Check if all connected players have submitted prompts and trigger early transition
 */
export const checkAllPlayersSubmitted = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    log.debug("checking_submissions", { roundId: args.roundId });

    const round = await ctx.db.get(args.roundId);
    if (!round || round.status !== "prompt") {
      log.debug("not_in_prompt_phase", { roundId: args.roundId, status: round?.status });
      return null;
    }

    // Get all connected players in the room
    const connectedPlayers = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", round.roomId))
      .filter((q) => q.eq(q.field("status"), "connected"))
      .collect();

    if (connectedPlayers.length === 0) {
      log.warn("no_connected_players", { roundId: args.roundId });
      return null;
    }

    // Get all prompts submitted for this round
    const submittedPrompts = await ctx.db
      .query("prompts")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    // Create a set of player IDs who have submitted
    const submittedPlayerIds = new Set(submittedPrompts.map((prompt) => prompt.playerId));

    // Check if all connected players have submitted
    const allPlayersSubmitted = connectedPlayers.every((player) =>
      submittedPlayerIds.has(player._id)
    );

    log.debug("submission_status", {
      roundId: args.roundId,
      connectedPlayers: connectedPlayers.length,
      submittedPrompts: submittedPrompts.length,
      allSubmitted: allPlayersSubmitted,
    });

    if (allPlayersSubmitted) {
      log.info("all_players_submitted", {
        roundId: args.roundId,
        playerCount: connectedPlayers.length,
      });

      // Cancel the scheduled transition if it exists
      if (round.scheduledTransitionId) {
        try {
          await ctx.scheduler.cancel(round.scheduledTransitionId);
          log.debug("cancelled_scheduled_transition", { roundId: args.roundId });
        } catch (error) {
          log.warn("could_not_cancel_transition", { roundId: args.roundId, error });
        }
      }

      // Clear the scheduled transition ID to prevent race conditions
      await ctx.db.patch(args.roundId, {
        scheduledTransitionId: undefined,
      });

      // Trigger immediate transition to next phase
      await ctx.scheduler.runAfter(0, internal.game.transitionPhase, {
        roundId: args.roundId,
      });

      log.info("early_transition_scheduled", { roundId: args.roundId });
    }

    return null;
  },
});
