/**
 * Stage presets for trajectory simulation
 */

import { Stage } from '../utils/physics/staging';

export const STAGE_PRESETS: Record<string, Stage> = {
  'falcon9-first': {
    id: 'falcon9-first',
    name: 'Falcon 9 First Stage',
    dryMass: 25600, // kg
    fuelMass: 411000, // kg
    engines: [
      { id: 'merlin-1d', count: 9, isp: 282, thrust: 845000 },
    ],
    Cd: 0.5,
    area: 10.0, // m²
    separationAltitude: 70000, // m
  },
  'falcon9-second': {
    id: 'falcon9-second',
    name: 'Falcon 9 Second Stage',
    dryMass: 4000, // kg
    fuelMass: 111500, // kg
    engines: [
      { id: 'merlin-1d', count: 1, isp: 348, thrust: 934000 }, // Vacuum optimized
    ],
    Cd: 0.3,
    area: 3.0, // m²
  },
  'starship-first': {
    id: 'starship-first',
    name: 'Starship Booster',
    dryMass: 200000, // kg
    fuelMass: 3400000, // kg
    engines: [
      { id: 'raptor', count: 33, isp: 330, thrust: 2200000 },
    ],
    Cd: 0.4,
    area: 200.0, // m²
    separationAltitude: 70000,
  },
  'starship-second': {
    id: 'starship-second',
    name: 'Starship Upper Stage',
    dryMass: 120000, // kg
    fuelMass: 1200000, // kg
    engines: [
      { id: 'raptor', count: 6, isp: 380, thrust: 2200000 },
    ],
    Cd: 0.3,
    area: 50.0, // m²
  },
  'rc-model': {
    id: 'rc-model',
    name: 'RC Model Rocket',
    dryMass: 0.1, // kg
    fuelMass: 0.05, // kg
    engines: [
      { id: 'rc-motor', count: 1, isp: 50, thrust: 50 },
    ],
    Cd: 0.75,
    area: 0.001, // m²
  },
};

/**
 * Get stage by ID
 */
export function getStage(id: string): Stage | undefined {
  return STAGE_PRESETS[id];
}

/**
 * Get all stages
 */
export function getAllStages(): Stage[] {
  return Object.values(STAGE_PRESETS);
}
