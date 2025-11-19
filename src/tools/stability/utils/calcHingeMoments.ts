/**
 * Hinge moment coefficient calculations
 * 
 * Implements DATCOM formulas for control surface hinge moments
 */

export interface HingeMomentInputs {
  chord_fraction: number; hinge_line_position: number;
  balance_type: 'unbalanced' | 'horn' | 'overhang' | 'frise' | 'servo-tab' | 'anti-servo-tab';
  a0: number; alpha_0: number; S_control: number; c_control: number;
  q?: number; V?: number; rho?: number;
}

export interface HingeMoments {
  C_h_0: number; C_h_alpha: number; C_h_delta: number; C_h_q: number;
  T_max?: number; T_at_deflection?: number; warnings: string[];
}

export function calculateHingeMomentAlpha(a0: number, hinge_line_position: number, balance_type: string): number {
  let C_h_alpha = -0.5 * a0 * Math.pow(1 - hinge_line_position, 2);
  const balance_factors: Record<string, number> = {
    'unbalanced': 1.0, 'horn': 0.7, 'overhang': 0.5, 'frise': 0.6, 'servo-tab': 0.3, 'anti-servo-tab': 1.5,
  };
  C_h_alpha *= balance_factors[balance_type] || 1.0;
  return C_h_alpha;
}

export function calculateHingeMomentDelta(a0: number, chord_fraction: number, hinge_line_position: number, balance_type: string): number {
  let C_h_delta = -0.3 * a0 * chord_fraction * (1 - hinge_line_position);
  const balance_factors: Record<string, number> = {
    'unbalanced': 1.0, 'horn': 0.6, 'overhang': 0.4, 'frise': 0.5, 'servo-tab': 0.2, 'anti-servo-tab': 1.8,
  };
  C_h_delta *= balance_factors[balance_type] || 1.0;
  return C_h_delta;
}

export function calculateHingeMomentQ(a0: number, hinge_line_position: number): number {
  return -0.1 * a0 * (1 - hinge_line_position);
}

export function calculateServoTorque(q: number, S_control: number, c_control: number, C_h: number): number {
  return q * S_control * c_control * C_h;
}

export function calculateHingeMoments(inputs: HingeMomentInputs): HingeMoments {
  const warnings: string[] = [];
  const C_h_0 = 0.0;
  const C_h_alpha = calculateHingeMomentAlpha(inputs.a0, inputs.hinge_line_position, inputs.balance_type);
  const C_h_delta = calculateHingeMomentDelta(inputs.a0, inputs.chord_fraction, inputs.hinge_line_position, inputs.balance_type);
  const C_h_q = calculateHingeMomentQ(inputs.a0, inputs.hinge_line_position);
  const result: HingeMoments = { C_h_0, C_h_alpha, C_h_delta, C_h_q, warnings };
  if (inputs.q !== undefined && inputs.q > 0) {
    const delta_max = 0.524;
    const C_h_max = C_h_0 + C_h_alpha * 0.1 + C_h_delta * delta_max;
    result.T_max = calculateServoTorque(inputs.q, inputs.S_control, inputs.c_control, C_h_max);
    const delta_typical = 0.262;
    const C_h_typical = C_h_0 + C_h_alpha * 0.05 + C_h_delta * delta_typical;
    result.T_at_deflection = calculateServoTorque(inputs.q, inputs.S_control, inputs.c_control, C_h_typical);
    if (result.T_max && result.T_max > 50) warnings.push('High servo torque required - may need powerful servos');
    if (result.T_max && result.T_max > 100) warnings.push('Very high servo torque - control reversal possible');
  }
  if (Math.abs(C_h_delta) < 0.01) warnings.push('Very low C_hÎ´ - control may be ineffective');
  if (inputs.balance_type === 'anti-servo-tab' && Math.abs(C_h_delta) > 0.5) warnings.push('Anti-servo-tab creates high hinge moments - ensure adequate servo power');
  return result;
}