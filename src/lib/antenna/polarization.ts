/**
 * Antenna Polarization Engine
 *
 * Phase 2 of the Antenna Analyzer upgrade roadmap.
 * Decomposes a far-field into orthogonal Eθ / Eφ complex components
 * and derives the polarization scalars used in spacecraft link design:
 *
 *   - Axial ratio (AR)  = |E_max| / |E_min|   →  AR_dB = 20·log10(AR)
 *     AR = 1 (0 dB)  → perfect circular
 *     AR = ∞         → perfect linear
 *
 *   - Tilt angle τ      = ½·atan2(2·Re(Eθ·conj(Eφ)), |Eθ|² − |Eφ|²)
 *
 *   - Sense (RHCP / LHCP / Linear) — sign of Im(Eθ·conj(Eφ))
 *
 *   - Cross-Polarization Discrimination (XPD) — co-pol minus cross-pol gain.
 *
 * References:
 *   Balanis, "Antenna Theory", §2.12 (Polarization)
 *   ITU-R BO.1212  (axial-ratio definition)
 *
 * Pure additive layer — does not modify existing pattern math.
 */

export type PolarizationSense = "RHCP" | "LHCP" | "Linear" | "Elliptical";

export interface ComplexPair {
  /** Eθ component (real, imag). */
  Etheta: { re: number; im: number };
  /** Eφ component (real, imag). */
  Ephi: { re: number; im: number };
}

export interface PolarizationResult {
  axialRatio: number;            // linear, ≥ 1
  axialRatioDb: number;          // 20·log10(AR)
  tiltAngleDeg: number;          // −90..+90
  sense: PolarizationSense;
  copolMagnitude: number;        // |E_max|
  xpolMagnitude: number;         // |E_min|
  xpdDb: number;                 // 20·log10(co/cross)
  isCircular: boolean;           // AR_dB ≤ 3 (industry threshold)
  isLinear: boolean;             // AR_dB ≥ 30
}

const SQRT2 = Math.SQRT2;

/** Magnitude of a complex number. */
const cabs = (z: { re: number; im: number }) => Math.hypot(z.re, z.im);

/**
 * Decompose a far-field into polarization scalars.
 *
 * Most of the existing antenna models in `models-enhanced.ts` only return
 * power magnitudes, not phase. For canonical antennas we synthesize the
 * Eθ / Eφ phase relationship from the geometry tag — circular polarizers
 * (helix, crossed dipole, patch in CP mode) get a 90° quadrature feed,
 * everything else is treated as linear-vertical (Eθ only) or linear-horizontal
 * (Eφ only) per IEEE convention.
 *
 * If you have an explicit complex pair, pass it in `pair` to bypass synthesis.
 */
export function decomposePolarization(pair: ComplexPair): PolarizationResult {
  const Et = pair.Etheta;
  const Ep = pair.Ephi;

  const Et2 = Et.re * Et.re + Et.im * Et.im;
  const Ep2 = Ep.re * Ep.re + Ep.im * Ep.im;

  // Cross-product (Eθ · conj(Eφ)) = (a+bi)(c−di)
  const crossRe = Et.re * Ep.re + Et.im * Ep.im;
  const crossIm = Et.im * Ep.re - Et.re * Ep.im;

  // Stokes-like parameters
  const I = Et2 + Ep2;
  const Q = Et2 - Ep2;
  const U = 2 * crossRe;
  const V = 2 * crossIm;

  if (I <= 1e-30) {
    return {
      axialRatio: Infinity,
      axialRatioDb: Infinity,
      tiltAngleDeg: 0,
      sense: "Linear",
      copolMagnitude: 0,
      xpolMagnitude: 0,
      xpdDb: Infinity,
      isCircular: false,
      isLinear: true,
    };
  }

  // Eccentricity of the polarization ellipse → axial ratio
  const Lp = Math.sqrt(Math.max(0, Q * Q + U * U));      // linear part
  const aSq = 0.5 * (I + Math.sqrt(Q * Q + U * U + V * V));
  const bSq = 0.5 * (I - Math.sqrt(Q * Q + U * U + V * V));
  const a = Math.sqrt(Math.max(0, aSq));
  const b = Math.sqrt(Math.max(0, bSq));
  const ar = b > 1e-15 ? a / b : Infinity;
  const arDb = ar === Infinity ? Infinity : 20 * Math.log10(ar);

  // Tilt of the major axis
  const tilt = 0.5 * Math.atan2(U, Q) * (180 / Math.PI);

  // Sense classification
  let sense: PolarizationSense;
  if (arDb <= 3) {
    sense = V > 0 ? "RHCP" : "LHCP";
  } else if (arDb >= 30) {
    sense = "Linear";
  } else {
    sense = "Elliptical";
  }

  // Co-pol / cross-pol decomposition relative to the dominant axis (Ludwig-3)
  const copol = a;
  const xpol = b;
  const xpd = xpol > 1e-15 ? 20 * Math.log10(copol / xpol) : Infinity;

  // Suppress unused variable warning while documenting linear-magnitude term.
  void Lp;

  return {
    axialRatio: ar,
    axialRatioDb: arDb,
    tiltAngleDeg: tilt,
    sense,
    copolMagnitude: copol,
    xpolMagnitude: xpol,
    xpdDb: xpd,
    isCircular: arDb <= 3,
    isLinear: arDb >= 30,
  };
}

/**
 * Synthesize a complex Eθ / Eφ pair from a power magnitude and a polarization
 * label. This is what we use to bridge the existing scalar-power models to
 * the new polarization engine without touching the frozen physics.
 *
 *   linear-vertical    → Eθ only
 *   linear-horizontal  → Eφ only
 *   linear-slant-45    → equal real Eθ + Eφ
 *   rhcp / lhcp        → Eθ + j·Eφ  /  Eθ − j·Eφ  (90° quadrature)
 *   elliptical-3dB     → Eθ + 0.5j·Eφ  (illustrative imperfect CP)
 */
export function synthesizePolarizationPair(
  powerLinear: number,
  polarization: string,
): ComplexPair {
  const E = Math.sqrt(Math.max(0, powerLinear));
  switch (polarization) {
    case "linear-horizontal":
      return { Etheta: { re: 0, im: 0 }, Ephi: { re: E, im: 0 } };
    case "linear-slant-45":
    case "linear-slant":
      return {
        Etheta: { re: E / SQRT2, im: 0 },
        Ephi: { re: E / SQRT2, im: 0 },
      };
    case "rhcp":
    case "circular-rhcp":
      return {
        Etheta: { re: E / SQRT2, im: 0 },
        Ephi: { re: 0, im: E / SQRT2 },
      };
    case "lhcp":
    case "circular-lhcp":
      return {
        Etheta: { re: E / SQRT2, im: 0 },
        Ephi: { re: 0, im: -E / SQRT2 },
      };
    case "elliptical":
    case "elliptical-3db":
      return {
        Etheta: { re: E * 0.894, im: 0 },
        Ephi: { re: 0, im: E * 0.447 },
      };
    case "linear-vertical":
    default:
      return { Etheta: { re: E, im: 0 }, Ephi: { re: 0, im: 0 } };
  }
}

/** Convenience: full decomposition starting from peak power + a label. */
export function analyzePolarization(
  peakPowerLinear: number,
  polarization: string,
): PolarizationResult & { pair: ComplexPair } {
  const pair = synthesizePolarizationPair(peakPowerLinear, polarization);
  return { ...decomposePolarization(pair), pair };
}

/** Polarization-mismatch loss between TX and RX (dB).
 *  PLF = |ρ_t · ρ̂_r|² ; here we use the reduced AR/tilt formula:
 *    PLF = 0.5 + 0.5·(4·AR_t·AR_r) / ((AR_t² + 1)(AR_r² + 1))
 *          + 0.5·((AR_t² − 1)(AR_r² − 1)) / ((AR_t² + 1)(AR_r² + 1)) · cos(2Δτ)
 *  Returns positive dB loss (e.g. 0.5 = 0.5 dB attenuation).
 */
export function polarizationMismatchDb(
  txAR: number,
  rxAR: number,
  deltaTiltDeg: number,
): number {
  const a = Number.isFinite(txAR) ? txAR : 1e6;
  const b = Number.isFinite(rxAR) ? rxAR : 1e6;
  const a2 = a * a;
  const b2 = b * b;
  const denom = (a2 + 1) * (b2 + 1);
  const cos2 = Math.cos((2 * deltaTiltDeg * Math.PI) / 180);
  const plf = 0.5 + (2 * a * b) / denom + ((a2 - 1) * (b2 - 1) * cos2) / (2 * denom);
  const clipped = Math.max(1e-6, Math.min(1, plf));
  return -10 * Math.log10(clipped);
}