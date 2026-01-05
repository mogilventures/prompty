/**
 * Game Voting Module
 * Handles vote submission and tracking.
 */
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { gameLog } from "../lib/logger";
import {
  calculateVotingEligibility,
  haveAllEligiblePlayersVoted,
} from "../lib/gameLogic";

const log = gameLog.voting;

/**
 * Submit a vote
 */
export const submitVote = mutation({
  args: {
    roomId: v.id("rooms"),
    imageId: v.id("generatedImages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    log.info("vote_started", { roomId: args.roomId, imageId: args.imageId });

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get player
    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .unique();
    if (!player) {
      throw new Error("Player not in room");
    }

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

    if (!round || round.status !== "voting") {
      throw new Error(`Not in voting phase (current phase: ${round?.status || "unknown"})`);
    }

    // Verify image belongs to this round
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }

    const prompt = await ctx.db.get(image.promptId);
    if (!prompt || prompt.roundId !== round._id) {
      throw new Error("Invalid image for this round");
    }

    // Can't vote for own image
    if (prompt.playerId === player._id) {
      throw new Error("Cannot vote for your own image");
    }

    log.debug("vote_validated", { playerId: player._id, imageId: args.imageId });

    // Check if already voted
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_round_and_voter", (q) =>
        q.eq("roundId", round._id).eq("voterId", player._id)
      )
      .unique();

    if (existingVote) {
      // Update vote
      await ctx.db.patch(existingVote._id, {
        imageId: args.imageId,
        submittedAt: Date.now(),
      });
      log.info("vote_updated", { voteId: existingVote._id, playerId: player._id });
    } else {
      // Create new vote
      const voteId = await ctx.db.insert("votes", {
        roundId: round._id,
        voterId: player._id,
        imageId: args.imageId,
        submittedAt: Date.now(),
      });
      log.info("vote_created", { voteId, playerId: player._id });
    }

    // Check if all players have voted and trigger early transition if so
    await ctx.scheduler.runAfter(0, internal.game.checkAllPlayersVoted, {
      roundId: round._id,
    });

    log.info("vote_complete", { playerId: player._id });
    return null;
  },
});

/**
 * Check if all connected players have voted and trigger early transition
 */
export const checkAllPlayersVoted = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    log.debug("checking_votes", { roundId: args.roundId });

    const round = await ctx.db.get(args.roundId);
    if (!round || round.status !== "voting") {
      log.debug("not_in_voting_phase", { roundId: args.roundId, status: round?.status });
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

    // Get all prompts for this round to determine voting eligibility
    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    // Get all images generated for this round
    const images = await Promise.all(
      prompts.map(async (prompt) => {
        const imgs = await ctx.db
          .query("generatedImages")
          .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
          .collect();
        return { prompt, images: imgs };
      })
    );

    // Check if there are any images to vote on
    const totalImages = images.reduce((sum, item) => sum + item.images.length, 0);
    if (totalImages === 0) {
      log.warn("no_images_to_vote", { roundId: args.roundId });
      return null;
    }

    // Get all votes submitted for this round
    const submittedVotes = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    // Use extracted pure functions for eligibility calculation
    const eligibility = calculateVotingEligibility(connectedPlayers, prompts);
    const eligibleVoters = eligibility.filter((e) => e.isEligible).length;
    const allEligibleVoted = haveAllEligiblePlayersVoted(eligibility, submittedVotes);

    log.debug("vote_status", {
      roundId: args.roundId,
      totalImages,
      eligibleVoters,
      votesSubmitted: submittedVotes.length,
      allVoted: allEligibleVoted,
    });

    if (allEligibleVoted) {
      log.info("all_players_voted", {
        roundId: args.roundId,
        eligibleVoters,
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

      // Trigger immediate transition to results phase
      await ctx.scheduler.runAfter(0, internal.game.transitionPhase, {
        roundId: args.roundId,
      });

      log.info("early_transition_scheduled", { roundId: args.roundId });
    }

    return null;
  },
});
