/**
 * Center of Gravity (CG) calculation utilities
 */

export interface ComponentLocation {
  name: string;
  weight: number; // N
  x_position: number; // m from nose
}

/**
 * Calculate CG position from component weights and locations
 */
export function calculateCG(
  components: ComponentLocation[],
  W_total: number
): number {
  if (W_total === 0 || components.length === 0) {
    return 0;
  }

  let sumMoment = 0;
  for (const comp of components) {
    sumMoment += comp.weight * comp.x_position;
  }

  return sumMoment / W_total;
}

/**
 * Calculate mean aerodynamic chord (MAC) position
 */
export function calculateMAC(
  S_w: number, // Wing area (m²)
  b: number, // Wing span (m)
  lambda: number, // Taper ratio
  x_LE_root: number = 0 // Leading edge position at root (m from nose)
): { MAC: number; x_MAC: number } {
  // MAC = (2/3) * c_root * (1 + lambda + lambda²) / (1 + lambda)
  // Simplified: MAC ≈ 2/3 * S_w / b for typical taper ratios
  const c_root = (2 * S_w) / (b * (1 + lambda));
  const MAC = (2/3) * c_root * (1 + lambda + lambda * lambda) / (1 + lambda);
  
  // MAC position is typically at 25% of MAC from leading edge
  const x_MAC = x_LE_root + 0.25 * MAC;
  
  return { MAC, x_MAC };
}

/**
 * Calculate CG position as fraction of MAC
 */
export function calculateCGonMAC(
  x_cg: number, // CG position (m from nose)
  x_MAC: number, // MAC position (m from nose)
  MAC: number // Mean aerodynamic chord (m)
): number {
  return (x_cg - x_MAC) / MAC;
}
