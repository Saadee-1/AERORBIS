/**
 * Three.js utilities and data contracts for 3D visualizer
 */

export interface TrajectoryFrame {
  t: number; // seconds
  pos: [number, number, number]; // ECEF or local coords (meters)
  vel: [number, number, number]; // m/s
  attitude?: [number, number, number, number]; // quaternion [w, x, y, z]
  mass?: number;
  stageIndex?: number;
  events?: string[]; // ['maxQ', 'MECO', 'stageSep', 'fairingSep']
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
 * Convert simulation result to TrajectoryData
 */
export function convertSimulationToTrajectoryData(
  result: any,
  mode: '1D' | '2D' | '3D',
  planet: any
): TrajectoryData {
  const frames: TrajectoryFrame[] = [];

  if (!result || !result.states) {
    return {
      frames: [],
      metadata: {
        planet: planet.id || 'earth',
        coordFrame: 'ECEF',
        planetRadius: planet.radius || 6371000,
      },
    };
  }

  result.states.forEach((state: any) => {
    let pos: [number, number, number];
    let vel: [number, number, number];
    let attitude: [number, number, number, number] | undefined;

    if (mode === '1D') {
      // 1D: vertical ascent
      pos = [0, 0, planet.radius + state.altitude];
      vel = [0, 0, state.velocity];
    } else if (mode === '2D') {
      // 2D: gravity turn
      const flightPathAngle = state.flightPathAngle || 0;
      pos = [
        state.downrange || 0,
        0,
        planet.radius + state.altitude,
      ];
      vel = [
        state.velocity * Math.cos(flightPathAngle),
        0,
        state.velocity * Math.sin(flightPathAngle),
      ];
    } else {
      // 3D: full 6-DOF
      pos = state.position || [0, 0, planet.radius];
      vel = state.velocity || [0, 0, 0];
      attitude = state.attitude;
    }

    const events: string[] = [];
    if (state.dynamicPressure && result.maxQ && Math.abs(state.t - result.maxQ.time) < 0.1) {
      events.push('maxQ');
    }
    if (state.remainingFuel !== undefined && state.remainingFuel <= 0) {
      events.push('MECO');
    }

    frames.push({
      t: state.t,
      pos,
      vel,
      attitude,
      mass: state.mass,
      stageIndex: state.stageIndex,
      events: events.length > 0 ? events : undefined,
    });
  });

  // Add staging events
  if (result.stagingEvents) {
    result.stagingEvents.forEach((event: any) => {
      const frameIndex = frames.findIndex(f => Math.abs(f.t - event.time) < 0.1);
      if (frameIndex >= 0) {
        if (!frames[frameIndex].events) {
          frames[frameIndex].events = [];
        }
        frames[frameIndex].events!.push('stageSep');
      }
    });
  }

  return {
    frames,
    metadata: {
      planet: planet.id || 'earth',
      coordFrame: 'ECEF',
      planetRadius: planet.radius || 6371000,
    },
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
