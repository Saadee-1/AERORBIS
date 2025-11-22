import type { TrajectoryData, TrajectoryFrame } from './three/threeUtils';
import { isDevEnv } from '@/lib/env';

type PlanetLite = {
  id?: string;
  radius?: number;
};

const sanitizeNumber = (value: unknown, fallback = 0): number => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const sanitizeVector3 = (value: unknown, fallback: [number, number, number]): [number, number, number] => {
  if (Array.isArray(value) && value.length >= 3) {
    return [
      sanitizeNumber(value[0], fallback[0]),
      sanitizeNumber(value[1], fallback[1]),
      sanitizeNumber(value[2], fallback[2]),
    ];
  }
  return fallback;
};

const EMPTY_TRAJECTORY = (planet: PlanetLite): TrajectoryData => ({
  frames: [],
  metadata: {
    planet: planet?.id || 'earth',
    coordFrame: 'ECEF',
    planetRadius: planet?.radius || 6_371_000,
  },
});

export function convertSimulationToTrajectoryData(
  result: any,
  mode: '1D' | '2D' | '3D',
  planet: PlanetLite,
): TrajectoryData {
  try {
    if (!result || !Array.isArray(result.states) || result.states.length === 0) {
        if (isDevEnv()) {
          console.debug('TrajectoryConvert: frames=0', {
            reason: 'no-states',
            hasResult: Boolean(result),
            framesCount: 0,
          });
        }
      return EMPTY_TRAJECTORY(planet);
    }

    const planetRadius = sanitizeNumber(planet?.radius, 6_371_000);
    const frames: TrajectoryFrame[] = [];

    for (const state of result.states) {
      const t = sanitizeNumber(state?.t, frames.length > 0 ? frames[frames.length - 1].t : 0);

      let pos: [number, number, number];
      let vel: [number, number, number];
      let attitude: TrajectoryFrame['attitude'];

      if (mode === '1D') {
        const altitude = sanitizeNumber(state?.altitude, 0);
        const velocity = sanitizeNumber(state?.velocity, 0);
        pos = [0, 0, planetRadius + altitude];
        vel = [0, 0, velocity];
      } else if (mode === '2D') {
        const downrange = sanitizeNumber(state?.downrange, 0);
        const altitude = sanitizeNumber(state?.altitude, 0);
        const velocity = sanitizeNumber(state?.velocity, 0);
        const flightPathAngle = sanitizeNumber(state?.flightPathAngle, 0);
        pos = [downrange, 0, planetRadius + altitude];
        vel = [
          velocity * Math.cos(flightPathAngle),
          0,
          velocity * Math.sin(flightPathAngle),
        ];
      } else {
        pos = sanitizeVector3(state?.position, [0, 0, planetRadius]);
        vel = sanitizeVector3(state?.velocity, [0, 0, 0]);
        if (state?.attitude && Array.isArray(state.attitude) && state.attitude.length === 4) {
          attitude = [
            sanitizeNumber(state.attitude[0], 1),
            sanitizeNumber(state.attitude[1], 0),
            sanitizeNumber(state.attitude[2], 0),
            sanitizeNumber(state.attitude[3], 0),
          ];
        }
      }

      const frame: TrajectoryFrame = {
        t,
        pos,
        vel,
        attitude,
        events: undefined,
        x: pos[0],
        y: pos[1],
        z: pos[2],
        vx: vel[0],
        vy: vel[1],
        vz: vel[2],
      };

      const massValue = sanitizeNumber(state?.mass, Number.NaN);
      if (Number.isFinite(massValue)) {
        frame.mass = massValue;
      }

      if (typeof state?.stageIndex === 'number') {
        frame.stageIndex = state.stageIndex;
      }

      const events: string[] = [];
      if (state?.dynamicPressure && result?.maxQ?.time !== undefined && Math.abs(t - result.maxQ.time) < 0.1) {
        events.push('maxQ');
      }
      if (state?.remainingFuel !== undefined && sanitizeNumber(state.remainingFuel, 0) <= 0) {
        events.push('MECO');
      }
      if (events.length > 0) {
        frame.events = events;
      }

      frames.push(frame);
    }

    if (Array.isArray(result?.stagingEvents)) {
      for (const event of result.stagingEvents) {
        const eventTime = sanitizeNumber(event?.time, NaN);
        if (!Number.isFinite(eventTime)) continue;
        const frame = frames.find((f) => Math.abs(f.t - eventTime) < 0.1);
        if (frame) {
          frame.events = [...(frame.events ?? []), 'stageSep'];
        }
      }
    }

    if (isDevEnv()) {
      console.debug(`TrajectoryConvert: frames=${frames.length}`, {
        rawResult: {
          hasStates: Boolean(result?.states),
          totalStates: Array.isArray(result?.states) ? result.states.length : 0,
        },
        framesCount: frames.length,
        firstFrame: frames[0],
      });
    }

    return {
      frames,
      metadata: {
        planet: planet?.id || 'earth',
        coordFrame: mode === '3D' ? 'ECEF' : 'ENU',
        planetRadius,
      },
    };
  } catch (error) {
    console.error('TrajectoryConvert failed', error, { result, mode, planet });
    return EMPTY_TRAJECTORY(planet);
  }
}
