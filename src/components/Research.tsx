import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileText, Users, Lightbulb, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Research = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const features = [
    { icon: FileText, title: "Published Papers", description: "Access peer-reviewed research and contribute your findings", count: "200+" },
    { icon: Users, title: "Research Guidance", description: "Connect with mentors and collaborate on projects", count: "50+" },
    { icon: Lightbulb, title: "Open Projects", description: "Join ongoing research initiatives in aerospace innovation", count: "30+" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section id="research" className="py-16 sm:py-28 bg-transparent relative">
      <div className="section-divider mb-16 sm:mb-28" />
      <div ref={ref} className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-hud text-xs mb-4 block">// Research Division</span>
          <h2 className="heading-1 text-foreground mb-4">Research & Innovation</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Pushing the boundaries of aerospace engineering through collaborative research
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group"
            >
              <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-lg p-8 text-center h-full transition-all duration-300 hover:border-primary/40 hover:bg-card/60 hud-corners relative overflow-hidden">
                <div className="w-14 h-14 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_hsl(160_84%_39%/0.15)] transition-all duration-300">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary font-[Orbitron] mb-2">{feature.count}</div>
                <h3 className="text-lg font-semibold mb-2 text-foreground font-[Rajdhani] tracking-wide">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center mt-10"
        >
          <Button asChild size="lg" className="gap-2 glow-cyan">
            <Link to="/research">
              Contribute Research <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Research;
