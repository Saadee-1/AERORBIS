/**
 * Earth Scene Component
 * Renders Earth sphere with textures, atmosphere, and clouds
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, SphereGeometry } from 'three';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

interface EarthSceneProps {
  radius: number;
  showAtmosphere?: boolean;
  showClouds?: boolean;
  simpleMode?: boolean;
  rotationSpeed?: number;
}

export function EarthScene({
  radius,
  showAtmosphere = true,
  showClouds = true,
  simpleMode = false,
  rotationSpeed = 0.00001,
}: EarthSceneProps) {
  const earthRef = useRef<Mesh>(null);
  const cloudRef = useRef<Mesh>(null);

  // Texture loading - use simple mode by default, textures can be added later
  // For now, use procedural materials

  // Create materials
  const earthMaterial = useMemo(() => {
    // Use procedural material - textures can be added later via useTexture hook
    return new THREE.MeshStandardMaterial({
      color: 0x4a90e2,
      roughness: 0.8,
      metalness: 0.2,
    });
  }, [simpleMode]);

  const cloudMaterial = useMemo(() => {
    if (!showClouds || simpleMode) return null;

    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
  }, [showClouds, simpleMode]);

  // Rotate Earth
  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += rotationSpeed;
    }
    if (cloudRef.current && showClouds) {
      cloudRef.current.rotation.y += rotationSpeed * 1.1; // Slightly faster for clouds
    }
  });

  // Low-res geometry for performance
  const geometry = useMemo(() => {
    return new SphereGeometry(radius, simpleMode ? 32 : 64, simpleMode ? 32 : 64);
  }, [radius, simpleMode]);

  return (
    <group>
      {/* Stars background */}
      <Stars radius={radius * 100} depth={50} count={5000} factor={4} fade speed={1} />

      {/* Earth sphere */}
      <mesh ref={earthRef} geometry={geometry} material={earthMaterial} />

      {/* Clouds layer */}
      {showClouds && cloudMaterial && (
        <mesh ref={cloudRef} geometry={geometry} material={cloudMaterial} scale={1.01} />
      )}

      {/* Atmosphere glow */}
      {showAtmosphere && !simpleMode && (
        <mesh geometry={geometry} scale={1.02}>
          <meshBasicMaterial
            color={0x87ceeb}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
