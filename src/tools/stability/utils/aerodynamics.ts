/**
 * Aerodynamic calculations for stability and control derivatives
 * 
 * Implements formulas from Raymer, Roskam, Anderson, and USAF DATCOM
 */

/**
 * Calculate wing lift curve slope (finite wing)
 * 
 * a_w = a0 / (1 + a0/(π*e*AR))
 * 
 * @param a0 - Airfoil lift curve slope (per radian, typically 2π)
 * @param AR - Aspect ratio
 * @param e - Wing efficiency factor (0.7-0.95)
 * @returns Wing lift curve slope (per radian)
 */
export function calculateWingLiftCurveSlope(
  a0: number,
  AR: number,
  e: number
): number {
  if (AR <= 0) {
    throw new Error(`Aspect ratio must be positive, got ${AR}`);
  }
  if (e <= 0 || e > 1) {
    throw new Error(`Wing efficiency must be between 0 and 1, got ${e}`);
  }
  if (a0 <= 0) {
    throw new Error(`Airfoil lift curve slope must be positive, got ${a0}`);
  }

  const denominator = 1 + a0 / (Math.PI * e * AR);
  return a0 / denominator;
}

/**
 * Calculate tail lift curve slope
 * 
 * a_t = η * a0 / (1 + a0/(π*e_t*AR_t))
 * 
 * @param a0 - Airfoil lift curve slope (per radian)
 * @param AR_t - Tail aspect ratio
 * @param e_t - Tail efficiency factor
 * @param eta - Tail effectiveness factor (typically 0.9)
 * @returns Tail lift curve slope (per radian)
 */
export function calculateTailLiftCurveSlope(
  a0: number,
  AR_t: number,
  e_t: number,
  eta: number = 0.9
): number {
  if (AR_t <= 0) {
    throw new Error(`Tail aspect ratio must be positive, got ${AR_t}`);
  }
  if (e_t <= 0 || e_t > 1) {
    throw new Error(`Tail efficiency must be between 0 and 1, got ${e_t}`);
  }
  if (eta <= 0 || eta > 1) {
    throw new Error(`Tail effectiveness must be between 0 and 1, got ${eta}`);
  }

  const wingSlope = calculateWingLiftCurveSlope(a0, AR_t, e_t);
  return eta * wingSlope;
}

/**
 * Calculate downwash gradient using USAF DATCOM formula
 * 
 * ε_α = 2*a_w / (π*AR)
 * 
 * @param a_w - Wing lift curve slope (per radian)
 * @param AR - Wing aspect ratio
 * @returns Downwash gradient (dimensionless)
 */
export function calculateDownwashDATCOM(
  a_w: number,
  AR: number
): number {
  if (AR <= 0) {
    throw new Error(`Aspect ratio must be positive, got ${AR}`);
  }
  return (2 * a_w) / (Math.PI * AR);
}

/**
 * Calculate downwash gradient using Roskam empirical formula
 * 
 * ε_α = a_w / (π*AR) * (1.1 + AR/(AR+4))
 * 
 * @param a_w - Wing lift curve slope (per radian)
 * @param AR - Wing aspect ratio
 * @returns Downwash gradient (dimensionless)
 */
export function calculateDownwashRoskam(
  a_w: number,
  AR: number
): number {
  if (AR <= 0) {
    throw new Error(`Aspect ratio must be positive, got ${AR}`);
  }
  const term1 = a_w / (Math.PI * AR);
  const term2 = 1.1 + AR / (AR + 4);
  return term1 * term2;
}

/**
 * Calculate tail volume coefficient
 * 
 * V_H = (S_t * l_t) / (S_w * c_bar)
 * 
 * @param S_t - Tail area (m²)
 * @param l_t - Tail arm (distance from wing AC to tail AC) (m)
 * @param S_w - Wing area (m²)
 * @param c_bar - Mean aerodynamic chord (m)
 * @returns Tail volume coefficient (dimensionless)
 */
export function calculateTailVolumeCoefficient(
  S_t: number,
  l_t: number,
  S_w: number,
  c_bar: number
): number {
  if (S_t <= 0 || S_w <= 0 || c_bar <= 0 || l_t <= 0) {
    throw new Error('All areas, tail arm, and MAC must be positive');
  }
  return (S_t * l_t) / (S_w * c_bar);
}

/**
 * Calculate wing contribution to pitching moment derivative
 * 
 * C_mα,w = a_w * (x_cg - x_ac,w) / c_bar
 * 
 * @param a_w - Wing lift curve slope (per radian)
 * @param x_cg - CG position (m, measured from leading edge)
 * @param x_ac_w - Wing aerodynamic center position (m)
 * @param c_bar - Mean aerodynamic chord (m)
 * @returns Wing pitching moment derivative (per radian)
 */
export function calculateWingPitchingMomentDerivative(
  a_w: number,
  x_cg: number,
  x_ac_w: number,
  c_bar: number
): number {
  if (c_bar <= 0) {
    throw new Error(`Mean aerodynamic chord must be positive, got ${c_bar}`);
  }
  return (a_w * (x_cg - x_ac_w)) / c_bar;
}

/**
 * Calculate tail contribution to pitching moment derivative
 * 
 * C_mα,t = -a_t * (1 - ε_α) * (S_t/S_w) * (l_t/c_bar)
 * 
 * @param a_t - Tail lift curve slope (per radian)
 * @param epsilon_alpha - Downwash gradient
 * @param S_t - Tail area (m²)
 * @param S_w - Wing area (m²)
 * @param l_t - Tail arm (m)
 * @param c_bar - Mean aerodynamic chord (m)
 * @returns Tail pitching moment derivative (per radian)
 */
export function calculateTailPitchingMomentDerivative(
  a_t: number,
  epsilon_alpha: number,
  S_t: number,
  S_w: number,
  l_t: number,
  c_bar: number
): number {
  if (S_t <= 0 || S_w <= 0 || c_bar <= 0 || l_t <= 0) {
    throw new Error('All areas, tail arm, and MAC must be positive');
  }
  if (epsilon_alpha < 0 || epsilon_alpha > 1) {
    throw new Error(`Downwash gradient must be between 0 and 1, got ${epsilon_alpha}`);
  }

  const term1 = -a_t * (1 - epsilon_alpha);
  const term2 = (S_t / S_w) * (l_t / c_bar);
  return term1 * term2;
}

/**
 * Calculate total pitching moment derivative
 * 
 * C_mα = C_mα,w + C_mα,t
 * 
 * @param C_m_alpha_w - Wing contribution
 * @param C_m_alpha_t - Tail contribution
 * @returns Total pitching moment derivative (per radian)
 */
export function calculateTotalPitchingMomentDerivative(
  C_m_alpha_w: number,
  C_m_alpha_t: number
): number {
  return C_m_alpha_w + C_m_alpha_t;
}

/**
 * Calculate neutral point position
 * 
 * x_np = x_ac,w + (a_t/a_w) * (1 - ε_α) * (S_t/S_w) * (l_t/c_bar) * c_bar
 * 
 * @param x_ac_w - Wing aerodynamic center position (m)
 * @param a_t - Tail lift curve slope (per radian)
 * @param a_w - Wing lift curve slope (per radian)
 * @param epsilon_alpha - Downwash gradient
 * @param S_t - Tail area (m²)
 * @param S_w - Wing area (m²)
 * @param l_t - Tail arm (m)
 * @param c_bar - Mean aerodynamic chord (m)
 * @returns Neutral point position (m from leading edge)
 */
export function calculateNeutralPoint(
  x_ac_w: number,
  a_t: number,
  a_w: number,
  epsilon_alpha: number,
  S_t: number,
  S_w: number,
  l_t: number,
  c_bar: number
): number {
  if (a_w <= 0) {
    throw new Error(`Wing lift curve slope must be positive, got ${a_w}`);
  }
  if (S_t <= 0 || S_w <= 0 || c_bar <= 0 || l_t <= 0) {
    throw new Error('All areas, tail arm, and MAC must be positive');
  }

  const term1 = (a_t / a_w) * (1 - epsilon_alpha);
  const term2 = (S_t / S_w) * (l_t / c_bar);
  return x_ac_w + term1 * term2 * c_bar;
}

/**
 * Calculate static margin
 * 
 * SM = (x_np - x_cg) / c_bar
 * 
 * @param x_np - Neutral point position (m)
 * @param x_cg - CG position (m)
 * @param c_bar - Mean aerodynamic chord (m)
 * @returns Static margin (dimensionless, positive = stable)
 */
export function calculateStaticMargin(
  x_np: number,
  x_cg: number,
  c_bar: number
): number {
  if (c_bar <= 0) {
    throw new Error(`Mean aerodynamic chord must be positive, got ${c_bar}`);
  }
  return (x_np - x_cg) / c_bar;
}

/**
 * Calculate elevator effectiveness derivative
 * 
 * C_mδe = -η_t * a_t * (S_t/S_w) * (l_t/c_bar) * τ_e
 * 
 * @param eta_t - Tail effectiveness factor
 * @param a_t - Tail lift curve slope (per radian)
 * @param S_t - Tail area (m²)
 * @param S_w - Wing area (m²)
 * @param l_t - Tail arm (m)
 * @param c_bar - Mean aerodynamic chord (m)
 * @param tau_e - Elevator effectiveness (0.3-0.6 typical)
 * @returns Elevator effectiveness derivative (per radian)
 */
export function calculateElevatorEffectiveness(
  eta_t: number,
  a_t: number,
  S_t: number,
  S_w: number,
  l_t: number,
  c_bar: number,
  tau_e: number
): number {
  if (S_t <= 0 || S_w <= 0 || c_bar <= 0 || l_t <= 0) {
    throw new Error('All areas, tail arm, and MAC must be positive');
  }
  if (tau_e <= 0 || tau_e > 1) {
    throw new Error(`Elevator effectiveness must be between 0 and 1, got ${tau_e}`);
  }

  const term1 = -eta_t * a_t;
  const term2 = (S_t / S_w) * (l_t / c_bar);
  return term1 * term2 * tau_e;
}

/**
 * Calculate aileron effectiveness (simplified DATCOM-style)
 * 
 * C_lδa = K_a * (S_a/S_w)
 * 
 * @param K_a - Aileron effectiveness constant (typically 0.3-0.5)
 * @param S_a - Aileron area (m²)
 * @param S_w - Wing area (m²)
 * @returns Aileron effectiveness derivative (per radian)
 */
export function calculateAileronEffectiveness(
  K_a: number,
  S_a: number,
  S_w: number
): number {
  if (S_a <= 0 || S_w <= 0) {
    throw new Error('Aileron and wing areas must be positive');
  }
  return K_a * (S_a / S_w);
}

/**
 * Calculate rudder effectiveness (simplified DATCOM-style)
 * 
 * C_nδr = K_r * (S_r/S_v)
 * 
 * @param K_r - Rudder effectiveness constant (typically 0.2-0.4)
 * @param S_r - Rudder area (m²)
 * @param S_v - Vertical tail area (m²)
 * @returns Rudder effectiveness derivative (per radian)
 */
export function calculateRudderEffectiveness(
  K_r: number,
  S_r: number,
  S_v: number
): number {
  if (S_r <= 0 || S_v <= 0) {
    throw new Error('Rudder and vertical tail areas must be positive');
  }
  return K_r * (S_r / S_v);
}

/**
 * Estimate lateral stability derivative C_lβ (dihedral effect)
 * Simplified formula based on dihedral angle
 * 
 * C_lβ ≈ -0.0001 * Γ (per degree of dihedral)
 * 
 * @param dihedralAngle - Dihedral angle (degrees)
 * @returns Lateral stability derivative (per radian)
 */
export function estimateDihedralEffect(
  dihedralAngle: number
): number {
  // Convert from per-degree to per-radian
  return -0.0001 * (dihedralAngle * Math.PI / 180) * (180 / Math.PI);
}

/**
 * Estimate directional stability derivative C_nβ
 * Simplified formula based on vertical tail
 * 
 * C_nβ ≈ -a_v * (S_v/S_w) * (l_v/b_w)
 * 
 * @param a_v - Vertical tail lift curve slope (per radian)
 * @param S_v - Vertical tail area (m²)
 * @param S_w - Wing area (m²)
 * @param l_v - Vertical tail arm (m)
 * @param b_w - Wing span (m)
 * @returns Directional stability derivative (per radian)
 */
export function estimateDirectionalStability(
  a_v: number,
  S_v: number,
  S_w: number,
  l_v: number,
  b_w: number
): number {
  if (S_v <= 0 || S_w <= 0 || l_v <= 0 || b_w <= 0) {
    throw new Error('All areas, tail arm, and wing span must be positive');
  }
  return -a_v * (S_v / S_w) * (l_v / b_w);
}
