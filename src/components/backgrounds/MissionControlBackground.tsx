import { motion } from 'framer-motion';
import ThreeBackground from './ThreeBackground';

const MissionControlBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Dark overlay for deep space feel */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Three.js space environment - calm ambient mode */}
      <ThreeBackground config={{
        starCount: 2500,
        nebulaIntensity: 0.08,
        particleCount: 150,
        cursorInfluence: 0.015,
        parallaxStrength: 5,
      }} />
      
      {/* Subtle rotating orbital globe */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-5"
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 120,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <div className="w-full h-full rounded-full border border-primary/20" style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(76, 201, 240, 0.1) 0%, transparent 50%)',
        }} />
      </motion.div>
      
      {/* Gentle floating ambient stars */}
      {[...Array(80)].map((_, i) => (
        <motion.div
          key={`float-star-${i}`}
          className="absolute w-0.5 h-0.5 bg-foreground/40 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: Math.random() * 8 + 6,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default MissionControlBackground;
