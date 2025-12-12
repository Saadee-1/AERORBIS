/**
 * Guided Missile Trajectory
 * Proportional Navigation (Pro-Nav) guidance
 */

import { getAtmosphericDensity, Planet } from '../../data/planets';
import { calculateDrag } from '../physics/drag';

export interface GuidedMissileInputs {
  planet: Planet;
  initialPosition: [number, number, number]; // m
  initialVelocity: [number, number, number]; // m/s
  targetPosition: [number, number, number]; // m
  targetVelocity?: [number, number, number]; // m/s
  navigationConstant: number; // N (typically 3-5)
  maxG: number; // m/s²
  Cd: number;
  area: number;
  mass: number;
  thrust?: number; // N (optional sustainer)
  isp?: number; // s
  timeStep?: number;
  maxTime?: number;
}

export interface GuidedMissileState {
  t: number; // s
  position: [number, number, number]; // m
  velocity: [number, number, number]; // m/s
  acceleration: [number, number, number]; // m/s²
  rangeToTarget: number; // m
  closingVelocity: number; // m/s
  gForce: number; // g
}

export interface GuidedMissileResult {
  states: GuidedMissileState[];
  interceptTime?: number; // s
  missDistance?: number; // m
  maxG: number; // g
  totalDeltaV: number; // m/s
}

/**
 * Calculate guided missile trajectory using Proportional Navigation
 */
export function calculateGuidedTrajectory(inputs: GuidedMissileInputs): GuidedMissileResult {
  const {
    planet,
    initialPosition,
    initialVelocity,
    targetPosition,
    targetVelocity = [0, 0, 0],
    navigationConstant,
    maxG,
    Cd,
    area,
    mass,
    thrust = 0,
    isp = 300,
    timeStep = 0.1,
    maxTime = 1000,
  } = inputs;

  const states: GuidedMissileState[] = [];
  const position: [number, number, number] = [...initialPosition];
  const velocity: [number, number, number] = [...initialVelocity];
  let currentMass = mass;

  let interceptTime: number | undefined;
  let missDistance: number | undefined;
  let maxGForce = 0;
  let totalDeltaV = 0;

  const g0 = planet.surfaceGravity;
  const maxAccel = maxG * g0;

  let t = 0;

  while (t < maxTime) {
    // Calculate range to target
    const rangeVector: [number, number, number] = [
      targetPosition[0] - position[0],
      targetPosition[1] - position[1],
      targetPosition[2] - position[2],
    ];
    const range = Math.sqrt(rangeVector[0] ** 2 + rangeVector[1] ** 2 + rangeVector[2] ** 2);

    // Check for intercept
    if (range < 10 && !interceptTime) {
      interceptTime = t;
      missDistance = range;
      break;
    }

    // Relative velocity
    const relativeVelocity: [number, number, number] = [
      velocity[0] - targetVelocity[0],
      velocity[1] - targetVelocity[1],
      velocity[2] - targetVelocity[2],
    ];
    const closingVelocity = -(rangeVector[0] * relativeVelocity[0] +
      rangeVector[1] * relativeVelocity[1] +
      rangeVector[2] * relativeVelocity[2]) / range;

    // Line of sight (LOS) vector
    const los: [number, number, number] = [
      rangeVector[0] / range,
      rangeVector[1] / range,
      rangeVector[2] / range,
    ];

    // LOS rate (simplified)
    const losRate = closingVelocity / range;

    // Proportional Navigation command
    const navAccel = navigationConstant * Math.abs(closingVelocity) * Math.abs(losRate);

    // Command acceleration vector (perpendicular to LOS)
    const commandAccel: [number, number, number] = [
      navAccel * (-los[1]),
      navAccel * los[0],
      navAccel * 0.1, // Small vertical component
    ];

    // Limit to max G
    const commandMag = Math.sqrt(
      commandAccel[0] ** 2 + commandAccel[1] ** 2 + commandAccel[2] ** 2
    );
    if (commandMag > maxAccel) {
      const scale = maxAccel / commandMag;
      commandAccel[0] *= scale;
      commandAccel[1] *= scale;
      commandAccel[2] *= scale;
    }

    // Atmospheric drag
    const altitude = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2) - planet.radius;
    const density = getAtmosphericDensity(planet, altitude);
    const velocityMag = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);
    const drag = calculateDrag(Cd, area, density, velocityMag);
    const dragAccel = drag / currentMass;
    const dragVector: [number, number, number] = [
      -dragAccel * (velocity[0] / velocityMag),
      -dragAccel * (velocity[1] / velocityMag),
      -dragAccel * (velocity[2] / velocityMag),
    ];

    // Thrust acceleration
    const thrustAccel = thrust / currentMass;
    const thrustVector: [number, number, number] = [
      thrustAccel * (velocity[0] / velocityMag),
      thrustAccel * (velocity[1] / velocityMag),
      thrustAccel * (velocity[2] / velocityMag),
    ];

    // Total acceleration
    const acceleration: [number, number, number] = [
      commandAccel[0] + dragVector[0] + thrustVector[0],
      commandAccel[1] + dragVector[1] + thrustVector[1],
      commandAccel[2] + dragVector[2] + thrustVector[2],
    ];

    // Update velocity
    velocity[0] += acceleration[0] * timeStep;
    velocity[1] += acceleration[1] * timeStep;
    velocity[2] += acceleration[2] * timeStep;

    // Update position
    position[0] += velocity[0] * timeStep;
    position[1] += velocity[1] * timeStep;
    position[2] += velocity[2] * timeStep;

    // Update mass (if thrusting)
    if (thrust > 0) {
      const massFlow = thrust / (isp * g0);
      currentMass = Math.max(currentMass - massFlow * timeStep, mass * 0.1);
    }

    // Calculate G-force
    const accelMag = Math.sqrt(acceleration[0] ** 2 + acceleration[1] ** 2 + acceleration[2] ** 2);
    const gForce = accelMag / g0;
    if (gForce > maxGForce) {
      maxGForce = gForce;
    }

    totalDeltaV += accelMag * timeStep;

    states.push({
      t,
      position: [...position],
      velocity: [...velocity],
      acceleration: [...acceleration],
      rangeToTarget: range,
      closingVelocity,
      gForce,
    });

    t += timeStep;
  }

  return {
    states,
    interceptTime,
    missDistance,
    maxG: maxGForce,
    totalDeltaV,
  };
}
