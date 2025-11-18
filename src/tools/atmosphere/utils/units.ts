/**
 * Unit conversion utilities for Standard Atmosphere Calculator
 */

export type UnitSystem = 'SI' | 'Imperial';

/**
 * Convert altitude from various units to meters (SI)
 */
export function convertAltitudeToSI(value: number, unit: 'm' | 'ft' | 'km'): number {
  switch (unit) {
    case 'm':
      return value;
    case 'ft':
      return value * 0.3048; // feet to meters
    case 'km':
      return value * 1000; // kilometers to meters
    default:
      return value;
  }
}

/**
 * Convert altitude from SI (meters) to various units
 */
export function convertAltitudeFromSI(value: number, unit: 'm' | 'ft' | 'km'): number {
  switch (unit) {
    case 'm':
      return value;
    case 'ft':
      return value / 0.3048; // meters to feet
    case 'km':
      return value / 1000; // meters to kilometers
    default:
      return value;
  }
}

/**
 * Convert velocity from various units to m/s (SI)
 */
export function convertVelocityToSI(value: number, unit: 'm/s' | 'ft/s' | 'km/h' | 'knots'): number {
  switch (unit) {
    case 'm/s':
      return value;
    case 'ft/s':
      return value * 0.3048; // ft/s to m/s
    case 'km/h':
      return value / 3.6; // km/h to m/s
    case 'knots':
      return value * 0.514444; // knots to m/s
    default:
      return value;
  }
}

/**
 * Convert velocity from SI (m/s) to various units
 */
export function convertVelocityFromSI(value: number, unit: 'm/s' | 'ft/s' | 'km/h' | 'knots'): number {
  switch (unit) {
    case 'm/s':
      return value;
    case 'ft/s':
      return value / 0.3048; // m/s to ft/s
    case 'km/h':
      return value * 3.6; // m/s to km/h
    case 'knots':
      return value / 0.514444; // m/s to knots
    default:
      return value;
  }
}

/**
 * Convert temperature from various units to Kelvin
 */
export function convertTemperatureToSI(value: number, unit: 'K' | 'C' | 'F'): number {
  switch (unit) {
    case 'K':
      return value;
    case 'C':
      return value + 273.15; // Celsius to Kelvin
    case 'F':
      return (value + 459.67) * (5 / 9); // Fahrenheit to Kelvin
    default:
      return value;
  }
}

/**
 * Convert temperature from Kelvin to various units
 */
export function convertTemperatureFromSI(value: number, unit: 'K' | 'C' | 'F'): number {
  switch (unit) {
    case 'K':
      return value;
    case 'C':
      return value - 273.15; // Kelvin to Celsius
    case 'F':
      return value * (9 / 5) - 459.67; // Kelvin to Fahrenheit
    default:
      return value;
  }
}

/**
 * Convert pressure from various units to Pascals
 */
export function convertPressureToSI(value: number, unit: 'Pa' | 'psi' | 'inHg' | 'atm' | 'bar'): number {
  switch (unit) {
    case 'Pa':
      return value;
    case 'psi':
      return value * 6894.76; // psi to Pa
    case 'inHg':
      return value * 3386.39; // inHg to Pa
    case 'atm':
      return value * 101325; // atm to Pa
    case 'bar':
      return value * 100000; // bar to Pa
    default:
      return value;
  }
}

/**
 * Convert pressure from Pascals to various units
 */
export function convertPressureFromSI(value: number, unit: 'Pa' | 'psi' | 'inHg' | 'atm' | 'bar'): number {
  switch (unit) {
    case 'Pa':
      return value;
    case 'psi':
      return value / 6894.76; // Pa to psi
    case 'inHg':
      return value / 3386.39; // Pa to inHg
    case 'atm':
      return value / 101325; // Pa to atm
    case 'bar':
      return value / 100000; // Pa to bar
    default:
      return value;
  }
}

/**
 * Convert density from various units to kg/m³
 */
export function convertDensityToSI(value: number, unit: 'kg/m³' | 'slug/ft³' | 'lb/ft³'): number {
  switch (unit) {
    case 'kg/m³':
      return value;
    case 'slug/ft³':
      return value * 515.379; // slug/ft³ to kg/m³
    case 'lb/ft³':
      return value * 16.0185; // lb/ft³ to kg/m³
    default:
      return value;
  }
}

/**
 * Convert density from kg/m³ to various units
 */
export function convertDensityFromSI(value: number, unit: 'kg/m³' | 'slug/ft³' | 'lb/ft³'): number {
  switch (unit) {
    case 'kg/m³':
      return value;
    case 'slug/ft³':
      return value / 515.379; // kg/m³ to slug/ft³
    case 'lb/ft³':
      return value / 16.0185; // kg/m³ to lb/ft³
    default:
      return value;
  }
}

/**
 * Get unit labels based on unit system
 */
export function getUnitLabels(unitSystem: UnitSystem) {
  if (unitSystem === 'Imperial') {
    return {
      altitude: 'ft',
      altitudeLong: 'km',
      velocity: 'ft/s',
      temperature: 'F',
      pressure: 'psi',
      density: 'slug/ft³',
      speedOfSound: 'ft/s',
      viscosity: 'lb·s/ft²',
      gravity: 'ft/s²',
      dynamicPressure: 'psf',
    };
  } else {
    return {
      altitude: 'm',
      altitudeLong: 'km',
      velocity: 'm/s',
      temperature: 'K',
      pressure: 'Pa',
      density: 'kg/m³',
      speedOfSound: 'm/s',
      viscosity: 'Pa·s',
      gravity: 'm/s²',
      dynamicPressure: 'Pa',
    };
  }
}

