import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import { useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

interface GlobeLoaderProps {
  isLoading: boolean;
}

const smoothEase = [0.16, 1, 0.3, 1];

const AnimatedGlobe = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.008;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.08;
    }
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += 0.005;
      wireframeRef.current.rotation.z += 0.003;
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#1a1a3e"
          attach="material"
          distort={0.15}
          speed={1.5}
          roughness={0.4}
          metalness={0.8}
        />
      </Sphere>
      <Sphere ref={wireframeRef} args={[1.02, 32, 32]}>
        <meshBasicMaterial color="#00d4ff" wireframe transparent opacity={0.12} />
      </Sphere>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.02, 16, 100]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.35} />
      </mesh>
      <Sphere args={[1.15, 32, 32]}>
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.04} side={THREE.BackSide} />
      </Sphere>
    </group>
  );
};

const LoaderStars = () => {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    opacity: Math.random() * 0.4 + 0.15,
    duration: Math.random() * 2.5 + 1.5,
    delay: Math.random() * 2,
  }));

  return (
    <>
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute w-[1px] h-[1px] bg-foreground/60 rounded-full"
          style={{ left: star.left, top: star.top, opacity: star.opacity }}
          animate={{ opacity: [0.15, 0.6, 0.15] }}
          transition={{ duration: star.duration, repeat: Infinity, delay: star.delay, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
};

const GlobeLoader = ({ isLoading }: GlobeLoaderProps) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(240, 100%, 8%) 0%, hsl(240, 100%, 3%) 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.35, ease: smoothEase }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <LoaderStars />
          </div>
          <motion.div
            className="w-48 h-48 relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0 }}
            transition={{ duration: 0.4, ease: smoothEase }}
          >
            <Suspense fallback={null}>
              <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#00d4ff" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
                <AnimatedGlobe />
              </Canvas>
            </Suspense>
            <motion.div
              className="absolute bottom-[-40px] left-1/2 transform -translate-x-1/2"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3, ease: smoothEase }}
            >
              <div className="flex items-center gap-1 text-sm" style={{ color: 'hsl(220, 15%, 55%)' }}>
                <span>Loading</span>
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ...
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobeLoader;
