import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle, BookOpen, Users, FileCode, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Community = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const features = [
    { icon: MessageCircle, title: "Discord Community", description: "Real-time discussions with aerospace engineers worldwide" },
    { icon: BookOpen, title: "Forum & Q&A", description: "Ask questions and share knowledge with the community" },
    { icon: Users, title: "Student Projects", description: "Collaborate on exciting aerospace projects together" },
    { icon: FileCode, title: "Research Articles", description: "Read and contribute to our growing knowledge base" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section id="community" className="py-16 sm:py-28 bg-transparent relative">
      <div className="section-divider mb-16 sm:mb-28" />
      <div ref={ref} className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-hud text-xs mb-4 block">// Comms Channel</span>
          <h2 className="heading-1 text-foreground mb-4">Join the AERORBIS Network</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Connect with aerospace minds, share ideas, and build the future together
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 max-w-6xl mx-auto mb-12"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group"
            >
              <div className="text-center p-6 rounded-lg border border-transparent hover:border-primary/20 hover:bg-card/30 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_hsl(160_84%_39%/0.15)] transition-all duration-300">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2 text-foreground font-[Rajdhani] tracking-wide">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <Button size="lg" className="gap-2 glow-cyan">
            Join the Network <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Community;
