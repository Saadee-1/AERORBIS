/**
 * 1D Vertical Ascent Trajectory Solver
 * 
 * Solves: dv/dt = (T - D - mg) / m
 *         dm/dt = -T / (Isp * g0)
 */

import { integrate, rk4 } from '../physics/integrators';
import { getAtmosphericDensity, getGravity, Planet } from '../../data/planets';
import { calculateDrag } from '../physics/drag';
import { getThrust, calculatePropellantConsumed, Engine } from '../physics/thrust';
import { Stage, checkStaging, getStageMass, getStageThrust, getStageIsp } from '../physics/staging';

export interface Trajectory1DInputs {
  planet: Planet;
  stages: Stage[];
  initialAltitude?: number; // m
  initialVelocity?: number; // m/s
  timeStep?: number; // s
  maxTime?: number; // s
  maxAltitude?: number; // m
}

export interface Trajectory1DState {
  t: number; // time (s)
  altitude: number; // m
  velocity: number; // m/s
  mass: number; // kg
  stageIndex: number;
  remainingFuel: number; // kg
  thrust: number; // N
  drag: number; // N
  acceleration: number; // m/s²
  dynamicPressure: number; // Pa
  thrustToWeight: number;
}

export interface Trajectory1DResult {
  states: Trajectory1DState[];
  maxQ: {
    value: number;
    altitude: number;
    time: number;
  };
  burnout: {
    altitude: number;
    velocity: number;
    time: number;
  };
  terminalVelocity?: number;
  stagingEvents: Array<{
    stageIndex: number;
    time: number;
    altitude: number;
    velocity: number;
  }>;
}

/**
 * Run 1D vertical ascent simulation
 */
export function run1D(inputs: Trajectory1DInputs): Trajectory1DResult {
  const {
    planet,
    stages,
    initialAltitude = 0,
    initialVelocity = 0,
    timeStep = 0.1,
    maxTime = 1000,
    maxAltitude = 1000000,
  } = inputs;

  const states: Trajectory1DState[] = [];
  const stagingEvents: Trajectory1DResult['stagingEvents'] = [];
  
  let t = 0;
  let altitude = initialAltitude;
  let velocity = initialVelocity;
  let stageIndex = 0;
  let remainingFuel = stages[0]?.fuelMass || 0;
  let mass = getStageMass(stages[0], remainingFuel);
  
  let maxQ = { value: 0, altitude: 0, time: 0 };
  let burnout: Trajectory1DResult['burnout'] | null = null;
  let allStagesDepleted = false;

  const g0 = planet.surfaceGravity;

  while (t < maxTime && altitude < maxAltitude && !allStagesDepleted) {
    // Get current stage
    const currentStage = stages[stageIndex];
    if (!currentStage) {
      break;
    }

    // Calculate atmospheric properties
    const density = getAtmosphericDensity(planet, altitude);
    const gravity = getGravity(planet, altitude);

    // Calculate thrust
    const thrust = getStageThrust(currentStage, t);
    const isp = getStageIsp(currentStage);

    // Calculate drag
    const drag = calculateDrag(currentStage.Cd, currentStage.area, density, velocity);

    // Calculate acceleration
    const acceleration = (thrust - drag - mass * gravity) / mass;

    // Calculate dynamic pressure
    const dynamicPressure = 0.5 * density * velocity * velocity;

    // Track max Q
    if (dynamicPressure > maxQ.value) {
      maxQ = { value: dynamicPressure, altitude, time: t };
    }

    // Calculate thrust-to-weight
    const thrustToWeight = thrust / (mass * gravity);

    // Record state
    states.push({
      t,
      altitude,
      velocity,
      mass,
      stageIndex,
      remainingFuel,
      thrust,
      drag,
      acceleration,
      dynamicPressure,
      thrustToWeight,
    });

    // Check for burnout
    if (remainingFuel <= 0 && !burnout) {
      burnout = {
        altitude,
        velocity,
        time: t,
      };
    }

    // Check for staging
    if (checkStaging(currentStage, t, altitude, velocity, remainingFuel)) {
      stagingEvents.push({
        stageIndex,
        time: t,
        altitude,
        velocity,
      });

      // Move to next stage
      stageIndex++;
      if (stageIndex >= stages.length) {
        allStagesDepleted = true;
        break;
      }

      // Reset for next stage
      remainingFuel = stages[stageIndex].fuelMass;
      mass = getStageMass(stages[stageIndex], remainingFuel);
    }

    // Integrate one step
    const dt = timeStep;
    
    // Update velocity: dv/dt = (T - D - mg) / m
    velocity += acceleration * dt;
    
    // Update altitude: dh/dt = v
    altitude += velocity * dt;
    
    // Update mass: dm/dt = -T / (Isp * g0)
    if (thrust > 0 && isp > 0) {
      const fuelConsumed = calculatePropellantConsumed(thrust, isp, dt, g0);
      remainingFuel = Math.max(0, remainingFuel - fuelConsumed);
      mass = getStageMass(currentStage, remainingFuel);
    }

    t += dt;

    // Check if rocket is falling (failed launch)
    if (velocity < -10 && altitude < 1000) {
      break;
    }
  }

  // Calculate terminal velocity if applicable
  let terminalVelocity: number | undefined;
  if (states.length > 0) {
    const lastState = states[states.length - 1];
    if (lastState.velocity > 0 && lastState.drag > 0) {
      const density = getAtmosphericDensity(planet, lastState.altitude);
      const gravity = getGravity(planet, lastState.altitude);
      const currentStage = stages[stageIndex] || stages[stages.length - 1];
      if (currentStage) {
        // Terminal velocity: v_term = sqrt(2mg / (Cd * A * rho))
        terminalVelocity = Math.sqrt(
          (2 * lastState.mass * gravity) / (currentStage.Cd * currentStage.area * density)
        );
      }
    }
  }

  return {
    states,
    maxQ,
    burnout: burnout || {
      altitude: states[states.length - 1]?.altitude || 0,
      velocity: states[states.length - 1]?.velocity || 0,
      time: states[states.length - 1]?.t || 0,
    },
    terminalVelocity,
    stagingEvents,
  };
}
