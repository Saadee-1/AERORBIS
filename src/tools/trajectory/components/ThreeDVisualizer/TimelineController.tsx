/**
 * Timeline Controller Component
 * Playback controls UI overlay
 */

import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineControllerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onSetTime: (time: number) => void;
  onSetSpeed: (speed: number) => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
}

export function TimelineController({
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  onPlay,
  onPause,
  onSetTime,
  onSetSpeed,
  onStepForward,
  onStepBack,
  onReset,
}: TimelineControllerProps) {
  const safeDuration = Math.max(duration, 0.0001);
  const safeCurrentTime = Math.max(0, Math.min(currentTime, safeDuration));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speedOptions = [0.25, 0.5, 1, 2, 5];

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-lg border border-primary/30 rounded-lg p-4 min-w-[600px]">
      <div className="flex items-center gap-4">
        {/* Playback controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-primary hover:text-primary/80"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onStepBack}
            className="text-primary hover:text-primary/80"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={isPlaying ? onPause : onPlay}
            className="text-primary hover:text-primary/80"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onStepForward}
            className="text-primary hover:text-primary/80"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Time display */}
          <div className="text-sm text-primary font-mono min-w-[120px]">
            {formatTime(safeCurrentTime)} / {formatTime(safeDuration)}
        </div>

        {/* Scrubber */}
        <div className="flex-1">
            <input
            type="range"
            min="0"
              max={safeDuration}
              value={safeCurrentTime}
            step={0.1}
            onChange={(e) => onSetTime(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => onSetSpeed(parseFloat(e.target.value))}
            className="bg-slate-700/50 border border-primary/30 rounded px-2 py-1 text-sm text-primary"
          >
            {speedOptions.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
