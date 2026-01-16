import React, { useMemo, Suspense, lazy } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/8bit/button";
import { Card } from "@/components/ui/8bit/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { useGame } from "@/hooks/useGame";

// Import optimized game phase loader
import {
  PromptPhase,
  GeneratingPhase,
  VotingPhase,
  ResultsPhase,
  WaitingPhase
} from "@/utils/gamePhases";

// Lazy load heavy game components
const GameTopBar = lazy(() => import("@/features/game/GameTopBar"));
const PlayerSidebar = lazy(() => import("@/features/game/PlayerSidebar"));
const GameLayout = lazy(() => import("@/features/game/GameLayout"));

export default function GameClient() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const {
    gameState,
    currentPhase,
    timeRemaining,
    hasSubmittedPrompt,
    hasVoted,
    showProgressTimer,
    generationProgress,
    handleSubmitPrompt,
    handleSubmitVote,
    isLoading
  } = useGame(roomId);
  
  // Memoize phase component selection for performance
  const PhaseComponent = useMemo(() => {
    if (!currentPhase) return WaitingPhase;
    
    switch (currentPhase) {
      case "prompt":
      case "prompting":
        return PromptPhase;
      case "generating":
        return GeneratingPhase;
      case "voting":
        return VotingPhase;
      case "results":
        return ResultsPhase;
      default:
        return WaitingPhase;
    }
  }, [currentPhase]);
  
  if (isLoading || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Game Not Found</h2>
          <p className="text-muted-foreground mb-4">This game doesn't exist or has ended.</p>
          <Button onClick={() => navigate("/app/dashboard")}>
            <DynamicIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }
  
  const handleLeave = () => {
    navigate(`/room/${roomId}`);
  };

  const title = `Game - Round ${gameState.room.currentRound}/${gameState.room.totalRounds}`;
  const description = `Playing round ${gameState.room.currentRound} of ${gameState.room.totalRounds}`;
  const canonical = `${window.location.origin}/play/${roomId}`;
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
      </Helmet>

      {/* Game layout with lazy-loaded components */}
      <Suspense fallback={<LoadingSpinner />}>
        <GameLayout>
          {/* Top bar */}
          <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
            <GameTopBar
              roomCode={roomId?.slice(-6).toUpperCase() || ""}
              currentRound={gameState.room.currentRound || 1}
              totalRounds={gameState.room.totalRounds || 5}
              onLeave={handleLeave}
            />
          </Suspense>
          
          {/* Main game area - optimized phase rendering */}
          <main className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-8 space-y-4">
              {/* Dynamically loaded phase component */}
              <PhaseComponent
                roomId={roomId!}
                gameState={gameState}
                timeRemaining={timeRemaining}
                handleSubmitPrompt={handleSubmitPrompt}
                handleSubmitVote={handleSubmitVote}
                onPhaseComplete={() => {
                  // Phase completion handler
                  console.log(`Phase ${currentPhase} completed`);
                }}
              />
            </section>
            
            {/* Sidebar with lazy loading */}
            <aside className="lg:col-span-4">
              <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                <PlayerSidebar
                  players={gameState.players}
                  currentPhase={currentPhase}
                  timeRemaining={timeRemaining}
                  generationProgress={generationProgress}
                />
              </Suspense>
            </aside>
            
            {/* Navigation */}
            <div className="lg:col-span-12 flex justify-center pt-2">
              <Button variant="outline" onClick={handleLeave}>
                <DynamicIcon name="ArrowLeft" className="h-4 w-4 mr-2" />
                Back to Room
              </Button>
            </div>
          </main>
        </GameLayout>
      </Suspense>
    </div>
  );
}
