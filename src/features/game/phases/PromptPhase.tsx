import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Label } from "@/components/ui/8bit/label";
import { Card } from "@/components/ui/8bit/card";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, AlertTriangle, CheckCircle } from "lucide-react";

import { Id } from "../../../../convex/_generated/dataModel";

interface PromptPhaseProps {
  roomId: string;
  gameState: {
    room: {
      status: string;
      currentRound?: number;
      totalRounds: number;
    };
    round?: {
      _id: string;
      status: string;
      phaseEndTime?: number;
      question: string;
    };
    players: Array<{
      _id: string;
      displayName: string;
      score: number;
      hasSubmitted: boolean;
      hasVoted: boolean;
    }>;
    images: Array<{
      _id: string;
      promptId: string;
      imageUrl: string;
      promptText: string;
      voteCount: number;
      isWinner: boolean;
      isOwn: boolean;
    }>;
    myPrompt?: string;
    myVote?: string;
  };
  timeRemaining: number;
  handleSubmitPrompt?: (prompt: string) => Promise<void>;
  handleSubmitVote?: (imageId: string) => Promise<void>;
  onPhaseComplete?: () => void;
}

const EXAMPLE_PROMPTS = [
  "A cat wearing a space helmet",
  "A robot painting a masterpiece",
  "A dinosaur at a coffee shop",
  "A wizard's magical garden",
  "A pirate ship in the clouds",
  "A dragon playing chess",
  "A fairy tale castle made of candy",
  "An underwater disco party",
  "A superhero walking their dog",
  "A time-traveling pizza delivery"
];

const AI_SUGGESTIONS = [
  "A mysterious forest glowing at midnight",
  "A steampunk elephant with mechanical wings",
  "A cozy library inside a giant mushroom",
  "A chef cooking with rainbow flames",
  "A knight riding a giant butterfly",
  "A crystal cave with floating islands",
  "A vintage car race through the clouds",
  "A magical bookstore in a tree",
  "A cyberpunk garden with neon flowers",
  "A winter festival with dancing snowmen"
];

const PROFANITY_WORDS = ["damn", "hell", "stupid", "hate"]; // Basic filter

const PromptPhase: React.FC<PromptPhaseProps> = ({
  gameState,
  timeRemaining,
  handleSubmitPrompt,
}) => {
  const { players, myPrompt, round } = gameState;
  const currentQuestion = round?.question || "Create something amazing";
  const hasSubmitted = !!myPrompt;

  const [prompt, setPrompt] = useState(myPrompt || "");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [showSubmitted, setShowSubmitted] = useState(false);
  const [hasProfanity, setHasProfanity] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submittedCount = players.filter(p => p.hasSubmitted).length;
  const totalPlayers = players.length;
  const remaining = 200 - prompt.length;

  const validatePrompt = useCallback((text: string) => {
    const trimmed = text.trim();
    setCharacterCount(trimmed.length);

    if (trimmed.length === 0) {
      setValidationError("Prompt cannot be empty");
      return false;
    }
    if (trimmed.length < 3) {
      setValidationError("Prompt must be at least 3 characters");
      return false;
    }
    if (trimmed.length > 200) {
      setValidationError("Prompt must be less than 200 characters");
      return false;
    }

    setValidationError(null);
    return true;
  }, []);

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
    validatePrompt(value);
  }, [validatePrompt]);

  const onSubmitPrompt = useCallback(async (prompt: string) => {
    if (!validatePrompt(prompt)) {
      return; // Don't submit if validation fails
    }

    try {
      if (handleSubmitPrompt) {
        await handleSubmitPrompt(prompt.trim());
        setShowSubmitted(true);
      }
    } catch (error) {
      console.error('Failed to submit prompt:', error);
      // Show error message to user
      setValidationError(error instanceof Error ? error.message : 'Failed to submit prompt');
    }
  }, [validatePrompt, handleSubmitPrompt]);

  // Update prompt when myPrompt changes
  useEffect(() => {
    if (myPrompt && !prompt) {
      setPrompt(myPrompt);
    }
  }, [myPrompt, prompt]);

  // Animated placeholder cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Generate random suggestions
  const generateSuggestions = useCallback(() => {
    const shuffled = [...AI_SUGGESTIONS].sort(() => Math.random() - 0.5);
    setCurrentSuggestions(shuffled.slice(0, 3));
    setShowSuggestions(true);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!prompt.trim() || hasSubmitted || hasProfanity || validationError) return;
    onSubmitPrompt(prompt.trim());
    setTimeout(() => setShowSubmitted(false), 3000);
  }, [prompt, hasSubmitted, hasProfanity, validationError, onSubmitPrompt]);

  // Check for profanity
  useEffect(() => {
    const containsProfanity = PROFANITY_WORDS.some(word => 
      prompt.toLowerCase().includes(word.toLowerCase())
    );
    setHasProfanity(containsProfanity);
  }, [prompt]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [prompt, hasSubmitted, handleSubmit]);

  const getCharacterCountColor = () => {
    if (remaining < 20) return "text-destructive";
    if (remaining < 50) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-display tracking-wide">
          {currentQuestion}
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {submittedCount}/{totalPlayers} submitted
          </span>
          <span className={`text-sm font-mono ${timeRemaining <= 10 ? "text-destructive animate-pulse" : "text-muted-foreground"}`}>
            {timeRemaining}s
          </span>
        </div>
      </div>

      {/* Submission Status */}
      <AnimatePresence>
        {hasSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            data-testid="prompt-submitted-indicator"
            className="flex items-center gap-2 p-3 bg-success/20 border-2 border-success rounded-none"
          >
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">
              Prompt submitted! Waiting for other players...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      {!hasSubmitted && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-input" className="text-sm font-medium">
              Your Creative Prompt
            </Label>
            <div className="relative">
              <Input
                id="prompt-input"
                data-testid="prompt-input"
                maxLength={200}
                value={prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder={EXAMPLE_PROMPTS[placeholderIndex]}
                className={`w-full pr-16 ${validationError ? 'border-red-500' : ''}`}
                disabled={hasSubmitted}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className={`text-xs font-mono ${getCharacterCountColor()}`}>
                  {characterCount}/200
                </span>
              </div>
            </div>
            
            {validationError && (
              <p className="text-red-500 text-sm mt-1">{validationError}</p>
            )}
          </div>

          {/* Profanity Warning */}
          <AnimatePresence>
            {hasProfanity && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 p-3 bg-destructive/20 border-2 border-destructive rounded-none"
              >
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">
                  Please keep your prompt family-friendly
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Suggestions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateSuggestions}
              className="flex items-center gap-2"
            >
              <Lightbulb className="w-3 h-3" />
              AI Assistant
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || hasProfanity || !!validationError}
              data-testid="submit-prompt-button"
              className="flex items-center gap-2"
            >
              Submit
              <span className="text-xs opacity-60">(Ctrl+Enter)</span>
            </Button>
          </div>

          {/* Suggestions Panel */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">AI Suggestions</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSuggestions(false)}
                      className="text-xs"
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {currentSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setPrompt(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left p-2 text-sm bg-muted/50 hover:bg-muted transition-colors rounded-none border border-border hover:border-primary"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Submission Confirmation */}
      <AnimatePresence>
        {showSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
          >
            <Card className="p-6 text-center space-y-4 max-w-sm">
              <CheckCircle className="w-12 h-12 text-success mx-auto" />
              <h3 className="text-lg font-display">Prompt Submitted!</h3>
              <p className="text-sm text-muted-foreground">
                Your creative prompt is in the queue. Get ready for some AI magic!
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromptPhase;