/**
 * Visualizer Scene - Cinematic Edition
 * Enhanced lighting and composition
 */

import { memo, useCallback, useEffect, useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { TrajectoryData, extractEventMarkers, downsampleFrames } from '../../utils/three/threeUtils';
import { VisualizerSettings } from './useVisualizerState';
import { Planet } from '../../data/planets';
import { EarthScene } from './EarthScene';
import { RocketModel } from './RocketModel';
import { TrajectoryPath } from './TrajectoryPath';
import { Markers } from './Markers';
import { CameraController } from './CameraController';
import { EffectsStack } from './EffectsStack';
import { isDevEnv } from '@/lib/env';

interface VisualizerSceneProps {
  trajectoryData: TrajectoryData;
  planet: Planet;
  settings: VisualizerSettings;
  currentFrameIndex: number;
  onMarkerClick: (marker: { t: number }) => void;
  onSceneError?: (error: Error) => void;
  onSceneReady?: () => void;
}

const IS_DEV = isDevEnv();

export const VisualizerScene = memo(function VisualizerScene({
  trajectoryData,
  planet,
  settings,
  currentFrameIndex,
  onMarkerClick,
  onSceneError,
  onSceneReady,
}: VisualizerSceneProps) {
  const { gl } = useThree();
  const frames = trajectoryData?.frames ?? [];

  useEffect(() => {
    if (!gl?.domElement) {
      if (IS_DEV) {
        console.debug('3D Visualizer: gl or domElement missing', { hasGl: !!gl, hasDomElement: !!gl?.domElement });
      }
      return;
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault?.();
      const error = new Error('WebGL context lost');
      console.error('3D Visualizer error', error, { location: 'VisualizerScene/webglcontextlost' });
      onSceneError?.(error);
    };

    const handleContextRestored = () => {
      if (IS_DEV) {
        console.debug('3D Visualizer: WebGL context restored');
      }
    };

    gl.domElement.addEventListener('webglcontextlost', handleContextLost as EventListener);
    gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', handleContextLost as EventListener);
      gl.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, onSceneError]);

  useEffect(() => {
    if (IS_DEV) {
      console.debug('TrajectoryConvert: frames=', frames.length, {
        mode: trajectoryData?.metadata?.coordFrame,
        planetId: trajectoryData?.metadata?.planet,
        firstFrame: frames[0],
        lastFrame: frames[frames.length - 1],
      });
    }

    if (frames.length === 0) {
      const error = new Error('No trajectory frames to visualize');
      if (IS_DEV) {
        console.debug('3D Visualizer: no frames');
      }
      onSceneError?.(error);
      return;
    }

    const invalidFrame = frames.find(
      (frame) =>
        !Number.isFinite(frame.t) ||
        !Number.isFinite(frame.x) ||
        !Number.isFinite(frame.y) ||
        !Number.isFinite(frame.z),
    );

    if (invalidFrame) {
      const error = new Error('Visualizer data contains invalid values');
      console.error('3D Visualizer error', error, { location: 'VisualizerScene/frameValidation', invalidFrame });
      onSceneError?.(error);
    } else {
      if (IS_DEV) {
        console.debug('VisualizerScene self-test OK', {
          frames: frames.length,
          duration: frames[frames.length - 1]?.t ?? 0,
        });
      }
      onSceneReady?.();
    }
  }, [frames, trajectoryData, onSceneError, onSceneReady]);

  const currentFrame = useMemo(() => {
    if (frames.length === 0) return undefined;
    return frames[Math.min(currentFrameIndex, frames.length - 1)];
  }, [frames, currentFrameIndex]);

  const markers = useMemo(() => extractEventMarkers(frames), [frames]);

  const downsampledFrames = useMemo(() => {
    const maxFrames = settings.simpleMode || settings.lowPowerMode ? 500 : 1500;
    return downsampleFrames(frames, maxFrames);
  }, [frames, settings.simpleMode, settings.lowPowerMode]);

  const handleMarkerClick = useCallback(
    (marker: { t: number }) => {
      try {
        onMarkerClick(marker);
      } catch (error) {
        console.error('Marker click handler failed', error);
        onSceneError?.(error as Error);
      }
    },
    [onMarkerClick, onSceneError],
  );

  if (!frames || frames.length === 0) {
    return <group />;
  }

  try {
    return (
      <>
        {/* Cinematic lighting setup */}
        {/* Key light - warm sun */}
        <directionalLight
          position={[15, 8, 10]}
          intensity={1.5}
          color={0xfff8e7}
          castShadow={!settings.simpleMode}
        />
        
        {/* Fill light - cool blue */}
        <directionalLight
          position={[-8, -4, -6]}
          intensity={0.3}
          color={0x4488cc}
        />
        
        {/* Rim light - subtle highlight */}
        <directionalLight
          position={[0, 10, -8]}
          intensity={0.4}
          color={0xaaccff}
        />
        
        {/* Ambient - very subtle to keep shadows dramatic */}
        <ambientLight intensity={0.08} color={0x334455} />

        {/* Hemisphere light for natural sky/ground bounce */}
        <hemisphereLight
          color={0x6688cc}
          groundColor={0x222244}
          intensity={0.15}
        />

        {settings.showEarth && (
          <EarthScene
            radius={planet.radius / 1000}
            showAtmosphere={settings.showAtmosphere && !settings.simpleMode}
            showClouds={settings.showClouds && !settings.simpleMode}
            simpleMode={settings.simpleMode || settings.lowPowerMode}
          />
        )}

        {settings.showTrajectory && (
          <TrajectoryPath frames={downsampledFrames} showPath={settings.showTrajectory} />
        )}

        <Markers
          markers={markers}
          showMarkers={settings.showMarkers}
          onMarkerClick={handleMarkerClick}
        />

        {currentFrame && (
          <RocketModel
            position={currentFrame.pos.map((p) => p / 1000) as [number, number, number]}
            rotation={currentFrame.attitude}
            showExhaust={settings.showExhaust && !settings.simpleMode}
            thrustLevel={currentFrame.mass ? 1.0 : 0}
          />
        )}

        <CameraController
          mode={settings.cameraMode}
          currentFrame={currentFrame}
          enabled={settings.cameraMode !== 'free'}
        />

        {settings.cameraMode === 'free' && (
          <OrbitControls enablePan enableZoom enableRotate minDistance={1} maxDistance={100} />
        )}

        <EffectsStack settings={settings} />
      </>
    );
  } catch (error) {
    console.error('3D Visualizer error', error, { location: 'VisualizerScene/render' });
    onSceneError?.(error as Error);
    return <group />;
  }
});
