import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

type Phase = "warp" | "frame" | "text" | "nameScale" | "hold" | "implode";

const WelcomeAnimation = () => {
  const { user, showWelcome, setShowWelcome } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("warp");
  const [typed1, setTyped1] = useState("");
  const [typed2, setTyped2] = useState("");
  const [typed3, setTyped3] = useState("");

  const displayName = (
    user?.displayName || user?.email?.split("@")[0] || "EXPLORER"
  ).toUpperCase();
  const pilotLine = `PILOT: ${displayName}`;

  // Phase transitions
  useEffect(() => {
    if (!showWelcome) return;
    setPhase("warp");
    setTyped1(""); setTyped2(""); setTyped3("");

    const timers = [
      setTimeout(() => setPhase("frame"), 500),
      setTimeout(() => setPhase("text"), 1000),
      setTimeout(() => setPhase("nameScale"), 2000),
      setTimeout(() => setPhase("hold"), 2600),
      setTimeout(() => setPhase("implode"), 3200),
      setTimeout(() => { setShowWelcome(false); navigate("/"); }, 3600),
    ];
    return () => { timers.forEach(clearTimeout); cancelAnimationFrame(rafRef.current); };
  }, [showWelcome]);

  // Typing effect
  useEffect(() => {
    if (phase !== "text") return;
    const line1 = "AERORBIS COMMAND";
    const line2 = pilotLine;
    const line3 = "STATUS: AUTHORIZED";
    const speed1 = 38, speed2 = 30, speed3 = 28;

    let i = 0;
    const t1 = setInterval(() => {
      if (i < line1.length) { setTyped1(line1.slice(0, ++i)); }
      else clearInterval(t1);
    }, speed1);

    const delay2 = line1.length * speed1 + 80;
    let j = 0;
    const s2 = setTimeout(() => {
      const t2 = setInterval(() => {
        if (j < line2.length) { setTyped2(line2.slice(0, ++j)); }
        else clearInterval(t2);
      }, speed2);
    }, delay2);

    const delay3 = delay2 + line2.length * speed2 + 80;
    let k = 0;
    const s3 = setTimeout(() => {
      const t3 = setInterval(() => {
        if (k < line3.length) { setTyped3(line3.slice(0, ++k)); }
        else clearInterval(t3);
      }, speed3);
    }, delay3);

    return () => { clearInterval(t1); clearTimeout(s2); clearTimeout(s3); };
  }, [phase]);

  // Warp canvas
  useEffect(() => {
    if (!showWelcome || phase !== "warp") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;

    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      speed: 14 + Math.random() * 28,
      len: 40 + Math.random() * 130,
      a: 0.3 + Math.random() * 0.7,
    }));

    const draw = () => {
      ctx.fillStyle = "rgba(6,8,20,0.22)";
      ctx.fillRect(0, 0, W, H);
      stars.forEach(s => {
        s.x -= s.speed;
        if (s.x + s.len < 0) { s.x = W + s.len; s.y = Math.random() * H; }
        const g = ctx.createLinearGradient(s.x, s.y, s.x + s.len, s.y);
        g.addColorStop(0, `rgba(0,212,170,0)`);
        g.addColorStop(0.5, `rgba(0,212,170,${s.a * 0.6})`);
        g.addColorStop(1, `rgba(255,255,255,${s.a})`);
        ctx.beginPath();
        ctx.strokeStyle = g;
        ctx.lineWidth = s.len > 100 ? 2 : 1;
        ctx.moveTo(s.x + s.len, s.y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [showWelcome, phase]);

  const inFrame = ["frame","text","nameScale","hold","implode"].includes(phase);
  const inText = ["text","nameScale","hold","implode"].includes(phase);
  const inName = ["nameScale","hold","implode"].includes(phase);
  const imploding = phase === "implode";

  if (!showWelcome) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: "#060814" }}
    >
      {/* Warp canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Everything implodes to center */}
      <motion.div
        animate={imploding ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={imploding ? { duration: 0.35, ease: [0.4, 0, 1, 1] } : { duration: 0.01 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {/* Top line */}
        <AnimatePresence>
          {inFrame && (
            <motion.div
              key="top-line"
              initial={{ scaleX: 0, y: 0 }}
              animate={{ scaleX: 1, y: "-35vh" }}
              transition={{
                scaleX: { duration: 0.22, ease: "easeOut" },
                y: { duration: 0.22, delay: 0.22, ease: "easeOut" },
              }}
              className="absolute w-full h-px origin-center"
              style={{ background: "rgba(0,212,170,1)", boxShadow: "0 0 10px rgba(0,212,170,0.7)" }}
            />
          )}
        </AnimatePresence>

        {/* Bottom line */}
        <AnimatePresence>
          {inFrame && (
            <motion.div
              key="bottom-line"
              initial={{ scaleX: 0, y: 0 }}
              animate={{ scaleX: 1, y: "35vh" }}
              transition={{
                scaleX: { duration: 0.22, ease: "easeOut" },
                y: { duration: 0.22, delay: 0.22, ease: "easeOut" },
              }}
              className="absolute w-full h-px origin-center"
              style={{ background: "rgba(0,212,170,1)", boxShadow: "0 0 10px rgba(0,212,170,0.7)" }}
            />
          )}
        </AnimatePresence>

        {/* Left vertical */}
        <AnimatePresence>
          {inFrame && (
            <motion.div
              key="left-v"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.22, delay: 0.44, ease: "easeOut" }}
              className="absolute h-[70vh] w-px origin-top"
              style={{ left: "10%", background: "rgba(0,212,170,0.35)" }}
            />
          )}
        </AnimatePresence>

        {/* Right vertical */}
        <AnimatePresence>
          {inFrame && (
            <motion.div
              key="right-v"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.22, delay: 0.44, ease: "easeOut" }}
              className="absolute h-[70vh] w-px origin-top"
              style={{ right: "10%", background: "rgba(0,212,170,0.35)" }}
            />
          )}
        </AnimatePresence>

        {/* Corner brackets */}
        {inFrame && [
          { top: "calc(50% - 35vh)", left: "10%", bt: "2px solid", bl: "2px solid" },
          { top: "calc(50% - 35vh)", right: "10%", bt: "2px solid", br: "2px solid" },
          { bottom: "calc(50% - 35vh)", left: "10%", bb: "2px solid", bl: "2px solid" },
          { bottom: "calc(50% - 35vh)", right: "10%", bb: "2px solid", br: "2px solid" },
        ].map((c, i) => (
          <motion.div
            key={`corner-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.48, duration: 0.15 }}
            className="absolute w-5 h-5"
            style={{
              top: c.top, bottom: c.bottom, left: c.left, right: c.right,
              borderTop: c.bt, borderLeft: c.bl, borderRight: c.br, borderBottom: c.bb,
              borderColor: "rgba(0,212,170,0.9)",
            }}
          />
        ))}

        {/* Side data streams */}
        <AnimatePresence>
          {inText && !inName && (
            <>
              <motion.div
                key="left-data"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute text-left"
                style={{ left: "12%", top: "50%", transform: "translateY(-50%)" }}
              >
                {["ALT: 35,000 FT", "SPD: 480 KTS", "HDG: 274°", "LAT: 33.68°N", "LON: 73.04°E"].map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 0.45, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.2 }}
                    className="text-xs font-mono leading-7 tracking-widest"
                    style={{ color: "rgba(0,212,170,0.7)" }}
                  >
                    {line}
                  </motion.p>
                ))}
              </motion.div>

              <motion.div
                key="right-data"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute text-right"
                style={{ right: "12%", top: "50%", transform: "translateY(-50%)" }}
              >
                {["SYS: NOMINAL", "AUTH: LVL 5", "CLEAR: ACTIVE", "EFB: ONLINE", "COMM: SECURE"].map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 0.45, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.2 }}
                    className="text-xs font-mono leading-7 tracking-widest"
                    style={{ color: "rgba(0,212,170,0.7)" }}
                  >
                    {line}
                  </motion.p>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Typing text center */}
        <AnimatePresence>
          {inText && !inName && (
            <motion.div
              key="center-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute text-center select-none px-4"
            >
              <p className="text-xs tracking-[0.45em] font-mono mb-3 min-h-[1rem]"
                style={{ color: "rgba(0,212,170,0.7)" }}>
                {typed1}<span className="animate-pulse">{typed1.length < 16 ? "_" : ""}</span>
              </p>
              <div className="h-px w-56 mx-auto mb-4" style={{ background: "rgba(0,212,170,0.3)" }} />
              <p className="text-base font-[Orbitron] tracking-widest text-white mb-2 min-h-[1.5rem]">
                {typed2}<span className="animate-pulse text-primary">{typed2.length > 0 && typed2.length < pilotLine.length ? "_" : ""}</span>
              </p>
              <p className="text-xs tracking-[0.35em] font-mono min-h-[1rem]"
                style={{ color: "rgba(0,212,170,0.55)" }}>
                {typed3}<span className="animate-pulse">{typed3.length > 0 && typed3.length < 18 ? "_" : ""}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Name reveal */}
        <AnimatePresence>
          {inName && (
            <motion.div
              key="name-reveal"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, type: "spring", stiffness: 200, damping: 20 }}
              className="absolute text-center select-none"
            >
              <div
                className="absolute inset-0 pointer-events-none -z-10"
                style={{
                  background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0,212,170,0.07) 0%, transparent 70%)",
                  transform: "scale(3)",
                }}
              />
              <motion.p
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                className="text-sm tracking-[0.6em] font-mono mb-3 uppercase"
                style={{ color: "rgba(0,212,170,0.6)" }}
              >
                Welcome
              </motion.p>
              <h1
                className="font-[Orbitron] font-bold"
                style={{
                  fontSize: "clamp(2rem, 5.5vw, 4.5rem)",
                  color: "#00d4aa",
                  textShadow: "0 0 30px rgba(0,212,170,0.6), 0 0 70px rgba(0,212,170,0.25)",
                  letterSpacing: "0.05em",
                }}
              >
                {displayName}
              </h1>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="h-px mt-4 mx-auto w-48 origin-center"
                style={{ background: "linear-gradient(to right, transparent, rgba(0,212,170,0.8), transparent)" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Implode flash */}
      <AnimatePresence>
        {imploding && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 0.35, times: [0, 0.25, 1] }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: "rgba(0,212,170,0.12)" }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WelcomeAnimation;