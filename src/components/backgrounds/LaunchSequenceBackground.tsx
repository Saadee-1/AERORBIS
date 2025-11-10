import { motion } from 'framer-motion';
import ThreeBackground from './ThreeBackground';

const LaunchSequenceBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Three.js space environment */}
      <ThreeBackground config={{
        starCount: 2500,
        nebulaIntensity: 0.35,
        particleCount: 600,
        cursorInfluence: 0.04,
        parallaxStrength: 25,
      }} />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/40" />
      
      {/* Shooting stars */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`shooting-${i}`}
          className="absolute h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{
            width: '100px',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 50}%`,
          }}
          animate={{
            x: [0, 300],
            y: [0, 150],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 10,
            repeatDelay: 8,
          }}
        />
      ))}
      
      {/* Rocket exhaust glow */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
        }}
      />
    </div>
  );
};

export default LaunchSequenceBackground;
