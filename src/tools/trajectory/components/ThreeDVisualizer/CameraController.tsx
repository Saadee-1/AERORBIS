/**
 * Camera Controller Component
 * Implements multiple camera modes with smooth transitions
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Quaternion } from 'three';
import { TrajectoryFrame } from '../../utils/three/threeUtils';

export type CameraMode = 'follow' | 'chase' | 'ground' | 'orbital' | 'free' | 'cinematic';

interface CameraControllerProps {
  mode: CameraMode;
  currentFrame?: TrajectoryFrame;
  target?: [number, number, number];
  enabled?: boolean;
}

const CAMERA_OFFSETS: Record<CameraMode, { position: Vector3; lookAt: Vector3 }> = {
  follow: {
    position: new Vector3(0, 0.5, -2), // Behind and above
    lookAt: new Vector3(0, 0, 0),
  },
  chase: {
    position: new Vector3(1, 0.3, -1.5), // Side and slightly behind
    lookAt: new Vector3(0, 0, 0),
  },
  ground: {
    position: new Vector3(0, 0, 0), // Ground level
    lookAt: new Vector3(0, 1, 0),
  },
  orbital: {
    position: new Vector3(5, 5, 5), // Orbital view
    lookAt: new Vector3(0, 0, 0),
  },
  free: {
    position: new Vector3(0, 0, 0), // User controlled
    lookAt: new Vector3(0, 0, 0),
  },
  cinematic: {
    position: new Vector3(0, 2, -3), // Cinematic angle
    lookAt: new Vector3(0, 0, 0),
  },
};

export function CameraController({
  mode,
  currentFrame,
  target,
  enabled = true,
}: CameraControllerProps) {
  const { camera } = useThree();
  const targetPosRef = useRef(new Vector3());
  const currentPosRef = useRef(new Vector3());
  const currentLookAtRef = useRef(new Vector3());

  // Smooth camera movement
  useFrame(() => {
    if (!enabled || mode === 'free') return;

    if (currentFrame) {
      const rocketPos = new Vector3(...currentFrame.pos);
      const rocketVel = new Vector3(...currentFrame.vel);
      if (rocketVel.length() > 0) {
        rocketVel.normalize();
      }

      // Calculate camera position based on mode
      let desiredPos: Vector3;
      let desiredLookAt: Vector3;

      if (mode === 'ground') {
        // Ground camera stays at origin, looks up at rocket
        desiredPos = new Vector3(0, 0, 0);
        desiredLookAt = rocketPos;
      } else if (mode === 'orbital') {
        // Orbital camera maintains distance
        const distance = 10;
        desiredPos = rocketPos.clone().add(new Vector3(distance, distance, distance));
        desiredLookAt = rocketPos;
      } else {
        // Follow/Chase/Cinematic: relative to rocket
        const offset = CAMERA_OFFSETS[mode].position.clone();
        
        // Transform offset by rocket attitude if available
        if (currentFrame.attitude) {
          const quat = new Quaternion(
            currentFrame.attitude[1],
            currentFrame.attitude[2],
            currentFrame.attitude[3],
            currentFrame.attitude[0]
          );
          offset.applyQuaternion(quat);
        }

        desiredPos = rocketPos.clone().add(offset);
        desiredLookAt = rocketPos.clone().add(CAMERA_OFFSETS[mode].lookAt);
      }

      // Smooth interpolation
      const lerpFactor = 0.1;
      currentPosRef.current.lerp(desiredPos, lerpFactor);
      currentLookAtRef.current.lerp(desiredLookAt, lerpFactor);

      camera.position.copy(currentPosRef.current);
      camera.lookAt(currentLookAtRef.current);
    } else if (target) {
      // Fallback to target position
      targetPosRef.current.set(...target);
      camera.lookAt(targetPosRef.current);
    }
  });

  return null;
}
