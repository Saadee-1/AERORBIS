import type { AeroverseAIPayload } from '@/ai/schema/AerorbisPayload';
import { buildPowerSystemPayload } from './utils/payloadBuilder';
import { simulateMission, MissionPhase, MissionResult, PowerLoad } from './utils/missionEngine';
import { BatteryPack } from './utils/batteryModel';
import { SolarConfig } from './utils/solarModel';
import { getBatteryChemistry } from './data/batteryChemistries';

// TODO: refine type for `ToolContextUpdater` — changed any -> unknown automatically by chore/typed-cleanup
type ToolContextUpdater = (ctx: { tool: string; inputs: Record<string, unknown>; results: Record<string, unknown> }) => void;

export interface PowerSimulationConfig {
  pack: BatteryPack;
  solarConfig: SolarConfig;
  loads: PowerLoad;
  phases: MissionPhase[];
  location: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  dayOfYear: number;
}

export interface PowerHandleOptions extends Partial<PowerSimulationConfig> {
  updateToolContext?: ToolContextUpdater;
}

const createDefaultBatteryPack = (): BatteryPack => {
  const chemistry = getBatteryChemistry('lipo');
  if (!chemistry) {
    throw new Error('Default battery chemistry not found');
  }
  return {
    chemistry,
    capacity_mAh: 5000,
    S_count: 4,
    P_count: 1,
    cycles: 0,
    temperature: 25,
  };
};

const DEFAULT_SOLAR_CONFIG: SolarConfig = {
  area_m2: 0.5,
  efficiency: 0.22,
  mpptEfficiency: 0.95,
  tilt: 30,
  azimuth: 180,
};

const DEFAULT_LOADS: PowerLoad = {
  propulsion: 200,
  avionics: 10,
  servos: 5,
  cameras: 5,
  telemetry: 2,
};

const DEFAULT_PHASES: MissionPhase[] = [
  {
    name: 'Takeoff',
    startTime_min: 0,
    duration_min: 2,
    loadMultiplier: 2.0,
    solarAvailable: true,
    altitude: 0,
  },
  {
    name: 'Cruise',
    startTime_min: 2,
    duration_min: 60,
    loadMultiplier: 1.0,
    solarAvailable: true,
    altitude: 1000,
  },
];

const DEFAULT_LOCATION = {
  latitude: 40.0,
  longitude: -74.0,
  altitude: 0,
};

const DEFAULT_DAY_OF_YEAR = 180;

export const buildDefaultPowerSimulationConfig = (): PowerSimulationConfig => ({
  pack: createDefaultBatteryPack(),
  solarConfig: { ...DEFAULT_SOLAR_CONFIG },
  loads: { ...DEFAULT_LOADS },
  phases: DEFAULT_PHASES.map((phase) => ({ ...phase })),
  location: { ...DEFAULT_LOCATION },
  dayOfYear: DEFAULT_DAY_OF_YEAR,
});

const runSimulation = (config: PowerSimulationConfig): { missionResult: MissionResult; payload: AeroverseAIPayload } => {
  const missionResult = simulateMission(
    config.pack,
    config.solarConfig,
    config.loads,
    config.phases,
    config.location,
    config.dayOfYear,
    1
  );

  const payload = buildPowerSystemPayload(
    config.pack,
    config.solarConfig,
    config.loads,
    config.location,
    config.dayOfYear,
    missionResult
  );

  return { missionResult, payload };
};

export async function handleCalculate(options: PowerHandleOptions = {}): Promise<AeroverseAIPayload> {
  const defaults = buildDefaultPowerSimulationConfig();
  const config: PowerSimulationConfig = {
    pack: options.pack ?? defaults.pack,
    solarConfig: options.solarConfig ?? defaults.solarConfig,
    loads: options.loads ?? defaults.loads,
    phases: options.phases ?? defaults.phases,
    location: options.location ?? defaults.location,
    dayOfYear: options.dayOfYear ?? defaults.dayOfYear,
  };

  const { payload } = runSimulation(config);

  options.updateToolContext?.({
    tool: 'Battery & Solar Power System',
    inputs: payload.inputs,
    results: payload.results,
  });

  return payload;
}

export { runSimulation as runPowerSystemTestSimulation };
