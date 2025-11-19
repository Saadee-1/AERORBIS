/**
 * Control mixing matrices and presets
 */

export const QUADCOPTER_X_MIXING = [[+1, +1, +1, +1], [-1, +1, -1, +1], [-1, -1, +1, +1], [+1, -1, -1, +1]];
export const QUADCOPTER_PLUS_MIXING = [[+1, 0, +1, +1], [0, +1, -1, +1], [-1, 0, +1, +1], [0, -1, -1, +1]];
export const HEXACOPTER_MIXING = [[+0.866, +0.5, +1, +1], [0, +1, -1, +1], [-0.866, +0.5, +1, +1], [-0.866, -0.5, -1, +1], [0, -1, +1, +1], [+0.866, -0.5, -1, +1]];
export const OCTOCOPTER_X8_MIXING = [[+1, +1, +1, +1], [-1, +1, -1, +1], [-1, -1, +1, +1], [+1, -1, -1, +1], [+1, +1, +1, +1], [-1, +1, -1, +1], [-1, -1, +1, +1], [+1, -1, -1, +1]];
export const DEFAULT_MOTOR_GAINS = { pitch: 1.0, roll: 1.0, yaw: 1.0, thrust: 1.0 };
export const MIXING_PRESETS = {
  'quadcopter-x': { name: 'Quadcopter (X Configuration)', matrix: QUADCOPTER_X_MIXING, gains: DEFAULT_MOTOR_GAINS },
  'quadcopter-plus': { name: 'Quadcopter (+ Configuration)', matrix: QUADCOPTER_PLUS_MIXING, gains: DEFAULT_MOTOR_GAINS },
  'hexacopter': { name: 'Hexacopter', matrix: HEXACOPTER_MIXING, gains: DEFAULT_MOTOR_GAINS },
  'octocopter': { name: 'Octocopter (X8)', matrix: OCTOCOPTER_X8_MIXING, gains: DEFAULT_MOTOR_GAINS },
};