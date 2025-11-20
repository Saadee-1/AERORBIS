/**
 * Main 3D Visualizer Component
 * Cinematic trajectory visualization
 */

"use client";

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TrajectoryData, convertSimulationToTrajectoryData, extractEventMarkers, downsampleFrames } from '../../utils/three/threeUtils';
import { useVisualizerState, VisualizerSettings } from './useVisualizerState';
import { EarthScene } from './EarthScene';
import { RocketModel } from './RocketModel';
import { TrajectoryPath } from './TrajectoryPath';
import { Markers } from './Markers';
import { CameraController } from './CameraController';
import { EffectsStack } from './EffectsStack';
import { TimelineController } from './TimelineController';
import { ControlsOverlay } from './ControlsOverlay';
import { useExportSnapshot } from './ExportSnapshot';
import { Planet } from '../../data/planets';

interface ThreeDVisualizerProps {
  trajectoryData?: TrajectoryData;
  planet: Planet;
  result?: any;
  mode: '1D' | '2D' | '3D';
  onSnapshot?: (base64: string) => void;
}

function VisualizerScene({
  trajectoryData,
  planet,
  settings,
  currentFrameIndex,
  onMarkerClick,
  onUpdateSetting,
  onScreenshot,
}: {
  trajectoryData?: TrajectoryData;
  planet: Planet;
  settings: VisualizerSettings;
  currentFrameIndex: number;
  onMarkerClick: (marker: any) => void;
  onUpdateSetting: <K extends keyof VisualizerSettings>(
    key: K,
    value: VisualizerSettings[K]
  ) => void;
  onScreenshot: () => void;
}) {
  const { captureScreenshot } = useExportSnapshot();

  const handleScreenshot = async () => {
    const base64 = await captureScreenshot();
    onScreenshot();
    return base64;
  };

  const currentFrame = useMemo(() => {
    if (!trajectoryData || trajectoryData.frames.length === 0) return undefined;
    return trajectoryData.frames[Math.min(currentFrameIndex, trajectoryData.frames.length - 1)];
  }, [trajectoryData, currentFrameIndex]);

  const markers = useMemo(() => {
    if (!trajectoryData) return [];
    return extractEventMarkers(trajectoryData.frames);
  }, [trajectoryData]);

  const downsampledFrames = useMemo(() => {
    if (!trajectoryData) return [];
    return downsampleFrames(trajectoryData.frames, 1000);
  }, [trajectoryData]);

  const handleScreenshot = () => {
    captureScreenshot().then((base64) => {
      onScreenshot();
      // Could trigger download or pass to parent
    });
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {/* Earth */}
      {settings.showEarth && (
        <EarthScene
          radius={planet.radius / 1000} // Scale down for visualization
          showAtmosphere={settings.showAtmosphere}
          showClouds={settings.showClouds}
          simpleMode={settings.simpleMode}
        />
      )}

      {/* Trajectory Path */}
      {settings.showTrajectory && (
        <TrajectoryPath
          frames={downsampledFrames}
          showPath={settings.showTrajectory}
        />
      )}

      {/* Markers */}
      <Markers
        markers={markers}
        showMarkers={settings.showMarkers}
        onMarkerClick={onMarkerClick}
      />

      {/* Rocket */}
      {currentFrame && (
        <RocketModel
          position={currentFrame.pos.map((p) => p / 1000) as [number, number, number]} // Scale down
          rotation={currentFrame.attitude}
          showExhaust={settings.showExhaust}
          thrustLevel={currentFrame.mass ? 1.0 : 0}
        />
      )}

      {/* Camera */}
      <CameraController
        mode={settings.cameraMode}
        currentFrame={currentFrame}
        enabled={settings.cameraMode !== 'free'}
      />

      {/* Free camera controls */}
      {settings.cameraMode === 'free' && (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={100}
        />
      )}

      {/* Effects */}
      <EffectsStack settings={settings} />
    </>
  );
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

export function ThreeDVisualizer({
  trajectoryData,
  planet,
  result,
  mode,
  onSnapshot,
}: ThreeDVisualizerProps) {
  // Convert result to trajectory data if not provided
  const data = useMemo(() => {
    if (trajectoryData) return trajectoryData;
    if (result) {
      return convertSimulationToTrajectoryData(result, mode, planet);
    }
    return undefined;
  }, [trajectoryData, result, mode, planet]);

  const totalFrames = data?.frames.length || 0;
  const duration = data?.frames.length > 0
    ? data.frames[data.frames.length - 1].t
    : 0;

  const {
    state,
    settings,
    play,
    pause,
    setTime,
    setSpeed,
    jumpToEvent,
    updateSetting,
  } = useVisualizerState(totalFrames, duration);

  if (!data || data.frames.length === 0) {
    return (
      <div className="h-[600px] w-full bg-slate-900 rounded-lg flex items-center justify-center text-gray-400">
        <p>Run a simulation to see 3D visualization</p>
      </div>
    );
  }

  const handleScreenshot = async () => {
    // Screenshot functionality - would need to be called from within Canvas context
    // For now, just trigger the callback
    onSnapshot?.('');
  };

  return (
    <div className="relative h-[600px] w-full bg-slate-900 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }} // For screenshots
      >
        <Suspense fallback={null}>
          <VisualizerScene
            trajectoryData={data}
            planet={planet}
            settings={settings}
            currentFrameIndex={state.currentFrameIndex}
            onMarkerClick={(marker) => jumpToEvent(marker.t)}
            onUpdateSetting={updateSetting}
            onScreenshot={handleScreenshot}
          />
        </Suspense>
      </Canvas>

      {/* Controls Overlay */}
      <ControlsOverlay
        settings={settings}
        onUpdateSetting={updateSetting}
        onScreenshot={handleScreenshot}
      />

      {/* Timeline Controller */}
      <TimelineController
        isPlaying={state.isPlaying}
        currentTime={state.currentTime}
        duration={duration}
        playbackSpeed={state.playbackSpeed}
        onPlay={play}
        onPause={pause}
        onSetTime={setTime}
        onSetSpeed={setSpeed}
        onStepForward={() => {
          const nextTime = Math.min(state.currentTime + 1, duration);
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
  );
}
