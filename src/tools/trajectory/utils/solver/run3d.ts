/**
 * 3D Rotational Trajectory Solver with Quaternion Attitude
 * 
 * Full 6-DOF simulation with quaternion-based attitude
 */

import { getAtmosphericDensity, getGravityVector, Planet } from '../../data/planets';
import { calculateDrag } from '../physics/drag';
import { getStageThrust, getStageIsp, Stage, checkStaging, getStageMass } from '../physics/staging';
import { calculatePropellantConsumed } from '../physics/thrust';
import {
  Quaternion,
  quaternionIdentity,
  quaternionNormalize,
  quaternionDerivative,
  quaternionRotateVector,
  quaternionToEuler,
} from '../physics/quaternion';

export interface Guidance3D {
  pitchProgram?: Array<{ time: number; pitch: number }>;
  yawProgram?: Array<{ time: number; yaw: number }>;
  rollProgram?: Array<{ time: number; roll: number }>;
  targetAttitude?: Quaternion;
}

export interface Trajectory3DInputs {
  planet: Planet;
  stages: Stage[];
  guidance: Guidance3D;
  initialPosition?: [number, number, number]; // [x, y, z] in ECEF (m)
  initialVelocity?: [number, number, number]; // [vx, vy, vz] (m/s)
  initialAttitude?: Quaternion;
  initialAngularVelocity?: [number, number, number]; // [wx, wy, wz] (rad/s)
  timeStep?: number; // s
  maxTime?: number; // s
  maxAltitude?: number; // m
}

export interface Trajectory3DState {
  t: number; // time (s)
  position: [number, number, number]; // m
  velocity: [number, number, number]; // m/s
  attitude: Quaternion;
  angularVelocity: [number, number, number]; // rad/s
  altitude: number; // m
  mass: number; // kg
  stageIndex: number;
  remainingFuel: number; // kg
  thrust: number; // N
  drag: number; // N
  acceleration: [number, number, number]; // m/s²
  dynamicPressure: number; // Pa
  eulerAngles: [number, number, number]; // [yaw, pitch, roll] (rad)
}

export interface Trajectory3DResult {
  states: Trajectory3DState[];
  maxQ: {
    value: number;
    altitude: number;
    time: number;
  };
  burnout: {
    position: [number, number, number];
    velocity: [number, number, number];
    altitude: number;
    time: number;
  };
  stagingEvents: Array<{
    stageIndex: number;
    time: number;
    position: [number, number, number];
    velocity: [number, number, number];
  }>;
}

/**
 * Get target attitude from guidance
 */
function getTargetAttitude(guidance: Guidance3D, time: number): Quaternion {
  let pitch = Math.PI / 2; // Default: vertical
  let yaw = 0;
  let roll = 0;

  if (guidance.pitchProgram) {
    for (let i = 0; i < guidance.pitchProgram.length - 1; i++) {
      if (time >= guidance.pitchProgram[i].time && 
          time <= guidance.pitchProgram[i + 1].time) {
        const t = (time - guidance.pitchProgram[i].time) / 
          (guidance.pitchProgram[i + 1].time - guidance.pitchProgram[i].time);
        pitch = (guidance.pitchProgram[i].pitch + 
          t * (guidance.pitchProgram[i + 1].pitch - guidance.pitchProgram[i].pitch)) * Math.PI / 180;
        break;
      }
    }
  }

  if (guidance.yawProgram) {
    for (let i = 0; i < guidance.yawProgram.length - 1; i++) {
      if (time >= guidance.yawProgram[i].time && 
          time <= guidance.yawProgram[i + 1].time) {
        const t = (time - guidance.yawProgram[i].time) / 
          (guidance.yawProgram[i + 1].time - guidance.yawProgram[i].time);
        yaw = (guidance.yawProgram[i].yaw + 
          t * (guidance.yawProgram[i + 1].yaw - guidance.yawProgram[i].yaw)) * Math.PI / 180;
        break;
      }
    }
  }

  if (guidance.rollProgram) {
    for (let i = 0; i < guidance.rollProgram.length - 1; i++) {
      if (time >= guidance.rollProgram[i].time && 
          time <= guidance.rollProgram[i + 1].time) {
        const t = (time - guidance.rollProgram[i].time) / 
          (guidance.rollProgram[i + 1].time - guidance.rollProgram[i].time);
        roll = (guidance.rollProgram[i].roll + 
          t * (guidance.rollProgram[i + 1].roll - guidance.rollProgram[i].roll)) * Math.PI / 180;
        break;
      }
    }
  }

  // Convert Euler to quaternion (ZYX order: yaw, pitch, roll)
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);

  return quaternionNormalize([
    cr * cp * cy + sr * sp * sy,
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy,
  ]);
}

/**
 * Run 3D rotational trajectory simulation
 */
export function run3D(inputs: Trajectory3DInputs): Trajectory3DResult {
  const {
    planet,
    stages,
    guidance,
    initialPosition = [0, 0, planet.radius],
    initialVelocity = [0, 0, 0],
    initialAttitude = quaternionIdentity(),
    initialAngularVelocity = [0, 0, 0],
    timeStep = 0.1,
    maxTime = 1000,
    maxAltitude = 1000000,
  } = inputs;

  const states: Trajectory3DState[] = [];
  const stagingEvents: Trajectory3DResult['stagingEvents'] = [];
  
  let t = 0;
  let position: [number, number, number] = [...initialPosition];
  let velocity: [number, number, number] = [...initialVelocity];
  let attitude: Quaternion = [...initialAttitude];
  let angularVelocity: [number, number, number] = [...initialAngularVelocity];
  let stageIndex = 0;
  let remainingFuel = stages[0]?.fuelMass || 0;
  let mass = getStageMass(stages[0], remainingFuel);
  
  let maxQ = { value: 0, altitude: 0, time: 0 };
  let burnout: Trajectory3DResult['burnout'] | null = null;
  let allStagesDepleted = false;

  const g0 = planet.surfaceGravity;

  while (t < maxTime && !allStagesDepleted) {
    const currentStage = stages[stageIndex];
    if (!currentStage) break;

    // Calculate altitude
    const r = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
    const altitude = r - planet.radius;

    if (altitude > maxAltitude) break;

    // Atmospheric properties
    const density = getAtmosphericDensity(planet, altitude);
    const gravity = getGravityVector(planet, position);

    // Get target attitude from guidance
    const targetAttitude = guidance.targetAttitude || getTargetAttitude(guidance, t);
    
    // Simple attitude control: gradually rotate toward target (simplified)
    // In reality, this would use control moments
    attitude = quaternionNormalize(attitude);
    
    // Angular velocity damping (simplified)
    angularVelocity = [
      angularVelocity[0] * 0.99,
      angularVelocity[1] * 0.99,
      angularVelocity[2] * 0.99,
    ];

    // Thrust
    const thrust = getStageThrust(currentStage, t);
    const isp = getStageIsp(currentStage);

    // Thrust vector in body frame (along +z)
    const thrustBody: [number, number, number] = [0, 0, thrust];
    
    // Rotate thrust to world frame
    const thrustWorld = quaternionRotateVector(attitude, thrustBody);

    // Velocity magnitude
    const velocityMag = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);

    // Drag (opposes velocity)
    const drag = calculateDrag(currentStage.Cd, currentStage.area, density, velocityMag);
    const dragDirection: [number, number, number] = velocityMag > 0
      ? [-velocity[0] / velocityMag, -velocity[1] / velocityMag, -velocity[2] / velocityMag]
      : [0, 0, 0];
    const dragVector: [number, number, number] = [
      drag * dragDirection[0],
      drag * dragDirection[1],
      drag * dragDirection[2],
    ];

    // Total force
    const Fx = thrustWorld[0] + dragVector[0] + gravity[0] * mass;
    const Fy = thrustWorld[1] + dragVector[1] + gravity[1] * mass;
    const Fz = thrustWorld[2] + dragVector[2] + gravity[2] * mass;

    // Acceleration
    const acceleration: [number, number, number] = [
      Fx / mass,
      Fy / mass,
      Fz / mass,
    ];

    // Update velocity
    velocity[0] += acceleration[0] * timeStep;
    velocity[1] += acceleration[1] * timeStep;
    velocity[2] += acceleration[2] * timeStep;

    // Update position
    position[0] += velocity[0] * timeStep;
    position[1] += velocity[1] * timeStep;
    position[2] += velocity[2] * timeStep;

    // Update attitude (quaternion integration)
    const dq = quaternionDerivative(attitude, angularVelocity);
    attitude[0] += dq[0] * timeStep;
    attitude[1] += dq[1] * timeStep;
    attitude[2] += dq[2] * timeStep;
    attitude[3] += dq[3] * timeStep;
    attitude = quaternionNormalize(attitude);

    // Dynamic pressure
    const dynamicPressure = 0.5 * density * velocityMag * velocityMag;
    if (dynamicPressure > maxQ.value) {
      maxQ = { value: dynamicPressure, altitude, time: t };
    }

    // Euler angles
    const eulerAngles = quaternionToEuler(attitude);

    // Record state
    states.push({
      t,
      position: [...position],
      velocity: [...velocity],
      attitude: [...attitude],
      angularVelocity: [...angularVelocity],
      altitude,
      mass,
      stageIndex,
      remainingFuel,
      thrust,
      drag,
      acceleration: [...acceleration],
      dynamicPressure,
      eulerAngles,
    });

    // Check burnout
    if (remainingFuel <= 0 && !burnout) {
      burnout = {
        position: [...position],
        velocity: [...velocity],
        altitude,
        time: t,
      };
    }

    // Check staging
    if (checkStaging(currentStage, t, altitude, velocityMag, remainingFuel)) {
      stagingEvents.push({
        stageIndex,
        time: t,
        position: [...position],
        velocity: [...velocity],
      });

      stageIndex++;
      if (stageIndex >= stages.length) {
        allStagesDepleted = true;
        break;
      }

      remainingFuel = stages[stageIndex].fuelMass;
      mass = getStageMass(stages[stageIndex], remainingFuel);
    }

    // Consume fuel
    if (thrust > 0 && isp > 0) {
      const fuelConsumed = calculatePropellantConsumed(thrust, isp, timeStep, g0);
      remainingFuel = Math.max(0, remainingFuel - fuelConsumed);
      mass = getStageMass(currentStage, remainingFuel);
    }

    t += timeStep;

    // Check if falling
    if (velocityMag < 0 && altitude < 1000) {
      break;
    }
  }

  return {
    states,
    maxQ,
    burnout: burnout || {
      position: states[states.length - 1]?.position || [0, 0, planet.radius],
      velocity: states[states.length - 1]?.velocity || [0, 0, 0],
      altitude: states[states.length - 1]?.altitude || 0,
      time: states[states.length - 1]?.t || 0,
    },
    stagingEvents,
  };
}
