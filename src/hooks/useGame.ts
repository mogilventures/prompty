import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "./useToast";

export function useGame(roomId: string | undefined) {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const gameState = useQuery(
    api.game.getGameState,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip"
  );
  
  const submitPrompt = useMutation(api.game.submitPrompt);
  const submitVote = useMutation(api.game.submitVote);
  
  // Handle prompt submission
  const handleSubmitPrompt = useCallback(async (prompt: string) => {
    if (!roomId) return;
    
    try {
      await submitPrompt({
        roomId: roomId as Id<"rooms">,
        prompt: prompt.trim()
      });
      toast({
        title: "Prompt submitted!",
        description: "Waiting for other players...",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Please try again";
      toast({
        title: "Failed to submit prompt",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [roomId, submitPrompt]);
  
  // Handle vote submission
  const handleSubmitVote = useCallback(async (imageId: Id<"generatedImages">) => {
    if (!roomId) return;
    
    try {
      await submitVote({
        roomId: roomId as Id<"rooms">,
        imageId
      });
      toast({
        title: "Vote submitted!",
        description: "Waiting for results...",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Please try again";
      toast({
        title: "Failed to submit vote",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [roomId, submitVote]);
  
  // Timer countdown effect
  useEffect(() => {
    if (!gameState?.round?.phaseEndTime) {
      setTimeRemaining(0);
      return;
    }
    
    const phaseEndTime = gameState.round.phaseEndTime;
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((phaseEndTime - now) / 1000));
      setTimeRemaining(remaining);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [gameState?.round?.phaseEndTime]);
  
  // Auto-redirect when game ends
  useEffect(() => {
    if (gameState?.room?.status === "finished" && roomId) {
      setTimeout(() => {
        navigate(`/room/${roomId}`);
        toast({
          title: "Game Over!",
          description: "Thanks for playing!",
        });
      }, 5000);
    }
  }, [gameState?.room?.status, roomId, navigate]);
  
  const currentPhase = gameState?.round?.status || "waiting";
  const hasSubmittedPrompt = !!gameState?.myPrompt;
  const hasVoted = !!gameState?.myVote;

  // Determine if we should show progress timer for generation phase
  const showProgressTimer = currentPhase === "generating" &&
    gameState?.round?.generationExpectedCount !== undefined;

  const generationProgress = {
    expected: gameState?.round?.generationExpectedCount || 0,
    completed: gameState?.round?.generationCompletedCount || 0,
  };
  
  return {
    gameState,
    currentPhase,
    timeRemaining,
    hasSubmittedPrompt,
    hasVoted,
    showProgressTimer,
    generationProgress,
    handleSubmitPrompt,
    handleSubmitVote,
    isLoading: gameState === undefined,
  };
}