/**
 * Payload builder for AI integration
 * 
 * Builds AeroverseAIPayload from stability calculation results
 */

import { buildAeroversePayload } from '@/ai/buildPayload';
import { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { StabilityInputs, StabilityResults } from './calcStability';
import { DynamicDerivatives } from './calcDynamicDerivatives';
import { ControlDerivatives } from './calcControlDerivatives';
import { HingeMoments } from './calcHingeMoments';
import { ControlMixing } from './controlMixing';
import { HighLiftEffects } from './highLiftEffects';
import { RollRateResult } from './rollRateEstimator';
import { StabilityCriteria } from './criteria';
import { NonlinearControl } from './nonlinearControl';

export interface ExtendedStabilityResults {
  stability: StabilityResults;
  dynamic?: DynamicDerivatives;
  control?: ControlDerivatives;
  hingeMoments?: HingeMoments;
  mixing?: ControlMixing;
  highLift?: HighLiftEffects;
  rollRate?: RollRateResult;
  criteria?: StabilityCriteria;
  nonlinear?: NonlinearControl;
}

/**
 * Build AI payload from stability calculation
 */
export function buildStabilityPayload(
  inputs: StabilityInputs,
  results: ExtendedStabilityResults,
  requestId?: string
): AeroverseAIPayload {
  const stability = results.stability;
  
  // Format calculation steps
  const steps = [
    `Wing lift curve slope: a_w = a_0 / (1 + a_0/(πeAR)) = ${stability.a_w.toFixed(3)} /rad`,
    `Tail lift curve slope: a_t = ηa_0 / (1 + a_0/(πe_t AR_t)) = ${stability.a_t.toFixed(3)} /rad`,
    `Downwash gradient: ε_α = ${stability.epsilon_alpha.toFixed(4)} (${inputs.useRoskamDownwash ? 'Roskam' : 'DATCOM'} formula)`,
    `Wing pitching moment: C_mα_w = a_w(x_cg - x_ac)/c̄ = ${stability.C_m_alpha_w.toFixed(4)}`,
    `Tail pitching moment: C_mα_t = -a_t(1-ε_α)(S_t/S_w)(l_t/c̄) = ${stability.C_m_alpha_t.toFixed(4)}`,
    `Total C_mα = ${stability.C_m_alpha.toFixed(4)} ${stability.isStable ? '(stable)' : '(unstable)'}`,
    `Neutral point: x_np = ${(stability.x_np * 100).toFixed(1)}% MAC`,
    `Static margin: SM = ${(stability.SM * 100).toFixed(1)}% MAC`,
    `Tail volume: V_H = (S_t l_t)/(S_w c̄) = ${stability.V_H.toFixed(3)}`,
  ];

  // Add dynamic derivatives steps
  if (results.dynamic) {
    steps.push(
      `Pitch damping: C_mq = ${results.dynamic.C_m_q.toFixed(4)}`,
      `Roll damping: C_lp = ${results.dynamic.C_l_p.toFixed(4)}`,
      `Yaw damping: C_nr = ${results.dynamic.C_n_r.toFixed(4)}`
    );
  }

  // Add control derivatives steps
  if (results.control) {
    steps.push(
      `Elevator effectiveness: C_mδe = ${results.control.C_m_delta_e.toFixed(4)} (τ_e = ${results.control.tau_e.toFixed(3)})`,
      `Aileron effectiveness: C_lδa = ${results.control.C_l_delta_a.toFixed(4)} (τ_a = ${results.control.tau_a.toFixed(3)})`,
      `Rudder effectiveness: C_nδr = ${results.control.C_n_delta_r.toFixed(4)} (τ_r = ${results.control.tau_r.toFixed(3)})`
    );
  }

  // Add high-lift effects
  if (results.highLift) {
    steps.push(
      `High-lift ΔCL: ${results.highLift.delta_C_L.toFixed(3)}`,
      `High-lift ΔCm: ${results.highLift.delta_C_m.toFixed(4)}`
    );
  }

  // Add stability criteria
  if (results.criteria) {
    steps.push(
      `Overall handling qualities: ${results.criteria.overall_rating}`,
      `Phugoid damping: ${results.criteria.phugoid_damping_ratio?.toFixed(3) || 'N/A'}`,
      `Dutch roll damping: ${results.criteria.dutch_roll_damping_ratio?.toFixed(3) || 'N/A'}`
    );
  }

  // Format inputs for display
  // TODO: refine type for `formattedInputs` — changed any -> unknown automatically by chore/typed-cleanup
  const formattedInputs: Record<string, unknown> = {
    'Wing area': `${inputs.S_w.toFixed(2)} m²`,
    'Wing AR': inputs.AR.toFixed(2),
    'MAC': `${inputs.c_bar.toFixed(3)} m`,
    'Tail area': `${inputs.S_t.toFixed(2)} m²`,
    'Tail AR': inputs.AR_t.toFixed(2),
    'Tail arm': `${inputs.l_t.toFixed(2)} m`,
    'CG position': `${(inputs.x_cg * 100).toFixed(1)}% MAC`,
    'Wing AC': `${(inputs.x_ac_w * 100).toFixed(1)}% MAC`,
    'Downwash model': inputs.useRoskamDownwash ? 'Roskam' : 'DATCOM',
  };

  // Format results for display
  // TODO: refine type for `formattedResults` — changed any -> unknown automatically by chore/typed-cleanup
  const formattedResults: Record<string, unknown> = {
    'a_w': `${stability.a_w.toFixed(3)} /rad`,
    'a_t': `${stability.a_t.toFixed(3)} /rad`,
    'ε_α': stability.epsilon_alpha.toFixed(4),
    'C_mα': stability.C_m_alpha.toFixed(4),
    'x_np': `${(stability.x_np * 100).toFixed(1)}% MAC`,
    'SM': `${(stability.SM * 100).toFixed(1)}% MAC`,
    'V_H': stability.V_H.toFixed(3),
  };

  // Add control derivatives
  if (stability.C_m_delta_e !== undefined) {
    formattedResults['C_mδe'] = stability.C_m_delta_e.toFixed(4);
  }
  if (stability.C_l_delta_a !== undefined) {
    formattedResults['C_lδa'] = stability.C_l_delta_a.toFixed(4);
  }
  if (stability.C_n_delta_r !== undefined) {
    formattedResults['C_nδr'] = stability.C_n_delta_r.toFixed(4);
  }

  // Add dynamic derivatives
  if (results.dynamic) {
    formattedResults['C_mq'] = results.dynamic.C_m_q.toFixed(4);
    formattedResults['C_lp'] = results.dynamic.C_l_p.toFixed(4);
    formattedResults['C_nr'] = results.dynamic.C_n_r.toFixed(4);
    formattedResults['C_lr'] = results.dynamic.C_l_r.toFixed(4);
    formattedResults['C_np'] = results.dynamic.C_n_p.toFixed(4);
  }

  // Add control derivatives (enhanced)
  if (results.control) {
    formattedResults['C_mδe_enhanced'] = results.control.C_m_delta_e.toFixed(4);
    formattedResults['C_lδa_enhanced'] = results.control.C_l_delta_a.toFixed(4);
    formattedResults['C_nδr_enhanced'] = results.control.C_n_delta_r.toFixed(4);
  }

  // Add hinge moments
  if (results.hingeMoments) {
    formattedResults['C_hα'] = results.hingeMoments.C_h_alpha.toFixed(4);
    formattedResults['C_hδ'] = results.hingeMoments.C_h_delta.toFixed(4);
    if (results.hingeMoments.T_max !== undefined) {
      formattedResults['T_max'] = `${results.hingeMoments.T_max.toFixed(2)} N·m`;
    }
  }

  // Add high-lift effects
  if (results.highLift) {
    formattedResults['ΔCL'] = results.highLift.delta_C_L.toFixed(3);
    formattedResults['ΔCm'] = results.highLift.delta_C_m.toFixed(4);
    formattedResults['ΔCD'] = results.highLift.delta_C_D.toFixed(4);
  }

  // Add roll rate
  if (results.rollRate) {
    formattedResults['Roll rate'] = `${results.rollRate.p_deg.toFixed(1)} deg/s`;
    formattedResults['Roll time constant'] = `${results.rollRate.roll_time_constant.toFixed(2)} s`;
  }

  // Add stability criteria
  if (results.criteria) {
    formattedResults['Overall level'] = `Level ${results.criteria.overall_level}`;
    formattedResults['Longitudinal level'] = `Level ${results.criteria.longitudinal_level}`;
    formattedResults['Lateral level'] = `Level ${results.criteria.lateral_level}`;
    if (results.criteria.phugoid_damping_ratio !== undefined) {
      formattedResults['Phugoid damping'] = results.criteria.phugoid_damping_ratio.toFixed(3);
    }
    if (results.criteria.dutch_roll_damping_ratio !== undefined) {
      formattedResults['Dutch roll damping'] = results.criteria.dutch_roll_damping_ratio.toFixed(3);
    }
  }

  // Collect all warnings
  const allWarnings = [...stability.warnings];
  if (results.control?.warnings) {
    allWarnings.push(...results.control.warnings);
  }
  if (results.hingeMoments?.warnings) {
    allWarnings.push(...results.hingeMoments.warnings);
  }
  if (results.mixing?.warnings) {
    allWarnings.push(...results.mixing.warnings);
  }
  if (results.highLift?.warnings) {
    allWarnings.push(...results.highLift.warnings);
  }
  if (results.rollRate?.warnings) {
    allWarnings.push(...results.rollRate.warnings);
  }
  if (results.criteria?.warnings) {
    allWarnings.push(...results.criteria.warnings);
  }
  if (results.nonlinear?.warnings) {
    allWarnings.push(...results.nonlinear.warnings);
  }

  // Build payload
  const payload = buildAeroversePayload({
    requestId,
    toolName: 'Stability & Control Advanced',
    toolVersion: '2.0.0',
    inputs: formattedInputs,
    results: formattedResults,
    units: {
      'Wing area': 'm²',
      'Tail area': 'm²',
      'MAC': 'm',
      'Tail arm': 'm',
    },
    charts: [], // Charts will be added by the UI component
    configuration: {
      downwashModel: inputs.useRoskamDownwash ? 'Roskam' : 'DATCOM',
      dynamicDerivatives: results.dynamic !== undefined,
      controlGeometry: results.control !== undefined,
      hingeMoments: results.hingeMoments !== undefined,
      controlMixing: results.mixing !== undefined,
      highLiftDevices: results.highLift !== undefined,
      rollRateEstimation: results.rollRate !== undefined,
      stabilityCriteria: results.criteria !== undefined,
      nonlinearControl: results.nonlinear !== undefined,
    },
    metadata: {
      steps,
      unitsSystem: 'SI',
      approxLevel: 'DATCOM-level',
      confidence: allWarnings.length === 0 ? 'high' : allWarnings.length < 3 ? 'medium' : 'low',
      warnings: allWarnings,
    },
  });

  return payload;
}
