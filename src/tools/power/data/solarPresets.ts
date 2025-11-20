/**
 * Solar Panel Presets
 * Common solar panel configurations for aerospace applications
 */

export interface SolarPreset {
  id: string;
  name: string;
  area: number; // m²
  efficiency: number; // 0-1 (e.g., 0.22 = 22%)
  mpptEfficiency: number; // 0-1 (typically 0.95-0.98)
  mass: number; // kg
  notes: string;
}

export const SOLAR_PRESETS: Record<string, SolarPreset> = {
  small_uav: {
    id: 'small_uav',
    name: 'Small UAV Panel',
    area: 0.1,
    efficiency: 0.22,
    mpptEfficiency: 0.95,
    mass: 0.2,
    notes: 'Typical for small fixed-wing UAVs',
  },
  medium_uav: {
    id: 'medium_uav',
    name: 'Medium UAV Panel',
    area: 0.5,
    efficiency: 0.22,
    mpptEfficiency: 0.96,
    mass: 1.0,
    notes: 'For medium-sized solar aircraft',
  },
  large_uav: {
    id: 'large_uav',
    name: 'Large UAV Panel',
    area: 2.0,
    efficiency: 0.24,
    mpptEfficiency: 0.97,
    mass: 4.0,
    notes: 'High-altitude platform (HAPS) class',
  },
  cubesat_1u: {
    id: 'cubesat_1u',
    name: 'CubeSat 1U Panel',
    area: 0.01,
    efficiency: 0.30,
    mpptEfficiency: 0.98,
    mass: 0.02,
    notes: 'High-efficiency space-grade cells',
  },
  cubesat_3u: {
    id: 'cubesat_3u',
    name: 'CubeSat 3U Panel',
    area: 0.05,
    efficiency: 0.30,
    mpptEfficiency: 0.98,
    mass: 0.1,
    notes: '3U CubeSat deployable panels',
  },
  custom: {
    id: 'custom',
    name: 'Custom Configuration',
    area: 1.0,
    efficiency: 0.22,
    mpptEfficiency: 0.95,
    mass: 2.0,
    notes: 'User-defined configuration',
  },
};

export function getSolarPreset(id: string): SolarPreset | undefined {
  return SOLAR_PRESETS[id];
}
