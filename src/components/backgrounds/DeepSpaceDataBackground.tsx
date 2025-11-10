import { motion } from 'framer-motion';
import ThreeBackground from './ThreeBackground';

const DeepSpaceDataBackground = () => {

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Three.js space environment - research mode */}
      <ThreeBackground config={{
        starCount: 2000,
        nebulaIntensity: 0.28,
        particleCount: 450,
        cursorInfluence: 0.03,
        parallaxStrength: 18,
      }} />
      
      {/* Flowing grid lines - Vertical */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`v-${i}`}
          className="absolute h-full w-px opacity-20"
          style={{
            left: `${(i / 12) * 100}%`,
            background: 'linear-gradient(to bottom, transparent, rgba(76, 201, 240, 0.5), transparent)',
          }}
          animate={{
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 3 + i * 0.2,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}
      
      {/* Flowing grid lines - Horizontal */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`h-${i}`}
          className="absolute w-full h-px opacity-20"
          style={{
            top: `${(i / 8) * 100}%`,
            background: 'linear-gradient(to right, transparent, rgba(76, 201, 240, 0.5), transparent)',
          }}
          animate={{
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 2 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}
      
      {/* Data flow particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={`data-${i}`}
          className="absolute w-2 h-2 bg-secondary rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            boxShadow: '0 0 10px rgba(135, 206, 235, 0.8)',
          }}
          animate={{
            x: [0, Math.random() * 200 - 100],
            y: [0, Math.random() * 200 - 100],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
      
      {/* Scanning radar effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(76, 201, 240, 0.1) 0%, transparent 50%)',
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Glowing nodes */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`node-${i}`}
          className="absolute w-3 h-3 rounded-full bg-primary"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            boxShadow: '0 0 15px rgba(255, 215, 0, 0.6)',
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

export default DeepSpaceDataBackground;
