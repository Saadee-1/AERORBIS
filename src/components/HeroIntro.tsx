"use client";
import React, { useEffect, useRef, useState, Suspense } from "react";
import { gsap } from "gsap";
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import aerorbisLogo from '@/assets/aerorbis-logo.png';
import { motion } from 'framer-motion';

type Props = {
  onFinish?: () => void;
  autoPlayDuration?: number;
};

const IntroGlobe = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.008;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
    }
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += 0.005;
      wireframeRef.current.rotation.z += 0.003;
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#0a0a2e"
          attach="material"
          distort={0.25}
          speed={3}
          roughness={0.3}
          metalness={0.9}
        />
      </Sphere>

      <Sphere ref={wireframeRef} args={[1.03, 32, 32]}>
        <meshBasicMaterial
          color="#00d4ff"
          wireframe
          transparent
          opacity={0.2}
        />
      </Sphere>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.015, 16, 100]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.5} />
      </mesh>

      <Sphere args={[1.2, 32, 32]}>
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
};

// Background stars component
const BackgroundStars = () => {
  const stars = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 0.5,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
          }}
        />
      ))}
    </div>
  );
};

export default function HeroIntro({ onFinish, autoPlayDuration = 4 }: Props) {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".intro-globe",
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 1, ease: "power2.out", delay: 0.2 }
      );

      gsap.fromTo(
        ".intro-logo",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay: 0.5 }
      );

      gsap.fromTo(
        ".intro-title",
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 1, ease: "power2.out", delay: 0.7 }
      );

      gsap.fromTo(
        ".intro-tagline",
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay: 1 }
      );

      gsap.fromTo(
        ".intro-loader",
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out", delay: 1.5 }
      );
    }, containerRef);

    const timer = setTimeout(() => startExit(), autoPlayDuration * 1000);

    function startExit() {
      if (!visible) return;
      setVisible(false);

      gsap.to(containerRef.current, {
        opacity: 0,
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
        background: "radial-gradient(ellipse at center, hsl(240, 100%, 8%) 0%, hsl(240, 100%, 3%) 100%)",
      }}
    >
      {/* Background stars */}
      <BackgroundStars />

      {/* Globe */}
      <div className="intro-globe w-48 h-48 md:w-64 md:h-64 mb-8 z-10">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }}>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={1.2} color="#00d4ff" />
            <pointLight position={[-10, -10, -10]} intensity={0.6} color="#8b5cf6" />
            <IntroGlobe />
          </Canvas>
        </Suspense>
      </div>

      {/* Logo and text */}
      <div className="text-center z-10">
        <img 
          src={aerorbisLogo} 
          alt="Aerorbis Logo" 
          className="intro-logo w-16 h-16 object-contain mx-auto mb-4"
        />
        <div
          className="intro-title text-4xl md:text-5xl font-semibold tracking-wide mb-3"
          style={{ color: "hsl(220, 20%, 90%)" }}
        >
          AERORBIS
        </div>
        <div
          className="intro-tagline text-sm tracking-[0.2em] uppercase"
          style={{ color: "hsl(220, 15%, 55%)" }}
        >
          Aerospace Research Initiative
        </div>
      </div>

      {/* Loading indicator */}
      <div className="intro-loader mt-12 flex items-center gap-2 z-10">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: "hsl(195, 100%, 50%)" }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={() => {
          setVisible(false);
          if (onFinish) onFinish();
        }}
        className="absolute bottom-6 right-6 px-4 py-2 text-sm rounded border transition-colors z-20"
        style={{
          background: "hsl(240, 80%, 12%)",
          borderColor: "hsl(220, 30%, 25%)",
          color: "hsl(220, 20%, 75%)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "hsl(195, 100%, 50%)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "hsl(220, 30%, 25%)";
        }}
      >
        Skip Intro
      </button>
    </div>
  );
}
