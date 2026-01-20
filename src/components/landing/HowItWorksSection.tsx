import { motion, useReducedMotion } from "framer-motion";
import { Users, Sparkles, Trophy } from "lucide-react";
import StepCard from "./StepCard";

const steps = [
  {
    icon: Users,
    title: "Create or Join",
    description: "Start a room or join with a code",
  },
  {
    icon: Sparkles,
    title: "Generate Images",
    description: "Use AI to create images matching the prompt",
  },
  {
    icon: Trophy,
    title: "Vote & Win",
    description: "Card Czar picks the winner each round",
  },
];

export const HowItWorksSection = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="relative py-20 md:py-28">
      {/* Background accent strip */}
      <div
        className="absolute inset-0 bg-muted/30"
        aria-hidden="true"
      />

      <div className="relative container mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12 md:mb-16 motion-reduce:opacity-100 motion-reduce:transform-none"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl">
            Ready to laugh?
          </h2>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground">
            Three simple steps to party time
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => (
            <StepCard
              key={step.title}
              stepNumber={index + 1}
              icon={step.icon}
              title={step.title}
              description={step.description}
              delay={index * 0.15}
              showConnector={index < steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
