/**
 * Antenna Bandwidth / Frequency-Sweep Engine
 *
 * Phase 1 of the Antenna Analyzer upgrade roadmap.
 * Pure additive layer — does NOT modify any existing physics.
 * Re-uses the existing `computePatternFromRegistry` to evaluate scalar
 * performance metrics (peak gain, HPBW, FBR, SLL) across a frequency band.
 *
 * From the resulting curve we derive:
 *   - −3 dB gain bandwidth (relative to peak gain in band)
 *   - Fractional bandwidth %  =  BW / f_center * 100
 *   - Gain flatness (peak-to-trough variation, dB)
 *
 * References:
 *   Balanis, "Antenna Theory", §9.5 (impedance bandwidth) — we approximate
 *   pattern bandwidth which is the operational definition for fixed-beam apps.
 */

import {
  computePatternFromRegistry,
  validatePatternResult,
} from "./data/antennaRegistry";
import type {
  AntennaGeometry,
  PatternOptions,
} from "./models-enhanced";

export interface SweepPoint {
  frequencyHz: number;
  frequencyMHz: number;
  gainDbi: number;
  hpbwMajorDeg: number;
  hpbwMinorDeg: number;
  fbrDb: number;
  sllDb: number;
}

export interface SweepSummary {
  centerFrequencyHz: number;
  peakGainDbi: number;
  peakGainFrequencyHz: number;
  bandwidth3dBHz: number | null;
  fractionalBandwidthPct: number | null;
  gainFlatnessDb: number;
  sampleCount: number;
}

export interface SweepResult {
  points: SweepPoint[];
  summary: SweepSummary;
  warnings: string[];
}

export interface SweepOptions {
  /** Number of frequency samples (default 41). */
  steps?: number;
  /** Logarithmic vs linear spacing (default linear). */
  spacing?: "linear" | "log";
  /** Resolution caps for the per-point pattern call. */
  numTheta?: number;
  numPhi?: number;
}

const DEFAULTS: Required<SweepOptions> = {
  steps: 41,
  spacing: "linear",
  numTheta: 91,
  numPhi: 181,
};

/**
 * Sweep an antenna across [fMin, fMax] and return per-frequency scalars.
 *
 * The function is intentionally synchronous + cheap: each call uses a
 * coarse grid (91×181 by default) so a 41-point sweep stays well under
 * 300 ms on modern hardware. For finer analysis, call from a worker.
 */
export function runFrequencySweep(
  antennaId: string,
  geometry: AntennaGeometry,
  fMinHz: number,
  fMaxHz: number,
  opts: SweepOptions = {},
): SweepResult {
  const { steps, spacing, numTheta, numPhi } = { ...DEFAULTS, ...opts };
  const warnings: string[] = [];

  if (!Number.isFinite(fMinHz) || !Number.isFinite(fMaxHz) || fMinHz <= 0 || fMaxHz <= 0) {
    throw new Error("Sweep frequencies must be positive finite numbers");
  }
  if (fMaxHz <= fMinHz) {
    throw new Error("fMax must be greater than fMin");
  }
  const N = Math.max(5, Math.floor(steps));

  const freqs: number[] = [];
  if (spacing === "log") {
    const logMin = Math.log10(fMinHz);
    const logMax = Math.log10(fMaxHz);
    for (let i = 0; i < N; i++) {
      freqs.push(Math.pow(10, logMin + (i * (logMax - logMin)) / (N - 1)));
    }
  } else {
    for (let i = 0; i < N; i++) {
      freqs.push(fMinHz + (i * (fMaxHz - fMinHz)) / (N - 1));
    }
  }

  const patternOpts: PatternOptions = {
    numTheta,
    numPhi,
    efficiency: 1.0,
    dBFloor: -80,
    normalize: true,
    fastPreview: true,
  };

  const points: SweepPoint[] = [];
  for (const fHz of freqs) {
    try {
      const r = computePatternFromRegistry(antennaId, fHz, geometry, patternOpts);
      if (!validatePatternResult(r)) continue;
      const s = r.scalars;
      points.push({
        frequencyHz: fHz,
        frequencyMHz: fHz / 1e6,
        gainDbi: Number.isFinite(s.G_dBi) ? s.G_dBi : -80,
        hpbwMajorDeg: Number.isFinite(s.HPBW_major_deg) ? s.HPBW_major_deg : NaN,
        hpbwMinorDeg: Number.isFinite(s.HPBW_minor_deg) ? s.HPBW_minor_deg : NaN,
        fbrDb: Number.isFinite(s.FBR_dB) ? s.FBR_dB : NaN,
        sllDb: Number.isFinite(s.SLL_dB) ? s.SLL_dB : NaN,
      });
    } catch (err) {
      warnings.push(
        `Sweep skipped f=${(fHz / 1e6).toFixed(2)} MHz: ${(err as Error).message}`,
      );
    }
  }

  if (points.length === 0) {
    return {
      points: [],
      summary: {
        centerFrequencyHz: 0.5 * (fMinHz + fMaxHz),
        peakGainDbi: NaN,
        peakGainFrequencyHz: NaN,
        bandwidth3dBHz: null,
        fractionalBandwidthPct: null,
        gainFlatnessDb: 0,
        sampleCount: 0,
      },
      warnings: [...warnings, "No valid sweep points were produced."],
    };
  }

  // Peak / flatness
  let peakGainDbi = -Infinity;
  let minGainDbi = Infinity;
  let peakF = points[0].frequencyHz;
  for (const p of points) {
    if (p.gainDbi > peakGainDbi) {
      peakGainDbi = p.gainDbi;
      peakF = p.frequencyHz;
    }
    if (p.gainDbi < minGainDbi) minGainDbi = p.gainDbi;
  }

  // −3 dB bandwidth — find first crossing of (peak − 3 dB) on each side of peakF.
  const threshold = peakGainDbi - 3;
  let lowerEdge: number | null = null;
  let upperEdge: number | null = null;

  // Walk leftwards from peak
  for (let i = points.findIndex((p) => p.frequencyHz === peakF); i > 0; i--) {
    const a = points[i];
    const b = points[i - 1];
    if (b.gainDbi <= threshold && a.gainDbi >= threshold) {
      const t = (threshold - b.gainDbi) / (a.gainDbi - b.gainDbi);
      lowerEdge = b.frequencyHz + t * (a.frequencyHz - b.frequencyHz);
      break;
    }
  }
  // Walk rightwards from peak
  for (let i = points.findIndex((p) => p.frequencyHz === peakF); i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a.gainDbi >= threshold && b.gainDbi <= threshold) {
      const t = (threshold - a.gainDbi) / (b.gainDbi - a.gainDbi);
      upperEdge = a.frequencyHz + t * (b.frequencyHz - a.frequencyHz);
      break;
    }
  }

  const bw =
    lowerEdge !== null && upperEdge !== null && upperEdge > lowerEdge
      ? upperEdge - lowerEdge
      : null;
  const fc = bw !== null ? 0.5 * ((lowerEdge as number) + (upperEdge as number)) : peakF;
  const fbwPct = bw !== null && fc > 0 ? (bw / fc) * 100 : null;

  if (bw === null) {
    warnings.push(
      "Could not locate −3 dB band edges within the sweep range — try widening fMin/fMax.",
    );
  }

  return {
    points,
    summary: {
      centerFrequencyHz: fc,
      peakGainDbi,
      peakGainFrequencyHz: peakF,
      bandwidth3dBHz: bw,
      fractionalBandwidthPct: fbwPct,
      gainFlatnessDb: peakGainDbi - minGainDbi,
      sampleCount: points.length,
    },
    warnings,
  };
}

/**
 * Convenience helper — build a default sweep range (±10 % around f0) when
 * the user has not specified one yet.
 */
export function defaultSweepRange(centerHz: number): { fMinHz: number; fMaxHz: number } {
  const f0 = Math.max(1, centerHz);
  return { fMinHz: f0 * 0.9, fMaxHz: f0 * 1.1 };
}