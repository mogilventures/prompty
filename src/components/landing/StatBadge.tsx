import { motion, useReducedMotion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import CountUp from "@/components/animation/CountUp";
import { cn } from "@/lib/utils";

interface StatBadgeProps {
  icon: LucideIcon;
  value: number;
  label: string;
  delay?: number;
  className?: string;
}

export const StatBadge = ({
  icon: Icon,
  value,
  label,
  delay = 0,
  className,
}: StatBadgeProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.9 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={cn(
        "group relative border-2 border-border bg-card/80 backdrop-blur-sm rounded-lg p-4 text-center",
        "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/50",
        "motion-reduce:transform-none",
        className
      )}
    >
      {/* Corner pixel decorations */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-foreground/60 -translate-x-px -translate-y-px" aria-hidden="true" />
      <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-foreground/60 translate-x-px -translate-y-px" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-foreground/60 -translate-x-px translate-y-px" aria-hidden="true" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-foreground/60 translate-x-px translate-y-px" aria-hidden="true" />

      <Icon
        className="mx-auto mb-2 text-primary transition-transform duration-200 group-hover:scale-110"
        size={24}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <div
        className={cn(
          "font-display text-2xl md:text-3xl text-foreground",
          !reduceMotion && "animate-stat-pulse"
        )}
      >
        <CountUp end={value} delay={delay + 0.3} />
      </div>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
};

export default StatBadge;
