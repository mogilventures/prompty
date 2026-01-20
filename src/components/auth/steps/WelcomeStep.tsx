import { Button } from "@/components/ui/8bit/button";
import { OnboardingStepProps } from "../OnboardingWizard";
import { useAuth } from "@/hooks/useAuth";
import { motion, useReducedMotion } from "framer-motion";
import { Gamepad2, Users, Trophy } from "lucide-react";

const features = [
  {
    icon: Gamepad2,
    text: "Create and join game rooms",
    colorClass: "bg-primary/10 text-primary",
  },
  {
    icon: Users,
    text: "Play with friends and meet new players",
    colorClass: "bg-accent/10 text-accent",
  },
  {
    icon: Trophy,
    text: "Track your game stats and achievements",
    colorClass: "bg-success/20 text-success",
  },
];

export function WelcomeStep({ onNext, isFirst }: OnboardingStepProps) {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  const handleContinue = () => {
    onNext();
  };

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
    hidden: reduceMotion ? {} : { opacity: 0, y: 10 },
    visible: reduceMotion ? {} : { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="space-y-6 text-center"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Welcome illustration/icon */}
      <motion.div className="flex justify-center" variants={itemVariants}>
        <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center">
          <Gamepad2 className="w-10 h-10 text-primary" />
        </div>
      </motion.div>

      {/* Welcome message */}
      <motion.div className="space-y-3" variants={itemVariants}>
        <h3 className="text-2xl font-display font-bold">Welcome to Prompty!</h3>
        <p className="text-muted-foreground leading-relaxed">
          Let's complete your profile so you can start playing with others.
        </p>
      </motion.div>

      {/* Features preview */}
      <motion.div
        className="grid grid-cols-1 gap-3 text-sm"
        variants={containerVariants}
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-3"
            variants={itemVariants}
            transition={{ delay: reduceMotion ? 0 : 0.2 + index * 0.1 }}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${feature.colorClass}`}>
              <feature.icon className="w-4 h-4" />
            </div>
            <span className="text-left">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Continue button */}
      <motion.div className="pt-4" variants={itemVariants}>
        <Button
          size="lg"
          onClick={handleContinue}
          className="w-full"
        >
          Let's get started!
        </Button>
      </motion.div>
    </motion.div>
  );
}
