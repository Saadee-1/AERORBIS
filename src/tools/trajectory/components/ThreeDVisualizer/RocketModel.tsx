/**
 * Rocket Model Component - Cinematic Edition
 * Procedural rocket with animated multi-layer exhaust plume
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
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

// Enhanced procedural rocket
function createProceduralRocket(): Group {
  const group = new Group();

  // Main body (cylinder) - metallic silver with panel lines
  const bodyGeometry = new CylinderGeometry(0.05, 0.055, 0.5, 24);
  const bodyMaterial = new MeshStandardMaterial({
    color: 0xe8e8e8,
    metalness: 0.9,
    roughness: 0.15,
    envMapIntensity: 1.2,
  });
  const body = new Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.25;
  group.add(body);

  // Body accent stripe
  const stripeGeometry = new CylinderGeometry(0.056, 0.056, 0.02, 24);
  const stripeMaterial = new MeshStandardMaterial({
    color: 0x1a1a2e,
    metalness: 0.8,
    roughness: 0.3,
  });
  const stripe = new Mesh(stripeGeometry, stripeMaterial);
  stripe.position.y = 0.35;
  group.add(stripe);

  // Nose cone - red/orange with metallic finish
  const noseGeometry = new ConeGeometry(0.05, 0.18, 24);
  const noseMaterial = new MeshStandardMaterial({
    color: 0xcc3333,
    metalness: 0.7,
    roughness: 0.25,
    emissive: 0x330000,
    emissiveIntensity: 0.1,
  });
  const nose = new Mesh(noseGeometry, noseMaterial);
  nose.position.y = 0.59;
  group.add(nose);

  // Engine bell (inverted cone at bottom)
  const bellGeometry = new CylinderGeometry(0.03, 0.05, 0.08, 16);
  const bellMaterial = new MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.95,
    roughness: 0.1,
  });
  const bell = new Mesh(bellGeometry, bellMaterial);
  bell.position.y = -0.04;
  group.add(bell);

  // Fins (4 swept fins)
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.06, -0.02);
  finShape.lineTo(0.04, 0.1);
  finShape.lineTo(0, 0.08);
  finShape.closePath();

  const finGeometry = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.004,
    bevelEnabled: false,
  });
  const finMaterial = new MeshStandardMaterial({
    color: 0x222233,
    metalness: 0.85,
    roughness: 0.2,
  });

  for (let i = 0; i < 4; i++) {
    const fin = new Mesh(finGeometry, finMaterial);
    const angle = (i / 4) * Math.PI * 2;
    fin.position.x = Math.cos(angle) * 0.05;
    fin.position.z = Math.sin(angle) * 0.05;
    fin.position.y = -0.02;
    fin.rotation.y = -angle + Math.PI / 2;
    group.add(fin);
  }

  return group;
}

// Animated exhaust plume component
function ExhaustPlume({ thrustLevel, scale }: { thrustLevel: number; scale: number }) {
  const innerRef = useRef<Mesh>(null);
  const outerRef = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);
  const sparkGroupRef = useRef<Group>(null);

  // Animated spark positions
  const sparks = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
      offset: Math.random() * Math.PI * 2,
      size: 0.003 + Math.random() * 0.005,
    }));
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker = 0.85 + Math.sin(t * 30) * 0.1 + Math.sin(t * 47) * 0.05;

    if (innerRef.current) {
      const mat = innerRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9 * thrustLevel * flicker;
      innerRef.current.scale.y = (0.9 + Math.sin(t * 20) * 0.15) * thrustLevel;
    }

    if (outerRef.current) {
      const mat = outerRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 * thrustLevel * flicker;
      outerRef.current.scale.y = (1.0 + Math.sin(t * 15) * 0.2) * thrustLevel;
    }

    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = thrustLevel * flicker;
      coreRef.current.scale.y = (0.8 + Math.sin(t * 25) * 0.1) * thrustLevel;
    }

    // Animate sparks
    if (sparkGroupRef.current) {
      sparkGroupRef.current.children.forEach((child, i) => {
        const spark = sparks[i];
        const phase = (t * spark.speed + spark.offset) % 1;
        const sparkY = -0.05 - phase * 0.3 * thrustLevel;
        const spread = phase * 0.04;
        child.position.set(
          Math.cos(spark.angle + t * 2) * spread,
          sparkY,
          Math.sin(spark.angle + t * 2) * spread
        );
        child.scale.setScalar(1 - phase);
        (child as Mesh).visible = thrustLevel > 0.1;
      });
    }
  });

  const s = scale;

  return (
    <group position={[0, -0.08 * s, 0]}>
      {/* Core - white hot */}
      <mesh ref={coreRef}>
        <coneGeometry args={[0.02 * s, 0.12 * s * thrustLevel, 12]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={thrustLevel}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner plume - bright orange/yellow */}
      <mesh ref={innerRef}>
        <coneGeometry args={[0.04 * s, 0.2 * s * thrustLevel, 12]} />
        <meshBasicMaterial
          color={0xff8800}
          transparent
          opacity={0.8 * thrustLevel}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer plume - red/orange glow */}
      <mesh ref={outerRef}>
        <coneGeometry args={[0.06 * s, 0.3 * s * thrustLevel, 12]} />
        <meshBasicMaterial
          color={0xff4400}
          transparent
          opacity={0.35 * thrustLevel}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Exhaust glow sphere */}
      <mesh>
        <sphereGeometry args={[0.04 * s, 12, 12]} />
        <meshBasicMaterial
          color={0xff6600}
          transparent
          opacity={0.3 * thrustLevel}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Sparks */}
      <group ref={sparkGroupRef}>
        {sparks.map((spark) => (
          <mesh key={spark.id}>
            <sphereGeometry args={[spark.size * s, 4, 4]} />
            <meshBasicMaterial
              color={0xffaa44}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>

      {/* Point light from exhaust */}
      <pointLight
        color={0xff6600}
        intensity={thrustLevel * 2}
        distance={0.5 * s}
        decay={2}
        position={[0, -0.05 * s, 0]}
      />
    </group>
  );
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

  const rocketModel = useMemo(() => createProceduralRocket(), []);

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

  return (
    <group ref={groupRef}>
      <primitive object={rocketModel} />
      {showExhaust && thrustLevel > 0 && (
        <ExhaustPlume thrustLevel={thrustLevel} scale={scale} />
      )}
    </group>
  );
}