/**
 * Aerobraking Module
 * Simulates atmospheric drag effects on orbital decay
 */

import { getAtmosphericDensity, Planet } from '../../data/planets';
import { calculateDrag } from '../physics/drag';

export interface AerobrakingState {
  altitude: number; // m
  velocity: number; // m/s
  density: number; // kg/m³
  drag: number; // N
  heating: number; // W/m² (simplified)
  time: number; // s
}

export interface AerobrakingResult {
  states: AerobrakingState[];
  circularizationAltitude?: number; // m
  decayTime?: number; // s
  totalDeltaV: number; // m/s
  passes: number;
}

/**
 * Simulate aerobraking pass
 */
export function simulateAerobrakingPass(
  planet: Planet,
  initialAltitude: number,
  initialVelocity: number,
  Cd: number,
  area: number,
  mass: number,
  periapsisAltitude: number,
  timeStep: number = 1.0,
  maxTime: number = 3600
): AerobrakingResult {
  const states: AerobrakingState[] = [];
  let altitude = initialAltitude;
  let velocity = initialVelocity;
  let totalDeltaV = 0;
  let passes = 0;
  let circularizationAltitude: number | undefined;
  let decayTime: number | undefined;

  const mu = planet.mu;
  const radius = planet.radius;

  // Simple aerobraking simulation
  // In reality, this would track the full orbit and only apply drag near periapsis
  let t = 0;
  let inAtmosphere = false;

  while (t < maxTime && altitude > radius) {
    // Check if in atmosphere
    const density = getAtmosphericDensity(planet, altitude);
    const inAtmo = density > 1e-6; // Threshold for "in atmosphere"

    if (inAtmo && !inAtmosphere) {
      passes++;
      inAtmosphere = true;
    } else if (!inAtmo && inAtmosphere) {
      inAtmosphere = false;
    }

    if (inAtmosphere) {
      // Calculate drag
      const drag = calculateDrag(Cd, area, density, velocity);
      const dragAccel = drag / mass;

      // Update velocity (simplified - assumes radial motion)
      const deltaV = dragAccel * timeStep;
      velocity = Math.max(0, velocity - deltaV);
      totalDeltaV += deltaV;

      // Calculate heating (simplified)
      const heating = 0.5 * density * (velocity ** 3) * 1e-6; // Rough estimate

      // Update altitude (simplified orbital mechanics)
      const r = radius + altitude;
      const orbitalEnergy = (velocity ** 2) / 2 - mu / r;
      const newA = -mu / (2 * orbitalEnergy);
      const newR = newA * (1 - 0.1); // Simplified - assume small eccentricity
      altitude = newR - radius;

      states.push({
        altitude,
        velocity,
        density,
        drag,
        heating,
        time: t,
      });

      // Check for circularization
      if (!circularizationAltitude && altitude > periapsisAltitude * 1.1) {
        circularizationAltitude = altitude;
      }

      // Check for decay
      if (altitude < radius + 100000 && velocity < 7500) {
        decayTime = t;
        break;
      }
    } else {
      // Outside atmosphere - simple orbital motion
      const r = radius + altitude;
      const orbitalPeriod = 2 * Math.PI * Math.sqrt((r ** 3) / mu);
      altitude = radius + r; // Simplified
    }

    t += timeStep;
  }

  return {
    states,
    circularizationAltitude,
    decayTime,
    totalDeltaV,
    passes,
  };
}
