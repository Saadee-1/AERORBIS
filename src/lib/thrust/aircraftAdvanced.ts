/**
 * Advanced aircraft thrust-loading utilities (additive).
 *
 * Includes:
 *   - vnDiagram: V-n flight envelope (maneuver + gust lines, FAR 23/25)
 *   - serviceCeiling: Climb rate vs altitude, finds altitude where ROC → 100 fpm
 *   - dragPolar: CL vs CD parabolic polar
 *   - breguetRange / breguetEndurance for jet & prop
 *   - thrustLapse: Mattingly-style turbojet/turbofan/turboprop curves
 *   - sustainedTurnRate / cornerVelocity
 *
 * References: Mattingly "Aircraft Engine Design", Raymer "Aircraft Design",
 *   Anderson "Intro to Flight", FAR Part 23/25.
 */

import { calculateAtmosphere } from "@/tools/atmosphere/utils/calcAtmosphere";

const G = 9.80665;

// ---------------------------------------------------------------------------
// V-n diagram (FAR 25 transport-style)
// ---------------------------------------------------------------------------

export interface VnPoint { v: number; nPos: number; nNeg: number; nGustPos?: number; nGustNeg?: number; nStallPos?: number; nStallNeg?: number; }

export function vnDiagram(params: {
  wsKgPerM2: number;     // wing loading W/S (kg/m²)
  clMax: number;
  clMaxNeg?: number;     // negative CLmax (default 0.7 * positive)
  nLimitPos?: number;    // structural limit
  nLimitNeg?: number;
  vCruiseMs: number;
  vDiveMs?: number;      // default 1.4 * Vcruise
  altitudeM?: number;    // default 0
  uGustMs?: number;      // gust velocity, default 15.24 m/s (50 fps)
  steps?: number;
}): VnPoint[] {
  const {
    wsKgPerM2,
    clMax,
    vCruiseMs,
  } = params;
  const clMaxNeg = params.clMaxNeg ?? clMax * 0.7;
  const nLimitPos = params.nLimitPos ?? 2.5;
  const nLimitNeg = params.nLimitNeg ?? -1.0;
  const vDive = params.vDiveMs ?? 1.4 * vCruiseMs;
  const atm = calculateAtmosphere(params.altitudeM ?? 0, 0);
  const rho = atm.density;
  const Uref = params.uGustMs ?? 15.24;
  const steps = params.steps ?? 60;

  // Gust load factor (simplified): n = 1 + (rho * U * V * CLα) / (2 * W/S * g)
  // Use CLα = 2π/rad (thin airfoil)
  const CLa = 2 * Math.PI;
  const wsN = wsKgPerM2 * G;

  const out: VnPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const v = (vDive * i) / steps;
    const q = 0.5 * rho * v * v;
    const nStallPos = (q * clMax) / wsN;
    const nStallNeg = -(q * clMaxNeg) / wsN;
    const nPos = Math.min(nStallPos, nLimitPos);
    const nNeg = Math.max(nStallNeg, nLimitNeg);
    const nGustPos = v > 0 ? 1 + (rho * Uref * v * CLa) / (2 * wsN) : 1;
    const nGustNeg = v > 0 ? 1 - (rho * Uref * v * CLa) / (2 * wsN) : 1;
    out.push({ v, nPos, nNeg, nGustPos, nGustNeg, nStallPos, nStallNeg });
  }
  return out;
}

/** Corner velocity: where stall curve meets structural limit. V* = √(2 n_max W / (ρ S CLmax)) */
export function cornerVelocity(wsKgPerM2: number, clMax: number, nMax: number, altitudeM = 0): number {
  const atm = calculateAtmosphere(altitudeM, 0);
  const wsN = wsKgPerM2 * G;
  return Math.sqrt((2 * nMax * wsN) / (atm.density * clMax));
}

// ---------------------------------------------------------------------------
// Service ceiling — ROC vs altitude
// ---------------------------------------------------------------------------

export interface CeilingPoint { altM: number; rocMs: number; rocFpm: number; vBestMs: number; }

export function serviceCeilingSweep(params: {
  thrustN: number;
  weightN: number;
  wingAreaM2: number;
  cd0: number;
  k: number;
  thrustLapseExponent?: number; // T(h) = T0 * (rho/rho0)^n; jet ≈ 0.7, prop ≈ 1.0
  hMaxM?: number;
  steps?: number;
}): { points: CeilingPoint[]; serviceCeilingM: number; absoluteCeilingM: number } {
  const exp = params.thrustLapseExponent ?? 0.7;
  const hMax = params.hMaxM ?? 20000;
  const steps = params.steps ?? 40;
  const points: CeilingPoint[] = [];
  const rho0 = 1.225;
  let serviceCeilingM = 0;
  let absoluteCeilingM = 0;

  for (let i = 0; i <= steps; i++) {
    const h = (hMax * i) / steps;
    const atm = calculateAtmosphere(h, 0);
    const rho = atm.density;
    const T = params.thrustN * Math.pow(rho / rho0, exp);
    // V_best climb ≈ √(2W/(ρ S √(CD0/k)))
    const vBest = Math.sqrt((2 * params.weightN) / (rho * params.wingAreaM2 * Math.sqrt(params.cd0 / params.k)));
    // ROC = V (T/W − D/W),  D/W at L=W ≈ 2√(CD0 k)
    const dOverW = 2 * Math.sqrt(params.cd0 * params.k);
    const roc = vBest * (T / params.weightN - dOverW);
    const rocFpm = roc * 196.85;
    points.push({ altM: h, rocMs: roc, rocFpm, vBestMs: vBest });

    if (rocFpm >= 100) serviceCeilingM = h;
    if (roc > 0) absoluteCeilingM = h;
  }
  return { points, serviceCeilingM, absoluteCeilingM };
}

// ---------------------------------------------------------------------------
// Drag polar
// ---------------------------------------------------------------------------

export interface PolarPoint { cl: number; cd: number; ld: number; }

export function dragPolar(cd0: number, k: number, clMin = -0.5, clMax = 2.0, steps = 60): PolarPoint[] {
  const out: PolarPoint[] = [];
  const dCL = (clMax - clMin) / steps;
  for (let i = 0; i <= steps; i++) {
    const cl = clMin + dCL * i;
    const cd = cd0 + k * cl * cl;
    const ld = cd > 0 ? cl / cd : 0;
    out.push({ cl, cd, ld });
  }
  return out;
}

/** Maximum L/D and the CL at which it occurs. */
export function maxLD(cd0: number, k: number): { ldMax: number; clOpt: number } {
  const clOpt = Math.sqrt(cd0 / k);
  const ldMax = 1 / (2 * Math.sqrt(cd0 * k));
  return { ldMax, clOpt };
}

// ---------------------------------------------------------------------------
// Breguet range / endurance
// ---------------------------------------------------------------------------

/** Jet range:  R = (V/c) * (L/D) * ln(W0/W1)   [m] with c in 1/s (TSFC) */
export function breguetRangeJet(vMs: number, tsfcPerS: number, ld: number, w0: number, w1: number): number {
  if (!(tsfcPerS > 0) || !(ld > 0) || !(w0 > 0) || !(w1 > 0) || w1 >= w0) return 0;
  return (vMs / tsfcPerS) * ld * Math.log(w0 / w1);
}

/** Jet endurance: E = (1/c) * (L/D) * ln(W0/W1) [s] */
export function breguetEnduranceJet(tsfcPerS: number, ld: number, w0: number, w1: number): number {
  if (!(tsfcPerS > 0) || !(ld > 0) || w1 >= w0) return 0;
  return (1 / tsfcPerS) * ld * Math.log(w0 / w1);
}

/** Prop range: R = (η_p / c) * (L/D) * ln(W0/W1) [m], c in 1/s (BSFC*g) */
export function breguetRangeProp(etaProp: number, bsfcPerS: number, ld: number, w0: number, w1: number): number {
  if (!(bsfcPerS > 0) || !(ld > 0) || w1 >= w0) return 0;
  return (etaProp / bsfcPerS) * ld * Math.log(w0 / w1);
}

/** Prop endurance: E = (η/c) * (L/D) * √(2ρS/W1) * (1/√CL_E) … simplified version */
export function breguetEnduranceProp(etaProp: number, bsfcPerS: number, ld: number, w0: number, w1: number, vMs: number): number {
  if (!(bsfcPerS > 0) || !(ld > 0) || !(vMs > 0) || w1 >= w0) return 0;
  return (etaProp / bsfcPerS) * (ld / vMs) * Math.log(w0 / w1);
}

// ---------------------------------------------------------------------------
// Thrust lapse (Mattingly)
// ---------------------------------------------------------------------------

export type EngineClass = "turbojet" | "lowBypass" | "highBypass" | "turboprop";

export interface LapsePoint { altM: number; mach: number; thrustRatio: number; }

/**
 * Approximate installed-thrust lapse vs altitude & Mach.
 * Empirical Mattingly form: α = (ρ/ρ0)^n * f(M)
 */
export function thrustLapseSweep(eng: EngineClass, maxMach = 1.5, altSteps = 5, machSteps = 30): LapsePoint[] {
  const exponent: Record<EngineClass, number> = {
    turbojet: 0.7,
    lowBypass: 0.7,
    highBypass: 0.8,
    turboprop: 1.0,
  };
  const out: LapsePoint[] = [];
  const altitudes = [0, 3000, 6000, 9000, 12000].slice(0, altSteps);
  const rho0 = 1.225;

  for (const h of altitudes) {
    const atm = calculateAtmosphere(h, 0);
    const sigma = atm.density / rho0;
    for (let i = 0; i <= machSteps; i++) {
      const M = (maxMach * i) / machSteps;
      let fM = 1;
      switch (eng) {
        case "turbojet":
          fM = 1 - 0.3 * M + 0.1 * M * M;
          break;
        case "lowBypass":
          fM = 1 - 0.4 * M + 0.18 * M * M;
          break;
        case "highBypass":
          fM = 1 - 0.55 * M + 0.15 * M * M;
          break;
        case "turboprop":
          fM = 1 / Math.max(0.3, 1 + M * 1.5);
          break;
      }
      const ratio = Math.max(0, Math.pow(sigma, exponent[eng]) * fM);
      out.push({ altM: h, mach: M, thrustRatio: ratio });
    }
  }
  return out;
}

/** Sustained turn rate at a given speed and load factor. */
export function sustainedTurnRateDegPerS(vMs: number, nLoad: number): number {
  if (nLoad <= 1 || vMs <= 0) return 0;
  const omega = (G * Math.sqrt(nLoad * nLoad - 1)) / vMs;
  return omega * (180 / Math.PI);
}

export function turnRadiusM(vMs: number, nLoad: number): number {
  if (nLoad <= 1 || vMs <= 0) return Infinity;
  return (vMs * vMs) / (G * Math.sqrt(nLoad * nLoad - 1));
}