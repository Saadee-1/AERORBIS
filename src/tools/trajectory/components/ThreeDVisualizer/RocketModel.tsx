/**
 * Rocket Model Component
 * Loads GLTF or uses procedural fallback
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Group, Mesh, CylinderGeometry, ConeGeometry, MeshStandardMaterial } from 'three';
import * as THREE from 'three';

interface RocketModelProps {
  position: [number, number, number];
  rotation?: [number, number, number, number]; // quaternion
  scale?: number;
  stageIndex?: number;
  showExhaust?: boolean;
  thrustLevel?: number; // 0-1
}

// Procedural rocket geometry
function createProceduralRocket(): Group {
  const group = new Group();

  // Main body (cylinder)
  const bodyGeometry = new CylinderGeometry(0.05, 0.05, 0.5, 16);
  const bodyMaterial = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.8,
    roughness: 0.2,
  });
  const body = new Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.25;
  group.add(body);

  // Nose cone
  const noseGeometry = new ConeGeometry(0.05, 0.15, 16);
  const noseMaterial = new MeshStandardMaterial({
    color: 0xff6b6b,
    metalness: 0.7,
    roughness: 0.3,
  });
  const nose = new Mesh(noseGeometry, noseMaterial);
  nose.position.y = 0.575;
  nose.rotation.z = Math.PI;
  group.add(nose);

  // Fins (4 fins)
  const finGeometry = new ConeGeometry(0.02, 0.1, 3);
  const finMaterial = new MeshStandardMaterial({
    color: 0x333333,
  });
  for (let i = 0; i < 4; i++) {
    const fin = new Mesh(finGeometry, finMaterial);
    const angle = (i / 4) * Math.PI * 2;
    fin.position.x = Math.cos(angle) * 0.05;
    fin.position.z = Math.sin(angle) * 0.05;
    fin.position.y = 0.1;
    fin.rotation.y = angle;
    fin.rotation.x = Math.PI / 2;
    group.add(fin);
  }

  return group;
}

export function RocketModel({
  position,
  rotation,
  scale = 1,
  stageIndex = 0,
  showExhaust = true,
  thrustLevel = 1,
}: RocketModelProps) {
  const groupRef = useRef<Group>(null);

  // Try to load GLTF, fallback to procedural
  const gltf = useGLTF('/models/rocket.gltf', true).catch(() => null);
  const rocketModel = useMemo(() => {
    if (gltf && gltf.scene) {
      return gltf.scene.clone();
    }
    return createProceduralRocket();
  }, [gltf]);

  // Apply transform
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      groupRef.current.scale.set(scale, scale, scale);

      if (rotation) {
        const quat = new THREE.Quaternion(rotation[0], rotation[1], rotation[2], rotation[3]);
        groupRef.current.quaternion.copy(quat);
      }
    }
  });

  // Exhaust plume
  const exhaustVisible = showExhaust && thrustLevel > 0;

  return (
    <group ref={groupRef}>
      <primitive object={rocketModel} />
      {exhaustVisible && (
        <mesh position={[0, -0.25 * scale, 0]}>
          <coneGeometry args={[0.08 * scale, 0.2 * scale * thrustLevel, 8]} />
          <meshBasicMaterial
            color={0xff6600}
            transparent
            opacity={0.6 * thrustLevel}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Preload GLTF
useGLTF.preload('/models/rocket.gltf');
