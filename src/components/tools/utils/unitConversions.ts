/**
 * Unit Conversion Utilities
 * 
 * Pure conversion functions for SI and Imperial units.
 * Used by Wing Loading Calculator and other tools.
 */

export type UnitSystem = 'SI' | 'Imperial';

// Mass conversions
export function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

// Area conversions
export function m2ToFt2(m2: number): number {
  return m2 * 10.7639104167;
}

export function ft2ToM2(ft2: number): number {
  return ft2 / 10.7639104167;
}

// Force/Weight conversions
export function nToLbf(n: number): number {
  return n / 4.44822;
}

export function lbfToN(lbf: number): number {
  return lbf * 4.44822;
}

// Wing loading: N/m^2 <-> lbf/ft^2
export function nPerM2ToLbPerFt2(nPerM2: number): number {
  // 1 N/m^2 ≈ 0.020885434233150127 lbf/ft^2
  return nPerM2 * 0.0208854342;
}

export function lbPerFt2ToNPerM2(lbPerFt2: number): number {
  return lbPerFt2 / 0.0208854342;
}

// Wing loading: kg/m^2 <-> lb/ft^2
export function kgPerM2ToLbPerFt2(kgPerM2: number): number {
  // 1 kg/m^2 = 0.204816143622521 lb/ft^2
  return kgPerM2 * 0.2048161436;
}

export function lbPerFt2ToKgPerM2(lbPerFt2: number): number {
  return lbPerFt2 / 0.2048161436;
}

// Velocity conversions
export function mpsToKts(v: number): number {
  return v * 1.94384;
}

export function ktsToMps(vKts: number): number {
  return vKts / 1.94384;
}

// Length conversions
export function mToFt(m: number): number {
  return m / 0.3048;
}

export function ftToM(ft: number): number {
  return ft * 0.3048;
}

// ============================================================================
// Wing Loading Calculator specific conversion functions
// ============================================================================

/**
 * Convert mass from input unit system to SI (kg)
 */
export function convertMassToSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return lbToKg(value);
  }
  return value; // Already in kg
}

/**
 * Convert mass from SI (kg) to output unit system
 */
export function convertMassFromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return kgToLb(value);
  }
  return value; // Already in kg
}

/**
 * Convert weight from input unit system to SI (N)
 */
export function convertWeightToSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return lbfToN(value);
  }
  return value; // Already in N
}

/**
 * Convert weight from SI (N) to output unit system
 */
export function convertWeightFromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return nToLbf(value);
  }
  return value; // Already in N
}

/**
 * Convert area from input unit system to SI (m²)
 */
export function convertAreaToSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return ft2ToM2(value);
  }
  return value; // Already in m²
}

/**
 * Convert area from SI (m²) to output unit system
 */
export function convertAreaFromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return m2ToFt2(value);
  }
  return value; // Already in m²
}

/**
 * Convert altitude from input unit system to SI (m)
 */
export function convertAltitudeToSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return ftToM(value);
  }
  return value; // Already in m
}

/**
 * Convert altitude from SI (m) to output unit system
 */
export function convertAltitudeFromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return mToFt(value);
  }
  return value; // Already in m
}

/**
 * Convert wing loading from SI (N/m²) to output unit system
 */
export function convertWingLoadingNm2FromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return nPerM2ToLbPerFt2(value);
  }
  return value; // Already in N/m²
}

/**
 * Convert wing loading from SI (kg/m²) to output unit system
 */
export function convertWingLoadingKgm2FromSI(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'Imperial') {
    return kgPerM2ToLbPerFt2(value);
  }
  return value; // Already in kg/m²
}

/**
 * Convert velocity from SI (m/s) to output unit system
 */
export function convertVelocityFromSI(value: number, unitSystem: UnitSystem): { value: number; unit: string } {
  if (unitSystem === 'Imperial') {
    // For Imperial, we still show knots (standard aviation unit)
    return { value: mpsToKts(value), unit: 'kts' };
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

