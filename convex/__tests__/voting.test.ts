import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateVotingEligibility,
  haveAllEligiblePlayersVoted,
  validateVote,
  shouldTriggerEarlyVotingTransition,
} from "../lib/gameLogic";
import {
  createPlayer,
  createPrompt,
  createGeneratedImage,
  createVote,
  createGameScenario,
  resetIdCounter,
  generateId,
} from "./fixtures";

describe("calculateVotingEligibility", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("returns all players as eligible when there are multiple prompts", () => {
    const { players, prompts } = createGameScenario(3);

    const eligibility = calculateVotingEligibility(players, prompts);

    expect(eligibility).toHaveLength(3);
    expect(eligibility.every(e => e.isEligible)).toBe(true);
  });

  it("marks player as ineligible when only their own image exists", () => {
    const roomId = generateId("rooms");
    const roundId = generateId("rounds");

    // Single player who submitted a prompt
    const player = createPlayer({ roomId });
    const prompt = createPrompt(player._id, roundId);

    const eligibility = calculateVotingEligibility([player], [prompt]);

    expect(eligibility).toHaveLength(1);
    expect(eligibility[0].isEligible).toBe(false);
    expect(eligibility[0].reason).toBe("Only own image available");
  });

  it("marks player as eligible if they did not submit but others did", () => {
    const roomId = generateId("rooms");
    const roundId = generateId("rounds");

    const player1 = createPlayer({ roomId }); // Submits prompt
    const player2 = createPlayer({ roomId }); // Does not submit

    const prompt = createPrompt(player1._id, roundId);

    const eligibility = calculateVotingEligibility([player1, player2], [prompt]);

    // Player1 is ineligible (only own image)
    const player1Eligibility = eligibility.find(e => e.playerId === player1._id);
    expect(player1Eligibility?.isEligible).toBe(false);

    // Player2 is eligible (can vote on player1's image)
    const player2Eligibility = eligibility.find(e => e.playerId === player2._id);
    expect(player2Eligibility?.isEligible).toBe(true);
  });

  it("marks disconnected players as ineligible", () => {
    const { players, prompts } = createGameScenario(2);
    players[1].status = "disconnected";

    const eligibility = calculateVotingEligibility(players, prompts);

    const disconnectedPlayer = eligibility.find(e => e.playerId === players[1]._id);
    expect(disconnectedPlayer?.isEligible).toBe(false);
    expect(disconnectedPlayer?.reason).toBe("Player is not connected");
  });

  it("marks kicked players as ineligible", () => {
    const { players, prompts } = createGameScenario(2);
    players[1].status = "kicked";

    const eligibility = calculateVotingEligibility(players, prompts);

    const kickedPlayer = eligibility.find(e => e.playerId === players[1]._id);
    expect(kickedPlayer?.isEligible).toBe(false);
  });

  it("handles empty players list", () => {
    const eligibility = calculateVotingEligibility([], []);
    expect(eligibility).toHaveLength(0);
  });

  it("handles empty prompts list (no one submitted)", () => {
    const roomId = generateId("rooms");
    const player1 = createPlayer({ roomId });
    const player2 = createPlayer({ roomId });

    // No prompts - everyone should be ineligible (nothing to vote on)
    const eligibility = calculateVotingEligibility([player1, player2], []);

    // When no prompts exist, players didn't submit but also can't vote
    // (no images exist) - they're technically "eligible" by the logic
    // since they didn't submit and there's nothing to block them
    expect(eligibility).toHaveLength(2);
    // With no prompts, hasOtherPlayersImages is false for everyone
    // and playerSubmittedPrompt is false, so they're eligible
    expect(eligibility.every(e => e.isEligible)).toBe(true);
  });
});

describe("haveAllEligiblePlayersVoted", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("returns true when all eligible players have voted", () => {
    const { players, prompts, images, roundId } = createGameScenario(3);

    const eligibility = calculateVotingEligibility(players, prompts);

    // Each player votes for someone else's image
    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[2]._id, roundId),
      createVote(players[2]._id, images[0]._id, roundId),
    ];

    const result = haveAllEligiblePlayersVoted(eligibility, votes);
    expect(result).toBe(true);
  });

  it("returns false when some eligible players have not voted", () => {
    const { players, prompts, images, roundId } = createGameScenario(3);

    const eligibility = calculateVotingEligibility(players, prompts);

    // Only one player votes
    const votes = [createVote(players[0]._id, images[1]._id, roundId)];

    const result = haveAllEligiblePlayersVoted(eligibility, votes);
    expect(result).toBe(false);
  });

  it("returns false when there are no eligible voters", () => {
    const roomId = generateId("rooms");
    const roundId = generateId("rounds");

    // Single player with only their own image
    const player = createPlayer({ roomId });
    const prompt = createPrompt(player._id, roundId);

    const eligibility = calculateVotingEligibility([player], [prompt]);
    const result = haveAllEligiblePlayersVoted(eligibility, []);

    expect(result).toBe(false);
  });

  it("returns true when ineligible players have not voted but eligible ones have", () => {
    const roomId = generateId("rooms");
    const roundId = generateId("rounds");

    const player1 = createPlayer({ roomId });
    const player2 = createPlayer({ roomId });
    const player3 = createPlayer({ roomId, status: "disconnected" });

    const prompts = [
      createPrompt(player1._id, roundId),
      createPrompt(player2._id, roundId),
    ];
    const images = prompts.map(p => createGeneratedImage(p._id));

    const eligibility = calculateVotingEligibility([player1, player2, player3], prompts);

    // Only connected players vote
    const votes = [
      createVote(player1._id, images[1]._id, roundId),
      createVote(player2._id, images[0]._id, roundId),
    ];

    const result = haveAllEligiblePlayersVoted(eligibility, votes);
    expect(result).toBe(true);
  });
});

describe("validateVote", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("returns valid for voting on another player's image", () => {
    const { players, prompts, images } = createGameScenario(2);

    // Player 0 votes for player 1's image
    const result = validateVote(
      players[0]._id,
      images[1]._id,
      images,
      prompts
    );

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns invalid when voting for own image", () => {
    const { players, prompts, images } = createGameScenario(2);

    // Player 0 tries to vote for their own image
    const result = validateVote(
      players[0]._id,
      images[0]._id,
      images,
      prompts
    );

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Cannot vote for your own image");
  });

  it("returns invalid when image does not exist", () => {
    const { players, prompts, images } = createGameScenario(2);
    const fakeImageId = generateId("generatedImages");

    const result = validateVote(
      players[0]._id,
      fakeImageId,
      images,
      prompts
    );

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Image not found");
  });

  it("returns invalid when prompt for image does not exist", () => {
    const { players, prompts } = createGameScenario(2);

    // Create an orphan image with no matching prompt
    const orphanPromptId = generateId("prompts");
    const orphanImage = createGeneratedImage(orphanPromptId);

    const result = validateVote(
      players[0]._id,
      orphanImage._id,
      [orphanImage],
      prompts
    );

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Prompt not found for image");
  });
});

describe("shouldTriggerEarlyVotingTransition", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("returns true when all eligible players have voted", () => {
    const { players, prompts, images, roundId } = createGameScenario(3);

    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[2]._id, roundId),
      createVote(players[2]._id, images[0]._id, roundId),
    ];

    const result = shouldTriggerEarlyVotingTransition(players, prompts, votes);
    expect(result).toBe(true);
  });

  it("returns false when not all eligible players have voted", () => {
    const { players, prompts, images, roundId } = createGameScenario(3);

    // Only 2 of 3 players vote
    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[2]._id, roundId),
    ];

    const result = shouldTriggerEarlyVotingTransition(players, prompts, votes);
    expect(result).toBe(false);
  });

  it("ignores disconnected players in eligibility check", () => {
    const { players, prompts, images, roundId } = createGameScenario(3);
    players[2].status = "disconnected";

    // Only 2 connected players vote
    const votes = [
      createVote(players[0]._id, images[1]._id, roundId),
      createVote(players[1]._id, images[2]._id, roundId),
    ];

    const result = shouldTriggerEarlyVotingTransition(players, prompts, votes);
    expect(result).toBe(true);
  });
});
