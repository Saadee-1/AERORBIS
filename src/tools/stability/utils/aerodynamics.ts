/**
 * Aerodynamic calculations for stability analysis
 * 
 * Implements formulas from Raymer, Roskam, Anderson, and USAF DATCOM
 */

import { DEFAULT_AIRFOIL_LIFT_SLOPE, DEFAULT_WING_EFFICIENCY, DEFAULT_TAIL_EFFICIENCY } from './constants';

/**
 * Calculate wing lift curve slope (finite wing)
 * 
 * a_w = a_0 / (1 + a_0 / (π * e * AR))
 * 
 * @param a0 - Airfoil lift curve slope (per radian, default 2π)
 * @param AR - Aspect ratio
 * @param e - Wing efficiency factor (0.7-0.95, default 0.85)
 * @returns Wing lift curve slope (per radian)
 */
export function calculateWingLiftCurveSlope(
  a0: number = DEFAULT_AIRFOIL_LIFT_SLOPE,
  AR: number,
  e: number = DEFAULT_WING_EFFICIENCY
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
 * a_t = η * a_0 / (1 + a_0 / (π * e_t * AR_t))
 * 
 * @param a0 - Airfoil lift curve slope (per radian)
 * @param AR_t - Tail aspect ratio
 * @param e_t - Tail efficiency factor (default 0.9)
 * @param eta - Tail effectiveness factor (default 0.9)
 * @returns Tail lift curve slope (per radian)
 */
export function calculateTailLiftCurveSlope(
  a0: number = DEFAULT_AIRFOIL_LIFT_SLOPE,
  AR_t: number,
  e_t: number = DEFAULT_WING_EFFICIENCY,
  eta: number = DEFAULT_TAIL_EFFICIENCY
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

  const denominator = 1 + a0 / (Math.PI * e_t * AR_t);
  return eta * a0 / denominator;
}

/**
 * Calculate downwash gradient using USAF DATCOM formula
 * 
 * ε_α = 2 * a_w / (π * AR)
 * 
 * @param a_w - Wing lift curve slope (per radian)
 * @param AR - Wing aspect ratio
 * @returns Downwash gradient (dimensionless)
 */
export function calculateDownwashDATCOM(a_w: number, AR: number): number {
  if (AR <= 0) {
    throw new Error(`Aspect ratio must be positive, got ${AR}`);
  }
  return (2 * a_w) / (Math.PI * AR);
}

/**
 * Calculate downwash gradient using Roskam empirical formula
 * 
 * ε_α = (a_w / (π * AR)) * (1.1 + AR / (AR + 4))
 * 
 * @param a_w - Wing lift curve slope (per radian)
 * @param AR - Wing aspect ratio
 * @returns Downwash gradient (dimensionless)
 */
export function calculateDownwashRoskam(a_w: number, AR: number): number {
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
    throw new Error('All areas, chord, and tail arm must be positive');
  }
  return (S_t * l_t) / (S_w * c_bar);
}
