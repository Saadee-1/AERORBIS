/**
 * L/D Analyzer — Phase 1 Advanced Aerodynamics
 *
 * Pure functions. ADDITIVE only — do not touch existing frozen physics in
 * `src/components/tools/LiftDragAnalyzer.tsx` or `src/lib/physics.ts`.
 *
 * Modules:
 *  1. Compressibility (Prandtl–Glauert, Kármán–Tsien, Korn drag-divergence)
 *  2. Reynolds-scaling of parasite drag (Schlichting turbulent skin-friction + form factor)
 *  3. 3D finite-wing corrections (lifting-line, taper, sweep, dihedral)
 *  4. High-lift devices (flap / slat presets → ΔCL_max, ΔCD)
 *  5. Trim-drag estimate (tail-download given static margin)
 *
 * All angles in radians unless suffixed _deg. SI units throughout.
 */

// ───────────────────────────────────────────────────────────────────────────────
// 1. COMPRESSIBILITY
// ───────────────────────────────────────────────────────────────────────────────

/** Prandtl–Glauert compressibility correction for CL (subsonic, M < 1). */
export function prandtlGlauertCL(clIncompressible: number, mach: number): number {
  if (!Number.isFinite(mach) || mach >= 0.99) return clIncompressible;
  if (mach <= 0) return clIncompressible;
  return clIncompressible / Math.sqrt(1 - mach * mach);
}

/** Kármán–Tsien (more accurate near critical M) — Liepmann & Roshko form. */
export function karmanTsienCp(cpIncompressible: number, mach: number): number {
  if (!Number.isFinite(mach) || mach <= 0 || mach >= 0.99) return cpIncompressible;
  const beta = Math.sqrt(1 - mach * mach);
  return cpIncompressible / (beta + (mach * mach * cpIncompressible) / (2 * (1 + beta)));
}

/**
 * Korn equation — drag-divergence Mach number.
 *   M_dd · cos(Λ) + CL/(10 cos²Λ) + (t/c)/cos²Λ = κ
 * κ ≈ 0.87 (NACA 6-series / conventional), 0.95 (supercritical).
 */
export function dragDivergenceMach(params: {
  toC: number;        // thickness-to-chord ratio (e.g. 0.12)
  sweep_deg: number;  // quarter-chord sweep, degrees
  cl: number;
  kappa?: number;     // 0.87 conventional, 0.95 supercritical
}): number {
  const { toC, sweep_deg, cl, kappa = 0.87 } = params;
  const Λ = (sweep_deg * Math.PI) / 180;
  const cosΛ = Math.cos(Λ);
  const cos2Λ = cosΛ * cosΛ;
  const Mdd = (kappa - toC / cos2Λ - cl / (10 * cos2Λ)) / cosΛ;
  return Math.max(0.3, Math.min(0.99, Mdd));
}

/**
 * Wave-drag rise above M_dd. Lock-style: CD_w = 20 · (M − M_dd)^4 for M > M_dd.
 * Empirical but widely used in conceptual design (Raymer, Anderson).
 */
export function waveDragCoefficient(mach: number, M_dd: number): number {
  if (!Number.isFinite(mach) || mach <= M_dd) return 0;
  const dm = mach - M_dd;
  return 20 * dm * dm * dm * dm;
}

/** Critical Mach estimator from t/c + sweep (simple Howe correlation). */
export function criticalMach(toC: number, sweep_deg: number): number {
  const cosΛ = Math.cos((sweep_deg * Math.PI) / 180);
  // M_cr ≈ (0.95 / cosΛ) · (1 − 0.6 · t/c)
  return Math.max(0.3, Math.min(0.99, (0.95 / cosΛ) * (1 - 0.6 * toC)));
}

// ───────────────────────────────────────────────────────────────────────────────
// 2. REYNOLDS-SCALING (parasite drag)
// ───────────────────────────────────────────────────────────────────────────────

/** Turbulent flat-plate skin-friction coefficient (Schlichting). */
export function cfTurbulent(Re: number): number {
  if (!Number.isFinite(Re) || Re <= 0) return 0;
  return 0.455 / Math.pow(Math.log10(Re), 2.58);
}

/** Laminar flat-plate (Blasius). */
export function cfLaminar(Re: number): number {
  if (!Number.isFinite(Re) || Re <= 0) return 0;
  return 1.328 / Math.sqrt(Re);
}

/** Hoerner / Raymer airfoil form factor. */
export function airfoilFormFactor(toC: number, machAtMaxT: number = 0, xC_max: number = 0.3): number {
  // FF = [1 + 0.6/(x/c)_m · (t/c) + 100 · (t/c)^4] · 1.34 · M^0.18
  const term1 = 1 + (0.6 / xC_max) * toC + 100 * Math.pow(toC, 4);
  const machTerm = machAtMaxT > 0 ? 1.34 * Math.pow(machAtMaxT, 0.18) : 1;
  return term1 * machTerm;
}

/**
 * Rescale a polar's parasite drag from one Reynolds number to another.
 * Uses ratio of turbulent skin-friction coefficients.
 *   CD0_new = CD0_old · (Cf(Re_new) / Cf(Re_old))
 */
export function rescaleCD0(cd0_at_ref: number, Re_ref: number, Re_target: number): number {
  const cfRef = cfTurbulent(Re_ref);
  const cfNew = cfTurbulent(Re_target);
  if (!cfRef || !cfNew) return cd0_at_ref;
  return cd0_at_ref * (cfNew / cfRef);
}

/** Reynolds number from V, ρ, chord, μ. */
export function reynoldsNumber(density: number, velocity: number, chord: number, mu: number = 1.81e-5): number {
  return (density * velocity * chord) / mu;
}

// ───────────────────────────────────────────────────────────────────────────────
// 3. 3D FINITE-WING CORRECTIONS
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Lifting-line correction: a_3D = a_2D / (1 + a_2D / (π · AR · e))
 * a is per-radian lift-curve slope.
 */
export function liftCurveSlope3D(a2D: number, AR: number, e: number = 0.95): number {
  if (!Number.isFinite(AR) || AR <= 0) return a2D;
  return a2D / (1 + a2D / (Math.PI * AR * e));
}

/**
 * Sweep correction (Kuchemann): a_3D,swept = a_3D / sqrt(1 + (a_3D/(π·AR))² · cos²Λ) · cosΛ
 * Simplified DATCOM form.
 */
export function liftCurveSlopeSwept(a2D: number, AR: number, sweep_deg: number, mach: number = 0): number {
  const Λ = (sweep_deg * Math.PI) / 180;
  const β2 = mach < 1 ? 1 - mach * mach : 1;
  const k = a2D / (2 * Math.PI);
  const denom = 2 + Math.sqrt(4 + (AR * AR * β2 / (k * k)) * (1 + Math.tan(Λ) ** 2 / β2));
  return (2 * Math.PI * AR) / denom;
}

/**
 * Glauert induced-drag factor δ from taper ratio (λ = c_tip / c_root).
 * Tabulated for AR=6-10; quadratic fit valid for λ ∈ [0, 1].
 * Oswald efficiency e ≈ 1 / (1 + δ).
 */
export function glauertDelta(taperRatio: number): number {
  const λ = Math.max(0, Math.min(1, taperRatio));
  // Quadratic fit to standard Glauert/Hoerner chart at AR ≈ 8
  // δ_min ≈ 0.01 at λ ≈ 0.35 (elliptical equivalent)
  return 0.0524 - 0.15 * λ + 0.166 * λ * λ;
}

/** Oswald efficiency from taper + AR (Raymer empirical). */
export function oswaldEfficiency(AR: number, sweep_deg: number = 0): number {
  const Λ = (sweep_deg * Math.PI) / 180;
  if (sweep_deg < 30) {
    // Straight wing
    return 1.78 * (1 - 0.045 * Math.pow(AR, 0.68)) - 0.64;
  }
  // Swept wing
  return 4.61 * (1 - 0.045 * Math.pow(AR, 0.68)) * Math.pow(Math.cos(Λ), 0.15) - 3.1;
}

/** Dihedral effect on rolling moment (informational, returns dCl/dβ per rad). */
export function dihedralRollEffect(dihedral_deg: number, a3D: number): number {
  const Γ = (dihedral_deg * Math.PI) / 180;
  return -(a3D / 4) * Γ;
}

// ───────────────────────────────────────────────────────────────────────────────
// 4. HIGH-LIFT DEVICES
// ───────────────────────────────────────────────────────────────────────────────

export type FlapType = 'none' | 'plain' | 'split' | 'slotted' | 'fowler' | 'doubleslotted' | 'tripleslotted';
export type SlatType = 'none' | 'fixed' | 'leadingedge' | 'krueger';

/** ΔCL_max from flap deflection. Raymer/Roskam empirical. */
export interface HighLiftDelta {
  dClMax: number;
  dCd0: number;
  dAlphaStall_deg: number; // shift in α_stall
}

const FLAP_COEFFS: Record<FlapType, { cLPerDeg: number; cdPerDeg: number; alphaShift: number }> = {
  none:           { cLPerDeg: 0,      cdPerDeg: 0,       alphaShift: 0 },
  plain:          { cLPerDeg: 0.0090, cdPerDeg: 0.00040, alphaShift: -2 },
  split:          { cLPerDeg: 0.0110, cdPerDeg: 0.00075, alphaShift: -2 },
  slotted:        { cLPerDeg: 0.0130, cdPerDeg: 0.00030, alphaShift: -3 },
  fowler:         { cLPerDeg: 0.0160, cdPerDeg: 0.00025, alphaShift: -3 },
  doubleslotted: { cLPerDeg: 0.0180, cdPerDeg: 0.00040, alphaShift: -4 },
  tripleslotted: { cLPerDeg: 0.0200, cdPerDeg: 0.00050, alphaShift: -5 },
};

const SLAT_COEFFS: Record<SlatType, { dClMax: number; dCd0: number; alphaShift: number }> = {
  none:         { dClMax: 0,    dCd0: 0,      alphaShift: 0 },
  fixed:        { dClMax: 0.30, dCd0: 0.0040, alphaShift: 3 },
  leadingedge: { dClMax: 0.45, dCd0: 0.0020, alphaShift: 5 },
  krueger:      { dClMax: 0.40, dCd0: 0.0030, alphaShift: 4 },
};

export function highLiftDelta(params: {
  flap: FlapType;
  flapDeflection_deg: number;
  flapSpanFraction: number; // 0..1, fraction of wing span with flaps
  slat: SlatType;
}): HighLiftDelta {
  const { flap, flapDeflection_deg, flapSpanFraction, slat } = params;
  const fc = FLAP_COEFFS[flap];
  const sc = SLAT_COEFFS[slat];
  const sf = Math.max(0, Math.min(1, flapSpanFraction));

  const dClMaxFlap = fc.cLPerDeg * flapDeflection_deg * sf;
  const dCd0Flap = fc.cdPerDeg * flapDeflection_deg * sf;
  const dAlphaFlap = fc.alphaShift * sf * (flapDeflection_deg / 30); // normalised to 30° reference

  return {
    dClMax: dClMaxFlap + sc.dClMax,
    dCd0: dCd0Flap + sc.dCd0,
    dAlphaStall_deg: dAlphaFlap + sc.alphaShift,
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// 5. TRIM DRAG (tail-download penalty)
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Approximate trim drag from horizontal tail download required for pitch balance.
 * Given static margin SM (fraction of MAC) and CL_wing, tail must produce
 *   CL_t = -SM · CL_w · (S_w · c̄) / (S_t · l_t)
 * which adds induced drag CD_trim ≈ CL_t² · (S_t / S_w) / (π · AR_t · e_t).
 * Conservative — ignores zero-lift trim and tail interference.
 */
export interface TrimDragParams {
  CL_wing: number;
  staticMargin: number;   // fraction of MAC, positive = stable
  S_wing: number;         // m²
  S_tail: number;         // m²
  AR_tail: number;
  l_tail: number;         // m, tail arm
  c_bar: number;          // m, MAC
  e_tail?: number;
}

export function trimDrag(p: TrimDragParams): { CL_tail: number; CD_trim: number } {
  const eT = p.e_tail ?? 0.85;
  if (p.S_tail <= 0 || p.l_tail <= 0 || p.AR_tail <= 0) {
    return { CL_tail: 0, CD_trim: 0 };
  }
  const CL_t = -(p.staticMargin * p.CL_wing * p.S_wing * p.c_bar) / (p.S_tail * p.l_tail);
  const CD_trim = (CL_t * CL_t * (p.S_tail / p.S_wing)) / (Math.PI * p.AR_tail * eT);
  return { CL_tail: CL_t, CD_trim };
}

// ───────────────────────────────────────────────────────────────────────────────
// CONVENIENCE: combined "advanced corrections" snapshot
// ───────────────────────────────────────────────────────────────────────────────

export interface AdvancedSnapshot {
  // Inputs
  mach: number;
  Re: number;
  toC: number;
  sweep_deg: number;
  // Compressibility
  CL_corrected: number;
  M_critical: number;
  M_dd: number;
  CD_wave: number;
  // Re-scaling
  Cf: number;
  formFactor: number;
  CD0_rescaled: number;
  // 3D
  a3D: number;
  oswald_e: number;
  // High-lift
  dCL_max: number;
  dCD0_flaps: number;
  // Trim
  CD_trim: number;
  // Composite
  CD_total: number;
  L_D_corrected: number;
}

export function buildAdvancedSnapshot(input: {
  CL: number;
  CD0_base: number;
  AR: number;
  e: number;
  mach: number;
  Re: number;
  Re_ref: number;
  toC: number;
  sweep_deg: number;
  taperRatio: number;
  a2D: number;
  flap: FlapType;
  flapDeflection_deg: number;
  flapSpanFraction: number;
  slat: SlatType;
  trim?: TrimDragParams;
}): AdvancedSnapshot {
  const M_cr = criticalMach(input.toC, input.sweep_deg);
  const M_dd = dragDivergenceMach({ toC: input.toC, sweep_deg: input.sweep_deg, cl: input.CL });
  const CD_w = waveDragCoefficient(input.mach, M_dd);
  const CL_corr = prandtlGlauertCL(input.CL, input.mach);

  const cf = cfTurbulent(input.Re);
  const ff = airfoilFormFactor(input.toC, input.mach);
  const CD0_re = rescaleCD0(input.CD0_base, input.Re_ref, input.Re);

  const a3D = liftCurveSlope3D(input.a2D, input.AR, input.e);
  const eOsw = oswaldEfficiency(input.AR, input.sweep_deg);

  const hl = highLiftDelta({
    flap: input.flap,
    flapDeflection_deg: input.flapDeflection_deg,
    flapSpanFraction: input.flapSpanFraction,
    slat: input.slat,
  });

  const trimResult = input.trim ? trimDrag(input.trim) : { CL_tail: 0, CD_trim: 0 };

  const k = 1 / (Math.PI * input.AR * input.e);
  const CD_induced = k * CL_corr * CL_corr;
  const CD_total = CD0_re + hl.dCD0 + CD_induced + CD_w + trimResult.CD_trim;
  const L_D = CD_total > 1e-6 ? CL_corr / CD_total : 0;

  return {
    mach: input.mach,
    Re: input.Re,
    toC: input.toC,
    sweep_deg: input.sweep_deg,
    CL_corrected: CL_corr,
    M_critical: M_cr,
    M_dd,
    CD_wave: CD_w,
    Cf: cf,
    formFactor: ff,
    CD0_rescaled: CD0_re,
    a3D,
    oswald_e: eOsw,
    dCL_max: hl.dClMax,
    dCD0_flaps: hl.dCD0,
    CD_trim: trimResult.CD_trim,
    CD_total,
    L_D_corrected: L_D,
  };
}