import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, ChevronDown, Zap, Satellite, Cpu } from "lucide-react";

const Hero = () => {
  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center bg-transparent pt-14 relative overflow-hidden"
    >
      {/* Grid overlay */}
      <div className="absolute inset-0 grid-overlay opacity-50" />

      {/* Animated HUD rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="absolute w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full border border-primary/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] md:w-[550px] md:h-[550px] rounded-full border border-primary/5"
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full border border-primary/8"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        {/* Center dot */}
        <motion.div 
          className="absolute w-3 h-3 bg-primary rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Floating icons */}
      <motion.div
        className="absolute top-1/4 left-[10%] text-primary/20"
        animate={{ y: [-10, 10, -10], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        <Satellite className="w-8 h-8" />
      </motion.div>
      <motion.div
        className="absolute bottom-1/3 right-[12%] text-primary/15"
        animate={{ y: [10, -10, 10], rotate: [0, -5, 5, 0] }}
        transition={{ duration: 7, repeat: Infinity }}
      >
        <Cpu className="w-10 h-10" />
      </motion.div>

      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 border border-primary/30 rounded-full bg-primary/5 backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-hud text-xs">Systems Online — All Modules Operational</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="heading-display mb-6 text-foreground"
          >
            <span className="block">Command Your</span>
            <span className="block text-primary drop-shadow-[0_0_30px_hsl(185_85%_50%/0.5)]">
              Aerospace Lab
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto"
          >
            Professional-grade engineering tools, interactive simulators, and resources 
            for aerospace & avionics engineers. Your mission control starts here.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Button asChild size="lg" className="px-8 gap-2 glow-cyan font-semibold text-base tracking-wide group">
              <Link to="/tools">
                <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Launch Tools
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8 gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-base tracking-wide">
              <Link to="/learn">
                <Zap className="w-5 h-5" />
                Explore Modules
              </Link>
            </Button>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto"
          >
            {[
              { value: "15+", label: "Engineering Tools" },
              { value: "50+", label: "Learning Modules" },
              { value: "10K+", label: "Active Engineers" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-primary font-[Orbitron]">{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="w-6 h-6 text-primary/50" />
      </motion.div>
    </section>
  );
};

export default Hero;
