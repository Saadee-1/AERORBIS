/**
 * Unit tests for rocket engine calculations
 * 
 * Test cases verify numerical accuracy and solver convergence
 */

import { calculateRocketEngine, RocketEngineInputs } from '../utils/calcEngine';
import { solveForMe } from '../utils/numeric';
import { areaMachRelation } from '../utils/isentropic';
import { G0, R_UNIVERSAL } from '../utils/constants';

describe('Rocket Engine Calculations', () => {
  // Test case 1: Simple reference case
  test('Simple reference case - basic calculation', () => {
    const inputs: RocketEngineInputs = {
      Pc: 3.5e6, // 35 bar
      Tc: 3500,
      At: 0.12,
      epsilon: 50,
      Pa: 101325, // Sea level
      gamma: 1.22,
      M_molar: 22.0,
    };

    const results = calculateRocketEngine(inputs);

    // Verify results are reasonable
    expect(results.mdot).toBeGreaterThan(0);
    expect(results.mdot).toBeLessThan(1000); // Should be reasonable
    expect(results.cStar).toBeGreaterThan(1000);
    expect(results.cStar).toBeLessThan(3000);
    expect(results.Me).toBeGreaterThan(1); // Must be supersonic
    expect(results.Me).toBeLessThan(10);
    expect(results.T).toBeGreaterThan(0);
    expect(results.Isp).toBeGreaterThan(200);
    expect(results.Isp).toBeLessThan(500);
    expect(results.solverResult.success).toBe(true);
  });

  // Test case 2: Vacuum vs Sea level
  test('Vacuum vs Sea level thrust comparison', () => {
    const baseInputs: RocketEngineInputs = {
      Pc: 9.7e6,
      Tc: 3500,
      At: 0.5,
      epsilon: 16,
      gamma: 1.22,
      M_molar: 22.0,
    };

    const seaLevel = calculateRocketEngine({ ...baseInputs, Pa: 101325 });
    const vacuum = calculateRocketEngine({ ...baseInputs, Pa: 0 });

    // Vacuum thrust should be higher
    expect(vacuum.T).toBeGreaterThan(seaLevel.T);
    
    // Difference should be approximately (Pe - Pa) * Ae
    const thrustDiff = vacuum.T - seaLevel.T;
    const expectedDiff = 101325 * vacuum.Ae; // Approximate
    expect(Math.abs(thrustDiff - expectedDiff)).toBeLessThan(expectedDiff * 0.5); // Within 50%
  });

  // Test case 3: Area-Mach solver
  test('Area-Mach solver accuracy', () => {
    const areaRatio = 40;
    const gamma = 1.22;

    const solverResult = solveForMe(areaRatio, gamma);

    expect(solverResult.success).toBe(true);
    expect(solverResult.value).toBeGreaterThan(1);
    expect(solverResult.value).toBeLessThan(10);
    expect(solverResult.residual).toBeLessThan(1e-6);

    // Verify the solution by checking area ratio
    const calculatedRatio = areaMachRelation(solverResult.value, gamma);
    expect(Math.abs(calculatedRatio - areaRatio)).toBeLessThan(areaRatio * 1e-6);
  });

  // Test case 4: Overexpansion detection
  test('Overexpansion detection', () => {
    const inputs: RocketEngineInputs = {
      Pc: 1e6, // Low pressure
      Tc: 3000,
      At: 0.1,
      epsilon: 50, // High expansion
      Pa: 101325, // Sea level
      gamma: 1.22,
      M_molar: 22.0,
    };

    const results = calculateRocketEngine(inputs);

    // Should detect overexpansion if Pe < Pa
    if (results.Pe < inputs.Pa) {
      expect(results.isOverExpanded).toBe(true);
      expect(results.warnings.some(w => w.includes('overexpanded'))).toBe(true);
    }
  });

  // Test case 5: Merlin-like approximate
  test('Merlin-like configuration', () => {
    const inputs: RocketEngineInputs = {
      Pc: 9.7e6,
      Tc: 3500,
      At: 0.5,
      epsilon: 16,
      Pa: 101325,
      gamma: 1.22,
      M_molar: 22.0,
      nozzleEfficiency: 0.98,
      cStarEfficiency: 0.95,
    };

    const results = calculateRocketEngine(inputs);

    // Verify all outputs are valid numbers
    expect(isFinite(results.mdot)).toBe(true);
    expect(isFinite(results.cStar)).toBe(true);
    expect(isFinite(results.Ve)).toBe(true);
    expect(isFinite(results.T)).toBe(true);
    expect(isFinite(results.Isp)).toBe(true);
    expect(isFinite(results.Cf)).toBe(true);

    // Verify reasonable ranges
    expect(results.mdot).toBeGreaterThan(100);
    expect(results.mdot).toBeLessThan(1000);
    expect(results.T).toBeGreaterThan(100000); // > 100 kN
    expect(results.Isp).toBeGreaterThan(250);
    expect(results.Isp).toBeLessThan(350);
  });

  // Test case 6: Solver convergence
  test('Solver convergence for various expansion ratios', () => {
    const gamma = 1.22;
    const expansionRatios = [5, 10, 20, 40, 80];

    expansionRatios.forEach(epsilon => {
      const result = solveForMe(epsilon, gamma);
      expect(result.success).toBe(true);
      expect(result.iterations).toBeLessThan(100);
      expect(result.residual).toBeLessThan(1e-6);
    });
  });

  // Test case 7: Mass flow sanity check
  test('Mass flow sanity check - mdot ≈ Pc*At/c*', () => {
    const inputs: RocketEngineInputs = {
      Pc: 10e6,
      Tc: 3500,
      At: 0.1,
      epsilon: 20,
      Pa: 0, // Vacuum
      gamma: 1.22,
      M_molar: 22.0,
    };

    const results = calculateRocketEngine(inputs);

    // Check: mdot ≈ Pc * At / c*
    const expectedMdot = (inputs.Pc * inputs.At) / results.cStar;
    expect(Math.abs(results.mdot - expectedMdot)).toBeLessThan(expectedMdot * 0.1); // Within 10%
  });
});

