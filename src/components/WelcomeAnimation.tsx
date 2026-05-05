import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  speed: number;
}

const WelcomeAnimation = () => {
  const { user, showWelcome, setShowWelcome } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const phaseRef = useRef<"converging" | "holding" | "dispersing">("converging");

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Explorer";

  useEffect(() => {
    if (!showWelcome) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const colors = [
      "0, 212, 170",
      "0, 180, 150",
      "255, 255, 255",
      "100, 230, 200",
    ];

    particlesRef.current = Array.from({ length: 250 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.max(canvas.width, canvas.height) * (0.5 + Math.random() * 0.6);
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        targetX: cx + (Math.random() - 0.5) * 80,
        targetY: cy + (Math.random() - 0.5) * 80,
        vx: 0,
        vy: 0,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 0.07 + 0.035,
      };
    });

    phaseRef.current = "converging";

    const holdTimer = setTimeout(() => {
      phaseRef.current = "holding";

      const disperseTimer = setTimeout(() => {
        phaseRef.current = "dispersing";
        particlesRef.current.forEach(p => {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 10 + 5;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
        });

        const endTimer = setTimeout(() => {
          setShowWelcome(false);
          navigate("/");
        }, 900);

        return () => clearTimeout(endTimer);
      }, 1800);

      return () => clearTimeout(disperseTimer);
    }, 1300);

    const animate = () => {
      ctx.fillStyle = "rgba(8, 10, 26, 0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(p => {
        if (phaseRef.current === "converging") {
          p.x += (p.targetX - p.x) * p.speed;
          p.y += (p.targetY - p.y) * p.speed;
        } else if (phaseRef.current === "dispersing") {
          p.x += p.vx;
          p.y += p.vy;
          p.opacity *= 0.95;
          p.vx *= 1.05;
          p.vy *= 1.05;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.fill();

        if (p.size > 1.5) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color}, ${p.opacity * 0.08})`;
          ctx.fill();
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(holdTimer);
    };
  }, [showWelcome]);

  return (
    <AnimatePresence>
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(8, 10, 26, 0.97)" }}
        >
          <canvas ref={canvasRef} className="absolute inset-0" />

          <div className="relative z-10 text-center select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0, duration: 0.5, type: "spring", stiffness: 180 }}
              className="w-16 h-16 rounded-full border border-primary/40 flex items-center justify-center mx-auto mb-5"
              style={{ boxShadow: "0 0 40px rgba(0, 212, 170, 0.35), inset 0 0 20px rgba(0,212,170,0.05)" }}
            >
              <span className="text-2xl">🚀</span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.1em" }}
              animate={{ opacity: 1, letterSpacing: "0.35em" }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="text-primary/60 text-xs uppercase mb-3 font-[Orbitron]"
            >
              CLEARANCE GRANTED
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.5 }}
              className="text-5xl font-bold text-white font-[Orbitron] mb-2"
              style={{ textShadow: "0 0 40px rgba(0, 212, 170, 0.4)" }}
            >
              Welcome
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.65, duration: 0.5 }}
              className="text-4xl font-bold font-[Orbitron]"
              style={{ color: "#00d4aa", textShadow: "0 0 30px rgba(0, 212, 170, 0.8)" }}
            >
              {displayName}
            </motion.h2>

            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 1.9, duration: 0.8 }}
              className="mt-5 h-px w-56 mx-auto"
              style={{ background: "linear-gradient(to right, transparent, rgba(0,212,170,0.8), transparent)" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeAnimation;