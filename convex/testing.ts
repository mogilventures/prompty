/**
 * Testing utilities for the game.
 *
 * These internal functions allow for quick testing and debugging of game scenarios
 * without needing real players or waiting for real timers.
 *
 * ONLY use these functions in development/testing - never expose them publicly.
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Test mode timing configuration (much faster than real game)
export const TEST_MODE_CONFIG = {
  PROMPT_PHASE_DURATION: 1000, // 1 second
  GENERATION_PHASE_DURATION: 1000, // 1 second
  VOTING_PHASE_DURATION: 1000, // 1 second
  RESULTS_PHASE_DURATION: 1000, // 1 second
} as const;

/**
 * Create a test room with simulated players.
 * Returns the room ID and player IDs for use in tests.
 */
export const createTestRoom = internalMutation({
  args: {
    playerCount: v.number(),
    hostName: v.optional(v.string()),
  },
  returns: v.object({
    roomId: v.id("rooms"),
    playerIds: v.array(v.id("players")),
    userIds: v.array(v.id("users")),
    roomCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const playerCount = Math.min(Math.max(args.playerCount, 2), 12);

    // Create test users
    const userIds: Id<"users">[] = [];
    for (let i = 0; i < playerCount; i++) {
      const userId = await ctx.db.insert("users", {
        displayName: `TestPlayer${i + 1}`,
        username: `testplayer${i + 1}_${Date.now()}`,
        onboardingCompleted: true,
        isNewUser: false,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      });
      userIds.push(userId);
    }

    // Generate room code
    const roomCodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let roomCode = "";
    for (let i = 0; i < 6; i++) {
      roomCode += roomCodeChars[Math.floor(Math.random() * roomCodeChars.length)];
    }

    // Create room
    const roomId = await ctx.db.insert("rooms", {
      code: roomCode,
      name: args.hostName ?? "Test Room",
      hostId: userIds[0],
      status: "waiting",
      settings: {
        maxPlayers: 8,
        roundsPerGame: 3, // Fewer rounds for testing
        timePerRound: 90,
        isPrivate: true,
        allowLateJoin: false,
      },
      createdAt: Date.now(),
    });

    // Create players
    const playerIds: Id<"players">[] = [];
    for (let i = 0; i < playerCount; i++) {
      const playerId = await ctx.db.insert("players", {
        roomId,
        userId: userIds[i],
        status: "connected",
        isHost: i === 0,
        score: 0,
        joinedAt: Date.now(),
        lastSeenAt: Date.now(),
      });
      playerIds.push(playerId);
    }

    return {
      roomId,
      playerIds,
      userIds,
      roomCode,
    };
  },
});

/**
 * Simulate a player submitting a prompt.
 */
export const simulateSubmitPrompt = internalMutation({
  args: {
    playerId: v.id("players"),
    roundId: v.id("rounds"),
    text: v.string(),
  },
  returns: v.id("prompts"),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");

    const round = await ctx.db.get(args.roundId);
    if (!round) throw new Error("Round not found");

    // Check if player already submitted
    const existingPrompt = await ctx.db
      .query("prompts")
      .withIndex("by_round_and_player", (q) =>
        q.eq("roundId", args.roundId).eq("playerId", args.playerId)
      )
      .unique();

    if (existingPrompt) {
      // Update existing prompt
      await ctx.db.patch(existingPrompt._id, {
        text: args.text,
        submittedAt: Date.now(),
      });
      return existingPrompt._id;
    }

    // Create new prompt
    const promptId = await ctx.db.insert("prompts", {
      roundId: args.roundId,
      playerId: args.playerId,
      text: args.text,
      submittedAt: Date.now(),
    });

    return promptId;
  },
});

/**
 * Simulate image generation without calling real AI.
 * Creates fake generated images for testing.
 */
export const simulateImageGeneration = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.array(v.id("generatedImages")),
  handler: async (ctx, args) => {
    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    const imageIds: Id<"generatedImages">[] = [];

    for (const prompt of prompts) {
      const imageId = await ctx.db.insert("generatedImages", {
        promptId: prompt._id,
        imageUrl: `https://placeholder.com/test-image-${prompt._id}`,
        generatedAt: Date.now(),
        metadata: {
          model: "test/placeholder",
          timestamp: Date.now(),
          generatedAt: Date.now(),
        },
      });
      imageIds.push(imageId);
    }

    // Update round generation counts
    await ctx.db.patch(args.roundId, {
      generationExpectedCount: prompts.length,
      generationCompletedCount: prompts.length,
    });

    return imageIds;
  },
});

/**
 * Simulate a player voting for an image.
 */
export const simulateSubmitVote = internalMutation({
  args: {
    voterId: v.id("players"),
    imageId: v.id("generatedImages"),
    roundId: v.id("rounds"),
  },
  returns: v.id("votes"),
  handler: async (ctx, args) => {
    // Check if player already voted
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_round_and_voter", (q) =>
        q.eq("roundId", args.roundId).eq("voterId", args.voterId)
      )
      .unique();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        imageId: args.imageId,
        submittedAt: Date.now(),
      });
      return existingVote._id;
    }

    // Create new vote
    const voteId = await ctx.db.insert("votes", {
      roundId: args.roundId,
      voterId: args.voterId,
      imageId: args.imageId,
      submittedAt: Date.now(),
    });

    return voteId;
  },
});

/**
 * Force a phase transition without waiting for timer.
 */
export const forcePhaseTransition = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.game.transitionPhase, {
      roundId: args.roundId,
    });
    return null;
  },
});

/**
 * Get the current test room state for assertions.
 */
export const getTestRoomState = internalQuery({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.object({
    room: v.object({
      status: v.string(),
      currentRound: v.optional(v.float64()),
    }),
    players: v.array(
      v.object({
        _id: v.id("players"),
        score: v.float64(),
        status: v.string(),
      })
    ),
    currentRound: v.optional(
      v.object({
        _id: v.id("rounds"),
        status: v.string(),
        roundNumber: v.float64(),
      })
    ),
    promptCount: v.float64(),
    imageCount: v.float64(),
    voteCount: v.float64(),
  }),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    let currentRound: {
      _id: Id<"rounds">;
      status: string;
      roundNumber: number;
    } | undefined = undefined;
    let promptCount = 0;
    let imageCount = 0;
    let voteCount = 0;

    const currentRoundNum = room.currentRound;
    if (currentRoundNum) {
      const round = await ctx.db
        .query("rounds")
        .withIndex("by_room_and_number", (q) =>
          q.eq("roomId", args.roomId).eq("roundNumber", currentRoundNum)
        )
        .unique();

      if (round) {
        currentRound = {
          _id: round._id,
          status: round.status,
          roundNumber: round.roundNumber,
        };

        const prompts = await ctx.db
          .query("prompts")
          .withIndex("by_round", (q) => q.eq("roundId", round._id))
          .collect();
        promptCount = prompts.length;

        for (const prompt of prompts) {
          const images = await ctx.db
            .query("generatedImages")
            .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
            .collect();
          imageCount += images.length;
        }

        const votes = await ctx.db
          .query("votes")
          .withIndex("by_round", (q) => q.eq("roundId", round._id))
          .collect();
        voteCount = votes.length;
      }
    }

    return {
      room: {
        status: room.status,
        currentRound: room.currentRound,
      },
      players: players.map((p) => ({
        _id: p._id,
        score: p.score,
        status: p.status,
      })),
      currentRound,
      promptCount,
      imageCount,
      voteCount,
    };
  },
});

/**
 * Clean up test data after a test run.
 */
export const cleanupTestRoom = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete all related data
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

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

    // Delete players and users
    for (const player of players) {
      const user = await ctx.db.get(player.userId);
      if (user?.username?.startsWith("testplayer")) {
        await ctx.db.delete(player.userId);
      }
      await ctx.db.delete(player._id);
    }

    // Delete room
    await ctx.db.delete(args.roomId);

    return null;
  },
});
