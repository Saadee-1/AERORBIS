/**
 * Ballistic Missile Trajectory
 * Pure projectile motion with atmospheric drag
 */

import { getAtmosphericDensity, getGravity, Planet } from '../../data/planets';
import { calculateDrag } from '../physics/drag';

export interface BallisticInputs {
  planet: Planet;
  launchAngle: number; // degrees
  burnoutVelocity: number; // m/s
  burnoutAltitude: number; // m
  Cd: number;
  area: number;
  mass: number;
  timeStep?: number;
  maxTime?: number;
}

export interface BallisticState {
  t: number; // s
  altitude: number; // m
  range: number; // m
  velocity: number; // m/s
  mach: number;
  flightPathAngle: number; // rad
}

export interface BallisticResult {
  states: BallisticState[];
  maxAltitude: number; // m
  maxRange: number; // m
  impactTime: number; // s
  impactVelocity: number; // m/s
  impactAngle: number; // degrees
}

/**
 * Calculate ballistic trajectory
 */
export function calculateBallisticTrajectory(inputs: BallisticInputs): BallisticResult {
  const {
    planet,
    launchAngle,
    burnoutVelocity,
    burnoutAltitude,
    Cd,
    area,
    mass,
    timeStep = 0.1,
    maxTime = 1000,
  } = inputs;

  const states: BallisticState[] = [];
  const launchAngleRad = (launchAngle * Math.PI) / 180;

  let t = 0;
  let altitude = burnoutAltitude;
  let range = 0;
  let vx = burnoutVelocity * Math.cos(launchAngleRad);
  let vy = burnoutVelocity * Math.sin(launchAngleRad);
  let flightPathAngle = launchAngleRad;

  let maxAltitude = altitude;
  let maxRange = 0;
  let impactTime = 0;
  let impactVelocity = 0;
  let impactAngle = 0;

  const speedOfSound = 343; // m/s (simplified)

  while (t < maxTime && altitude > 0) {
    const velocity = Math.sqrt(vx ** 2 + vy ** 2);
    const density = getAtmosphericDensity(planet, altitude);
    const gravity = getGravity(planet, altitude);

    // Drag
    const drag = calculateDrag(Cd, area, density, velocity);
    const dragX = -drag * (vx / velocity);
    const dragY = -drag * (vy / velocity);

    // Acceleration
    const ax = dragX / mass;
    const ay = -gravity + dragY / mass;

    // Update velocity
    vx += ax * timeStep;
    vy += ay * timeStep;

    // Update position
    range += vx * timeStep;
    altitude += vy * timeStep;

    // Update flight path angle
    flightPathAngle = Math.atan2(vy, vx);

    // Mach number
    const mach = velocity / speedOfSound;

    states.push({
      t,
      altitude,
      range,
      velocity,
      mach,
      flightPathAngle,
    });

    // Track maximums
    if (altitude > maxAltitude) {
      maxAltitude = altitude;
    }
    if (range > maxRange) {
      maxRange = range;
    }

    // Check for impact
    if (altitude <= 0 && impactTime === 0) {
      impactTime = t;
      impactVelocity = velocity;
      impactAngle = Math.abs(flightPathAngle * 180 / Math.PI);
      break;
    }

    t += timeStep;
  }

  return {
    states,
    maxAltitude,
    maxRange,
    impactTime,
    impactVelocity,
    impactAngle,
  };
}
