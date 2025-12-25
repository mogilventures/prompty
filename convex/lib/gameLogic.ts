import { Id } from "../_generated/dataModel";

/**
 * Pure business logic functions for testing.
 * These functions contain no Convex dependencies and can be unit tested easily.
 */

// Types matching the schema for use in pure functions
export interface Player {
  _id: Id<"players">;
  roomId: Id<"rooms">;
  userId: Id<"users">;
  status: "connected" | "disconnected" | "kicked";
  isHost: boolean;
  score: number;
}

export interface Prompt {
  _id: Id<"prompts">;
  roundId: Id<"rounds">;
  playerId: Id<"players">;
  text: string;
  submittedAt: number;
}

export interface GeneratedImage {
  _id: Id<"generatedImages">;
  promptId: Id<"prompts">;
  imageUrl: string;
  generatedAt: number;
  error?: string;
}

export interface Vote {
  _id: Id<"votes">;
  roundId: Id<"rounds">;
  voterId: Id<"players">;
  imageId: Id<"generatedImages">;
  submittedAt: number;
}

export interface VotingEligibility {
  playerId: Id<"players">;
  isEligible: boolean;
  reason: string;
}

export interface ScoreResult {
  playerId: Id<"players">;
  pointsAwarded: number;
  reason: "winner" | "winner_tie" | "participation";
}

/**
 * Calculate which players are eligible to vote.
 *
 * A player is eligible to vote if:
 * 1. There are images from other players to vote on
 * 2. OR they didn't submit a prompt (so all images are votable)
 *
 * A player is NOT eligible if:
 * - They submitted the only prompt (can't vote for themselves)
 */
export function calculateVotingEligibility(
  connectedPlayers: Pick<Player, "_id" | "status">[],
  prompts: Pick<Prompt, "playerId">[]
): VotingEligibility[] {
  const results: VotingEligibility[] = [];

  for (const player of connectedPlayers) {
    if (player.status !== "connected") {
      results.push({
        playerId: player._id,
        isEligible: false,
        reason: "Player is not connected",
      });
      continue;
    }

    // Check if this player submitted a prompt
    const playerSubmittedPrompt = prompts.some(p => p.playerId === player._id);

    // Check if there are images from other players
    const hasOtherPlayersImages = prompts.some(p => p.playerId !== player._id);

    if (hasOtherPlayersImages) {
      // There are other players' images to vote on
      results.push({
        playerId: player._id,
        isEligible: true,
        reason: "Can vote on other players' images",
      });
    } else if (!playerSubmittedPrompt) {
      // Player didn't submit, so they can vote on all images
      results.push({
        playerId: player._id,
        isEligible: true,
        reason: "Did not submit prompt, can vote on all images",
      });
    } else {
      // Only their own image exists
      results.push({
        playerId: player._id,
        isEligible: false,
        reason: "Only own image available",
      });
    }
  }

  return results;
}

/**
 * Check if all eligible voters have voted.
 */
export function haveAllEligiblePlayersVoted(
  eligibility: VotingEligibility[],
  votes: Pick<Vote, "voterId">[]
): boolean {
  const votedPlayerIds = new Set(votes.map(v => v.voterId));
  const eligiblePlayers = eligibility.filter(e => e.isEligible);

  if (eligiblePlayers.length === 0) {
    return false; // No eligible voters
  }

  return eligiblePlayers.every(e => votedPlayerIds.has(e.playerId));
}

/**
 * Count votes per image.
 */
export function countVotesPerImage(
  votes: Pick<Vote, "imageId">[]
): Map<Id<"generatedImages">, number> {
  const voteCounts = new Map<Id<"generatedImages">, number>();

  for (const vote of votes) {
    const count = voteCounts.get(vote.imageId) || 0;
    voteCounts.set(vote.imageId, count + 1);
  }

  return voteCounts;
}

/**
 * Find the winning image(s) - images with the most votes.
 * Returns multiple IDs in case of a tie.
 */
export function findWinningImages(
  voteCounts: Map<Id<"generatedImages">, number>
): Id<"generatedImages">[] {
  if (voteCounts.size === 0) {
    return [];
  }

  const maxVotes = Math.max(...voteCounts.values());
  if (maxVotes === 0) {
    return [];
  }

  const winners: Id<"generatedImages">[] = [];
  for (const [imageId, count] of voteCounts.entries()) {
    if (count === maxVotes) {
      winners.push(imageId);
    }
  }

  return winners;
}

/**
 * Calculate score awards for a round.
 *
 * Scoring rules:
 * - Winner gets POINTS_PER_WIN (split if tie)
 * - Every voter gets POINTS_PER_VOTE for participating
 */
export function calculateRoundScores(
  votes: Vote[],
  images: GeneratedImage[],
  prompts: Prompt[],
  config: { pointsPerWin: number; pointsPerVote: number }
): ScoreResult[] {
  const results: ScoreResult[] = [];

  // Count votes per image
  const voteCounts = countVotesPerImage(votes);

  // Find winning images
  const winningImageIds = findWinningImages(voteCounts);

  if (winningImageIds.length > 0) {
    // Award points to winners (split if tie)
    const pointsPerWinner = Math.floor(config.pointsPerWin / winningImageIds.length);

    for (const imageId of winningImageIds) {
      const image = images.find(i => i._id === imageId);
      if (!image) continue;

      const prompt = prompts.find(p => p._id === image.promptId);
      if (!prompt) continue;

      results.push({
        playerId: prompt.playerId,
        pointsAwarded: pointsPerWinner,
        reason: winningImageIds.length > 1 ? "winner_tie" : "winner",
      });
    }
  }

  // Award participation points to all voters
  const voterPlayerIds = new Set<Id<"players">>();
  for (const vote of votes) {
    if (!voterPlayerIds.has(vote.voterId)) {
      voterPlayerIds.add(vote.voterId);
      results.push({
        playerId: vote.voterId,
        pointsAwarded: config.pointsPerVote,
        reason: "participation",
      });
    }
  }

  return results;
}

/**
 * Check if early transition should be triggered for prompt phase.
 * Early transition happens when all connected players have submitted prompts.
 */
export function shouldTriggerEarlyPromptTransition(
  connectedPlayers: Pick<Player, "_id" | "status">[],
  prompts: Pick<Prompt, "playerId">[]
): boolean {
  const connectedPlayerIds = connectedPlayers
    .filter(p => p.status === "connected")
    .map(p => p._id);

  if (connectedPlayerIds.length === 0) {
    return false;
  }

  const submittedPlayerIds = new Set(prompts.map(p => p.playerId));

  return connectedPlayerIds.every(id => submittedPlayerIds.has(id));
}

/**
 * Check if early transition should be triggered for voting phase.
 */
export function shouldTriggerEarlyVotingTransition(
  connectedPlayers: Pick<Player, "_id" | "status">[],
  prompts: Pick<Prompt, "playerId">[],
  votes: Pick<Vote, "voterId">[]
): boolean {
  const eligibility = calculateVotingEligibility(connectedPlayers, prompts);
  return haveAllEligiblePlayersVoted(eligibility, votes);
}

/**
 * Validate a vote submission.
 */
export function validateVote(
  voterId: Id<"players">,
  imageId: Id<"generatedImages">,
  images: GeneratedImage[],
  prompts: Prompt[]
): { valid: boolean; error?: string } {
  // Find the image
  const image = images.find(i => i._id === imageId);
  if (!image) {
    return { valid: false, error: "Image not found" };
  }

  // Find the prompt for this image
  const prompt = prompts.find(p => p._id === image.promptId);
  if (!prompt) {
    return { valid: false, error: "Prompt not found for image" };
  }

  // Check if player is voting for their own image
  if (prompt.playerId === voterId) {
    return { valid: false, error: "Cannot vote for your own image" };
  }

  return { valid: true };
}
