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
  frames: [
    {
      t: 0,
      pos: [0, 0, sanitizeNumber(planet?.radius, 6_371_000)],
      vel: [0, 0, 0],
      x: 0,
      y: 0,
      z: sanitizeNumber(planet?.radius, 6_371_000),
      vx: 0,
      vy: 0,
      vz: 0,
    },
  ],
  metadata: {
    planet: planet?.id || 'earth',
    coordFrame: 'ECEF',
    planetRadius: planet?.radius || 6_371_000,
  },
});

const isValidFrame = (frame: TrajectoryFrame | undefined): frame is TrajectoryFrame => {
  if (!frame) return false;
  const values = [
    frame.t,
    ...frame.pos,
    ...frame.vel,
    frame.x,
    frame.y,
    frame.z,
    frame.vx,
    frame.vy,
    frame.vz,
  ];
  return values.every((value) => typeof value === 'number' && Number.isFinite(value));
};

interface SimulationResultInput {
  states?: Array<Record<string, unknown>>;
  maxQ?: { time?: number };
  stagingEvents?: Array<{ time?: number }>;
}

export function convertSimulationToTrajectoryData(
  result: unknown,
  mode: '1D' | '2D' | '3D',
  planet: PlanetLite,
): TrajectoryData {
  try {
    const typedResult = result as SimulationResultInput | null | undefined;
    if (!typedResult || !Array.isArray(typedResult.states) || typedResult.states.length === 0) {
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

    for (const state of typedResult.states) {
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
      if (state?.dynamicPressure && typedResult?.maxQ?.time !== undefined && Math.abs(t - typedResult.maxQ.time) < 0.1) {
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

    if (Array.isArray(typedResult?.stagingEvents)) {
      for (const event of typedResult.stagingEvents) {
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
          hasStates: Boolean(typedResult?.states),
          totalStates: Array.isArray(typedResult?.states) ? typedResult.states.length : 0,
        },
        framesCount: frames.length,
        firstFrame: frames[0],
      });
    }

      const filteredFrames = frames.filter(isValidFrame);

      if (!filteredFrames.length) {
        return EMPTY_TRAJECTORY(planet);
      }

      return {
        frames: filteredFrames,
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
