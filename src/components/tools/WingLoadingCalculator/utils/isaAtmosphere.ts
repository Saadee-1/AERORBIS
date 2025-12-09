/**
 * ISA (International Standard Atmosphere) Model for Air Density
 * 
 * Simplified ISA model for wing loading calculations.
 * Based on ISA standard up to 11 km altitude.
 * 
 * ISA Sea Level Conditions:
 * - T0 = 288.15 K (15°C)
 * - p0 = 101325 Pa
 * - ρ0 = 1.225 kg/m³
 * - Lapse rate: -6.5 K/km (up to 11 km)
 */

const ISA_SEA_LEVEL_TEMP = 288.15; // K
const ISA_SEA_LEVEL_PRESSURE = 101325; // Pa
const ISA_SEA_LEVEL_DENSITY = 1.225; // kg/m³
const ISA_LAPSE_RATE = -0.0065; // K/m (negative = temperature decreases with altitude)
const GAS_CONSTANT_AIR = 287.053; // J/(kg·K) - specific gas constant for dry air
const TROPOPAUSE_ALTITUDE = 11000; // m (11 km)

/**
 * Calculate ISA temperature at altitude
 * 
 * T = T0 + L * h
 * 
 * Where:
 * - T0 = sea level temperature (288.15 K)
 * - L = lapse rate (-0.0065 K/m)
 * - h = altitude (m)
 */
export function calculateISATemperature(altitudeM: number, deltaT: number = 0): number {
  if (altitudeM <= 0) {
    return ISA_SEA_LEVEL_TEMP + deltaT;
  }
  
  if (altitudeM > TROPOPAUSE_ALTITUDE) {
    // Above tropopause, temperature is constant at tropopause temperature
    const tropopauseTemp = ISA_SEA_LEVEL_TEMP + ISA_LAPSE_RATE * TROPOPAUSE_ALTITUDE;
    return tropopauseTemp + deltaT;
  }
  
  // Linear lapse rate up to tropopause
  const temperature = ISA_SEA_LEVEL_TEMP + ISA_LAPSE_RATE * altitudeM;
  return temperature + deltaT;
}

/**
 * Calculate ISA pressure at altitude using hydrostatic equation
 * 
 * For linear temperature profile:
 * p = p0 * (T / T0)^(g0 / (R * L))
 * 
 * Where:
 * - p0 = sea level pressure (101325 Pa)
 * - T = temperature at altitude
 * - T0 = sea level temperature (288.15 K)
 * - g0 = gravitational acceleration (9.80665 m/s²)
 * - R = gas constant (287.053 J/(kg·K))
 * - L = lapse rate (-0.0065 K/m)
 */
export function calculateISAPressure(altitudeM: number, deltaT: number = 0): number {
  if (altitudeM <= 0) {
    return ISA_SEA_LEVEL_PRESSURE;
  }
  
  const temperature = calculateISATemperature(altitudeM, deltaT);
  
  if (altitudeM > TROPOPAUSE_ALTITUDE) {
    // Above tropopause: exponential decay with constant temperature
    const tropopauseTemp = ISA_SEA_LEVEL_TEMP + ISA_LAPSE_RATE * TROPOPAUSE_ALTITUDE;
    const tropopausePressure = ISA_SEA_LEVEL_PRESSURE * 
      Math.pow(tropopauseTemp / ISA_SEA_LEVEL_TEMP, 9.80665 / (GAS_CONSTANT_AIR * -ISA_LAPSE_RATE));
    
    const g = 9.80665; // m/s²
    const deltaH = altitudeM - TROPOPAUSE_ALTITUDE;
    const exponent = -(g * deltaH) / (GAS_CONSTANT_AIR * tropopauseTemp);
    return tropopausePressure * Math.exp(exponent);
  }
  
  // Linear temperature profile
  const exponent = 9.80665 / (GAS_CONSTANT_AIR * -ISA_LAPSE_RATE);
  const pressure = ISA_SEA_LEVEL_PRESSURE * Math.pow(temperature / ISA_SEA_LEVEL_TEMP, exponent);
  return pressure;
}

/**
 * Calculate ISA air density at altitude
 * 
 * Using ideal gas law: ρ = p / (R * T)
 * 
 * Where:
 * - p = pressure (Pa)
 * - R = gas constant (287.053 J/(kg·K))
 * - T = temperature (K)
 */
export function calculateISADensity(altitudeM: number, deltaT: number = 0): number {
  if (altitudeM <= 0) {
    return ISA_SEA_LEVEL_DENSITY;
  }
  
  const pressure = calculateISAPressure(altitudeM, deltaT);
  const temperature = calculateISATemperature(altitudeM, deltaT);
  
  if (temperature <= 0) {
    throw new Error('Invalid temperature: cannot be zero or negative');
  }
  
  // Ideal gas law
  const density = pressure / (GAS_CONSTANT_AIR * temperature);
  return density;
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

