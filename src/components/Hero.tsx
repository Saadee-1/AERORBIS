import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, ChevronDown, Zap, Target, Shield, Cpu } from "lucide-react";
import aerorbisLogo from "@/assets/aerorbis-logo-futuristic.png";

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

const Hero = () => {
  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center bg-transparent pt-14 relative overflow-hidden"
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
      <div className="absolute inset-8 md:inset-16 pointer-events-none">
        <HUDCorner position="tl" />
        <HUDCorner position="tr" />
        <HUDCorner position="bl" />
        <HUDCorner position="br" />
      </div>

      {/* Status indicators */}
      <motion.div 
        className="absolute top-8 md:top-16 left-8 md:left-16 flex items-center gap-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2 }}
      >
        <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
        <span className="text-[10px] font-rajdhani tracking-[0.2em] text-primary/50 uppercase">System Online</span>
      </motion.div>

      <motion.div 
        className="absolute top-8 md:top-16 right-8 md:right-16 text-right"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2.2 }}
      >
        <span className="text-[10px] font-rajdhani tracking-[0.2em] text-primary/40 uppercase">EST. 2024</span>
      </motion.div>

      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          
          {/* Logo with holographic glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 relative inline-block"
          >
            {/* Glow rings */}
            <motion.div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)',
                filter: 'blur(30px)',
                transform: 'scale(2.5)',
              }}
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <img 
              src={aerorbisLogo} 
              alt="AERORBIS" 
              className="w-24 h-24 md:w-32 md:h-32 mx-auto relative z-10 drop-shadow-[0_0_60px_hsl(var(--primary)/0.5)]"
            />
          </motion.div>

          {/* Main title with glitch effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mb-4 relative"
          >
            <motion.h1
              className="text-6xl md:text-8xl lg:text-9xl font-bold text-foreground font-[Orbitron] tracking-tighter leading-none"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              AERORBIS
            </motion.h1>
            {/* Underline accent */}
            <motion.div 
              className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-4"
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
            className="text-lg md:text-2xl text-primary font-rajdhani tracking-[0.3em] uppercase mb-8"
          >
            Where Aerospace Minds Connect
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="text-base md:text-lg text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto"
          >
            Professional-grade engineering tools, interactive simulators, and deep learning resources 
            for the next generation of aerospace engineers.
          </motion.p>

          {/* CTA buttons with futuristic styling */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            className="flex flex-wrap gap-4 justify-center mb-16"
          >
            <Button 
              asChild 
              size="lg" 
              className="px-10 py-6 gap-3 text-base font-semibold tracking-wider group relative overflow-hidden bg-primary hover:bg-primary/90"
            >
              <Link to="/tools">
                <span className="relative z-10 flex items-center gap-2 uppercase font-rajdhani">
                  <Rocket className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
                  Launch Tools
                </span>
                {/* Hover scan effect */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="px-10 py-6 gap-3 border-primary/40 hover:border-primary hover:bg-primary/10 text-base tracking-wider uppercase font-rajdhani group"
            >
              <Link to="/learn">
                <Zap className="w-5 h-5 group-hover:text-primary transition-colors" />
                Explore Modules
              </Link>
            </Button>
          </motion.div>

          {/* Stats with futuristic cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
            className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto"
          >
            {[
              { value: "15+", label: "Engineering Tools" },
              { value: "50+", label: "Learning Modules" },
              { value: "10K+", label: "Active Engineers" },
            ].map((stat, index) => (
              <motion.div 
                key={stat.label} 
                className="relative p-4 md:p-6 rounded-lg border border-primary/20 bg-card/20 backdrop-blur-sm group hover:border-primary/50 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.2 + index * 0.15 }}
              >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/40" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/40" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/40" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/40" />
                
                <div className="text-2xl md:text-4xl font-bold text-primary font-[Orbitron] group-hover:drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)] transition-all">
                  {stat.value}
                </div>
                <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mt-1 font-rajdhani">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
      >
        <span className="text-[9px] font-rajdhani tracking-[0.3em] text-primary/40 uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown className="w-5 h-5 text-primary/50" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
