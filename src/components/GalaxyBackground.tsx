import { useMemo, useCallback } from 'react';
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
  color: string;
}

interface NebulaCloud {
  x: number;
  y: number;
  size: number;
  color: string;
  blur: number;
  pulseDelay: number;
}

const GalaxyBackground = () => {
  const { mouseX, mouseY, scrollY } = useParallax();

  // Color palette for stars
  const starColors = useMemo(() => [
    'rgba(255, 255, 255, 1)',
    'rgba(200, 220, 255, 1)',
    'rgba(255, 240, 220, 1)',
    'rgba(180, 200, 255, 1)',
    'rgba(255, 200, 180, 1)',
  ], []);

  // Generate more stars with varied properties
  const stars = useMemo<Star[]>(() => {
    const starCount = 350;
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.9 + 0.1,
      blinkDuration: Math.random() * 4 + 1.5,
      blinkDelay: Math.random() * 8,
      parallaxFactor: Math.random() * 0.8 + 0.1,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));
  }, [starColors]);

  // Enhanced nebula clouds with more variety
  const nebulaClouds = useMemo<NebulaCloud[]>(() => [
    { x: 15, y: 25, size: 500, color: 'rgba(100, 50, 180, 0.04)', blur: 100, pulseDelay: 0 },
    { x: 75, y: 55, size: 600, color: 'rgba(50, 120, 200, 0.035)', blur: 120, pulseDelay: 2 },
    { x: 45, y: 15, size: 450, color: 'rgba(180, 80, 150, 0.03)', blur: 90, pulseDelay: 4 },
    { x: 85, y: 75, size: 400, color: 'rgba(80, 150, 220, 0.04)', blur: 100, pulseDelay: 6 },
    { x: 30, y: 70, size: 550, color: 'rgba(120, 60, 180, 0.035)', blur: 110, pulseDelay: 3 },
    { x: 60, y: 40, size: 380, color: 'rgba(60, 100, 180, 0.03)', blur: 85, pulseDelay: 5 },
  ], []);

  // Interactive glow that follows cursor
  const cursorGlow = useMemo(() => ({
    x: 50 + mouseX * 25,
    y: 50 + mouseY * 25,
  }), [mouseX, mouseY]);

  // Scroll-based parallax offset
  const scrollOffset = scrollY * 0.1;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep space gradient base with scroll effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 60% at 50% 100%, rgba(25, 15, 50, 0.5) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 15% 15%, rgba(40, 25, 80, 0.4) 0%, transparent 45%),
            radial-gradient(ellipse 80% 55% at 85% 25%, rgba(25, 40, 100, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 50%, rgba(30, 20, 70, 0.2) 0%, transparent 60%),
            linear-gradient(180deg, hsl(240, 100%, 5%) 0%, hsl(250, 100%, 3%) 50%, hsl(240, 100%, 2%) 100%)
          `,
          transform: `translateY(${scrollOffset * 0.2}px)`,
        }}
      />

      {/* Interactive cursor glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: `${cursorGlow.x}%`,
          top: `${cursorGlow.y}%`,
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.03) 0%, rgba(34, 211, 238, 0.01) 40%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(40px)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Nebula clouds with enhanced parallax and pulse */}
      {nebulaClouds.map((cloud, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            width: cloud.size,
            height: cloud.size,
            background: `radial-gradient(circle, ${cloud.color} 0%, transparent 70%)`,
            filter: `blur(${cloud.blur}px)`,
            transform: `translate(-50%, -50%) translate(${mouseX * 15 * (index % 3 + 1) * 0.3}px, ${mouseY * 15 * (index % 3 + 1) * 0.3 + scrollOffset * 0.3}px)`,
          }}
          animate={{
            scale: [1, 1.15, 1.05, 1.2, 1],
            opacity: [0.5, 0.9, 0.7, 0.85, 0.5],
          }}
          transition={{
            duration: 10 + index * 2,
            delay: cloud.pulseDelay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Enhanced Milky Way band with more depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              140deg,
              transparent 0%,
              rgba(120, 90, 160, 0.015) 15%,
              rgba(160, 130, 200, 0.035) 30%,
              rgba(200, 170, 230, 0.05) 45%,
              rgba(180, 150, 210, 0.045) 55%,
              rgba(140, 110, 180, 0.03) 70%,
              rgba(100, 80, 150, 0.015) 85%,
              transparent 100%
            )
          `,
          transform: `translate(${mouseX * 8}px, ${mouseY * 8 + scrollOffset * 0.1}px)`,
        }}
      />

      {/* Secondary Milky Way layer for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              125deg,
              transparent 0%,
              rgba(80, 100, 180, 0.02) 25%,
              rgba(100, 130, 200, 0.03) 50%,
              rgba(80, 100, 180, 0.02) 75%,
              transparent 100%
            )
          `,
          transform: `translate(${mouseX * 12}px, ${mouseY * 12}px)`,
        }}
      />

      {/* Stars layer with enhanced variety */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              backgroundColor: star.color,
              transform: `translate(${mouseX * 25 * star.parallaxFactor}px, ${mouseY * 25 * star.parallaxFactor + scrollOffset * star.parallaxFactor * 0.5}px)`,
              boxShadow: star.size > 1.5 
                ? `0 0 ${star.size * 3}px ${star.size}px rgba(255, 255, 255, 0.4), 0 0 ${star.size * 6}px rgba(200, 220, 255, 0.2)` 
                : `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.3)`,
            }}
            animate={{
              opacity: [star.opacity, star.opacity * 0.2, star.opacity * 0.8, star.opacity * 0.3, star.opacity],
              scale: [1, 0.7, 1.1, 0.8, 1],
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

      {/* Additional bright accent stars */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={`accent-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${10 + (i * 6) % 80}%`,
            top: `${15 + (i * 7) % 70}%`,
            width: 3,
            height: 3,
            backgroundColor: i % 3 === 0 ? 'rgba(34, 211, 238, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            boxShadow: i % 3 === 0 
              ? '0 0 8px 3px rgba(34, 211, 238, 0.5), 0 0 15px 5px rgba(34, 211, 238, 0.2)'
              : '0 0 6px 2px rgba(255, 255, 255, 0.6), 0 0 12px 4px rgba(200, 220, 255, 0.3)',
            transform: `translate(${mouseX * 30 * ((i % 5) * 0.1 + 0.2)}px, ${mouseY * 30 * ((i % 5) * 0.1 + 0.2)}px)`,
          }}
          animate={{
            opacity: [0.9, 0.3, 0.9],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 2 + i * 0.3,
            delay: i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Multiple shooting stars with varied timing */}
      {[0, 1, 2].map((index) => (
        <motion.div
          key={`shooting-${index}`}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{
            boxShadow: '0 0 4px 2px rgba(255, 255, 255, 0.9), -30px 0 25px 3px rgba(255, 255, 255, 0.5), -60px 0 40px 2px rgba(200, 220, 255, 0.3)',
          }}
          initial={{ left: '110%', top: `${10 + index * 25}%`, opacity: 0 }}
          animate={{
            left: ['-15%'],
            top: [`${55 + index * 15}%`],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.5 + index * 0.3,
            repeat: Infinity,
            repeatDelay: 12 + index * 8,
            delay: index * 5,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Cosmic dust particles */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 100%),
            radial-gradient(1px 1px at 40% 70%, rgba(255, 255, 255, 0.1) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 20%, rgba(255, 255, 255, 0.12) 0%, transparent 100%),
            radial-gradient(1px 1px at 80% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 100%)
          `,
          backgroundSize: '100% 100%',
          transform: `translate(${mouseX * 5}px, ${mouseY * 5}px)`,
          opacity: 0.8,
        }}
      />
    </div>
  );
};

export default GalaxyBackground;
