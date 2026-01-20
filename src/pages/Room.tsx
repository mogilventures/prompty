import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Share2, Crown, Loader2, Users, Play, Settings, UserX, LogOut, Clock, Check } from "lucide-react";
import { toast } from "sonner";
import RoomSettings from "@/components/room/RoomSettings";
import RoomSettingsDialog from "@/components/room/RoomSettingsDialog";
import UsernameDialog from "@/components/auth/UsernameDialog";
import { useAuth } from "@/hooks/useAuth";
import { useRoom } from "@/hooks/useRoom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const Room = () => {
  // Get roomId from URL params
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // User authentication
  const { user, isLoading: userLoading, isAuthenticated } = useAuth();
  const updateUsername = useMutation(api.users.updateUsername);
  
  // Use the room hook for real data
  const {
    roomState,
    isHost,
    canStartGame,
    handleLeaveRoom,
    handleKickPlayer,
    handleUpdateSettings,
    handleStartGame,
    isLoading: roomLoading,
  } = useRoom(roomId);

  // State for UI
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();
  
  // Only show username dialog if user is authenticated but doesn't have username
  const showUsernameDialog = !userLoading && isAuthenticated && user && !user.username;

  // Page metadata
  useEffect(() => {
    const code = roomState?.room?.code || 'Unknown';
    document.title = `Room ${code} — AI Image Party`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        `Room ${code} lobby. Invite friends and start the AI Image Party game.`
      );
    }
  }, [roomState?.room?.code]);

  // Actions
  const handleCopyCode = async () => {
    if (roomState?.room?.code) {
      await navigator.clipboard.writeText(roomState.room.code);
      setCopied(true);
      toast.success("Room code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleShareLink = async () => {
    if (roomState?.room?._id) {
      const url = `${window.location.origin}/room/${roomState.room._id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Room link copied!");
    }
  };

  const handleGameStart = async () => {
    if (!canStartGame || !roomId) {
      toast.error("Cannot start game yet");
      return;
    }
    
    try {
      await handleStartGame();
      toast.success("Game started!");
      navigate(`/play/${roomId}`);
    } catch (error) {
      console.error("Failed to start game:", error);
      toast.error("Failed to start game");
    }
  };

  const handleUsernameSaved = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    try {
      await updateUsername({ username: trimmed });
      // The user query will automatically refresh after the mutation
    } catch (error) {
      console.error("Failed to update username:", error);
    }
  };

  const handleUsernameDialogClose = () => {
    // If user tries to close without setting username, redirect to dashboard
    if (user && !user.username) {
      navigate("/app/dashboard");
    }
  };

  // Show loading state while authentication is being checked
  if (userLoading || roomLoading) {
    return (
      <main className="container mx-auto min-h-screen px-4 py-16">
        <Header />
        <div className="pt-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    );
  }

  // Show room not found if no room state
  if (!roomState) {
    return (
      <main className="container mx-auto min-h-screen px-4 py-16">
        <Helmet>
          <title>Room not found — AI Image Party</title>
          <meta name="description" content="The room you requested was not found." />
        </Helmet>
        <Header />
        <div className="pt-16">
          <Card className="max-w-md mx-auto p-6">
            <h1 className="font-display text-2xl mb-4">Room not found</h1>
            <p className="text-muted-foreground mb-6">This room doesn't exist or has been deleted.</p>
            <Button 
              onClick={() => navigate("/app/dashboard")} 
              variant="outline" 
              className="w-full"
            >
              ← Back to Dashboard
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  const { room, players } = roomState;
  const connectedPlayers = players.filter(p => p.status === "connected");
  const isFull = connectedPlayers.length >= room.settings.maxPlayers;

  return (
    <>
      <Helmet>
        <title>Room {room.code} — AI Image Party</title>
        <meta
          name="description"
          content={`Room ${room.code} lobby. Invite friends and get ready to play AI Image Party.`}
        />
        <link rel="canonical" href={`${window.location.origin}/room/${room._id}`} />
      </Helmet>
      <Header />
      <main className="container mx-auto min-h-screen px-4 pt-16 pb-28">
        <h1 className="sr-only">Room Lobby {room.code}</h1>

        {/* Room Header Card */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Card className="mb-6 relative">
            {/* Corner pixel decorations */}
            <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-foreground/60 -translate-x-px -translate-y-px" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-foreground/60 translate-x-px -translate-y-px" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-foreground/60 -translate-x-px translate-y-px" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-foreground/60 translate-x-px translate-y-px" aria-hidden="true" />

            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl font-display">{room.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-3">
                    {/* Enhanced Room Code Badge */}
                    <motion.div
                      className="relative group"
                      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    >
                      <button
                        onClick={handleCopyCode}
                        className="relative px-5 py-3 bg-primary/5 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all duration-200 font-mono text-xl tracking-[0.15em] font-bold cursor-pointer"
                        data-testid="room-code"
                        aria-label={`Room code: ${room.code}. Click to copy.`}
                      >
                        {/* Corner decorations on badge */}
                        <div className="absolute top-0 left-0 w-1 h-1 bg-primary/60 -translate-x-px -translate-y-px" aria-hidden="true" />
                        <div className="absolute top-0 right-0 w-1 h-1 bg-primary/60 translate-x-px -translate-y-px" aria-hidden="true" />
                        <div className="absolute bottom-0 left-0 w-1 h-1 bg-primary/60 -translate-x-px translate-y-px" aria-hidden="true" />
                        <div className="absolute bottom-0 right-0 w-1 h-1 bg-primary/60 translate-x-px translate-y-px" aria-hidden="true" />

                        <span className="text-foreground">{room.code}</span>

                        {/* Copy indicator */}
                        <AnimatePresence>
                          {copied && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-success text-success-foreground rounded-full flex items-center justify-center"
                            >
                              <Check className="w-3 h-3" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </motion.div>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleCopyCode}
                      aria-label="Copy Code"
                      className="h-12 w-12"
                    >
                      <Copy className={`h-4 w-4 transition-transform duration-200 ${copied ? 'scale-110 text-success' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleShareLink}
                      aria-label="Share Link"
                      className="h-12 w-12"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              
              <div className="flex gap-2">
                {isHost && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleLeaveRoom}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
        </motion.div>

        {isFull && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border-2 border-foreground bg-background p-3 text-sm" 
            role="status"
          >
            Room is full
          </motion.div>
        )}

        {/* Room Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge className="mt-1" variant={room.status === 'waiting' ? 'default' : 'secondary'}>
              {room.status}
            </Badge>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Players</p>
            <p className="text-2xl font-bold mt-1" data-testid="player-count">
              {connectedPlayers.length}/{room.settings.maxPlayers}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Rounds</p>
            <p className="text-2xl font-bold mt-1">
              {room.settings.roundsPerGame}
            </p>
          </Card>
        </div>

        {/* Players Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Players ({connectedPlayers.length}/{room.settings.maxPlayers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <AnimatePresence>
                {players.map((player) => (
                  <motion.div
                    key={player._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-foreground">
                            {player.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
                            player.status === "connected" ? "bg-success" : "bg-muted-foreground"
                          }`}
                          aria-label={player.status === "connected" ? "connected" : "disconnected"}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{player.displayName}</p>
                          {player.isHost && (
                            <Badge variant="secondary" className="inline-flex items-center gap-1">
                              <Crown className="h-3 w-3" /> Host
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {player.status === "connected" ? "Online" : 
                           player.status === "disconnected" ? "Reconnecting..." : "Kicked"}
                        </p>
                      </div>
                    </div>
                    
                    {isHost && !player.isHost && player.status === "connected" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleKickPlayer(player._id)}
                        aria-label={`Kick ${player.displayName}`}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {connectedPlayers.length < 2 && (
              <p className="mt-3 text-sm text-muted-foreground text-center">
                Waiting for more players to join...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Game Settings Display */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Game Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Time per round: {room.settings.timePerRound}s</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Max players: {room.settings.maxPlayers}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Rounds: {room.settings.roundsPerGame}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Private: {room.settings.isPrivate ? "Yes" : "No"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Section (desktop) */}
        <section className="mt-8 hidden md:block">
          {isHost && room.status === "waiting" ? (
            <div className="space-y-4">
              <Button
                size="xl"
                onClick={handleGameStart}
                disabled={!canStartGame}
                variant="neon"
                aria-label="Start Game"
                className="w-full"
              >
                <Play className="mr-2 h-5 w-5" />
                {canStartGame ? "Start Game" : "Need at least 2 players to start"}
              </Button>
            </div>
          ) : !isHost && room.status === "waiting" ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Waiting for host to start the game</span>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Game is {room.status}
            </div>
          )}
        </section>
      </main>

      {/* Mobile fixed action bar */}
      <div className="mobile-bottom-bar fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur md:hidden">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          {isHost && room.status === "waiting" ? (
            <Button
              className="flex-1"
              size="lg"
              onClick={handleGameStart}
              disabled={!canStartGame}
              variant="neon"
              aria-label="Start Game"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Game
            </Button>
          ) : !isHost && room.status === "waiting" ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Waiting for host...</span>
            </div>
          ) : (
            <div className="flex-1 text-center text-muted-foreground">
              Game is {room.status}
            </div>
          )}
          <Button variant="outline" size="lg" onClick={handleLeaveRoom} aria-label="Leave Room">
            <LogOut className="h-4 w-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      {/* Settings Dialog */}
      {showSettings && isHost && (
        <RoomSettingsDialog
          roomId={room._id}
          currentSettings={{
            maxPlayers: room.settings.maxPlayers,
            roundsPerGame: room.settings.roundsPerGame,
            timePerRound: room.settings.timePerRound,
            isPrivate: room.settings.isPrivate,
          }}
          onClose={() => setShowSettings(false)}
          onSave={handleUpdateSettings}
        />
      )}

      {/* Username Dialog - force open for users without a name */}
      <UsernameDialog 
        open={!!showUsernameDialog} 
        onSubmit={handleUsernameSaved} 
        onClose={handleUsernameDialogClose}
      />
    </>
  );
};

export default Room;
