import CreateRoomButton from "./CreateRoomButton";
import JoinRoomForm from "./JoinRoomForm";
import TypewriterText from "@/components/animation/TypewriterText";
import CountUp from "@/components/animation/CountUp";
const mockStats = {
  gamesPlayed: 1234,
  imagesGenerated: 5678,
  playersOnline: 89,
};

export const HeroSection = () => {
  return (
    <header className="relative flex min-h-[92vh] items-center justify-center bg-background">
      <div className="absolute inset-0 bg-checker opacity-20" aria-hidden="true" />
      <div className="relative z-10 container mx-auto px-4 py-16 text-center">
        <h1
          className="font-display text-2xl leading-tight md:text-3xl lg:text-4xl animate-fade-in motion-reduce:animate-none"
          style={{ animationDelay: "0ms" }}
        >
          <TypewriterText text="AI Image Party" delay={0} />
        </h1>
        <p
          className="mx-auto mt-4 max-w-2xl text-lg md:text-xl text-muted-foreground animate-fade-in motion-reduce:animate-none"
          style={{ animationDelay: "100ms" }}
        >
          Generate hilarious AI images to match crazy prompts with friends
        </p>

        <div
          className="mx-auto mt-8 flex w-full max-w-3xl flex-col items-stretch gap-3 md:flex-row md:items-start animate-fade-in motion-reduce:animate-none"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex-1 flex items-center gap-2">
            <span className="hidden dark:inline-block text-foreground crt-glow select-none">&gt;</span>
            <CreateRoomButton />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <span className="hidden dark:inline-block text-foreground crt-glow select-none">&gt;</span>
            <JoinRoomForm />
          </div>
        </div>

        <a href="#how-it-works" className="mt-6 inline-block text-base text-muted-foreground hover:underline">
          See how it works ↓
        </a>

        <div
          className="mt-10 grid grid-cols-1 gap-4 text-base text-muted-foreground sm:grid-cols-3 animate-fade-in motion-reduce:animate-none"
          style={{ animationDelay: "300ms" }}
        >
          <div>
            <span className="font-semibold text-foreground"><CountUp end={mockStats.gamesPlayed} /></span> games played today
          </div>
          <div>
            <span className="font-semibold text-foreground"><CountUp end={mockStats.imagesGenerated} /></span> images generated
          </div>
          <div>
            <span className="font-semibold text-foreground"><CountUp end={mockStats.playersOnline} /></span> players online
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
