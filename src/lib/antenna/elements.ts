/**
 * Phase 8 — Antenna element zoo (closed-form models)
 *
 *   • Rectangular patch — cavity model (Balanis 14.2): fr, G, Zin, BW
 *   • Pyramidal horn   — Schelkunoff (Balanis 13.4):   gain, HPBW
 *   • Yagi-Uda          — empirical NEC fit (Viezbicke NBS Tech Note 688): G, F/B, BW
 *   • Helix (axial)     — Kraus (Balanis 10.3):        G, AR, HPBW, Zin
 *   • Log-periodic      — Carrel design eqs:           G, BW, # elements
 *   • Spiral (Archimedean) — self-complementary:       G, BW, AR
 *   • Slot (resonant λ/2) — Booker's relation:         G, Zin
 *
 * All values are first-principles educational — accurate to ~±1 dB / ±5 %.
 */

import { C } from "./math";

const ETA0 = 376.73;

// ───────────────── Patch (cavity model) ─────────────────
export interface PatchInputs {
  frequencyHz: number;       // design freq
  substrateEr: number;       // εr
  substrateHeightM: number;  // h
  widthM?: number;           // optional override
  lengthM?: number;          // optional override
}
export interface PatchResult {
  widthM: number;
  lengthM: number;
  effectiveEr: number;
  resonantFrequencyHz: number;
  inputResistanceOhms: number;
  directivityDbi: number;
  bandwidthFractional: number;
  efficiency: number;
}
export function analyzePatch(input: PatchInputs): PatchResult {
  const { frequencyHz, substrateEr: er, substrateHeightM: h } = input;
  const lambda0 = C / frequencyHz;
  // Balanis 14-6: optimum width
  const W = input.widthM ?? (C / (2 * frequencyHz)) * Math.sqrt(2 / (er + 1));
  // Effective εr (14-1)
  const eRe = (er + 1) / 2 + ((er - 1) / 2) * Math.pow(1 + 12 * (h / W), -0.5);
  // Length extension ΔL (14-2)
  const dL =
    0.412 * h * (((eRe + 0.3) * (W / h + 0.264)) / ((eRe - 0.258) * (W / h + 0.8)));
  const L = input.lengthM ?? C / (2 * frequencyHz * Math.sqrt(eRe)) - 2 * dL;
  const fr = C / (2 * (L + 2 * dL) * Math.sqrt(eRe));
  // Directivity (Balanis 14-57, single slot pair)
  const D = (4 * Math.PI * W * L) / (lambda0 * lambda0) * 0.9; // ~90 % efficiency
  const Ddbi = 10 * Math.log10(Math.max(D, 1));
  // Edge resistance (Balanis 14-17, broadside)
  const G1 = (W * W) / (90 * lambda0 * lambda0);
  const Rin = 1 / (2 * G1);
  // Fractional BW (Carver/Mink): 3.77·(εr−1)/εr² · (W/L)·(h/λ₀)
  const bw = (3.77 * (er - 1) * W * h) / (er * er * L * lambda0);
  return {
    widthM: W,
    lengthM: L,
    effectiveEr: eRe,
    resonantFrequencyHz: fr,
    inputResistanceOhms: Rin,
    directivityDbi: Ddbi,
    bandwidthFractional: bw,
    efficiency: 0.9,
  };
}

// ───────────────── Pyramidal horn (Schelkunoff) ─────────────────
export interface HornInputs {
  apertureWidthM: number;  // a (E-plane aperture)
  apertureHeightM: number; // b (H-plane aperture)
  frequencyHz: number;
}
export interface HornResult {
  gainDbi: number;
  hpbwEdeg: number;
  hpbwHdeg: number;
}
export function analyzeHorn(input: HornInputs): HornResult {
  const lambda = C / input.frequencyHz;
  const aWl = input.apertureWidthM / lambda;
  const bWl = input.apertureHeightM / lambda;
  // Schelkunoff approximation: G ≈ (4πAB / λ²) · ε_ap, ε_ap ≈ 0.51 for optimum
  const G = 4 * Math.PI * aWl * bWl * 0.51;
  return {
    gainDbi: 10 * Math.log10(G),
    hpbwEdeg: 56 / aWl, // empirical
    hpbwHdeg: 78 / bWl,
  };
}

// ───────────────── Yagi-Uda (NBS-688 empirical fit) ─────────────────
export interface YagiInputs { numElements: number; boomLengthWavelengths: number; }
export interface YagiResult { gainDbi: number; fbRatioDb: number; hpbwDeg: number; }
export function analyzeYagi(input: YagiInputs): YagiResult {
  const N = Math.max(2, input.numElements);
  // NBS-688 fit: G ≈ 10·log10(L/λ) + 11.3 dBi for typical optimised array
  const G = 11.3 + 10 * Math.log10(Math.max(0.4, input.boomLengthWavelengths));
  return {
    gainDbi: G,
    fbRatioDb: 8 + 1.5 * Math.log2(N),
    hpbwDeg: 60 / Math.sqrt(input.boomLengthWavelengths || 1),
  };
}

// ───────────────── Helix (axial mode, Kraus) ─────────────────
export interface HelixInputs {
  diameterM: number;
  pitchAngleDeg: number;
  numTurns: number;
  frequencyHz: number;
}
export interface HelixResult {
  gainDbi: number;
  hpbwDeg: number;
  axialRatio: number;
  inputResistanceOhms: number;
}
export function analyzeHelix(input: HelixInputs): HelixResult {
  const lambda = C / input.frequencyHz;
  const Cwl = (Math.PI * input.diameterM) / lambda; // circumference / λ
  const Swl = Cwl * Math.tan((input.pitchAngleDeg * Math.PI) / 180);
  const NSwl = input.numTurns * Swl;
  // Kraus: G = 6.2 · C² · N·S / λ³  (linear)
  const G = 6.2 * Cwl * Cwl * NSwl;
  const HPBW = 52 / (Cwl * Math.sqrt(NSwl));
  const AR = (2 * input.numTurns + 1) / (2 * input.numTurns);
  const Rin = 140 * Cwl;
  return {
    gainDbi: 10 * Math.log10(Math.max(G, 1)),
    hpbwDeg: HPBW,
    axialRatio: AR,
    inputResistanceOhms: Rin,
  };
}

// ───────────────── Log-periodic dipole (Carrel) ─────────────────
export interface LPDAInputs { tau: number; sigma: number; fLowHz: number; fHighHz: number; }
export interface LPDAResult { numElements: number; gainDbi: number; boomLengthM: number; }
export function analyzeLPDA(input: LPDAInputs): LPDAResult {
  const { tau, sigma, fLowHz, fHighHz } = input;
  // Carrel: alpha = atan((1−τ)/(4σ))
  const alpha = Math.atan((1 - tau) / (4 * sigma));
  // # elements (Carrel chart fit)
  const N = Math.ceil(1 + Math.log(fHighHz / fLowHz) / Math.log(1 / tau));
  // Gain ≈ 7 + 25·σ·(τ−0.85)·... approximated as table peak ~ 7–11 dBi
  const G = 7 + 30 * sigma * Math.max(0, tau - 0.85);
  const Llow = C / fLowHz / 2;
  const boom = (Llow / 2) * Math.tan(alpha) * (1 - Math.pow(tau, N));
  return { numElements: N, gainDbi: G, boomLengthM: Math.abs(boom) };
}

// ───────────────── Archimedean spiral (self-complementary) ─────────────────
export interface SpiralInputs { outerDiameterM: number; innerDiameterM: number; frequencyHz: number; }
export interface SpiralResult { gainDbi: number; bandwidthRatio: number; axialRatio: number; }
export function analyzeSpiral(input: SpiralInputs): SpiralResult {
  const lambda = C / input.frequencyHz;
  const Dwl = input.outerDiameterM / lambda;
  // Self-complementary spiral: ~ 5 dBi over 4:1 BW, AR ≈ 1 dB on-axis
  const G = 5 + 2 * Math.log10(Math.max(Dwl, 0.3));
  return {
    gainDbi: G,
    bandwidthRatio: input.outerDiameterM / Math.max(input.innerDiameterM, 1e-6),
    axialRatio: 1.0,
  };
}

// ───────────────── Resonant λ/2 slot (Booker) ─────────────────
export interface SlotInputs { frequencyHz: number; }
export interface SlotResult { lengthM: number; inputResistanceOhms: number; gainDbi: number; }
export function analyzeSlot(input: SlotInputs): SlotResult {
  const lambda = C / input.frequencyHz;
  // Booker: Z_slot · Z_dipole = η²/4 → Z_slot ≈ (η²/4)/73 ≈ 485 Ω
  return { lengthM: lambda / 2, inputResistanceOhms: (ETA0 * ETA0) / (4 * 73), gainDbi: 2.15 };
}