/**
 * Complete rocket presets for trajectory simulation
 * Each preset defines multi-stage configuration + recommended guidance + mode
 */

import { Stage } from '../utils/physics/staging';
import { GuidanceProfile } from '../utils/solver/run2d';

export interface RocketPreset {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: 'orbital' | 'suborbital' | 'heavy' | 'model';
  stages: Stage[];
  recommendedMode: '1D' | '2D';
  guidance: GuidanceProfile;
  maxTime: number;
  maxAltitude: number; // km
  timeStep: number;
}

export const ROCKET_PRESETS: RocketPreset[] = [
  // ── Falcon 9 ──────────────────────────────────────────
  {
    id: 'falcon-9',
    name: 'Falcon 9',
    description: '2-stage orbital launcher by SpaceX. LEO capable.',
    icon: '🦅',
    category: 'orbital',
    stages: [
      {
        id: 'f9-s1',
        name: 'Falcon 9 – Stage 1',
        dryMass: 25600,
        fuelMass: 411000,
        engines: [{ id: 'merlin-1d', count: 9, isp: 282, thrust: 845000 }],
        Cd: 0.5,
        area: 10.52,
        separationAltitude: 80000,
      },
      {
        id: 'f9-s2',
        name: 'Falcon 9 – Stage 2',
        dryMass: 4000,
        fuelMass: 111500,
        engines: [{ id: 'mvac', count: 1, isp: 348, thrust: 934000 }],
        Cd: 0.3,
        area: 10.52,
      },
    ],
    recommendedMode: '2D',
    guidance: { type: 'gravity_turn', initialPitch: 90 },
    maxTime: 600,
    maxAltitude: 400,
    timeStep: 0.5,
  },

  // ── Saturn V ──────────────────────────────────────────
  {
    id: 'saturn-v',
    name: 'Saturn V',
    description: 'NASA Moon rocket. 3-stage super-heavy lift vehicle.',
    icon: '🌙',
    category: 'heavy',
    stages: [
      {
        id: 'sv-s1',
        name: 'Saturn V – S-IC',
        dryMass: 131000,
        fuelMass: 2160000,
        engines: [{ id: 'f1', count: 5, isp: 263, thrust: 6770000 }],
        Cd: 0.5,
        area: 78.5, // 10m diameter
        separationAltitude: 67000,
      },
      {
        id: 'sv-s2',
        name: 'Saturn V – S-II',
        dryMass: 36000,
        fuelMass: 444000,
        engines: [{ id: 'j2', count: 5, isp: 421, thrust: 1033000 }],
        Cd: 0.4,
        area: 78.5,
        separationAltitude: 185000,
      },
      {
        id: 'sv-s3',
        name: 'Saturn V – S-IVB',
        dryMass: 13300,
        fuelMass: 109000,
        engines: [{ id: 'j2-single', count: 1, isp: 421, thrust: 1033000 }],
        Cd: 0.3,
        area: 38.5,
      },
    ],
    recommendedMode: '2D',
    guidance: { type: 'gravity_turn', initialPitch: 90 },
    maxTime: 800,
    maxAltitude: 500,
    timeStep: 0.5,
  },

  // ── Starship ──────────────────────────────────────────
  {
    id: 'starship',
    name: 'Starship',
    description: 'SpaceX fully-reusable super-heavy lift system.',
    icon: '⭐',
    category: 'heavy',
    stages: [
      {
        id: 'sh-booster',
        name: 'Super Heavy Booster',
        dryMass: 200000,
        fuelMass: 3400000,
        engines: [{ id: 'raptor', count: 33, isp: 330, thrust: 2200000 }],
        Cd: 0.4,
        area: 63.6, // 9m diameter
        separationAltitude: 70000,
      },
      {
        id: 'sh-ship',
        name: 'Starship Upper Stage',
        dryMass: 120000,
        fuelMass: 1200000,
        engines: [{ id: 'raptor-vac', count: 3, isp: 380, thrust: 2200000 }],
        Cd: 0.3,
        area: 63.6,
      },
    ],
    recommendedMode: '2D',
    guidance: { type: 'gravity_turn', initialPitch: 90 },
    maxTime: 600,
    maxAltitude: 400,
    timeStep: 0.5,
  },

  // ── Atlas V ───────────────────────────────────────────
  {
    id: 'atlas-v',
    name: 'Atlas V 401',
    description: 'ULA workhorse. Medium-lift 2-stage orbital vehicle.',
    icon: '🔵',
    category: 'orbital',
    stages: [
      {
        id: 'av-ccb',
        name: 'Atlas V – CCB',
        dryMass: 21000,
        fuelMass: 284000,
        engines: [{ id: 'rd-180', count: 1, isp: 311, thrust: 4152000 }],
        Cd: 0.5,
        area: 11.9,
        separationAltitude: 100000,
      },
      {
        id: 'av-centaur',
        name: 'Atlas V – Centaur',
        dryMass: 2200,
        fuelMass: 20800,
        engines: [{ id: 'rl-10', count: 1, isp: 451, thrust: 99200 }],
        Cd: 0.3,
        area: 11.9,
      },
    ],
    recommendedMode: '2D',
    guidance: { type: 'gravity_turn', initialPitch: 90 },
    maxTime: 1200,
    maxAltitude: 400,
    timeStep: 0.5,
  },

  // ── Sounding Rocket ───────────────────────────────────
  {
    id: 'sounding-rocket',
    name: 'Sounding Rocket',
    description: 'Single-stage suborbital research rocket. ~150 km apogee.',
    icon: '🔬',
    category: 'suborbital',
    stages: [
      {
        id: 'sr-s1',
        name: 'Sounding Rocket',
        dryMass: 300,
        fuelMass: 800,
        engines: [{ id: 'sr-motor', count: 1, isp: 240, thrust: 80000 }],
        Cd: 0.4,
        area: 0.1,
      },
    ],
    recommendedMode: '1D',
    guidance: { type: 'gravity_turn', initialPitch: 90 },
    maxTime: 400,
    maxAltitude: 200,
    timeStep: 0.1,
  },

  // ── Electron ──────────────────────────────────────────
  {
    id: 'electron',
    name: 'Electron',
    description: 'Rocket Lab small-sat launcher. 2-stage to LEO.',
    icon: '⚡',
    category: 'orbital',
    stages: [
      {
        id: 'el-s1',
        name: 'Electron – Stage 1',
        dryMass: 950,
        fuelMass: 9250,
        engines: [{ id: 'rutherford', count: 9, isp: 303, thrust: 24900 }],
        Cd: 0.5,
        area: 0.95, // 1.1m diameter
        separationAltitude: 80000,
      },
      {
        id: 'el-s2',
        name: 'Electron – Stage 2',
        dryMass: 250,
        fuelMass: 2050,
        engines: [{ id: 'rutherford-vac', count: 1, isp: 343, thrust: 25800 }],
        Cd: 0.3,
        area: 0.95,
      },
    ],
    recommendedMode: '2D',
    guidance: { type: 'gravity_turn', initialPitch: 90 },
    maxTime: 600,
    maxAltitude: 500,
    timeStep: 0.2,
  },

  // ── Model Rocket ──────────────────────────────────────
  {
    id: 'model-rocket',
    name: 'Model Rocket',
    description: 'Estes-style hobby rocket. ~300m altitude.',
    icon: '🎯',
    category: 'model',
    stages: [
      {
        id: 'mr-s1',
        name: 'Model Rocket',
        dryMass: 0.1,
        fuelMass: 0.05,
        engines: [{ id: 'rc-motor', count: 1, isp: 50, thrust: 50 }],
        Cd: 0.75,
        area: 0.001,
      },
    ],
    recommendedMode: '1D',
    guidance: { type: 'gravity_turn', initialPitch: 90 },
    maxTime: 30,
    maxAltitude: 1,
    timeStep: 0.01,
  },
];

export function getRocketPreset(id: string): RocketPreset | undefined {
  return ROCKET_PRESETS.find(p => p.id === id);
}

export function getRocketPresetsByCategory(category: RocketPreset['category']): RocketPreset[] {
  return ROCKET_PRESETS.filter(p => p.category === category);
}
