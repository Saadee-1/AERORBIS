/**
 * Unit conversion utilities for rocket engine calculations
 */

/**
 * Convert pressure from bar to Pa
 */
export function barToPa(bar: number): number {
  return bar * 1e5;
}

/**
 * Convert pressure from Pa to bar
 */
export function paToBar(pa: number): number {
  return pa / 1e5;
}

/**
 * Convert area from cm² to m²
 */
export function cm2ToM2(cm2: number): number {
  return cm2 / 1e4;
}

/**
 * Convert area from m² to cm²
 */
export function m2ToCm2(m2: number): number {
  return m2 * 1e4;
}

/**
 * Convert temperature from Celsius to Kelvin
 */
export function celsiusToKelvin(celsius: number): number {
  return celsius + 273.15;
}

/**
 * Convert temperature from Kelvin to Celsius
 */
export function kelvinToCelsius(kelvin: number): number {
  return kelvin - 273.15;
}

/**
 * Convert altitude to pressure (simplified standard atmosphere)
 * 
 * P = P0 * (1 - L*h/T0)^(g*M/(R*L))
 * 
 * Where:
 * P0 = 101325 Pa (sea level)
 * L = 0.0065 K/m (lapse rate)
 * T0 = 288.15 K (sea level temperature)
 * g = 9.80665 m/s²
 * M = 0.0289644 kg/mol (molar mass of air)
 * R = 8.31447 J/(mol·K)
 * 
 * @param altitude - Altitude in meters
 * @returns Pressure in Pa
 */
export function altitudeToPressure(altitude: number): number {
  const P0 = 101325; // Sea level pressure (Pa)
  const L = 0.0065; // Lapse rate (K/m)
  const T0 = 288.15; // Sea level temperature (K)
  const g = 9.80665; // Gravity (m/s²)
  const M = 0.0289644; // Molar mass of air (kg/mol)
  const R = 8.31447; // Gas constant (J/(mol·K))
  
  if (altitude <= 0) {
    return P0;
  }
  
  if (altitude > 11000) {
    // Above tropopause, use exponential model
    const h_tropopause = 11000;
    const P_tropopause = P0 * Math.pow(1 - L * h_tropopause / T0, g * M / (R * L));
    const T_tropopause = T0 - L * h_tropopause;
    const h_above = altitude - h_tropopause;
    return P_tropopause * Math.exp(-g * M * h_above / (R * T_tropopause));
  }
  
  const exponent = g * M / (R * L);
  const term = 1 - L * altitude / T0;
  
  if (term <= 0) {
    return 0; // Above atmosphere
  }
  
  return P0 * Math.pow(term, exponent);
}

