import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "./use-auth";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect } from "react";

export function useRoom(roomId: string | undefined) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const roomState = useQuery(
    api.rooms.getRoomState,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip"
  );
  
  const leaveRoom = useMutation(api.rooms.leaveRoom);
  const kickPlayer = useMutation(api.rooms.kickPlayer);
  const updateSettings = useMutation(api.rooms.updateRoomSettings);
  const startGame = useMutation(api.game.startGame);
  
  const handleLeaveRoom = useCallback(async () => {
    if (!roomId) return;

    try {
      await leaveRoom({ roomId: roomId as Id<"rooms"> });
      navigate("/app/dashboard");
    } catch (error) {
      console.error("Failed to leave room:", error);
      throw error;
    }
  }, [roomId, leaveRoom, navigate]);
  
  const handleKickPlayer = useCallback(async (playerId: Id<"players">) => {
    if (!roomId) return;
    
    try {
      await kickPlayer({ 
        roomId: roomId as Id<"rooms">,
        playerId 
      });
    } catch (error) {
      console.error("Failed to kick player:", error);
      throw error;
    }
  }, [roomId, kickPlayer]);
  
  const handleUpdateSettings = useCallback(async (settings: {
    maxPlayers?: number;
    roundsPerGame?: number;
    timePerRound?: number;
    isPrivate?: boolean;
  }) => {
    if (!roomId) return;
    
    try {
      await updateSettings({
        roomId: roomId as Id<"rooms">,
        settings
      });
    } catch (error) {
      console.error("Failed to update settings:", error);
      throw error;
    }
  }, [roomId, updateSettings]);
  
  const handleStartGame = useCallback(async () => {
    if (!roomId) return;
    
    try {
      await startGame({ roomId: roomId as Id<"rooms"> });
      // Game will automatically redirect when it starts
    } catch (error) {
      console.error("Failed to start game:", error);
      throw error;
    }
  }, [roomId, startGame]);
  
  // Auto-redirect when game starts
  useEffect(() => {
    if (roomState?.room?.status === "playing" && roomId) {
      navigate(`/play/${roomId}`);
    }
  }, [roomState?.room?.status, roomId, navigate]);
  
  const isHost = roomState?.isHost ?? false;
  const canStartGame = roomState?.canStart ?? false;
  
  return {
    roomState,
    isHost,
    canStartGame,
    handleLeaveRoom,
    handleKickPlayer,
    handleUpdateSettings,
    handleStartGame,
    isLoading: roomState === undefined,
    error: null, // Error handling can be added later if needed
  };
}

export function useJoinRoom() {
  const joinRoom = useMutation(api.rooms.joinRoom);
  const navigate = useNavigate();
  
  const handleJoinRoom = useCallback(async (code: string) => {
    try {
      const result = await joinRoom({ code: code.toUpperCase() });
      if (result.roomId) {
        navigate(`/room/${result.roomId}`);
        return { success: true, roomId: result.roomId };
      }
      return { success: false, error: "Room not found" };
    } catch (error) {
      console.error("Failed to join room:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to join room" 
      };
    }
  }, [joinRoom, navigate]);
  
  return { handleJoinRoom };
}

export function useCreateRoom() {
  const createRoom = useMutation(api.rooms.createRoom);
  const navigate = useNavigate();
  
  const handleCreateRoom = useCallback(async (
    name?: string, 
    settings?: {
      maxPlayers?: number;
      roundsPerGame?: number;
      timePerRound?: number;
      isPrivate?: boolean;
    }
  ) => {
    try {
      const result = await createRoom({
        name: name || "New Game Room",
        settings: settings || {}
      });
      
      if (result.roomId) {
        navigate(`/room/${result.roomId}`);
        return { success: true, roomId: result.roomId, code: result.code };
      }
      return { success: false, error: "Failed to create room" };
    } catch (error) {
      console.error("Failed to create room:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create room" 
      };
    }
  }, [createRoom, navigate]);
  
  return { handleCreateRoom };
}