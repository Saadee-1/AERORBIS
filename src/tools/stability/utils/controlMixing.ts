/**
 * Control mixing calculations
 * 
 * Handles aileron differential, flaperons, spoilerons, and quadcopter motor mixing
 */

import { QUADCOPTER_X_MIXING } from '../data/mixingMatrices';

export interface ControlMixingInputs {
  // Mixing type
  mixing_type: 'none' | 'aileron-differential' | 'flaperons' | 'spoilerons' | 'elevator-aileron' | 'rudder-aileron' | 'quadcopter';
  
  // Mixing parameters
  aileron_differential_ratio?: number; // Up/down aileron ratio (typically 0.5-0.7)
  flaperon_mix?: number; // Flaperon mix ratio (0-1)
  spoileron_mix?: number; // Spoileron mix ratio (0-1)
  elevator_aileron_mix?: number; // Elevator-aileron mix ratio
  rudder_aileron_mix?: number; // Rudder-aileron mix ratio
  
  // Quadcopter motor mixing
  motor_mixing_matrix?: number[][]; // 4x4 matrix [motor][pitch, roll, yaw, thrust]
  motor_gains?: { pitch: number; roll: number; yaw: number; thrust: number };
  
  // Base control derivatives
  C_l_delta_a_base?: number;
  C_m_delta_e_base?: number;
  C_n_delta_r_base?: number;
}

export interface ControlMixing {
  // Modified control derivatives
  C_l_delta_a_effective: number;
  C_m_delta_e_effective: number;
  C_n_delta_r_effective: number;
  
  // Mixing effects
  aileron_differential_factor?: number;
  flaperon_lift_increment?: number;
  spoileron_drag_increment?: number;
  
  // Quadcopter mixing
  motor_mixing_matrix?: number[][];
  motor_response?: { pitch: number; roll: number; yaw: number; thrust: number };
  
  warnings: string[];
}

// QUADCOPTER_MIXING_MATRIX is now QUADCOPTER_X_MIXING from mixingMatrices.ts

/**
 * Calculate aileron differential effect
 * 
 * Reduces adverse yaw by having up-going aileron deflect more than down-going
 * 
 * @param C_l_delta_a_base - Base aileron effectiveness
 * @param differential_ratio - Up/down ratio (0.5-0.7 typical)
 * @returns Effective aileron derivative and differential factor
 */
export function calculateAileronDifferential(
  C_l_delta_a_base: number,
  differential_ratio: number = 0.6
): { C_l_delta_a_effective: number; differential_factor: number } {
  // Differential reduces total effectiveness slightly
  const differential_factor = (1 + differential_ratio) / 2;
  const C_l_delta_a_effective = C_l_delta_a_base * differential_factor;
  
  return { C_l_delta_a_effective, differential_factor };
}

/**
 * Calculate flaperon effect
 * 
 * Combines aileron and flap functions
 * 
 * @param C_l_delta_a_base - Base aileron effectiveness
 * @param flaperon_mix - Mix ratio (0-1)
 * @returns Effective aileron derivative and lift increment
 */
export function calculateFlaperonEffect(
  C_l_delta_a_base: number,
  flaperon_mix: number = 0.5
): { C_l_delta_a_effective: number; lift_increment: number } {
  // Flaperons reduce aileron effectiveness but add lift
  const C_l_delta_a_effective = C_l_delta_a_base * (1 - flaperon_mix * 0.3);
  const lift_increment = flaperon_mix * 0.2; // Approximate CL increment
  
  return { C_l_delta_a_effective, lift_increment };
}

/**
 * Calculate spoileron effect
 * 
 * Combines aileron and spoiler functions
 * 
 * @param C_l_delta_a_base - Base aileron effectiveness
 * @param spoileron_mix - Mix ratio (0-1)
 * @returns Effective aileron derivative and drag increment
 */
export function calculateSpoileronEffect(
  C_l_delta_a_base: number,
  spoileron_mix: number = 0.5
): { C_l_delta_a_effective: number; drag_increment: number } {
  // Spoilerons reduce aileron effectiveness but add drag
  const C_l_delta_a_effective = C_l_delta_a_base * (1 - spoileron_mix * 0.4);
  const drag_increment = spoileron_mix * 0.15; // Approximate CD increment
  
  return { C_l_delta_a_effective, drag_increment };
}

/**
 * Calculate control mixing
 * 
 * @param inputs - Control mixing inputs
 * @returns Complete control mixing results
 */
export function calculateControlMixing(
  inputs: ControlMixingInputs
): ControlMixing {
  const warnings: string[] = [];
  
  let C_l_delta_a_effective = inputs.C_l_delta_a_base || 0;
  let C_m_delta_e_effective = inputs.C_m_delta_e_base || 0;
  let C_n_delta_r_effective = inputs.C_n_delta_r_base || 0;
  
  let aileron_differential_factor: number | undefined;
  let flaperon_lift_increment: number | undefined;
  let spoileron_drag_increment: number | undefined;
  
  // Apply mixing based on type
  switch (inputs.mixing_type) {
    case 'aileron-differential':
      if (inputs.aileron_differential_ratio !== undefined) {
        const diff = calculateAileronDifferential(
          C_l_delta_a_effective,
          inputs.aileron_differential_ratio
        );
        C_l_delta_a_effective = diff.C_l_delta_a_effective;
        aileron_differential_factor = diff.differential_factor;
      }
      break;
      
    case 'flaperons':
      if (inputs.flaperon_mix !== undefined) {
        const flaperon = calculateFlaperonEffect(
          C_l_delta_a_effective,
          inputs.flaperon_mix
        );
        C_l_delta_a_effective = flaperon.C_l_delta_a_effective;
        flaperon_lift_increment = flaperon.lift_increment;
      }
      break;
      
    case 'spoilerons':
      if (inputs.spoileron_mix !== undefined) {
        const spoileron = calculateSpoileronEffect(
          C_l_delta_a_effective,
          inputs.spoileron_mix
        );
        C_l_delta_a_effective = spoileron.C_l_delta_a_effective;
        spoileron_drag_increment = spoileron.drag_increment;
      }
      break;
      
    case 'elevator-aileron':
      if (inputs.elevator_aileron_mix !== undefined) {
        // Mix elevator into aileron (for coordinated turns)
        C_l_delta_a_effective += inputs.elevator_aileron_mix * 0.1 * C_m_delta_e_effective;
      }
      break;
      
    case 'rudder-aileron':
      if (inputs.rudder_aileron_mix !== undefined) {
        // Mix rudder into aileron (for coordinated turns)
        C_l_delta_a_effective += inputs.rudder_aileron_mix * 0.05 * C_n_delta_r_effective;
      }
      break;
      
    case 'quadcopter':
      // Quadcopter uses motor mixing, not aerodynamic controls
      C_l_delta_a_effective = 0; // No aerodynamic roll control
      C_m_delta_e_effective = 0; // No aerodynamic pitch control
      C_n_delta_r_effective = 0; // No aerodynamic yaw control
      break;
  }
  
  // Quadcopter motor mixing
  let motor_mixing_matrix: number[][] | undefined;
  let motor_response: { pitch: number; roll: number; yaw: number; thrust: number } | undefined;
  
  if (inputs.mixing_type === 'quadcopter') {
    motor_mixing_matrix = inputs.motor_mixing_matrix || QUADCOPTER_X_MIXING;
    
    // Calculate motor response from control inputs
    if (inputs.motor_gains) {
      motor_response = {
        pitch: inputs.motor_gains.pitch,
        roll: inputs.motor_gains.roll,
        yaw: inputs.motor_gains.yaw,
        thrust: inputs.motor_gains.thrust,
      };
    }
  }
  
  // Warnings
  if (inputs.mixing_type === 'quadcopter' && (inputs.C_l_delta_a_base || inputs.C_m_delta_e_base)) {
    warnings.push('Quadcopter mode: Aerodynamic controls disabled, using motor mixing only');
  }
  
  if (inputs.mixing_type !== 'quadcopter' && inputs.motor_mixing_matrix) {
    warnings.push('Motor mixing matrix provided but mixing type is not quadcopter');
  }
  
  return {
    C_l_delta_a_effective,
    C_m_delta_e_effective,
    C_n_delta_r_effective,
    aileron_differential_factor,
    flaperon_lift_increment,
    spoileron_drag_increment,
    motor_mixing_matrix,
    motor_response,
    warnings,
  };
}

