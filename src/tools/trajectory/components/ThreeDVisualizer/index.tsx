/**
 * Main 3D Visualizer Component
 * Cinematic trajectory visualization
 */

"use client";

import { Suspense, useMemo, memo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { TrajectoryData } from '../../utils/three/threeUtils';
import { convertSimulationToTrajectoryData } from '../../utils/convertSimulationToTrajectoryData';
import { useVisualizerState } from './useVisualizerState';
import { TimelineController } from './TimelineController';
import { ControlsOverlay } from './ControlsOverlay';
import { Planet } from '../../data/planets';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { isDevEnv, isVisualizerDebug } from '@/lib/env';
import { VisualizerScene } from './VisualizerScene';

interface ThreeDVisualizerProps {
  trajectoryData?: TrajectoryData;
  planet: Planet;
  result?: any;
  mode: '1D' | '2D' | '3D';
  onSnapshot?: (base64: string) => void;
}

// Export snapshot function for external use
export async function exportVisualizerSnapshot(canvasElement: HTMLCanvasElement): Promise<string> {
  try {
    return canvasElement.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to export snapshot:', error);
    return '';
  }
}

const DEBUG_VIS = isVisualizerDebug();
const IS_DEV = isDevEnv();

const SuspenseFallback = () => {
  useEffect(() => {
    if (IS_DEV) {
      console.debug('ThreeDVisualizer suspense fallback active');
    }
  }, []);
  return <group />;
};

const Placeholder = ({
  reason,
  details,
}: {
  reason: string;
  details?: Record<string, unknown>;
}) => (
  <ErrorBoundary toolName="3D Trajectory Visualizer">
    <div className="relative w-full min-h-[600px] bg-slate-900 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-gray-400 p-6">
      <p>Run a simulation to see the 3D visualization.</p>
      {IS_DEV && (
        <pre className="mt-4 max-w-full overflow-auto text-xs text-left bg-slate-950/60 text-cyan-300 p-3 rounded border border-cyan-400/20">
          {JSON.stringify({ reason, ...details }, null, 2)}
        </pre>
      )}
    </div>
  </ErrorBoundary>
);

export const ThreeDVisualizer = memo(function ThreeDVisualizer({
  trajectoryData,
  planet,
  result,
  mode,
  onSnapshot,
}: ThreeDVisualizerProps) {
  const [sceneReady, setSceneReady] = useState(false);
  const [canvasMounted, setCanvasMounted] = useState(false);
  const [lastSceneError, setLastSceneError] = useState<Error | null>(null);

  const data = useMemo(() => {
    if (trajectoryData) return trajectoryData;
    if (result) {
      return convertSimulationToTrajectoryData(result, mode, planet);
    }
    return undefined;
  }, [trajectoryData, result, mode, planet]);

  useEffect(() => {
    setSceneReady(false);
    setLastSceneError(null);
  }, [data]);

  const totalFrames = data?.frames.length ?? 0;
  const durationFromData = data?.frames.length ? data.frames[data.frames.length - 1].t : 0;
  const sanitizedDuration = Number.isFinite(durationFromData) ? Math.max(durationFromData, 0) : 0;

  const {
    state,
    settings,
    play,
    pause,
    setTime,
    setSpeed,
    jumpToEvent,
    updateSetting,
  } = useVisualizerState(totalFrames, sanitizedDuration);

  useEffect(() => {
    if (IS_DEV) {
      console.debug('ThreeDVisualizer data summary', {
        frames: totalFrames,
        duration: sanitizedDuration,
        firstFrame: data?.frames[0],
      });
    }
  }, [data, totalFrames, sanitizedDuration]);

    if (!data || totalFrames === 0) {
      if (IS_DEV) {
      console.warn('ThreeDVisualizer returning placeholder', {
        hasData: Boolean(data),
        frames: totalFrames,
      });
    }
    return <Placeholder reason={!data ? 'no-data' : 'empty-frames'} details={{ frames: totalFrames }} />;
  }

  const timelineDuration = Math.max(state.duration, sanitizedDuration, 0.0001);

  const renderCanvas = () => {
    try {
      return (
        <Canvas
          camera={{ position: [0, 0, 10], fov: 50 }}
          gl={{ preserveDrawingBuffer: true }}
          onCreated={() => {
            setCanvasMounted(true);
            if (IS_DEV) {
              console.debug('3D Canvas mounted');
            }
          }}
        >
          <Suspense fallback={<SuspenseFallback />}>
            <VisualizerScene
              trajectoryData={data}
              planet={planet}
              settings={settings}
              currentFrameIndex={state.currentFrameIndex}
              onMarkerClick={(marker) => jumpToEvent(marker.t)}
              onSceneError={(error) => {
                setLastSceneError(error);
              }}
              onSceneReady={() => {
                setSceneReady(true);
                setLastSceneError(null);
              }}
            />
          </Suspense>
        </Canvas>
      );
    } catch (error) {
      console.error('ThreeDVisualizer Canvas mount failed', error);
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/40 text-red-200">
          Canvas initialization failed: {(error as Error)?.message ?? 'Unknown error'}
        </div>
      );
    }
  };

  return (
    <ErrorBoundary toolName="3D Trajectory Visualizer">
      <div className="relative w-full min-h-[600px] bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
        <div className="absolute inset-0">{renderCanvas()}</div>

        {!sceneReady && !lastSceneError && (
          <div className="absolute inset-0 flex items-center justify-center text-cyan-200 text-sm bg-slate-900/40 backdrop-blur-sm pointer-events-none">
            Initializing 3D scene...
          </div>
        )}

        {lastSceneError && (
          <div className="absolute inset-0 flex items-center justify-center text-red-200 text-sm bg-red-900/30 backdrop-blur-sm p-4 text-center">
            3D scene error: {lastSceneError.message}
          </div>
        )}

        {DEBUG_VIS && (
          <div className="absolute top-3 left-3 z-20 text-xs bg-slate-950/80 text-cyan-200 px-3 py-2 rounded shadow-lg space-y-0.5">
            <div>frames: {totalFrames}</div>
            <div>duration: {timelineDuration.toFixed(2)}s</div>
            <div>frame index: {state.currentFrameIndex}</div>
            <div>canvas: {canvasMounted ? 'mounted' : 'pending'}</div>
            <div>scene ready: {sceneReady ? 'yes' : 'no'}</div>
            <div>error: {lastSceneError?.message ?? 'none'}</div>
          </div>
        )}

        <ControlsOverlay
          settings={settings}
          onUpdateSetting={updateSetting}
          onScreenshot={() => onSnapshot?.('')}
        />

        <TimelineController
          isPlaying={state.isPlaying}
          currentTime={state.currentTime}
          duration={timelineDuration}
          playbackSpeed={state.playbackSpeed}
          onPlay={play}
          onPause={pause}
          onSetTime={setTime}
          onSetSpeed={setSpeed}
          onStepForward={() => {
            const nextTime = Math.min(state.currentTime + 1, timelineDuration);
            setTime(nextTime);
          }}
          onStepBack={() => {
            const prevTime = Math.max(state.currentTime - 1, 0);
            setTime(prevTime);
          }}
          onReset={() => {
            setTime(0);
            pause();
          }}
        />
      </div>
    </ErrorBoundary>
  );
});
