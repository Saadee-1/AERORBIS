/**
 * Mutual Coupling Engine — Carter's Method (Phase 4)
 *
 * Closed-form mutual impedance between two side-by-side, parallel
 * half-wave dipoles using Carter's formulation expressed via the
 * sine and cosine integrals Si(x), Ci(x).
 *
 * Reference: Balanis, "Antenna Theory: Analysis and Design", §8.6
 *   R21 = (η / 4π) · [ 2·Ci(u0) − Ci(u1) − Ci(u2) ]
 *   X21 = −(η / 4π) · [ 2·Si(u0) − Si(u1) − Si(u2) ]
 *
 *   where, for parallel dipoles of length l = λ/2 separated by d,
 *     u0 = k·d
 *     u1 = k·(√(d² + l²) + l)
 *     u2 = k·(√(d² + l²) − l)
 *     k  = 2π/λ
 *     η  = 120π Ω
 *
 * Validation (Balanis Table 8.8): two λ/2 dipoles at d = 0.5λ
 *   → Z21 ≈ −12.52 + j29.91 Ω.
 */

const ETA = 120 * Math.PI;
const TWO_PI = 2 * Math.PI;

export interface Complex {
  re: number;
  im: number;
}

const C = (re: number, im: number): Complex => ({ re, im });
const cAdd = (a: Complex, b: Complex): Complex => C(a.re + b.re, a.im + b.im);
const cMul = (a: Complex, b: Complex): Complex =>
  C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cScale = (a: Complex, s: number): Complex => C(a.re * s, a.im * s);
const cAbs = (a: Complex): number => Math.hypot(a.re, a.im);

/** Sine integral Si(x) = ∫₀ˣ sin(t)/t dt. */
export function Si(x: number): number {
  if (x === 0) return 0;
  const ax = Math.abs(x);
  let result: number;
  if (ax <= 4) {
    let term = ax;
    let sum = ax;
    for (let n = 1; n < 100; n++) {
      term *= -(ax * ax) / ((2 * n) * (2 * n + 1));
      sum += term / (2 * n + 1);
      if (Math.abs(term) < 1e-15 * Math.abs(sum)) break;
    }
    result = sum;
  } else {
    const { f, g } = auxFG(ax);
    result = Math.PI / 2 - f * Math.cos(ax) - g * Math.sin(ax);
  }
  return x < 0 ? -result : result;
}

/** Cosine integral Ci(x). */
export function Ci(x: number): number {
  if (x <= 0) return Number.NEGATIVE_INFINITY;
  const EULER = 0.5772156649015329;
  if (x <= 4) {
    let term = 1;
    let sum = 0;
    for (let n = 1; n < 100; n++) {
      term *= -(x * x) / ((2 * n) * (2 * n - 1));
      sum += term / (2 * n);
      if (Math.abs(term) < 1e-15 * Math.abs(sum + 1)) break;
    }
    return EULER + Math.log(x) + sum;
  }
  const { f, g } = auxFG(x);
  return f * Math.sin(x) - g * Math.cos(x);
}

function auxFG(x: number): { f: number; g: number } {
  // Abramowitz & Stegun 5.2.38–5.2.39 rational approximations (~1e-7).
  const x2 = x * x;
  const num_f = x2 * (x2 * (x2 + 38.027264) + 265.187033) + 335.677320;
  const den_f =
    x2 * (x2 * (x2 * (x2 + 40.021433) + 322.624911) + 570.236280) + 335.677320;
  const num_g = x2 * (x2 * (x2 + 42.242855) + 302.757865) + 352.018498;
  const den_g =
    x2 * (x2 * (x2 * (x2 + 48.196927) + 482.485984) + 1114.978885) +
    1058.030099;
  return { f: num_f / (x * den_f), g: num_g / (x2 * den_g) };
}

/** Mutual impedance between two side-by-side parallel half-wave dipoles. */
export function mutualImpedanceParallelHalfwave(
  spacingM: number,
  wavelengthM: number,
): Complex {
  if (spacingM <= 0 || wavelengthM <= 0) return C(0, 0);
  const k = TWO_PI / wavelengthM;
  const l = wavelengthM / 2;
  const d = spacingM;
  const r = Math.sqrt(d * d + l * l);
  const u0 = k * d;
  const u1 = k * (r + l);
  const u2 = k * (r - l);
  const factor = ETA / (4 * Math.PI);
  const R = factor * (2 * Ci(u0) - Ci(u1) - Ci(u2));
  const X = -factor * (2 * Si(u0) - Si(u1) - Si(u2));
  return C(R, X);
}

export const HALFWAVE_SELF_IMPEDANCE: Complex = C(73.13, 42.54);

/** N×N mutual-impedance matrix for a uniform linear array of λ/2 dipoles. */
export function mutualImpedanceMatrix(
  numElements: number,
  spacingLambda: number,
): Complex[][] {
  const N = Math.max(1, Math.floor(numElements));
  const wl = 1;
  const Z: Complex[][] = [];
  for (let m = 0; m < N; m++) {
    Z.push([]);
    for (let n = 0; n < N; n++) {
      if (m === n) {
        Z[m].push({ ...HALFWAVE_SELF_IMPEDANCE });
      } else {
        const d = Math.abs(m - n) * spacingLambda * wl;
        Z[m].push(mutualImpedanceParallelHalfwave(d, wl));
      }
    }
  }
  return Z;
}

/** Per-element driving-point impedance:  Z_in,n = (Σ_m Z_nm · I_m) / I_n. */
export function activeImpedances(Z: Complex[][], I: Complex[]): Complex[] {
  const N = Z.length;
  const out: Complex[] = [];
  for (let n = 0; n < N; n++) {
    let sum = C(0, 0);
    for (let m = 0; m < N; m++) sum = cAdd(sum, cMul(Z[n][m], I[m]));
    const denom = I[n];
    const denomMag2 = denom.re * denom.re + denom.im * denom.im;
    if (denomMag2 < 1e-18) {
      out.push(C(0, 0));
    } else {
      const numer = cMul(sum, C(denom.re, -denom.im));
      out.push(cScale(numer, 1 / denomMag2));
    }
  }
  return out;
}

export interface CoupledArraySummary {
  numElements: number;
  spacingLambda: number;
  Z: Complex[][];
  activeZ: Complex[];
  averageActiveR: number;
  averageActiveX: number;
  selfR: number;
  couplingEfficiency: number;
  gainCorrectionDb: number;
}

export function summarizeCoupledArray(
  numElements: number,
  spacingLambda: number,
  progressivePhaseDeg: number = 0,
): CoupledArraySummary {
  const N = Math.max(1, Math.floor(numElements));
  const Z = mutualImpedanceMatrix(N, spacingLambda);
  const phase = (progressivePhaseDeg * Math.PI) / 180;
  const I: Complex[] = [];
  for (let n = 0; n < N; n++) {
    I.push(C(Math.cos(n * phase), Math.sin(n * phase)));
  }
  const Zact = activeImpedances(Z, I);
  let sumR = 0;
  let sumX = 0;
  for (const z of Zact) {
    sumR += z.re;
    sumX += z.im;
  }
  const avgR = sumR / Zact.length;
  const avgX = sumX / Zact.length;
  const selfR = HALFWAVE_SELF_IMPEDANCE.re;
  const couplingEfficiency = selfR > 0 ? Math.max(0, avgR / selfR) : 1;
  const ratio = Math.max(0.001, Math.min(2, couplingEfficiency));
  const gainCorrectionDb = Math.max(-6, Math.min(1.5, 10 * Math.log10(ratio)));

  return {
    numElements: N,
    spacingLambda,
    Z,
    activeZ: Zact,
    averageActiveR: avgR,
    averageActiveX: avgX,
    selfR,
    couplingEfficiency,
    gainCorrectionDb,
  };
}

export { cAbs as complexMagnitude };
