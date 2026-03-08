import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Wind, Rocket, Plane, Satellite, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const modules = [
  {
    icon: Wind,
    title: "Aerodynamics & Flight Mechanics",
    description: "Lift, drag, fluid dynamics, and the physics of controlled flight.",
    tag: "AERO-101",
    status: "ACTIVE",
  },
  {
    icon: Rocket,
    title: "Rocket Propulsion Systems",
    description: "Chemical, electric, and nuclear propulsion. Thrust dynamics and rocket equations.",
    tag: "PROP-201",
    status: "ACTIVE",
  },
  {
    icon: Plane,
    title: "Aircraft Design & Structures",
    description: "Structural analysis, materials selection, and design optimization.",
    tag: "STRUC-301",
    status: "ACTIVE",
  },
  {
    icon: Satellite,
    title: "Space Systems & Orbital Dynamics",
    description: "Orbital mechanics, satellite systems, and mission planning.",
    tag: "ORBIT-401",
    status: "ACTIVE",
  },
];

const LearningModules = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section id="learn" className="py-16 sm:py-28 bg-transparent relative">
      <div className="section-divider mb-16 sm:mb-28" />
      <div ref={ref} className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-hud text-xs mb-4 block">// Training Modules</span>
          <h2 className="heading-1 text-foreground mb-4">Learning Modules</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Structured courses from fundamentals to advanced — designed for engineering rigor.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto"
        >
          {modules.map((mod) => (
            <motion.div
              key={mod.title}
              variants={itemVariants}
              className="group relative"
            >
              <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-lg p-6 h-full transition-all duration-300 hover:border-primary/40 hover:bg-card/60 flex gap-5 items-start hud-corners">
                <div className="w-12 h-12 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:border-primary/50 group-hover:shadow-[0_0_20px_hsl(160_84%_39%/0.15)] transition-all duration-300">
                  <mod.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-primary/70 bg-primary/10 px-2 py-0.5 rounded">{mod.tag}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" />
                    <span className="text-[10px] text-[hsl(var(--success))] uppercase tracking-wider">{mod.status}</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1 font-[Rajdhani] tracking-wide">{mod.title}</h3>
                  <p className="text-sm text-muted-foreground">{mod.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary/30 group-hover:text-primary group-hover:translate-x-1 transition-all mt-2 shrink-0" />
              </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center mt-10"
        >
          <Button asChild variant="outline" className="border-primary/30 hover:border-primary/60 hover:bg-primary/5 gap-2">
            <Link to="/learn">
              View All Modules <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default LearningModules;
