/**
 * 2D Gravity Turn Trajectory Solver
 * 
 * Solves trajectory in 2D plane with pitch program
 */

import { getAtmosphericDensity, getGravity, Planet } from '../../data/planets';
import { calculateDrag } from '../physics/drag';
import { getStageThrust, getStageIsp, Stage, checkStaging, getStageMass } from '../physics/staging';
import { calculatePropellantConsumed } from '../physics/thrust';

export interface GuidanceProfile {
  type: 'manual' | 'gravity_turn' | 'constant_pitch_rate' | 'orbital_insertion';
  initialPitch?: number; // degrees
  pitchRate?: number; // deg/s
  pitchTable?: Array<{ altitude: number; pitch: number }>; // Manual pitch program
  targetAltitude?: number; // m (for orbital insertion)
}

export interface Trajectory2DInputs {
  planet: Planet;
  stages: Stage[];
  guidance: GuidanceProfile;
  initialAltitude?: number; // m
  initialVelocity?: number; // m/s
  initialPitch?: number; // degrees
  timeStep?: number; // s
  maxTime?: number; // s
  maxAltitude?: number; // m
}

export interface Trajectory2DState {
  t: number; // time (s)
  altitude: number; // m
  downrange: number; // m
  velocity: number; // m/s
  flightPathAngle: number; // radians
  pitch: number; // radians
  mass: number; // kg
  stageIndex: number;
  remainingFuel: number; // kg
  thrust: number; // N
  drag: number; // N
  acceleration: number; // m/s²
  dynamicPressure: number; // Pa
  gravityLoss: number; // m/s
  dragLoss: number; // m/s
}

export interface Trajectory2DResult {
  states: Trajectory2DState[];
  maxQ: {
    value: number;
    altitude: number;
    time: number;
  };
  burnout: {
    altitude: number;
    downrange: number;
    velocity: number;
    flightPathAngle: number;
    time: number;
  };
  stagingEvents: Array<{
    stageIndex: number;
    time: number;
    altitude: number;
    downrange: number;
    velocity: number;
  }>;
  losses: {
    gravity: number; // m/s
    drag: number; // m/s
    steering: number; // m/s
  };
}

/**
 * Get pitch angle based on guidance profile
 */
function getPitchAngle(
  guidance: GuidanceProfile,
  altitude: number,
  velocity: number,
  flightPathAngle: number,
  time: number
): number {
  if (guidance.type === 'manual' && guidance.pitchTable) {
    // Interpolate from pitch table
    for (let i = 0; i < guidance.pitchTable.length - 1; i++) {
      if (altitude >= guidance.pitchTable[i].altitude && 
          altitude <= guidance.pitchTable[i + 1].altitude) {
        const t = (altitude - guidance.pitchTable[i].altitude) / 
          (guidance.pitchTable[i + 1].altitude - guidance.pitchTable[i].altitude);
        return (guidance.pitchTable[i].pitch + 
          t * (guidance.pitchTable[i + 1].pitch - guidance.pitchTable[i].pitch)) * Math.PI / 180;
      }
    }
    return (guidance.pitchTable[guidance.pitchTable.length - 1].pitch) * Math.PI / 180;
  } else if (guidance.type === 'gravity_turn') {
    // Gravity turn: vertical until kick altitude, then small perturbation, then follow flight path
    const kickAltitude = 500; // meters - pitch kick altitude
    const kickAngleDeg = 1.5; // degrees - small perturbation to initiate turn
    const kickAngleRad = (kickAngleDeg * Math.PI) / 180;
    
    if (altitude < kickAltitude) {
      // Vertical ascent phase
      return Math.PI / 2;
    } else if (altitude < kickAltitude + 200) {
      // Pitch kick phase - apply small perturbation
      return Math.PI / 2 - kickAngleRad;
    } else {
      // Gravity turn phase - pitch follows flight path angle
      return flightPathAngle;
    }
  } else if (guidance.type === 'constant_pitch_rate' && guidance.initialPitch && guidance.pitchRate) {
    // Constant pitch rate
    const initialPitchRad = (guidance.initialPitch * Math.PI) / 180;
    const pitchRateRad = (guidance.pitchRate * Math.PI) / 180;
    return initialPitchRad - pitchRateRad * time;
  } else if (guidance.type === 'orbital_insertion' && guidance.targetAltitude) {
    // Pitch to achieve orbital altitude
    if (altitude < guidance.targetAltitude * 0.9) {
      return Math.PI / 2 - (altitude / guidance.targetAltitude) * Math.PI / 2;
    } else {
      return 0; // Horizontal
    }
  }
  
  // Default: vertical
  return Math.PI / 2;
}

/**
 * Run 2D gravity turn simulation
 */
export function run2D(inputs: Trajectory2DInputs): Trajectory2DResult {
  const {
    planet,
    stages,
    guidance,
    initialAltitude = 0,
    initialVelocity = 0,
    initialPitch = 90,
    timeStep = 0.1,
    maxTime = 1000,
    maxAltitude = 1000000,
  } = inputs;

  const states: Trajectory2DState[] = [];
  const stagingEvents: Trajectory2DResult['stagingEvents'] = [];
  
  let t = 0;
  let altitude = initialAltitude;
  let downrange = 0;
  let velocity = initialVelocity;
  let flightPathAngle = (initialPitch * Math.PI) / 180;
  let pitch = flightPathAngle;
  let stageIndex = 0;
  let remainingFuel = stages[0]?.fuelMass || 0;
  let mass = getStageMass(stages[0], remainingFuel);
  
  let maxQ = { value: 0, altitude: 0, time: 0 };
  let burnout: Trajectory2DResult['burnout'] | null = null;
  let allStagesDepleted = false;

  let totalGravityLoss = 0;
  let totalDragLoss = 0;
  let totalSteeringLoss = 0;

  const g0 = planet.surfaceGravity;

  while (t < maxTime && altitude < maxAltitude && !allStagesDepleted) {
    const currentStage = stages[stageIndex];
    if (!currentStage) break;

    // Get pitch from guidance
    pitch = getPitchAngle(guidance, altitude, velocity, flightPathAngle, t);

    // Atmospheric properties
    const density = getAtmosphericDensity(planet, altitude);
    const gravity = getGravity(planet, altitude);

    // Thrust
    const thrust = getStageThrust(currentStage, t);
    const isp = getStageIsp(currentStage);

    // Velocity components
    const vx = velocity * Math.cos(flightPathAngle);
    const vy = velocity * Math.sin(flightPathAngle);

    // Drag (opposes velocity)
    const drag = calculateDrag(currentStage.Cd, currentStage.area, density, velocity);
    const dragX = -drag * Math.cos(flightPathAngle);
    const dragY = -drag * Math.sin(flightPathAngle);

    // Thrust components
    const thrustX = thrust * Math.cos(pitch);
    const thrustY = thrust * Math.sin(pitch);

    // Gravity (downward)
    const gravityX = 0;
    const gravityY = -mass * gravity;

    // Total forces
    const Fx = thrustX + dragX + gravityX;
    const Fy = thrustY + dragY + gravityY;

    // Accelerations
    const ax = Fx / mass;
    const ay = Fy / mass;
    const acceleration = Math.sqrt(ax * ax + ay * ay);

    // Update velocity components
    const vxNew = vx + ax * timeStep;
    const vyNew = vy + ay * timeStep;
    const velocityNew = Math.sqrt(vxNew * vxNew + vyNew * vyNew);
    const flightPathAngleNew = Math.atan2(vyNew, vxNew);

    // Update position
    altitude += vy * timeStep;
    downrange += vx * timeStep;

    // Dynamic pressure
    const dynamicPressure = 0.5 * density * velocityNew * velocityNew;
    if (dynamicPressure > maxQ.value) {
      maxQ = { value: dynamicPressure, altitude, time: t };
    }

    // Calculate losses
    const gravityLossComponent = gravity * Math.sin(flightPathAngle) * timeStep;
    const dragLossComponent = (drag / mass) * timeStep;
    const steeringLossComponent = Math.abs(pitch - flightPathAngle) * velocity * 0.1; // Simplified

    totalGravityLoss += gravityLossComponent;
    totalDragLoss += dragLossComponent;
    totalSteeringLoss += steeringLossComponent;

    // Record state
    states.push({
      t,
      altitude,
      downrange,
      velocity: velocityNew,
      flightPathAngle: flightPathAngleNew,
      pitch,
      mass,
      stageIndex,
      remainingFuel,
      thrust,
      drag,
      acceleration,
      dynamicPressure,
      gravityLoss: totalGravityLoss,
      dragLoss: totalDragLoss,
    });

    // Check burnout
    if (remainingFuel <= 0 && !burnout) {
      burnout = {
        altitude,
        downrange,
        velocity: velocityNew,
        flightPathAngle: flightPathAngleNew,
        time: t,
      };
    }

    // Check staging
    if (checkStaging(currentStage, t, altitude, velocityNew, remainingFuel)) {
      stagingEvents.push({
        stageIndex,
        time: t,
        altitude,
        downrange,
        velocity: velocityNew,
      });

      stageIndex++;
      if (stageIndex >= stages.length) {
        allStagesDepleted = true;
        break;
      }

      remainingFuel = stages[stageIndex].fuelMass;
      mass = getStageMass(stages[stageIndex], remainingFuel);
    }

    // Update for next iteration
    velocity = velocityNew;
    flightPathAngle = flightPathAngleNew;

    // Consume fuel
    if (thrust > 0 && isp > 0) {
      const fuelConsumed = calculatePropellantConsumed(thrust, isp, timeStep, g0);
      remainingFuel = Math.max(0, remainingFuel - fuelConsumed);
      mass = getStageMass(currentStage, remainingFuel);
    }

    t += timeStep;

    // Check if falling
    if (velocityNew < 0 && altitude < 1000) {
      break;
    }
  }

  return {
    states,
    maxQ,
    burnout: burnout || {
      altitude: states[states.length - 1]?.altitude || 0,
      downrange: states[states.length - 1]?.downrange || 0,
      velocity: states[states.length - 1]?.velocity || 0,
      flightPathAngle: states[states.length - 1]?.flightPathAngle || 0,
      time: states[states.length - 1]?.t || 0,
    },
    stagingEvents,
    losses: {
      gravity: totalGravityLoss,
      drag: totalDragLoss,
      steering: totalSteeringLoss,
    },
  };
}
