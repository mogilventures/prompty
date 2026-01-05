/**
 * Game Module - Main Entry Point
 *
 * This file re-exports all game-related functions from their respective modules.
 * The modular structure improves maintainability while keeping the API surface stable.
 *
 * Modules:
 * - lifecycle: Game start, initialization, and end
 * - phases: Phase transitions and timing
 * - prompts: Prompt submission and tracking
 * - voting: Vote submission and tracking
 * - generation: AI image generation tracking
 * - scoring: Score calculation
 * - rounds: Round progression
 * - state: Game state queries
 */

// Lifecycle - Game start, initialization, end
export {
  startGame,
  ensureQuestionCards,
  initializeGame,
  endGame,
} from "./game/lifecycle";

// Phases - Phase transitions
export { transitionPhase } from "./game/phases";

// Prompts - Prompt submission
export { submitPrompt, checkAllPlayersSubmitted } from "./game/prompts";

// Voting - Vote submission
export { submitVote, checkAllPlayersVoted } from "./game/voting";

// Generation - AI image generation tracking
export {
  storeGeneratedImage,
  storeImageError,
  markGenerationComplete,
  markGenerationFailed,
  incrementGenerationProgress,
  checkAllImagesGenerated,
  verifyAndTriggerGeneration,
  getRoundData,
  getPromptsForRound,
} from "./game/generation";

// Scoring - Score calculation
export { calculateScores } from "./game/scoring";

// Rounds - Round progression
export { startNextRound } from "./game/rounds";

// State - Game state queries
export { getGameState } from "./game/state";
