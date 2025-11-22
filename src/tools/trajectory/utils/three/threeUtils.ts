/**
 * Three.js utilities and data contracts for 3D visualizer
 */

export interface TrajectoryFrame {
  t: number; // seconds
  pos: [number, number, number]; // meters
  vel: [number, number, number]; // m/s
  attitude?: [number, number, number, number]; // quaternion [w, x, y, z]
  mass?: number;
  stageIndex?: number;
  events?: string[]; // ['maxQ', 'MECO', 'stageSep', 'fairingSep']
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface TrajectoryData {
  frames: TrajectoryFrame[];
  metadata: {
    planet: string;
    coordFrame: 'ECEF' | 'ENU' | 'inertial';
    startTime?: string;
    planetRadius?: number;
  };
}

/**
 * Downsample trajectory frames for performance
 */
export function downsampleFrames(
  frames: TrajectoryFrame[],
  maxPoints: number = 1000
): TrajectoryFrame[] {
  if (frames.length <= maxPoints) {
    return frames;
  }

  const step = Math.ceil(frames.length / maxPoints);
  const downsampled: TrajectoryFrame[] = [];

  for (let i = 0; i < frames.length; i += step) {
    downsampled.push(frames[i]);
  }

  // Always include last frame
  if (downsampled[downsampled.length - 1] !== frames[frames.length - 1]) {
    downsampled.push(frames[frames.length - 1]);
  }

  return downsampled;
}

/**
 * Extract event markers from trajectory
 */
export function extractEventMarkers(
  frames: TrajectoryFrame[]
): Array<{ name: string; t: number; pos: [number, number, number]; frame: TrajectoryFrame }> {
  const markers: Array<{ name: string; t: number; pos: [number, number, number]; frame: TrajectoryFrame }> = [];

  frames.forEach((frame) => {
    if (frame.events && frame.events.length > 0) {
      frame.events.forEach((event) => {
        markers.push({
          name: event,
          t: frame.t,
          pos: frame.pos,
          frame,
        });
      });
    }
  });

  return markers;
}
