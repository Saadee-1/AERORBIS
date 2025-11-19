/**
 * Input validation schema for stability calculations
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate stability inputs
 */
export function validateStabilityInputs(inputs: {
  S_w?: number;
  AR?: number;
  c_bar?: number;
  x_cg?: number;
  x_ac_w?: number;
  S_t?: number;
  AR_t?: number;
  l_t?: number;
  S_v?: number;
  l_v?: number;
  b_w?: number;
  a0?: number;
  e?: number;
  e_t?: number;
  eta?: number;
  eta_t?: number; // Alias for eta
  S_e?: number;
  tau_e?: number;
  S_a?: number;
  K_a?: number;
  S_r?: number;
  K_r?: number;
  dihedralAngle?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required geometry
  if (inputs.S_w === undefined || inputs.S_w <= 0) {
    errors.push('Wing area (S_w) must be positive');
  }

  if (inputs.AR === undefined || inputs.AR <= 1) {
    errors.push('Aspect ratio (AR) must be > 1');
  } else if (inputs.AR > 20) {
    warnings.push('Very high aspect ratio (>20). Verify input.');
  }

  if (inputs.c_bar === undefined || inputs.c_bar <= 0) {
    errors.push('Mean aerodynamic chord (c_bar) must be positive');
  }

  if (inputs.x_cg === undefined) {
    errors.push('CG position (x_cg) is required');
  }

  if (inputs.x_ac_w === undefined) {
    errors.push('Wing aerodynamic center (x_ac_w) is required');
  }

  // Tail geometry
  if (inputs.S_t === undefined || inputs.S_t <= 0) {
    errors.push('Tail area (S_t) must be positive');
  }

  if (inputs.AR_t === undefined || inputs.AR_t <= 1) {
    errors.push('Tail aspect ratio (AR_t) must be > 1');
  }

  if (inputs.l_t === undefined || inputs.l_t <= 0) {
    errors.push('Tail arm (l_t) must be positive');
  }

  // Aerodynamics
  if (inputs.a0 !== undefined && (inputs.a0 <= 0 || inputs.a0 > 10)) {
    warnings.push('Airfoil lift curve slope (a0) outside typical range (0-10 rad⁻¹)');
  }

  if (inputs.e !== undefined && (inputs.e < 0.5 || inputs.e > 1)) {
    warnings.push('Wing efficiency (e) outside typical range (0.5-1)');
  }

  if (inputs.e_t !== undefined && (inputs.e_t < 0.5 || inputs.e_t > 1)) {
    warnings.push('Tail efficiency (e_t) outside typical range (0.5-1)');
  }

  const eta = inputs.eta ?? inputs.eta_t;
  if (eta !== undefined && (eta < 0.7 || eta > 1)) {
    warnings.push('Tail effectiveness (η) outside typical range (0.7-1)');
  }

  // Control surfaces
  if (inputs.tau_e !== undefined && (inputs.tau_e < 0 || inputs.tau_e > 1)) {
    warnings.push('Elevator effectiveness (τ_e) should be between 0 and 1');
  }

  if (inputs.K_a !== undefined && (inputs.K_a < 0 || inputs.K_a > 1)) {
    warnings.push('Aileron effectiveness constant (K_a) should be between 0 and 1');
  }

  if (inputs.K_r !== undefined && (inputs.K_r < 0 || inputs.K_r > 1)) {
    warnings.push('Rudder effectiveness constant (K_r) should be between 0 and 1');
  }

  // Dihedral angle
  if (inputs.dihedralAngle !== undefined && Math.abs(inputs.dihedralAngle) > 15) {
    warnings.push('Dihedral angle outside typical range (±15°)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
