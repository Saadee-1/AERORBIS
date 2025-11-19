/**
 * Isentropic flow relations for rocket nozzle calculations
 * 
 * Implements standard isentropic flow formulas from compressible flow theory
 */

/**
 * Area-Mach relation for isentropic flow
 * 
 * A/A* = (1/M) * [ (2/(γ+1)) * (1 + (γ-1)/2 * M²) ]^{(γ+1)/(2(γ-1))}
 * 
 * @param M - Mach number
 * @param gamma - Ratio of specific heats
 * @returns Area ratio A/A* (where A* is throat area)
 */
export function areaMachRelation(M: number, gamma: number): number {
  if (M <= 0) {
    throw new Error('Mach number must be positive');
  }
  if (gamma <= 1) {
    throw new Error('Gamma must be > 1');
  }
  
  const term1 = 1 / M;
  const term2 = (2 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M * M);
  const exponent = (gamma + 1) / (2 * (gamma - 1));
  
  return term1 * Math.pow(term2, exponent);
}

/**
 * Pressure ratio from Mach number (isentropic)
 * 
 * P/P0 = (1 + (γ-1)/2 * M²)^{-γ/(γ-1)}
 * 
 * @param M - Mach number
 * @param gamma - Ratio of specific heats
 * @returns Pressure ratio P/P0
 */
export function pressureRatioFromMach(M: number, gamma: number): number {
  if (M < 0) {
    throw new Error('Mach number must be non-negative');
  }
  if (gamma <= 1) {
    throw new Error('Gamma must be > 1');
  }
  
  const term = 1 + (gamma - 1) / 2 * M * M;
  const exponent = -gamma / (gamma - 1);
  
  return Math.pow(term, exponent);
}

/**
 * Temperature ratio from Mach number (isentropic)
 * 
 * T/T0 = (1 + (γ-1)/2 * M²)^{-1}
 * 
 * @param M - Mach number
 * @param gamma - Ratio of specific heats
 * @returns Temperature ratio T/T0
 */
export function temperatureRatioFromMach(M: number, gamma: number): number {
  if (M < 0) {
    throw new Error('Mach number must be non-negative');
  }
  if (gamma <= 1) {
    throw new Error('Gamma must be > 1');
  }
  
  const term = 1 + (gamma - 1) / 2 * M * M;
  return 1 / term;
}

/**
 * Density ratio from Mach number (isentropic)
 * 
 * ρ/ρ0 = (1 + (γ-1)/2 * M²)^{-1/(γ-1)}
 * 
 * @param M - Mach number
 * @param gamma - Ratio of specific heats
 * @returns Density ratio ρ/ρ0
 */
export function densityRatioFromMach(M: number, gamma: number): number {
  if (M < 0) {
    throw new Error('Mach number must be non-negative');
  }
  if (gamma <= 1) {
    throw new Error('Gamma must be > 1');
  }
  
  const term = 1 + (gamma - 1) / 2 * M * M;
  const exponent = -1 / (gamma - 1);
  
  return Math.pow(term, exponent);
}

/**
 * Exit velocity from isentropic expansion
 * 
 * Ve = sqrt( (2γ/(γ-1)) * R * T0 * (1 - (Pe/P0)^((γ-1)/γ)) )
 * 
 * @param P0 - Stagnation pressure (chamber pressure)
 * @param Pe - Exit static pressure
 * @param T0 - Stagnation temperature (chamber temperature)
 * @param gamma - Ratio of specific heats
 * @param R - Specific gas constant (J/(kg·K))
 * @returns Exit velocity (m/s)
 */
export function exitVelocityIsentropic(
  P0: number,
  Pe: number,
  T0: number,
  gamma: number,
  R: number
): number {
  if (P0 <= 0 || Pe <= 0 || T0 <= 0) {
    throw new Error('Pressures and temperature must be positive');
  }
  if (gamma <= 1) {
    throw new Error('Gamma must be > 1');
  }
  if (R <= 0) {
    throw new Error('Gas constant must be positive');
  }
  
  if (Pe >= P0) {
    // Not expanded, return 0 or small value
    return 0;
  }
  
  const pressureRatio = Pe / P0;
  const exponent = (gamma - 1) / gamma;
  const term = 1 - Math.pow(pressureRatio, exponent);
  
  if (term <= 0) {
    return 0;
  }
  
  const coefficient = (2 * gamma) / (gamma - 1);
  return Math.sqrt(coefficient * R * T0 * term);
}

/**
 * Choked mass flux constant
 * 
 * G0 = (P0 / sqrt(T0)) * sqrt(γ/R) * [((γ+1)/2)^{-(γ+1)/(2(γ-1))}]
 * 
 * @param gamma - Ratio of specific heats
 * @param R - Specific gas constant (J/(kg·K))
 * @returns Mass flux constant (kg/(s·m²·Pa/K^0.5))
 */
export function chokedMassFluxConstant(gamma: number, R: number): number {
  if (gamma <= 1) {
    throw new Error('Gamma must be > 1');
  }
  if (R <= 0) {
    throw new Error('Gas constant must be positive');
  }
  
  const term1 = Math.sqrt(gamma / R);
  const term2 = Math.pow((gamma + 1) / 2, -(gamma + 1) / (2 * (gamma - 1)));
  
  return term1 * term2;
}

