/**
 * Centralized state management for 3D visualizer
 */

import { useState, useCallback, useRef, useEffect } from 'react';

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

export function useVisualizerState(totalFrames: number, duration: number) {
  const [state, setState] = useState<VisualizerState>({
    isPlaying: false,
    currentTime: 0,
    playbackSpeed: 1.0,
    currentFrameIndex: 0,
    totalFrames,
    duration,
  });

  const [settings, setSettings] = useState<VisualizerSettings>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('trajectoryVisualizerSettings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('trajectoryVisualizerSettings', JSON.stringify(settings));
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
    const clampedTime = Math.max(0, Math.min(time, duration));
    const frameIndex = Math.floor((clampedTime / duration) * (totalFrames - 1));
    setState((prev) => ({
      ...prev,
      currentTime: clampedTime,
      currentFrameIndex: frameIndex,
    }));
  }, [duration, totalFrames]);

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
        const newTime = Math.min(prev.currentTime + delta * prev.playbackSpeed, duration);
        const newFrameIndex = Math.floor((newTime / duration) * (totalFrames - 1));

        if (newTime >= duration) {
          // Reached end
          return {
            ...prev,
            isPlaying: false,
            currentTime: duration,
            currentFrameIndex: totalFrames - 1,
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
  }, [state.isPlaying, duration, totalFrames]);

  const updateSetting = useCallback(<K extends keyof VisualizerSettings>(
    key: K,
    value: VisualizerSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

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
