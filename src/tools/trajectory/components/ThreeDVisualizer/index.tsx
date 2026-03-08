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
  result?: unknown;
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
        <pre className="mt-4 max-w-full overflow-auto text-xs text-left bg-slate-950/60 text-primary p-3 rounded border border-primary/20">
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

    // Sanity check: no frames to visualize
    if (!data || totalFrames === 0) {
      if (IS_DEV) {
        console.debug('3D Visualizer: no frames', {
          hasData: Boolean(data),
          frames: totalFrames,
          reason: !data ? 'no-data' : 'empty-frames',
        });
      }
      return <Placeholder reason={!data ? 'no-data' : 'empty-frames'} details={{ frames: totalFrames }} />;
    }

  const timelineDuration = Math.max(state.duration, sanitizedDuration, 0.0001);

  const renderCanvas = () => {
    try {
      if (IS_DEV) {
        console.debug('3D Canvas init start', {
          hasData: Boolean(data),
          frames: totalFrames,
          mode,
          planetId: planet?.id,
        });
      }

      return (
        <Canvas
          camera={{ position: [0, 2, 12], fov: 45 }}
          gl={{ preserveDrawingBuffer: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          shadows={!settings.simpleMode}
          onCreated={({ gl, scene, camera }) => {
            try {
              // Check WebGL context availability
              const canvas = gl.domElement;
              if (!canvas) {
                const error = new Error('Canvas element missing');
                console.error('3D Visualizer error', error, { location: 'Canvas/onCreated' });
                setLastSceneError(error);
                return;
              }

              // Get WebGL context from canvas
              const context = canvas.getContext('webgl') || canvas.getContext('webgl2');
              if (!context) {
                const error = new Error('WebGL not available in this browser/device');
                console.error('3D Visualizer error', error, { location: 'Canvas/onCreated' });
                setLastSceneError(error);
                return;
              }

              // Log WebGL info in dev mode
              if (IS_DEV) {
                const vendor = context.getParameter(context.VENDOR);
                const renderer = context.getParameter(context.RENDERER);
                console.debug('3D Canvas WebGL info', {
                  vendor: typeof vendor === 'string' ? vendor : 'unknown',
                  renderer: typeof renderer === 'string' ? renderer : 'unknown',
                  canvasWidth: canvas.clientWidth,
                  canvasHeight: canvas.clientHeight,
                });
              }

              setCanvasMounted(true);
              if (IS_DEV) {
                console.debug('3D Canvas mounted', {
                  canvasWidth: canvas.clientWidth,
                  canvasHeight: canvas.clientHeight,
                });
              }
            } catch (error) {
              console.error('3D Visualizer error', error, { location: 'Canvas/onCreated' });
              setLastSceneError(error instanceof Error ? error : new Error(String(error)));
            }
          }}
          onError={(error) => {
            console.error('3D Visualizer Canvas error', error, { location: 'Canvas/onError' });
            setLastSceneError(error instanceof Error ? error : new Error(String(error)));
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
                if (IS_DEV) {
                  console.error('3D Visualizer scene error', error, { location: 'VisualizerScene' });
                }
                setLastSceneError(error);
              }}
              onSceneReady={() => {
                if (IS_DEV) {
                  console.debug('3D Visualizer: scene ready', {
                    frames: totalFrames,
                    totalFrames: totalFrames,
                    duration: sanitizedDuration,
                  });
                }
                setSceneReady(true);
                setLastSceneError(null);
              }}
            />
          </Suspense>
        </Canvas>
      );
    } catch (error) {
      console.error('3D Visualizer error', error, { location: 'ThreeDVisualizer/renderCanvas' });
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastSceneError(error instanceof Error ? error : new Error(errorMessage));
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/60 text-red-200 p-4 text-center z-50">
          <div>
            <p className="text-lg font-semibold mb-2">Unable to initialize 3D visualization</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        </div>
      );
    }
  };

  return (
    <ErrorBoundary toolName="3D Trajectory Visualizer">
      <div className="relative w-full min-h-[600px] bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
        <div className="absolute inset-0">{renderCanvas()}</div>

        {!sceneReady && !lastSceneError && (
          <div className="absolute inset-0 flex items-center justify-center text-primary/80 text-sm bg-slate-900/40 backdrop-blur-sm pointer-events-none z-40">
            Initializing 3D scene...
          </div>
        )}

        {lastSceneError && (
          <div className="absolute inset-0 flex items-center justify-center text-red-300 bg-black/60 backdrop-blur-sm p-6 text-center z-50 min-h-[360px]">
            <div>
              <p className="text-lg font-semibold mb-2 text-red-200">Unable to initialize 3D visualization</p>
              <p className="text-sm text-red-300">{lastSceneError.message}</p>
              {IS_DEV && lastSceneError.stack && (
                <pre className="mt-4 text-xs text-left bg-red-950/40 text-red-200 p-3 rounded border border-red-500/30 max-w-2xl overflow-auto">
                  {lastSceneError.stack}
                </pre>
              )}
            </div>
          </div>
        )}

        {DEBUG_VIS && (
          <div className="absolute top-3 left-3 z-20 text-xs bg-slate-950/80 text-primary/80 px-3 py-2 rounded shadow-lg space-y-0.5">
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
