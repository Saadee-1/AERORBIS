/**
 * Roll rate estimation calculations
 * 
 * Computes roll rate from aileron deflection and aircraft properties
 */

export interface RollRateInputs {
  // Control
  delta_a: number; // Aileron deflection (degrees)
  
  // Aerodynamics
  C_l_delta_a: number; // Aileron effectiveness derivative
  q: number; // Dynamic pressure (Pa)
  
  // Geometry
  S_w: number; // Wing area (m²)
  b: number; // Wing span (m)
  
  // Inertia
  I_x: number; // Roll moment of inertia (kg·m²)
  
  // Flight condition
  V: number; // Velocity (m/s)
  rho?: number; // Air density (kg/m³)
}

export interface RollRateResult {
  // Roll rate
  p: number; // Roll rate (rad/s)
  p_deg: number; // Roll rate (deg/s)
  
  // Roll performance
  roll_time_constant: number; // Time constant (s)
  roll_rate_per_degree: number; // Roll rate per degree aileron (deg/s per deg)
  
  // Warnings
  warnings: string[];
}

/**
 * Calculate roll rate from aileron deflection
 * 
 * p = (C_lδa * δa * q * S * b) / I_x
 * 
 * @param inputs - Roll rate inputs
 * @returns Roll rate result
 */
export function calculateRollRate(
  inputs: RollRateInputs
): RollRateResult {
  const warnings: string[] = [];
  
  // Convert aileron deflection to radians
  const delta_a_rad = inputs.delta_a * Math.PI / 180;
  
  // Calculate roll rate
  const p = (inputs.C_l_delta_a * delta_a_rad * inputs.q * inputs.S_w * inputs.b) / inputs.I_x;
  const p_deg = p * 180 / Math.PI;
  
  // Calculate roll time constant
  // τ = I_x / (C_lp * q * S * b²)
  // Simplified: assume C_lp ≈ -0.5
  const C_lp_estimate = -0.5;
  const roll_time_constant = inputs.I_x / (Math.abs(C_lp_estimate) * inputs.q * inputs.S_w * inputs.b * inputs.b);
  
  // Calculate roll rate per degree aileron
  const roll_rate_per_degree = p_deg / inputs.delta_a;
  
  // Warnings
  if (Math.abs(p_deg) > 360) {
    warnings.push('Very high roll rate - risk of roll saturation');
  }
  
  if (Math.abs(p_deg) < 10) {
    warnings.push('Low roll rate - may have insufficient roll authority');
  }
  
  if (roll_rate_per_degree < 1) {
    warnings.push('Low roll rate per degree aileron - poor roll response');
  }
  
  if (roll_rate_per_degree > 50) {
    warnings.push('Very high roll rate per degree - may be too sensitive, risk of snap roll');
  }
  
  // Check for snap roll risk
  if (Math.abs(p_deg) > 180 && inputs.V < 50) {
    warnings.push('High roll rate at low speed - snap roll risk');
  }
  
  return {
    p,
    p_deg,
    roll_time_constant,
    roll_rate_per_degree,
    warnings,
  };
}

