/**
 * Stage Separation Component
 * Visual effects for stage separation
 */

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { TrajectoryFrame } from '../../utils/three/threeUtils';

interface StageSeparationProps {
  frame: TrajectoryFrame;
  onComplete?: () => void;
}

export function StageSeparation({ frame, onComplete }: StageSeparationProps) {
  const groupRef = useRef<Group>(null);
  const [velocity] = useState(() => new Vector3(
    (Math.random() - 0.5) * 2,
    -1,
    (Math.random() - 0.5) * 2
  ));

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Apply velocity
      groupRef.current.position.add(velocity.clone().multiplyScalar(delta));
      
      // Apply rotation
      groupRef.current.rotation.x += delta * 0.5;
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  useEffect(() => {
    // Fade out after 5 seconds
    const timer = setTimeout(() => {
      onComplete?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <group ref={groupRef} position={frame.pos}>
      {/* Simple stage mesh */}
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
        <meshStandardMaterial color={0x666666} />
      </mesh>
    </group>
  );
}
