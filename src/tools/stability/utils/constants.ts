/**
 * Physical constants for stability calculations
 */

export const PI = Math.PI;
export const DEG_TO_RAD = PI / 180;
export const RAD_TO_DEG = 180 / PI;

// Theoretical values
export const A0_THEORETICAL = 2 * PI; // Thin airfoil theory lift slope (per radian)

// Typical values
export const DEFAULT_AIRFOIL_LIFT_SLOPE = 2 * PI; // per radian
export const DEFAULT_WING_EFFICIENCY = 0.85;
export const DEFAULT_TAIL_EFFICIENCY = 0.9;
export const DEFAULT_ELEVATOR_EFFECTIVENESS = 0.4; // τ_e

// Control surface effectiveness constants (DATCOM-style)
export const AILERON_EFFECTIVENESS_K = 0.08; // K_a
export const RUDDER_EFFECTIVENESS_K = 0.12; // K_r

// Stability limits
export const MIN_TAIL_VOLUME = 0.5;
export const MAX_TAIL_VOLUME = 1.2;
export const MIN_STATIC_MARGIN = 0.05; // 5% MAC minimum for stability
