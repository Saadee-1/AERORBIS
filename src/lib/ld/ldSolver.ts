/**
 * L/D Analyzer — Multi-variable Solver (Phase 4)
 *
 * Solves the lift equation  L = 0.5 · ρ · V² · S · CL  for the missing
 * variable when the other four are supplied. Pure functions, no UI.
 */

export type LdSolveVar = 'L' | 'rho' | 'V' | 'S' | 'CL';

export interface LdSolveInputs {
  L?: number;     // N
  rho?: number;   // kg/m³
  V?: number;     // m/s
  S?: number;     // m²
  CL?: number;
}

export interface LdSolveResult {
  target: LdSolveVar;
  value: number;
  formula: string;
}

export function solveLift(inputs: LdSolveInputs): LdSolveResult | null {
  const provided = (['L','rho','V','S','CL'] as LdSolveVar[]).filter(k => Number.isFinite(inputs[k] as number));
  if (provided.length !== 4) return null;
  const missing = (['L','rho','V','S','CL'] as LdSolveVar[]).find(k => !provided.includes(k))!;
  const { L = 0, rho = 0, V = 0, S = 0, CL = 0 } = inputs;
  switch (missing) {
    case 'L':
      return { target: 'L', value: 0.5 * rho * V * V * S * CL, formula: 'L = ½·ρ·V²·S·CL' };
    case 'rho': {
      const den = 0.5 * V * V * S * CL;
      if (den === 0) return null;
      return { target: 'rho', value: L / den, formula: 'ρ = L / (½·V²·S·CL)' };
    }
    case 'V': {
      const den = 0.5 * rho * S * CL;
      if (den <= 0) return null;
      return { target: 'V', value: Math.sqrt(L / den), formula: 'V = √(L / (½·ρ·S·CL))' };
    }
    case 'S': {
      const den = 0.5 * rho * V * V * CL;
      if (den === 0) return null;
      return { target: 'S', value: L / den, formula: 'S = L / (½·ρ·V²·CL)' };
    }
    case 'CL': {
      const den = 0.5 * rho * V * V * S;
      if (den === 0) return null;
      return { target: 'CL', value: L / den, formula: 'CL = L / (½·ρ·V²·S)' };
    }
  }
}