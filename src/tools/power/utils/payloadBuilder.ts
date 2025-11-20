/**
 * AI Payload Builder for Battery & Solar Power System
 */

import { BatteryPack } from './batteryModel';
import { SolarConfig } from './solarModel';
import { PowerLoad, MissionResult } from './missionEngine';

export interface PowerSystemPayload {
  toolName: string;
  timestamp: string;
  requestId?: string;
  configuration: {
    battery: {
      chemistry: string;
      capacity_mAh: number;
      series: number;
      parallel: number;
      voltage: number;
      energy_Wh: number;
      mass_kg: number;
    };
    solar: {
      area_m2: number;
      efficiency: number;
      mpptEfficiency: number;
      tilt: number;
      azimuth: number;
    };
    loads: PowerLoad;
    location: {
      latitude: number;
      longitude: number;
      altitude: number;
    };
    dayOfYear: number;
  };
  results: {
    endurance_min: number;
    endurance_hours: number;
    solarFraction: number;
    minPowerMargin_W: number;
    maxVoltage: number;
    minVoltage: number;
    totalEnergyUsed_Wh: number;
    totalSolarGenerated_Wh: number;
  };
  warnings: string[];
  recommendations: string[];
  visualization?: {
    charts: string[];
  };
}

export function buildPowerSystemPayload(
  pack: BatteryPack,
  solarConfig: SolarConfig,
  baseLoad: PowerLoad,
  location: { latitude: number; longitude: number; altitude: number },
  dayOfYear: number,
  result: MissionResult,
  requestId?: string
): PowerSystemPayload {
  const packVoltage = pack.chemistry.nominalVoltage * pack.S_count;
  const packCapacity_mAh = pack.capacity_mAh * pack.P_count;
  const packEnergy_Wh = (packVoltage * packCapacity_mAh) / 1000;
  const cellMass_kg = (pack.capacity_mAh / 1000) * 0.05;
  const packMass_kg = cellMass_kg * pack.S_count * pack.P_count;
  
  const totalEnergyUsed_Wh = result.frames.length > 0
    ? result.frames[0].energyRemaining_Wh - result.frames[result.frames.length - 1].energyRemaining_Wh
    : 0;
  
  const totalSolarGenerated_Wh = result.frames.reduce((sum, frame) => {
    return sum + (frame.solarState.power_W * 1 / 60); // 1 minute steps
  }, 0) / 60; // Convert to Wh
  
  const recommendations: string[] = [];
  
  // Battery recommendations
  if (result.endurance_min < 60) {
    recommendations.push('Consider increasing battery capacity or reducing load for longer endurance');
  }
  
  if (result.minVoltage < pack.chemistry.cutoffVoltage * pack.S_count * 1.1) {
    recommendations.push('Battery voltage approaching cutoff - add safety margin');
  }
  
  // Solar recommendations
  if (result.solarFraction < 0.5) {
    recommendations.push('Solar generation is low - consider increasing panel area or improving orientation');
  }
  
  if (result.solarFraction >= 1.0) {
    recommendations.push('Solar generation exceeds load - system is self-sustaining');
  }
  
  if (result.minPowerMargin_W < -100) {
    recommendations.push('Power margin is negative - battery will discharge during these periods');
  }
  
  // Efficiency recommendations
  if (solarConfig.efficiency < 0.20) {
    recommendations.push('Consider higher efficiency solar cells (22-30%) for better performance');
  }
  
  return {
    toolName: 'Battery & Solar Power System',
    timestamp: new Date().toISOString(),
    requestId,
    configuration: {
      battery: {
        chemistry: pack.chemistry.name,
        capacity_mAh: packCapacity_mAh,
        series: pack.S_count,
        parallel: pack.P_count,
        voltage: packVoltage,
        energy_Wh: packEnergy_Wh,
        mass_kg: packMass_kg,
      },
      solar: {
        area_m2: solarConfig.area_m2,
        efficiency: solarConfig.efficiency,
        mpptEfficiency: solarConfig.mpptEfficiency,
        tilt: solarConfig.tilt,
        azimuth: solarConfig.azimuth,
      },
      loads: baseLoad,
      location,
      dayOfYear,
    },
    results: {
      endurance_min: result.endurance_min,
      endurance_hours: result.endurance_min / 60,
      solarFraction: result.solarFraction,
      minPowerMargin_W: result.minPowerMargin_W,
      maxVoltage: result.maxVoltage,
      minVoltage: result.minVoltage,
      totalEnergyUsed_Wh,
      totalSolarGenerated_Wh,
    },
    warnings: result.warnings,
    recommendations,
    visualization: {
      charts: ['soc', 'power', 'voltage', 'solar', 'mission'],
    },
  };
}
