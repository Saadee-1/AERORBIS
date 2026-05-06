/**
 * Phase 7 — Propagation & link models
 *
 * Closed-form / engineering approximations of:
 *   • ITU-R P.525   — free-space basic transmission loss
 *   • ITU-R P.676   — gaseous attenuation (O₂ + H₂O), simplified curve fit
 *   • ITU-R P.838   — rain specific attenuation γ_R = k·R^α (Ku/Ka coeffs)
 *   • ITU-R P.618   — slant-path rain (uses 838 + effective path length)
 *   • Two-ray ground reflection (Friis at short range, 1/d⁴ asymptote)
 *   • Knife-edge diffraction (Fresnel-Kirchhoff, J(v) approximation)
 *   • Doppler shift (relative-velocity geometry)
 *
 * All formulas are educational closed-form; not regulator-grade.
 */

import { C } from "./math";

/** ITU-R P.525 free-space loss (dB). f in Hz, d in m. */
export function fsplDb(frequencyHz: number, distanceM: number): number {
  const lambda = C / frequencyHz;
  return 20 * Math.log10((4 * Math.PI * distanceM) / lambda);
}

/** ITU-R P.676 simplified gaseous attenuation in dB/km at sea level, 7.5 g/m³ H₂O. */
export function gaseousSpecificAttenuationDbPerKm(frequencyGhz: number): number {
  const f = frequencyGhz;
  // Oxygen (Liebig fit, peak ~60 GHz)
  const gO =
    (7.2 / (f * f + 0.34)) +
    (0.62 / (Math.pow(f - 57, 2) + 1.16));
  // Water vapour (peak ~22 GHz)
  const gH = 0.067 + 3.0 / (Math.pow(f - 22.235, 2) + 9.81);
  return Math.max(0, (gO + gH) * (f * f) * 1e-3);
}

/** ITU-R P.838 rain k/α coefficients (horizontal pol) — interpolated table. */
function rainCoeffs(frequencyGhz: number): { k: number; alpha: number } {
  // Coarse table from Rec. ITU-R P.838-3 (horizontal). Linear interp.
  const tbl: Array<[number, number, number]> = [
    [1, 0.0000259, 0.9691],
    [4, 0.000650, 1.121],
    [10, 0.0101, 1.276],
    [12, 0.0188, 1.217],
    [15, 0.0367, 1.154],
    [20, 0.0751, 1.099],
    [30, 0.187, 1.021],
    [40, 0.350, 0.939],
    [60, 0.707, 0.826],
    [100, 1.187, 0.732],
  ];
  if (frequencyGhz <= tbl[0][0]) return { k: tbl[0][1], alpha: tbl[0][2] };
  if (frequencyGhz >= tbl[tbl.length - 1][0]) {
    const last = tbl[tbl.length - 1];
    return { k: last[1], alpha: last[2] };
  }
  for (let i = 0; i < tbl.length - 1; i++) {
    const [f0, k0, a0] = tbl[i];
    const [f1, k1, a1] = tbl[i + 1];
    if (frequencyGhz >= f0 && frequencyGhz <= f1) {
      const t = (frequencyGhz - f0) / (f1 - f0);
      return { k: k0 + t * (k1 - k0), alpha: a0 + t * (a1 - a0) };
    }
  }
  return { k: 0.01, alpha: 1 };
}

/** ITU-R P.838 specific rain attenuation γR = k·R^α  (dB/km). */
export function rainSpecificAttenuationDbPerKm(frequencyGhz: number, rainRateMmPerHr: number): number {
  if (rainRateMmPerHr <= 0) return 0;
  const { k, alpha } = rainCoeffs(frequencyGhz);
  return k * Math.pow(rainRateMmPerHr, alpha);
}

/** Two-ray ground-reflection received power vs distance (linear, W). */
export function twoRayReceivedPowerW(args: {
  ptW: number;
  gtLin: number;
  grLin: number;
  htM: number;
  hrM: number;
  distanceM: number;
  frequencyHz: number;
}): number {
  const { ptW, gtLin, grLin, htM, hrM, distanceM, frequencyHz } = args;
  const lambda = C / frequencyHz;
  const dCross = (4 * Math.PI * htM * hrM) / lambda;
  if (distanceM < dCross) {
    // Friis regime
    return (ptW * gtLin * grLin * lambda * lambda) / Math.pow(4 * Math.PI * distanceM, 2);
  }
  // Plane-earth (1/d⁴) asymptote
  return (ptW * gtLin * grLin * Math.pow(htM * hrM, 2)) / Math.pow(distanceM, 4);
}

/** Knife-edge diffraction loss (dB). v = Fresnel-Kirchhoff parameter. */
export function knifeEdgeLossDb(v: number): number {
  if (v <= -0.78) return 0;
  // ITU-R P.526 J(v) approximation
  return 6.9 + 20 * Math.log10(Math.sqrt((v - 0.1) ** 2 + 1) + v - 0.1);
}

/** Geometric Fresnel-Kirchhoff parameter v for a single knife edge. */
export function fresnelKirchhoffV(args: {
  obstacleHeightM: number; // height of edge above LOS
  d1M: number;             // tx → edge
  d2M: number;             // edge → rx
  frequencyHz: number;
}): number {
  const lambda = C / args.frequencyHz;
  return args.obstacleHeightM * Math.sqrt((2 * (args.d1M + args.d2M)) / (lambda * args.d1M * args.d2M));
}

/** Doppler shift Δf = (vrel / c) · f  (Hz). +ve when closing. */
export function dopplerShiftHz(frequencyHz: number, relativeVelocityMps: number): number {
  return (relativeVelocityMps / C) * frequencyHz;
}

export interface PropagationLinkResult {
  fsplDb: number;
  gaseousDb: number;
  rainDb: number;
  totalLossDb: number;
}

/** End-to-end ITU-R P.525+676+838 budget (clear-air + rain). */
export function itutLinkLossDb(args: {
  frequencyHz: number;
  distanceKm: number;
  rainRateMmPerHr?: number;
  rainPathKm?: number;
}): PropagationLinkResult {
  const fGhz = args.frequencyHz / 1e9;
  const dM = args.distanceKm * 1000;
  const fsp = fsplDb(args.frequencyHz, dM);
  const gas = gaseousSpecificAttenuationDbPerKm(fGhz) * args.distanceKm;
  const rain =
    rainSpecificAttenuationDbPerKm(fGhz, args.rainRateMmPerHr ?? 0) *
    (args.rainPathKm ?? args.distanceKm);
  return { fsplDb: fsp, gaseousDb: gas, rainDb: rain, totalLossDb: fsp + gas + rain };
}