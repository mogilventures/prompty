import { Card, CardContent } from "@/components/ui/8bit/card";
import { Users, Sparkles, Trophy } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export const HowItWorksSection = () => {
  const reduce = useReducedMotion();
  return (
    <section id="how-it-works" className="container mx-auto px-4 py-16">
      <h2 className="font-display mb-8 text-center text-2xl md:text-3xl">Ready to laugh?</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 10 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35, delay: 0 }}
          className="motion-reduce:opacity-100 motion-reduce:transform-none"
        >
          <Card className="transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
            <CardContent className="flex items-start gap-4 p-6">
              <Users className="mt-1" />
              <div>
                <h3 className="text-lg font-semibold">Create or Join</h3>
                <p className="text-sm text-muted-foreground">Start a room or join with a code</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 10 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="motion-reduce:opacity-100 motion-reduce:transform-none"
        >
          <Card className="transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
            <CardContent className="flex items-start gap-4 p-6">
              <Sparkles className="mt-1" />
              <div>
                <h3 className="text-lg font-semibold">Generate Images</h3>
                <p className="text-sm text-muted-foreground">Use AI to create images matching the prompt</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 10 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="motion-reduce:opacity-100 motion-reduce:transform-none"
        >
          <Card className="transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
            <CardContent className="flex items-start gap-4 p-6">
              <Trophy className="mt-1" />
              <div>
                <h3 className="text-lg font-semibold">Vote & Win</h3>
                <p className="text-sm text-muted-foreground">Card Czar picks the winner each round</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
