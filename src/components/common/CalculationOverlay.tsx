/**
 * CalculationOverlay - Futuristic sci-fi animation overlay
 * shown during tool calculations. Features spinning rings,
 * data streams, and progress indicators.
 */

import { motion, AnimatePresence } from "framer-motion";

interface CalculationOverlayProps {
  isActive: boolean;
  label?: string;
  progress?: number; // 0-100, optional
}

export function CalculationOverlay({ isActive, label = "Computing", progress }: CalculationOverlayProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* Content */}
          <div className="relative flex flex-col items-center gap-6">
            
            {/* Spinning Rings */}
            <div className="relative w-40 h-40">
              {/* Outer ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                style={{ borderTopColor: 'hsl(160 84% 39% / 0.8)', borderRightColor: 'hsl(160 84% 39% / 0.4)' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Middle ring - counter-rotating */}
              <motion.div
                className="absolute inset-3 rounded-full border-2 border-info/20"
                style={{ borderBottomColor: 'hsl(200 80% 55% / 0.7)', borderLeftColor: 'hsl(200 80% 55% / 0.3)' }}
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />

              {/* Inner ring */}
              <motion.div
                className="absolute inset-6 rounded-full border border-primary/20"
                style={{ borderTopColor: 'hsl(185 85% 50% / 0.6)' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />

              {/* Inner pulsing core */}
              <motion.div
                className="absolute inset-10 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center"
                animate={{
                  boxShadow: [
                    '0 0 0px hsl(185 85% 50% / 0)',
                    '0 0 30px hsl(185 85% 50% / 0.3)',
                    '0 0 0px hsl(185 85% 50% / 0)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Center dot */}
                <motion.div
                  className="w-3 h-3 rounded-full bg-primary"
                  animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>

              {/* Orbiting particles */}
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(160_84%_39%/0.8)]"
                  style={{
                    top: '50%',
                    left: '50%',
                    marginTop: '-3px',
                    marginLeft: '-3px',
                  }}
                  animate={{
                    x: [
                      Math.cos((i * Math.PI) / 2) * 60,
                      Math.cos((i * Math.PI) / 2 + Math.PI / 2) * 60,
                      Math.cos((i * Math.PI) / 2 + Math.PI) * 60,
                      Math.cos((i * Math.PI) / 2 + (3 * Math.PI) / 2) * 60,
                      Math.cos((i * Math.PI) / 2 + 2 * Math.PI) * 60,
                    ],
                    y: [
                      Math.sin((i * Math.PI) / 2) * 60,
                      Math.sin((i * Math.PI) / 2 + Math.PI / 2) * 60,
                      Math.sin((i * Math.PI) / 2 + Math.PI) * 60,
                      Math.sin((i * Math.PI) / 2 + (3 * Math.PI) / 2) * 60,
                      Math.sin((i * Math.PI) / 2 + 2 * Math.PI) * 60,
                    ],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>

            {/* Data stream lines */}
            <div className="flex gap-1 h-8 items-end">
              {[...Array(24)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full bg-primary/40"
                  animate={{
                    height: [4, Math.random() * 28 + 4, 4],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{
                    duration: 0.6 + Math.random() * 0.8,
                    repeat: Infinity,
                    delay: i * 0.05,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            {/* Label */}
            <div className="text-center">
              <motion.p
                className="text-sm text-primary font-semibold tracking-[0.3em] uppercase"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {label}
              </motion.p>

              {/* Scrolling hex data */}
              <motion.p
                className="text-[9px] text-primary/30 tracking-[0.2em] mt-1 font-mono"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >
                0x4AE2 · 0xB7F1 · 0x9C03
              </motion.p>
            </div>

            {/* Progress bar (if provided) */}
            {progress !== undefined && (
              <div className="w-48">
                <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-info rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-[9px] text-primary/50 text-center mt-1 tracking-[0.2em]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {Math.round(progress)}%
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
