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

const GalaxyBackground = () => {
  const { theme } = useTheme();
  const { mouseX, mouseY, scrollY } = useParallax();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Clean star colors - pure whites and subtle tints
  const starColors = useMemo(() => [
    'rgba(255, 255, 255, 1)',
    'rgba(230, 240, 255, 1)',
    'rgba(255, 250, 245, 1)',
    'rgba(220, 230, 255, 1)',
  ], []);

  // Responsive star count
  const starCount = useMemo(() => {
    if (isMobile) return 80;
    if (isTablet) return 150;
    return 300;
  }, [isMobile, isTablet]);

  // Generate clean stars
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.3,
      blinkDuration: Math.random() * 5 + 4,
      blinkDelay: Math.random() * 8,
      parallaxFactor: Math.random() * 0.3 + 0.1,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));
  }, [starCount, starColors]);

  // Scroll-based offset
  const scrollOffset = isMobile ? scrollY * 0.03 : scrollY * 0.05;

  // Bright accent stars count
  const brightStarsCount = isMobile ? 6 : isTablet ? 10 : 15;

  if (theme === 'light') return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep space gradient - clean and subtle */}
      <div 
        className="absolute inset-0 transform-gpu"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% 100%, rgba(10, 8, 25, 0.6) 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 20% 20%, rgba(15, 15, 40, 0.3) 0%, transparent 50%),
            linear-gradient(180deg, hsl(240, 100%, 3%) 0%, hsl(250, 100%, 2%) 50%, hsl(240, 100%, 1%) 100%)
          `,
          transform: `translateY(${scrollOffset * 0.1}px)`,
        }}
      />

      {/* Subtle Milky Way band */}
      <div 
        className="absolute inset-0 transform-gpu"
        style={{
          background: `
            linear-gradient(
              135deg,
              transparent 0%,
              rgba(200, 190, 220, 0.006) 20%,
              rgba(220, 210, 240, 0.015) 40%,
              rgba(200, 190, 220, 0.006) 60%,
              transparent 100%
            )
          `,
          transform: `translateY(${scrollOffset * 0.04}px)`,
        }}
      />

      {/* Clean stars layer */}
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
                : `translate(${mouseX * 10 * star.parallaxFactor}px, ${mouseY * 10 * star.parallaxFactor + scrollOffset * star.parallaxFactor * 0.2}px)`,
            }}
            animate={{
              opacity: [star.opacity, star.opacity * 0.5, star.opacity],
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

      {/* Brighter accent stars */}
      {Array.from({ length: brightStarsCount }).map((_, i) => (
        <motion.div
          key={`bright-${i}`}
          className="absolute rounded-full transform-gpu"
          style={{
            left: `${10 + (i * 7) % 80}%`,
            top: `${15 + (i * 8) % 70}%`,
            width: i % 3 === 0 ? 2.5 : 2,
            height: i % 3 === 0 ? 2.5 : 2,
            backgroundColor: i % 4 === 0 
              ? 'rgba(255, 220, 200, 0.95)' 
              : i % 3 === 0 
                ? 'rgba(200, 220, 255, 0.95)' 
                : 'rgba(255, 255, 255, 0.95)',
            transform: isMobile 
              ? undefined 
              : `translate(${mouseX * 12 * ((i % 3) * 0.1 + 0.1)}px, ${mouseY * 12 * ((i % 3) * 0.1 + 0.1)}px)`,
          }}
          animate={{
            opacity: [0.9, 0.5, 0.9],
          }}
          transition={{
            duration: 4 + i * 0.4,
            delay: i * 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Occasional shooting star - desktop only */}
      {!isMobile && !isTablet && (
        <motion.div
          className="absolute w-1 h-0.5 bg-white rounded-full transform-gpu"
          style={{
            boxShadow: '-20px 0 15px 2px rgba(255, 255, 255, 0.3), -40px 0 25px 2px rgba(255, 255, 255, 0.1)',
          }}
          initial={{ left: '110%', top: '20%', opacity: 0 }}
          animate={{
            left: ['-10%'],
            top: ['55%'],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            repeatDelay: 25,
            delay: 5,
            ease: 'easeOut',
          }}
        />
      )}
    </div>
  );
};

export default GalaxyBackground;
