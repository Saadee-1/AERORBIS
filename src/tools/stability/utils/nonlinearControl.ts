/**
 * Nonlinear control behavior calculations
 * 
 * Handles supercritical regions, control reversal, and nonlinear effects
 */

export interface NonlinearControlInputs {
  // Control deflections
  delta_e: number; // Elevator deflection (degrees)
  delta_a: number; // Aileron deflection (degrees)
  delta_r: number; // Rudder deflection (degrees)
  
  // Angle of attack
  alpha: number; // Angle of attack (degrees)
  
  // Base control derivatives
  C_m_delta_e_base: number;
  C_l_delta_a_base: number;
  C_n_delta_r_base: number;
  
  // Enable nonlinear model
  enabled: boolean;
}

export interface NonlinearControl {
  // Effective control derivatives
  C_m_delta_e_effective: number;
  C_l_delta_a_effective: number;
  C_n_delta_r_effective: number;
  
  // Nonlinear factors
  elevator_factor: number;
  aileron_factor: number;
  rudder_factor: number;
  
  // Warnings
  warnings: string[];
}

/**
 * Calculate nonlinear elevator effectiveness
 * 
 * For deflections > 20°, effectiveness reduces:
 * C_mδe_eff = C_mδe * (1 - k * δ²)
 * 
 * @param C_m_delta_e_base - Base elevator effectiveness
 * @param delta_e - Elevator deflection (degrees)
 * @param alpha - Angle of attack (degrees)
 * @returns Effective elevator derivative and factor
 */
export function calculateNonlinearElevator(
  C_m_delta_e_base: number,
  delta_e: number,
  alpha: number
): { C_m_delta_e_effective: number; factor: number } {
  let factor = 1.0;
  
  // Nonlinear reduction for large deflections
  if (Math.abs(delta_e) > 20) {
    const delta_rad = (Math.abs(delta_e) - 20) * Math.PI / 180;
    const k = 0.01; // Nonlinear coefficient
    factor = 1 - k * delta_rad * delta_rad;
    factor = Math.max(0.3, factor); // Minimum 30% effectiveness
  }
  
  // Deep stall effect (high alpha)
  if (Math.abs(alpha) > 30) {
    factor *= 0.7; // Reduced effectiveness in deep stall
  }
  
  const C_m_delta_e_effective = C_m_delta_e_base * factor;
  
  return { C_m_delta_e_effective, factor };
}

/**
 * Calculate nonlinear aileron effectiveness
 * 
 * For deflections > 20°, effectiveness reduces
 * Also accounts for aileron reversal at high alpha
 * 
 * @param C_l_delta_a_base - Base aileron effectiveness
 * @param delta_a - Aileron deflection (degrees)
 * @param alpha - Angle of attack (degrees)
 * @returns Effective aileron derivative and factor
 */
export function calculateNonlinearAileron(
  C_l_delta_a_base: number,
  delta_a: number,
  alpha: number
): { C_l_delta_a_effective: number; factor: number } {
  let factor = 1.0;
  
  // Nonlinear reduction for large deflections
  if (Math.abs(delta_a) > 20) {
    const delta_rad = (Math.abs(delta_a) - 20) * Math.PI / 180;
    const k = 0.015; // Nonlinear coefficient (higher than elevator)
    factor = 1 - k * delta_rad * delta_rad;
    factor = Math.max(0.2, factor); // Minimum 20% effectiveness
  }
  
  // Aileron reversal at high alpha
  if (Math.abs(alpha) > 25) {
    factor *= 0.5; // Significant reduction
  }
  
  // Aileron reversal warning threshold
  if (Math.abs(alpha) > 35) {
    factor *= 0.3; // Severe reduction
  }
  
  const C_l_delta_a_effective = C_l_delta_a_base * factor;
  
  return { C_l_delta_a_effective, factor };
}

/**
 * Calculate nonlinear rudder effectiveness
 * 
 * For deflections > 25°, effectiveness reduces
 * Rudder lockup at high sideslip
 * 
 * @param C_n_delta_r_base - Base rudder effectiveness
 * @param delta_r - Rudder deflection (degrees)
 * @param beta - Sideslip angle (degrees, estimated from alpha)
 * @returns Effective rudder derivative and factor
 */
export function calculateNonlinearRudder(
  C_n_delta_r_base: number,
  delta_r: number,
  beta: number = 0
): { C_n_delta_r_effective: number; factor: number } {
  let factor = 1.0;
  
  // Nonlinear reduction for large deflections
  if (Math.abs(delta_r) > 25) {
    const delta_rad = (Math.abs(delta_r) - 25) * Math.PI / 180;
    const k = 0.012; // Nonlinear coefficient
    factor = 1 - k * delta_rad * delta_rad;
    factor = Math.max(0.25, factor); // Minimum 25% effectiveness
  }
  
  // Rudder lockup at high sideslip
  if (Math.abs(beta) > 30) {
    factor *= 0.4; // Significant reduction
  }
  
  const C_n_delta_r_effective = C_n_delta_r_base * factor;
  
  return { C_n_delta_r_effective, factor };
}

/**
 * Calculate all nonlinear control effects
 * 
 * @param inputs - Nonlinear control inputs
 * @returns Complete nonlinear control results
 */
export function calculateNonlinearControl(
  inputs: NonlinearControlInputs
): NonlinearControl {
  const warnings: string[] = [];
  
  if (!inputs.enabled) {
    // Return base values if nonlinear model disabled
    return {
      C_m_delta_e_effective: inputs.C_m_delta_e_base,
      C_l_delta_a_effective: inputs.C_l_delta_a_base,
      C_n_delta_r_effective: inputs.C_n_delta_r_base,
      elevator_factor: 1.0,
      aileron_factor: 1.0,
      rudder_factor: 1.0,
      warnings: [],
    };
  }
  
  // Calculate nonlinear effects
  const elevator = calculateNonlinearElevator(
    inputs.C_m_delta_e_base,
    inputs.delta_e,
    inputs.alpha
  );
  
  const aileron = calculateNonlinearAileron(
    inputs.C_l_delta_a_base,
    inputs.delta_a,
    inputs.alpha
  );
  
  const rudder = calculateNonlinearRudder(
    inputs.C_n_delta_r_base,
    inputs.delta_r,
    0 // Beta not provided, use 0
  );
  
  // Warnings
  if (Math.abs(inputs.delta_e) > 25) {
    warnings.push('Large elevator deflection - nonlinear effects significant');
  }
  
  if (Math.abs(inputs.alpha) > 30) {
    warnings.push('High angle of attack - elevator effectiveness reduced (deep stall risk)');
  }
  
  if (Math.abs(inputs.delta_a) > 25) {
    warnings.push('Large aileron deflection - nonlinear effects significant');
  }
  
  if (Math.abs(inputs.alpha) > 25) {
    warnings.push('High angle of attack - aileron reversal possible');
  }
  
  if (aileron.factor < 0.3) {
    warnings.push('Severe aileron effectiveness reduction - control reversal likely');
  }
  
  if (Math.abs(inputs.delta_r) > 30) {
    warnings.push('Large rudder deflection - nonlinear effects significant');
  }
  
  if (elevator.factor < 0.5 && Math.abs(inputs.alpha) > 30) {
    warnings.push('Elevator deep stall - very low pitch control authority');
  }
  
  return {
    C_m_delta_e_effective: elevator.C_m_delta_e_effective,
    C_l_delta_a_effective: aileron.C_l_delta_a_effective,
    C_n_delta_r_effective: rudder.C_n_delta_r_effective,
    elevator_factor: elevator.factor,
    aileron_factor: aileron.factor,
    rudder_factor: rudder.factor,
    warnings,
  };
}

