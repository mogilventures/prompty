/**
 * Game Scoring Module
 * Handles score calculation and point distribution.
 */
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { GAME_CONFIG } from "../lib/constants";
import { Id } from "../_generated/dataModel";
import { gameLog } from "../lib/logger";
import { countVotesPerImage, findWinningImages } from "../lib/gameLogic";

const log = gameLog.scoring;

/**
 * Calculate scores after voting phase
 */
export const calculateScores = internalMutation({
  args: {
    roundId: v.id("rounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) return null;

    // Get all votes for this round
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    // Use extracted pure functions for vote counting and winner finding
    const voteCounts = countVotesPerImage(votes);
    const winningImageIds = findWinningImages(voteCounts);

    if (winningImageIds.length === 0) {
      log.info("no_votes_cast", { roundId: args.roundId });
      return null;
    }

    log.info("winners_found", {
      roundId: args.roundId,
      winnerCount: winningImageIds.length,
    });

    // Award points to winners (split if tie)
    const pointsPerWinner = Math.floor(GAME_CONFIG.POINTS_PER_WIN / winningImageIds.length);
    for (const imageId of winningImageIds) {
      const image = await ctx.db.get(imageId);
      if (!image) continue;

      const prompt = await ctx.db.get(image.promptId);
      if (!prompt) continue;

      const player = await ctx.db.get(prompt.playerId);
      if (!player) continue;

      await ctx.db.patch(player._id, {
        score: player.score + pointsPerWinner,
      });
      log.info("winner_points_awarded", {
        playerId: player._id,
        points: pointsPerWinner,
      });
    }

    // Award participation points to voters (each voter gets points once)
    const awardedVoterIds = new Set<Id<"players">>();
    for (const vote of votes) {
      if (awardedVoterIds.has(vote.voterId)) continue;
      awardedVoterIds.add(vote.voterId);

      const voter = await ctx.db.get(vote.voterId);
      if (voter) {
        await ctx.db.patch(vote.voterId, {
          score: voter.score + GAME_CONFIG.POINTS_PER_VOTE,
        });
        log.debug("participation_points_awarded", {
          playerId: vote.voterId,
          points: GAME_CONFIG.POINTS_PER_VOTE,
        });
      }
    }

    return null;
  },
});
