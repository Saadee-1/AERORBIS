/**
 * Phase 9 — Radar & RCS
 *
 *   • Radar range equation (mono/bistatic), SNR, max range, min detectable σ
 *   • Pulse / CW / FMCW: range resolution, unambiguous range, beat freq
 *   • Ambiguity function magnitude for a rectangular pulse
 *   • RCS of canonical shapes (PO + GTD): sphere, flat plate, cylinder,
 *     dihedral, trihedral
 *   • SAR: range / azimuth resolution, swath width
 *
 * References: Skolnik "Radar Handbook" 3e; Knott "Radar Cross Section" 2e.
 */

import { C } from "./math";

const K_BOLTZMANN = 1.380649e-23;

export interface RadarRangeInputs {
  ptW: number;            // peak transmit power
  gainDbi: number;        // antenna gain (mono → both Gt = Gr)
  frequencyHz: number;
  rcsM2: number;          // target RCS σ
  noiseFigureDb: number;
  bandwidthHz: number;
  systemLossDb?: number;
  rangeM: number;         // for SNR calc
  systemTempK?: number;
}
export interface RadarRangeResult {
  receivedPowerW: number;
  noisePowerW: number;
  snrDb: number;
  maxRangeMforSnr0Db: number;
}
export function radarRange(input: RadarRangeInputs): RadarRangeResult {
  const lambda = C / input.frequencyHz;
  const G = Math.pow(10, input.gainDbi / 10);
  const Ls = Math.pow(10, (input.systemLossDb ?? 0) / 10);
  const T = input.systemTempK ?? 290;
  const F = Math.pow(10, input.noiseFigureDb / 10);
  // Pr = Pt G² λ² σ / ((4π)³ R⁴ Ls)
  const Pr =
    (input.ptW * G * G * lambda * lambda * input.rcsM2) /
    (Math.pow(4 * Math.PI, 3) * Math.pow(input.rangeM, 4) * Ls);
  const Pn = K_BOLTZMANN * T * input.bandwidthHz * F;
  const snr = 10 * Math.log10(Pr / Pn);
  // Solve Pr = Pn for R⁴ → max range (unity SNR)
  const Rmax4 =
    (input.ptW * G * G * lambda * lambda * input.rcsM2) /
    (Math.pow(4 * Math.PI, 3) * Pn * Ls);
  return {
    receivedPowerW: Pr,
    noisePowerW: Pn,
    snrDb: snr,
    maxRangeMforSnr0Db: Math.pow(Rmax4, 0.25),
  };
}

/** Pulse radar: range resolution ΔR = c·τ/2. */
export function pulseRangeResolutionM(pulseWidthSec: number): number {
  return (C * pulseWidthSec) / 2;
}

/** Unambiguous range Ru = c/(2·PRF). */
export function unambiguousRangeM(prfHz: number): number {
  return C / (2 * prfHz);
}

/** FMCW beat frequency fb = 2·R·B / (c·T_sweep). */
export function fmcwBeatFrequencyHz(rangeM: number, sweepBwHz: number, sweepTimeSec: number): number {
  return (2 * rangeM * sweepBwHz) / (C * sweepTimeSec);
}

/** Magnitude of the ambiguity function χ(τ,ν) for a rectangular pulse of width T. */
export function rectPulseAmbiguity(tauSec: number, doppHz: number, pulseWidthSec: number): number {
  const T = pulseWidthSec;
  if (Math.abs(tauSec) >= T) return 0;
  const arg = Math.PI * doppHz * (T - Math.abs(tauSec));
  if (Math.abs(arg) < 1e-12) return 1 - Math.abs(tauSec) / T;
  return Math.abs(((1 - Math.abs(tauSec) / T) * Math.sin(arg)) / arg);
}

// ───────────────── RCS of canonical shapes ─────────────────

/** Sphere RCS — Mie/optical regime (a ≫ λ → σ = π·a²). */
export function rcsSphereM2(radiusM: number, frequencyHz: number): number {
  const ka = (2 * Math.PI * radiusM) / (C / frequencyHz);
  if (ka < 1) {
    // Rayleigh regime σ = (4/9) · (2π/λ)⁴ · a⁶ · 9 = 9·π·a²·(ka)⁴ (approx)
    return 9 * Math.PI * radiusM * radiusM * Math.pow(ka, 4);
  }
  return Math.PI * radiusM * radiusM;
}

/** Flat plate RCS — broadside PO: σ = 4π·A²/λ². */
export function rcsFlatPlateM2(areaM2: number, frequencyHz: number): number {
  const lambda = C / frequencyHz;
  return (4 * Math.PI * areaM2 * areaM2) / (lambda * lambda);
}

/** Cylinder RCS (broadside, a ≫ λ): σ = 2π·a·L²/λ. */
export function rcsCylinderM2(radiusM: number, lengthM: number, frequencyHz: number): number {
  const lambda = C / frequencyHz;
  return (2 * Math.PI * radiusM * lengthM * lengthM) / lambda;
}

/** Dihedral corner reflector (90°, square side a): σ = 8π·a⁴/λ². */
export function rcsDihedralM2(sideM: number, frequencyHz: number): number {
  const lambda = C / frequencyHz;
  return (8 * Math.PI * Math.pow(sideM, 4)) / (lambda * lambda);
}

/** Trihedral corner reflector (square legs a): σ = 12π·a⁴/λ². */
export function rcsTrihedralM2(sideM: number, frequencyHz: number): number {
  const lambda = C / frequencyHz;
  return (12 * Math.PI * Math.pow(sideM, 4)) / (lambda * lambda);
}

export function toDbsm(rcsM2: number): number {
  return 10 * Math.log10(Math.max(rcsM2, 1e-30));
}

// ───────────────── SAR resolution ─────────────────
export interface SARInputs {
  bandwidthHz: number;       // chirp BW for range res
  apertureLengthM: number;   // physical antenna length L
  rangeM: number;
  frequencyHz: number;
  velocityMps: number;
  prfHz: number;
}
export interface SARResult {
  rangeResolutionM: number;
  azimuthResolutionM: number;
  swathWidthM: number;
}
export function analyzeSAR(input: SARInputs): SARResult {
  const lambda = C / input.frequencyHz;
  const dRange = C / (2 * input.bandwidthHz);
  // Stripmap SAR: δaz = L/2
  const dAz = input.apertureLengthM / 2;
  // Swath = c / (2·PRF) projected to ground (assume nadir-look 0°)
  const swath = C / (2 * input.prfHz);
  return { rangeResolutionM: dRange, azimuthResolutionM: dAz, swathWidthM: swath };
}