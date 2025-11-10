import { motion } from 'framer-motion';
import ThreeBackground from './ThreeBackground';

const KnowledgeOrbitBackground = () => {

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Three.js space environment - calm exploration mode */}
      <ThreeBackground config={{
        starCount: 1800,
        nebulaIntensity: 0.25,
        particleCount: 400,
        cursorInfluence: 0.025,
        parallaxStrength: 15,
      }} />
      
      {/* Central light source */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32"
        style={{
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, rgba(255, 215, 0, 0.4) 30%, transparent 70%)',
          filter: 'blur(20px)',
        }}
        animate={{
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
        }}
      />
      
      {/* Orbiting satellites/orbs */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * 360;
        const radius = 200 + (i % 3) * 100;
        return (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full bg-secondary"
            style={{
              boxShadow: '0 0 20px rgba(135, 206, 235, 0.6)',
            }}
            animate={{
              x: [
                Math.cos((angle * Math.PI) / 180) * radius,
                Math.cos(((angle + 360) * Math.PI) / 180) * radius,
              ],
              y: [
                Math.sin((angle * Math.PI) / 180) * radius,
                Math.sin(((angle + 360) * Math.PI) / 180) * radius,
              ],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 20 + i * 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        );
      })}
      
      {/* Floating particles */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 bg-secondary rounded-full opacity-40"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -50, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: Math.random() * 5 + 3,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

export default KnowledgeOrbitBackground;
