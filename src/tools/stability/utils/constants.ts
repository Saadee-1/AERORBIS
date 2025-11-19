/**
 * Physical constants for stability and control calculations
 */

export const PI = Math.PI;
export const TWO_PI = 2 * Math.PI;

// Standard airfoil lift curve slope (per radian)
export const A0_THEORETICAL = TWO_PI; // 2π per radian
export const DEFAULT_AIRFOIL_LIFT_SLOPE = A0_THEORETICAL; // Alias for compatibility

// Typical efficiency factors
export const DEFAULT_WING_EFFICIENCY = 0.85;
export const DEFAULT_TAIL_EFFICIENCY = 0.9;

// Typical control surface effectiveness
export const DEFAULT_ELEVATOR_EFFECTIVENESS = 0.45; // τ_e
export const DEFAULT_AILERON_EFFECTIVENESS = 0.6; // K_a
export const DEFAULT_RUDDER_EFFECTIVENESS = 0.5; // K_r

// Typical tail volume coefficient ranges
export const MIN_TAIL_VOLUME = 0.5;
export const MAX_TAIL_VOLUME = 1.2;

// Stability thresholds
export const MARGINAL_STABILITY_THRESHOLD = 0.05; // |C_mα| < 0.05 is marginal
