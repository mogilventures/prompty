import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/8bit/button";
import { Play, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import UsernameDialog from "@/components/auth/UsernameDialog";
import { toast } from "sonner";

export const CreateRoomButton = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const updateUsername = useMutation(api.users.updateUsername);
  const createRoom = useMutation(api.rooms.create.createRoom);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [pendingRoomCreation, setPendingRoomCreation] = useState(false);

  const createAndNavigateToRoom = useCallback(async () => {
    setIsCreatingRoom(true);
    try {
      console.log("Creating room...");
      const result = await createRoom({
        name: "New Game Room",
        settings: {
          maxPlayers: 8,
          roundsPerGame: 5,
          timePerRound: 90,
          isPrivate: false,
        }
      });
      console.log("Room created:", result);
      navigate(`/room/${result.roomId}`);
      toast.success(`Room created! Code: ${result.code}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      toast.error("Failed to create room. Please try again.");
    } finally {
      setIsCreatingRoom(false);
    }
  }, [createRoom, navigate]);

  // Handle post-sign-in logic
  useEffect(() => {
    if (pendingRoomCreation && isAuthenticated && !isLoading && user) {
      setPendingRoomCreation(false);
      
      // Check if user has a username
      if (!user.username) {
        console.log("User has no username, showing dialog");
        setShowNameModal(true);
      } else {
        console.log("User has username, creating room");
        createAndNavigateToRoom();
      }
    }
  }, [pendingRoomCreation, isAuthenticated, isLoading, user, createAndNavigateToRoom]);

  const handleCreateRoom = useCallback(async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (isAuthenticated && user && !user.username) {
      setShowNameModal(true);
      return;
    }

    if (isAuthenticated && user?.username) {
      createAndNavigateToRoom();
    }
  }, [isAuthenticated, user, navigate, createAndNavigateToRoom]);

  const handleNameSubmit = useCallback(
    async (name: string) => {
      try {
        await updateUsername({ username: name });
        setShowNameModal(false);
        createAndNavigateToRoom();
      } catch (error) {
        console.error("Failed to update username:", error);
        // Dialog will show the error and remain open
      }
    },
    [updateUsername, createAndNavigateToRoom]
  );

  const handleNameClose = useCallback(() => {
    setShowNameModal(false);
  }, []);

  return (
    <>
      <Button
        size="lg"
        onClick={handleCreateRoom}
        aria-label="Create Room"
        className="w-full hover-scale motion-reduce:transform-none"
        disabled={isLoading || isSigningIn || isCreatingRoom}
      >
        {isCreatingRoom ? <Loader2 className="animate-spin" /> : <Play />}
        {isLoading || isSigningIn ? "Loading..." : isCreatingRoom ? "Creating..." : "Create Room"}
      </Button>
      <UsernameDialog open={showNameModal} onSubmit={handleNameSubmit} onClose={handleNameClose} />
    </>
  );
};

export default CreateRoomButton;
