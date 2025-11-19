/**
 * Core stability and control derivatives calculations
 * 
 * Implements formulas from Raymer, Roskam, Anderson, and USAF DATCOM
 */

import {
  calculateWingLiftCurveSlope,
  calculateTailLiftCurveSlope,
  calculateDownwashDATCOM,
  calculateDownwashRoskam,
  calculateTailVolumeCoefficient,
} from './aerodynamics';
import {
  DEFAULT_ELEVATOR_EFFECTIVENESS,
  AILERON_EFFECTIVENESS_K,
  RUDDER_EFFECTIVENESS_K,
} from './constants';

/**
 * Input parameters for stability calculations
 */
export interface StabilityInputs {
  // Wing geometry
  S_w: number; // Wing area (m²)
  AR: number; // Wing aspect ratio
  c_bar: number; // Mean aerodynamic chord (m)
  x_ac_w: number; // Wing aerodynamic center position (fraction of MAC, 0-1)
  x_cg: number; // CG position (fraction of MAC, 0-1)

  // Tail geometry
  S_t: number; // Tail area (m²)
  AR_t: number; // Tail aspect ratio
  l_t: number; // Tail arm (m)

  // Aerodynamic parameters
  a0: number; // Airfoil lift curve slope (per radian)
  e: number; // Wing efficiency factor
  e_t: number; // Tail efficiency factor
  eta: number; // Tail effectiveness factor

  // Downwash model
  useRoskamDownwash: boolean; // true for Roskam, false for DATCOM

  // Control surfaces
  S_e?: number; // Elevator area (m²)
  tau_e?: number; // Elevator effectiveness (0-1)
  S_a?: number; // Aileron area (m²)
  S_r?: number; // Rudder area (m²)
  S_v?: number; // Vertical tail area (m²)
}

/**
 * Calculated stability results
 */
export interface StabilityResults {
  // Lift curve slopes
  a_w: number; // Wing lift curve slope (per radian)
  a_t: number; // Tail lift curve slope (per radian)

  // Downwash
  epsilon_alpha: number; // Downwash gradient

  // Longitudinal stability
  C_m_alpha: number; // Pitching moment derivative with respect to angle of attack
  C_m_alpha_w: number; // Wing contribution
  C_m_alpha_t: number; // Tail contribution
  x_np: number; // Neutral point (fraction of MAC)
  SM: number; // Static margin (fraction of MAC)
  V_H: number; // Tail volume coefficient

  // Control derivatives
  C_m_delta_e?: number; // Elevator effectiveness
  C_l_delta_a?: number; // Aileron effectiveness
  C_n_delta_r?: number; // Rudder effectiveness

  // Lateral/directional derivatives (simplified)
  C_l_beta?: number; // Roll moment due to sideslip
  C_n_beta?: number; // Yaw moment due to sideslip
  C_l_p?: number; // Roll damping
  C_l_r?: number; // Roll due to yaw rate
  C_n_r?: number; // Yaw damping

  // Diagnostics
  warnings: string[];
  isStable: boolean;
}

/**
 * Calculate wing pitching moment derivative
 * 
 * C_m_alpha_w = a_w * (x_cg - x_ac_w) / c_bar
 * 
 * @param a_w - Wing lift curve slope
 * @param x_cg - CG position (m from leading edge)
 * @param x_ac_w - Wing AC position (m from leading edge)
 * @param c_bar - Mean aerodynamic chord (m)
 * @returns Wing pitching moment derivative
 */
function calculateWingPitchingMomentDerivative(
  a_w: number,
  x_cg: number,
  x_ac_w: number,
  c_bar: number
): number {
  return a_w * (x_cg - x_ac_w) / c_bar;
}

/**
 * Calculate tail pitching moment derivative
 * 
 * C_m_alpha_t = -a_t * (1 - ε_α) * (S_t / S_w) * (l_t / c_bar)
 * 
 * @param a_t - Tail lift curve slope
 * @param epsilon_alpha - Downwash gradient
 * @param S_t - Tail area
 * @param S_w - Wing area
 * @param l_t - Tail arm
 * @param c_bar - Mean aerodynamic chord
 * @returns Tail pitching moment derivative
 */
function calculateTailPitchingMomentDerivative(
  a_t: number,
  epsilon_alpha: number,
  S_t: number,
  S_w: number,
  l_t: number,
  c_bar: number
): number {
  return -a_t * (1 - epsilon_alpha) * (S_t / S_w) * (l_t / c_bar);
}

/**
 * Calculate neutral point position
 * 
 * x_np = x_ac_w + (a_t / a_w) * (1 - ε_α) * (S_t / S_w) * (l_t / c_bar)
 * 
 * @param x_ac_w - Wing AC position (m from leading edge)
 * @param a_t - Tail lift curve slope
 * @param a_w - Wing lift curve slope
 * @param epsilon_alpha - Downwash gradient
 * @param S_t - Tail area
 * @param S_w - Wing area
 * @param l_t - Tail arm
 * @param c_bar - Mean aerodynamic chord
 * @returns Neutral point position (m from leading edge)
 */
function calculateNeutralPoint(
  x_ac_w: number,
  a_t: number,
  a_w: number,
  epsilon_alpha: number,
  S_t: number,
  S_w: number,
  l_t: number,
  c_bar: number
): number {
  const tailContribution = (a_t / a_w) * (1 - epsilon_alpha) * (S_t / S_w) * (l_t / c_bar);
  return x_ac_w + tailContribution;
}

/**
 * Calculate static margin
 * 
 * SM = x_np - x_cg
 * 
 * @param x_np - Neutral point (m from leading edge)
 * @param x_cg - CG position (m from leading edge)
 * @param c_bar - Mean aerodynamic chord (m)
 * @returns Static margin (fraction of MAC)
 */
function calculateStaticMargin(
  x_np: number,
  x_cg: number,
  c_bar: number
): number {
  return (x_np - x_cg) / c_bar;
}

/**
 * Calculate elevator effectiveness
 * 
 * C_m_delta_e = -η_t * a_t * (S_t / S_w) * (l_t / c_bar) * τ_e
 * 
 * @param eta - Tail effectiveness factor
 * @param a_t - Tail lift curve slope
 * @param S_t - Tail area
 * @param S_w - Wing area
 * @param l_t - Tail arm
 * @param c_bar - Mean aerodynamic chord
 * @param tau_e - Elevator effectiveness
 * @returns Elevator effectiveness derivative
 */
function calculateElevatorEffectiveness(
  eta: number,
  a_t: number,
  S_t: number,
  S_w: number,
  l_t: number,
  c_bar: number,
  tau_e: number
): number {
  return -eta * a_t * (S_t / S_w) * (l_t / c_bar) * tau_e;
}

/**
 * Calculate aileron effectiveness (simplified DATCOM)
 * 
 * C_l_delta_a = K_a * (S_a / S_w)
 * 
 * @param S_a - Aileron area
 * @param S_w - Wing area
 * @returns Aileron effectiveness derivative
 */
function calculateAileronEffectiveness(S_a: number, S_w: number): number {
  return AILERON_EFFECTIVENESS_K * (S_a / S_w);
}

/**
 * Calculate rudder effectiveness (simplified DATCOM)
 * 
 * C_n_delta_r = K_r * (S_r / S_v)
 * 
 * @param S_r - Rudder area
 * @param S_v - Vertical tail area
 * @returns Rudder effectiveness derivative
 */
function calculateRudderEffectiveness(S_r: number, S_v: number): number {
  return RUDDER_EFFECTIVENESS_K * (S_r / S_v);
}

/**
 * Main stability calculation function
 * 
 * @param inputs - Stability input parameters
 * @returns Complete stability results
 */
export function calculateStability(inputs: StabilityInputs): StabilityResults {
  // Validate inputs
  if (inputs.S_w <= 0 || inputs.S_t <= 0) {
    throw new Error('Wing and tail areas must be positive');
  }
  if (inputs.AR <= 1 || inputs.AR_t <= 1) {
    throw new Error('Aspect ratios must be > 1');
  }
  if (inputs.l_t <= 0) {
    throw new Error('Tail arm must be positive');
  }
  if (inputs.c_bar <= 0) {
    throw new Error('Mean aerodynamic chord must be positive');
  }

  // Calculate lift curve slopes
  const a_w = calculateWingLiftCurveSlope(inputs.a0, inputs.AR, inputs.e);
  const a_t = calculateTailLiftCurveSlope(inputs.a0, inputs.AR_t, inputs.e_t, inputs.eta);

  // Calculate downwash gradient
  const epsilon_alpha = inputs.useRoskamDownwash
    ? calculateDownwashRoskam(a_w, inputs.AR)
    : calculateDownwashDATCOM(a_w, inputs.AR);

  // Calculate tail volume coefficient
  const V_H = calculateTailVolumeCoefficient(
    inputs.S_t,
    inputs.l_t,
    inputs.S_w,
    inputs.c_bar
  );

  // Note: x_cg and x_ac_w are in fraction of MAC (0-1), convert to meters
  const x_cg_m = inputs.x_cg * inputs.c_bar;
  const x_ac_w_m = inputs.x_ac_w * inputs.c_bar;

  // Calculate pitching moment derivatives
  const C_m_alpha_w = calculateWingPitchingMomentDerivative(
    a_w,
    x_cg_m,
    x_ac_w_m,
    inputs.c_bar
  );
  const C_m_alpha_t = calculateTailPitchingMomentDerivative(
    a_t,
    epsilon_alpha,
    inputs.S_t,
    inputs.S_w,
    inputs.l_t,
    inputs.c_bar
  );
  const C_m_alpha = C_m_alpha_w + C_m_alpha_t;

  // Calculate neutral point
  const x_np_m = calculateNeutralPoint(
    x_ac_w_m,
    a_t,
    a_w,
    epsilon_alpha,
    inputs.S_t,
    inputs.S_w,
    inputs.l_t,
    inputs.c_bar
  );
  // Convert neutral point to fraction of MAC
  const x_np = x_np_m / inputs.c_bar;

  // Calculate static margin
  const SM = calculateStaticMargin(
    x_np_m,
    x_cg_m,
    inputs.c_bar
  );

  // Calculate control derivatives if provided
  let C_m_delta_e: number | undefined;
  if (inputs.S_e !== undefined && inputs.tau_e !== undefined) {
    C_m_delta_e = calculateElevatorEffectiveness(
      inputs.eta,
      a_t,
      inputs.S_t,
      inputs.S_w,
      inputs.l_t,
      inputs.c_bar,
      inputs.tau_e
    );
  }

  let C_l_delta_a: number | undefined;
  if (inputs.S_a !== undefined) {
    C_l_delta_a = calculateAileronEffectiveness(inputs.S_a, inputs.S_w);
  }

  let C_n_delta_r: number | undefined;
  if (inputs.S_r !== undefined && inputs.S_v !== undefined) {
    C_n_delta_r = calculateRudderEffectiveness(inputs.S_r, inputs.S_v);
  }

  // Simplified lateral/directional derivatives (placeholder estimates)
  // These would normally require more detailed geometry
  const C_l_beta = inputs.S_v ? -0.001 * (inputs.S_v / inputs.S_w) : undefined;
  const C_n_beta = inputs.S_v ? 0.0012 * (inputs.S_v / inputs.S_w) : undefined;
  const C_l_p = -0.5; // Typical roll damping
  const C_l_r = 0.15; // Typical roll due to yaw rate
  const C_n_r = -0.3; // Typical yaw damping

  // Diagnostics and warnings
  const warnings: string[] = [];
  const isStable = SM > 0;

  if (!isStable) {
    warnings.push('Aircraft is statically unstable (SM < 0)');
  } else if (SM < 0.05) {
    warnings.push('Marginal static margin - aircraft may be difficult to control');
  }

  if (Math.abs(C_m_alpha) < 0.01) {
    warnings.push('Very small C_m_alpha - marginal stability');
  }

  if (V_H < 0.5 || V_H > 1.2) {
    warnings.push(`Tail volume coefficient (${V_H.toFixed(2)}) outside typical range (0.5-1.2)`);
  }

  if (epsilon_alpha > 0.5) {
    warnings.push('High downwash gradient - tail effectiveness may be reduced');
  }

  return {
    a_w,
    a_t,
    epsilon_alpha,
    C_m_alpha,
    C_m_alpha_w,
    C_m_alpha_t,
    x_np,
    SM,
    V_H,
    C_m_delta_e,
    C_l_delta_a,
    C_n_delta_r,
    C_l_beta,
    C_n_beta,
    C_l_p,
    C_l_r,
    C_n_r,
    warnings,
    isStable,
  };
}

/**
 * Sweep CG position for stability analysis
 * 
 * @param inputs - Base stability inputs
 * @param x_cg_min - Minimum CG position (fraction of MAC, 0-1)
 * @param x_cg_max - Maximum CG position (fraction of MAC, 0-1)
 * @param steps - Number of steps
 * @returns Array of results for each CG position
 */
export function sweepCGPosition(
  inputs: StabilityInputs,
  x_cg_min: number, // Minimum CG position (fraction of MAC, 0-1)
  x_cg_max: number, // Maximum CG position (fraction of MAC, 0-1)
  steps: number
): Array<{ x_cg: number; SM: number; C_m_alpha: number }> {
  const results: Array<{ x_cg: number; SM: number; C_m_alpha: number }> = [];
  
  const stepSize = (x_cg_max - x_cg_min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    // x_cg_min and x_cg_max are in fraction of MAC (0-1)
    const x_cg = x_cg_min + i * stepSize;
    try {
      const result = calculateStability({ ...inputs, x_cg });
      results.push({
        x_cg, // Keep as fraction for display
        SM: result.SM,
        C_m_alpha: result.C_m_alpha,
      });
    } catch (error) {
      console.warn(`Skipping x_cg=${x_cg}:`, error);
    }
  }
  return results;
}
