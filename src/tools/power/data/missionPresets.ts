/**
 * Mission Profile Presets
 * Common mission timelines for different vehicle types
 */

export interface MissionPhase {
  name: string;
  startTime_min: number; // minutes from mission start
  duration_min: number; // minutes
  loadMultiplier: number; // multiplier for base load (e.g., 1.5 = 150% load)
  solarAvailable: boolean; // whether solar charging is available
  altitude?: number; // m (for atmospheric attenuation)
}

export interface MissionPreset {
  id: string;
  name: string;
  description: string;
  phases: MissionPhase[];
  totalDuration: number; // minutes
  notes: string;
}

export const MISSION_PRESETS: Record<string, MissionPreset> = {
  uav_endurance: {
    id: 'uav_endurance',
    name: 'UAV Endurance Flight',
    description: 'Long-endurance fixed-wing mission',
    phases: [
      { name: 'Takeoff', startTime_min: 0, duration_min: 2, loadMultiplier: 2.0, solarAvailable: true, altitude: 0 },
      { name: 'Climb', startTime_min: 2, duration_min: 5, loadMultiplier: 1.5, solarAvailable: true, altitude: 100 },
      { name: 'Cruise', startTime_min: 7, duration_min: 180, loadMultiplier: 1.0, solarAvailable: true, altitude: 1000 },
      { name: 'Loiter', startTime_min: 187, duration_min: 60, loadMultiplier: 0.8, solarAvailable: true, altitude: 1000 },
      { name: 'Descent', startTime_min: 247, duration_min: 5, loadMultiplier: 0.5, solarAvailable: true, altitude: 100 },
      { name: 'Landing', startTime_min: 252, duration_min: 2, loadMultiplier: 1.2, solarAvailable: true, altitude: 0 },
    ],
    totalDuration: 254,
    notes: 'Typical long-endurance UAV mission with solar charging',
  },
  quadcopter_fpv: {
    id: 'quadcopter_fpv',
    name: 'Quadcopter FPV Flight',
    description: 'High-power FPV racing/acro flight',
    phases: [
      { name: 'Takeoff', startTime_min: 0, duration_min: 0.5, loadMultiplier: 1.5, solarAvailable: false, altitude: 0 },
      { name: 'Flight', startTime_min: 0.5, duration_min: 5, loadMultiplier: 1.8, solarAvailable: false, altitude: 50 },
      { name: 'Landing', startTime_min: 5.5, duration_min: 0.5, loadMultiplier: 1.2, solarAvailable: false, altitude: 0 },
    ],
    totalDuration: 6,
    notes: 'Short, high-power flight, no solar',
  },
  solar_24h: {
    id: 'solar_24h',
    name: '24-Hour Solar Flight',
    description: 'Full day/night cycle with solar',
    phases: [
      { name: 'Takeoff (Dawn)', startTime_min: 0, duration_min: 5, loadMultiplier: 2.0, solarAvailable: true, altitude: 0 },
      { name: 'Morning Cruise', startTime_min: 5, duration_min: 240, loadMultiplier: 1.0, solarAvailable: true, altitude: 15000 },
      { name: 'Midday', startTime_min: 245, duration_min: 300, loadMultiplier: 1.0, solarAvailable: true, altitude: 15000 },
      { name: 'Afternoon', startTime_min: 545, duration_min: 240, loadMultiplier: 1.0, solarAvailable: true, altitude: 15000 },
      { name: 'Evening', startTime_min: 785, duration_min: 120, loadMultiplier: 1.0, solarAvailable: true, altitude: 15000 },
      { name: 'Night', startTime_min: 905, duration_min: 480, loadMultiplier: 0.8, solarAvailable: false, altitude: 15000 },
      { name: 'Dawn', startTime_min: 1385, duration_min: 60, loadMultiplier: 1.0, solarAvailable: true, altitude: 15000 },
    ],
    totalDuration: 1445,
    notes: 'Full 24-hour cycle with night survival',
  },
  cubesat_orbit: {
    id: 'cubesat_orbit',
    name: 'CubeSat Orbit Pass',
    description: 'Single orbit with eclipse',
    phases: [
      { name: 'Sunlight', startTime_min: 0, duration_min: 60, loadMultiplier: 1.0, solarAvailable: true, altitude: 400000 },
      { name: 'Eclipse', startTime_min: 60, duration_min: 35, loadMultiplier: 1.0, solarAvailable: false, altitude: 400000 },
      { name: 'Sunlight', startTime_min: 95, duration_min: 60, loadMultiplier: 1.0, solarAvailable: true, altitude: 400000 },
    ],
    totalDuration: 155,
    notes: 'LEO orbit with eclipse period',
  },
  custom: {
    id: 'custom',
    name: 'Custom Mission',
    description: 'User-defined mission profile',
    phases: [],
    totalDuration: 60,
    notes: 'Define your own mission phases',
  },
};

export function getMissionPreset(id: string): MissionPreset | undefined {
  return MISSION_PRESETS[id];
}
