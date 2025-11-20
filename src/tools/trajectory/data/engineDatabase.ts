/**
 * Comprehensive Rocket Engine Database
 * Includes chemical, solid, and electric propulsion systems
 */

export interface EngineDatabaseEntry {
  id: string;
  name: string;
  manufacturer?: string;
  type: 'chemical' | 'solid' | 'electric' | 'hybrid';
  fuelType?: string;
  oxidizerType?: string;
  thrustVac: number; // N
  thrustSL?: number; // N (sea level)
  ispVac: number; // s
  ispSL?: number; // s
  mass: number; // kg
  throttleRange?: [number, number]; // [min, max] throttle (0-1)
  thrustCurve?: Array<{ t: number; thrust: number }>;
  notes?: string;
  category: 'booster' | 'sustainer' | 'upper' | 'vernier' | 'rcs';
}

export const ENGINE_DATABASE: Record<string, EngineDatabaseEntry> = {
  // Chemical Engines - Liquid
  'merlin-1d': {
    id: 'merlin-1d',
    name: 'Merlin 1D',
    manufacturer: 'SpaceX',
    type: 'chemical',
    fuelType: 'RP-1',
    oxidizerType: 'LOX',
    thrustVac: 934000,
    thrustSL: 845000,
    ispVac: 311,
    ispSL: 282,
    mass: 470,
    throttleRange: [0.4, 1.0],
    category: 'booster',
    notes: 'Falcon 9 first stage engine',
  },
  'merlin-1d-vac': {
    id: 'merlin-1d-vac',
    name: 'Merlin 1D Vacuum',
    manufacturer: 'SpaceX',
    type: 'chemical',
    fuelType: 'RP-1',
    oxidizerType: 'LOX',
    thrustVac: 981000,
    ispVac: 348,
    mass: 470,
    throttleRange: [0.4, 1.0],
    category: 'upper',
    notes: 'Falcon 9 second stage engine',
  },
  'raptor': {
    id: 'raptor',
    name: 'Raptor',
    manufacturer: 'SpaceX',
    type: 'chemical',
    fuelType: 'CH4',
    oxidizerType: 'LOX',
    thrustVac: 2300000,
    thrustSL: 2200000,
    ispVac: 380,
    ispSL: 330,
    mass: 1500,
    throttleRange: [0.2, 1.0],
    category: 'booster',
    notes: 'Starship engine, full-flow staged combustion',
  },
  'rs-25': {
    id: 'rs-25',
    name: 'RS-25',
    manufacturer: 'Aerojet Rocketdyne',
    type: 'chemical',
    fuelType: 'LH2',
    oxidizerType: 'LOX',
    thrustVac: 2320000,
    thrustSL: 1860000,
    ispVac: 452,
    ispSL: 366,
    mass: 3527,
    throttleRange: [0.67, 1.09],
    category: 'booster',
    notes: 'Space Shuttle Main Engine (SSME)',
  },
  'f-1': {
    id: 'f-1',
    name: 'F-1',
    manufacturer: 'Rocketdyne',
    type: 'chemical',
    fuelType: 'RP-1',
    oxidizerType: 'LOX',
    thrustVac: 7746000,
    thrustSL: 6804000,
    ispVac: 304,
    ispSL: 263,
    mass: 8400,
    throttleRange: [0.8, 1.0],
    category: 'booster',
    notes: 'Saturn V first stage engine',
  },
  'be-4': {
    id: 'be-4',
    name: 'BE-4',
    manufacturer: 'Blue Origin',
    type: 'chemical',
    fuelType: 'CH4',
    oxidizerType: 'LOX',
    thrustVac: 2700000,
    thrustSL: 2400000,
    ispVac: 339,
    ispSL: 298,
    mass: 6000,
    throttleRange: [0.4, 1.0],
    category: 'booster',
    notes: 'Vulcan Centaur first stage engine',
  },
  'rl-10': {
    id: 'rl-10',
    name: 'RL-10',
    manufacturer: 'Aerojet Rocketdyne',
    type: 'chemical',
    fuelType: 'LH2',
    oxidizerType: 'LOX',
    thrustVac: 110000,
    ispVac: 465,
    mass: 135,
    throttleRange: [0.5, 1.0],
    category: 'upper',
    notes: 'Centaur upper stage engine',
  },
  'rd-180': {
    id: 'rd-180',
    name: 'RD-180',
    manufacturer: 'NPO Energomash',
    type: 'chemical',
    fuelType: 'RP-1',
    oxidizerType: 'LOX',
    thrustVac: 4152000,
    thrustSL: 3830000,
    ispVac: 311,
    ispSL: 311,
    mass: 5480,
    throttleRange: [0.47, 1.0],
    category: 'booster',
    notes: 'Atlas V first stage engine',
  },

  // Solid Motors
  'srb': {
    id: 'srb',
    name: 'Space Shuttle SRB',
    manufacturer: 'Thiokol',
    type: 'solid',
    thrustVac: 13100000,
    thrustSL: 12000000,
    ispVac: 268,
    ispSL: 242,
    mass: 59000,
    thrustCurve: [
      { t: 0, thrust: 12000000 },
      { t: 10, thrust: 13000000 },
      { t: 50, thrust: 11000000 },
      { t: 100, thrust: 8000000 },
      { t: 120, thrust: 0 },
    ],
    category: 'booster',
    notes: 'Space Shuttle Solid Rocket Booster',
  },
  'star-48': {
    id: 'star-48',
    name: 'Star 48',
    manufacturer: 'ATK',
    type: 'solid',
    thrustVac: 66000,
    ispVac: 292,
    mass: 2140,
    thrustCurve: [
      { t: 0, thrust: 66000 },
      { t: 1, thrust: 66000 },
      { t: 80, thrust: 0 },
    ],
    category: 'upper',
    notes: 'Upper stage solid motor',
  },
  'star-37': {
    id: 'star-37',
    name: 'Star 37',
    manufacturer: 'ATK',
    type: 'solid',
    thrustVac: 44000,
    ispVac: 285,
    mass: 1120,
    thrustCurve: [
      { t: 0, thrust: 44000 },
      { t: 0.5, thrust: 44000 },
      { t: 40, thrust: 0 },
    ],
    category: 'upper',
    notes: 'Upper stage solid motor',
  },

  // Electric Engines
  'hall-thruster': {
    id: 'hall-thruster',
    name: 'Hall Effect Thruster',
    manufacturer: 'Various',
    type: 'electric',
    thrustVac: 100,
    ispVac: 2000,
    mass: 5,
    throttleRange: [0, 1.0],
    category: 'upper',
    notes: 'Typical Hall thruster for satellites',
  },
  'ion-thruster': {
    id: 'ion-thruster',
    name: 'Ion Thruster',
    manufacturer: 'Various',
    type: 'electric',
    thrustVac: 50,
    ispVac: 3000,
    mass: 3,
    throttleRange: [0, 1.0],
    category: 'upper',
    notes: 'High Isp electric propulsion',
  },
  'xenon-ion': {
    id: 'xenon-ion',
    name: 'Xenon Ion Thruster',
    manufacturer: 'Various',
    type: 'electric',
    thrustVac: 200,
    ispVac: 3500,
    mass: 8,
    throttleRange: [0, 1.0],
    category: 'upper',
    notes: 'Advanced ion propulsion system',
  },
};

/**
 * Get engine by ID
 */
export function getEngineFromDatabase(id: string): EngineDatabaseEntry | undefined {
  return ENGINE_DATABASE[id];
}

/**
 * Get all engines
 */
export function getAllEnginesFromDatabase(): EngineDatabaseEntry[] {
  return Object.values(ENGINE_DATABASE);
}

/**
 * Get engines by type
 */
export function getEnginesByType(type: EngineDatabaseEntry['type']): EngineDatabaseEntry[] {
  return Object.values(ENGINE_DATABASE).filter(engine => engine.type === type);
}

/**
 * Get engines by category
 */
export function getEnginesByCategory(category: EngineDatabaseEntry['category']): EngineDatabaseEntry[] {
  return Object.values(ENGINE_DATABASE).filter(engine => engine.category === category);
}

/**
 * Search engines by name
 */
export function searchEngines(query: string): EngineDatabaseEntry[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(ENGINE_DATABASE).filter(engine =>
    engine.name.toLowerCase().includes(lowerQuery) ||
    engine.manufacturer?.toLowerCase().includes(lowerQuery) ||
    engine.id.toLowerCase().includes(lowerQuery)
  );
}
