/**
 * Unit tests for PDF export functions
 */

import { describe, it, expect } from 'vitest';
import { safeToFixed } from '../lib/safeNumbers';
import { computePolarsMetrics } from '../lib/pdfExport';
import type { PolarData } from '../lib/pdfExport';

// Mock safeToFixed if needed
const mockSafeToFixed = (v: number | null | undefined, d: number = 2): string => {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) {
    return '—';
  }
  return Number(v).toFixed(d);
};

describe('safeToFixed', () => {
  it('should format valid numbers correctly', () => {
    expect(safeToFixed(1.234, 2)).toBe('1.23');
    expect(safeToFixed(0, 2)).toBe('0.00');
    expect(safeToFixed(100, 0)).toBe('100');
  });

  it('should return "—" for null values', () => {
    expect(safeToFixed(null, 2)).toBe('—');
  });

  it('should return "—" for undefined values', () => {
    expect(safeToFixed(undefined, 2)).toBe('—');
  });

  it('should return "—" for NaN values', () => {
    expect(safeToFixed(NaN, 2)).toBe('—');
  });

  it('should return "—" for Infinity values', () => {
    expect(safeToFixed(Infinity, 2)).toBe('—');
    expect(safeToFixed(-Infinity, 2)).toBe('—');
  });
});

describe('computePolarsMetrics', () => {
  const samplePolar: PolarData = {
    airfoil: 'NACA 0012',
    re: 1000000,
    mach: 0.0,
    alpha: [-4, -2, 0, 2, 4, 6, 8, 10, 12, 14],
    cl: [-0.45, -0.22, 0.00, 0.22, 0.44, 0.66, 0.88, 1.00, 1.20, 1.27],
    cd: [0.021, 0.013, 0.008, 0.007, 0.009, 0.014, 0.021, 0.026, 0.040, 0.049],
    cm: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  it('should compute cl_max correctly', () => {
    const metrics = computePolarsMetrics(samplePolar);
    expect(metrics.cl_max).toBeCloseTo(1.27, 2);
    expect(metrics.alpha_cl_max).toBe(14);
  });

  it('should compute cd_min correctly', () => {
    const metrics = computePolarsMetrics(samplePolar);
    expect(metrics.cd_min).toBeCloseTo(0.007, 3);
    expect(metrics.alpha_cd_min).toBe(2);
  });

  it('should compute ld_max correctly', () => {
    const metrics = computePolarsMetrics(samplePolar);
    // L/D at alpha=2: 0.22/0.007 ≈ 31.43
    expect(metrics.ld_max).toBeGreaterThan(20);
    expect(Number.isFinite(metrics.ld_max)).toBe(true);
  });

  it('should compute ld_series correctly', () => {
    const metrics = computePolarsMetrics(samplePolar);
    expect(metrics.ld_series.length).toBe(samplePolar.alpha.length);
    expect(metrics.ld_series[0].alpha).toBe(-4);
    expect(Number.isFinite(metrics.ld_series[0].ld)).toBe(true);
  });

  it('should handle empty arrays gracefully', () => {
    const emptyPolar: PolarData = {
      airfoil: 'Test',
      re: 1000000,
      mach: 0.0,
      alpha: [],
      cl: [],
      cd: [],
    };
    expect(() => computePolarsMetrics(emptyPolar)).toThrow();
  });

  it('should handle mismatched array lengths', () => {
    const badPolar: PolarData = {
      airfoil: 'Test',
      re: 1000000,
      mach: 0.0,
      alpha: [0, 1, 2],
      cl: [0, 1],
      cd: [0, 1, 2],
    };
    expect(() => computePolarsMetrics(badPolar)).toThrow();
  });

  it('should compute zero_lift_alpha', () => {
    const metrics = computePolarsMetrics(samplePolar);
    // For symmetric airfoil, zero lift should be near 0
    expect(Math.abs(metrics.zero_lift_alpha)).toBeLessThan(1);
  });

  it('should compute liftSlope', () => {
    const metrics = computePolarsMetrics(samplePolar);
    expect(metrics.liftSlope).toBeGreaterThan(0);
    expect(metrics.liftSlope).toBeLessThan(0.2); // Typical range
    expect(Number.isFinite(metrics.liftSlope)).toBe(true);
  });
});

