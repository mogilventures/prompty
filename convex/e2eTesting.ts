/**
 * E2E Testing utilities for automated browser tests.
 *
 * These internal functions allow for quick E2E test setup including:
 * - Creating test users with completed onboarding
 * - Mocking image generation (bypasses real AI)
 * - Test data cleanup
 *
 * ONLY use these functions in development/testing - never expose them publicly.
 */

import { internalMutation, internalQuery, httpAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Create a test user with completed onboarding.
 * This user can be authenticated via the Password provider.
 */
export const createE2ETestUser = internalMutation({
  args: {
    email: v.string(),
    displayName: v.string(),
    username: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      // Update existing user for test
      await ctx.db.patch(existingUser._id, {
        displayName: args.displayName,
        username: args.username,
        onboardingCompleted: true,
        isNewUser: false,
        lastActiveAt: Date.now(),
      });
      return { userId: existingUser._id };
    }

    // Create new test user with completed onboarding
    const userId = await ctx.db.insert("users", {
      email: args.email,
      displayName: args.displayName,
      username: args.username,
      onboardingCompleted: true,
      isNewUser: false,
      gamesPlayed: 0,
      gamesWon: 0,
      totalScore: 0,
      lastActiveAt: Date.now(),
    });

    return { userId };
  },
});

/**
 * Get test user by email.
 */
export const getE2ETestUser = internalQuery({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      username: v.optional(v.string()),
      displayName: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) return null;

    return {
      userId: user._id,
      username: user.username,
      displayName: user.displayName,
    };
  },
});

/**
 * Mock image generation for E2E tests.
 * Bypasses real AI and creates placeholder images.
 */
export const mockImageGenerationForE2E = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.object({
    success: v.boolean(),
    imageCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.currentRound === undefined) {
      return { success: false, imageCount: 0 };
    }

    // Get current round
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_and_number", (q) =>
        q.eq("roomId", args.roomId).eq("roundNumber", room.currentRound!)
      )
      .unique();

    if (!round) {
      return { success: false, imageCount: 0 };
    }

    // Only mock if in generating phase
    if (round.status !== "generating") {
      return { success: false, imageCount: 0 };
    }

    // Get all prompts for this round
    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect();

    // Create placeholder images for each prompt
    let imageCount = 0;
    for (const prompt of prompts) {
      // Check if image already exists
      const existingImage = await ctx.db
        .query("generatedImages")
        .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
        .unique();

      if (!existingImage) {
        await ctx.db.insert("generatedImages", {
          promptId: prompt._id,
          // Use picsum.photos for real placeholder images
          imageUrl: `https://picsum.photos/seed/${prompt._id}/512/512`,
          generatedAt: Date.now(),
          metadata: {
            model: "e2e-test/placeholder",
            timestamp: Date.now(),
            generatedAt: Date.now(),
          },
        });
        imageCount++;
      }
    }

    // Update generation counts to trigger phase transition
    await ctx.db.patch(round._id, {
      generationExpectedCount: prompts.length,
      generationCompletedCount: prompts.length,
    });

    // Cancel any scheduled transition and trigger immediate transition
    if (round.scheduledTransitionId) {
      try {
        await ctx.scheduler.cancel(round.scheduledTransitionId);
      } catch {
        // Ignore if already cancelled
      }
    }

    // Schedule immediate phase transition
    await ctx.scheduler.runAfter(100, internal.game.transitionPhase, {
      roundId: round._id,
    });

    return { success: true, imageCount };
  },
});

/**
 * Get room ID by room code (for E2E tests to find rooms).
 */
export const getRoomByCode = internalQuery({
  args: {
    code: v.string(),
  },
  returns: v.union(v.id("rooms"), v.null()),
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    return room?._id ?? null;
  },
});

/**
 * Clean up a test user and all associated data.
 */
export const cleanupE2ETestUser = internalMutation({
  args: {
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) return null;

    // Delete all players for this user
    const players = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const player of players) {
      // Delete votes by this player
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_voter", (q) => q.eq("voterId", player._id))
        .collect();
      for (const vote of votes) {
        await ctx.db.delete(vote._id);
      }

      // Delete prompts by this player
      const prompts = await ctx.db
        .query("prompts")
        .filter((q) => q.eq(q.field("playerId"), player._id))
        .collect();
      for (const prompt of prompts) {
        // Delete generated images for this prompt
        const images = await ctx.db
          .query("generatedImages")
          .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
          .collect();
        for (const image of images) {
          await ctx.db.delete(image._id);
        }
        await ctx.db.delete(prompt._id);
      }

      await ctx.db.delete(player._id);
    }

    // Delete auth accounts for this user
    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    // Delete auth sessions for this user
    const authSessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    for (const session of authSessions) {
      // Delete refresh tokens for this session
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .filter((q) => q.eq(q.field("sessionId"), session._id))
        .collect();
      for (const token of refreshTokens) {
        await ctx.db.delete(token._id);
      }
      await ctx.db.delete(session._id);
    }

    // Delete user settings
    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (userSettings) {
      await ctx.db.delete(userSettings._id);
    }

    // Finally delete the user
    await ctx.db.delete(user._id);

    return null;
  },
});

/**
 * Clean up test room and all associated data.
 */
export const cleanupE2ETestRoom = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;

    // Get all rounds for this room
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const round of rounds) {
      // Delete votes
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .collect();
      for (const vote of votes) {
        await ctx.db.delete(vote._id);
      }

      // Delete prompts and images
      const prompts = await ctx.db
        .query("prompts")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .collect();
      for (const prompt of prompts) {
        const images = await ctx.db
          .query("generatedImages")
          .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
          .collect();
        for (const image of images) {
          await ctx.db.delete(image._id);
        }
        await ctx.db.delete(prompt._id);
      }

      await ctx.db.delete(round._id);
    }

    // Delete players (but not users - they may be used in other tests)
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    for (const player of players) {
      await ctx.db.delete(player._id);
    }

    // Delete room
    await ctx.db.delete(args.roomId);

    return null;
  },
});
