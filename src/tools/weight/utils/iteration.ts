/**
 * Mission fuel calculation and takeoff weight iteration
 * Based on Raymer weight fraction method
 */

export interface MissionPhase {
  name: string;
  weightFraction: number; // Typical weight fraction for this phase
}

export interface MissionProfile {
  phases: MissionPhase[];
  alternate?: boolean; // Include alternate airport fuel
  reserve?: number; // Reserve fuel fraction (e.g., 0.05 for 5%)
}

/**
 * Standard mission weight fractions (Raymer)
 */
export const STANDARD_MISSION_FRACTIONS: Record<string, number> = {
  warmup: 0.990, // 1% fuel used
  takeoff: 0.995, // 0.5% fuel used
  climb: 0.980, // 2% fuel used (typical)
  cruise: 0.950, // 5% fuel used (varies with range)
  loiter: 0.985, // 1.5% fuel used per hour
  descent: 0.990, // 1% fuel used
  landing: 0.995, // 0.5% fuel used
  alternate: 0.990, // 1% fuel used
};

/**
 * Calculate mission fuel weight fraction
 * W_fuel / W_to = 1 - Π(W_f)
 */
export function calculateMissionFuelFraction(profile: MissionProfile): number {
  let product = 1.0;
  
  for (const phase of profile.phases) {
    product *= phase.weightFraction;
  }
  
  // Add alternate if specified
  if (profile.alternate) {
    product *= STANDARD_MISSION_FRACTIONS.alternate;
  }
  
  // Add reserve
  if (profile.reserve) {
    product *= (1 - profile.reserve);
  }
  
  return 1 - product;
}

/**
 * Calculate fuel weight from takeoff weight
 */
export function calculateFuelWeight(W_to: number, fuelFraction: number): number {
  return W_to * fuelFraction;
}

/**
 * Fixed-point iteration to determine takeoff weight
 * W_to = (W_empty + W_payload) / (1 - W_fuel/W_to)
 * 
 * Convergence criteria: ΔW < 0.01%
 */
export interface IterationResult {
  W_to: number; // Final takeoff weight (N)
  W_empty: number; // Final empty weight (N)
  W_fuel: number; // Final fuel weight (N)
  iterations: number;
  converged: boolean;
  history: Array<{
    iteration: number;
    W_to: number;
    W_empty: number;
    W_fuel: number;
    error: number;
  }>;
}

export function iterateTakeoffWeight(
  calculateEmptyWeight: (W_to: number) => number,
  W_payload: number,
  fuelFraction: number,
  initialGuess?: number,
  maxIterations: number = 100,
  tolerance: number = 0.0001 // 0.01%
): IterationResult {
  // Initial guess: assume 30% fuel fraction if not provided
  let W_to = initialGuess || (W_payload * 1.5);
  
  const history: IterationResult['history'] = [];
  let converged = false;
  let iterations = 0;
  
  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;
    
    // Calculate empty weight based on current W_to estimate
    const W_empty = calculateEmptyWeight(W_to);
    
    // Calculate fuel weight
    const W_fuel = calculateFuelWeight(W_to, fuelFraction);
    
    // Calculate new W_to
    const W_to_new = (W_empty + W_payload) / (1 - fuelFraction);
    
    // Calculate error
    const error = Math.abs((W_to_new - W_to) / W_to);
    
    // Record history
    history.push({
      iteration: iterations,
      W_to: W_to_new,
      W_empty,
      W_fuel,
      error,
    });
    
    // Check convergence
    if (error < tolerance) {
      converged = true;
      W_to = W_to_new;
      break;
    }
    
    // Update for next iteration
    W_to = W_to_new;
  }
  
  // Final calculations
  const W_empty_final = calculateEmptyWeight(W_to);
  const W_fuel_final = calculateFuelWeight(W_to, fuelFraction);
  
  return {
    W_to,
    W_empty: W_empty_final,
    W_fuel: W_fuel_final,
    iterations,
    converged,
    history,
  };
}

/**
 * Create standard mission profile
 */
export function createStandardMissionProfile(options: {
  range?: number; // Cruise range (km)
  cruiseTime?: number; // Cruise time (hours)
  loiterTime?: number; // Loiter time (hours)
  includeAlternate?: boolean;
  reserve?: number;
}): MissionProfile {
  const {
    range = 1000, // km
    cruiseTime,
    loiterTime = 0,
    includeAlternate = true,
    reserve = 0.05, // 5% reserve
  } = options;
  
  // Estimate cruise time if not provided
  // Assume typical cruise speed of 200 km/h
  const estimatedCruiseTime = cruiseTime || (range / 200);
  
  // Cruise fuel fraction depends on range/time
  // Simplified: 5% per hour of cruise
  const cruiseFraction = Math.max(0.85, 1 - (estimatedCruiseTime * 0.05));
  
  const phases: MissionPhase[] = [
    { name: 'Warm-up', weightFraction: STANDARD_MISSION_FRACTIONS.warmup },
    { name: 'Takeoff', weightFraction: STANDARD_MISSION_FRACTIONS.takeoff },
    { name: 'Climb', weightFraction: STANDARD_MISSION_FRACTIONS.climb },
    { name: 'Cruise', weightFraction: cruiseFraction },
  ];
  
  if (loiterTime > 0) {
    // Loiter: 1.5% per hour
    const loiterFraction = 1 - (loiterTime * 0.015);
    phases.push({ name: 'Loiter', weightFraction: Math.max(0.85, loiterFraction) });
  }
  
  phases.push(
    { name: 'Descent', weightFraction: STANDARD_MISSION_FRACTIONS.descent },
    { name: 'Landing', weightFraction: STANDARD_MISSION_FRACTIONS.landing }
  );
  
  return {
    phases,
    alternate: includeAlternate,
    reserve,
  };
}
