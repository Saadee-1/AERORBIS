/**
 * Battery Modeling Utilities
 * Implements Peukert's law, voltage sag, aging, and thermal effects
 */

import { BatteryChemistry } from '../data/batteryChemistries';

export interface BatteryPack {
  chemistry: BatteryChemistry;
  capacity_mAh: number;
  S_count: number; // series cells
  P_count: number; // parallel cells
  cycles: number; // number of charge/discharge cycles
  temperature: number; // °C
}

export interface BatteryState {
  soc: number; // state of charge, 0-1
  voltage: number; // V
  current: number; // A (positive = discharge, negative = charge)
  temperature: number; // °C
  capacity_remaining: number; // mAh
  capacity_initial: number; // mAh
}

/**
 * Calculate pack properties from cell configuration
 */
export function calculatePackProperties(pack: BatteryPack): {
  voltage: number;
  capacity_mAh: number;
  energy_Wh: number;
  mass_kg: number;
  internalResistance_mOhm: number;
} {
  const voltage = pack.chemistry.nominalVoltage * pack.S_count;
  const capacity_mAh = pack.capacity_mAh * pack.P_count;
  const energy_Wh = (voltage * capacity_mAh) / 1000;
  
  // Estimate mass (rough: assume 1 cell = 0.05 kg per 1000 mAh for LiPo)
  const cellMass_kg = (pack.capacity_mAh / 1000) * 0.05;
  const mass_kg = cellMass_kg * pack.S_count * pack.P_count;
  
  // Internal resistance: series adds, parallel divides
  const internalResistance_mOhm = 
    (pack.chemistry.internalResistance * pack.S_count) / pack.P_count;
  
  return {
    voltage,
    capacity_mAh,
    energy_Wh,
    mass_kg,
    internalResistance_mOhm,
  };
}

/**
 * Apply cycle degradation to capacity
 */
export function applyDegradation(
  initialCapacity_mAh: number,
  cycles: number,
  degradationRate: number
): number {
  return initialCapacity_mAh * (1 - degradationRate * cycles);
}

/**
 * Apply thermal effects to capacity
 */
export function applyThermalEffect(
  capacity_mAh: number,
  temperature: number,
  thermalCoefficient: number
): number {
  const tempDeviation = temperature - 25; // 25°C is reference
  return capacity_mAh * (1 + thermalCoefficient * tempDeviation);
}

/**
 * Calculate effective capacity using Peukert's law
 * C_effective = C * (I_ref / I_actual)^(k-1)
 */
export function calculatePeukertCapacity(
  nominalCapacity_mAh: number,
  actualCurrent_A: number,
  referenceCurrent_A: number,
  peukertExponent: number
): number {
  if (actualCurrent_A <= 0) return nominalCapacity_mAh;
  if (referenceCurrent_A <= 0) return nominalCapacity_mAh;
  
  const ratio = referenceCurrent_A / actualCurrent_A;
  return nominalCapacity_mAh * Math.pow(ratio, peukertExponent - 1);
}

/**
 * Calculate voltage with sag due to internal resistance
 */
export function calculateVoltage(
  pack: BatteryPack,
  state: BatteryState,
  packProps: ReturnType<typeof calculatePackProperties>
): number {
  const { chemistry } = pack;
  const { soc, current } = state;
  
  // Open circuit voltage (OCV) based on SOC
  // Simplified linear model: V_oc = V_min + (V_max - V_min) * SOC
  const vMin = chemistry.cutoffVoltage * pack.S_count;
  const vMax = chemistry.maxVoltage * pack.S_count;
  const vOcv = vMin + (vMax - vMin) * soc;
  
  // Voltage sag due to internal resistance
  const vSag = current * (packProps.internalResistance_mOhm / 1000);
  
  // Discharge: voltage drops, Charge: voltage rises
  const voltage = vOcv - vSag;
  
  // Clamp to physical limits
  return Math.max(chemistry.cutoffVoltage * pack.S_count, 
                  Math.min(chemistry.maxVoltage * pack.S_count, voltage));
}

/**
 * Calculate maximum safe current (C-rate limited)
 */
export function calculateMaxCurrent(
  pack: BatteryPack,
  packProps: ReturnType<typeof calculatePackProperties>,
  burst: boolean = false
): number {
  const cRate = burst ? pack.chemistry.cRateBurst : pack.chemistry.cRateContinuous;
  const capacity_Ah = packProps.capacity_mAh / 1000;
  return cRate * capacity_Ah;
}

/**
 * Calculate state of charge from capacity
 */
export function calculateSOC(
  capacityRemaining_mAh: number,
  capacityTotal_mAh: number
): number {
  if (capacityTotal_mAh <= 0) return 0;
  return Math.max(0, Math.min(1, capacityRemaining_mAh / capacityTotal_mAh));
}

/**
 * Simulate battery discharge/charge step
 */
export function simulateBatteryStep(
  pack: BatteryPack,
  state: BatteryState,
  power_W: number,
  timeStep_s: number
): BatteryState {
  const packProps = calculatePackProperties(pack);
  
  // Calculate current from power
  const voltage = calculateVoltage(pack, state, packProps);
  const current_A = power_W / voltage;
  
  // Check C-rate limits
  const maxCurrent = calculateMaxCurrent(pack, packProps, false);
  const clampedCurrent = Math.max(-maxCurrent, Math.min(maxCurrent, current_A));
  const actualPower_W = clampedCurrent * voltage;
  
  // Calculate capacity change (Ah = A * h)
  const capacityChange_mAh = (clampedCurrent * timeStep_s / 3600) * 1000;
  
  // Apply Peukert correction for discharge
  let effectiveCapacityChange_mAh = capacityChange_mAh;
  if (clampedCurrent > 0) {
    // Discharge: apply Peukert
    const referenceCurrent_A = packProps.capacity_mAh / 1000; // 1C
    const peukertCapacity = calculatePeukertCapacity(
      packProps.capacity_mAh,
      clampedCurrent,
      referenceCurrent_A,
      pack.chemistry.peukertExponent
    );
    // Adjust capacity change based on effective capacity
    effectiveCapacityChange_mAh = capacityChange_mAh * (packProps.capacity_mAh / peukertCapacity);
  }
  
  // Update capacity
  const newCapacity_mAh = state.capacity_remaining - effectiveCapacityChange_mAh;
  
  // Apply degradation
  const degradedCapacity = applyDegradation(
    pack.capacity_mAh,
    pack.cycles,
    pack.chemistry.degradationRate
  );
  
  // Apply thermal effects
  const thermalCapacity = applyThermalEffect(
    degradedCapacity,
    state.temperature,
    pack.chemistry.thermalCoefficient
  );
  
  const totalCapacity_mAh = thermalCapacity * pack.P_count;
  const clampedCapacity_mAh = Math.max(0, Math.min(totalCapacity_mAh, newCapacity_mAh));
  
  // Calculate new SOC
  const newSOC = calculateSOC(clampedCapacity_mAh, totalCapacity_mAh);
  
  // Calculate new voltage
  const newState: BatteryState = {
    ...state,
    soc: newSOC,
    current: clampedCurrent,
    capacity_remaining: clampedCapacity_mAh,
    capacity_initial: totalCapacity_mAh,
  };
  const newVoltage = calculateVoltage(pack, newState, packProps);
  
  return {
    ...newState,
    voltage: newVoltage,
  };
}

/**
 * Calculate energy remaining in battery
 */
export function calculateEnergyRemaining(
  state: BatteryState,
  packProps: ReturnType<typeof calculatePackProperties>
): number {
  return (state.voltage * state.capacity_remaining) / 1000; // Wh
}
