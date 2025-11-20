/**
 * Mission Simulation Engine
 * Integrates power loads, solar generation, and battery state over time
 */

import { BatteryPack, BatteryState, simulateBatteryStep, calculatePackProperties } from './batteryModel';
import { SolarConfig, calculateSolarGeneration, SolarState } from './solarModel';
import { Location } from './sunVector';

export interface PowerLoad {
  propulsion?: number; // W
  avionics?: number; // W
  servos?: number; // W
  cameras?: number; // W
  telemetry?: number; // W
  payload?: number; // W
  thermal?: number; // W
  adcs?: number; // W
  transmitter?: number; // W
  obc?: number; // W
}

export interface MissionPhase {
  name: string;
  startTime_min: number;
  duration_min: number;
  loadMultiplier: number;
  solarAvailable: boolean;
  altitude?: number;
}

export interface MissionFrame {
  time_min: number;
  phase: string;
  batteryState: BatteryState;
  solarState: SolarState;
  load_W: number;
  netPower_W: number; // solar - load
  energyRemaining_Wh: number;
}

export interface MissionResult {
  frames: MissionFrame[];
  totalDuration_min: number;
  endurance_min: number; // time until battery empty
  solarFraction: number; // fraction of load powered by solar
  minPowerMargin_W: number;
  maxVoltage: number;
  minVoltage: number;
  warnings: string[];
}

/**
 * Calculate total power load
 */
export function calculateTotalLoad(load: PowerLoad, multiplier: number = 1.0): number {
  const baseLoad = 
    (load.propulsion || 0) +
    (load.avionics || 0) +
    (load.servos || 0) +
    (load.cameras || 0) +
    (load.telemetry || 0) +
    (load.payload || 0) +
    (load.thermal || 0) +
    (load.adcs || 0) +
    (load.transmitter || 0) +
    (load.obc || 0);
  
  return baseLoad * multiplier;
}

/**
 * Simulate mission timeline
 */
export function simulateMission(
  pack: BatteryPack,
  solarConfig: SolarConfig,
  baseLoad: PowerLoad,
  phases: MissionPhase[],
  location: Location,
  dayOfYear: number,
  timeStep_min: number = 1
): MissionResult {
  const frames: MissionFrame[] = [];
  const warnings: string[] = [];
  
  // Initialize battery state
  const packProps = calculatePackProperties(pack);
  let batteryState: BatteryState = {
    soc: 1.0,
    voltage: pack.chemistry.maxVoltage * pack.S_count,
    current: 0,
    temperature: pack.temperature,
    capacity_remaining: packProps.capacity_mAh,
    capacity_initial: packProps.capacity_mAh,
  };
  
  let totalSolarEnergy_Wh = 0;
  let totalLoadEnergy_Wh = 0;
  let minVoltage = batteryState.voltage;
  let maxVoltage = batteryState.voltage;
  let minPowerMargin = Infinity;
  let endurance_min = 0;
  
  // Process each phase
  for (const phase of phases) {
    const phaseEndTime = phase.startTime_min + phase.duration_min;
    
    for (let t = phase.startTime_min; t < phaseEndTime; t += timeStep_min) {
      // Calculate solar power
      const solarTime = (t / 60) % 24;
      const phaseLocation: Location = {
        ...location,
        altitude: phase.altitude !== undefined ? phase.altitude : location.altitude,
      };
      
      const solarState = phase.solarAvailable
        ? calculateSolarGeneration(solarConfig, phaseLocation, dayOfYear, solarTime)
        : { power_W: 0, sunVector: { elevation: 0, azimuth: 0, irradiance: 0 }, available: false };
      
      // Calculate load
      const load_W = calculateTotalLoad(baseLoad, phase.loadMultiplier);
      
      // Net power (positive = charging, negative = discharging)
      const netPower_W = solarState.power_W - load_W;
      
      // Simulate battery step
      const timeStep_s = timeStep_min * 60;
      batteryState = simulateBatteryStep(pack, batteryState, -netPower_W, timeStep_s);
      
      // Track energy
      totalSolarEnergy_Wh += (solarState.power_W * timeStep_s) / 3600;
      totalLoadEnergy_Wh += (load_W * timeStep_s) / 3600;
      
      // Track voltage extremes
      minVoltage = Math.min(minVoltage, batteryState.voltage);
      maxVoltage = Math.max(maxVoltage, batteryState.voltage);
      
      // Track power margin
      const powerMargin = solarState.power_W - load_W;
      minPowerMargin = Math.min(minPowerMargin, powerMargin);
      
      // Calculate energy remaining
      const energyRemaining_Wh = (batteryState.voltage * batteryState.capacity_remaining) / 1000;
      
      frames.push({
        time_min: t,
        phase: phase.name,
        batteryState: { ...batteryState },
        solarState,
        load_W,
        netPower_W,
        energyRemaining_Wh,
      });
      
      // Check for empty battery
      if (batteryState.soc <= 0 && endurance_min === 0) {
        endurance_min = t;
        warnings.push(`Battery depleted at ${t.toFixed(1)} minutes`);
        break;
      }
      
      // Check for over-discharge
      if (batteryState.voltage < pack.chemistry.cutoffVoltage * pack.S_count) {
        warnings.push(`Battery voltage below cutoff at ${t.toFixed(1)} minutes`);
      }
      
      // Check for overcurrent
      const maxCurrent = packProps.capacity_mAh / 1000 * pack.chemistry.cRateContinuous;
      if (Math.abs(batteryState.current) > maxCurrent) {
        warnings.push(`Current exceeds C-rate limit at ${t.toFixed(1)} minutes`);
      }
    }
    
    if (batteryState.soc <= 0) break;
  }
  
  // Calculate solar fraction
  const solarFraction = totalLoadEnergy_Wh > 0
    ? Math.min(1, totalSolarEnergy_Wh / totalLoadEnergy_Wh)
    : 0;
  
  return {
    frames,
    totalDuration_min: phases[phases.length - 1].startTime_min + phases[phases.length - 1].duration_min,
    endurance_min: endurance_min || frames.length * timeStep_min,
    solarFraction,
    minPowerMargin_W: minPowerMargin,
    maxVoltage,
    minVoltage,
    warnings,
  };
}
