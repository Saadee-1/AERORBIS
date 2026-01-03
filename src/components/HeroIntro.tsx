"use client";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

type Props = {
  onFinish?: () => void;
  autoPlayDuration?: number; // seconds before auto-complete
};

export default function HeroIntro({ onFinish, autoPlayDuration = 4 }: Props) {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // --- Initial intro animation - restrained ---
      gsap.fromTo(
        ".intro-sub",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay: 0.2 }
      );

      gsap.fromTo(
        ".intro-title",
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
          delay: 0.4,
        }
      );

      gsap.fromTo(
        ".intro-tagline",
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay: 0.8 }
      );
    }, containerRef);

    // --- Auto finish timer ---
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
      className="fixed inset-0 z-[9999] flex items-center justify-center flex-col overflow-hidden"
      style={{
        background: "hsl(240, 100%, 6%)",
      }}
    >
      {/* Text content */}
      <div className="text-center z-10">
        <div
          className="intro-sub text-sm tracking-[0.2em] uppercase"
          style={{ color: "hsl(220, 15%, 60%)" }}
        >
          Welcome to
        </div>
        <div
          className="intro-title text-5xl md:text-6xl font-semibold tracking-wide my-4"
          style={{ color: "hsl(220, 20%, 90%)" }}
        >
          AERORBIS
        </div>
        <div
          className="intro-tagline text-base tracking-wide"
          style={{ color: "hsl(220, 15%, 55%)" }}
        >
          Where Aerospace Minds Connect
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
          e.currentTarget.style.borderColor = "hsl(215, 40%, 50%)";
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
