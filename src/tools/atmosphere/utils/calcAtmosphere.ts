/**
 * Standard Atmosphere 1976 Calculations
 * 
 * Implements exact equations from U.S. Standard Atmosphere 1976
 */

import {
  EARTH_RADIUS,
  GAS_CONSTANT_R,
  GRAVITY_SEA_LEVEL,
  GAMMA,
  VISCOSITY_REF_TEMP,
  VISCOSITY_REF_VALUE,
  SUTHERLAND_CONSTANT,
  SEA_LEVEL_PRESSURE,
  MIN_ALTITUDE,
  MAX_ALTITUDE,
} from './constants';
import { findLayerForAltitude, ATMOSPHERE_LAYERS } from '../data/layerData';

export interface AtmosphereResult {
  // Geopotential altitude (input)
  geopotentialAltitude: number; // m
  
  // Geometric altitude (calculated)
  geometricAltitude: number; // m
  
  // Primary properties
  temperature: number; // K
  pressure: number; // Pa
  density: number; // kg/m³
  speedOfSound: number; // m/s
  viscosity: number; // Pa·s
  gravity: number; // m/s²
  
  // Derived properties
  dynamicPressure?: number; // Pa (if velocity provided)
  pressureRatio: number; // P / P0
  densityRatio: number; // ρ / ρ0
  temperatureRatio: number; // T / T0
  
  // Layer information
  layerName: string;
  layerId: string;
  
  // Warnings
  warnings: string[];
}

/**
 * Convert geopotential altitude to geometric altitude
 * 
 * H = h * R_e / (R_e - h)
 * 
 * Where:
 * - h = geopotential altitude (m)
 * - H = geometric altitude (m)
 * - R_e = Earth radius (m)
 */
export function geopotentialToGeometric(geopotentialAltitude: number): number {
  if (geopotentialAltitude <= 0) {
    return geopotentialAltitude;
  }
  
  const denominator = EARTH_RADIUS - geopotentialAltitude;
  if (denominator <= 0) {
    throw new Error('Altitude too large for geopotential conversion');
  }
  
  return (geopotentialAltitude * EARTH_RADIUS) / denominator;
}

/**
 * Calculate gravity at geometric altitude
 * 
 * g(H) = g0 * (R_e / (R_e + H))^2
 * 
 * Where:
 * - g0 = sea level gravity (9.80665 m/s²)
 * - R_e = Earth radius (m)
 * - H = geometric altitude (m)
 */
export function calculateGravity(geometricAltitude: number): number {
  const ratio = EARTH_RADIUS / (EARTH_RADIUS + geometricAltitude);
  return GRAVITY_SEA_LEVEL * ratio * ratio;
}

/**
 * Calculate temperature in a layer
 * 
 * For Lb ≠ 0:
 *   T(h) = Tb + Lb * (h - hb)
 * 
 * For isothermal (Lb = 0):
 *   T(h) = Tb
 */
function calculateTemperature(altitude: number, layer: typeof ATMOSPHERE_LAYERS[0]): number {
  const deltaH = altitude - layer.baseHeight;
  
  if (layer.lapseRate === 0) {
    // Isothermal layer
    return layer.baseTemp;
  } else {
    // Linear lapse rate
    return layer.baseTemp + layer.lapseRate * deltaH;
  }
}

/**
 * Calculate pressure in a layer
 * 
 * For non-zero lapse rate:
 *   P = Pb * (Tb / T)^(g0 / (R * Lb))
 * 
 * For isothermal:
 *   P = Pb * exp[-g0 * (h - hb) / (R * Tb)]
 */
function calculatePressure(
  altitude: number,
  layer: typeof ATMOSPHERE_LAYERS[0],
  basePressure: number
): number {
  const deltaH = altitude - layer.baseHeight;
  
  if (layer.lapseRate === 0) {
    // Isothermal layer - exponential
    const exponent = -(GRAVITY_SEA_LEVEL * deltaH) / (GAS_CONSTANT_R * layer.baseTemp);
    return basePressure * Math.exp(exponent);
  } else {
    // Non-zero lapse rate - power law
    const temperature = calculateTemperature(altitude, layer);
    if (temperature <= 0) {
      throw new Error('Invalid temperature for pressure calculation');
    }
    
    const exponent = GRAVITY_SEA_LEVEL / (GAS_CONSTANT_R * layer.lapseRate);
    const ratio = layer.baseTemp / temperature;
    
    return basePressure * Math.pow(ratio, exponent);
  }
}

/**
 * Calculate density using ideal gas law
 * 
 * ρ = P / (R * T)
 * 
 * Where:
 * - P = pressure (Pa)
 * - T = temperature (K)
 * - R = gas constant (287.053 J/(kg·K))
 */
function calculateDensity(pressure: number, temperature: number): number {
  if (temperature <= 0) {
    throw new Error('Temperature must be positive for density calculation');
  }
  
  return pressure / (GAS_CONSTANT_R * temperature);
}

/**
 * Calculate speed of sound
 * 
 * a = sqrt(γ * R * T)
 * 
 * Where:
 * - γ = specific heat ratio (1.4)
 * - R = gas constant (287.053 J/(kg·K))
 * - T = temperature (K)
 */
function calculateSpeedOfSound(temperature: number): number {
  if (temperature <= 0) {
    throw new Error('Temperature must be positive for speed of sound calculation');
  }
  
  return Math.sqrt(GAMMA * GAS_CONSTANT_R * temperature);
}

/**
 * Calculate dynamic viscosity using Sutherland's law
 * 
 * μ = μ0 * (T / T0)^(3/2) * (T0 + S) / (T + S)
 * 
 * Where:
 * - μ0 = reference viscosity (1.716e-5 Pa·s)
 * - T0 = reference temperature (273.15 K)
 * - S = Sutherland constant (110.4 K)
 * - T = temperature (K)
 */
function calculateViscosity(temperature: number): number {
  if (temperature <= 0) {
    throw new Error('Temperature must be positive for viscosity calculation');
  }
  
  const tempRatio = temperature / VISCOSITY_REF_TEMP;
  const sutherlandTerm = (VISCOSITY_REF_TEMP + SUTHERLAND_CONSTANT) / (temperature + SUTHERLAND_CONSTANT);
  
  return VISCOSITY_REF_VALUE * Math.pow(tempRatio, 1.5) * sutherlandTerm;
}

/**
 * Calculate dynamic pressure
 * 
 * q = 0.5 * ρ * V²
 * 
 * Where:
 * - ρ = density (kg/m³)
 * - V = velocity (m/s)
 */
export function calculateDynamicPressure(density: number, velocity: number): number {
  return 0.5 * density * velocity * velocity;
}

/**
 * Main calculation function for Standard Atmosphere 1976
 * 
 * @param geopotentialAltitude - Geopotential altitude in meters (0-86000)
 * @param velocity - Optional velocity in m/s for dynamic pressure calculation
 * @returns Complete atmosphere properties
 */
export function calculateAtmosphere(
  geopotentialAltitude: number,
  velocity?: number
): AtmosphereResult {
  // Validation
  if (geopotentialAltitude < MIN_ALTITUDE || geopotentialAltitude > MAX_ALTITUDE) {
    throw new Error(`Altitude must be between ${MIN_ALTITUDE} and ${MAX_ALTITUDE} meters`);
  }
  
  const warnings: string[] = [];
  
  // Find the layer
  const layer = findLayerForAltitude(geopotentialAltitude);
  if (!layer) {
    throw new Error('Invalid altitude: could not determine atmospheric layer');
  }
  
  // Calculate geometric altitude
  const geometricAltitude = geopotentialToGeometric(geopotentialAltitude);
  
  // Calculate temperature
  const temperature = calculateTemperature(geopotentialAltitude, layer);
  
  if (temperature <= 0) {
    throw new Error('Invalid temperature calculated - check layer definitions');
  }
  
  // Calculate pressure layer by layer from sea level to target altitude
  // We need to compute pressure at each layer boundary, then use the layer containing the target altitude
  let pressure = SEA_LEVEL_PRESSURE;
  let currentPressure = SEA_LEVEL_PRESSURE;
  
  // Handle sea level case
  if (geopotentialAltitude === 0) {
    pressure = SEA_LEVEL_PRESSURE;
  } else {
    // Find which layer contains the target altitude
    let targetLayerIndex = -1;
    for (let i = 0; i < ATMOSPHERE_LAYERS.length; i++) {
      if (geopotentialAltitude >= ATMOSPHERE_LAYERS[i].baseHeight) {
        targetLayerIndex = i;
      }
    }
    
    if (targetLayerIndex === -1) {
      throw new Error('Could not determine layer for altitude');
    }
    
    // Calculate pressure up through each layer boundary
    for (let i = 0; i <= targetLayerIndex; i++) {
      const layer = ATMOSPHERE_LAYERS[i];
      
      // Determine the altitude we're calculating to within this layer
      let altitudeToCalculate: number;
      
      if (i < targetLayerIndex) {
        // We're going through this layer to its top boundary
        altitudeToCalculate = i < ATMOSPHERE_LAYERS.length - 1
          ? ATMOSPHERE_LAYERS[i + 1].baseHeight
          : layer.baseHeight;
      } else {
        // We're in the target layer, calculate to the target altitude
        altitudeToCalculate = geopotentialAltitude;
      }
      
      const deltaH = altitudeToCalculate - layer.baseHeight;
      
      if (Math.abs(deltaH) < 1e-9) {
        // No height change in this layer, pressure stays the same
        pressure = currentPressure;
        break;
      }
      
      // Calculate pressure at layer top
      if (layer.lapseRate === 0) {
        // Isothermal layer - exponential formula
        // P = Pb * exp[-g0 * (h - hb) / (R * Tb)]
        const exponent = -(GRAVITY_SEA_LEVEL * deltaH) / (GAS_CONSTANT_R * layer.baseTemp);
        currentPressure = currentPressure * Math.exp(exponent);
      } else {
        // Non-zero lapse rate - power law formula
        // P = Pb * (Tb / T)^(g0 / (R * Lb))
        const tempAtBase = calculateTemperature(layer.baseHeight, layer);
        const tempAtTop = calculateTemperature(altitudeToCalculate, layer);
        
        if (tempAtTop <= 0 || tempAtBase <= 0) {
          throw new Error('Invalid temperature in layer calculation');
        }
        
        const exponent = GRAVITY_SEA_LEVEL / (GAS_CONSTANT_R * layer.lapseRate);
        const ratio = tempAtBase / tempAtTop;
        
        currentPressure = currentPressure * Math.pow(ratio, exponent);
      }
      
      // If this is the target layer, we're done
      if (i === targetLayerIndex) {
        pressure = currentPressure;
        break;
      }
    }
  }
  
  // Calculate density
  const density = calculateDensity(pressure, temperature);
  
  // Calculate speed of sound
  const speedOfSound = calculateSpeedOfSound(temperature);
  
  // Calculate viscosity
  const viscosity = calculateViscosity(temperature);
  
  // Calculate gravity
  const gravity = calculateGravity(geometricAltitude);
  
  // Calculate dynamic pressure if velocity provided
  let dynamicPressure: number | undefined;
  if (velocity !== undefined && velocity >= 0) {
    dynamicPressure = calculateDynamicPressure(density, velocity);
  }
  
  // Calculate ratios
  const pressureRatio = pressure / SEA_LEVEL_PRESSURE;
  const densityRatio = density / 1.225; // Sea level density
  const temperatureRatio = temperature / 288.15; // Sea level temperature
  
  // Generate warnings
  if (geopotentialAltitude > 50000) {
    warnings.push('Very high altitude - rare air conditions');
  }
  if (pressure < 100) {
    warnings.push('Extremely low pressure - near vacuum conditions');
  }
  if (temperature < 200) {
    warnings.push('Very low temperature - cryogenic conditions');
  }
  
  return {
    geopotentialAltitude,
    geometricAltitude,
    temperature,
    pressure,
    density,
    speedOfSound,
    viscosity,
    gravity,
    dynamicPressure,
    pressureRatio,
    densityRatio,
    temperatureRatio,
    layerName: layer.name,
    layerId: layer.id,
    warnings,
  };
}

