/**
 * Unit Conversion Utilities for Wing Loading Calculator
 * 
 * Handles conversions between SI and Imperial units
 * All calculations are performed in SI internally
 */

export type UnitSystem = 'SI' | 'Imperial';

// Conversion factors (to SI)
const CONVERSIONS = {
  // Mass
  lbToKg: 0.453592,
  kgToLb: 1 / 0.453592,
  
  // Weight/Force
  lbfToN: 4.44822,
  nToLbf: 1 / 4.44822,
  
  // Area
  ft2ToM2: 0.092903,
  m2ToFt2: 1 / 0.092903,
  
  // Length
  ftToM: 0.3048,
  mToFt: 1 / 0.3048,
  
  // Velocity
  ktsToMs: 0.514444,
  msToKts: 1 / 0.514444,
  
  // Wing Loading
  lbFt2ToKgM2: 4.88243, // 1 lb/ft² = 4.88243 kg/m²
  kgM2ToLbFt2: 1 / 4.88243,
  
  lbFt2ToNm2: 47.8803, // 1 lb/ft² = 47.8803 N/m²
  nm2ToLbFt2: 1 / 47.8803,
};

/**
 * Convert mass from input unit system to SI (kg)
 */
export function convertMassToSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS.lbToKg;
  }
  return value; // Already in kg
}

/**
 * Convert mass from SI (kg) to output unit system
 */
export function convertMassFromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS.kgToLb;
  }
  return value; // Already in kg
}

/**
 * Convert weight from input unit system to SI (N)
 */
export function convertWeightToSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS.lbfToN;
  }
  return value; // Already in N
}

/**
 * Convert weight from SI (N) to output unit system
 */
export function convertWeightFromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS.nToLbf;
  }
  return value; // Already in N
}

/**
 * Convert area from input unit system to SI (m²)
 */
export function convertAreaToSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS.ft2ToM2;
  }
  return value; // Already in m²
}

/**
 * Convert area from SI (m²) to output unit system
 */
export function convertAreaFromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS.m2ToFt2;
  }
  return value; // Already in m²
}

/**
 * Convert altitude from input unit system to SI (m)
 */
export function convertAltitudeToSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS.ftToM;
  }
  return value; // Already in m
}

/**
 * Convert altitude from SI (m) to output unit system
 */
export function convertAltitudeFromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS.mToFt;
  }
  return value; // Already in m
}

/**
 * Convert wing loading from SI (N/m²) to output unit system
 */
export function convertWingLoadingNm2FromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS.nm2ToLbFt2;
  }
  return value; // Already in N/m²
}

/**
 * Convert wing loading from SI (kg/m²) to output unit system
 */
export function convertWingLoadingKgm2FromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS.kgM2ToLbFt2;
  }
  return value; // Already in kg/m²
}

/**
 * Convert velocity from SI (m/s) to output unit system
 */
export function convertVelocityFromSI(value: number, unitSystem: UnitSystem): { value: number; unit: string } {
  if (unitSystem === 'Imperial') {
    // For Imperial, we still show knots (standard aviation unit)
    return { value: value * CONVERSIONS.msToKts, unit: 'kts' };
  }
  return { value, unit: 'm/s' };
}

/**
 * Get unit labels for input fields
 */
export function getInputUnits(unitSystem: UnitSystem): {
  mass: string;
  weight: string;
  area: string;
  altitude: string;
} {
  if (unitSystem === 'Imperial') {
    return {
      mass: 'lb',
      weight: 'lbf',
      area: 'ft²',
      altitude: 'ft'
    };
  }
  return {
    mass: 'kg',
    weight: 'N',
    area: 'm²',
    altitude: 'm'
  };
}

/**
 * Get unit labels for output fields
 */
export function getOutputUnits(unitSystem: UnitSystem): {
  wingLoadingNm2: string;
  wingLoadingKgm2: string;
  velocity: string;
} {
  if (unitSystem === 'Imperial') {
    return {
      wingLoadingNm2: 'lbf/ft²',
      wingLoadingKgm2: 'lb/ft²',
      velocity: 'kts'
    };
  }
  return {
    wingLoadingNm2: 'N/m²',
    wingLoadingKgm2: 'kg/m²',
    velocity: 'm/s'
  };
}

