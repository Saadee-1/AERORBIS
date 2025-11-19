/**
 * Core rocket engine performance calculations
 * 
 * Implements isentropic flow theory with practical corrections
 * Based on Sutton & Biblarz, Anderson, and standard compressible flow relations
 */

import {
  areaMachRelation,
  pressureRatioFromMach,
  exitVelocityIsentropic,
  chokedMassFluxConstant,
} from './isentropic';
import { solveForMe, SolverResult } from './numeric';
import { G0, R_UNIVERSAL } from './constants';

/**
 * Input parameters for rocket engine calculation
 */
export interface RocketEngineInputs {
  // Chamber conditions
  Pc: number; // Chamber pressure (Pa)
  Tc: number; // Chamber temperature (K)
  
  // Nozzle geometry
  At: number; // Throat area (m²)
  epsilon?: number; // Expansion ratio Ae/At (if provided, used instead of Ae)
  Ae?: number; // Exit area (m²) - alternative to epsilon
  
  // Ambient conditions
  Pa: number; // Ambient pressure (Pa)
  
  // Gas properties
  gamma: number; // Ratio of specific heats
  M_molar?: number; // Molar mass (kg/kmol) - if provided, R is calculated
  R?: number; // Specific gas constant (J/(kg·K)) - alternative to M_molar
  
  // Efficiency factors
  nozzleEfficiency?: number; // Nozzle efficiency (0-1, default 0.98)
  cStarEfficiency?: number; // Characteristic velocity efficiency (0-1, default 0.95)
  pressureLossFraction?: number; // Pressure loss fraction (0-1, default 0.02)
  
  // Advanced options (placeholders)
  useCEA?: boolean; // Use CEA for real gas properties (placeholder)
  useFrozen?: boolean; // Frozen vs equilibrium flow (placeholder)
}

/**
 * Calculated rocket engine performance results
 */
export interface RocketEngineResults {
  // Mass flow and characteristic velocity
  mdot: number; // Mass flow rate (kg/s)
  mdot_ideal: number; // Ideal mass flow rate (kg/s)
  cStar: number; // Characteristic velocity (m/s)
  cStar_ideal: number; // Ideal characteristic velocity (m/s)
  
  // Nozzle exit conditions
  Me: number; // Exit Mach number
  Pe: number; // Exit static pressure (Pa)
  Pe_Pc: number; // Exit pressure ratio
  Ae: number; // Exit area (m²)
  epsilon: number; // Expansion ratio
  
  // Performance metrics
  Ve: number; // Exit velocity (m/s)
  Ve_ideal: number; // Ideal exit velocity (m/s)
  T: number; // Thrust (N)
  T_vacuum: number; // Vacuum thrust (N)
  Cf: number; // Thrust coefficient
  Cf_ideal: number; // Ideal thrust coefficient
  Isp: number; // Specific impulse (s)
  Isp_vacuum: number; // Vacuum specific impulse (s)
  
  // Diagnostics
  isChoked: boolean; // Flow is choked
  isOverExpanded: boolean; // Pe < Pa (overexpanded)
  isUnderExpanded: boolean; // Pe >> Pa (underexpanded)
  warnings: string[];
  
  // Solver diagnostics
  solverResult: SolverResult;
}

/**
 * Calculate rocket engine performance
 * 
 * @param inputs - Engine input parameters
 * @returns Complete performance results
 */
export function calculateRocketEngine(inputs: RocketEngineInputs): RocketEngineResults {
  // Validate inputs
  if (inputs.Pc <= 0) {
    throw new Error('Chamber pressure must be positive');
  }
  if (inputs.Tc <= 0) {
    throw new Error('Chamber temperature must be positive');
  }
  if (inputs.At <= 0) {
    throw new Error('Throat area must be positive');
  }
  if (inputs.gamma <= 1) {
    throw new Error('Gamma must be > 1');
  }
  
  // Calculate or get gas constant
  let R: number;
  if (inputs.R !== undefined) {
    R = inputs.R;
  } else if (inputs.M_molar !== undefined) {
    R = R_UNIVERSAL / inputs.M_molar;
  } else {
    throw new Error('Either R or M_molar must be provided');
  }
  
  // Get efficiency factors with defaults
  const nozzleEfficiency = inputs.nozzleEfficiency ?? 0.98;
  const cStarEfficiency = inputs.cStarEfficiency ?? 0.95;
  const pressureLossFraction = inputs.pressureLossFraction ?? 0.02;
  
  // Apply pressure loss if specified
  const Pc_effective = inputs.Pc * (1 - pressureLossFraction);
  
  // Calculate expansion ratio
  let epsilon: number;
  let Ae: number;
  if (inputs.epsilon !== undefined) {
    epsilon = inputs.epsilon;
    Ae = epsilon * inputs.At;
  } else if (inputs.Ae !== undefined) {
    Ae = inputs.Ae;
    epsilon = Ae / inputs.At;
  } else {
    throw new Error('Either epsilon or Ae must be provided');
  }
  
  if (epsilon <= 1) {
    throw new Error('Expansion ratio must be > 1');
  }
  
  // Calculate choked mass flux constant
  const G0 = chokedMassFluxConstant(inputs.gamma, R);
  
  // Ideal mass flow rate
  const mdot_ideal = (Pc_effective / Math.sqrt(inputs.Tc)) * G0 * inputs.At;
  
  // Actual mass flow with efficiency
  const mdot = mdot_ideal * cStarEfficiency;
  
  // Characteristic velocity
  const cStar_ideal = (Pc_effective * inputs.At) / mdot_ideal;
  const cStar = (Pc_effective * inputs.At) / mdot;
  
  // Solve for exit Mach number
  const solverResult = solveForMe(epsilon, inputs.gamma);
  
  if (!solverResult.success) {
    throw new Error(`Failed to solve for exit Mach number: ${solverResult.error || 'Unknown error'}`);
  }
  
  const Me = solverResult.value;
  
  // Calculate exit pressure ratio and static pressure
  const Pe_Pc = pressureRatioFromMach(Me, inputs.gamma);
  const Pe = Pc_effective * Pe_Pc;
  
  // Calculate ideal exit velocity
  const Ve_ideal = exitVelocityIsentropic(
    Pc_effective,
    Pe,
    inputs.Tc,
    inputs.gamma,
    R
  );
  
  // Apply nozzle efficiency
  const Ve = Ve_ideal * nozzleEfficiency;
  
  // Calculate thrust
  const T = mdot * Ve + (Pe - inputs.Pa) * Ae;
  const T_vacuum = mdot * Ve + Pe * Ae; // Pa = 0
  
  // Thrust coefficient
  const Cf = T / (Pc_effective * inputs.At);
  const Cf_ideal = (mdot_ideal * Ve_ideal) / (Pc_effective * inputs.At) + 
                   (Pe_Pc - inputs.Pa / Pc_effective) * epsilon;
  
  // Specific impulse
  const Isp = Ve / G0;
  const Isp_vacuum = (Ve + Pe * Ae / mdot) / G0;
  
  // Diagnostics
  const isChoked = true; // Always choked at throat for supersonic nozzle
  const isOverExpanded = Pe < inputs.Pa && Me > 1;
  const isUnderExpanded = Pe > 1.5 * inputs.Pa; // Threshold for significant underexpansion
  
  const warnings: string[] = [];
  
  if (isOverExpanded) {
    warnings.push('Nozzle is overexpanded (Pe < Pa). Flow separation or shock waves may occur.');
  }
  
  if (isUnderExpanded) {
    warnings.push('Nozzle is underexpanded (Pe >> Pa). Supersonic expansion continues outside nozzle.');
  }
  
  if (Me < 1.1) {
    warnings.push('Exit Mach number is very close to 1. Verify expansion ratio.');
  }
  
  if (solverResult.iterations > 50) {
    warnings.push(`Solver required ${solverResult.iterations} iterations. Verify convergence.`);
  }
  
  if (Math.abs(solverResult.residual) > 1e-6) {
    warnings.push(`Solver residual is large: ${solverResult.residual.toExponential(2)}`);
  }
  
  return {
    mdot,
    mdot_ideal,
    cStar,
    cStar_ideal,
    Me,
    Pe,
    Pe_Pc,
    Ae,
    epsilon,
    Ve,
    Ve_ideal,
    T,
    T_vacuum,
    Cf,
    Cf_ideal,
    Isp,
    Isp_vacuum,
    isChoked,
    isOverExpanded,
    isUnderExpanded,
    warnings,
    solverResult,
  };
}

/**
 * Sweep ambient pressure for altitude performance analysis
 * 
 * @param inputs - Base engine inputs (Pa will be overridden)
 * @param Pa_min - Minimum ambient pressure (Pa)
 * @param Pa_max - Maximum ambient pressure (Pa)
 * @param steps - Number of steps
 * @returns Array of results for each ambient pressure
 */
export function sweepAmbientPressure(
  inputs: RocketEngineInputs,
  Pa_min: number,
  Pa_max: number,
  steps: number
): Array<{ Pa: number; T: number; Isp: number; mdot: number; Pe: number }> {
  const results: Array<{ Pa: number; T: number; Isp: number; mdot: number; Pe: number }> = [];
  
  const stepSize = (Pa_max - Pa_min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const Pa = Pa_min + i * stepSize;
    
    try {
      const result = calculateRocketEngine({ ...inputs, Pa });
      results.push({
        Pa,
        T: result.T,
        Isp: result.Isp,
        mdot: result.mdot,
        Pe: result.Pe,
      });
    } catch (error) {
      // Skip invalid points
      console.warn(`Skipping Pa=${Pa}:`, error);
    }
  }
  
  return results;
}

/**
 * Sweep expansion ratio for performance analysis
 * 
 * @param inputs - Base engine inputs (epsilon will be overridden)
 * @param epsilon_min - Minimum expansion ratio
 * @param epsilon_max - Maximum expansion ratio
 * @param steps - Number of steps
 * @returns Array of results for each expansion ratio
 */
export function sweepExpansionRatio(
  inputs: RocketEngineInputs,
  epsilon_min: number,
  epsilon_max: number,
  steps: number
): Array<{ epsilon: number; Isp: number; T: number; Cf: number; Me: number }> {
  const results: Array<{ epsilon: number; Isp: number; T: number; Cf: number; Me: number }> = [];
  
  const stepSize = (epsilon_max - epsilon_min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const epsilon = epsilon_min + i * stepSize;
    
    try {
      const result = calculateRocketEngine({ ...inputs, epsilon });
      results.push({
        epsilon,
        Isp: result.Isp,
        T: result.T,
        Cf: result.Cf,
        Me: result.Me,
      });
    } catch (error) {
      // Skip invalid points
      console.warn(`Skipping epsilon=${epsilon}:`, error);
    }
  }
  
  return results;
}

/**
 * Sweep chamber pressure for performance analysis
 * 
 * @param inputs - Base engine inputs (Pc will be overridden)
 * @param Pc_min - Minimum chamber pressure (Pa)
 * @param Pc_max - Maximum chamber pressure (Pa)
 * @param steps - Number of steps
 * @returns Array of results for each chamber pressure
 */
export function sweepChamberPressure(
  inputs: RocketEngineInputs,
  Pc_min: number,
  Pc_max: number,
  steps: number
): Array<{ Pc: number; mdot: number; T: number; Isp: number; cStar: number }> {
  const results: Array<{ Pc: number; mdot: number; T: number; Isp: number; cStar: number }> = [];
  
  const stepSize = (Pc_max - Pc_min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const Pc = Pc_min + i * stepSize;
    
    try {
      const result = calculateRocketEngine({ ...inputs, Pc });
      results.push({
        Pc,
        mdot: result.mdot,
        T: result.T,
        Isp: result.Isp,
        cStar: result.cStar,
      });
    } catch (error) {
      // Skip invalid points
      console.warn(`Skipping Pc=${Pc}:`, error);
    }
  }
  
  return results;
}

