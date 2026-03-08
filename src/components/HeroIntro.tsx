"use client";
import React, { useEffect, useRef, useState, Suspense } from "react";
import { gsap } from "gsap";
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import aerorbisLogo from '@/assets/aerorbis-logo-refined.png';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  onFinish?: () => void;
  autoPlayDuration?: number;
};

const IntroGlobe = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.006;
      meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.15;
    }
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += 0.004;
      wireframeRef.current.rotation.z += 0.002;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.3;
      ring1Ref.current.rotation.x = Math.sin(t * 0.2) * 0.3;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.2;
      ring2Ref.current.rotation.y = Math.cos(t * 0.15) * 0.4;
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#030824"
          attach="material"
          distort={0.2}
          speed={2.5}
          roughness={0.2}
          metalness={0.95}
        />
      </Sphere>

      <Sphere ref={wireframeRef} args={[1.03, 32, 32]}>
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.15} />
      </Sphere>

      {/* Orbital rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.012, 16, 100]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.5} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <torusGeometry args={[1.7, 0.008, 16, 100]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.25} />
      </mesh>

      <Sphere args={[1.2, 32, 32]}>
        <meshBasicMaterial color="#10b981" transparent opacity={0.03} side={THREE.BackSide} />
      </Sphere>
    </group>
  );
};

// Holographic data stream lines
const DataStreams = () => {
  const streams = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${8 + Math.random() * 84}%`,
    height: `${20 + Math.random() * 60}%`,
    delay: Math.random() * 2,
    duration: 1.5 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {streams.map((s) => (
        <motion.div
          key={s.id}
          className="absolute w-px"
          style={{
            left: s.left,
            height: s.height,
            bottom: 0,
            background: 'linear-gradient(to top, transparent, hsl(var(--primary) / 0.3), transparent)',
          }}
          animate={{ opacity: [0, 0.6, 0], y: [20, -40, -80] }}
          transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

// Scanning grid overlay
const ScanGrid = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {/* Horizontal scan line */}
    <motion.div
      className="absolute left-0 right-0 h-px"
      style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)' }}
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    />
    {/* Subtle grid */}
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
    {/* Top-left label */}
    <motion.div
      className="absolute top-4 left-4 text-[9px] font-rajdhani tracking-[0.3em] text-primary/30 uppercase"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
    >
      SYS.INIT // AERORBIS v2.0
    </motion.div>
    {/* Bottom-right label */}
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

// Flicker text component
const FlickerText = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    animate={{
      opacity: [0, 1, 0.3, 1, 0.7, 1],
    }}
    transition={{
      duration: 0.8,
      delay,
      times: [0, 0.1, 0.2, 0.35, 0.5, 0.7],
    }}
  >
    {children}
  </motion.div>
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

export default function HeroIntro({ onFinish, autoPlayDuration = 4.5 }: Props) {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".intro-globe",
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: 1.2, ease: "power3.out", delay: 0.2 }
      );

      gsap.fromTo(
        ".intro-logo",
        { opacity: 0, scale: 0.5, filter: "blur(10px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "power2.out", delay: 0.6 }
      );

      gsap.fromTo(
        ".intro-glow",
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: "power2.out", delay: 0.8 }
      );
    }, containerRef);

    const timer = setTimeout(() => startExit(), autoPlayDuration * 1000);

    function startExit() {
      if (!visible) return;
      setVisible(false);

      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 1.05,
        filter: "blur(8px)",
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          if (onFinish) onFinish();
        },
      });
    }

    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [onFinish, autoPlayDuration, visible]);

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
      <DataStreams />
      <HudFrame />
      <BootSequence />

      {/* Glow pulse behind globe */}
      <div className="intro-glow absolute w-80 h-80 rounded-full opacity-0" style={{
        background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      {/* Globe */}
      <div className="intro-globe w-52 h-52 md:w-72 md:h-72 mb-6 z-10 opacity-0">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 3.8], fov: 42 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color="#10b981" />
            <pointLight position={[-10, -10, -10]} intensity={0.4} color="#6366f1" />
            <IntroGlobe />
          </Canvas>
        </Suspense>
      </div>

      {/* Logo and title with holographic flicker */}
      <div className="text-center z-10 relative">
        <FlickerText delay={0.5}>
          <img
            src={aerorbisLogo}
            alt="Aerorbis Logo"
            className="intro-logo w-12 h-12 md:w-16 md:h-16 object-contain mx-auto mb-4"
          />
        </FlickerText>

        <FlickerText delay={0.8} className="mb-3">
          <div className="text-4xl md:text-6xl font-orbitron font-bold tracking-[0.15em] text-foreground relative">
            AERORBIS
            {/* Holographic underline */}
            <motion.div
              className="absolute -bottom-2 left-1/2 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
              initial={{ width: 0, x: '-50%' }}
              animate={{ width: '100%', x: '-50%' }}
              transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </FlickerText>

        <FlickerText delay={1.2}>
          <div className="text-xs md:text-sm font-rajdhani tracking-[0.4em] uppercase text-primary/60">
            Where Aerospace Minds Connect
          </div>
        </FlickerText>
      </div>

      {/* Loading indicator - holographic style */}
      <motion.div
        className="mt-10 flex flex-col items-center gap-3 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
      >
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-6 h-1 rounded-full"
              style={{ background: 'hsl(var(--primary))' }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scaleX: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.12,
              }}
            />
          ))}
        </div>
        <span className="text-[10px] font-rajdhani tracking-[0.3em] text-primary/40 uppercase">
          Systems Loading
        </span>
      </motion.div>

      {/* Skip button - HUD style */}
      <button
        onClick={() => {
          setVisible(false);
          if (onFinish) onFinish();
        }}
        className="absolute bottom-6 right-6 px-4 py-2 text-[11px] font-rajdhani tracking-[0.2em] uppercase rounded border transition-all duration-200 z-20 text-primary/60 border-primary/20 bg-primary/5 hover:border-primary/50 hover:text-primary/90 hover:shadow-[0_0_15px_hsl(var(--primary)/0.15)]"
      >
        Skip Intro →
      </button>
    </div>
  );
}
