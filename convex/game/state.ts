/**
 * Game State Module
 * Handles game state queries for the frontend.
 */
import { query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get current game state for frontend rendering
 */
export const getGameState = query({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.union(
    v.null(),
    v.object({
      room: v.object({
        status: v.string(),
        currentRound: v.optional(v.float64()),
        totalRounds: v.float64(),
      }),
      round: v.optional(
        v.object({
          _id: v.id("rounds"),
          status: v.string(),
          phaseEndTime: v.optional(v.float64()),
          question: v.string(),
          generationExpectedCount: v.optional(v.float64()),
          generationCompletedCount: v.optional(v.float64()),
        })
      ),
      players: v.array(
        v.object({
          _id: v.id("players"),
          displayName: v.string(),
          score: v.float64(),
          hasSubmitted: v.boolean(),
          hasVoted: v.boolean(),
        })
      ),
      images: v.array(
        v.object({
          _id: v.id("generatedImages"),
          promptId: v.id("prompts"),
          imageUrl: v.string(),
          promptText: v.string(),
          voteCount: v.float64(),
          isWinner: v.boolean(),
          isOwn: v.boolean(),
        })
      ),
      myPrompt: v.optional(v.string()),
      myVote: v.optional(v.id("generatedImages")),
    })
  ),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;

    const userId = await getAuthUserId(ctx);
    const currentUser = userId ? await ctx.db.get(userId) : null;

    const currentPlayer = currentUser
      ? await ctx.db
          .query("players")
          .withIndex("by_room_and_user", (q) =>
            q.eq("roomId", args.roomId).eq("userId", currentUser._id)
          )
          .unique()
      : null;

    // Get current round
    let round:
      | {
          _id: Id<"rounds">;
          status: string;
          phaseEndTime: number | undefined;
          question: string;
          generationExpectedCount: number | undefined;
          generationCompletedCount: number | undefined;
        }
      | undefined = undefined;

    const currentRoundNum = room.currentRound;
    if (currentRoundNum) {
      const roundData = await ctx.db
        .query("rounds")
        .withIndex("by_room_and_number", (q) =>
          q.eq("roomId", args.roomId).eq("roundNumber", currentRoundNum)
        )
        .unique();

      if (roundData) {
        const card = await ctx.db.get(roundData.questionCardId);
        round = {
          _id: roundData._id,
          status: roundData.status,
          phaseEndTime: roundData.phaseEndTime,
          question: card?.text ?? "Unknown question",
          generationExpectedCount: roundData.generationExpectedCount,
          generationCompletedCount: roundData.generationCompletedCount,
        };
      }
    }

    // Get players with submission/voting status
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.neq(q.field("status"), "kicked"))
      .collect();

    const playersWithInfo = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);

        const hasSubmitted = round
          ? !!(await ctx.db
              .query("prompts")
              .withIndex("by_round_and_player", (q) =>
                q.eq("roundId", round._id).eq("playerId", player._id)
              )
              .unique())
          : false;

        const hasVoted = round
          ? !!(await ctx.db
              .query("votes")
              .withIndex("by_round_and_voter", (q) =>
                q.eq("roundId", round._id).eq("voterId", player._id)
              )
              .unique())
          : false;

        return {
          _id: player._id,
          displayName: user?.displayName ?? "Unknown",
          score: player.score,
          hasSubmitted,
          hasVoted,
        };
      })
    );

    // Get images with vote counts for current round
    let images: Array<{
      _id: Id<"generatedImages">;
      promptId: Id<"prompts">;
      imageUrl: string;
      promptText: string;
      voteCount: number;
      isWinner: boolean;
      isOwn: boolean;
    }> = [];

    if (round && (round.status === "voting" || round.status === "results")) {
      const prompts = await ctx.db
        .query("prompts")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .collect();

      const votes = await ctx.db
        .query("votes")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .collect();

      // Count votes per image
      const voteCounts = new Map<string, number>();
      for (const vote of votes) {
        voteCounts.set(vote.imageId, (voteCounts.get(vote.imageId) || 0) + 1);
      }

      const maxVotes = Math.max(...voteCounts.values(), 0);

      images = await Promise.all(
        prompts.map(async (prompt) => {
          const generatedImages = await ctx.db
            .query("generatedImages")
            .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
            .collect();

          return generatedImages.map((img) => ({
            _id: img._id,
            promptId: prompt._id,
            imageUrl: img.imageUrl,
            promptText: prompt.text,
            voteCount: voteCounts.get(img._id) || 0,
            isWinner:
              round.status === "results" &&
              (voteCounts.get(img._id) || 0) === maxVotes &&
              maxVotes > 0,
            isOwn: currentPlayer?._id === prompt.playerId,
          }));
        })
      ).then((results) => results.flat());
    }

    // Get current player's prompt and vote
    const myPrompt =
      round && currentPlayer
        ? await ctx.db
            .query("prompts")
            .withIndex("by_round_and_player", (q) =>
              q.eq("roundId", round._id).eq("playerId", currentPlayer._id)
            )
            .unique()
        : null;

    const myVote =
      round && currentPlayer
        ? await ctx.db
            .query("votes")
            .withIndex("by_round_and_voter", (q) =>
              q.eq("roundId", round._id).eq("voterId", currentPlayer._id)
            )
            .unique()
        : null;

    return {
      room: {
        status: room.status,
        currentRound: room.currentRound,
        totalRounds: room.settings.roundsPerGame,
      },
      round,
      players: playersWithInfo,
      images,
      myPrompt: myPrompt?.text,
      myVote: myVote?.imageId,
    };
  },
});
