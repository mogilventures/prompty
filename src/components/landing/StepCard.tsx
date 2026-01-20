import { motion, useReducedMotion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/8bit/card";
import { cn } from "@/lib/utils";

interface StepCardProps {
  stepNumber: number;
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
  showConnector?: boolean;
  className?: string;
}

export const StepCard = ({
  stepNumber,
  icon: Icon,
  title,
  description,
  delay = 0,
  showConnector = false,
  className,
}: StepCardProps) => {
  const reduceMotion = useReducedMotion();
  const formattedNumber = stepNumber.toString().padStart(2, "0");

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={cn(
        "relative motion-reduce:opacity-100 motion-reduce:transform-none",
        className
      )}
    >
      {/* Connection line to next step (desktop only) */}
      {showConnector && (
        <div
          className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-border to-transparent z-0"
          aria-hidden="true"
        />
      )}

      <Card className="relative h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none">
        {/* Step number badge */}
        <div
          className="absolute -top-3 -left-3 w-10 h-10 bg-primary text-primary-foreground font-display text-sm flex items-center justify-center border-2 border-background shadow-md z-20"
          aria-hidden="true"
        >
          {formattedNumber}
        </div>

        <CardContent className="p-6 pt-8">
          <div className="flex items-start gap-4">
            {/* Icon in bordered square */}
            <div className="shrink-0 w-12 h-12 border-2 border-primary/30 bg-primary/5 rounded flex items-center justify-center">
              <Icon
                className="text-primary"
                size={24}
                strokeWidth={2}
                aria-hidden="true"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StepCard;
