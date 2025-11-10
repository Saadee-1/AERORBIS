import { motion } from 'framer-motion';
import ThreeBackground from './ThreeBackground';

const TechGridBackground = () => {

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Three.js space environment - technical grid mode */}
      <ThreeBackground config={{
        starCount: 1500,
        nebulaIntensity: 0.2,
        particleCount: 300,
        cursorInfluence: 0.02,
        parallaxStrength: 12,
      }} />
      
      {/* Perspective grid */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(90deg, rgba(76, 201, 240, 0.1) 1px, transparent 1px),
            linear-gradient(0deg, rgba(76, 201, 240, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center top',
        }}
      />
      
      {/* Glowing nodes on grid */}
      {[...Array(25)].map((_, i) => {
        const x = (i % 5) * 20 + 10;
        const y = Math.floor(i / 5) * 20 + 10;
        return (
          <motion.div
            key={`grid-node-${i}`}
            className="absolute w-2 h-2 rounded-full bg-secondary"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              boxShadow: '0 0 10px rgba(135, 206, 235, 0.8)',
            }}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        );
      })}
      
      {/* Pulsing lines connecting nodes */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`line-${i}`}
          className="absolute h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{
            width: '150px',
            left: `${Math.random() * 80 + 10}%`,
            top: `${Math.random() * 80 + 10}%`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
          animate={{
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}
      
      {/* Circuit traces */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`circuit-${i}`}
          className="absolute w-1 h-20 bg-gradient-to-b from-secondary to-transparent opacity-40"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            scaleY: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

export default TechGridBackground;
