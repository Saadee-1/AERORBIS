/**
 * Enhanced control derivatives calculations
 * 
 * Includes control surface geometry effects and DATCOM scaling
 */

import { calculateTailLiftCurveSlope } from './aerodynamics';
import { DEFAULT_AIRFOIL_LIFT_SLOPE, DEFAULT_WING_EFFICIENCY, DEFAULT_TAIL_EFFICIENCY } from './constants';

export interface ControlGeometry {
  span_fraction: number; chord_fraction: number; hinge_line_position: number;
  balance_type: 'unbalanced' | 'horn' | 'overhang' | 'frise' | 'servo-tab' | 'anti-servo-tab';
  S_control: number; S_wing: number;
}

export interface ControlDerivativesInputs {
  S_t: number; AR_t: number; l_t: number; c_bar: number; S_w: number; a0: number; e_t: number; eta: number;
  elevator_geometry?: ControlGeometry; aileron_geometry?: ControlGeometry; rudder_geometry?: ControlGeometry;
  AR: number; e: number; b: number; S_v?: number; AR_v?: number;
}

export interface ControlDerivatives {
  C_m_delta_e: number; tau_e: number; C_l_delta_a: number; tau_a: number; C_n_delta_r: number; tau_r: number;
  warnings: string[];
}

export function calculateControlEffectiveness(geometry: ControlGeometry): number {
  let tau = 1.0;
  tau *= geometry.span_fraction * geometry.chord_fraction;
  const hinge_effect = 0.7 + 0.3 * geometry.hinge_line_position;
  tau *= hinge_effect;
  const balance_factors: Record<string, number> = {
    'unbalanced': 1.0, 'horn': 0.95, 'overhang': 0.90, 'frise': 0.85, 'servo-tab': 0.75, 'anti-servo-tab': 1.15,
  };
  tau *= balance_factors[geometry.balance_type] || 1.0;
  return Math.max(0.1, Math.min(1.2, tau));
}

export function calculateElevatorEffectiveness(inputs: ControlDerivativesInputs): { C_m_delta_e: number; tau_e: number } {
  const a_t = calculateTailLiftCurveSlope(inputs.a0, inputs.AR_t, inputs.e_t, inputs.eta);
  let tau_e = 0.4;
  if (inputs.elevator_geometry) tau_e = calculateControlEffectiveness(inputs.elevator_geometry);
  const C_m_delta_e = -inputs.eta * a_t * (inputs.S_t / inputs.S_w) * (inputs.l_t / inputs.c_bar) * tau_e;
  return { C_m_delta_e, tau_e };
}

export function calculateAileronEffectiveness(inputs: ControlDerivativesInputs): { C_l_delta_a: number; tau_a: number } {
  if (!inputs.aileron_geometry) {
    const K_a = 0.08; const S_a_estimate = inputs.S_w * 0.05;
    return { C_l_delta_a: K_a * (S_a_estimate / inputs.S_w), tau_a: 0.4 };
  }
  const tau_a = calculateControlEffectiveness(inputs.aileron_geometry);
  const K_a = 0.08; const S_a = inputs.aileron_geometry.S_control;
  const C_l_delta_a = K_a * (S_a / inputs.S_w) * tau_a;
  return { C_l_delta_a, tau_a };
}

export function calculateRudderEffectiveness(inputs: ControlDerivativesInputs): { C_n_delta_r: number; tau_r: number } {
  if (!inputs.S_v || !inputs.rudder_geometry) {
    const K_r = 0.12; const S_r_estimate = inputs.S_t * 0.2; const S_v_estimate = inputs.S_t * 0.8;
    return { C_n_delta_r: K_r * (S_r_estimate / S_v_estimate), tau_r: 0.4 };
  }
  const tau_r = calculateControlEffectiveness(inputs.rudder_geometry);
  const K_r = 0.12; const S_r = inputs.rudder_geometry.S_control;
  const C_n_delta_r = K_r * (S_r / inputs.S_v) * tau_r;
  return { C_n_delta_r, tau_r };
}

export function calculateControlDerivatives(inputs: ControlDerivativesInputs): ControlDerivatives {
  const warnings: string[] = [];
  const elevator = calculateElevatorEffectiveness(inputs);
  const aileron = calculateAileronEffectiveness(inputs);
  const rudder = calculateRudderEffectiveness(inputs);
  if (Math.abs(elevator.C_m_delta_e) < 0.01) warnings.push('Very low elevator effectiveness - may have insufficient pitch control');
  if (Math.abs(aileron.C_l_delta_a) < 0.01) warnings.push('Very low aileron effectiveness - may have insufficient roll control');
  if (Math.abs(rudder.C_n_delta_r) < 0.01) warnings.push('Very low rudder effectiveness - may have insufficient yaw control');
  return { C_m_delta_e: elevator.C_m_delta_e, tau_e: elevator.tau_e, C_l_delta_a: aileron.C_l_delta_a, tau_a: aileron.tau_a, C_n_delta_r: rudder.C_n_delta_r, tau_r: rudder.tau_r, warnings };
}