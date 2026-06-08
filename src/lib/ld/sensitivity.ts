/**
 * L/D Analyzer — Sensitivity sweeps (Phase 3)
 * Sweeps a single parameter and reports L/D, CL, CD across the range.
 */

export type SensitivityParam = 'AR' | 'oswald' | 'CD0' | 'altitude' | 'airspeed';

export interface SensitivityPoint {
  x: number;
  CL: number;
  CD: number;
  LD: number;
}

function isaDensity(h: number): number {
  const T0 = 288.15, L = 0.0065, P0 = 101325, R = 287.05, g = 9.80665;
  if (h <= 11000) {
    const T = T0 - L * h;
    const P = P0 * Math.pow(T / T0, g / (R * L));
    return P / (R * T);
  }
  const T11 = 216.65;
  const P11 = P0 * Math.pow(T11 / T0, g / (R * L));
  const P = P11 * Math.exp((-g * (h - 11000)) / (R * T11));
  return P / (R * T11);
}

export interface SensitivityInputs {
  CD0: number;
  AR: number;
  e: number;
  S: number;
  W: number;       // N
  V: number;       // m/s
  density: number;
}

export function sensitivitySweep(
  param: SensitivityParam,
  base: SensitivityInputs,
  range: { min: number; max: number; steps?: number }
): SensitivityPoint[] {
  const { min, max, steps = 25 } = range;
  const out: SensitivityPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = min + ((max - min) * i) / steps;
    let { CD0, AR, e, S, W, V, density } = base;
    if (param === 'AR') AR = x;
    else if (param === 'oswald') e = x;
    else if (param === 'CD0') CD0 = x;
    else if (param === 'altitude') density = isaDensity(x);
    else if (param === 'airspeed') V = x;
    const k = AR > 0 && e > 0 ? 1 / (Math.PI * AR * e) : 0;
    const q = 0.5 * density * V * V;
    const CL = q > 0 ? W / (q * S) : 0;
    const CD = CD0 + k * CL * CL;
    const LD = CD > 0 ? CL / CD : 0;
    out.push({ x: +x.toFixed(4), CL: +CL.toFixed(4), CD: +CD.toFixed(5), LD: +LD.toFixed(2) });
  }
  return out;
}