/**
 * Mission Profile Presets
 * Common mission timelines for different vehicle types
 */

export interface MissionPhase {
  name: string;
  startTime: number; // minutes from mission start
  duration: number; // minutes
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
      { name: 'Takeoff', startTime: 0, duration: 2, loadMultiplier: 2.0, solarAvailable: true, altitude: 0 },
      { name: 'Climb', startTime: 2, duration: 5, loadMultiplier: 1.5, solarAvailable: true, altitude: 100 },
      { name: 'Cruise', startTime: 7, duration: 180, loadMultiplier: 1.0, solarAvailable: true, altitude: 1000 },
      { name: 'Loiter', startTime: 187, duration: 60, loadMultiplier: 0.8, solarAvailable: true, altitude: 1000 },
      { name: 'Descent', startTime: 247, duration: 5, loadMultiplier: 0.5, solarAvailable: true, altitude: 100 },
      { name: 'Landing', startTime: 252, duration: 2, loadMultiplier: 1.2, solarAvailable: true, altitude: 0 },
    ],
    totalDuration: 254,
    notes: 'Typical long-endurance UAV mission with solar charging',
  },
  quadcopter_fpv: {
    id: 'quadcopter_fpv',
    name: 'Quadcopter FPV Flight',
    description: 'High-power FPV racing/acro flight',
    phases: [
      { name: 'Takeoff', startTime: 0, duration: 0.5, loadMultiplier: 1.5, solarAvailable: false, altitude: 0 },
      { name: 'Flight', startTime: 0.5, duration: 5, loadMultiplier: 1.8, solarAvailable: false, altitude: 50 },
      { name: 'Landing', startTime: 5.5, duration: 0.5, loadMultiplier: 1.2, solarAvailable: false, altitude: 0 },
    ],
    totalDuration: 6,
    notes: 'Short, high-power flight, no solar',
  },
  solar_24h: {
    id: 'solar_24h',
    name: '24-Hour Solar Flight',
    description: 'Full day/night cycle with solar',
    phases: [
      { name: 'Takeoff (Dawn)', startTime: 0, duration: 5, loadMultiplier: 2.0, solarAvailable: true, altitude: 0 },
      { name: 'Morning Cruise', startTime: 5, duration: 240, loadMultiplier: 1.0, solarAvailable: true, altitude: 15000 },
      { name: 'Midday', startTime: 245, duration: 300, loadMultiplier: 1.0, solarAvailable: true, altitude: 15000 },
      { name: 'Afternoon', startTime: 545, duration: 240, loadMultiplier: 1.0, solarAvailable: true, altitude: 15000 },
      { name: 'Evening', startTime: 785, duration: 120, loadMultiplier: 1.0, solarAvailable: true, altitude: 15000 },
      { name: 'Night', startTime: 905, duration: 480, loadMultiplier: 0.8, solarAvailable: false, altitude: 15000 },
      { name: 'Dawn', startTime: 1385, duration: 60, loadMultiplier: 1.0, solarAvailable: true, altitude: 15000 },
    ],
    totalDuration: 1445,
    notes: 'Full 24-hour cycle with night survival',
  },
  cubesat_orbit: {
    id: 'cubesat_orbit',
    name: 'CubeSat Orbit Pass',
    description: 'Single orbit with eclipse',
    phases: [
      { name: 'Sunlight', startTime: 0, duration: 60, loadMultiplier: 1.0, solarAvailable: true, altitude: 400000 },
      { name: 'Eclipse', startTime: 60, duration: 35, loadMultiplier: 1.0, solarAvailable: false, altitude: 400000 },
      { name: 'Sunlight', startTime: 95, duration: 60, loadMultiplier: 1.0, solarAvailable: true, altitude: 400000 },
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
