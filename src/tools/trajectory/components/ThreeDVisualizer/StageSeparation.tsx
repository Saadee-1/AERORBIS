/**
 * Stage Separation Component - Cinematic Edition
 * Visual effects for stage separation with debris, flash, particles, and tumbling booster
 */

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, Vector3, CylinderGeometry, MeshStandardMaterial } from 'three';
import * as THREE from 'three';
import { TrajectoryFrame } from '../../utils/three/threeUtils';

interface StageSeparationProps {
  frame: TrajectoryFrame;
  separationDirection?: [number, number, number];
  onComplete?: () => void;
}

// Individual debris particle
function DebrisParticle({ 
  position, 
  velocity, 
  size, 
  color, 
  lifetime 
}: { 
  position: [number, number, number]; 
  velocity: [number, number, number]; 
  size: number; 
  color: number;
  lifetime: number;
}) {
  const ref = useRef<Mesh>(null);
  const startTime = useRef(0);
  const vel = useMemo(() => new Vector3(...velocity), [velocity]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    startTime.current += delta;
    
    // Move particle
    ref.current.position.add(vel.clone().multiplyScalar(delta));
    
    // Tumble
    ref.current.rotation.x += delta * (2 + Math.random());
    ref.current.rotation.z += delta * (1.5 + Math.random());
    
    // Fade out
    const progress = startTime.current / lifetime;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 1 - progress);
    
    // Scale down slightly
    const scale = Math.max(0.1, 1 - progress * 0.5);
    ref.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[size, size * 0.5, size * 0.3]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={1} 
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

// Separation flash effect
function SeparationFlash({ position }: { position: [number, number, number] }) {
  const ref = useRef<Mesh>(null);
  const startTime = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    startTime.current += delta;
    
    const progress = startTime.current / 0.8; // 0.8 second flash
    const scale = 1 + progress * 8;
    const opacity = Math.max(0, 1 - progress);
    
    ref.current.scale.setScalar(scale);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity * 0.7;
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.03, 16, 16]} />
      <meshBasicMaterial
        color={0xffaa44}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// Ring shockwave effect
function ShockwaveRing({ position }: { position: [number, number, number] }) {
  const ref = useRef<Mesh>(null);
  const startTime = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    startTime.current += delta;
    
    const progress = startTime.current / 1.2; // 1.2 second ring expansion
    const scale = 0.5 + progress * 6;
    const opacity = Math.max(0, 0.6 - progress * 0.6);
    
    ref.current.scale.set(scale, scale, 1);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity;
  });

  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.08, 0.12, 32]} />
      <meshBasicMaterial
        color={0xffcc66}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// Tumbling spent stage (booster falling away)
function SpentStage({ 
  startPosition, 
  separationVelocity 
}: { 
  startPosition: [number, number, number]; 
  separationVelocity: [number, number, number];
}) {
  const groupRef = useRef<Group>(null);
  const vel = useMemo(() => new Vector3(...separationVelocity), [separationVelocity]);
  const tumbleRates = useMemo(() => ({
    x: (Math.random() - 0.5) * 3,
    y: (Math.random() - 0.5) * 2,
    z: (Math.random() - 0.5) * 1.5,
  }), []);
  const startTime = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    startTime.current += delta;
    
    // Apply separation velocity
    groupRef.current.position.add(vel.clone().multiplyScalar(delta));
    
    // Tumble
    groupRef.current.rotation.x += tumbleRates.x * delta;
    groupRef.current.rotation.y += tumbleRates.y * delta;
    groupRef.current.rotation.z += tumbleRates.z * delta;
    
    // Fade out over time
    const progress = startTime.current / 6;
    groupRef.current.traverse((child) => {
      if (child instanceof Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.opacity !== undefined) {
          mat.transparent = true;
          mat.opacity = Math.max(0, 1 - progress);
        }
      }
    });
  });

  return (
    <group ref={groupRef} position={startPosition}>
      {/* Spent stage body */}
      <mesh>
        <cylinderGeometry args={[0.04, 0.05, 0.35, 16]} />
        <meshStandardMaterial 
          color={0x888888} 
          metalness={0.7} 
          roughness={0.3}
          transparent
          opacity={1}
        />
      </mesh>
      {/* Engine bell */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.04, 0.06, 12]} />
        <meshStandardMaterial 
          color={0x444444} 
          metalness={0.9} 
          roughness={0.1}
          transparent
          opacity={1}
        />
      </mesh>
      {/* Residual exhaust glow fading */}
      <mesh position={[0, -0.25, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial
          color={0xff4400}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// Spark particles ejected during separation
function SeparationSparks({ position }: { position: [number, number, number] }) {
  const sparksRef = useRef<Group>(null);
  const sparkData = useMemo(() => 
    Array.from({ length: 20 }, () => ({
      vel: new Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      size: 0.002 + Math.random() * 0.006,
      lifetime: 0.5 + Math.random() * 1.5,
      born: 0,
    })),
  []);
  const startTime = useRef(0);

  useFrame((_, delta) => {
    if (!sparksRef.current) return;
    startTime.current += delta;

    sparksRef.current.children.forEach((child, i) => {
      const spark = sparkData[i];
      child.position.add(spark.vel.clone().multiplyScalar(delta));
      
      const progress = startTime.current / spark.lifetime;
      const mat = (child as Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - progress);
      
      // Decelerate sparks
      spark.vel.multiplyScalar(0.98);
    });
  });

  return (
    <group ref={sparksRef} position={position}>
      {sparkData.map((spark, i) => (
        <mesh key={i}>
          <sphereGeometry args={[spark.size, 4, 4]} />
          <meshBasicMaterial
            color={0xffdd66}
            transparent
            opacity={1}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

export function StageSeparation({ frame, separationDirection, onComplete }: StageSeparationProps) {
  const [active, setActive] = useState(true);

  const sepDir = useMemo(() => {
    if (separationDirection) return separationDirection;
    // Default: separate downward relative to trajectory
    return [
      (Math.random() - 0.5) * 0.5,
      -1.5,
      (Math.random() - 0.5) * 0.5,
    ] as [number, number, number];
  }, [separationDirection]);

  const pos = useMemo(() => 
    frame.pos.map(p => p / 1000) as [number, number, number],
  [frame.pos]);

  // Debris particles
  const debris = useMemo(() => 
    Array.from({ length: 8 }, () => ({
      position: [
        pos[0] + (Math.random() - 0.5) * 0.02,
        pos[1] + (Math.random() - 0.5) * 0.02,
        pos[2] + (Math.random() - 0.5) * 0.02,
      ] as [number, number, number],
      velocity: [
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ] as [number, number, number],
      size: 0.005 + Math.random() * 0.015,
      color: Math.random() > 0.5 ? 0x888888 : 0x666666,
      lifetime: 2 + Math.random() * 3,
    })),
  [pos]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(false);
      onComplete?.();
    }, 7000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!active) return null;

  return (
    <group>
      {/* Separation flash */}
      <SeparationFlash position={pos} />

      {/* Shockwave ring */}
      <ShockwaveRing position={pos} />

      {/* Sparks */}
      <SeparationSparks position={pos} />

      {/* Tumbling spent stage */}
      <SpentStage startPosition={pos} separationVelocity={sepDir} />

      {/* Debris particles */}
      {debris.map((d, i) => (
        <DebrisParticle key={i} {...d} />
      ))}

      {/* Point light at separation point */}
      <pointLight
        position={pos}
        color={0xffaa44}
        intensity={5}
        distance={2}
        decay={2}
      />
    </group>
  );
}