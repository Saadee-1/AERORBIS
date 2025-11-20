/**
 * 3D Trajectory Visualizer using react-three-fiber
 */

import { AeroCard } from '@/components/common/AeroCard';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Line } from '@react-three/drei';
import { useMemo } from 'react';
import { Planet } from '../data/planets';

interface ThreeDVisualizerProps {
  planet: Planet;
  trajectory?: Array<{ position: [number, number, number]; altitude: number }>;
  currentState?: {
    position: [number, number, number];
    attitude?: any;
  };
}

function Earth({ planet }: { planet: Planet }) {
  return (
    <Sphere args={[planet.radius / 1000, 32, 32]}>
      <meshStandardMaterial color="#4a90e2" />
    </Sphere>
  );
}

function TrajectoryPath({ trajectory }: { trajectory: Array<{ position: [number, number, number] }> }) {
  const points = useMemo(() => {
    return trajectory.map(state => [
      state.position[0] / 1000,
      state.position[1] / 1000,
      state.position[2] / 1000,
    ] as [number, number, number]);
  }, [trajectory]);

  return (
    <Line
      points={points}
      color="#22d3ee"
      lineWidth={2}
    />
  );
}

function Rocket({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh position={[position[0] / 1000, position[1] / 1000, position[2] / 1000]}>
      <coneGeometry args={[0.1 * scale, 0.5 * scale, 8]} />
      <meshStandardMaterial color="#f59e0b" />
    </mesh>
  );
}

export function ThreeDVisualizer({ planet, trajectory, currentState }: ThreeDVisualizerProps) {
  if (!trajectory || trajectory.length === 0) {
    return (
      <AeroCard title="3D Visualization">
        <div className="text-center p-8 text-gray-400">
          <p>Run a 3D simulation to see visualization</p>
        </div>
      </AeroCard>
    );
  }

  // Downsample trajectory for performance
  const maxPoints = 1000;
  const step = Math.max(1, Math.floor(trajectory.length / maxPoints));
  const displayTrajectory = trajectory.filter((_, i) => i % step === 0);

  return (
    <AeroCard title="3D Trajectory Visualization">
      <div className="h-[600px] w-full bg-slate-900 rounded-lg overflow-hidden">
        <Canvas camera={{ position: [0, 0, 50], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Earth planet={planet} />
          {displayTrajectory.length > 0 && (
            <TrajectoryPath trajectory={displayTrajectory} />
          )}
          {currentState && (
            <Rocket position={currentState.position} />
          )}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={10}
            maxDistance={200}
          />
        </Canvas>
      </div>
      <div className="mt-4 p-3 bg-slate-800/30 rounded border border-cyan-400/20">
        <p className="text-xs text-gray-400">
          Use mouse to rotate, zoom, and pan. Blue sphere = planet, cyan line = trajectory, orange cone = rocket.
        </p>
      </div>
    </AeroCard>
  );
}
