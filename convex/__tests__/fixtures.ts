/**
 * Test fixtures and factory functions for Convex tests.
 */

import { Id, TableNames } from "../_generated/dataModel";

// Type-safe ID generator for tests
let idCounter = 0;

export function generateId<T extends TableNames>(table: T): Id<T> {
  idCounter++;
  // Create a fake ID that looks like a Convex ID
  return `test_${table}_${idCounter}` as unknown as Id<T>;
}

export function resetIdCounter() {
  idCounter = 0;
}

// Factory functions for creating test data

export interface TestPlayer {
  _id: Id<"players">;
  roomId: Id<"rooms">;
  userId: Id<"users">;
  status: "connected" | "disconnected" | "kicked";
  isHost: boolean;
  score: number;
}

export function createPlayer(
  overrides: Partial<TestPlayer> = {}
): TestPlayer {
  const roomId = overrides.roomId ?? generateId("rooms");
  return {
    _id: generateId("players"),
    roomId,
    userId: generateId("users"),
    status: "connected",
    isHost: false,
    score: 0,
    ...overrides,
  };
}

export interface TestPrompt {
  _id: Id<"prompts">;
  roundId: Id<"rounds">;
  playerId: Id<"players">;
  text: string;
  submittedAt: number;
}

export function createPrompt(
  playerId: Id<"players">,
  roundId: Id<"rounds">,
  overrides: Partial<TestPrompt> = {}
): TestPrompt {
  return {
    _id: generateId("prompts"),
    roundId,
    playerId,
    text: "A test prompt",
    submittedAt: Date.now(),
    ...overrides,
  };
}

export interface TestGeneratedImage {
  _id: Id<"generatedImages">;
  promptId: Id<"prompts">;
  imageUrl: string;
  generatedAt: number;
  error?: string;
}

export function createGeneratedImage(
  promptId: Id<"prompts">,
  overrides: Partial<TestGeneratedImage> = {}
): TestGeneratedImage {
  return {
    _id: generateId("generatedImages"),
    promptId,
    imageUrl: "https://example.com/image.jpg",
    generatedAt: Date.now(),
    ...overrides,
  };
}

export interface TestVote {
  _id: Id<"votes">;
  roundId: Id<"rounds">;
  voterId: Id<"players">;
  imageId: Id<"generatedImages">;
  submittedAt: number;
}

export function createVote(
  voterId: Id<"players">,
  imageId: Id<"generatedImages">,
  roundId: Id<"rounds">,
  overrides: Partial<TestVote> = {}
): TestVote {
  return {
    _id: generateId("votes"),
    roundId,
    voterId,
    imageId,
    submittedAt: Date.now(),
    ...overrides,
  };
}

// Helper to create a complete game scenario
export interface GameScenario {
  players: TestPlayer[];
  prompts: TestPrompt[];
  images: TestGeneratedImage[];
  votes: TestVote[];
  roundId: Id<"rounds">;
  roomId: Id<"rooms">;
}

export function createGameScenario(playerCount: number): GameScenario {
  const roomId = generateId("rooms");
  const roundId = generateId("rounds");

  const players: TestPlayer[] = [];
  const prompts: TestPrompt[] = [];
  const images: TestGeneratedImage[] = [];

  for (let i = 0; i < playerCount; i++) {
    const player = createPlayer({ roomId, isHost: i === 0 });
    players.push(player);

    const prompt = createPrompt(player._id, roundId);
    prompts.push(prompt);

    const image = createGeneratedImage(prompt._id);
    images.push(image);
  }

  return {
    players,
    prompts,
    images,
    votes: [],
    roundId,
    roomId,
  };
}
