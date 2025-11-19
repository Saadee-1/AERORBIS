/**
 * Dynamic derivatives calculations
 * 
 * Implements DATCOM formulas for pitch, roll, and yaw damping
 */

import { calculateWingLiftCurveSlope } from './aerodynamics';
import { DEFAULT_AIRFOIL_LIFT_SLOPE, DEFAULT_WING_EFFICIENCY } from './constants';

export interface DynamicDerivativesInputs {
  S_w: number; AR: number; b: number; c_bar: number; l_t: number; a0: number; e: number;
  S_t: number; AR_t: number; e_t: number; eta: number;
  I_x?: number; I_y?: number; I_z?: number;
}

export interface DynamicDerivatives {
  C_m_q: number; C_l_p: number; C_n_r: number; C_l_r: number; C_n_p: number;
  pitch_damping_ratio?: number; roll_damping_ratio?: number; yaw_damping_ratio?: number;
}

export function calculatePitchDamping(a_w: number, AR: number, l_t: number, c_bar: number): number {
  if (AR <= 0 || c_bar <= 0) throw new Error('Aspect ratio and chord must be positive');
  return -(2 * a_w) / (Math.PI * AR) * (l_t / c_bar);
}

export function calculateRollDamping(a_w: number, AR: number): number {
  if (AR <= 0) throw new Error('Aspect ratio must be positive');
  return -(1/4) * a_w * (1 + 3/(2 * AR));
}

export function calculateYawDamping(a_w: number, AR: number, l_t: number, b: number): number {
  if (AR <= 0 || b <= 0) throw new Error('Aspect ratio and span must be positive');
  return -(2 * a_w) / (Math.PI * AR) * (l_t / b);
}

export function calculateRollDueToYawRate(S_v: number, S_w: number): number {
  if (S_w <= 0) throw new Error('Wing area must be positive');
  return 0.15 * (1 + 0.5 * (S_v / S_w));
}

export function calculateYawDueToRollRate(S_v: number, S_w: number): number {
  if (S_w <= 0) throw new Error('Wing area must be positive');
  return -0.1 * (1 + 0.3 * (S_v / S_w));
}

export function calculateDynamicDerivatives(inputs: DynamicDerivativesInputs): DynamicDerivatives {
  const a_w = calculateWingLiftCurveSlope(inputs.a0, inputs.AR, inputs.e);
  const C_m_q = calculatePitchDamping(a_w, inputs.AR, inputs.l_t, inputs.c_bar);
  const C_l_p = calculateRollDamping(a_w, inputs.AR);
  const C_n_r = calculateYawDamping(a_w, inputs.AR, inputs.l_t, inputs.b);
  const C_l_r = calculateRollDueToYawRate(inputs.S_t, inputs.S_w);
  const C_n_p = calculateYawDueToRollRate(inputs.S_t, inputs.S_w);
  const result: DynamicDerivatives = { C_m_q, C_l_p, C_n_r, C_l_r, C_n_p };
  if (inputs.I_x && inputs.I_y && inputs.I_z) {
    result.pitch_damping_ratio = Math.abs(C_m_q) * 0.1;
    result.roll_damping_ratio = Math.abs(C_l_p) * 0.15;
    result.yaw_damping_ratio = Math.abs(C_n_r) * 0.12;
  }
  return result;
}