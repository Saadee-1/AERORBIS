/**
 * Shared types for Trajectory Simulator
 */

/** Single simulation state point */
export interface TrajectoryState {
  t: number;
  altitude: number;
  velocity: number;
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
  velocity: number;
  downrange?: number;
  mass?: number;
}

/** Staging event data */
export interface StagingEvent {
  stageIndex: number;
  time: number;
  altitude: number;
  velocity: number;
}

/** Trajectory losses */
export interface TrajectoryLosses {
  gravity: number;
  drag: number;
  steering: number;
}

/** Complete trajectory result */
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
