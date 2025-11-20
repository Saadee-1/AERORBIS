/**
 * Engine presets for trajectory simulation
 */

import { Engine } from '../utils/physics/thrust';

export const ENGINE_PRESETS: Record<string, Engine> = {
  'merlin-1d': {
    id: 'merlin-1d',
    name: 'Merlin 1D (Falcon 9)',
    isp: 282, // s (vacuum)
    thrust: 845000, // N (sea level)
    throttleable: true,
    minThrottle: 0.4,
    maxThrottle: 1.0,
  },
  'raptor': {
    id: 'raptor',
    name: 'Raptor (Starship)',
    isp: 380, // s (vacuum)
    thrust: 2200000, // N (sea level)
    throttleable: true,
    minThrottle: 0.2,
    maxThrottle: 1.0,
  },
  'rd-180': {
    id: 'rd-180',
    name: 'RD-180 (Atlas V)',
    isp: 311, // s (vacuum)
    thrust: 4152000, // N (sea level)
    throttleable: false,
  },
  'solid-booster': {
    id: 'solid-booster',
    name: 'Solid Rocket Booster',
    isp: 250, // s
    thrust: {
      type: 'piecewise',
      points: [
        { t: 0, thrust: 1000000 },
        { t: 10, thrust: 1200000 },
        { t: 50, thrust: 800000 },
        { t: 100, thrust: 0 },
      ],
    },
    throttleable: false,
  },
  'electric-thruster': {
    id: 'electric-thruster',
    name: 'Electric Thruster (Ion)',
    isp: 3000, // s
    thrust: 100, // N (very low thrust)
    throttleable: true,
    minThrottle: 0,
    maxThrottle: 1.0,
  },
  'rc-motor': {
    id: 'rc-motor',
    name: 'RC Model Rocket Motor',
    isp: 50, // s
    thrust: {
      type: 'piecewise',
      points: [
        { t: 0, thrust: 50 },
        { t: 0.5, thrust: 50 },
        { t: 1.0, thrust: 0 },
      ],
    },
    throttleable: false,
  },
};

/**
 * Get engine by ID
 */
export function getEngine(id: string): Engine | undefined {
  return ENGINE_PRESETS[id];
}

/**
 * Get all engines
 */
export function getAllEngines(): Engine[] {
  return Object.values(ENGINE_PRESETS);
}
