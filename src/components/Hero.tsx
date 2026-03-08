import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Zap, Target, Shield, Cpu } from "lucide-react";
import aerorbisLogo from "@/assets/aerorbis-logo-refined.png";

// Holographic scan line component
const ScanLine = () => (
  <motion.div
    className="absolute left-0 right-0 h-px pointer-events-none z-20"
    style={{
      background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)',
    }}
    animate={{ top: ['0%', '100%'] }}
    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
  />
);

// Animated corner brackets
const HUDCorner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const classes = {
    tl: 'top-0 left-0 border-t-2 border-l-2',
    tr: 'top-0 right-0 border-t-2 border-r-2',
    bl: 'bottom-0 left-0 border-b-2 border-l-2',
    br: 'bottom-0 right-0 border-b-2 border-r-2',
  };
  
  return (
    <motion.div
      className={`absolute w-8 h-8 border-primary/40 ${classes[position]}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.5, duration: 0.5 }}
    />
  );
};

// Data stream visualization
const DataStream = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute w-px h-20 pointer-events-none"
    style={{
      background: 'linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.3), transparent)',
      left: `${15 + Math.random() * 70}%`,
    }}
    initial={{ top: '-80px', opacity: 0 }}
    animate={{ top: '100%', opacity: [0, 0.6, 0] }}
    transition={{ duration: 3, delay, repeat: Infinity, ease: 'linear' }}
  />
);

// Floating tech icon
const FloatingIcon = ({ Icon, x, y, delay }: { Icon: any; x: string; y: string; delay: number }) => (
  <motion.div
    className="absolute text-primary/10 pointer-events-none"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      y: [0, -10, 0],
    }}
    transition={{ 
      opacity: { delay, duration: 0.5 },
      scale: { delay, duration: 0.5 },
      y: { delay: delay + 0.5, duration: 4, repeat: Infinity, ease: 'easeInOut' }
    }}
  >
    <Icon className="w-8 h-8 md:w-12 md:h-12" />
  </motion.div>
);

// Particle spark component for launch trail
const LaunchParticles = ({ active }: { active: boolean }) => {
  if (!active) return null;
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 50,
    y: Math.random() * 35 + 8,
    size: Math.random() * 3 + 1.5,
    delay: Math.random() * 0.2,
    duration: 0.5 + Math.random() * 0.5,
  }));

  return (
    <>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: `hsl(var(--primary))`,
            boxShadow: `0 0 4px hsl(var(--primary) / 0.7), 0 0 8px hsl(var(--primary) / 0.3)`,
            left: '50%',
            top: '50%',
          }}
          initial={{ opacity: 0.9, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.2 }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      {/* Smooth exhaust trail */}
      <motion.span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 w-0.5 rounded-full"
        style={{ background: 'linear-gradient(to bottom, hsl(var(--primary) / 0.8), hsl(var(--primary) / 0.2), transparent)' }}
        initial={{ height: 0, opacity: 0.8 }}
        animate={{ height: 60, opacity: 0, y: 15 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </>
  );
};

const Hero = () => {
  const [rocketLaunched, setRocketLaunched] = useState(false);
  const [zapLaunched, setZapLaunched] = useState(false);
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleLaunchTools = () => {
    if (rocketLaunched) return;
    setRocketLaunched(true);
    setTimeout(() => {
      navigate("/tools");
      setRocketLaunched(false);
    }, 900);
  };

  const handleExploreModules = () => {
    if (zapLaunched) return;
    setZapLaunched(true);
    setTimeout(() => {
      navigate("/learn");
      setZapLaunched(false);
    }, 900);
  };

  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center bg-transparent pt-16 pb-8 relative overflow-hidden"
    >
      {/* Animated grid background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Radial gradient overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.05) 0%, transparent 70%)',
        }}
      />

      {/* Scan line effect */}
      <ScanLine />

      {/* Data streams */}
      {[0.5, 2, 4, 6, 8].map((delay, i) => (
        <DataStream key={i} delay={delay} />
      ))}

      {/* Floating tech icons */}
      <FloatingIcon Icon={Target} x="8%" y="25%" delay={1.8} />
      <FloatingIcon Icon={Shield} x="88%" y="30%" delay={2.2} />
      <FloatingIcon Icon={Cpu} x="12%" y="65%" delay={2.6} />

      {/* HUD Frame */}
      <div className="absolute inset-4 sm:inset-8 md:inset-16 pointer-events-none">
        <HUDCorner position="tl" />
        <HUDCorner position="tr" />
        <HUDCorner position="bl" />
        <HUDCorner position="br" />
      </div>

      {/* Status indicators removed for cleaner look */}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          
          {/* Logo with futuristic holographic treatment */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 sm:mb-8 relative inline-flex items-center justify-center"
          >
            {/* Clean logo (no glow/panel) */}
            <img 
              src={aerorbisLogo} 
              alt="AERORBIS" 
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative z-10"
            />
          </motion.div>

          {/* Main title with glitch effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mb-3 sm:mb-4 relative"
          >
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground font-[Orbitron] tracking-tight leading-none"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              AERORBIS
            </motion.h1>
            {/* Underline accent */}
            <motion.div 
              className="h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-3 sm:mt-4"
              initial={{ width: 0 }}
              animate={{ width: '60%' }}
              transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
            />
          </motion.div>

          {/* Tagline with typewriter effect */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-sm sm:text-lg md:text-2xl text-primary font-rajdhani tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-6 sm:mb-8"
          >
            Where Aerospace Minds Connect
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="text-sm sm:text-base md:text-lg text-muted-foreground mb-8 sm:mb-12 leading-relaxed max-w-2xl mx-auto px-2"
          >
            Professional-grade engineering tools, interactive simulators, and deep learning resources 
            for the next generation of aerospace engineers.
          </motion.p>

          {/* CTA buttons with futuristic styling */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-16 px-4 sm:px-0"
          >
             <Button 
              ref={buttonRef}
              variant="outline"
              size="lg" 
              onClick={handleLaunchTools}
              className="px-6 sm:px-10 py-5 sm:py-6 gap-2 sm:gap-3 border-primary/40 hover:border-primary hover:bg-primary/10 text-sm sm:text-base tracking-wider uppercase font-rajdhani group transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--primary)/0.4)] relative overflow-visible"
            >
              <span className="relative">
                <AnimatePresence>
                  {!rocketLaunched && (
                    <motion.span
                      key="static"
                      className="inline-block"
                      exit={{ y: -200, x: 80, scale: 2.5, opacity: 0, rotate: -45 }}
                      transition={{ duration: 0.8, ease: [0.32, 0, 0.67, 0] }}
                    >
                      <Rocket className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-primary group-hover:-rotate-45 transition-all duration-500" />
                    </motion.span>
                  )}
                </AnimatePresence>
                <LaunchParticles active={rocketLaunched} />
              </span>
              Launch Tools
              {/* Button glow burst on launch */}
              {rocketLaunched && (
                <motion.span
                  className="absolute inset-0 rounded-md"
                  style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.6), inset 0 0 20px hsl(var(--primary) / 0.2)' }}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleExploreModules}
              className="px-6 sm:px-10 py-5 sm:py-6 gap-2 sm:gap-3 border-primary/40 hover:border-primary hover:bg-primary/10 text-sm sm:text-base tracking-wider uppercase font-rajdhani group relative overflow-visible"
            >
              <span className="relative">
                <AnimatePresence>
                  {!zapLaunched && (
                    <motion.span
                      key="zap-static"
                      className="inline-block"
                      exit={{ y: -200, x: 80, scale: 2.5, opacity: 0, rotate: -30 }}
                      transition={{ duration: 0.8, ease: [0.32, 0, 0.67, 0] }}
                    >
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-primary transition-colors duration-500" />
                    </motion.span>
                  )}
                </AnimatePresence>
                <LaunchParticles active={zapLaunched} />
              </span>
              Explore Modules
              {zapLaunched && (
                <motion.span
                  className="absolute inset-0 rounded-md"
                  style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.6), inset 0 0 20px hsl(var(--primary) / 0.2)' }}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </Button>
          </motion.div>

          {/* Stats with futuristic cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
            className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 max-w-2xl mx-auto"
          >
            {[
              { value: "15+", label: "Engineering Tools" },
              { value: "50+", label: "Learning Modules" },
              { value: "10K+", label: "Active Engineers" },
            ].map((stat, index) => (
              <motion.div 
                key={stat.label} 
                className="relative p-3 sm:p-4 md:p-6 rounded-lg border border-primary/20 bg-card/20 backdrop-blur-sm group hover:border-primary/50 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.2 + index * 0.15 }}
              >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/40" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/40" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/40" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/40" />
                
                <div className="text-xl sm:text-2xl md:text-4xl font-bold text-primary font-[Orbitron] group-hover:drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)] transition-all">
                  {stat.value}
                </div>
                <div className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mt-1 font-rajdhani">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
