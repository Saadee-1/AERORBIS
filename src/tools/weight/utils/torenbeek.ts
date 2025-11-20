/**
 * Torenbeek weight estimation models
 * Based on "Synthesis of Subsonic Airplane Design" by E. Torenbeek
 */

export interface TorenbeekWingInputs {
  S_w: number; // Wing area (m²)
  t_c: number; // Thickness-to-chord ratio
  W_to: number; // Takeoff weight (N)
  b: number; // Wing span (m)
  N_ult: number; // Ultimate load factor
  hasThrustRelief?: boolean; // Thrust relief factor
}

/**
 * Torenbeek wing weight (bending model)
 * W_wing = C1 * S_w * (t/c) + C2 * (W_to * b * N_ult)
 * 
 * Simplified version with typical coefficients
 */
export function calculateTorenbeekWingWeight(inputs: TorenbeekWingInputs): number {
  const { S_w, t_c, W_to, b, N_ult, hasThrustRelief } = inputs;
  
  // Convert to imperial
  const S_w_ft2 = S_w * 10.7639;
  const W_to_lbf = W_to / 4.44822;
  const b_ft = b * 3.28084;
  
  // Typical coefficients (vary by aircraft type)
  const C1 = 0.5; // lb/ft² (typical for light aircraft)
  const C2 = 0.00015; // 1/ft (typical)
  
  let W_wing_lbf = C1 * S_w_ft2 * t_c + C2 * W_to_lbf * b_ft * N_ult;
  
  // Thrust relief reduces wing bending moment
  if (hasThrustRelief) {
    W_wing_lbf *= 0.95; // ~5% reduction
  }
  
  return W_wing_lbf * 4.44822;
}

/**
 * Torenbeek fuselage weight (alternative to Raymer)
 * Based on wetted area and structural index
 */
export function calculateTorenbeekFuselageWeight(
  S_fuse: number, // Wetted area (m²)
  L_fuse: number, // Fuselage length (m)
  W_to: number, // Takeoff weight (N)
  isPressurized: boolean = false
): number {
  const S_fuse_ft2 = S_fuse * 10.7639;
  const L_fuse_ft = L_fuse * 3.28084;
  const W_to_lbf = W_to / 4.44822;
  
  // Structural index (typical values)
  const structuralIndex = isPressurized ? 2.5 : 1.8; // lb/ft²
  
  let W_fuse_lbf = structuralIndex * S_fuse_ft2;
  
  // Add weight for pressurization
  if (isPressurized) {
    W_fuse_lbf += 0.15 * S_fuse_ft2; // Additional 15% for pressure vessel
  }
  
  return W_fuse_lbf * 4.44822;
}
