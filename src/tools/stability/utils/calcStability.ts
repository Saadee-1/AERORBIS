/**
 * Main stability and control derivatives calculations
 * 
 * Integrates all aerodynamic calculations to produce complete stability analysis
 */

import {
  calculateWingLiftCurveSlope,
  calculateTailLiftCurveSlope,
  calculateDownwashDATCOM,
  calculateDownwashRoskam,
  calculateTailVolumeCoefficient,
  calculateWingPitchingMomentDerivative,
  calculateTailPitchingMomentDerivative,
  calculateTotalPitchingMomentDerivative,
  calculateNeutralPoint,
  calculateStaticMargin,
  calculateElevatorEffectiveness,
  calculateAileronEffectiveness,
  calculateRudderEffectiveness,
  estimateDihedralEffect,
  estimateDirectionalStability,
} from './aerodynamics';

/**
 * Input parameters for stability calculations
 */
export interface StabilityInputs {
  // Geometry
  S_w: number; // Wing area (m²)
  AR: number; // Wing aspect ratio
  c_bar: number; // Mean aerodynamic chord (m)
  x_cg: number; // CG position (m from leading edge)
  x_ac_w: number; // Wing aerodynamic center (m from leading edge)
  
  // Tail geometry
  S_t: number; // Horizontal tail area (m²)
  AR_t: number; // Tail aspect ratio
  l_t: number; // Tail arm (m)
  
  // Vertical tail (for directional stability)
  S_v?: number; // Vertical tail area (m²)
  l_v?: number; // Vertical tail arm (m)
  b_w?: number; // Wing span (m)
  
  // Aerodynamics
  a0: number; // Airfoil lift curve slope (per rad, default 2π)
  e: number; // Wing efficiency factor (0.7-0.95)
  e_t: number; // Tail efficiency factor
  eta: number; // Tail effectiveness factor (default 0.9) - note: alias for eta_t
  
  // Downwash model
  useRoskamDownwash?: boolean; // If true, use Roskam; if false/undefined, use DATCOM
  
  // Control surfaces
  S_e?: number; // Elevator area (m²)
  tau_e?: number; // Elevator effectiveness (0.3-0.6)
  S_a?: number; // Aileron area (m²)
  K_a?: number; // Aileron effectiveness constant (0.3-0.5)
  S_r?: number; // Rudder area (m²)
  K_r?: number; // Rudder effectiveness constant (0.2-0.4)
  
  // Lateral stability
  dihedralAngle?: number; // Dihedral angle (degrees)
}

/**
 * Complete stability and control derivatives results
 */
export interface StabilityResults {
  // Lift curve slopes
  a_w: number; // Wing lift curve slope (per rad)
  a_t: number; // Tail lift curve slope (per rad)
  
  // Downwash
  epsilon_alpha: number; // Downwash gradient
  
  // Tail volume
  V_H: number; // Tail volume coefficient
  
  // Longitudinal stability
  C_m_alpha_w: number; // Wing pitching moment derivative
  C_m_alpha_t: number; // Tail pitching moment derivative
  C_m_alpha: number; // Total pitching moment derivative
  x_np: number; // Neutral point position (m)
  SM: number; // Static margin
  
  // Control derivatives
  C_m_delta_e?: number; // Elevator effectiveness
  C_l_delta_a?: number; // Aileron effectiveness
  C_n_delta_r?: number; // Rudder effectiveness
  
  // Lateral/Directional (simplified estimates)
  C_l_beta?: number; // Dihedral effect
  C_n_beta?: number; // Directional stability
  
  // Warnings
  warnings: string[];
}

/**
 * Main stability calculation function
 * 
 * @param inputs - Stability input parameters
 * @returns Complete stability analysis results
 */
export function calculateStability(inputs: StabilityInputs): StabilityResults {
  const warnings: string[] = [];
  
  // Validate inputs
  if (inputs.S_w <= 0) {
    throw new Error(`Wing area must be positive, got ${inputs.S_w}`);
  }
  if (inputs.AR <= 1) {
    throw new Error(`Aspect ratio must be > 1, got ${inputs.AR}`);
  }
  if (inputs.c_bar <= 0) {
    throw new Error(`Mean aerodynamic chord must be positive, got ${inputs.c_bar}`);
  }
  if (inputs.S_t <= 0) {
    throw new Error(`Tail area must be positive, got ${inputs.S_t}`);
  }
  if (inputs.l_t <= 0) {
    throw new Error(`Tail arm must be positive, got ${inputs.l_t}`);
  }
  
  // Calculate lift curve slopes
  const a_w = calculateWingLiftCurveSlope(
    inputs.a0,
    inputs.AR,
    inputs.e
  );
  
  const a_t = calculateTailLiftCurveSlope(
    inputs.a0,
    inputs.AR_t,
    inputs.e_t,
    inputs.eta || 0.9 // Use eta, fallback to 0.9
  );
  
  // Calculate downwash gradient
  const epsilon_alpha = inputs.useRoskamDownwash
    ? calculateDownwashRoskam(a_w, inputs.AR)
    : calculateDownwashDATCOM(a_w, inputs.AR);
  
  // Validate downwash
  if (epsilon_alpha < 0 || epsilon_alpha > 1) {
    warnings.push(`Downwash gradient outside typical range (0-1): ${epsilon_alpha.toFixed(3)}`);
  }
  
  // Calculate tail volume coefficient
  const V_H = calculateTailVolumeCoefficient(
    inputs.S_t,
    inputs.l_t,
    inputs.S_w,
    inputs.c_bar
  );
  
  // Validate tail volume
  if (V_H < 0.5 || V_H > 1.2) {
    warnings.push(`Tail volume coefficient outside typical range (0.5-1.2): ${V_H.toFixed(3)}`);
  }
  
  // Calculate pitching moment derivatives
  // Note: x_cg and x_ac_w are in fraction of MAC (0-1), convert to meters
  const x_cg_m = inputs.x_cg * inputs.c_bar;
  const x_ac_w_m = inputs.x_ac_w * inputs.c_bar;
  
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
  
  const C_m_alpha = calculateTotalPitchingMomentDerivative(
    C_m_alpha_w,
    C_m_alpha_t
  );
  
  // Calculate neutral point (returns position in meters)
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
  
  // Stability warnings
  if (SM < 0) {
    warnings.push('Aircraft is statically unstable (SM < 0)');
  } else if (SM < 0.05) {
    warnings.push('Marginal static stability (SM < 0.05)');
  }
  
  if (Math.abs(C_m_alpha) < 0.1) {
    warnings.push('Marginal stability: C_mα is very small');
  }
  
  // Calculate control derivatives if provided
  let C_m_delta_e: number | undefined;
  if (inputs.S_e !== undefined && inputs.tau_e !== undefined) {
    C_m_delta_e = calculateElevatorEffectiveness(
      inputs.eta_t,
      a_t,
      inputs.S_e,
      inputs.S_w,
      inputs.l_t,
      inputs.c_bar,
      inputs.tau_e
    );
  }
  
  let C_l_delta_a: number | undefined;
  if (inputs.S_a !== undefined && inputs.K_a !== undefined) {
    C_l_delta_a = calculateAileronEffectiveness(
      inputs.K_a,
      inputs.S_a,
      inputs.S_w
    );
  }
  
  let C_n_delta_r: number | undefined;
  if (inputs.S_r !== undefined && inputs.K_r !== undefined && inputs.S_v !== undefined) {
    C_n_delta_r = calculateRudderEffectiveness(
      inputs.K_r,
      inputs.S_r,
      inputs.S_v
    );
  }
  
  // Lateral/Directional estimates
  let C_l_beta: number | undefined;
  if (inputs.dihedralAngle !== undefined) {
    C_l_beta = estimateDihedralEffect(inputs.dihedralAngle);
  }
  
  let C_n_beta: number | undefined;
  if (inputs.S_v !== undefined && inputs.l_v !== undefined && inputs.b_w !== undefined) {
    // Estimate vertical tail lift curve slope (similar to horizontal)
    const a_v = calculateTailLiftCurveSlope(
      inputs.a0,
      inputs.AR_t, // Use tail AR as approximation
      inputs.e_t,
      inputs.eta_t
    );
    
    C_n_beta = estimateDirectionalStability(
      a_v,
      inputs.S_v,
      inputs.S_w,
      inputs.l_v,
      inputs.b_w
    );
  }
  
  return {
    a_w,
    a_t,
    epsilon_alpha,
    V_H,
    C_m_alpha_w,
    C_m_alpha_t,
    C_m_alpha,
    x_np, // Fraction of MAC
    SM,
    C_m_delta_e,
    C_l_delta_a,
    C_n_delta_r,
    C_l_beta,
    C_n_beta,
    warnings,
  };
}

/**
 * Sweep CG position to generate stability margin curve
 * 
 * @param inputs - Base stability inputs
 * @param x_cg_min - Minimum CG position (fraction of MAC, 0-1)
 * @param x_cg_max - Maximum CG position (fraction of MAC, 0-1)
 * @param steps - Number of steps
 * @returns Array of {x_cg, SM, C_m_alpha} pairs
 */
export function sweepCGPosition(
  inputs: StabilityInputs,
  x_cg_min: number,
  x_cg_max: number,
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

/**
 * Sweep angle of attack to generate Cm vs α curve
 * 
 * @param inputs - Stability inputs
 * @param alpha_min - Minimum angle of attack (rad)
 * @param alpha_max - Maximum angle of attack (rad)
 * @param steps - Number of steps
 * @returns Array of {alpha, Cm} pairs
 */
export function sweepAngleOfAttack(
  inputs: StabilityInputs,
  alpha_min: number,
  alpha_max: number,
  steps: number
): Array<{ alpha: number; Cm: number }> {
  const results: Array<{ alpha: number; Cm: number }> = [];
  
  const stabilityResult = calculateStability(inputs);
  
  const stepSize = (alpha_max - alpha_min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const alpha = alpha_min + i * stepSize;
    // Cm = Cm0 + Cm_alpha * alpha
    // For simplicity, assume Cm0 = 0 (trimmed condition)
    const Cm = stabilityResult.C_m_alpha * alpha;
    results.push({ alpha, Cm });
  }
  
  return results;
}

/**
 * Sweep tail volume to generate sizing curves
 * 
 * @param inputs - Base stability inputs
 * @param V_H_min - Minimum tail volume
 * @param V_H_max - Maximum tail volume
 * @param steps - Number of steps
 * @returns Array of {V_H, SM, C_m_alpha} pairs
 */
export function sweepTailVolume(
  inputs: StabilityInputs,
  V_H_min: number,
  V_H_max: number,
  steps: number
): Array<{ V_H: number; SM: number; C_m_alpha: number }> {
  const results: Array<{ V_H: number; SM: number; C_m_alpha: number }> = [];
  
  const stepSize = (V_H_max - V_H_min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const V_H = V_H_min + i * stepSize;
    try {
      // Calculate required tail area from V_H
      const S_t = (V_H * inputs.S_w * inputs.c_bar) / inputs.l_t;
      const result = calculateStability({ ...inputs, S_t });
      results.push({
        V_H,
        SM: result.SM,
        C_m_alpha: result.C_m_alpha,
      });
    } catch (error) {
      console.warn(`Skipping V_H=${V_H}:`, error);
    }
  }
  
  return results;
}
