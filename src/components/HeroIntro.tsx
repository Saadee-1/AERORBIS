"use client";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import aerorbisLogo from '@/assets/aerorbis-logo-refined.png';
import { motion } from 'framer-motion';

type Props = {
  onFinish?: () => void;
  autoPlayDuration?: number;
};

// Floating particles
const Particles = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 1 + Math.random() * 2,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/40"
          style={{ left: p.left, bottom: -10, width: p.size, height: p.size }}
          animate={{ y: [0, -600], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

// Scanning grid overlay
const ScanGrid = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <motion.div
      className="absolute left-0 right-0 h-px"
      style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)' }}
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    />
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary) / 0.5) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary) / 0.5) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />
  </div>
);

// HUD corner brackets
const HudFrame = () => (
  <div className="absolute inset-8 md:inset-16 pointer-events-none">
    <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-primary/40" />
    <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-primary/40" />
    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-primary/40" />
    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-primary/40" />
    <motion.div
      className="absolute top-4 left-4 text-[9px] font-rajdhani tracking-[0.3em] text-primary/30 uppercase"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
    >
      SYS.INIT // AERORBIS v2.0
    </motion.div>
    <motion.div
      className="absolute bottom-4 right-4 text-[9px] font-rajdhani tracking-[0.3em] text-primary/30 uppercase"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.8 }}
    >
      STATUS: INITIALIZING
    </motion.div>
  </div>
);

// Boot sequence text
const BootSequence = () => {
  const lines = [
    { text: "> Initializing command systems...", delay: 0.3 },
    { text: "> Loading aerospace modules...", delay: 0.8 },
    { text: "> Establishing secure connection...", delay: 1.3 },
    { text: "> All systems nominal ✓", delay: 2.0 },
  ];

  return (
    <div className="absolute bottom-20 left-8 md:left-16 z-10">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          className="text-[10px] font-rajdhani tracking-wider text-primary/40"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 0.6, x: 0 }}
          transition={{ delay: line.delay, duration: 0.3 }}
        >
          {line.text}
        </motion.div>
      ))}
    </div>
  );
};

// CSS Orbital rings around logo
const OrbitalRings = () => (
  <div className="absolute inset-0 pointer-events-none">
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 rounded-full border border-primary/20"
      style={{ animation: 'orbitSpin 6s linear infinite' }}
    />
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 md:w-72 md:h-72 rounded-full border border-primary/10"
      style={{ animation: 'orbitSpin 8s linear infinite reverse' }}
    />
    {/* Orbiting dot */}
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64"
      style={{ animation: 'orbitSpin 6s linear infinite' }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
    </div>
  </div>
);

// Typing text effect
const TypingTitle = () => {
  const letters = "AERORBIS".split("");
  return (
    <div className="text-4xl md:text-6xl font-orbitron font-bold tracking-[0.15em] text-foreground relative flex justify-center">
      {letters.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 1, 0.4, 1], y: 0 }}
          transition={{
            duration: 0.5,
            delay: 1.0 + i * 0.08,
            times: [0, 0.3, 0.6, 1],
          }}
        >
          {char}
        </motion.span>
      ))}
      {/* Holographic underline */}
      <motion.div
        className="absolute -bottom-2 left-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ delay: 1.8, duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
};

export default function HeroIntro({ onFinish, autoPlayDuration = 4.5 }: Props) {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => startExit(), autoPlayDuration * 1000);

    function startExit() {
      if (!containerRef.current) return;
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 1.05,
        filter: "blur(8px)",
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          setVisible(false);
          if (onFinish) onFinish();
        },
      });
    }

    return () => clearTimeout(timer);
  }, [onFinish, autoPlayDuration]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center flex-col overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at center, hsl(220, 80%, 6%) 0%, hsl(220, 100%, 2%) 100%)",
      }}
    >
      {/* Ambient effects */}
      <ScanGrid />
      <Particles />
      <HudFrame />
      <BootSequence />

      {/* Glow pulse behind logo */}
      <motion.div
        className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbital rings */}
      <motion.div
        className="relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        <OrbitalRings />
      </motion.div>

      {/* Logo */}
      <motion.img
        src={aerorbisLogo}
        alt="Aerorbis Logo"
        className="w-16 h-16 md:w-20 md:h-20 object-contain mb-6 z-10"
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Pulse ring on logo entrance */}
      <motion.div
        className="absolute w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-primary/50"
        initial={{ opacity: 0.8, scale: 0.5 }}
        animate={{ opacity: 0, scale: 3 }}
        transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '-3rem' }}
      />

      {/* Title and slogan */}
      <div className="text-center z-10 relative">
        <TypingTitle />

        <motion.div
          className="text-xs md:text-sm font-rajdhani tracking-[0.4em] uppercase text-primary/60 mt-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          Where Aerospace Minds Connect
        </motion.div>
      </div>

      {/* Loading indicator */}
      <motion.div
        className="mt-10 flex flex-col items-center gap-3 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
      >
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-6 h-1 rounded-full bg-primary"
              animate={{ opacity: [0.2, 1, 0.2], scaleX: [0.6, 1, 0.6] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
        </div>
        <span className="text-[10px] font-rajdhani tracking-[0.3em] text-primary/40 uppercase">
          Systems Loading
        </span>
      </motion.div>

      {/* Skip button */}
      <button
        onClick={() => {
          setVisible(false);
          if (onFinish) onFinish();
        }}
        className="absolute bottom-6 right-6 px-4 py-2 text-[11px] font-rajdhani tracking-[0.2em] uppercase rounded border transition-all duration-200 z-20 text-primary/60 border-primary/20 bg-primary/5 hover:border-primary/50 hover:text-primary/90 hover:shadow-[0_0_15px_hsl(var(--primary)/0.15)]"
      >
        Skip Intro →
      </button>

      {/* Orbital ring keyframe */}
      <style>{`
        @keyframes orbitSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
