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

/**
 * Moment of Inertia calculation
 * Uses cylindrical and rectangular approximations for components
 */
export interface InertiaInputs {
  components: ComponentLocation[];
  geometry: {
    S_w: number; // Wing area (m²)
    b: number; // Wing span (m)
    L_fuse: number; // Fuselage length (m)
    S_fuse: number; // Fuselage wetted area (m²)
  };
}

export interface InertiaResults {
  Ixx: number; // Roll moment of inertia (kg·m²)
  Iyy: number; // Pitch moment of inertia (kg·m²)
  Izz: number; // Yaw moment of inertia (kg·m²)
}

/**
 * Calculate moments of inertia using parallel axis theorem
 * I = I_cm + m * d²
 * 
 * Simplified models:
 * - Wing: Rectangular plate approximation
 * - Fuselage: Cylindrical approximation
 * - Other components: Point mass approximation
 */
export function calculateMomentOfInertia(
  inputs: InertiaInputs,
  x_cg: number // CG position (m from nose)
): InertiaResults {
  const { components, geometry } = inputs;
  
  // Convert weights from N to kg
  const totalMass_kg = components.reduce((sum, comp) => sum + comp.weight / 9.81, 0);
  
  // Wing inertia (rectangular plate approximation)
  // Ixx (roll) = m * b² / 12 (about CG)
  // Iyy (pitch) = m * c² / 12 (about CG)
  // Izz (yaw) = m * (b² + c²) / 12 (about CG)
  const wingMass_kg = components.find(c => c.name === 'Wing')?.weight / 9.81 || 0;
  const c_wing = geometry.S_w / geometry.b; // Average chord
  const Ixx_wing = wingMass_kg * geometry.b * geometry.b / 12;
  const Iyy_wing = wingMass_kg * c_wing * c_wing / 12;
  const Izz_wing = wingMass_kg * (geometry.b * geometry.b + c_wing * c_wing) / 12;
  
  // Fuselage inertia (cylindrical approximation)
  // Ixx = m * r² / 2 (about axis)
  // Iyy = Izz = m * (3*r² + L²) / 12
  const fuseMass_kg = components.find(c => c.name === 'Fuselage')?.weight / 9.81 || 0;
  const r_fuse = Math.sqrt(geometry.S_fuse / (Math.PI * geometry.L_fuse)); // Approximate radius
  const Ixx_fuse = fuseMass_kg * r_fuse * r_fuse / 2;
  const Iyy_fuse = fuseMass_kg * (3 * r_fuse * r_fuse + geometry.L_fuse * geometry.L_fuse) / 12;
  const Izz_fuse = Iyy_fuse;
  
  // Component point masses (parallel axis theorem)
  let Ixx_components = 0;
  let Iyy_components = 0;
  let Izz_components = 0;
  
  for (const comp of components) {
    if (comp.name === 'Wing' || comp.name === 'Fuselage') continue; // Already calculated
    
    const m_kg = comp.weight / 9.81;
    const dx = comp.x_position - x_cg; // Distance from CG
    
    // Point mass approximation: I = m * d²
    // For roll (Ixx): assume components are distributed along span
    // For pitch/yaw (Iyy/Izz): use distance from CG
    Ixx_components += m_kg * (geometry.b / 4) * (geometry.b / 4); // Approximate span distribution
    Iyy_components += m_kg * dx * dx;
    Izz_components += m_kg * dx * dx;
  }
  
  // Sum all contributions
  return {
    Ixx: Ixx_wing + Ixx_fuse + Ixx_components,
    Iyy: Iyy_wing + Iyy_fuse + Iyy_components,
    Izz: Izz_wing + Izz_fuse + Izz_components,
  };
}
