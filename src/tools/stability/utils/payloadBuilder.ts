/**
 * Payload builder for AI integration
 * 
 * Builds AeroverseAIPayload from stability calculation results
 */

import { buildAeroversePayload } from '@/ai/buildPayload';
import { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { StabilityInputs } from './calcStability';
import { StabilityResults } from './calcStability';

/**
 * Build AI payload from stability calculation
 */
export function buildStabilityPayload(
  inputs: StabilityInputs,
  results: StabilityResults,
  requestId?: string
): AeroverseAIPayload {
  // Format calculation steps
  const steps = [
    `Wing lift curve slope: a_w = a₀/(1 + a₀/(πeAR)) = ${results.a_w.toFixed(3)} rad⁻¹`,
    `Tail lift curve slope: a_t = η·a₀/(1 + a₀/(πe_tAR_t)) = ${results.a_t.toFixed(3)} rad⁻¹`,
    `Downwash gradient: ε_α = ${results.epsilon_alpha.toFixed(4)} (${inputs.useRoskamDownwash ? 'Roskam' : 'DATCOM'} model)`,
    `Tail volume coefficient: V_H = (S_t·l_t)/(S_w·c̄) = ${results.V_H.toFixed(3)}`,
    `Wing pitching moment: C_mα,w = a_w·(x_cg - x_ac,w)/c̄ = ${results.C_m_alpha_w.toFixed(4)} rad⁻¹`,
    `Tail pitching moment: C_mα,t = -a_t·(1-ε_α)·(S_t/S_w)·(l_t/c̄) = ${results.C_m_alpha_t.toFixed(4)} rad⁻¹`,
    `Total pitching moment: C_mα = ${results.C_m_alpha.toFixed(4)} rad⁻¹`,
    `Neutral point: x_np = ${(results.x_np * 100).toFixed(1)}% MAC`,
    `Static margin: SM = (x_np - x_cg)/c̄ = ${results.SM.toFixed(3)}`,
  ];

  if (results.C_m_delta_e !== undefined) {
    steps.push(`Elevator effectiveness: C_mδe = ${results.C_m_delta_e.toFixed(4)} rad⁻¹`);
  }

  // Build warnings
  const warnings: string[] = [];
  if (results.SM < 0) {
    warnings.push('Aircraft is statically unstable (SM < 0)');
  } else if (results.SM < 0.05) {
    warnings.push('Marginal static stability (SM < 0.05)');
  }
  if (results.V_H < 0.5 || results.V_H > 1.2) {
    warnings.push(`Tail volume coefficient outside typical range: ${results.V_H.toFixed(3)}`);
  }
  warnings.push(...results.warnings);

  // Format inputs for display
  const formattedInputs: Record<string, any> = {
    'Wing Area': `${inputs.S_w.toFixed(2)} m²`,
    'Aspect Ratio': inputs.AR.toFixed(2),
    'MAC': `${inputs.c_bar.toFixed(3)} m`,
    'CG Position': `${(inputs.x_cg * 100).toFixed(1)}% MAC`,
    'Wing AC': `${(inputs.x_ac_w * 100).toFixed(1)}% MAC`,
    'Tail Area': `${inputs.S_t.toFixed(2)} m²`,
    'Tail Arm': `${inputs.l_t.toFixed(2)} m`,
    'Downwash Model': inputs.useRoskamDownwash ? 'Roskam' : 'DATCOM',
  };

  // Format results for display
  const formattedResults: Record<string, any> = {
    'a_w': `${results.a_w.toFixed(3)} rad⁻¹`,
    'a_t': `${results.a_t.toFixed(3)} rad⁻¹`,
    'ε_α': results.epsilon_alpha.toFixed(4),
    'V_H': results.V_H.toFixed(3),
    'C_mα': `${results.C_m_alpha.toFixed(4)} rad⁻¹`,
    'x_np': `${(results.x_np * 100).toFixed(1)}% MAC`,
    'Static Margin': results.SM.toFixed(3),
  };

  if (results.C_m_delta_e !== undefined) {
    formattedResults['C_mδe'] = `${results.C_m_delta_e.toFixed(4)} rad⁻¹`;
  }
  if (results.C_l_delta_a !== undefined) {
    formattedResults['C_lδa'] = `${results.C_l_delta_a.toFixed(4)} rad⁻¹`;
  }
  if (results.C_n_delta_r !== undefined) {
    formattedResults['C_nδr'] = `${results.C_n_delta_r.toFixed(4)} rad⁻¹`;
  }

  // Build payload
  const payload = buildAeroversePayload({
    requestId,
    toolName: 'Stability & Control Derivatives',
    toolVersion: '1.0.0',
    inputs: formattedInputs,
    results: formattedResults,
    units: {
      'Wing Area': 'm²',
      'MAC': 'm',
      'Tail Area': 'm²',
      'Tail Arm': 'm',
      'a_w': 'rad⁻¹',
      'a_t': 'rad⁻¹',
      'C_mα': 'rad⁻¹',
    },
    charts: [], // Charts will be added by the UI component
    configuration: {
      downwashModel: inputs.useRoskamDownwash ? 'Roskam' : 'DATCOM',
    },
    metadata: {
      steps,
      unitsSystem: 'SI',
      approxLevel: 'analytic',
      confidence: warnings.length === 0 ? 'high' : 'medium',
      warnings,
    },
  });

  return payload;
}
