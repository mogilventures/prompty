import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/8bit/button";
import { LogIn, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useToast } from "@/hooks/useToast";
import UsernameDialog from "@/components/auth/UsernameDialog";

// Constants
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
const DEFAULT_ERROR_MESSAGE = "Unable to join room. Please try again.";

export const JoinRoomForm = () => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const updateUsername = useMutation(api.users.updateUsername);
  const joinRoom = useMutation(api.rooms.join.joinRoom);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const navigateToRoom = useCallback((roomId: string) => {
    navigate(`/room/${roomId}`);
    toast({
      title: "Joined room successfully!",
      description: "Welcome to the game room.",
    });
  }, [navigate, toast]);

  // Helper function to provide user-friendly error messages
  const getErrorMessage = useCallback((backendError: string): string => {
    if (backendError.includes("Room not found")) {
      return "Room not found. Please check the code and try again.";
    }
    if (backendError.includes("Room is full")) {
      return "This room is full. Try joining a different room.";
    }
    if (backendError.includes("Game already started")) {
      return "This game has already started and doesn't allow late joining.";
    }
    if (backendError.includes("Game has ended")) {
      return "This game has already ended. Please join a different room.";
    }
    if (backendError.includes("kicked from this room")) {
      return "You have been removed from this room and cannot rejoin.";
    }
    if (backendError.includes("Not authenticated")) {
      return "Authentication required. Please try again.";
    }
    if (backendError.includes("complete onboarding")) {
      return "Please complete your profile setup first.";
    }
    // Generic fallback
    return DEFAULT_ERROR_MESSAGE;
  }, []);

  const handleJoin = useCallback(async () => {
    // Reset error state
    setError(null);
    
    // Validate room code format
    if (!ROOM_CODE_REGEX.test(code)) {
      setError(`Please enter a valid ${ROOM_CODE_LENGTH}-character room code`);
      return;
    }
    
    setIsJoining(true);
    
    try {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        navigate("/login");
        return;
      }
      
      // Check if user has a username, if not show dialog
      if (isAuthenticated && user && !user.username) {
        setShowNameModal(true);
        setIsJoining(false);
        return;
      }
      
      // Try to join the room using the backend
      if (isAuthenticated && user?.username) {
        try {
          const result = await joinRoom({ code: code.toUpperCase() });
          if (result.success && result.roomId) {
            navigateToRoom(result.roomId);
          }
        } catch (joinError: unknown) {
          // Handle specific error cases from backend
          const errorMessage = joinError instanceof Error 
            ? joinError.message 
            : DEFAULT_ERROR_MESSAGE;
          setError(getErrorMessage(errorMessage));
        }
      }
    } finally {
      setIsJoining(false);
    }
  }, [code, isAuthenticated, isSigningIn, signIn, user, navigate, navigateToRoom, joinRoom, getErrorMessage]);

  const handleNameSubmit = useCallback(
    async (name: string) => {
      try {
        await updateUsername({ username: name });
        setShowNameModal(false);
        
        // Now try to join the room with the updated username
        try {
          const result = await joinRoom({ code: code.toUpperCase() });
          if (result.success && result.roomId) {
            navigateToRoom(result.roomId);
          }
        } catch (joinError: unknown) {
          const errorMessage = joinError instanceof Error 
            ? joinError.message 
            : DEFAULT_ERROR_MESSAGE;
          setError(getErrorMessage(errorMessage));
        }
      } catch (error) {
        console.error("Failed to update username:", error);
        // Dialog will show the error and remain open
      }
    },
    [code, updateUsername, navigateToRoom, joinRoom, getErrorMessage]
  );

  const handleNameClose = useCallback(() => {
    setShowNameModal(false);
  }, []);

  const isFormDisabled = isLoading || isSigningIn || isJoining;
  const shouldShowError = error && code.length === ROOM_CODE_LENGTH;

  return (
    <>
      <form
        className="flex w-full flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleJoin();
        }}
      >
        <div className="flex w-full items-center gap-2">
          <Input
            aria-label="Room code"
            aria-describedby={shouldShowError ? "join-error" : undefined}
            aria-invalid={shouldShowError}
            placeholder="ROOM CODE"
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            onChange={(e) => {
              const next = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH);
              setCode(next);
              if (error) setError(null); // Clear error when user starts typing
            }}
            className={`flex-1 min-w-0 px-2 sm:px-3 h-12 text-center tracking-[0.1em] uppercase md:h-12 [&::placeholder]:whitespace-nowrap [&::placeholder]:tracking-tighter [&::placeholder]:normal-case [&::placeholder]:text-[9px] sm:[&::placeholder]:text-xs md:[&::placeholder]:text-sm ${
              shouldShowError ? "border-destructive focus:border-destructive" : ""
            }`}
            disabled={isFormDisabled}
          />
          <Button 
            type="submit" 
            variant="outline" 
            size="xl" 
            aria-label="Join room with code"
            disabled={isFormDisabled || code.length !== ROOM_CODE_LENGTH}
          >
            {isJoining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <LogIn />
                {isLoading || isSigningIn ? "Loading..." : "Join"}
              </>
            )}
          </Button>
        </div>
        
        {/* Error message display */}
        {shouldShowError && (
          <div
            id="join-error"
            role="alert"
            className="text-sm text-destructive px-2 py-1 rounded bg-destructive/10 border border-destructive/20"
          >
            {error}
          </div>
        )}
        
        {/* Help text */}
        <div className="text-xs text-muted-foreground text-center px-2">
          Enter a {ROOM_CODE_LENGTH}-character room code to join an existing game
        </div>
      </form>
      <UsernameDialog open={showNameModal} onSubmit={handleNameSubmit} onClose={handleNameClose} />
    </>
  );
};

export default JoinRoomForm;
