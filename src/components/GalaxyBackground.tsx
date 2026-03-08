import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParallax } from '@/hooks/useParallax';
import { useTheme } from '@/contexts/ThemeContext';

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
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Detect device type for responsive star count
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Color palette for stars - clean, no glow colors
  const starColors = useMemo(() => [
    'rgba(255, 255, 255, 1)',
    'rgba(220, 235, 255, 1)',
    'rgba(255, 248, 240, 1)',
    'rgba(200, 215, 255, 1)',
  ], []);

  // Responsive star count: Mobile: 60, Tablet: 120, Desktop: 250
  const starCount = useMemo(() => {
    if (isMobile) return 60;
    if (isTablet) return 120;
    return 250;
  }, [isMobile, isTablet]);

  // Generate clean, round stars without halos
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.7 + 0.2,
      blinkDuration: Math.random() * 6 + 3,
      blinkDelay: Math.random() * 10,
      parallaxFactor: Math.random() * 0.4 + 0.1,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));
  }, [starCount, starColors]);

  // Aurora waves - fewer on mobile
  const auroraWaves = useMemo<AuroraWave[]>(() => {
    const waves: AuroraWave[] = [
      { id: 0, yPosition: 15, color: 'rgba(50, 180, 120, 0.03)', height: 120, duration: 18, delay: 0 },
      { id: 1, yPosition: 25, color: 'rgba(80, 200, 180, 0.025)', height: 100, duration: 22, delay: 3 },
    ];
    if (!isMobile) {
      waves.push(
        { id: 2, yPosition: 20, color: 'rgba(100, 220, 200, 0.02)', height: 140, duration: 25, delay: 6 }
      );
    }
    return waves;
  }, [isMobile]);

  // Nebula clouds - reduced for mobile
  const nebulaClouds = useMemo<NebulaCloud[]>(() => {
    if (isMobile) {
      return [
        { x: 30, y: 40, size: 400, color: 'rgba(100, 80, 150, 0.02)', blur: 100, pulseDelay: 0 },
      ];
    }
    if (isTablet) {
      return [
        { x: 20, y: 30, size: 500, color: 'rgba(100, 80, 150, 0.02)', blur: 110, pulseDelay: 0 },
        { x: 70, y: 60, size: 450, color: 'rgba(80, 100, 160, 0.018)', blur: 120, pulseDelay: 3 },
      ];
    }
    return [
      { x: 15, y: 25, size: 550, color: 'rgba(100, 80, 150, 0.02)', blur: 100, pulseDelay: 0 },
      { x: 75, y: 55, size: 600, color: 'rgba(80, 100, 160, 0.018)', blur: 120, pulseDelay: 2 },
      { x: 45, y: 15, size: 450, color: 'rgba(140, 100, 160, 0.015)', blur: 90, pulseDelay: 4 },
    ];
  }, [isMobile, isTablet]);

  // Cursor glow - disabled on mobile for performance
  const cursorGlow = useMemo(() => ({
    x: 50 + (isMobile ? 0 : mouseX * 20),
    y: 50 + (isMobile ? 0 : mouseY * 20),
  }), [mouseX, mouseY, isMobile]);

  // Scroll-based parallax offset - reduced on mobile
  const scrollOffset = isMobile ? scrollY * 0.05 : scrollY * 0.08;

  // Bright stars count - responsive
  const brightStarsCount = isMobile ? 8 : isTablet ? 12 : 18;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep space gradient base - clean dark sky */}
      <div 
        className="absolute inset-0 transform-gpu"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% 100%, rgba(15, 10, 35, 0.5) 0%, transparent 60%),
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(25, 20, 60, 0.35) 0%, transparent 50%),
            radial-gradient(ellipse 90% 70% at 80% 20%, rgba(20, 30, 70, 0.3) 0%, transparent 55%),
            linear-gradient(180deg, hsl(240, 100%, 4%) 0%, hsl(250, 100%, 2%) 50%, hsl(240, 100%, 1%) 100%)
          `,
          transform: `translateY(${scrollOffset * 0.1}px)`,
        }}
      />

      {/* Aurora wave animations - subtle and slow */}
      {auroraWaves.map((wave) => (
        <motion.div
          key={`aurora-${wave.id}`}
          className="absolute w-full pointer-events-none transform-gpu"
          style={{
            top: `${wave.yPosition}%`,
            height: wave.height,
            background: `linear-gradient(90deg, 
              transparent 0%, 
              ${wave.color} 25%, 
              ${wave.color} 50%, 
              ${wave.color} 75%, 
              transparent 100%
            )`,
            filter: 'blur(80px)',
            transform: `translateY(${scrollOffset * 0.15}px)`,
          }}
          animate={{
            opacity: [0.4, 0.6, 0.4],
            scaleX: [1, 1.02, 1],
          }}
          transition={{
            duration: wave.duration,
            delay: wave.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Interactive cursor glow - desktop only */}
      {!isMobile && (
        <motion.div
          className="absolute rounded-full pointer-events-none transform-gpu"
          style={{
            left: `${cursorGlow.x}%`,
            top: `${cursorGlow.y}%`,
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.015) 0%, rgba(34, 211, 238, 0.005) 50%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(40px)',
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0.6, 0.5],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Subtle nebula clouds for galaxy depth */}
      {nebulaClouds.map((cloud, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full transform-gpu"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            width: cloud.size,
            height: cloud.size,
            background: `radial-gradient(circle, ${cloud.color} 0%, transparent 65%)`,
            filter: `blur(${cloud.blur}px)`,
            transform: `translate(-50%, -50%) translateY(${scrollOffset * 0.2}px)`,
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0.6, 0.5],
          }}
          transition={{
            duration: 15 + index * 3,
            delay: cloud.pulseDelay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Milky Way band - subtle diagonal sweep */}
      <div 
        className="absolute inset-0 transform-gpu"
        style={{
          background: `
            linear-gradient(
              135deg,
              transparent 0%,
              rgba(180, 160, 200, 0.008) 15%,
              rgba(200, 180, 220, 0.02) 30%,
              rgba(220, 200, 240, 0.03) 45%,
              rgba(200, 180, 220, 0.02) 60%,
              rgba(180, 160, 200, 0.008) 85%,
              transparent 100%
            )
          `,
          transform: `translateY(${scrollOffset * 0.06}px)`,
        }}
      />

      {/* Andromeda galaxy - desktop only */}
      {!isMobile && (
        <motion.div
          className="absolute transform-gpu"
          style={{
            left: '70%',
            top: '25%',
            width: 180,
            height: 70,
            background: 'radial-gradient(ellipse, rgba(200, 190, 220, 0.04) 0%, rgba(180, 170, 200, 0.02) 40%, transparent 70%)',
            filter: 'blur(12px)',
            borderRadius: '50%',
            transform: `translate(-50%, -50%) rotate(-25deg)`,
          }}
          animate={{
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Clean stars layer - NO halos, just round dots */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full transform-gpu"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              backgroundColor: star.color,
              transform: isMobile 
                ? undefined 
                : `translate(${mouseX * 15 * star.parallaxFactor}px, ${mouseY * 15 * star.parallaxFactor + scrollOffset * star.parallaxFactor * 0.3}px)`,
            }}
            animate={{
              opacity: [star.opacity, star.opacity * 0.4, star.opacity],
              scale: [1, 0.9, 1],
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
      {Array.from({ length: brightStarsCount }).map((_, i) => (
        <motion.div
          key={`bright-${i}`}
          className="absolute rounded-full transform-gpu"
          style={{
            left: `${8 + (i * 6) % 85}%`,
            top: `${12 + (i * 7) % 75}%`,
            width: i % 4 === 0 ? 2.2 : 1.8,
            height: i % 4 === 0 ? 2.2 : 1.8,
            backgroundColor: i % 5 === 0 
              ? 'rgba(255, 200, 180, 0.9)' 
              : i % 3 === 0 
                ? 'rgba(180, 200, 255, 0.9)' 
                : 'rgba(255, 255, 255, 0.9)',
            transform: isMobile 
              ? undefined 
              : `translate(${mouseX * 18 * ((i % 4) * 0.1 + 0.1)}px, ${mouseY * 18 * ((i % 4) * 0.1 + 0.1)}px)`,
          }}
          animate={{
            opacity: [0.85, 0.5, 0.85],
            scale: [1, 0.92, 1],
          }}
          transition={{
            duration: 4 + i * 0.3,
            delay: i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Shooting stars - only on desktop */}
      {!isMobile && !isTablet && (
        <>
          {[0, 1].map((index) => (
            <motion.div
              key={`shooting-${index}`}
              className="absolute w-1 h-0.5 bg-white rounded-full transform-gpu"
              style={{
                boxShadow: '-15px 0 12px 1px rgba(255, 255, 255, 0.3), -30px 0 20px 1px rgba(255, 255, 255, 0.15)',
              }}
              initial={{ left: '110%', top: `${15 + index * 30}%`, opacity: 0 }}
              animate={{
                left: ['-15%'],
                top: [`${50 + index * 15}%`],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 1.5 + index * 0.3,
                repeat: Infinity,
                repeatDelay: 20 + index * 12,
                delay: index * 8,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Subtle cosmic dust - desktop only */}
      {!isMobile && (
        <div 
          className="absolute inset-0 transform-gpu"
          style={{
            backgroundImage: `
              radial-gradient(0.5px 0.5px at 15% 25%, rgba(255, 255, 255, 0.05) 0%, transparent 100%),
              radial-gradient(0.5px 0.5px at 55% 15%, rgba(255, 255, 255, 0.04) 0%, transparent 100%),
              radial-gradient(0.5px 0.5px at 85% 85%, rgba(255, 255, 255, 0.04) 0%, transparent 100%)
            `,
            backgroundSize: '100% 100%',
            transform: `translate(${mouseX * 3}px, ${mouseY * 3}px)`,
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
};

export default GalaxyBackground;
