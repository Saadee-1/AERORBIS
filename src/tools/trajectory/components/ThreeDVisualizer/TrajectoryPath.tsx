/**
 * Trajectory Path Component
 * Renders spline path with colored segments
 */

import { useMemo } from 'react';
import { CatmullRomCurve3, Vector3, TubeGeometry, MeshStandardMaterial } from 'three';
import { TrajectoryFrame } from '../../utils/three/threeUtils';
import * as THREE from 'three';

interface TrajectoryPathProps {
  frames: TrajectoryFrame[];
  radius?: number;
  segments?: number;
  showPath?: boolean;
  colorByPhase?: boolean;
}

export function TrajectoryPath({
  frames,
  radius = 0.01,
  segments = 64,
  showPath = true,
  colorByPhase = true,
}: TrajectoryPathProps) {
  const { geometry, material } = useMemo(() => {
    if (frames.length < 2) {
      return { geometry: null, material: null };
    }

    // Build curve from positions
    const points = frames.map((frame) => new Vector3(...frame.pos));
    const curve = new CatmullRomCurve3(points, false, 'centripetal');

    // Create tube geometry
    const geometry = new TubeGeometry(curve, segments, radius, 8, false);

    // Color by phase
    let material: THREE.MeshStandardMaterial;
    if (colorByPhase) {
      // Boost phase: orange/red
      // Coast phase: blue
      // Orbit phase: cyan
      material = new MeshStandardMaterial({
        color: 0x00ffff, // Default cyan
        emissive: 0x004444,
        emissiveIntensity: 0.3,
      });
    } else {
      material = new MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x002244,
        emissiveIntensity: 0.2,
      });
    }

    return { geometry, material };
  }, [frames, radius, segments, colorByPhase]);

  if (!showPath || !geometry || !material) {
    return null;
  }

  return (
    <mesh geometry={geometry} material={material} />
  );
}
