/**
 * Shared types for Trajectory Simulator
 */

/** Single simulation state point */
export interface TrajectoryState {
  t: number;
  altitude: number;
  velocity: number | [number, number, number]; // Scalar for 1D/2D, vector for 3D
  dynamicPressure?: number;
  acceleration?: number;
  mass?: number;
  thrustToWeight?: number;
  downrange?: number;
  gamma?: number;
  theta?: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  position?: [number, number, number]; // 3D position
  attitude?: [number, number, number, number]; // Quaternion for 3D
  angularVelocity?: [number, number, number]; // 3D angular velocity
  stageIndex?: number;
  remainingFuel?: number;
  thrust?: number;
  drag?: number;
  eulerAngles?: [number, number, number];
}

/** Max Q event data */
export interface MaxQEvent {
  time: number;
  value: number;
  altitude: number;
  velocity?: number;
}

/** Burnout event data */
export interface BurnoutEvent {
  time: number;
  altitude: number;
  velocity: number | [number, number, number]; // Scalar or vector
  downrange?: number;
  mass?: number;
}

/** Staging event data */
export interface StagingEvent {
  stageIndex: number;
  time: number;
  altitude: number;
  velocity: number | [number, number, number]; // Scalar or vector
}

/** Trajectory losses */
export interface TrajectoryLosses {
  gravity: number;
  drag: number;
  steering: number;
}

/** Complete trajectory result (generic for 1D/2D/3D) */
export interface TrajectoryResult {
  states: TrajectoryState[];
  maxQ?: MaxQEvent;
  burnout?: BurnoutEvent;
  warnings?: string[];
  totalTime?: number;
  success?: boolean;
  stagingEvents?: StagingEvent[];
  losses?: TrajectoryLosses;
}

/** Guidance mode types */
export type GuidanceType = 'manual' | 'gravity_turn' | 'constant_pitch_rate' | 'orbital_insertion';

/** 2D Guidance configuration */
export interface Guidance2D {
  type: GuidanceType;
  pitchProgram?: Array<{ time: number; pitch: number }>;
  pitchRate?: number;
  targetAltitude?: number;
  targetVelocity?: number;
}

/** Helper to extract scalar velocity from potentially vector velocity */
export function getScalarVelocity(velocity: number | [number, number, number]): number {
  if (Array.isArray(velocity)) {
    return Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2);
  }
  return velocity;
}
