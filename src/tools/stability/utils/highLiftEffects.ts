/**
 * High-lift device effects calculations
 * 
 * Implements DATCOM formulas for flaps, slats, and spoilers
 */

export interface HighLiftDevice {
  type: 'plain-flap' | 'slotted-flap' | 'fowler-flap' | 'slat' | 'spoiler';
  deflection: number; // Deflection angle (degrees)
  span_fraction: number; // Device span / wing span (0-1)
  chord_fraction: number; // Device chord / wing chord (0-1)
  position: 'leading-edge' | 'trailing-edge';
}

export interface HighLiftInputs {
  // Wing properties
  S_w: number; // m²
  AR: number;
  c_bar: number; // m
  a_w: number; // Wing lift curve slope
  
  // High-lift devices
  devices: HighLiftDevice[];
  
  // Tail properties (for trim calculation)
  S_t: number; // m²
  l_t: number; // m
  a_t: number; // Tail lift curve slope
}

export interface HighLiftEffects {
  // Lift increments
  delta_C_L_max: number; // Maximum lift coefficient increment
  delta_C_L: number; // Lift coefficient increment at current deflection
  
  // Moment increments
  delta_C_m: number; // Pitching moment increment (typically negative = nose down)
  delta_C_m_trim: number; // Trim moment change
  
  // Drag increments
  delta_C_D: number; // Drag coefficient increment
  
  // Downwash changes
  delta_epsilon_alpha: number; // Change in downwash gradient
  
  // Control authority changes
  delta_C_m_delta_e: number; // Change in elevator effectiveness
  
  warnings: string[];
}

/**
 * Calculate lift increment from flap
 * 
 * ΔCL ≈ K_f * (S_flap / S_w) * sin(δ_f) * cos(δ_f)
 * 
 * Where K_f depends on flap type
 * 
 * @param device - High-lift device
 * @param S_w - Wing area
 * @returns Lift coefficient increment
 */
export function calculateFlapLiftIncrement(
  device: HighLiftDevice,
  S_w: number
): number {
  const delta_rad = device.deflection * Math.PI / 180;
  
  // Flap type factors (DATCOM)
  const K_factors: Record<string, number> = {
    'plain-flap': 1.0,
    'slotted-flap': 1.3,
    'fowler-flap': 1.6,
    'slat': 0.8,
    'spoiler': -0.5, // Spoilers reduce lift
  };
  
  const K_f = K_factors[device.type] || 1.0;
  const S_flap = S_w * device.span_fraction * device.chord_fraction;
  
  // Lift increment formula
  let delta_C_L = K_f * (S_flap / S_w) * Math.sin(delta_rad) * Math.cos(delta_rad);
  
  // Limit for very large deflections
  if (device.deflection > 40) {
    delta_C_L *= 0.8; // Reduced effectiveness at high angles
  }
  
  return delta_C_L;
}

/**
 * Calculate moment increment from flap
 * 
 * ΔCm ≈ -0.25 * ΔCL * (x_flap / c̄)
 * 
 * Where x_flap is flap center position
 * 
 * @param device - High-lift device
 * @param delta_C_L - Lift increment
 * @param c_bar - Mean aerodynamic chord
 * @returns Moment coefficient increment
 */
export function calculateFlapMomentIncrement(
  device: HighLiftDevice,
  delta_C_L: number,
  c_bar: number
): number {
  // Flap center position (typically 0.7-0.8 c for trailing edge devices)
  const x_flap = device.position === 'trailing-edge' ? 0.75 * c_bar : 0.25 * c_bar;
  
  // Moment increment (negative = nose down)
  const delta_C_m = -0.25 * delta_C_L * (x_flap / c_bar);
  
  // Spoilers create additional nose-up moment
  if (device.type === 'spoiler') {
    return -delta_C_m * 0.5; // Reverse sign and reduce magnitude
  }
  
  return delta_C_m;
}

/**
 * Calculate drag increment from flap
 * 
 * ΔCD ≈ 0.02 * (S_flap / S_w) * sin²(δ_f)
 * 
 * @param device - High-lift device
 * @param S_w - Wing area
 * @returns Drag coefficient increment
 */
export function calculateFlapDragIncrement(
  device: HighLiftDevice,
  S_w: number
): number {
  const delta_rad = device.deflection * Math.PI / 180;
  const S_flap = S_w * device.span_fraction * device.chord_fraction;
  
  // Base drag increment
  let delta_C_D = 0.02 * (S_flap / S_w) * Math.sin(delta_rad) * Math.sin(delta_rad);
  
  // Flap type corrections
  if (device.type === 'fowler-flap') {
    delta_C_D *= 0.8; // Fowler flaps are more efficient
  } else if (device.type === 'slat') {
    delta_C_D *= 0.5; // Slats add less drag
  } else if (device.type === 'spoiler') {
    delta_C_D *= 1.5; // Spoilers add significant drag
  }
  
  return delta_C_D;
}

/**
 * Calculate downwash change from flaps
 * 
 * Flaps increase downwash, affecting tail effectiveness
 * 
 * @param device - High-lift device
 * @param delta_C_L - Lift increment
 * @param AR - Wing aspect ratio
 * @returns Change in downwash gradient
 */
export function calculateDownwashChange(
  device: HighLiftDevice,
  delta_C_L: number,
  AR: number
): number {
  if (device.position !== 'trailing-edge') {
    return 0; // Leading edge devices don't significantly affect downwash
  }
  
  // Increased lift increases downwash
  const delta_epsilon_alpha = 0.1 * delta_C_L / AR;
  
  return delta_epsilon_alpha;
}

/**
 * Calculate all high-lift device effects
 * 
 * @param devices - High-lift devices array
 * @returns Complete high-lift effects
 */
export function calculateHighLiftEffects(
  devices: HighLiftDevice[]
): HighLiftEffects {
  const warnings: string[] = [];
  
  let delta_C_L_max = 0;
  let delta_C_L = 0;
  let delta_C_m = 0;
  let delta_C_D = 0;
  let delta_epsilon_alpha = 0;
  
  // Process each device
  for (const device of devices) {
    // Check for excessive deflection
    if (device.deflection > 40) {
      warnings.push(`High deflection (${device.deflection}°) for ${device.type} - may cause flow separation`);
    }
    
    // Calculate increments
    const lift_inc = calculateFlapLiftIncrement(device, 1.0); // S_w normalized
    const moment_inc = calculateFlapMomentIncrement(device, lift_inc, 1.0); // c_bar normalized
    const drag_inc = calculateFlapDragIncrement(device, 1.0);
    const downwash_inc = calculateDownwashChange(device, lift_inc, 6.0); // AR normalized
    
    delta_C_L_max += lift_inc;
    delta_C_L += lift_inc;
    delta_C_m += moment_inc;
    delta_C_D += drag_inc;
    delta_epsilon_alpha += downwash_inc;
  }
  
  // Calculate trim moment change
  // Trim moment accounts for tail lift change due to downwash
  const delta_C_m_trim = delta_C_m - 0.1 * delta_epsilon_alpha; // Simplified
  
  // Control authority reduction (flaps reduce elevator effectiveness)
  const delta_C_m_delta_e = -0.1 * delta_C_L; // Simplified
  
  // Warnings
  if (Math.abs(delta_C_m) > 0.3) {
    warnings.push('Large pitching moment change - significant trim change required');
  }
  
  if (delta_C_D > 0.1) {
    warnings.push('High drag increment - may significantly affect performance');
  }
  
  if (devices.some(d => d.deflection > 50)) {
    warnings.push('Very high deflection angles - risk of flow separation and control issues');
  }
  
  return {
    delta_C_L_max,
    delta_C_L,
    delta_C_m,
    delta_C_m_trim,
    delta_C_D,
    delta_epsilon_alpha,
    delta_C_m_delta_e,
    warnings,
  };
}

