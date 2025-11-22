import type { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { PLANETS, Planet } from './data/planets';
import { Stage } from './utils/physics/staging';
import { run1D } from './utils/solver/run1d';
import { GuidanceProfile } from './utils/solver/run2d';
import { Guidance3D } from './utils/solver/run3d';
import { buildTrajectoryPayload, AdvancedFeatures } from './utils/payloadBuilder';

type ToolContextUpdater = (ctx: { tool: string; inputs: Record<string, any>; results: Record<string, any> }) => void;

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
  const planet = getPlanet(options.planetId);
  const stages = options.stages ?? [DEFAULT_STAGE];
  const mode = options.mode ?? '1D';
  const timeStep = options.timeStep ?? 0.1;
  const maxTime = options.maxTime ?? 1000;
  const maxAltitude = options.maxAltitude ?? 1_000_000;

  let result1D = null;
  let result2D = null;
  let result3D = null;

  if (mode === '1D') {
    result1D = run1D({ planet, stages, timeStep, maxTime, maxAltitude });
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

  options.updateToolContext?.({
    tool: 'Rocket Trajectory Simulator',
    inputs: payload.inputs,
    results: payload.results,
  });

  return payload;
}

