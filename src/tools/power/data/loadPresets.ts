/**
 * Power Load Presets
 * Common load profiles for different vehicle types
 */

export interface LoadPreset {
  id: string;
  name: string;
  description: string;
  loads: {
    propulsion?: number; // W
    avionics?: number; // W
    servos?: number; // W
    cameras?: number; // W
    telemetry?: number; // W
    payload?: number; // W
    thermal?: number; // W
    adcs?: number; // W (for CubeSats)
    transmitter?: number; // W (for CubeSats)
    obc?: number; // W (for CubeSats)
  };
  notes: string;
}

export const LOAD_PRESETS: Record<string, LoadPreset> = {
  small_quadcopter: {
    id: 'small_quadcopter',
    name: 'Small Quadcopter',
    description: '250-450mm frame, FPV racing',
    loads: {
      propulsion: 200,
      avionics: 5,
      cameras: 2,
      telemetry: 1,
    },
    notes: 'High power during flight, minimal idle',
  },
  medium_quadcopter: {
    id: 'medium_quadcopter',
    name: 'Medium Quadcopter',
    description: '500-700mm frame, photography',
    loads: {
      propulsion: 500,
      avionics: 10,
      cameras: 10,
      telemetry: 2,
      payload: 20,
    },
    notes: 'Moderate power, payload included',
  },
  fixed_wing_uav: {
    id: 'fixed_wing_uav',
    name: 'Fixed-Wing UAV',
    description: 'Small fixed-wing, long-endurance',
    loads: {
      propulsion: 150,
      avionics: 8,
      servos: 5,
      cameras: 5,
      telemetry: 3,
    },
    notes: 'Lower power than multirotor, efficient cruise',
  },
  solar_aircraft: {
    id: 'solar_aircraft',
    name: 'Solar Aircraft',
    description: 'High-altitude solar-powered',
    loads: {
      propulsion: 2000,
      avionics: 50,
      servos: 20,
      telemetry: 10,
      payload: 100,
      thermal: 50,
    },
    notes: 'High power, designed for solar charging',
  },
  cubesat_1u: {
    id: 'cubesat_1u',
    name: 'CubeSat 1U',
    description: '1U CubeSat standard loads',
    loads: {
      adcs: 0.5,
      transmitter: 2.0,
      obc: 0.5,
      payload: 1.0,
    },
    notes: 'Very low power, space-optimized',
  },
  cubesat_3u: {
    id: 'cubesat_3u',
    name: 'CubeSat 3U',
    description: '3U CubeSat with payload',
    loads: {
      adcs: 1.0,
      transmitter: 5.0,
      obc: 1.0,
      payload: 10.0,
    },
    notes: 'Higher power for larger payloads',
  },
  custom: {
    id: 'custom',
    name: 'Custom Load Profile',
    description: 'User-defined power loads',
    loads: {},
    notes: 'Define your own power requirements',
  },
};

export function getLoadPreset(id: string): LoadPreset | undefined {
  return LOAD_PRESETS[id];
}
