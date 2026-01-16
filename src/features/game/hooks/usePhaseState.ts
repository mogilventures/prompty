import { useState, useCallback, useMemo } from 'react';
import { GameState, GameImage, GAME_CONFIG } from '../types';

interface UsePhaseStateOptions {
  totalTime: number;
  timeRemaining: number;
  gameState: GameState;
}

interface UsePhaseStateReturn {
  // Selection state
  selectedImage: string | null;
  setSelectedImage: (id: string | null) => void;
  lightboxImage: number | null;
  setLightboxImage: (index: number | null) => void;

  // Confirmation dialog state
  showConfirmation: boolean;
  setShowConfirmation: (show: boolean) => void;
  pendingAction: string | null;
  setPendingAction: (action: string | null) => void;

  // Progress calculations
  progress: number;
  isTimeWarning: boolean;
  isTimeCritical: boolean;

  // Computed values
  currentQuestion: string;
  sortedPlayers: GameState['players'];
  winningImage: GameImage | undefined;

  // Lightbox navigation
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  nextImage: () => void;
  previousImage: () => void;
}

export function usePhaseState({
  totalTime,
  timeRemaining,
  gameState
}: UsePhaseStateOptions): UsePhaseStateReturn {
  // Selection state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<number | null>(null);

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Progress calculations
  const progress = useMemo(() => {
    return ((totalTime - timeRemaining) / totalTime) * 100;
  }, [totalTime, timeRemaining]);

  const isTimeWarning = timeRemaining <= GAME_CONFIG.TIME_WARNING_THRESHOLD;
  const isTimeCritical = timeRemaining <= 5;

  // Computed values
  const currentQuestion = gameState.round?.question || "Waiting...";

  const sortedPlayers = useMemo(() => {
    return [...gameState.players].sort((a, b) => b.score - a.score);
  }, [gameState.players]);

  const winningImage = useMemo(() => {
    return gameState.images.find(img => img.isWinner);
  }, [gameState.images]);

  // Lightbox navigation
  const openLightbox = useCallback((index: number) => {
    setLightboxImage(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  const nextImage = useCallback(() => {
    if (lightboxImage !== null && gameState.images.length > 0) {
      setLightboxImage((lightboxImage + 1) % gameState.images.length);
    }
  }, [lightboxImage, gameState.images.length]);

  const previousImage = useCallback(() => {
    if (lightboxImage !== null && gameState.images.length > 0) {
      setLightboxImage(
        lightboxImage === 0 ? gameState.images.length - 1 : lightboxImage - 1
      );
    }
  }, [lightboxImage, gameState.images.length]);

  return {
    selectedImage,
    setSelectedImage,
    lightboxImage,
    setLightboxImage,
    showConfirmation,
    setShowConfirmation,
    pendingAction,
    setPendingAction,
    progress,
    isTimeWarning,
    isTimeCritical,
    currentQuestion,
    sortedPlayers,
    winningImage,
    openLightbox,
    closeLightbox,
    nextImage,
    previousImage
  };
}

export default usePhaseState;
