/**
 * Raymer weight estimation models
 * Based on "Aircraft Design: A Conceptual Approach" by Daniel P. Raymer
 */

export interface RaymerWingInputs {
  S_w: number; // Wing area (m²)
  W_to: number; // Takeoff weight (N)
  AR: number; // Aspect ratio
  q: number; // Dynamic pressure (Pa)
  lambda: number; // Taper ratio
  t_c: number; // Thickness-to-chord ratio
}

export interface RaymerFuselageInputs {
  S_fuse: number; // Wetted area (m²)
  W_to: number; // Takeoff weight (N)
}

export interface RaymerTailInputs {
  S_ht: number; // Horizontal tail area (m²)
  S_vt: number; // Vertical tail area (m²)
  W_to: number; // Takeoff weight (N)
  AR_ht: number; // Horizontal tail aspect ratio
}

/**
 * Raymer wing weight estimation
 * W_wing = 0.036 * S_w^0.758 * W_to^0.0035 * AR^0.6 * q^0.006 * lambda^0.04 * (1 + t/c)^0.3
 */
export function calculateRaymerWingWeight(inputs: RaymerWingInputs): number {
  const { S_w, W_to, AR, q, lambda, t_c } = inputs;
  
  // Convert W_to from N to lbf for Raymer formula (original uses lbf)
  const W_to_lbf = W_to / 4.44822;
  const S_w_ft2 = S_w * 10.7639; // m² to ft²
  const q_psf = q * 0.0208854; // Pa to psf
  
  const W_wing_lbf = 0.036 * 
    Math.pow(S_w_ft2, 0.758) *
    Math.pow(W_to_lbf, 0.0035) *
    Math.pow(AR, 0.6) *
    Math.pow(q_psf, 0.006) *
    Math.pow(lambda, 0.04) *
    Math.pow(1 + t_c, 0.3);
  
  // Convert back to N
  return W_wing_lbf * 4.44822;
}

/**
 * Raymer fuselage weight estimation
 * W_fuse = 0.052 * S_fuse^1.086 * (W_to/10^5)^0.177
 */
export function calculateRaymerFuselageWeight(inputs: RaymerFuselageInputs): number {
  const { S_fuse, W_to } = inputs;
  
  // Convert to imperial
  const S_fuse_ft2 = S_fuse * 10.7639; // m² to ft²
  const W_to_lbf = W_to / 4.44822; // N to lbf
  
  const W_fuse_lbf = 0.052 * 
    Math.pow(S_fuse_ft2, 1.086) *
    Math.pow(W_to_lbf / 1e5, 0.177);
  
  // Convert back to N
  return W_fuse_lbf * 4.44822;
}

/**
 * Raymer horizontal tail weight
 * W_ht = 0.016 * S_ht^0.66 * W_to^0.235 * AR_ht^0.5
 */
export function calculateRaymerHorizontalTailWeight(inputs: RaymerTailInputs): number {
  const { S_ht, W_to, AR_ht } = inputs;
  
  const S_ht_ft2 = S_ht * 10.7639;
  const W_to_lbf = W_to / 4.44822;
  
  const W_ht_lbf = 0.016 * 
    Math.pow(S_ht_ft2, 0.66) *
    Math.pow(W_to_lbf, 0.235) *
    Math.pow(AR_ht, 0.5);
  
  return W_ht_lbf * 4.44822;
}

/**
 * Raymer vertical tail weight
 * W_vt = 0.073 * S_vt^0.689 * W_to^0.363
 */
export function calculateRaymerVerticalTailWeight(inputs: RaymerTailInputs): number {
  const { S_vt, W_to } = inputs;
  
  const S_vt_ft2 = S_vt * 10.7639;
  const W_to_lbf = W_to / 4.44822;
  
  const W_vt_lbf = 0.073 * 
    Math.pow(S_vt_ft2, 0.689) *
    Math.pow(W_to_lbf, 0.363);
  
  return W_vt_lbf * 4.44822;
}

/**
 * Raymer landing gear weight
 * Main gear: W_mg = 0.095 * W_to^0.768
 * Nose gear: W_ng = 0.04 * W_to^0.66
 */
export function calculateRaymerLandingGearWeight(W_to: number): { main: number; nose: number; total: number } {
  const W_to_lbf = W_to / 4.44822;
  
  const W_mg_lbf = 0.095 * Math.pow(W_to_lbf, 0.768);
  const W_ng_lbf = 0.04 * Math.pow(W_to_lbf, 0.66);
  
  return {
    main: W_mg_lbf * 4.44822,
    nose: W_ng_lbf * 4.44822,
    total: (W_mg_lbf + W_ng_lbf) * 4.44822,
  };
}

/**
 * Raymer fuel system weight
 * W_fuelSys = 1.2 + 0.003 * W_fuel
 */
export function calculateRaymerFuelSystemWeight(W_fuel: number): number {
  const W_fuel_lbf = W_fuel / 4.44822;
  const W_fuelSys_lbf = 1.2 + 0.003 * W_fuel_lbf;
  return W_fuelSys_lbf * 4.44822;
}

/**
 * Raymer flight control system weight
 * W_controls = 0.053 * W_to^0.56
 */
export function calculateRaymerControlsWeight(W_to: number, isFBW: boolean = false): number {
  const W_to_lbf = W_to / 4.44822;
  let W_controls_lbf = 0.053 * Math.pow(W_to_lbf, 0.56);
  
  // FBW adds 15-25% weight
  if (isFBW) {
    W_controls_lbf *= 1.20; // Average 20% increase
  }
  
  return W_controls_lbf * 4.44822;
}

/**
 * Raymer avionics weight
 * W_av = 1.73 * (W_crew)^0.983
 */
export function calculateRaymerAvionicsWeight(W_crew: number, options: {
  autopilot?: boolean;
  uavMissionComputer?: boolean;
  sensors?: boolean;
  cameras?: boolean;
  adsb?: boolean;
  ifr?: boolean;
} = {}): number {
  const W_crew_lbf = W_crew / 4.44822;
  let W_av_lbf = 1.73 * Math.pow(W_crew_lbf, 0.983);
  
  // Add weight for additional systems
  if (options.autopilot) W_av_lbf += 50; // ~50 lbf
  if (options.uavMissionComputer) W_av_lbf += 20; // ~20 lbf
  if (options.sensors) W_av_lbf += 30; // ~30 lbf
  if (options.cameras) W_av_lbf += 15; // ~15 lbf
  if (options.adsb) W_av_lbf += 10; // ~10 lbf
  if (options.ifr) W_av_lbf += 100; // ~100 lbf for full IFR package
  
  return W_av_lbf * 4.44822;
}
