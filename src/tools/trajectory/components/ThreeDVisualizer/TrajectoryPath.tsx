/**
 * Trajectory Path Component - Cinematic Edition
 * Glowing spline with phase-based coloring and trail effect
 */

import { useMemo } from 'react';
import { CatmullRomCurve3, Vector3, TubeGeometry, BufferAttribute } from 'three';
import { TrajectoryFrame } from '../../utils/three/threeUtils';
import * as THREE from 'three';

interface TrajectoryPathProps {
  frames: TrajectoryFrame[];
  radius?: number;
  segments?: number;
  showPath?: boolean;
  colorByPhase?: boolean;
}

// Phase colors
const PHASE_COLORS = {
  boost: new THREE.Color(0xff6600),    // Orange - powered ascent
  coast: new THREE.Color(0x22d3ee),    // Cyan - coasting
  orbit: new THREE.Color(0x10b981),    // Emerald - orbital
};

export function TrajectoryPath({
  frames,
  radius = 0.015,
  segments = 128,
  showPath = true,
  colorByPhase = true,
}: TrajectoryPathProps) {
  const { mainGeometry, mainMaterial, glowGeometry, glowMaterial } = useMemo(() => {
    if (frames.length < 2) {
      return { mainGeometry: null, mainMaterial: null, glowGeometry: null, glowMaterial: null };
    }

    const points = frames.map((frame) => new Vector3(...frame.pos));
    const curve = new CatmullRomCurve3(points, false, 'centripetal');

    // Main path tube
    const mainGeometry = new TubeGeometry(curve, segments, radius, 12, false);

    // Apply vertex colors based on phase
    if (colorByPhase) {
      const count = mainGeometry.attributes.position.count;
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const t = i / count;
        let color: THREE.Color;

        if (t < 0.3) {
          // Boost phase - orange to yellow
          color = PHASE_COLORS.boost.clone().lerp(new THREE.Color(0xffcc00), t / 0.3);
        } else if (t < 0.6) {
          // Transition to coast
          const localT = (t - 0.3) / 0.3;
          color = new THREE.Color(0xffcc00).lerp(PHASE_COLORS.coast, localT);
        } else {
          // Orbital phase
          const localT = (t - 0.6) / 0.4;
          color = PHASE_COLORS.coast.clone().lerp(PHASE_COLORS.orbit, localT);
        }

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      mainGeometry.setAttribute('color', new BufferAttribute(colors, 3));
    }

    const mainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: colorByPhase,
      color: colorByPhase ? 0xffffff : 0x22d3ee,
      emissive: colorByPhase ? 0x333333 : 0x004466,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.4,
    });

    // Outer glow tube (larger, transparent, additive blending)
    const glowGeometry = new TubeGeometry(curve, segments, radius * 3, 8, false);

    // Copy vertex colors to glow
    if (colorByPhase && mainGeometry.attributes.color) {
      const mainColors = mainGeometry.attributes.color;
      const glowCount = glowGeometry.attributes.position.count;
      const glowColors = new Float32Array(glowCount * 3);

      for (let i = 0; i < glowCount; i++) {
        const t = i / glowCount;
        const srcIdx = Math.floor(t * (mainColors.count - 1));
        glowColors[i * 3] = mainColors.getX(srcIdx);
        glowColors[i * 3 + 1] = mainColors.getY(srcIdx);
        glowColors[i * 3 + 2] = mainColors.getZ(srcIdx);
      }
      glowGeometry.setAttribute('color', new BufferAttribute(glowColors, 3));
    }

    const glowMaterial = new THREE.MeshBasicMaterial({
      vertexColors: colorByPhase,
      color: colorByPhase ? 0xffffff : 0x22d3ee,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { mainGeometry, mainMaterial, glowGeometry, glowMaterial };
  }, [frames, radius, segments, colorByPhase]);

  if (!showPath || !mainGeometry || !mainMaterial) {
    return null;
  }

  return (
    <group>
      {/* Main trajectory tube */}
      <mesh geometry={mainGeometry} material={mainMaterial} />

      {/* Outer glow */}
      {glowGeometry && glowMaterial && (
        <mesh geometry={glowGeometry} material={glowMaterial} />
      )}
    </group>
  );
}