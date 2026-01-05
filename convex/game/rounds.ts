/**
 * Game Rounds Module
 * Handles round progression and management.
 */
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { GAME_CONFIG } from "../lib/constants";
import { gameLog } from "../lib/logger";

const log = gameLog.rounds;

/**
 * Start next round
 */
export const startNextRound = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.currentRound) return null;

    const nextRoundNumber = room.currentRound + 1;

    // Get a different question card
    const previousRounds = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const usedCardIds = previousRounds.map((r) => r.questionCardId);

    const allActiveCards = await ctx.db
      .query("questionCards")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const availableCards = allActiveCards.filter((card) => !usedCardIds.includes(card._id));

    let questionCard =
      availableCards.length > 0
        ? availableCards[Math.floor(Math.random() * availableCards.length)]
        : (
            await ctx.db
              .query("questionCards")
              .withIndex("by_active", (q) => q.eq("isActive", true))
              .collect()
          )[0];

    // Fallback seeding if we somehow run out of cards
    if (!questionCard) {
      log.warn("no_question_cards_available", { roomId: args.roomId });
      await ctx.runMutation(internal.game.ensureQuestionCards, {});

      const fallbackCards = await ctx.db
        .query("questionCards")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();

      if (fallbackCards.length === 0) {
        throw new Error("Failed to seed question cards for next round");
      }

      questionCard = fallbackCards[Math.floor(Math.random() * fallbackCards.length)];
    }

    // Create new round
    const roundId = await ctx.db.insert("rounds", {
      roomId: args.roomId,
      roundNumber: nextRoundNumber,
      questionCardId: questionCard._id,
      status: "prompt",
      startedAt: Date.now(),
      phaseEndTime: Date.now() + GAME_CONFIG.PROMPT_PHASE_DURATION,
    });

    // Update room
    await ctx.db.patch(args.roomId, {
      currentRound: nextRoundNumber,
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

    log.info("next_round_started", {
      roomId: args.roomId,
      roundNumber: nextRoundNumber,
      roundId,
    });

    return null;
  },
});
