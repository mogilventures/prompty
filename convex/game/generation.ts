/**
 * Game Generation Module
 * Handles AI image generation tracking and progress.
 */
import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { gameLog } from "../lib/logger";

const log = gameLog.generation;

/**
 * Store a successfully generated image
 */
export const storeGeneratedImage = internalMutation({
  args: {
    promptId: v.id("prompts"),
    imageUrl: v.string(),
    storageId: v.id("_storage"),
    generatedAt: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        model: v.string(),
        seed: v.optional(v.number()),
        inference_steps: v.optional(v.number()),
        generatedAt: v.optional(v.number()),
        timestamp: v.optional(v.number()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Store the generated image
    await ctx.db.insert("generatedImages", {
      promptId: args.promptId,
      imageUrl: args.imageUrl,
      storageId: args.storageId,
      metadata: args.metadata,
      generatedAt: args.generatedAt || Date.now(),
    });

    // Get the prompt to find the round and increment progress
    const prompt = await ctx.db.get(args.promptId);
    if (prompt) {
      await ctx.runMutation(internal.game.incrementGenerationProgress, {
        roundId: prompt.roundId,
      });
    }

    log.info("image_stored", { promptId: args.promptId });
    return null;
  },
});

/**
 * Store an image generation error with fallback
 */
export const storeImageError = internalMutation({
  args: {
    promptId: v.id("prompts"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Use a fallback image with error message
    await ctx.db.insert("generatedImages", {
      promptId: args.promptId,
      imageUrl: `/placeholder.svg?text=${encodeURIComponent("Error: " + args.error.substring(0, 20))}`,
      error: args.error,
      generatedAt: Date.now(),
    });

    // Get the prompt to find the round and increment progress
    const prompt = await ctx.db.get(args.promptId);
    if (prompt) {
      await ctx.runMutation(internal.game.incrementGenerationProgress, {
        roundId: prompt.roundId,
      });
    }

    log.error("image_error_stored", args.error, { promptId: args.promptId });
    return null;
  },
});

/**
 * Mark generation as complete for a round
 */
export const markGenerationComplete = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roundId, {
      generationCompletedAt: Date.now(),
    });

    // Check for early transition opportunity
    await ctx.runMutation(internal.game.checkAllImagesGenerated, {
      roundId: args.roundId,
    });

    log.info("generation_marked_complete", { roundId: args.roundId });
    return null;
  },
});

/**
 * Mark generation as failed for a round
 */
export const markGenerationFailed = internalMutation({
  args: {
    roundId: v.id("rounds"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roundId, {
      generationError: args.error,
      generationCompletedAt: Date.now(),
    });
    log.error("generation_failed", args.error, { roundId: args.roundId });
    return null;
  },
});

/**
 * Progress tracking for early generation phase completion
 */
export const incrementGenerationProgress = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round || round.status !== "generating") {
      log.debug("not_in_generating_phase", { roundId: args.roundId });
      return null;
    }

    const newCount = (round.generationCompletedCount || 0) + 1;
    await ctx.db.patch(args.roundId, {
      generationCompletedCount: newCount,
    });

    log.info("progress_incremented", {
      roundId: args.roundId,
      completed: newCount,
      expected: round.generationExpectedCount || 0,
    });

    // Check if all images are complete
    await ctx.runMutation(internal.game.checkAllImagesGenerated, {
      roundId: args.roundId,
    });

    return null;
  },
});

/**
 * Check if all images have been generated and trigger early transition
 */
export const checkAllImagesGenerated = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round || round.status !== "generating") {
      log.debug("not_in_generating_phase", { roundId: args.roundId });
      return null;
    }

    const expected = round.generationExpectedCount || 0;
    const completed = round.generationCompletedCount || 0;

    log.debug("checking_generation_status", {
      roundId: args.roundId,
      completed,
      expected,
    });

    // Check if all images are done (including errors)
    if (expected > 0 && completed >= expected) {
      log.info("all_images_generated", { roundId: args.roundId });

      // Cancel scheduled transition if it exists
      if (round.scheduledTransitionId) {
        try {
          await ctx.scheduler.cancel(round.scheduledTransitionId);
          log.debug("cancelled_scheduled_transition", { roundId: args.roundId });
        } catch (error) {
          log.warn("could_not_cancel_transition", { roundId: args.roundId, error });
        }

        await ctx.db.patch(args.roundId, {
          scheduledTransitionId: undefined,
          generationCompletedAt: Date.now(),
        });
      }

      // Trigger immediate transition to voting with a small delay
      await ctx.scheduler.runAfter(500, internal.game.transitionPhase, {
        roundId: args.roundId,
      });
      log.info("early_transition_scheduled", { roundId: args.roundId });
    }

    return null;
  },
});

/**
 * Verify prompts exist and trigger AI generation with retry mechanism
 */
export const verifyAndTriggerGeneration = internalMutation({
  args: {
    roundId: v.id("rounds"),
    retryCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const retryCount = args.retryCount || 0;
    const maxRetries = 3;

    log.info("verify_generation", {
      roundId: args.roundId,
      attempt: retryCount + 1,
      maxRetries,
    });

    // Check if prompts exist using the same query as AI generation
    const prompts = await ctx.runQuery(internal.game.getPromptsForRound, {
      roundId: args.roundId,
    });

    if (prompts.length > 0) {
      // Prompts found! Trigger AI generation
      log.info("prompts_found_triggering_ai", {
        roundId: args.roundId,
        promptCount: prompts.length,
      });
      await ctx.scheduler.runAfter(0, internal.ai.generateAIImages, {
        roundId: args.roundId,
      });
    } else if (retryCount < maxRetries) {
      // No prompts found, retry after delay
      const delayMs = (retryCount + 1) * 1000;
      log.warn("no_prompts_retrying", {
        roundId: args.roundId,
        attempt: retryCount + 1,
        delayMs,
      });

      await ctx.scheduler.runAfter(delayMs, internal.game.verifyAndTriggerGeneration, {
        roundId: args.roundId,
        retryCount: retryCount + 1,
      });
    } else {
      // Max retries reached, mark generation as failed
      log.error("max_retries_reached", "No prompts found after max retries", {
        roundId: args.roundId,
        maxRetries,
      });

      // Mark the round as having a generation error
      await ctx.db.patch(args.roundId, {
        generationError: `No prompts found after ${maxRetries} retry attempts`,
        generationCompletedAt: Date.now(),
        generationExpectedCount: 0,
        generationCompletedCount: 0,
      });

      // Transition to voting phase anyway
      await ctx.scheduler.runAfter(2000, internal.game.transitionPhase, {
        roundId: args.roundId,
      });
    }

    return null;
  },
});

/**
 * Get round data including question card
 */
export const getRoundData = internalQuery({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("rounds"),
      questionCardId: v.id("questionCards"),
      questionText: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) return null;

    const questionCard = await ctx.db.get(round.questionCardId);
    if (!questionCard) return null;

    return {
      _id: round._id,
      questionCardId: round.questionCardId,
      questionText: questionCard.text,
    };
  },
});

/**
 * Get all prompts for a round
 */
export const getPromptsForRound = internalQuery({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.array(
    v.object({
      _id: v.id("prompts"),
      _creationTime: v.number(),
      text: v.string(),
      playerId: v.id("players"),
      roundId: v.id("rounds"),
      submittedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    log.debug("retrieving_prompts", { roundId: args.roundId });

    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    log.debug("prompts_retrieved", {
      roundId: args.roundId,
      count: prompts.length,
    });

    return prompts;
  },
});
