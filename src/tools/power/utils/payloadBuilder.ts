/**
 * AI Payload Builder for Battery & Solar Power System
 */

import { buildAeroversePayload } from '@/ai/buildPayload';
import type { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { BatteryPack } from './batteryModel';
import { SolarConfig } from './solarModel';
import { PowerLoad, MissionResult } from './missionEngine';

export function buildPowerSystemPayload(
  pack: BatteryPack,
  solarConfig: SolarConfig,
  baseLoad: PowerLoad,
  location: { latitude: number; longitude: number; altitude: number },
  dayOfYear: number,
  result: MissionResult,
  requestId?: string
): AeroverseAIPayload {
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
  
  const totalLoad_W = Object.values(baseLoad).reduce(
    (sum, val) => sum + (typeof val === 'number' ? val : 0),
    0
  );

  const steps = [
    `Battery pack: ${pack.S_count}S${pack.P_count}P ${packCapacity_mAh.toFixed(0)} mAh ${pack.chemistry.name}`,
    `Pack voltage: ${packVoltage.toFixed(2)} V, energy: ${packEnergy_Wh.toFixed(1)} Wh`,
    `Estimated pack mass: ${packMass_kg.toFixed(2)} kg`,
    `Solar array: ${solarConfig.area_m2.toFixed(2)} m² @ ${(solarConfig.efficiency * 100).toFixed(1)}%`,
    `Mission location: lat ${location.latitude.toFixed(2)}°, lon ${location.longitude.toFixed(
      2
    )}°, day ${dayOfYear}`,
    `Total continuous load: ${totalLoad_W.toFixed(1)} W`,
    `Simulation length: ${result.frames.length} min, Endurance: ${(result.endurance_min / 60).toFixed(2)} h`,
    `Solar contribution: ${(result.solarFraction * 100).toFixed(1)}%`,
    `Power margin range: ${result.minPowerMargin_W.toFixed(1)} W to ${Math.max(
      ...result.frames.map((f) => f.powerMargin_W)
    ).toFixed(1)} W`,
  ];

  return buildAeroversePayload({
    requestId,
    toolName: 'Battery & Solar Power System',
    inputs: {
      battery: {
        chemistry: pack.chemistry.name,
        capacity_mAh: packCapacity_mAh,
        series: pack.S_count,
        parallel: pack.P_count,
        nominalVoltage: packVoltage,
        energy_Wh: packEnergy_Wh,
        mass_kg: packMass_kg,
      },
      solar: {
        area_m2: solarConfig.area_m2,
        efficiency: solarConfig.efficiency,
        mpptEfficiency: solarConfig.mpptEfficiency,
        tilt_deg: solarConfig.tilt,
        azimuth_deg: solarConfig.azimuth,
      },
      loads: baseLoad,
      location,
      dayOfYear,
    },
    results: {
      endurance_minutes: result.endurance_min,
      endurance_hours: result.endurance_min / 60,
      solarFraction: result.solarFraction,
      minPowerMargin_W: result.minPowerMargin_W,
      maxPowerMargin_W: Math.max(...result.frames.map((f) => f.powerMargin_W)),
      maxVoltage: result.maxVoltage,
      minVoltage: result.minVoltage,
      totalEnergyUsed_Wh,
      totalSolarGenerated_Wh,
      finalSOC: result.frames.at(-1)?.batteryState.soc ?? null,
      warnings: result.warnings,
      recommendations,
    },
    units: {
      capacity_mAh: 'mAh',
      nominalVoltage: 'V',
      energy_Wh: 'Wh',
      mass_kg: 'kg',
      area_m2: 'm²',
      efficiency: '%',
      endurance_minutes: 'min',
      endurance_hours: 'hr',
      solarFraction: 'ratio',
      minPowerMargin_W: 'W',
      maxPowerMargin_W: 'W',
      voltage: 'V',
      totalEnergyUsed_Wh: 'Wh',
      totalSolarGenerated_Wh: 'Wh',
    },
    charts: [
      { id: 'soc', title: 'State of Charge Timeline', dataSummary: 'Battery SOC vs mission time' },
      { id: 'power', title: 'Power Balance', dataSummary: 'Load vs solar vs battery output' },
      { id: 'voltage', title: 'Pack Voltage', dataSummary: 'Voltage limits over mission' },
      { id: 'solar', title: 'Solar Generation', dataSummary: 'Solar power captured vs time' },
      { id: 'mission', title: 'Mission Phases', dataSummary: 'Power consumption per phase' },
    ],
    configuration: {
      loads: baseLoad,
      performanceMode: 'simulation',
      chemistry: pack.chemistry.name,
    },
    metadata: {
      steps,
      unitsSystem: 'SI',
      approxLevel: 'simulation',
      confidence: recommendations.length > 0 || result.warnings.length > 0 ? 'medium' : 'high',
      warnings: result.warnings,
    },
  });
}
