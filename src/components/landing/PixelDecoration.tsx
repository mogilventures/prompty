import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Shape = "star" | "diamond" | "square" | "cross" | "heart";
type Size = "sm" | "md" | "lg";
type Color = "primary" | "accent" | "muted";
type FloatSpeed = "slow" | "medium" | "fast";

interface PixelDecorationProps {
  shape: Shape;
  size?: Size;
  color?: Color;
  floatSpeed?: FloatSpeed;
  className?: string;
  delay?: number;
}

const sizeMap: Record<Size, number> = {
  sm: 12,
  md: 20,
  lg: 32,
};

const colorMap: Record<Color, string> = {
  primary: "fill-primary",
  accent: "fill-accent",
  muted: "fill-muted-foreground/40",
};

const floatSpeedMap: Record<FloatSpeed, string> = {
  slow: "animate-float-slow",
  medium: "animate-float-medium",
  fast: "animate-float-fast",
};

const shapes: Record<Shape, (size: number) => React.ReactNode> = {
  star: (size) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className="current">
      <path d="M8 0L10 6H16L11 10L13 16L8 12L3 16L5 10L0 6H6L8 0Z" />
    </svg>
  ),
  diamond: (size) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className="current">
      <path d="M8 0L16 8L8 16L0 8L8 0Z" />
    </svg>
  ),
  square: (size) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className="current">
      <rect x="2" y="2" width="12" height="12" />
    </svg>
  ),
  cross: (size) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className="current">
      <path d="M6 0H10V6H16V10H10V16H6V10H0V6H6V0Z" />
    </svg>
  ),
  heart: (size) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className="current">
      <path d="M8 14L2 8C0 6 0 3 2 2C4 1 6 2 8 4C10 2 12 1 14 2C16 3 16 6 14 8L8 14Z" />
    </svg>
  ),
};

export const PixelDecoration = ({
  shape,
  size = "md",
  color = "primary",
  floatSpeed = "medium",
  className,
  delay = 0,
}: PixelDecorationProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
      animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 15,
        delay,
      }}
      className={cn(
        colorMap[color],
        !reduceMotion && floatSpeedMap[floatSpeed],
        "motion-reduce:transform-none",
        className
      )}
      aria-hidden="true"
    >
      {shapes[shape](sizeMap[size])}
    </motion.div>
  );
};

export default PixelDecoration;
