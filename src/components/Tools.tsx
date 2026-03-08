import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Calculator, TrendingUp, Orbit, Database, ArrowRight, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const tools = [
  {
    icon: Calculator,
    title: "Rocket Thrust Calculator",
    description: "Calculate thrust, specific impulse, and performance metrics",
    status: "ONLINE",
  },
  {
    icon: TrendingUp,
    title: "Lift-to-Drag Analyzer",
    description: "Analyze aerodynamic efficiency with interactive charts",
    status: "ONLINE",
  },
  {
    icon: Orbit,
    title: "Orbital Path Simulator",
    description: "Simulate and visualize satellite trajectories in 3D",
    status: "ONLINE",
  },
  {
    icon: Database,
    title: "Material Density Database",
    description: "Access comprehensive aerospace materials data",
    status: "ONLINE",
  },
];

const Tools = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section id="tools" className="py-16 sm:py-28 bg-transparent relative">
      <div className="section-divider mb-16 sm:mb-28" />
      <div ref={ref} className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-hud text-xs mb-4 block">// Engineering Bay</span>
          <h2 className="heading-1 text-foreground mb-4">Tools & Simulators</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Powerful interactive tools to accelerate your engineering workflow
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto"
        >
          {tools.map((tool) => (
            <motion.div
              key={tool.title}
              variants={itemVariants}
              className="group cursor-pointer"
            >
              <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-lg p-6 h-full transition-all duration-300 hover:border-primary/50 hover:bg-card/60 text-center relative overflow-hidden hud-corners">
                {/* Status indicator */}
                <div className="flex items-center justify-center gap-1.5 mb-4">
                  <Activity className="w-3 h-3 text-[hsl(var(--success))]" />
                  <span className="text-[10px] text-[hsl(var(--success))] uppercase tracking-widest font-mono">{tool.status}</span>
                </div>
                <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 group-hover:border-primary/50 group-hover:shadow-[0_0_25px_hsl(160_84%_39%/0.2)] transition-all duration-300 group-hover:scale-110">
                  <tool.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2 font-[Rajdhani] tracking-wide">{tool.title}</h3>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="text-center mt-10"
        >
          <Button asChild size="lg" className="gap-2 glow-cyan">
            <Link to="/tools">
              Access All Tools <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Tools;
