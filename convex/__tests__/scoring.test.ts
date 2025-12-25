import { describe, it, expect, beforeEach } from "vitest";
import {
  countVotesPerImage,
  findWinningImages,
  calculateRoundScores,
} from "../lib/gameLogic";
import {
  createGameScenario,
  createVote,
  resetIdCounter,
  generateId,
} from "./fixtures";
import { GAME_CONFIG } from "../lib/constants";

describe("countVotesPerImage", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("correctly counts votes for each image", () => {
    const { images, players, roundId } = createGameScenario(3);

    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[1]._id, roundId), // Same image
      createVote(players[2]._id, images[0]._id, roundId),
    ];

    const counts = countVotesPerImage(votes);

    expect(counts.get(images[1]._id)).toBe(2);
    expect(counts.get(images[0]._id)).toBe(1);
    expect(counts.get(images[2]._id)).toBeUndefined(); // No votes
  });

  it("returns empty map for no votes", () => {
    const counts = countVotesPerImage([]);
    expect(counts.size).toBe(0);
  });

  it("handles single vote", () => {
    const { images, players, roundId } = createGameScenario(2);
    const votes = [createVote(players[0]._id, images[1]._id, roundId)];

    const counts = countVotesPerImage(votes);

    expect(counts.size).toBe(1);
    expect(counts.get(images[1]._id)).toBe(1);
  });
});

describe("findWinningImages", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("returns single winner with most votes", () => {
    const { images, players, roundId } = createGameScenario(3);

    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[1]._id, roundId),
      createVote(players[2]._id, images[0]._id, roundId),
    ];

    const counts = countVotesPerImage(votes);
    const winners = findWinningImages(counts);

    expect(winners).toHaveLength(1);
    expect(winners[0]).toBe(images[1]._id);
  });

  it("returns multiple winners in case of tie", () => {
    const { images, players, roundId } = createGameScenario(4);

    // Two images tied with 2 votes each
    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[1]._id, roundId),
      createVote(players[2]._id, images[2]._id, roundId),
      createVote(players[3]._id, images[2]._id, roundId),
    ];

    const counts = countVotesPerImage(votes);
    const winners = findWinningImages(counts);

    expect(winners).toHaveLength(2);
    expect(winners).toContain(images[1]._id);
    expect(winners).toContain(images[2]._id);
  });

  it("returns empty array for no votes", () => {
    const counts = new Map();
    const winners = findWinningImages(counts);
    expect(winners).toHaveLength(0);
  });

  it("returns empty array when all vote counts are zero", () => {
    const imageId = generateId("generatedImages");
    const counts = new Map([[imageId, 0]]);
    const winners = findWinningImages(counts);
    expect(winners).toHaveLength(0);
  });
});

describe("calculateRoundScores", () => {
  const config = {
    pointsPerWin: GAME_CONFIG.POINTS_PER_WIN,
    pointsPerVote: GAME_CONFIG.POINTS_PER_VOTE,
  };

  beforeEach(() => {
    resetIdCounter();
  });

  it("awards full points to single winner", () => {
    const { images, players, prompts, roundId } = createGameScenario(3);

    // All votes go to player 1's image
    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[2]._id, images[1]._id, roundId),
    ];

    const results = calculateRoundScores(votes, images, prompts, config);

    // Find the winner result (player 1)
    const winnerResult = results.find(
      r => r.playerId === players[1]._id && r.reason === "winner"
    );
    expect(winnerResult).toBeDefined();
    expect(winnerResult?.pointsAwarded).toBe(GAME_CONFIG.POINTS_PER_WIN);
  });

  it("splits points between tied winners", () => {
    const { images, players, prompts, roundId } = createGameScenario(4);

    // Tie between player 1 and player 2
    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[2]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[2]._id, roundId),
      createVote(players[3]._id, images[2]._id, roundId),
    ];

    const results = calculateRoundScores(votes, images, prompts, config);

    // Find the winner results
    const winnerResults = results.filter(r => r.reason === "winner_tie");
    expect(winnerResults).toHaveLength(2);

    const expectedPointsPerWinner = Math.floor(GAME_CONFIG.POINTS_PER_WIN / 2);
    expect(winnerResults[0].pointsAwarded).toBe(expectedPointsPerWinner);
    expect(winnerResults[1].pointsAwarded).toBe(expectedPointsPerWinner);
  });

  it("awards participation points to all voters", () => {
    const { images, players, prompts, roundId } = createGameScenario(3);

    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[2]._id, roundId),
      createVote(players[2]._id, images[0]._id, roundId),
    ];

    const results = calculateRoundScores(votes, images, prompts, config);

    // All 3 voters should get participation points
    const participationResults = results.filter(r => r.reason === "participation");
    expect(participationResults).toHaveLength(3);
    participationResults.forEach(r => {
      expect(r.pointsAwarded).toBe(GAME_CONFIG.POINTS_PER_VOTE);
    });
  });

  it("returns empty array when no votes cast", () => {
    const { images, prompts } = createGameScenario(3);
    const results = calculateRoundScores([], images, prompts, config);
    expect(results).toHaveLength(0);
  });

  it("only awards participation once per voter (no duplicates)", () => {
    const { images, players, prompts, roundId } = createGameScenario(2);

    // Even if there's only one vote
    const votes = [createVote(players[0]._id, images[1]._id, roundId)];

    const results = calculateRoundScores(votes, images, prompts, config);

    const participationResults = results.filter(r => r.reason === "participation");
    expect(participationResults).toHaveLength(1);
    expect(participationResults[0].playerId).toBe(players[0]._id);
  });

  it("handles 3-way tie correctly", () => {
    const { images, players, prompts, roundId } = createGameScenario(6);

    // 3-way tie: images 0, 1, 2 each get 2 votes
    const votes = [
      createVote(players[3]._id, images[0]._id, roundId),
      createVote(players[4]._id, images[0]._id, roundId),
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[5]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[2]._id, roundId),
      createVote(players[2]._id, images[2]._id, roundId),
    ];

    const results = calculateRoundScores(votes, images, prompts, config);

    const winnerResults = results.filter(r => r.reason === "winner_tie");
    expect(winnerResults).toHaveLength(3);

    const expectedPointsPerWinner = Math.floor(GAME_CONFIG.POINTS_PER_WIN / 3);
    winnerResults.forEach(r => {
      expect(r.pointsAwarded).toBe(expectedPointsPerWinner);
    });
  });

  it("winner also gets participation points if they voted", () => {
    const { images, players, prompts, roundId } = createGameScenario(3);

    // Player 1's image wins, and player 1 also voted
    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[2]._id, roundId), // Winner votes
      createVote(players[2]._id, images[1]._id, roundId),
    ];

    const results = calculateRoundScores(votes, images, prompts, config);

    // Player 1 should have both winner and participation entries
    const player1Results = results.filter(r => r.playerId === players[1]._id);
    expect(player1Results).toHaveLength(2);

    const winnerEntry = player1Results.find(r => r.reason === "winner");
    const participationEntry = player1Results.find(r => r.reason === "participation");

    expect(winnerEntry?.pointsAwarded).toBe(GAME_CONFIG.POINTS_PER_WIN);
    expect(participationEntry?.pointsAwarded).toBe(GAME_CONFIG.POINTS_PER_VOTE);
  });

  it("handles scenario where no one votes for any image", () => {
    const { images, prompts } = createGameScenario(3);

    // No votes at all
    const results = calculateRoundScores([], images, prompts, config);

    expect(results).toHaveLength(0);
  });
});
