import { Id } from "../../../convex/_generated/dataModel";

export interface Player {
  _id: string;
  displayName: string;
  score: number;
  hasSubmitted: boolean;
  hasVoted: boolean;
}

export interface GameImage {
  _id: string;
  promptId: string;
  imageUrl: string;
  promptText: string;
  voteCount: number;
  isWinner: boolean;
  isOwn: boolean;
}

export interface RoundInfo {
  _id: string;
  status: string;
  phaseEndTime?: number;
  question: string;
}

export interface RoomInfo {
  status: string;
  currentRound?: number;
  totalRounds: number;
}

export interface GameState {
  room: RoomInfo;
  round?: RoundInfo;
  players: Player[];
  images: GameImage[];
  myPrompt?: string;
  myVote?: string;
}

export interface BasePhaseProps {
  roomId: string;
  gameState: GameState;
  timeRemaining: number;
  handleSubmitPrompt?: (prompt: string) => Promise<void>;
  handleSubmitVote?: (imageId: string) => Promise<void>;
  onPhaseComplete?: () => void;
}

// Game configuration constants
export const GAME_CONFIG = {
  PROMPT_PHASE_DURATION: 60,
  GENERATING_PHASE_DURATION: 45,
  VOTING_PHASE_DURATION: 45,
  RESULTS_PHASE_DURATION: 15,
  TIME_WARNING_THRESHOLD: 10,
} as const;

// Winner celebration messages
export const WINNER_MESSAGES = [
  "Absolutely unhinged! 🔥",
  "Chef's kiss! 👨‍🍳💋",
  "Pure genius! 🧠✨",
  "Comedy gold! 🏆",
  "Masterpiece! 🎨",
  "Legendary! 🦸‍♂️",
  "Iconic! 💫",
  "Brilliant! 💡",
  "Flawless victory! ⚡",
  "Mind-blowing! 🤯"
] as const;

// Confetti color palette
export const CONFETTI_COLORS = [
  "#FFD700",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7"
] as const;
