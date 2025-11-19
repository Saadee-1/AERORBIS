/**
 * Stability criteria evaluation (MIL-F-8785C)
 * 
 * Evaluates aircraft handling qualities according to military standards
 */

export interface StabilityCriteriaInputs {
  // Longitudinal derivatives
  C_m_alpha: number;
  C_m_q: number;
  
  // Lateral derivatives
  C_l_beta: number;
  C_n_beta: number;
  C_l_p: number;
  C_l_r: number;
  C_n_r: number;
  C_n_p: number;
  
  // Flight condition
  V: number; // Velocity (m/s)
  altitude?: number; // Altitude (m)
  
  // Aircraft category
  category: 'A' | 'B' | 'C'; // Category A: Fighter, B: Transport, C: Trainer
  
  // Flight phase
  phase: 'cruise' | 'approach' | 'landing' | 'takeoff';
}

export interface StabilityCriteria {
  // Longitudinal handling qualities
  longitudinal_level: 1 | 2 | 3;
  longitudinal_rating: string;
  phugoid_damping_ratio?: number;
  short_period_damping_ratio?: number;
  
  // Lateral handling qualities
  lateral_level: 1 | 2 | 3;
  lateral_rating: string;
  dutch_roll_damping_ratio?: number;
  roll_mode_time_constant?: number;
  spiral_stability?: 'stable' | 'unstable' | 'neutral';
  
  // Overall rating
  overall_level: 1 | 2 | 3;
  overall_rating: string;
  
  // Detailed criteria
  criteria_met: {
    longitudinal_stability: boolean;
    lateral_stability: boolean;
    roll_response: boolean;
    yaw_response: boolean;
    spiral_stability: boolean;
  };
  
  warnings: string[];
}

/**
 * Evaluate longitudinal handling qualities
 * 
 * @param C_m_alpha - Pitching moment derivative
 * @param C_m_q - Pitch damping
 * @param category - Aircraft category
 * @returns Longitudinal rating
 */
export function evaluateLongitudinal(
  C_m_alpha: number,
  C_m_q: number,
  category: string
): { level: 1 | 2 | 3; rating: string } {
  // Level 1 criteria (good)
  const level1_C_m_alpha = category === 'A' ? -0.05 : -0.08; // Fighter vs Transport
  const level1_C_m_q = -0.5;
  
  // Level 2 criteria (acceptable)
  const level2_C_m_alpha = category === 'A' ? -0.02 : -0.05;
  const level2_C_m_q = -0.3;
  
  // Check static stability
  if (C_m_alpha < 0) {
    // Stable
    if (C_m_alpha <= level1_C_m_alpha && C_m_q <= level1_C_m_q) {
      return { level: 1, rating: 'Level 1: Good handling qualities' };
    } else if (C_m_alpha <= level2_C_m_alpha && C_m_q <= level2_C_m_q) {
      return { level: 2, rating: 'Level 2: Acceptable handling qualities' };
    } else {
      return { level: 3, rating: 'Level 3: Unsatisfactory handling qualities' };
    }
  } else {
    // Unstable
    return { level: 3, rating: 'Level 3: Statically unstable - unsafe' };
  }
}

/**
 * Evaluate lateral handling qualities
 * 
 * @param C_l_beta - Roll moment due to sideslip
 * @param C_n_beta - Yaw moment due to sideslip
 * @param C_l_p - Roll damping
 * @param C_n_r - Yaw damping
 * @param category - Aircraft category
 * @returns Lateral rating
 */
export function evaluateLateral(
  C_l_beta: number,
  C_n_beta: number,
  C_l_p: number,
  C_n_r: number,
  category: string
): { level: 1 | 2 | 3; rating: string } {
  // Level 1 criteria
  const level1_C_n_beta = category === 'A' ? 0.001 : 0.002;
  const level1_C_l_p = -0.3;
  const level1_C_n_r = -0.2;
  
  // Level 2 criteria
  const level2_C_n_beta = category === 'A' ? 0.0005 : 0.001;
  const level2_C_l_p = -0.2;
  const level2_C_n_r = -0.1;
  
  // Check directional stability (C_n_beta > 0)
  const directional_stable = C_n_beta > 0;
  
  // Check damping
  const roll_damping_ok = C_l_p <= level1_C_l_p;
  const yaw_damping_ok = C_n_r <= level1_C_n_r;
  
  if (directional_stable && C_n_beta >= level1_C_n_beta && roll_damping_ok && yaw_damping_ok) {
    return { level: 1, rating: 'Level 1: Good lateral handling qualities' };
  } else if (directional_stable && C_n_beta >= level2_C_n_beta && C_l_p <= level2_C_l_p && C_n_r <= level2_C_n_r) {
    return { level: 2, rating: 'Level 2: Acceptable lateral handling qualities' };
  } else {
    return { level: 3, rating: 'Level 3: Unsatisfactory lateral handling qualities' };
  }
}

/**
 * Calculate phugoid damping ratio
 * 
 * Simplified estimate based on C_m_alpha and C_m_q
 * 
 * @param C_m_alpha - Pitching moment derivative
 * @param C_m_q - Pitch damping
 * @returns Phugoid damping ratio estimate
 */
export function estimatePhugoidDamping(
  C_m_alpha: number,
  C_m_q: number
): number {
  // Simplified phugoid damping estimate
  // ζ_phugoid ≈ -C_m_q / (2 * sqrt(-C_m_alpha))
  if (C_m_alpha >= 0) {
    return 0; // Unstable
  }
  
  const damping = -C_m_q / (2 * Math.sqrt(-C_m_alpha));
  return Math.max(0, Math.min(1, damping)); // Clamp to 0-1
}

/**
 * Calculate Dutch roll damping ratio
 * 
 * Simplified estimate based on lateral derivatives
 * 
 * @param C_n_beta - Yaw moment due to sideslip
 * @param C_n_r - Yaw damping
 * @param C_l_beta - Roll moment due to sideslip
 * @returns Dutch roll damping ratio estimate
 */
export function estimateDutchRollDamping(
  C_n_beta: number,
  C_n_r: number,
  C_l_beta: number
): number {
  // Simplified Dutch roll damping estimate
  if (C_n_beta <= 0) {
    return 0; // Directionally unstable
  }
  
  // ζ_dutch ≈ -C_n_r / (2 * sqrt(C_n_beta))
  const damping = -C_n_r / (2 * Math.sqrt(C_n_beta));
  return Math.max(0, Math.min(1, damping)); // Clamp to 0-1
}

/**
 * Evaluate spiral stability
 * 
 * Spiral stability: C_l_beta / C_n_beta > 0 (typically)
 * 
 * @param C_l_beta - Roll moment due to sideslip
 * @param C_n_beta - Yaw moment due to sideslip
 * @returns Spiral stability assessment
 */
export function evaluateSpiralStability(
  C_l_beta: number,
  C_n_beta: number
): 'stable' | 'unstable' | 'neutral' {
  if (C_n_beta <= 0) {
    return 'unstable'; // Directionally unstable
  }
  
  const spiral_parameter = C_l_beta / C_n_beta;
  
  if (spiral_parameter > 0.1) {
    return 'stable';
  } else if (spiral_parameter < -0.1) {
    return 'unstable';
  } else {
    return 'neutral';
  }
}

/**
 * Evaluate all stability criteria
 * 
 * @param inputs - Stability criteria inputs
 * @returns Complete stability criteria evaluation
 */
export function evaluateStabilityCriteria(
  inputs: StabilityCriteriaInputs
): StabilityCriteria {
  const warnings: string[] = [];
  
  // Evaluate longitudinal
  const longitudinal = evaluateLongitudinal(
    inputs.C_m_alpha,
    inputs.C_m_q,
    inputs.category
  );
  
  // Evaluate lateral
  const lateral = evaluateLateral(
    inputs.C_l_beta || 0,
    inputs.C_n_beta || 0,
    inputs.C_l_p,
    inputs.C_n_r,
    inputs.category
  );
  
  // Calculate damping ratios
  const phugoid_damping = estimatePhugoidDamping(
    inputs.C_m_alpha,
    inputs.C_m_q
  );
  
  const dutch_roll_damping = estimateDutchRollDamping(
    inputs.C_n_beta || 0,
    inputs.C_n_r,
    inputs.C_l_beta || 0
  );
  
  // Evaluate spiral stability
  const spiral_stability = evaluateSpiralStability(
    inputs.C_l_beta || 0,
    inputs.C_n_beta || 0
  );
  
  // Calculate roll mode time constant (simplified)
  const roll_time_constant = inputs.C_l_p < 0 ? -1 / inputs.C_l_p : Infinity;
  
  // Overall rating (worst of longitudinal and lateral)
  const overall_level = Math.max(longitudinal.level, lateral.level) as 1 | 2 | 3;
  const overall_rating = overall_level === 1 
    ? 'Level 1: Good overall handling qualities'
    : overall_level === 2
    ? 'Level 2: Acceptable overall handling qualities'
    : 'Level 3: Unsatisfactory overall handling qualities - requires improvement';
  
  // Check criteria
  const criteria_met = {
    longitudinal_stability: inputs.C_m_alpha < 0,
    lateral_stability: (inputs.C_n_beta || 0) > 0,
    roll_response: inputs.C_l_p < -0.2,
    yaw_response: inputs.C_n_r < -0.1,
    spiral_stability: spiral_stability === 'stable',
  };
  
  // Warnings
  if (overall_level === 3) {
    warnings.push('Aircraft does not meet Level 1 or 2 handling qualities - design improvements recommended');
  }
  
  if (phugoid_damping < 0.04) {
    warnings.push('Low phugoid damping - may have poor long-period response');
  }
  
  if (dutch_roll_damping < 0.04) {
    warnings.push('Low Dutch roll damping - may have oscillatory lateral response');
  }
  
  if (spiral_stability === 'unstable') {
    warnings.push('Spiral instability - aircraft will tend to diverge in roll');
  }
  
  if (roll_time_constant > 1.0) {
    warnings.push('Slow roll response - may have poor roll handling');
  }
  
  return {
    longitudinal_level: longitudinal.level,
    longitudinal_rating: longitudinal.rating,
    phugoid_damping_ratio: phugoid_damping,
    lateral_level: lateral.level,
    lateral_rating: lateral.rating,
    dutch_roll_damping_ratio: dutch_roll_damping,
    roll_mode_time_constant: roll_time_constant,
    spiral_stability,
    overall_level,
    overall_rating,
    criteria_met,
    warnings,
  };
}

