/**
 * L/D Analyzer — Drag Breakdown (Phase 3, additive display-only)
 * Splits total CD into parasite, induced, wave, and trim contributions
 * across an alpha / CL sweep. Uses parabolic-polar assumption.
 */

export interface DragBreakdownPoint {
  CL: number;
  CD_parasite: number;
  CD_induced: number;
  CD_wave: number;
  CD_trim: number;
  CD_total: number;
}

/** Korn-equation wave drag rise: CD_wave = 20·(M − M_dd)^4 if M > M_dd, else 0. */
function waveDrag(M: number, M_dd: number): number {
  if (!Number.isFinite(M) || M <= M_dd) return 0;
  const dM = M - M_dd;
  return 20 * dM * dM * dM * dM;
}

export function dragBreakdownSweep(params: {
  CD0: number;
  k: number;
  CL_min: number;
  CL_max: number;
  steps?: number;
  mach?: number;
  M_dd?: number;
  trimDeltaCD?: number;
}): DragBreakdownPoint[] {
  const { CD0, k, CL_min, CL_max, steps = 30, mach = 0, M_dd = 0.78, trimDeltaCD = 0 } = params;
  const out: DragBreakdownPoint[] = [];
  const CD_wave = waveDrag(mach, M_dd);
  for (let i = 0; i <= steps; i++) {
    const CL = CL_min + ((CL_max - CL_min) * i) / steps;
    const CD_parasite = CD0;
    const CD_induced = k * CL * CL;
    const CD_trim = trimDeltaCD;
    const CD_total = CD_parasite + CD_induced + CD_wave + CD_trim;
    out.push({
      CL: +CL.toFixed(3),
      CD_parasite: +CD_parasite.toFixed(5),
      CD_induced: +CD_induced.toFixed(5),
      CD_wave: +CD_wave.toFixed(5),
      CD_trim: +CD_trim.toFixed(5),
      CD_total: +CD_total.toFixed(5),
    });
  }
  return out;
}