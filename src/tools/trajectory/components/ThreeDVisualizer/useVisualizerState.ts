/**
 * Centralized state management for 3D visualizer
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { isDevEnv } from '@/lib/env';

export interface VisualizerState {
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  currentFrameIndex: number;
  totalFrames: number;
  duration: number;
}

export interface VisualizerSettings {
  showEarth: boolean;
  showAtmosphere: boolean;
  showClouds: boolean;
  showTrajectory: boolean;
  showMarkers: boolean;
  showStaging: boolean;
  showExhaust: boolean;
  showBloom: boolean;
  showDOF: boolean;
  showMotionBlur: boolean;
  simpleMode: boolean;
  lowPowerMode: boolean;
  cameraMode: 'follow' | 'chase' | 'ground' | 'orbital' | 'free' | 'cinematic';
}

const DEFAULT_SETTINGS: VisualizerSettings = {
  showEarth: true,
  showAtmosphere: true,
  showClouds: true,
  showTrajectory: true,
  showMarkers: true,
  showStaging: true,
  showExhaust: true,
  showBloom: false,
  showDOF: false,
  showMotionBlur: false,
  simpleMode: false,
  lowPowerMode: false,
  cameraMode: 'follow',
};

const clampFrameIndex = (index: number, frames: number): number => {
  if (!Number.isFinite(frames) || frames <= 0) return 0;
  return Math.min(Math.max(Math.floor(index), 0), frames - 1);
};

const computeFrameIndexFromTime = (time: number, frames: number, duration: number): number => {
  if (!Number.isFinite(time)) return 0;
  if (!Number.isFinite(frames) || frames <= 1) return 0;
  if (!Number.isFinite(duration) || duration <= 0) {
    return clampFrameIndex(time, frames);
  }
  return clampFrameIndex((time / duration) * (frames - 1), frames);
};

export function useVisualizerState(inputTotalFrames: number, inputDuration: number) {
  const safeTotalFrames = Number.isFinite(inputTotalFrames) ? Math.max(0, inputTotalFrames) : 0;
  const safeDuration = Number.isFinite(inputDuration) ? Math.max(0, inputDuration) : 0;

  const [state, setState] = useState<VisualizerState>({
    isPlaying: false,
    currentTime: 0,
    playbackSpeed: 1.0,
    currentFrameIndex: 0,
    totalFrames: safeTotalFrames,
    duration: safeDuration,
  });

  const [settings, setSettings] = useState<VisualizerSettings>(() => {
    // Load from localStorage (only in browser)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trajectoryVisualizerSettings');
      if (saved) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_SETTINGS;
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Save settings to localStorage (only in browser)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trajectoryVisualizerSettings', JSON.stringify(settings));
    }
  }, [settings]);

    const play = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
    lastTimeRef.current = performance.now();
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

    const setTime = useCallback((time: number) => {
      setState((prev) => {
        const nextDuration = Math.max(0, prev.duration);
        const nextFrames = Math.max(0, prev.totalFrames);
        const clampedTime = Math.max(0, Math.min(time, nextDuration > 0 ? nextDuration : time));
        const nextFrameIndex = computeFrameIndexFromTime(clampedTime, nextFrames, nextDuration);
        return {
          ...prev,
          currentTime: clampedTime,
          currentFrameIndex: nextFrameIndex,
        };
      });
    }, []);

  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const jumpToEvent = useCallback((eventTime: number) => {
    setTime(eventTime);
    pause();
  }, [setTime, pause]);

  // Animation loop
  useEffect(() => {
    if (!state.isPlaying) {
      return;
    }

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = currentTime;

        setState((prev) => {
          const nextDuration = Math.max(0, prev.duration);
          const nextFrames = Math.max(0, prev.totalFrames);
          const newTime = Math.min(prev.currentTime + delta * prev.playbackSpeed, nextDuration || prev.currentTime + delta);
          const newFrameIndex = computeFrameIndexFromTime(newTime, nextFrames, nextDuration);

          if (nextDuration > 0 && newTime >= nextDuration) {
          // Reached end
          return {
            ...prev,
            isPlaying: false,
              currentTime: nextDuration,
              currentFrameIndex: nextFrames > 0 ? nextFrames - 1 : 0,
          };
        }

        return {
          ...prev,
          currentTime: newTime,
          currentFrameIndex: newFrameIndex,
        };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    }, [state.isPlaying]);

    const updateSetting = useCallback(<K extends keyof VisualizerSettings>(
    key: K,
    value: VisualizerSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

    // Keep derived totals in sync with upstream values
    useEffect(() => {
      setState((prev) => {
        const nextFrames = Number.isFinite(inputTotalFrames) ? Math.max(0, inputTotalFrames) : 0;
        const nextDuration = Number.isFinite(inputDuration) ? Math.max(0, inputDuration) : 0;
        return {
          ...prev,
          totalFrames: nextFrames,
          duration: nextDuration,
          currentFrameIndex: clampFrameIndex(prev.currentFrameIndex, nextFrames),
          currentTime: Math.max(0, Math.min(prev.currentTime, nextDuration || prev.currentTime)),
        };
      });
    }, [inputTotalFrames, inputDuration]);

    useEffect(() => {
      if (!isDevEnv()) {
        return;
      }
      console.debug('VisualizerState: OK', {
        totalFrames: state.totalFrames,
        duration: state.duration,
        currentFrameIndex: state.currentFrameIndex,
        currentTime: state.currentTime,
        isPlaying: state.isPlaying,
      });
    }, [state]);

  return {
    state,
    settings,
    play,
    pause,
    setTime,
    setSpeed,
    jumpToEvent,
    updateSetting,
  };
}
