/**
 * Payload builder for AI integration
 * 
 * Builds AeroverseAIPayload from rocket engine calculation results
 */

import { buildAeroversePayload } from '@/ai/buildPayload';
import { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { RocketEngineInputs, RocketEngineResults } from './calcEngine';
import { R_UNIVERSAL } from './constants';

/**
 * Build AI payload from rocket engine calculation
 */
export function buildRocketEnginePayload(
  inputs: RocketEngineInputs,
  results: RocketEngineResults,
  requestId?: string
): AeroverseAIPayload {
  const gasConstant =
    inputs.R ??
    (inputs.M_molar !== undefined && inputs.M_molar > 0
      ? R_UNIVERSAL / (inputs.M_molar / 1000)
      : undefined);

  // Format calculation steps
  const steps = [
    `Characteristic velocity: c* = √[(R·Tc)/γ] * ((γ+1)/2)^{(γ+1)/(2(γ-1))} * η_c* = ${results.cStar.toFixed(1)} m/s (ideal ${results.cStar_ideal.toFixed(1)} m/s)`,
    `Mass flow rate: ṁ = Pc * At / c* = ${results.mdot.toFixed(3)} kg/s`,
    `Area-Mach relation: A/A* = (1/M) * [ (2/(γ+1)) * (1 + (γ-1)/2 * M²) ]^{(γ+1)/(2(γ-1))}`,
    `Exit Mach number: Me = ${results.Me.toFixed(3)} (solved numerically)`,
    `Exit pressure ratio: Pe/Pc = (1 + (γ-1)/2 * Me²)^{-γ/(γ-1)} = ${results.Pe_Pc.toFixed(4)}`,
    `Exit static pressure: Pe = ${(results.Pe / 1e5).toFixed(2)} bar`,
    `Exit velocity: Ve = √[(2γ/(γ-1)) * R * Tc * (1 - (Pe/Pc)^{(γ-1)/γ})] * η_nozzle = ${results.Ve.toFixed(1)} m/s`,
    `Thrust: T = ṁ * Ve + (Pe - Pa) * Ae = ${(results.T / 1000).toFixed(1)} kN`,
    `Thrust coefficient: Cf = T / (Pc * At) = ${results.Cf.toFixed(3)}`,
    `Specific impulse: Isp = T / (ṁ * g₀) = ${results.Isp.toFixed(1)} s`,
  ];
  
  // Add diagnostics
  if (results.isOverExpanded) {
    steps.push('⚠️ Nozzle is overexpanded (Pe < Pa) - flow separation possible');
  }
  if (results.isUnderExpanded) {
    steps.push('⚠️ Nozzle is underexpanded (Pe >> Pa) - expansion continues outside');
  }
  
  // Format inputs for display
  const formattedInputs: Record<string, any> = {
    'Chamber pressure': `${(inputs.Pc / 1e5).toFixed(1)} bar`,
    'Chamber temperature': `${inputs.Tc.toFixed(0)} K`,
    'Throat area': `${(inputs.At * 1e4).toFixed(2)} cm²`,
    'Expansion ratio': `${results.epsilon.toFixed(1)}`,
    'Ambient pressure': `${(inputs.Pa / 1e5).toFixed(3)} bar`,
    'Gamma (γ)': inputs.gamma.toFixed(3),
    'Gas constant': gasConstant ? `${gasConstant.toFixed(1)} J/(kg·K)` : 'Not specified',
    'Nozzle efficiency': `${((inputs.nozzleEfficiency || 0.98) * 100).toFixed(1)}%`,
    'c* efficiency': `${((inputs.cStarEfficiency || 0.95) * 100).toFixed(1)}%`,
  };
  
  // Format results for display
  const formattedResults: Record<string, any> = {
    'Mass flow': `${results.mdot.toFixed(3)} kg/s`,
    'c*': `${results.cStar.toFixed(1)} m/s`,
    'Exit Mach': results.Me.toFixed(3),
    'Exit pressure': `${(results.Pe / 1e5).toFixed(2)} bar`,
    'Exit velocity': `${results.Ve.toFixed(1)} m/s`,
    'Thrust': `${(results.T / 1000).toFixed(1)} kN`,
    'Vacuum thrust': `${(results.T_vacuum / 1000).toFixed(1)} kN`,
    'Thrust coefficient': results.Cf.toFixed(3),
    'Isp': `${results.Isp.toFixed(1)} s`,
    'Vacuum Isp': `${results.Isp_vacuum.toFixed(1)} s`,
  };
  
  // Collect warnings
  const allWarnings = [...results.warnings];
  
  return buildAeroversePayload({
    requestId,
    toolName: 'Rocket Engine Performance',
    toolVersion: '1.0.0',
    inputs: formattedInputs,
    results: formattedResults,
    units: {
      'Chamber pressure': 'bar',
      'Chamber temperature': 'K',
      'Throat area': 'cm²',
      'Ambient pressure': 'bar',
      'Mass flow': 'kg/s',
      'c*': 'm/s',
      'Exit velocity': 'm/s',
      'Thrust': 'kN',
      'Isp': 's',
    },
    charts: [], // Charts will be added by the UI component
    configuration: {
      propellant: inputs.M_molar ? `M_molar=${inputs.M_molar} kg/kmol` : `R=${inputs.R} J/(kg·K)`,
      gamma: inputs.gamma,
      useCEA: inputs.useCEA || false,
      useFrozen: inputs.useFrozen || false,
    },
    metadata: {
      steps,
      unitsSystem: 'SI',
      approxLevel: inputs.useCEA ? 'CEA-equilibrium' : 'isentropic-ideal',
      confidence: allWarnings.length === 0 ? 'high' : allWarnings.length < 3 ? 'medium' : 'low',
      warnings: allWarnings,
    },
  });
}

