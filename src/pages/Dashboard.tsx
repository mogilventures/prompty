import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { Input } from "@/components/ui/8bit/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { DoorOpen, Grid3X3, LogOut, Plus, Gamepad2, Trophy, ImageIcon, Percent, LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCreateRoom, useJoinRoom } from "@/hooks/useRoom";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import CountUp from "@/components/animation/CountUp";

const mockStats = {
  gamesPlayed: 42,
  gamesWon: 12,
  imagesCreated: 168,
  winRate: 28.6,
};

const mockRecentGames = [
  { id: "1", date: "2024-01-15", players: 5, placement: 1 },
  { id: "2", date: "2024-01-14", players: 4, placement: 3 },
  { id: "3", date: "2024-01-13", players: 6, placement: 2 },
  { id: "4", date: "2024-01-12", players: 3, placement: 1 },
  { id: "5", date: "2024-01-11", players: 7, placement: 4 },
];

const formatPlacement = (n: number) => {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
};

const quickActions = [
  {
    number: "01",
    icon: Plus,
    title: "Create New Room",
    description: "Start a new game",
    action: "create",
  },
  {
    number: "02",
    icon: DoorOpen,
    title: "Join Room",
    description: "Enter a room code",
    action: "join",
  },
  {
    number: "03",
    icon: Grid3X3,
    title: "Public Rooms",
    description: "Find a game to join",
    action: "browse",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { signOut } = useAuthActions();
  const { handleCreateRoom } = useCreateRoom();
  const { handleJoinRoom: joinRoom } = useJoinRoom();
  const [showJoin, setShowJoin] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const reduceMotion = useReducedMotion();

  // SEO
  const canonical = useMemo(
    () => `${window.location.origin}/app/dashboard`,
    []
  );

  // Actions - room creation handled by useCreateRoom hook
  const handleCreateRoomClick = async () => {
    const result = await handleCreateRoom("New Game Room", {
      maxPlayers: 8,
      roundsPerGame: 5,
      timePerRound: 90,
      isPrivate: false,
    });

    if (!result.success && result.error) {
      toast.error(result.error);
    }
  };

  const handleJoinRoomClick = async () => {
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
      toast.error("Please enter a valid 6-character code (letters and numbers)");
      return;
    }

    const result = await joinRoom(roomCode);
    if (!result.success) {
      toast.error(result.error || "Failed to join room");
      return; // Don't close dialog on error
    }
    setShowJoin(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleQuickAction = (action: string) => {
    if (action === "create") {
      handleCreateRoomClick();
    } else if (action === "join") {
      setShowJoin(true);
    } else if (action === "browse") {
      toast.info("Public Rooms coming soon!");
    }
  };

  // Use real user data or fallback to mock for stats
  const stats = user ? {
    gamesPlayed: user.gamesPlayed || 0,
    gamesWon: user.gamesWon || 0,
    imagesCreated: (user.gamesPlayed || 0) * 4, // estimate
    winRate: user.gamesPlayed ? ((user.gamesWon || 0) / user.gamesPlayed * 100) : 0,
  } : mockStats;
  const recent = mockRecentGames; // Keep mock for now

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: reduceMotion ? {} : { opacity: 0, y: 20 },
    visible: reduceMotion ? {} : { opacity: 1, y: 0 },
  };

  return (
    <>
      <Helmet>
        <title>Dashboard — AI Image Party</title>
        <meta
          name="description"
          content="User dashboard for AI Image Party. Quick actions, mock stats, and recent games."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <Header />
      <main className="container mx-auto pt-16 pb-10">
        <h1 className="sr-only">User Dashboard</h1>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Page header with sign out */}
          <motion.section
            className="mb-6 flex items-center justify-between gap-4"
            variants={itemVariants}
          >
            <div>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Welcome back</p>
                  <p className="mt-1 text-2xl font-display font-semibold tracking-tight">
                    {user?.username || user?.displayName || "User"}!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleString()}
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="lg" onClick={handleSignOut} aria-label="Sign out">
                <LogOut />
                Sign Out
              </Button>
            </div>
          </motion.section>

          {/* Quick Actions */}
          <motion.section aria-labelledby="quick-actions" className="mb-8" variants={itemVariants}>
            <h2 id="quick-actions" className="mb-3 text-xl font-semibold">
              Quick Actions
            </h2>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quickActions.map((action, index) => (
                  <QuickActionCard
                    key={action.action}
                    number={action.number}
                    icon={action.icon}
                    title={action.title}
                    description={action.description}
                    onClick={() => handleQuickAction(action.action)}
                    delay={reduceMotion ? 0 : index * 0.1}
                    testId={action.action === "create" ? "create-room-button" : action.action === "join" ? "join-room-button" : undefined}
                  />
                ))}
              </div>
            )}
          </motion.section>

          {/* Stats */}
          <motion.section aria-labelledby="stats" className="mb-8" variants={itemVariants}>
            <h2 id="stats" className="mb-3 text-xl font-semibold">
              Your Stats
            </h2>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard icon={Gamepad2} label="Games Played" value={stats.gamesPlayed} delay={reduceMotion ? 0 : 0.2} />
                <StatCard icon={Trophy} label="Games Won" value={stats.gamesWon} delay={reduceMotion ? 0 : 0.3} />
                <StatCard icon={ImageIcon} label="Images Created" value={stats.imagesCreated} delay={reduceMotion ? 0 : 0.4} />
                <StatCard icon={Percent} label="Win Rate" value={stats.winRate} suffix="%" delay={reduceMotion ? 0 : 0.5} />
              </div>
            )}
          </motion.section>

          {/* Recent Games */}
          <motion.section aria-labelledby="recent" className="mb-8" variants={itemVariants}>
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent" className="text-lg font-medium">
                Recent Games
              </h2>
              {!isLoading && (
                <Link to="#" className="story-link text-sm">
                  View all
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : recent.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    No games yet. Create a room to get started!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="divide-y">
                {recent.map((g) => (
                  <article key={g.id} className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-base font-medium">
                          {new Date(g.date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          })}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {g.players} players • {formatPlacement(g.placement)} place
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info("Game details coming soon!")}
                        aria-label="View game details"
                      >
                        View details
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </motion.section>
        </motion.div>
      </main>

      {/* Join Room Modal */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Join a Room</DialogTitle>
            <DialogDescription>Enter a 6-letter code</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              aria-label="Room code"
              placeholder="Enter 6-letter code"
              value={roomCode}
              maxLength={6}
              onChange={(e) =>
                setRoomCode(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
                )
              }
              className="h-12 text-center tracking-[0.1em] uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Letters and numbers A-Z, 0-9. Example: ABC123
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoin(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinRoomClick}>Join</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  delay?: number;
}

function StatCard({ icon: Icon, label, value, suffix = "", delay = 0 }: StatCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.95 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none">
        {/* Corner pixel decorations */}
        <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-foreground/60 -translate-x-px -translate-y-px" aria-hidden="true" />
        <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-foreground/60 translate-x-px -translate-y-px" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-foreground/60 -translate-x-px translate-y-px" aria-hidden="true" />
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-foreground/60 translate-x-px translate-y-px" aria-hidden="true" />

        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-primary/10 flex items-center justify-center rounded">
              <Icon className="h-4 w-4 text-primary transition-transform duration-200 group-hover:scale-110" />
            </div>
          </div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl font-display">
            <CountUp end={value} delay={delay + 0.2} />
            {suffix}
          </CardTitle>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

interface QuickActionCardProps {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  delay?: number;
  testId?: string;
}

function QuickActionCard({ number, icon: Icon, title, description, onClick, delay = 0, testId }: QuickActionCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Card className="relative transition-all duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none">
        {/* Step number badge */}
        <div
          className="absolute -top-3 -left-3 w-10 h-10 bg-primary text-primary-foreground font-display text-sm flex items-center justify-center border-2 border-background shadow-md z-20"
          aria-hidden="true"
        >
          {number}
        </div>

        <button
          onClick={onClick}
          className="flex h-full w-full flex-col items-start p-6 pt-8 text-left"
          aria-label={title}
          data-testid={testId}
        >
          <div className="mb-3 w-12 h-12 border-2 border-primary/30 bg-primary/5 rounded flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </button>
      </Card>
    </motion.div>
  );
}

export default Dashboard;
