import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, ChevronDown, Zap } from "lucide-react";
import aerorbisLogo from "@/assets/aerorbis-logo.png";

const Hero = () => {
  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center bg-transparent pt-14 relative overflow-hidden"
    >
      {/* Subtle radial gradient for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--primary) / 0.03) 0%, transparent 70%)',
        }}
      />

      {/* Subtle horizontal line accents */}
      <motion.div 
        className="absolute top-1/3 left-0 w-32 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 1 }}
      />
      <motion.div 
        className="absolute top-1/3 right-0 w-32 h-px bg-gradient-to-l from-transparent via-primary/20 to-transparent"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 1 }}
      />

      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Cinematic logo reveal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <img 
              src={aerorbisLogo} 
              alt="AERORBIS" 
              className="w-20 h-20 md:w-24 md:h-24 mx-auto drop-shadow-[0_0_40px_hsl(var(--primary)/0.4)]"
            />
          </motion.div>

          {/* Main headline with staggered reveal */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-foreground font-[Orbitron] tracking-tight leading-[1.1]"
          >
            <span className="block">AEROSPACE</span>
            <motion.span 
              className="block text-primary drop-shadow-[0_0_50px_hsl(var(--primary)/0.5)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              REDEFINED
            </motion.span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto"
          >
            Professional-grade engineering tools, interactive simulators, and deep learning resources 
            for the next generation of aerospace engineers.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-wrap gap-4 justify-center mb-16"
          >
            <Button asChild size="lg" className="px-10 py-6 gap-3 text-base font-semibold tracking-wide group relative overflow-hidden">
              <Link to="/tools">
                <span className="relative z-10 flex items-center gap-2">
                  <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                  Launch Tools
                </span>
                <motion.div 
                  className="absolute inset-0 bg-primary/20"
                  initial={false}
                  whileHover={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-10 py-6 gap-3 border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-base tracking-wide">
              <Link to="/learn">
                <Zap className="w-5 h-5" />
                Explore Modules
              </Link>
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="flex items-center justify-center gap-8 md:gap-12 flex-wrap"
          >
            {[
              { value: "15+", label: "Engineering Tools" },
              { value: "50+", label: "Learning Modules" },
              { value: "10K+", label: "Active Engineers" },
            ].map((stat, index) => (
              <motion.div 
                key={stat.label} 
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 + index * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-primary font-[Orbitron]">{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ 
          opacity: { delay: 2, duration: 0.5 },
          y: { delay: 2, duration: 2, repeat: Infinity }
        }}
      >
        <ChevronDown className="w-6 h-6 text-primary/50" />
      </motion.div>
    </section>
  );
};

export default Hero;
