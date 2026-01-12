import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParallax } from '@/hooks/useParallax';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  blinkDuration: number;
  blinkDelay: number;
  parallaxFactor: number;
}

const GalaxyBackground = () => {
  const { mouseX, mouseY } = useParallax();

  // Generate stars once
  const stars = useMemo<Star[]>(() => {
    const starCount = 200;
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      blinkDuration: Math.random() * 3 + 2,
      blinkDelay: Math.random() * 5,
      parallaxFactor: Math.random() * 0.5 + 0.1,
    }));
  }, []);

  // Nebula/galaxy clouds
  const nebulaClouds = useMemo(() => {
    return [
      { x: 20, y: 30, size: 400, color: 'rgba(100, 50, 150, 0.03)', blur: 80 },
      { x: 70, y: 60, size: 500, color: 'rgba(50, 100, 180, 0.025)', blur: 100 },
      { x: 50, y: 20, size: 350, color: 'rgba(150, 80, 120, 0.02)', blur: 70 },
      { x: 80, y: 80, size: 300, color: 'rgba(80, 120, 200, 0.03)', blur: 90 },
    ];
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep space gradient base */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(20, 10, 40, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 20% 20%, rgba(30, 20, 60, 0.3) 0%, transparent 40%),
            radial-gradient(ellipse 70% 50% at 80% 30%, rgba(20, 30, 80, 0.2) 0%, transparent 45%),
            linear-gradient(180deg, hsl(240, 100%, 6%) 0%, hsl(240, 100%, 3%) 100%)
          `
        }}
      />

      {/* Nebula clouds with parallax */}
      {nebulaClouds.map((cloud, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            width: cloud.size,
            height: cloud.size,
            background: cloud.color,
            filter: `blur(${cloud.blur}px)`,
            transform: `translate(-50%, -50%) translate(${mouseX * 10 * (index + 1) * 0.2}px, ${mouseY * 10 * (index + 1) * 0.2}px)`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 8 + index * 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Milky Way band */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              135deg,
              transparent 0%,
              rgba(100, 80, 140, 0.02) 20%,
              rgba(150, 120, 180, 0.04) 35%,
              rgba(180, 150, 200, 0.05) 50%,
              rgba(150, 120, 180, 0.04) 65%,
              rgba(100, 80, 140, 0.02) 80%,
              transparent 100%
            )
          `,
          transform: `translate(${mouseX * 5}px, ${mouseY * 5}px)`,
        }}
      />

      {/* Stars layer */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              transform: `translate(${mouseX * 20 * star.parallaxFactor}px, ${mouseY * 20 * star.parallaxFactor}px)`,
              boxShadow: star.size > 1.5 
                ? `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.5)` 
                : 'none',
            }}
            animate={{
              opacity: [star.opacity, star.opacity * 0.3, star.opacity],
              scale: [1, 0.8, 1],
            }}
            transition={{
              duration: star.blinkDuration,
              delay: star.blinkDelay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Shooting star occasional */}
      <motion.div
        className="absolute w-1 h-1 bg-white rounded-full"
        style={{
          boxShadow: '0 0 4px 2px rgba(255, 255, 255, 0.8), -20px 0 20px 2px rgba(255, 255, 255, 0.4)',
        }}
        initial={{ left: '100%', top: '10%', opacity: 0 }}
        animate={{
          left: ['-10%'],
          top: ['60%'],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 15,
          ease: 'easeOut',
        }}
      />
    </div>
  );
};

export default GalaxyBackground;
