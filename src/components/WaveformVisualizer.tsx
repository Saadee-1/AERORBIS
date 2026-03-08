import React from 'react';
import { motion } from 'framer-motion';

interface WaveformVisualizerProps {
  audioLevel: number;
  duration: number;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ audioLevel, duration }) => {
  const bars = 20;
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center justify-center gap-1 h-16 px-4">
      {Array.from({ length: bars }).map((_, index) => {
        // Create a wave pattern based on index
        const delay = index * 0.05;
        const baseHeight = 20;
        const maxHeight = 60;
        
        // Calculate height based on audio level and position in wave
        const waveEffect = Math.sin((index / bars) * Math.PI) * 0.5 + 0.5;
        const height = baseHeight + (maxHeight - baseHeight) * audioLevel * waveEffect;
        
        return (
          <motion.div
            key={index}
            className="w-1 bg-gradient-to-t from-primary to-emerald-400 rounded-full"
            animate={{
              height: `${height}%`,
            }}
            transition={{
              duration: 0.15,
              delay: delay,
              ease: 'easeOut',
            }}
            style={{
              boxShadow: audioLevel > 0.3 ? '0 0 10px rgba(34, 211, 238, 0.6)' : 'none',
            }}
          />
        );
      })}
      </div>
      <div className="text-center">
        <span className="text-sm font-mono text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
};

export default WaveformVisualizer;
