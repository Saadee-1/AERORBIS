import type { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { PLANETS, Planet } from './data/planets';
import { Stage } from './utils/physics/staging';
import { run1D } from './utils/solver/run1d';
import { GuidanceProfile } from './utils/solver/run2d';
import { Guidance3D } from './utils/solver/run3d';
import { buildTrajectoryPayload, AdvancedFeatures } from './utils/payloadBuilder';
import { isDevEnv } from '@/lib/env';

// TODO: refine type for `ToolContextUpdater` — changed any -> unknown automatically by chore/typed-cleanup
type ToolContextUpdater = (ctx: { tool: string; inputs: Record<string, unknown>; results: Record<string, unknown> }) => void;

export interface TrajectoryHandleOptions {
  planetId?: string;
  stages?: Stage[];
  mode?: '1D' | '2D' | '3D';
  guidance2D?: GuidanceProfile;
  guidance3D?: Guidance3D;
  timeStep?: number;
  maxTime?: number;
  maxAltitude?: number;
  updateToolContext?: ToolContextUpdater;
}

const DEFAULT_STAGE: Stage = {
  id: 'stage-1',
  dryMass: 1000,
  fuelMass: 5000,
  engines: [{ id: 'merlin-1d', count: 1, isp: 282, thrust: 845000 }],
  Cd: 0.5,
  area: 1.0,
};

const DEFAULT_ADVANCED_FEATURES: AdvancedFeatures = {
  performanceMode: 'fast',
  enableJ2: false,
  enableAerobraking: false,
  enableMissileMode: false,
  enableGuidedMode: false,
  enableKepler: false,
  enable3D: false,
  engineDatabaseUsed: false,
  downsampleOutput: false,
};

const getPlanet = (planetId?: string): Planet => {
  if (!planetId) return PLANETS.earth;
  return PLANETS[planetId] ?? PLANETS.earth;
};

export async function handleCalculate(options: TrajectoryHandleOptions = {}): Promise<AeroverseAIPayload> {
  const IS_DEV = isDevEnv();
  const planet = getPlanet(options.planetId);
  const stages = options.stages ?? [DEFAULT_STAGE];
  const mode = options.mode ?? '1D';
  const timeStep = options.timeStep ?? 0.1;
  const maxTime = options.maxTime ?? 1000;
  const maxAltitude = options.maxAltitude ?? 1_000_000;

  if (IS_DEV) {
    console.debug('handleCalculate: starting', {
      mode,
      planetId: planet.id,
      stagesCount: stages.length,
      timeStep,
      maxTime,
      maxAltitude,
    });
  }

  let result1D = null;
  let result2D = null;
  let result3D = null;

  if (mode === '1D') {
    result1D = run1D({ planet, stages, timeStep, maxTime, maxAltitude });
    if (IS_DEV && result1D) {
      console.debug('handleCalculate: 1D result', {
        statesCount: result1D.states?.length ?? 0,
        maxAltitude: result1D.maxAltitude,
        maxVelocity: result1D.maxVelocity,
      });
    }
  } else if (mode === '2D') {
    const { run2D } = await import('./utils/solver/run2d');
    result2D = run2D({
      planet,
      stages,
      guidance: options.guidance2D ?? { type: 'gravity_turn', initialPitch: 90 },
      timeStep,
      maxTime,
      maxAltitude,
    });
    if (IS_DEV && result2D) {
      console.debug('handleCalculate: 2D result', {
        statesCount: result2D.states?.length ?? 0,
        maxAltitude: result2D.maxAltitude,
        maxVelocity: result2D.maxVelocity,
      });
    }
  } else {
    const { run3D } = await import('./utils/solver/run3d');
    result3D = run3D({
      planet,
      stages,
      guidance: options.guidance3D ?? {},
      timeStep,
      maxTime,
      maxAltitude,
    });
    if (IS_DEV && result3D) {
      console.debug('handleCalculate: 3D result', {
        statesCount: result3D.states?.length ?? 0,
        maxAltitude: result3D.maxAltitude,
        maxVelocity: result3D.maxVelocity,
      });
    }
  }

  const payload = buildTrajectoryPayload({
    mode,
    planet,
    stages,
    guidance: mode === '2D' ? options.guidance2D : mode === '3D' ? options.guidance3D : undefined,
    result1D,
    result2D,
    result3D,
    advancedFeatures: DEFAULT_ADVANCED_FEATURES,
  });

  // Log trajectory conversion info
  const currentResult = mode === '1D' ? result1D : mode === '2D' ? result2D : result3D;
  if (IS_DEV && currentResult) {
    const statesCount = currentResult.states?.length ?? 0;
    console.debug('VisualizerState: OK', {
      totalFrames: statesCount,
      isPlaying: false,
      mode,
      planetId: planet.id,
    });
  }

  options.updateToolContext?.({
    tool: 'Rocket Trajectory Simulator',
    inputs: payload.inputs,
    results: payload.results,
  });

  if (IS_DEV) {
    console.debug('handleCalculate: completed', {
      mode,
      hasPayload: Boolean(payload),
      hasResults: Boolean(payload.results),
    });
  }

  return payload;
}

