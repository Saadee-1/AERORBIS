"use client";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

type Props = {
  onFinish?: () => void;
  autoPlayDuration?: number; // seconds before auto-complete
};

export default function HeroIntro({ onFinish, autoPlayDuration = 6 }: Props) {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // --- Initial intro animation ---
      gsap.fromTo(
        ".intro-sub",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1.2, ease: "power2.out", delay: 0.3 }
      );

      gsap.fromTo(
        ".intro-title",
        { opacity: 0, scale: 0.7, textShadow: "0 0 0px #00ffff" },
        {
          opacity: 1,
          scale: 1,
          duration: 2,
          ease: "power3.out",
          delay: 0.6,
          textShadow: "0 0 40px #00ffff, 0 0 80px #0088ff",
        }
      );

      gsap.fromTo(
        ".intro-tagline",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1.5, ease: "power2.out", delay: 1.5 }
      );

      // --- Background glow pulse ---
      gsap.to(".neon-glow", {
        opacity: 0.7,
        scale: 1.4,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // --- Random moving streaks ---
      const streaks = gsap.utils.toArray(".streak");
      streaks.forEach((streak: unknown, i) => {
        const move = () => {
          gsap.fromTo(
            streak,
            {
              x: Math.random() * window.innerWidth - window.innerWidth / 2,
              y: Math.random() * window.innerHeight - window.innerHeight / 2,
              opacity: 0,
            },
            {
              x: "+=" + (Math.random() * 400 - 200),
              y: "+=" + (Math.random() * 400 - 200),
              opacity: Math.random() * 0.6 + 0.2,
              duration: Math.random() * 3 + 2,
              ease: "sine.inOut",
              onComplete: move,
            }
          );
        };
        move();
      });
    }, containerRef);

    // --- Auto finish timer ---
    const timer = setTimeout(() => startExit(), autoPlayDuration * 1000);

    function startExit() {
      if (!visible) return;
      setVisible(false);

      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 1.2,
        ease: "power2.inOut",
        onComplete: () => {
          if (onFinish) onFinish();
        },
      });
    }

    // --- Cleanup ---
    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [onFinish, autoPlayDuration, visible]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(circle at center, rgba(10,20,40,1) 0%, rgba(5,10,20,0.96) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        overflow: "hidden",
        color: "#C8F6FF",
        fontFamily: "Orbitron, sans-serif",
      }}
    >
      {/* Neon background glow */}
      <div
        className="neon-glow"
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,255,255,0.3) 0%, rgba(0,80,255,0.0) 70%)",
          filter: "blur(90px)",
          zIndex: 1,
        }}
      ></div>

      {/* Random light streaks */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="streak"
          style={{
            position: "absolute",
            width: "2px",
            height: Math.random() * 100 + 100 + "px",
            background:
              "linear-gradient(to bottom, rgba(0,255,255,0.7), rgba(0,255,255,0))",
            opacity: 0.2,
            zIndex: 2,
          }}
        ></div>
      ))}

      {/* Text content */}
      <div
        style={{
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <div className="intro-sub" style={{ fontSize: 18, letterSpacing: 3 }}>
          WELCOME TO
        </div>
        <div
          className="intro-title"
          style={{
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: 4,
            margin: "10px 0",
            color: "#00FFFF",
            textShadow: "0 0 25px #00FFFF, 0 0 60px #0088FF",
          }}
        >
          AEROVERSE
        </div>
        <div
          className="intro-tagline"
          style={{
            fontSize: 18,
            letterSpacing: 2,
            color: "rgba(200,250,255,0.85)",
          }}
        >
          Discover · Design · Defy Gravity
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={() => {
          setVisible(false);
          if (onFinish) onFinish();
        }}
        style={{
          position: "absolute",
          bottom: 28,
          right: 28,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(200,250,255,0.2)",
          color: "#C8F6FF",
          padding: "10px 16px",
          borderRadius: 10,
          cursor: "pointer",
          zIndex: 20,
          backdropFilter: "blur(6px)",
          fontSize: 14,
        }}
      >
        Skip Intro
      </button>
    </div>
  );
}
