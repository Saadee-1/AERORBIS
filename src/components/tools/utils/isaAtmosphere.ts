/**
 * ISA (International Standard Atmosphere) Model for Air Density
 * 
 * Pure utility functions for ISA calculations, no React dependencies.
 * Based on ISA standard up to 11 km altitude.
 * 
 * ISA Sea Level Conditions:
 * - T0 = 288.15 K (15°C)
 * - p0 = 101325 Pa
 * - ρ0 = 1.225 kg/m³
 * - Lapse rate: -6.5 K/km (up to 11 km)
 */

export interface IsaResult {
  temperature: number; // K
  pressure: number;    // Pa
  density: number;     // kg/m³
}

const T0 = 288.15;    // K
const p0 = 101325;    // Pa
const a = -0.0065;    // K/m (lapse rate)
const R = 287.05287;  // J/(kg·K) - specific gas constant for dry air
const g0 = 9.80665;   // m/s²
const TROPOPAUSE_ALTITUDE = 11000; // m (11 km)

/**
 * Calculate ISA properties at altitude in meters
 * Valid up to ~11 km (tropopause)
 * 
 * @param h - Geometric altitude in meters
 * @param deltaT - Optional temperature deviation from ISA (K)
 * @returns ISA properties (temperature, pressure, density)
 */
export function isaAtAltitudeMeters(h: number, deltaT: number = 0): IsaResult {
  if (h <= 0) {
    return {
      temperature: T0 + deltaT,
      pressure: p0,
      density: p0 / (R * (T0 + deltaT))
    };
  }
  
  let T: number;
  if (h > TROPOPAUSE_ALTITUDE) {
    // Above tropopause: temperature is constant at tropopause temperature
    const tropopauseTemp = T0 + a * TROPOPAUSE_ALTITUDE;
    T = tropopauseTemp + deltaT;
    
    // Exponential pressure decay above tropopause
    const tropopausePressure = p0 * Math.pow((T0 + a * TROPOPAUSE_ALTITUDE) / T0, -g0 / (a * R));
    const deltaH = h - TROPOPAUSE_ALTITUDE;
    const exponent = -(g0 * deltaH) / (R * tropopauseTemp);
    const p = tropopausePressure * Math.exp(exponent);
    const rho = p / (R * T);
    
    return { temperature: T, pressure: p, density: rho };
  }
  
  // Linear temperature profile up to tropopause
  T = T0 + a * h + deltaT;
  
  // Pressure using hydrostatic equation
  const exponent = -g0 / (a * R);
  const p = p0 * Math.pow(T / T0, exponent);
  
  // Density using ideal gas law
  const rho = p / (R * T);
  
  return { temperature: T, pressure: p, density: rho };
}

/**
 * Convenience wrapper for altitude in feet
 * 
 * @param hFt - Geometric altitude in feet
 * @param deltaT - Optional temperature deviation from ISA (K)
 * @returns ISA properties (temperature, pressure, density)
 */
export function isaAtAltitudeFeet(hFt: number, deltaT: number = 0): IsaResult {
  const hMeters = hFt * 0.3048;
  return isaAtAltitudeMeters(hMeters, deltaT);
}

/**
 * Calculate ISA air density at altitude (meters)
 * This is the main function used by WingLoadingCalculator
 */
export function calculateISADensity(altitudeM: number, deltaT: number = 0): number {
  return isaAtAltitudeMeters(altitudeM, deltaT).density;
}

/**
 * Convert altitude from feet to meters
 */
export function feetToMeters(ft: number): number {
  return ft * 0.3048;
}

/**
 * Convert altitude from meters to feet
 */
export function metersToFeet(m: number): number {
  return m / 0.3048;
}

/**
 * Get altitude in meters for preset conditions
 */
export function getPresetAltitude(preset: string): number {
  switch (preset) {
    case 'ISA Sea Level':
      return 0;
    case '2000 ft':
      return feetToMeters(2000);
    case '5000 ft':
      return feetToMeters(5000);
    case '10000 ft':
      return feetToMeters(10000);
    default:
      return 0;
  }
}

