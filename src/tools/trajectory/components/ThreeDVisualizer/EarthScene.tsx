/**
 * Earth Scene Component - Cinematic Edition
 * Renders Earth with Fresnel atmosphere glow, procedural surface, and starfield
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, SphereGeometry, ShaderMaterial } from 'three';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

interface EarthSceneProps {
  radius: number;
  showAtmosphere?: boolean;
  showClouds?: boolean;
  simpleMode?: boolean;
  rotationSpeed?: number;
}

// Custom atmosphere Fresnel shader
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float power;
  
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), power);
    float glow = fresnel * intensity;
    gl_FragColor = vec4(glowColor, glow * 0.8);
  }
`;

// Procedural Earth surface shader with landmass hints
const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform float time;
  
  // Simple noise function
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    // Spherical coordinates for landmass generation
    vec2 uv = vUv * 8.0;
    float n = fbm(uv + vec2(0.0, time * 0.001));
    
    // Ocean vs land
    vec3 oceanDeep = vec3(0.02, 0.05, 0.15);
    vec3 oceanShallow = vec3(0.05, 0.12, 0.25);
    vec3 land = vec3(0.08, 0.18, 0.08);
    vec3 landHigh = vec3(0.15, 0.12, 0.08);
    vec3 ice = vec3(0.7, 0.75, 0.8);
    
    // Determine terrain type
    float landMask = smoothstep(0.42, 0.52, n);
    float heightMask = smoothstep(0.55, 0.7, n);
    
    // Ice caps near poles
    float latitude = abs(vUv.y - 0.5) * 2.0;
    float iceMask = smoothstep(0.75, 0.9, latitude);
    
    // Mix colors
    vec3 oceanColor = mix(oceanDeep, oceanShallow, fbm(uv * 2.0));
    vec3 landColor = mix(land, landHigh, heightMask);
    vec3 surfaceColor = mix(oceanColor, landColor, landMask);
    surfaceColor = mix(surfaceColor, ice, iceMask);
    
    // Lighting
    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.8));
    float diffuse = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.15;
    
    // Specular for ocean
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(vNormal, halfDir), 0.0), 64.0) * (1.0 - landMask) * 0.5;
    
    // Night side city lights hint
    float nightSide = 1.0 - smoothstep(-0.1, 0.2, diffuse);
    float cityNoise = step(0.85, noise(uv * 20.0)) * landMask;
    vec3 cityLights = vec3(1.0, 0.8, 0.4) * cityNoise * 0.3 * nightSide;
    
    vec3 finalColor = surfaceColor * (ambient + diffuse * 0.85) + vec3(specular) + cityLights;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function EarthScene({
  radius,
  showAtmosphere = true,
  showClouds = true,
  simpleMode = false,
  rotationSpeed = 0.00005,
}: EarthSceneProps) {
  const earthRef = useRef<Mesh>(null);
  const cloudRef = useRef<Mesh>(null);
  const atmosphereRef = useRef<Mesh>(null);
  const earthShaderRef = useRef<ShaderMaterial>(null);

  // Earth shader material
  const earthMaterial = useMemo(() => {
    if (simpleMode) {
      return new THREE.MeshStandardMaterial({
        color: 0x2a5caa,
        roughness: 0.8,
        metalness: 0.2,
      });
    }
    return new ShaderMaterial({
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
      uniforms: {
        time: { value: 0 },
      },
    });
  }, [simpleMode]);

  // Atmosphere shader material
  const atmosphereMaterial = useMemo(() => {
    if (!showAtmosphere || simpleMode) return null;
    return new ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        glowColor: { value: new THREE.Color(0.3, 0.6, 1.0) },
        intensity: { value: 1.2 },
        power: { value: 3.5 },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [showAtmosphere, simpleMode]);

  // Inner atmosphere glow
  const innerAtmosphereMaterial = useMemo(() => {
    if (!showAtmosphere || simpleMode) return null;
    return new ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        glowColor: { value: new THREE.Color(0.4, 0.7, 1.0) },
        intensity: { value: 0.6 },
        power: { value: 2.0 },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [showAtmosphere, simpleMode]);

  const cloudMaterial = useMemo(() => {
    if (!showClouds || simpleMode) return null;
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, [showClouds, simpleMode]);

  // Animate
  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += rotationSpeed;
    }
    if (cloudRef.current) {
      cloudRef.current.rotation.y += rotationSpeed * 1.3;
    }
    // Update time uniform for procedural shader
    if (!simpleMode && earthMaterial instanceof ShaderMaterial) {
      earthMaterial.uniforms.time.value += delta;
    }
  });

  const geometry = useMemo(() => {
    return new SphereGeometry(radius, simpleMode ? 32 : 96, simpleMode ? 32 : 64);
  }, [radius, simpleMode]);

  const atmosphereGeometry = useMemo(() => {
    return new SphereGeometry(radius * 1.025, 64, 48);
  }, [radius]);

  return (
    <group>
      {/* Enhanced starfield - dual layer for depth */}
      <Stars radius={radius * 80} depth={60} count={simpleMode ? 3000 : 8000} factor={5} fade speed={0.5} />
      {!simpleMode && (
        <Stars radius={radius * 200} depth={100} count={3000} factor={8} fade speed={0.2} />
      )}

      {/* Earth */}
      <mesh ref={earthRef} geometry={geometry} material={earthMaterial} />

      {/* Cloud layer */}
      {showClouds && cloudMaterial && (
        <mesh ref={cloudRef} geometry={geometry} material={cloudMaterial} scale={1.008} />
      )}

      {/* Outer atmosphere glow (Fresnel) */}
      {atmosphereMaterial && (
        <mesh geometry={atmosphereGeometry} material={atmosphereMaterial} scale={1.08} />
      )}

      {/* Inner atmosphere rim */}
      {innerAtmosphereMaterial && (
        <mesh geometry={atmosphereGeometry} material={innerAtmosphereMaterial} scale={1.01} />
      )}

      {/* Sun light source indicator */}
      {!simpleMode && (
        <pointLight
          position={[radius * 10, radius * 5, radius * 8]}
          intensity={0.3}
          color={0xfff4e6}
          distance={radius * 30}
        />
      )}
    </group>
  );
}