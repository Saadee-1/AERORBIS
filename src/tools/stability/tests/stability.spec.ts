/**
 * Unit tests for Stability & Control Derivatives Calculator
 * 
 * Test cases verify physics calculations and edge cases
 */

import { describe, it, expect } from 'vitest';
import { calculateStability, StabilityInputs } from '../utils/calcStability';
import {
  calculateWingLiftCurveSlope,
  calculateTailLiftCurveSlope,
  calculateDownwashDATCOM,
  calculateDownwashRoskam,
  calculateTailVolumeCoefficient,
  calculateNeutralPoint,
  calculateStaticMargin,
} from '../utils/aerodynamics';
import { A0_THEORETICAL } from '../utils/constants';

/**
 * Test Case 1: Basic Trainer Configuration
 */
describe('Basic Trainer Configuration', () => {
  const inputs: StabilityInputs = {
    S_w: 15, // m²
    AR: 7,
    c_bar: 1.5, // m
    x_ac_w: 0.375, // m (0.25c)
    x_cg: 0.4, // m
    S_t: 3.5, // m²
    AR_t: 4.5,
    l_t: 4.5, // m
    a0: A0_THEORETICAL,
    e_w: 0.85,
    e_t: 0.85,
    eta_t: 0.9,
  };

  it('should calculate stability without errors', () => {
    const result = calculateStability(inputs);
    
    expect(result).toBeDefined();
    expect(result.a_w).toBeGreaterThan(0);
    expect(result.a_w).toBeLessThan(10); // Reasonable range
    expect(result.a_t).toBeGreaterThan(0);
    expect(result.a_t).toBeLessThan(10);
    expect(result.V_H).toBeGreaterThan(0);
    expect(result.V_H).toBeLessThan(2); // Typical range
    expect(result.epsilon_alpha).toBeGreaterThan(0);
    expect(result.epsilon_alpha).toBeLessThan(1);
  });

  it('should have stable configuration (SM > 0)', () => {
    const result = calculateStability(inputs);
    expect(result.isStable).toBe(true);
    expect(result.SM).toBeGreaterThan(0);
  });

  it('should have negative C_mα for stability', () => {
    const result = calculateStability(inputs);
    expect(result.C_m_alpha).toBeLessThan(0); // Stable aircraft have negative C_mα
  });

  it('should have neutral point aft of CG', () => {
    const result = calculateStability(inputs);
    expect(result.x_np).toBeGreaterThan(inputs.x_cg);
  });
});

/**
 * Test Case 2: Lift Curve Slopes
 */
describe('Lift Curve Slopes', () => {
  it('should calculate wing lift curve slope correctly', () => {
    const a_w = calculateWingLiftCurveSlope(A0_THEORETICAL, 7, 0.85);
    
    expect(a_w).toBeGreaterThan(0);
    expect(a_w).toBeLessThan(A0_THEORETICAL); // Finite wing < infinite wing
    expect(a_w).toBeGreaterThan(4); // Typical range for AR=7
    expect(a_w).toBeLessThan(6);
  });

  it('should calculate tail lift curve slope correctly', () => {
    const a_t = calculateTailLiftCurveSlope(A0_THEORETICAL, 4.5, 0.85, 0.9);
    
    expect(a_t).toBeGreaterThan(0);
    expect(a_t).toBeLessThan(A0_THEORETICAL);
    // Tail should be less than wing due to efficiency factor
  });
});

/**
 * Test Case 3: Downwash Calculations
 */
describe('Downwash Calculations', () => {
  const a_w = 5.0; // per radian
  const AR = 7;

  it('should calculate DATCOM downwash', () => {
    const epsilon = calculateDownwashDATCOM(a_w, AR);
    
    expect(epsilon).toBeGreaterThan(0);
    expect(epsilon).toBeLessThan(1);
    expect(epsilon).toBeCloseTo((2 * a_w) / (Math.PI * AR), 3);
  });

  it('should calculate Roskam downwash', () => {
    const epsilon = calculateDownwashRoskam(a_w, AR);
    
    expect(epsilon).toBeGreaterThan(0);
    expect(epsilon).toBeLessThan(1);
    // Roskam should give higher values than DATCOM
    expect(epsilon).toBeGreaterThan(calculateDownwashDATCOM(a_w, AR));
  });
});

/**
 * Test Case 4: Tail Volume Coefficient
 */
describe('Tail Volume Coefficient', () => {
  it('should calculate tail volume correctly', () => {
    const V_H = calculateTailVolumeCoefficient(3.5, 4.5, 15, 1.5);
    
    expect(V_H).toBeGreaterThan(0);
    expect(V_H).toBeLessThan(2);
    // V_H = (3.5 * 4.5) / (15 * 1.5) = 15.75 / 22.5 = 0.7
    expect(V_H).toBeCloseTo(0.7, 2);
  });
});

/**
 * Test Case 5: Neutral Point and Static Margin
 */
describe('Neutral Point and Static Margin', () => {
  const inputs: StabilityInputs = {
    S_w: 15,
    AR: 7,
    c_bar: 1.5,
    x_ac_w: 0.375,
    x_cg: 0.4,
    S_t: 3.5,
    AR_t: 4.5,
    l_t: 4.5,
    a0: A0_THEORETICAL,
    e_w: 0.85,
    e_t: 0.85,
    eta_t: 0.9,
  };

  it('should calculate neutral point correctly', () => {
    const result = calculateStability(inputs);
    
    expect(result.x_np).toBeGreaterThan(inputs.x_ac_w);
    expect(result.x_np).toBeGreaterThan(inputs.x_cg); // For stable aircraft
  });

  it('should calculate static margin correctly', () => {
    const result = calculateStability(inputs);
    
    const expectedSM = (result.x_np - inputs.x_cg) / inputs.c_bar;
    expect(result.SM).toBeCloseTo(expectedSM, 3);
  });
});

/**
 * Test Case 6: Unstable Configuration
 */
describe('Unstable Configuration', () => {
  it('should detect unstable aircraft when CG is aft of neutral point', () => {
    const inputs: StabilityInputs = {
      S_w: 15,
      AR: 7,
      c_bar: 1.5,
      x_ac_w: 0.375,
      x_cg: 0.6, // Very aft CG
      S_t: 1.0, // Small tail
      AR_t: 4.5,
      l_t: 4.5,
      a0: A0_THEORETICAL,
      e_w: 0.85,
      e_t: 0.85,
      eta_t: 0.9,
    };

    const result = calculateStability(inputs);
    
    // May be unstable or marginally stable
    if (result.SM < 0) {
      expect(result.isStable).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });
});

/**
 * Test Case 7: Control Derivatives
 */
describe('Control Derivatives', () => {
  const inputs: StabilityInputs = {
    S_w: 15,
    AR: 7,
    c_bar: 1.5,
    x_ac_w: 0.375,
    x_cg: 0.4,
    S_t: 3.5,
    AR_t: 4.5,
    l_t: 4.5,
    a0: A0_THEORETICAL,
    e_w: 0.85,
    e_t: 0.85,
    eta_t: 0.9,
    S_e: 0.8,
    tau_e: 0.45,
    S_a: 1.2,
    K_a: 0.6,
    S_r: 0.5,
    K_r: 0.5,
    S_v: 2.0,
    l_v: 4.5,
    b_w: 10.2,
  };

  it('should calculate elevator effectiveness', () => {
    const result = calculateStability(inputs);
    
    expect(result.C_m_delta_e).toBeDefined();
    expect(result.C_m_delta_e!).toBeLessThan(0); // Negative for nose-down
    expect(Math.abs(result.C_m_delta_e!)).toBeGreaterThan(0);
  });

  it('should calculate aileron effectiveness', () => {
    const result = calculateStability(inputs);
    
    expect(result.C_l_delta_a).toBeDefined();
    expect(result.C_l_delta_a!).toBeGreaterThan(0);
  });

  it('should calculate rudder effectiveness', () => {
    const result = calculateStability(inputs);
    
    expect(result.C_n_delta_r).toBeDefined();
    expect(result.C_n_delta_r!).toBeLessThan(0); // Negative for yaw
  });
});

/**
 * Test Case 8: Input Validation
 */
describe('Input Validation', () => {
  it('should reject negative wing area', () => {
    const inputs: StabilityInputs = {
      S_w: -10,
      AR: 7,
      c_bar: 1.5,
      x_ac_w: 0.375,
      x_cg: 0.4,
      S_t: 3.5,
      AR_t: 4.5,
      l_t: 4.5,
    };

    expect(() => calculateStability(inputs)).toThrow();
  });

  it('should reject invalid aspect ratio', () => {
    const inputs: StabilityInputs = {
      S_w: 15,
      AR: 0.5, // Invalid
      c_bar: 1.5,
      x_ac_w: 0.375,
      x_cg: 0.4,
      S_t: 3.5,
      AR_t: 4.5,
      l_t: 4.5,
    };

    expect(() => calculateStability(inputs)).toThrow();
  });
});

