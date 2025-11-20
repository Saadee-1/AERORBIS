/**
 * Battery Chemistry Database
 * Comprehensive data for major battery types used in aerospace applications
 */

export interface BatteryChemistry {
  id: string;
  name: string;
  type: 'lipo' | 'liion' | 'lifepo4' | 'solidstate' | 'lisulfur' | 'nimh' | 'primary';
  
  // Electrical properties
  nominalVoltage: number; // V
  maxVoltage: number; // V
  cutoffVoltage: number; // V
  internalResistance: number; // mΩ per cell (typical)
  
  // Performance
  cRateContinuous: number; // e.g., 1C, 2C, 5C
  cRateBurst: number; // short-term burst
  energyDensityWhKg: number; // Wh/kg
  powerDensityWKg: number; // W/kg
  
  // Physical
  temperatureRange: [number, number]; // [min, max] in °C
  lifeCycles: number; // cycles to 80% capacity
  
  // Degradation
  degradationRate: number; // per cycle (0.0001 = 0.01% per cycle)
  peukertExponent: number; // Peukert's law exponent (typically 1.05-1.3)
  
  // Thermal
  thermalCoefficient: number; // capacity change per °C deviation from 25°C
  selfDischargeRate: number; // per month (%)
  
  // Safety
  notes: string;
}

export const BATTERY_CHEMISTRIES: Record<string, BatteryChemistry> = {
  lipo: {
    id: 'lipo',
    name: 'Lithium Polymer (LiPo)',
    type: 'lipo',
    nominalVoltage: 3.7,
    maxVoltage: 4.2,
    cutoffVoltage: 3.0,
    internalResistance: 2.0,
    cRateContinuous: 2,
    cRateBurst: 10,
    energyDensityWhKg: 180,
    powerDensityWKg: 2000,
    temperatureRange: [-20, 60],
    lifeCycles: 500,
    degradationRate: 0.0004,
    peukertExponent: 1.05,
    thermalCoefficient: 0.005,
    selfDischargeRate: 5,
    notes: 'High power density, common in RC and UAVs',
  },
  liion_18650: {
    id: 'liion_18650',
    name: 'Lithium-Ion 18650',
    type: 'liion',
    nominalVoltage: 3.7,
    maxVoltage: 4.2,
    cutoffVoltage: 2.5,
    internalResistance: 20,
    cRateContinuous: 1,
    cRateBurst: 3,
    energyDensityWhKg: 250,
    powerDensityWKg: 500,
    temperatureRange: [-20, 60],
    lifeCycles: 1000,
    degradationRate: 0.0002,
    peukertExponent: 1.1,
    thermalCoefficient: 0.005,
    selfDischargeRate: 3,
    notes: 'High energy density, used in CubeSats and long-endurance UAVs',
  },
  liion_21700: {
    id: 'liion_21700',
    name: 'Lithium-Ion 21700',
    type: 'liion',
    nominalVoltage: 3.7,
    maxVoltage: 4.2,
    cutoffVoltage: 2.5,
    internalResistance: 12,
    cRateContinuous: 1.5,
    cRateBurst: 5,
    energyDensityWhKg: 280,
    powerDensityWKg: 800,
    temperatureRange: [-20, 60],
    lifeCycles: 1200,
    degradationRate: 0.00015,
    peukertExponent: 1.08,
    thermalCoefficient: 0.005,
    selfDischargeRate: 3,
    notes: 'Improved capacity and power vs 18650',
  },
  lifepo4: {
    id: 'lifepo4',
    name: 'LiFePO4',
    type: 'lifepo4',
    nominalVoltage: 3.2,
    maxVoltage: 3.65,
    cutoffVoltage: 2.0,
    internalResistance: 5,
    cRateContinuous: 2,
    cRateBurst: 10,
    energyDensityWhKg: 120,
    powerDensityWKg: 1500,
    temperatureRange: [-30, 60],
    lifeCycles: 3000,
    degradationRate: 0.0001,
    peukertExponent: 1.15,
    thermalCoefficient: 0.003,
    selfDischargeRate: 2,
    notes: 'Excellent cycle life, safer, lower energy density',
  },
  solidstate: {
    id: 'solidstate',
    name: 'Solid-State Li-ion',
    type: 'solidstate',
    nominalVoltage: 3.7,
    maxVoltage: 4.3,
    cutoffVoltage: 2.5,
    internalResistance: 1.5,
    cRateContinuous: 3,
    cRateBurst: 15,
    energyDensityWhKg: 400,
    powerDensityWKg: 3000,
    temperatureRange: [-40, 80],
    lifeCycles: 2000,
    degradationRate: 0.0001,
    peukertExponent: 1.02,
    thermalCoefficient: 0.004,
    selfDischargeRate: 1,
    notes: 'Next-gen, high energy and power density',
  },
  lisulfur: {
    id: 'lisulfur',
    name: 'Li-Sulfur',
    type: 'lisulfur',
    nominalVoltage: 2.1,
    maxVoltage: 2.5,
    cutoffVoltage: 1.5,
    internalResistance: 8,
    cRateContinuous: 0.5,
    cRateBurst: 2,
    energyDensityWhKg: 500,
    powerDensityWKg: 200,
    temperatureRange: [-10, 50],
    lifeCycles: 300,
    degradationRate: 0.001,
    peukertExponent: 1.2,
    thermalCoefficient: 0.006,
    selfDischargeRate: 10,
    notes: 'Very high energy density, limited power, experimental',
  },
  nimh: {
    id: 'nimh',
    name: 'NiMH',
    type: 'nimh',
    nominalVoltage: 1.2,
    maxVoltage: 1.5,
    cutoffVoltage: 0.9,
    internalResistance: 50,
    cRateContinuous: 0.5,
    cRateBurst: 2,
    energyDensityWhKg: 100,
    powerDensityWKg: 300,
    temperatureRange: [-20, 50],
    lifeCycles: 1000,
    degradationRate: 0.0003,
    peukertExponent: 1.3,
    thermalCoefficient: 0.008,
    selfDischargeRate: 20,
    notes: 'Older technology, lower energy density, safer',
  },
  primary_li: {
    id: 'primary_li',
    name: 'Primary Lithium Metal',
    type: 'primary',
    nominalVoltage: 3.0,
    maxVoltage: 3.5,
    cutoffVoltage: 2.0,
    internalResistance: 10,
    cRateContinuous: 0.1,
    cRateBurst: 0.5,
    energyDensityWhKg: 600,
    powerDensityWKg: 100,
    temperatureRange: [-55, 85],
    lifeCycles: 1,
    degradationRate: 0,
    peukertExponent: 1.1,
    thermalCoefficient: 0.002,
    selfDischargeRate: 0.5,
    notes: 'Non-rechargeable, ultra-high energy density for long-endurance missions',
  },
};

export function getBatteryChemistry(id: string): BatteryChemistry | undefined {
  return BATTERY_CHEMISTRIES[id];
}

export function getAllBatteryChemistries(): BatteryChemistry[] {
  return Object.values(BATTERY_CHEMISTRIES);
}
