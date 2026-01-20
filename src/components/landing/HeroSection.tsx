import { motion, useReducedMotion } from "framer-motion";
import { Gamepad2, Image, Users } from "lucide-react";
import CreateRoomButton from "./CreateRoomButton";
import JoinRoomForm from "./JoinRoomForm";
import TypewriterText from "@/components/animation/TypewriterText";
import StatBadge from "./StatBadge";
import PixelDecoration from "./PixelDecoration";

const mockStats = {
  gamesPlayed: 1234,
  imagesGenerated: 5678,
  playersOnline: 89,
};

export const HeroSection = () => {
  const reduceMotion = useReducedMotion();

  return (
    <header className="relative flex min-h-[92vh] items-center justify-center overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--hero-start))] to-[hsl(var(--hero-end))]"
        aria-hidden="true"
      />

      {/* Checker overlay */}
      <div className="absolute inset-0 bg-checker opacity-10" aria-hidden="true" />

      {/* Floating pixel decorations */}
      <PixelDecoration
        shape="star"
        size="lg"
        color="primary"
        floatSpeed="slow"
        delay={0}
        className="absolute top-[15%] left-[8%] opacity-60"
      />
      <PixelDecoration
        shape="diamond"
        size="md"
        color="accent"
        floatSpeed="medium"
        delay={0.1}
        className="absolute top-[25%] right-[12%] opacity-50"
      />
      <PixelDecoration
        shape="heart"
        size="sm"
        color="primary"
        floatSpeed="fast"
        delay={0.15}
        className="absolute bottom-[30%] left-[5%] opacity-40"
      />
      <PixelDecoration
        shape="square"
        size="md"
        color="muted"
        floatSpeed="slow"
        delay={0.05}
        className="absolute top-[40%] right-[6%] opacity-30"
      />
      <PixelDecoration
        shape="cross"
        size="sm"
        color="accent"
        floatSpeed="medium"
        delay={0.2}
        className="absolute bottom-[20%] right-[15%] opacity-50"
      />
      <PixelDecoration
        shape="star"
        size="sm"
        color="primary"
        floatSpeed="fast"
        delay={0.12}
        className="absolute top-[60%] left-[15%] opacity-35"
      />

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-16 text-center">
        {/* Title - hero reveal animation */}
        <motion.h1
          initial={reduceMotion ? undefined : { opacity: 0, y: 30, scale: 0.95, filter: "blur(4px)" }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight motion-reduce:opacity-100 motion-reduce:transform-none"
        >
          <TypewriterText text="AI Image Party" delay={reduceMotion ? 0 : 0.3} />
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={reduceMotion ? undefined : { opacity: 0, y: 15 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          className="mx-auto mt-6 max-w-2xl text-lg md:text-xl lg:text-2xl text-muted-foreground motion-reduce:opacity-100 motion-reduce:transform-none"
        >
          Generate hilarious AI images to match crazy prompts with friends
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2, ease: "easeOut" }}
          className="mx-auto mt-10 flex w-full max-w-3xl flex-col items-stretch gap-4 md:flex-row md:items-start motion-reduce:opacity-100 motion-reduce:transform-none"
        >
          <div className="flex-1 flex items-center gap-2">
            <span className="hidden dark:inline-block text-foreground crt-glow select-none">&gt;</span>
            <CreateRoomButton />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <span className="hidden dark:inline-block text-foreground crt-glow select-none">&gt;</span>
            <JoinRoomForm />
          </div>
        </motion.div>

        {/* How it works link */}
        <motion.a
          href="#how-it-works"
          initial={reduceMotion ? undefined : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.4 }}
          className="mt-8 inline-block text-base text-muted-foreground hover:text-foreground hover:underline transition-colors motion-reduce:opacity-100"
        >
          See how it works ↓
        </motion.a>

        {/* Stats grid */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-2xl mx-auto">
          <StatBadge
            icon={Gamepad2}
            value={mockStats.gamesPlayed}
            label="games played today"
            delay={1.6}
          />
          <StatBadge
            icon={Image}
            value={mockStats.imagesGenerated}
            label="images generated"
            delay={1.75}
          />
          <StatBadge
            icon={Users}
            value={mockStats.playersOnline}
            label="players online"
            delay={1.9}
          />
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
