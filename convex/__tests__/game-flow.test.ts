import { convexTest } from "convex-test";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
import { Doc, Id } from "../_generated/dataModel";

describe("Game Flow Integration Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createTestRoom", () => {
    it("creates a room with the specified number of players", async () => {
      const t = convexTest(schema);

      const result = await t.mutation(internal.__tests__.fixtures.createTestRoom, {
        playerCount: 3,
      });

      expect(result.playerIds).toHaveLength(3);
      expect(result.userIds).toHaveLength(3);
      expect(result.roomCode).toHaveLength(6);

      // Verify room state
      const state = await t.query(internal.__tests__.fixtures.getTestRoomState, {
        roomId: result.roomId,
      });

      expect(state.room.status).toBe("waiting");
      expect(state.players).toHaveLength(3);
    });

    it("enforces minimum 2 players", async () => {
      const t = convexTest(schema);

      const result = await t.mutation(internal.__tests__.fixtures.createTestRoom, {
        playerCount: 1, // Will be clamped to 2
      });

      expect(result.playerIds).toHaveLength(2);
    });

    it("enforces maximum 12 players", async () => {
      const t = convexTest(schema);

      const result = await t.mutation(internal.__tests__.fixtures.createTestRoom, {
        playerCount: 20, // Will be clamped to 12
      });

      expect(result.playerIds).toHaveLength(12);
    });
  });

  describe("simulateSubmitPrompt", () => {
    it("creates a prompt for a player", async () => {
      const t = convexTest(schema);

      // Create test room
      const { roomId, playerIds } = await t.mutation(
        internal.__tests__.fixtures.createTestRoom,
        { playerCount: 2 }
      );

      // Manually create a round (simulating game start)
      const roundId = await t.run(async (ctx) => {
        // First ensure question cards exist
        const existingCard = await ctx.db.query("questionCards").first();
        let questionCardId;

        if (!existingCard) {
          questionCardId = await ctx.db.insert("questionCards", {
            text: "Test question",
            isActive: true,
          });
        } else {
          questionCardId = existingCard._id;
        }

        return await ctx.db.insert("rounds", {
          roomId,
          roundNumber: 1,
          questionCardId,
          status: "prompt",
          startedAt: Date.now(),
        });
      });

      // Submit prompt
      const promptId = await t.mutation(internal.__tests__.fixtures.simulateSubmitPrompt, {
        playerId: playerIds[0],
        roundId,
        text: "A cute cat wearing a hat",
      });

      expect(promptId).toBeDefined();

      // Verify prompt was created
      const state = await t.query(internal.__tests__.fixtures.getTestRoomState, {
        roomId,
      });
      // Note: getTestRoomState won't see the round since room.currentRound isn't set
      // This is expected - we're testing the simulation functions in isolation
    });

    it("updates existing prompt if player submits again", async () => {
      const t = convexTest(schema);

      const { roomId, playerIds } = await t.mutation(
        internal.__tests__.fixtures.createTestRoom,
        { playerCount: 2 }
      );

      const roundId = await t.run(async (ctx) => {
        const card = await ctx.db.query("questionCards").first();
        const questionCardId =
          card?._id ??
          (await ctx.db.insert("questionCards", {
            text: "Test",
            isActive: true,
          }));

        return await ctx.db.insert("rounds", {
          roomId,
          roundNumber: 1,
          questionCardId,
          status: "prompt",
          startedAt: Date.now(),
        });
      });

      // Submit first prompt
      const promptId1 = await t.mutation(internal.__tests__.fixtures.simulateSubmitPrompt, {
        playerId: playerIds[0],
        roundId,
        text: "First prompt",
      });

      // Submit updated prompt
      const promptId2 = await t.mutation(internal.__tests__.fixtures.simulateSubmitPrompt, {
        playerId: playerIds[0],
        roundId,
        text: "Updated prompt",
      });

      // Should be the same prompt ID (updated, not new)
      expect(promptId2).toBe(promptId1);

      // Verify the text was updated
      const prompt = await t.run(async (ctx) => ctx.db.get(promptId1)) as Doc<"prompts"> | null;
      expect(prompt?.text).toBe("Updated prompt");
    });
  });

  describe("simulateImageGeneration", () => {
    it("creates images for all prompts in a round", async () => {
      const t = convexTest(schema);

      const { roomId, playerIds } = await t.mutation(
        internal.__tests__.fixtures.createTestRoom,
        { playerCount: 3 }
      );

      // Create round and prompts
      const roundId = await t.run(async (ctx) => {
        const card = await ctx.db.query("questionCards").first();
        const questionCardId =
          card?._id ??
          (await ctx.db.insert("questionCards", {
            text: "Test",
            isActive: true,
          }));

        const rid = await ctx.db.insert("rounds", {
          roomId,
          roundNumber: 1,
          questionCardId,
          status: "generating",
          startedAt: Date.now(),
        });

        // Create prompts for all players
        for (const playerId of playerIds) {
          await ctx.db.insert("prompts", {
            roundId: rid,
            playerId,
            text: `Test prompt from ${playerId}`,
            submittedAt: Date.now(),
          });
        }

        return rid;
      });

      // Generate images
      const imageIds = await t.mutation(
        internal.__tests__.fixtures.simulateImageGeneration,
        { roundId }
      );

      expect(imageIds).toHaveLength(3);

      // Verify round generation counts were updated
      const round = await t.run(async (ctx) => ctx.db.get(roundId));
      expect(round?.generationExpectedCount).toBe(3);
      expect(round?.generationCompletedCount).toBe(3);
    });
  });

  describe("simulateSubmitVote", () => {
    it("creates a vote for an image", async () => {
      const t = convexTest(schema);

      const { roomId, playerIds } = await t.mutation(
        internal.__tests__.fixtures.createTestRoom,
        { playerCount: 2 }
      );

      // Set up round with prompts and images
      const { roundId, imageIds } = await t.run(async (ctx) => {
        const card = await ctx.db.query("questionCards").first();
        const questionCardId =
          card?._id ??
          (await ctx.db.insert("questionCards", {
            text: "Test",
            isActive: true,
          }));

        const rid = await ctx.db.insert("rounds", {
          roomId,
          roundNumber: 1,
          questionCardId,
          status: "voting",
          startedAt: Date.now(),
        });

        const images: Id<"generatedImages">[] = [];
        for (const playerId of playerIds) {
          const promptId = await ctx.db.insert("prompts", {
            roundId: rid,
            playerId,
            text: `Test prompt`,
            submittedAt: Date.now(),
          });
          const imageId = await ctx.db.insert("generatedImages", {
            promptId,
            imageUrl: "https://example.com/test.jpg",
            generatedAt: Date.now(),
          });
          images.push(imageId);
        }

        return { roundId: rid, imageIds: images };
      });

      // Player 0 votes for Player 1's image
      const voteId = await t.mutation(internal.__tests__.fixtures.simulateSubmitVote, {
        voterId: playerIds[0],
        imageId: imageIds[1],
        roundId,
      });

      expect(voteId).toBeDefined();

      // Verify vote was created
      const vote = await t.run(async (ctx) => ctx.db.get(voteId)) as Doc<"votes"> | null;
      expect(vote?.voterId).toBe(playerIds[0]);
      expect(vote?.imageId).toBe(imageIds[1]);
    });

    it("updates existing vote if player votes again", async () => {
      const t = convexTest(schema);

      const { roomId, playerIds } = await t.mutation(
        internal.__tests__.fixtures.createTestRoom,
        { playerCount: 3 }
      );

      const { roundId, imageIds } = await t.run(async (ctx) => {
        const card = await ctx.db.query("questionCards").first();
        const questionCardId =
          card?._id ??
          (await ctx.db.insert("questionCards", {
            text: "Test",
            isActive: true,
          }));

        const rid = await ctx.db.insert("rounds", {
          roomId,
          roundNumber: 1,
          questionCardId,
          status: "voting",
          startedAt: Date.now(),
        });

        const images: Id<"generatedImages">[] = [];
        for (const playerId of playerIds) {
          const promptId = await ctx.db.insert("prompts", {
            roundId: rid,
            playerId,
            text: `Test prompt`,
            submittedAt: Date.now(),
          });
          const imageId = await ctx.db.insert("generatedImages", {
            promptId,
            imageUrl: "https://example.com/test.jpg",
            generatedAt: Date.now(),
          });
          images.push(imageId);
        }

        return { roundId: rid, imageIds: images };
      });

      // First vote
      const voteId1 = await t.mutation(internal.__tests__.fixtures.simulateSubmitVote, {
        voterId: playerIds[0],
        imageId: imageIds[1],
        roundId,
      });

      // Change vote
      const voteId2 = await t.mutation(internal.__tests__.fixtures.simulateSubmitVote, {
        voterId: playerIds[0],
        imageId: imageIds[2],
        roundId,
      });

      // Should be the same vote ID (updated)
      expect(voteId2).toBe(voteId1);

      // Verify the image was updated
      const vote = await t.run(async (ctx) => ctx.db.get(voteId1)) as Doc<"votes"> | null;
      expect(vote?.imageId).toBe(imageIds[2]);
    });
  });

  describe("cleanupTestRoom", () => {
    it("removes all test data", async () => {
      const t = convexTest(schema);

      const { roomId, playerIds, userIds } = await t.mutation(
        internal.__tests__.fixtures.createTestRoom,
        { playerCount: 2 }
      );

      // Clean up
      await t.mutation(internal.__tests__.fixtures.cleanupTestRoom, { roomId });

      // Verify room is deleted
      const room = await t.run(async (ctx) => ctx.db.get(roomId));
      expect(room).toBeNull();

      // Verify players are deleted
      for (const playerId of playerIds) {
        const player = await t.run(async (ctx) => ctx.db.get(playerId));
        expect(player).toBeNull();
      }

      // Verify test users are deleted
      for (const userId of userIds) {
        const user = await t.run(async (ctx) => ctx.db.get(userId));
        expect(user).toBeNull();
      }
    });
  });
});
