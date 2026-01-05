/**
 * Game Phases Module
 * Handles phase transitions and timing logic.
 */
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { GAME_CONFIG } from "../lib/constants";
import { gameLog } from "../lib/logger";

const log = gameLog.phases;

/**
 * Helper function to get expected phase duration
 */
export function getPhaseDuration(status: string): number {
  switch (status) {
    case "prompt":
      return GAME_CONFIG.PROMPT_PHASE_DURATION;
    case "generating":
      return GAME_CONFIG.GENERATION_PHASE_DURATION;
    case "voting":
      return GAME_CONFIG.VOTING_PHASE_DURATION;
    case "results":
      return GAME_CONFIG.RESULTS_PHASE_DURATION;
    default:
      return 0;
  }
}

/**
 * Transition game phases
 */
export const transitionPhase = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    log.info("transition_started", { roundId: args.roundId });

    const round = await ctx.db.get(args.roundId);
    if (!round) {
      log.warn("round_not_found", { roundId: args.roundId });
      return null;
    }

    log.debug("current_status", { roundId: args.roundId, status: round.status });

    // Prevent race condition: don't transition if the phase JUST started
    const MINIMUM_PHASE_DURATION_MS = 1000; // 1 second minimum
    if (round.phaseEndTime && round.status !== "generating" && round.status !== "complete") {
      const phaseDuration = getPhaseDuration(round.status);
      const phaseStartTime = round.phaseEndTime - phaseDuration;
      const timeInPhase = Date.now() - phaseStartTime;

      if (timeInPhase < MINIMUM_PHASE_DURATION_MS) {
        log.warn("duplicate_transition_ignored", {
          roundId: args.roundId,
          status: round.status,
          timeInPhaseMs: timeInPhase,
        });
        return null;
      }
    }

    // Clear the scheduled transition ID to indicate this transition is being processed
    if (round.scheduledTransitionId) {
      await ctx.db.patch(args.roundId, {
        scheduledTransitionId: undefined,
      });
      log.debug("cleared_scheduled_transition", { roundId: args.roundId });
    }

    switch (round.status) {
      case "prompt": {
        // Get prompt count for tracking generation progress
        const prompts = await ctx.db
          .query("prompts")
          .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
          .collect();

        // Move to generating phase
        await ctx.db.patch(args.roundId, {
          status: "generating",
          phaseEndTime: Date.now() + GAME_CONFIG.GENERATION_PHASE_DURATION,
          generationStartedAt: Date.now(),
          generationExpectedCount: prompts.length,
          generationCompletedCount: 0,
        });

        log.info("transitioning_to_generating", {
          roundId: args.roundId,
          promptCount: prompts.length,
        });

        // Use verification mechanism to ensure prompts exist before generation
        await ctx.scheduler.runAfter(1000, internal.game.verifyAndTriggerGeneration, {
          roundId: args.roundId,
          retryCount: 0,
        });

        // Schedule next transition and store job ID for potential cancellation
        const generatingScheduledJobId = await ctx.scheduler.runAt(
          Date.now() + GAME_CONFIG.GENERATION_PHASE_DURATION,
          internal.game.transitionPhase,
          { roundId: args.roundId }
        );

        await ctx.db.patch(args.roundId, {
          scheduledTransitionId: generatingScheduledJobId,
        });
        break;
      }

      case "generating": {
        // Move to voting phase
        await ctx.db.patch(args.roundId, {
          status: "voting",
          phaseEndTime: Date.now() + GAME_CONFIG.VOTING_PHASE_DURATION,
        });

        log.info("transitioning_to_voting", { roundId: args.roundId });

        // Schedule next transition
        const votingScheduledJobId = await ctx.scheduler.runAt(
          Date.now() + GAME_CONFIG.VOTING_PHASE_DURATION,
          internal.game.transitionPhase,
          { roundId: args.roundId }
        );

        await ctx.db.patch(args.roundId, {
          scheduledTransitionId: votingScheduledJobId,
        });
        break;
      }

      case "voting": {
        // Move to results phase
        await ctx.db.patch(args.roundId, {
          status: "results",
          phaseEndTime: Date.now() + GAME_CONFIG.RESULTS_PHASE_DURATION,
        });

        log.info("transitioning_to_results", { roundId: args.roundId });

        // Calculate scores
        await ctx.scheduler.runAfter(0, internal.game.calculateScores, {
          roundId: args.roundId,
        });

        // Schedule next transition
        const resultsScheduledJobId = await ctx.scheduler.runAt(
          Date.now() + GAME_CONFIG.RESULTS_PHASE_DURATION,
          internal.game.transitionPhase,
          { roundId: args.roundId }
        );

        await ctx.db.patch(args.roundId, {
          scheduledTransitionId: resultsScheduledJobId,
        });
        break;
      }

      case "results": {
        // Mark round as complete
        await ctx.db.patch(args.roundId, {
          status: "complete",
          endedAt: Date.now(),
        });

        log.info("round_complete", { roundId: args.roundId });

        // Check if more rounds or end game
        const room = await ctx.db.get(round.roomId);
        if (room && room.currentRound && room.currentRound < room.settings.roundsPerGame) {
          // Start next round
          await ctx.scheduler.runAfter(2000, internal.game.startNextRound, {
            roomId: round.roomId,
          });
        } else {
          // End game
          await ctx.scheduler.runAfter(0, internal.game.endGame, {
            roomId: round.roomId,
          });
        }
        break;
      }
    }

    return null;
  },
});
