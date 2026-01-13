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

interface AuroraWave {
  id: number;
  yPosition: number;
  color: string;
  height: number;
  duration: number;
  delay: number;
}

const GalaxyBackground = () => {
  const { mouseX, mouseY, scrollY } = useParallax();

  // Color palette for stars - clean, no glow colors
  const starColors = useMemo(() => [
    'rgba(255, 255, 255, 1)',
    'rgba(220, 235, 255, 1)',
    'rgba(255, 248, 240, 1)',
    'rgba(200, 215, 255, 1)',
    'rgba(255, 225, 210, 1)',
    'rgba(180, 200, 255, 1)',
  ], []);

  // Generate clean, round stars without halos
  const stars = useMemo<Star[]>(() => {
    const starCount = 400;
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.3,
      opacity: Math.random() * 0.85 + 0.15,
      blinkDuration: Math.random() * 5 + 2,
      blinkDelay: Math.random() * 10,
      parallaxFactor: Math.random() * 0.6 + 0.1,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));
  }, [starColors]);

  // Aurora waves configuration
  const auroraWaves = useMemo<AuroraWave[]>(() => [
    { id: 0, yPosition: 15, color: 'rgba(50, 180, 120, 0.04)', height: 120, duration: 15, delay: 0 },
    { id: 1, yPosition: 25, color: 'rgba(80, 200, 180, 0.035)', height: 100, duration: 18, delay: 3 },
    { id: 2, yPosition: 20, color: 'rgba(100, 220, 200, 0.03)', height: 140, duration: 20, delay: 6 },
    { id: 3, yPosition: 30, color: 'rgba(60, 150, 200, 0.04)', height: 90, duration: 16, delay: 2 },
    { id: 4, yPosition: 10, color: 'rgba(120, 180, 220, 0.025)', height: 110, duration: 22, delay: 8 },
  ], []);

  // Subtle nebula clouds for Milky Way/Andromeda effect
  const nebulaClouds = useMemo<NebulaCloud[]>(() => [
    { x: 15, y: 25, size: 600, color: 'rgba(100, 80, 150, 0.025)', blur: 120, pulseDelay: 0 },
    { x: 75, y: 55, size: 700, color: 'rgba(80, 100, 160, 0.02)', blur: 140, pulseDelay: 2 },
    { x: 45, y: 15, size: 500, color: 'rgba(140, 100, 160, 0.018)', blur: 100, pulseDelay: 4 },
    { x: 85, y: 75, size: 450, color: 'rgba(90, 120, 180, 0.022)', blur: 110, pulseDelay: 6 },
    { x: 30, y: 70, size: 650, color: 'rgba(110, 90, 150, 0.02)', blur: 130, pulseDelay: 3 },
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
      {/* Deep space gradient base - clean dark sky */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% 100%, rgba(15, 10, 35, 0.6) 0%, transparent 60%),
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(25, 20, 60, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse 90% 70% at 80% 20%, rgba(20, 30, 70, 0.35) 0%, transparent 55%),
            linear-gradient(180deg, hsl(240, 100%, 4%) 0%, hsl(250, 100%, 2%) 50%, hsl(240, 100%, 1%) 100%)
          `,
          transform: `translateY(${scrollOffset * 0.15}px)`,
        }}
      />

      {/* Aurora wave animations */}
      {auroraWaves.map((wave) => (
        <motion.div
          key={`aurora-${wave.id}`}
          className="absolute w-full pointer-events-none"
          style={{
            top: `${wave.yPosition}%`,
            height: wave.height,
            background: `linear-gradient(90deg, 
              transparent 0%, 
              ${wave.color} 20%, 
              ${wave.color.replace('0.0', '0.0')} 40%, 
              ${wave.color} 60%, 
              transparent 100%
            )`,
            filter: 'blur(60px)',
            transform: `translateX(${mouseX * 20}px) translateY(${scrollOffset * 0.2}px)`,
          }}
          animate={{
            opacity: [0.3, 0.7, 0.5, 0.8, 0.3],
            scaleX: [1, 1.1, 0.95, 1.05, 1],
            x: ['-5%', '5%', '-3%', '4%', '-5%'],
          }}
          transition={{
            duration: wave.duration,
            delay: wave.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Interactive cursor glow - subtle */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: `${cursorGlow.x}%`,
          top: `${cursorGlow.y}%`,
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.02) 0%, rgba(34, 211, 238, 0.008) 40%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(50px)',
        }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Subtle nebula clouds for galaxy depth */}
      {nebulaClouds.map((cloud, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            width: cloud.size,
            height: cloud.size,
            background: `radial-gradient(circle, ${cloud.color} 0%, transparent 65%)`,
            filter: `blur(${cloud.blur}px)`,
            transform: `translate(-50%, -50%) translate(${mouseX * 12 * (index % 3 + 1) * 0.25}px, ${mouseY * 12 * (index % 3 + 1) * 0.25 + scrollOffset * 0.25}px)`,
          }}
          animate={{
            scale: [1, 1.1, 1.02, 1.08, 1],
            opacity: [0.4, 0.7, 0.55, 0.65, 0.4],
          }}
          transition={{
            duration: 12 + index * 2,
            delay: cloud.pulseDelay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Milky Way band - visible diagonal sweep */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              135deg,
              transparent 0%,
              rgba(180, 160, 200, 0.012) 10%,
              rgba(200, 180, 220, 0.025) 25%,
              rgba(220, 200, 240, 0.04) 40%,
              rgba(240, 220, 255, 0.05) 50%,
              rgba(220, 200, 240, 0.04) 60%,
              rgba(200, 180, 220, 0.025) 75%,
              rgba(180, 160, 200, 0.012) 90%,
              transparent 100%
            )
          `,
          transform: `translate(${mouseX * 6}px, ${mouseY * 6 + scrollOffset * 0.08}px)`,
        }}
      />

      {/* Andromeda galaxy - subtle elliptical glow */}
      <motion.div
        className="absolute"
        style={{
          left: '70%',
          top: '25%',
          width: 200,
          height: 80,
          background: 'radial-gradient(ellipse, rgba(200, 190, 220, 0.06) 0%, rgba(180, 170, 200, 0.03) 40%, transparent 70%)',
          filter: 'blur(15px)',
          borderRadius: '50%',
          transform: `translate(-50%, -50%) rotate(-25deg) translate(${mouseX * 8}px, ${mouseY * 8}px)`,
        }}
        animate={{
          opacity: [0.6, 0.8, 0.65, 0.75, 0.6],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Clean stars layer - NO halos, just round dots */}
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
              transform: `translate(${mouseX * 20 * star.parallaxFactor}px, ${mouseY * 20 * star.parallaxFactor + scrollOffset * star.parallaxFactor * 0.4}px)`,
            }}
            animate={{
              opacity: [star.opacity, star.opacity * 0.3, star.opacity * 0.7, star.opacity * 0.4, star.opacity],
              scale: [1, 0.8, 1.05, 0.85, 1],
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

      {/* Brighter fixed stars - clean, no glow */}
      {Array.from({ length: 25 }).map((_, i) => (
        <motion.div
          key={`bright-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${8 + (i * 4) % 85}%`,
            top: `${12 + (i * 5) % 75}%`,
            width: i % 4 === 0 ? 2.5 : 2,
            height: i % 4 === 0 ? 2.5 : 2,
            backgroundColor: i % 5 === 0 
              ? 'rgba(255, 200, 180, 0.95)' 
              : i % 3 === 0 
                ? 'rgba(180, 200, 255, 0.95)' 
                : 'rgba(255, 255, 255, 0.95)',
            transform: `translate(${mouseX * 25 * ((i % 4) * 0.1 + 0.15)}px, ${mouseY * 25 * ((i % 4) * 0.1 + 0.15)}px)`,
          }}
          animate={{
            opacity: [0.9, 0.4, 0.85, 0.5, 0.9],
            scale: [1, 0.9, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 3 + i * 0.2,
            delay: i * 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Shooting stars */}
      {[0, 1, 2].map((index) => (
        <motion.div
          key={`shooting-${index}`}
          className="absolute w-1 h-0.5 bg-white rounded-full"
          style={{
            boxShadow: '-20px 0 15px 1px rgba(255, 255, 255, 0.4), -40px 0 25px 1px rgba(255, 255, 255, 0.2)',
          }}
          initial={{ left: '110%', top: `${10 + index * 25}%`, opacity: 0 }}
          animate={{
            left: ['-15%'],
            top: [`${50 + index * 12}%`],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.2 + index * 0.2,
            repeat: Infinity,
            repeatDelay: 15 + index * 10,
            delay: index * 6,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Subtle cosmic dust - very fine particles */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(0.5px 0.5px at 15% 25%, rgba(255, 255, 255, 0.08) 0%, transparent 100%),
            radial-gradient(0.5px 0.5px at 35% 65%, rgba(255, 255, 255, 0.06) 0%, transparent 100%),
            radial-gradient(0.5px 0.5px at 55% 15%, rgba(255, 255, 255, 0.07) 0%, transparent 100%),
            radial-gradient(0.5px 0.5px at 75% 45%, rgba(255, 255, 255, 0.05) 0%, transparent 100%),
            radial-gradient(0.5px 0.5px at 85% 85%, rgba(255, 255, 255, 0.06) 0%, transparent 100%)
          `,
          backgroundSize: '100% 100%',
          transform: `translate(${mouseX * 4}px, ${mouseY * 4}px)`,
          opacity: 0.6,
        }}
      />
    </div>
  );
};

export default GalaxyBackground;
