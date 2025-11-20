/**
 * Solar Power System Modeling
 * Wrapper functions for solar calculations
 */

import { calculateSunVector, calculateSolarPower, SunVector, Location } from './sunVector';

export interface SolarConfig {
  area_m2: number;
  efficiency: number; // 0-1
  mpptEfficiency: number; // 0-1
  tilt: number; // degrees from horizontal
  azimuth: number; // degrees (0 = North, 90 = East, 180 = South, 270 = West)
}

export interface SolarState {
  power_W: number;
  sunVector: SunVector;
  available: boolean; // whether solar is available (day/night)
}

/**
 * Calculate solar power for given conditions
 */
export function calculateSolarGeneration(
  config: SolarConfig,
  location: Location,
  dayOfYear: number,
  solarTime: number
): SolarState {
  const sunVector = calculateSunVector(location, dayOfYear, solarTime);
  const available = sunVector.elevation > 0;
  
  const power_W = available
    ? calculateSolarPower(
        config.area_m2,
        config.efficiency,
        config.mpptEfficiency,
        sunVector,
        config.tilt,
        config.azimuth
      )
    : 0;
  
  return {
    power_W,
    sunVector,
    available,
  };
}

/**
 * Generate solar power timeline for mission
 */
export function generateSolarTimeline(
  config: SolarConfig,
  location: Location,
  dayOfYear: number,
  startTime_min: number,
  duration_min: number,
  timeStep_min: number = 1
): Array<{ time_min: number; solarState: SolarState }> {
  const timeline: Array<{ time_min: number; solarState: SolarState }> = [];
  
  for (let t = 0; t <= duration_min; t += timeStep_min) {
    const missionTime_min = startTime_min + t;
    const solarTime = (missionTime_min / 60) % 24; // Convert to hours, wrap to 24h
    
    const solarState = calculateSolarGeneration(config, location, dayOfYear, solarTime);
    timeline.push({
      time_min: t,
      solarState,
    });
  }
  
  return timeline;
}
