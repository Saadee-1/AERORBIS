/**
 * Advanced Stall Model Layer for L/D Analyzer
 * 
 * This module takes raw PolarData and returns an EnhancedPolar with:
 * - Denser alpha sampling
 * - Realistic post-stall CL drop and CD rise
 * - Stall metadata (CLmax, alpha_stall, stallBehaviour)
 */

import type { PolarData } from "@/lib/pdfExport";

export type StallBehaviour = "soft" | "moderate" | "sharp" | "supercritical";

export interface StallMeta {
  stallBehaviour: StallBehaviour;
  clMax: number;
  alphaStallDeg: number;
  cdAtStall: number;
  cmAtStall: number;
}

export interface PolarMeta {
  source?: string;
  generated_at?: string;
  filter?: string;
  notes?: string;
  cm_estimated?: boolean;
  stall_alpha?: number;
}

export interface EnhancedPolar {
  meta: PolarMeta & StallMeta;
  alpha_deg: number[];
  cl: number[];
  cd: number[];
  cm: number[];
}

/**
 * Extract stall features from raw polar data
 */
export function extractStallFeatures(raw: PolarData): {
  clAlpha: number;
  clMax: number;
  alphaClMax: number;
  clDrop: number;
  cdMin: number;
  cdAtClMax: number;
  cmMean: number;
  cmRange: number;
} {
  const { alpha, cl, cd, cm } = raw;

  // Filter valid data points
  const validIndices: number[] = [];
  for (let i = 0; i < alpha.length; i++) {
    if (
      Number.isFinite(alpha[i]) &&
      Number.isFinite(cl[i]) &&
      Number.isFinite(cd[i])
    ) {
      validIndices.push(i);
    }
  }

  if (validIndices.length === 0) {
    throw new Error("No valid data points in polar");
  }

  // Compute clAlpha: slope from first 3-5 pre-stall points
  const preStallCount = Math.min(5, Math.floor(validIndices.length * 0.3));
  let clAlpha = 0.1; // default fallback
  if (preStallCount >= 2) {
    const preStallIndices = validIndices.slice(0, preStallCount);
    let sumDeltaCl = 0;
    let sumDeltaAlpha = 0;
    for (let i = 1; i < preStallIndices.length; i++) {
      const idx1 = preStallIndices[i - 1];
      const idx2 = preStallIndices[i];
      const deltaAlpha = alpha[idx2] - alpha[idx1];
      const deltaCl = cl[idx2] - cl[idx1];
      if (deltaAlpha > 0) {
        sumDeltaCl += deltaCl;
        sumDeltaAlpha += deltaAlpha;
      }
    }
    if (sumDeltaAlpha > 0) {
      clAlpha = sumDeltaCl / sumDeltaAlpha;
    }
  }

  // Compute clMax and alphaClMax
  let clMax = -Infinity;
  let idxMax = -1;
  for (const idx of validIndices) {
    if (cl[idx] > clMax) {
      clMax = cl[idx];
      idxMax = idx;
    }
  }
  const alphaClMax = idxMax >= 0 ? alpha[idxMax] : 0;

  // Compute clDrop: clMax - CL at alphaClMax + 2° (if available)
  let clDrop = 0;
  if (idxMax >= 0) {
    const targetAlpha = alphaClMax + 2;
    // Find closest point after stall
    let closestIdx = -1;
    let minDiff = Infinity;
    for (const idx of validIndices) {
      if (alpha[idx] > alphaClMax) {
        const diff = Math.abs(alpha[idx] - targetAlpha);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      }
    }
    if (closestIdx >= 0) {
      clDrop = clMax - cl[closestIdx];
    }
  }

  // Compute cdMin
  let cdMin = Infinity;
  for (const idx of validIndices) {
    if (cd[idx] < cdMin) {
      cdMin = cd[idx];
    }
  }

  // Compute cdAtClMax (CD at the exact alpha where CL is maximum)
  // Interpolate CD at alphaClMax for better accuracy
  let cdAtClMax = idxMax >= 0 ? cd[idxMax] : cdMin;
  
  // If we have surrounding points, interpolate for better accuracy
  if (idxMax >= 0 && idxMax > 0 && idxMax < alpha.length - 1) {
    const alphaAtMax = alpha[idxMax];
    // Use linear interpolation if we have points on both sides
    const cdInterp = interpolateAtAlpha(alphaAtMax, alpha, cd);
    if (cdInterp !== null) {
      cdAtClMax = cdInterp;
    }
  }

  // Compute cmMean and cmRange
  let cmMean = 0;
  let cmRange = 0;
  if (cm && cm.length > 0) {
    const validCm = cm.filter(c => Number.isFinite(c));
    if (validCm.length > 0) {
      cmMean = validCm.reduce((a, b) => a + b, 0) / validCm.length;
      const cmMin = Math.min(...validCm);
      const cmMax = Math.max(...validCm);
      cmRange = cmMax - cmMin;
    }
  }

  return {
    clAlpha,
    clMax,
    alphaClMax,
    clDrop,
    cdMin,
    cdAtClMax,
    cmMean,
    cmRange,
  };
}

/**
 * Classify stall behaviour based on features and airfoil family
 */
export function classifyStallBehaviour(
  features: ReturnType<typeof extractStallFeatures>,
  family?: string
): StallBehaviour {
  const { clDrop } = features;
  const familyLower = (family || "").toLowerCase();

  // STOL airfoils typically have soft stalls
  if (familyLower.includes("stol") || clDrop < 0.05) {
    return "soft";
  }

  // Laminar flow airfoils (63-, 64-) with high drop are sharp
  if (
    (familyLower.includes("laminar") ||
      familyLower.includes("63-") ||
      familyLower.includes("64-")) &&
    clDrop > 0.15
  ) {
    return "sharp";
  }

  // Supercritical airfoils
  if (familyLower.includes("supercritical")) {
    return "supercritical";
  }

  // Default to moderate
  return "moderate";
}

/**
 * Model post-stall CL and CD values
 * Uses smooth, stable formulas to avoid oscillations
 */
function modelPostStall(alpha: number, stall: StallMeta): { cl: number; cd: number } {
  const dA = alpha - stall.alphaStallDeg;

  // Smooth CL drop after stall (unified formula, no behavior-dependent variations)
  let cl = stall.clMax * Math.exp(-0.22 * dA);

  // Smooth CD rise after stall (monotonic, strictly increasing)
  let cd = stall.cdAtStall + 0.015 * Math.pow(dA, 1.5);

  // Stabilizers / clamps
  if (cl < -0.2) cl = -0.2;                 // don't let CL go too negative
  if (cd < stall.cdAtStall) cd = stall.cdAtStall;  // ensure CD doesn't decrease
  if (cd > 2.4) cd = 2.4;                   // cap CD for very high alpha

  return { cl, cd };
}

/**
 * Model post-stall CM values
 * Gradually becomes more negative after stall (no vertical cliff)
 */
function modelPostStallCm(alpha: number, stall: StallMeta): number {
  const dA = alpha - stall.alphaStallDeg;

  // Behaviour-based slope: how fast Cm becomes more negative after stall
  let slopePerDeg: number;
  switch (stall.stallBehaviour) {
    case "soft":
      slopePerDeg = -0.002;
      break;
    case "moderate":
      slopePerDeg = -0.004;
      break;
    case "sharp":
    case "supercritical":
    default:
      slopePerDeg = -0.006;
      break;
  }

  let cm = stall.cmAtStall + slopePerDeg * dA;

  // Clamp so we don't go crazy
  if (cm < -0.4) cm = -0.4;
  if (cm > 0.2) cm = 0.2;

  return cm;
}

/**
 * Linear interpolation helper
 */
function linearInterpolate(
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  if (Math.abs(x2 - x1) < 1e-6) return y1;
  return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
}

/**
 * Interpolate value from polar data at given alpha
 */
function interpolateAtAlpha(
  alpha: number,
  polarAlpha: number[],
  polarValues: number[]
): number | null {
  // Find surrounding points
  let idx1 = -1;
  let idx2 = -1;

  for (let i = 0; i < polarAlpha.length; i++) {
    if (polarAlpha[i] <= alpha) {
      idx1 = i;
    }
    if (polarAlpha[i] >= alpha && idx2 === -1) {
      idx2 = i;
      break;
    }
  }

  // Exact match
  if (idx1 >= 0 && Math.abs(polarAlpha[idx1] - alpha) < 1e-6) {
    return polarValues[idx1];
  }
  if (idx2 >= 0 && Math.abs(polarAlpha[idx2] - alpha) < 1e-6) {
    return polarValues[idx2];
  }

  // Interpolate
  if (idx1 >= 0 && idx2 >= 0 && idx1 !== idx2) {
    return linearInterpolate(
      alpha,
      polarAlpha[idx1],
      polarValues[idx1],
      polarAlpha[idx2],
      polarValues[idx2]
    );
  }

  // Extrapolate (use closest point)
  if (idx1 >= 0) return polarValues[idx1];
  if (idx2 >= 0) return polarValues[idx2];

  return null;
}

/**
 * Interpolate full polar data (CL, CD, CM) at given alpha
 */
function interpolatePolar(
  raw: PolarData,
  alpha: number,
  fallbackCm?: number
): { cl: number; cd: number; cm: number } {
  const cl = interpolateAtAlpha(alpha, raw.alpha, raw.cl);
  const cd = interpolateAtAlpha(alpha, raw.alpha, raw.cd);
  const cm = raw.cm ? interpolateAtAlpha(alpha, raw.alpha, raw.cm) : null;

  // Compute fallback CD (minimum CD in data)
  let cdMin = Infinity;
  for (let i = 0; i < raw.cd.length; i++) {
    if (Number.isFinite(raw.cd[i]) && raw.cd[i] < cdMin) {
      cdMin = raw.cd[i];
    }
  }
  if (!Number.isFinite(cdMin)) cdMin = 0.01;
  
  return {
    cl: cl !== null ? cl : 0,
    cd: cd !== null ? cd : cdMin,
    cm: cm !== null ? cm : (fallbackCm ?? 0),
  };
}

/**
 * Build enhanced polar with dense sampling and post-stall modeling
 */
export function buildEnhancedPolar(
  raw: PolarData,
  airfoilId: string,
  family?: string
): EnhancedPolar {
  // Extract stall features
  const features = extractStallFeatures(raw);
  const stallBehaviour = classifyStallBehaviour(features, family);

  // Determine stall angle and CD/CM at stall
  const alphaStall = features.alphaClMax;
  const cdAtStall = features.cdAtClMax;
  
  // Compute CM at stall (interpolate at exact stall angle)
  const cmAtStall = interpolateAtAlpha(alphaStall, raw.alpha, raw.cm || []);
  const cmAtStallValue = cmAtStall !== null ? cmAtStall : features.cmMean;

  // Build stall metadata
  const stallMeta: StallMeta = {
    stallBehaviour,
    clMax: features.clMax,
    alphaStallDeg: alphaStall,
    cdAtStall,
    cmAtStall: cmAtStallValue,
  };

  // Create dense alpha grid
  const alphaMin = Math.min(...raw.alpha, -4);
  const alphaMax = Math.max(...raw.alpha, 20);
  const step = 0.25;
  const alphaGrid: number[] = [];
  for (let a = alphaMin; a <= alphaMax + 1e-6; a += step) {
    alphaGrid.push(parseFloat(a.toFixed(2)));
  }

  const cl: number[] = [];
  const cd: number[] = [];
  const cm: number[] = [];

  for (const alpha of alphaGrid) {
    if (alpha <= stallMeta.alphaStallDeg) {
      // Pre-stall: use interpolated raw polar
      const p = interpolatePolar(raw, alpha, features.cmMean);
      cl.push(p.cl);
      cd.push(p.cd);
      cm.push(p.cm);
    } else {
      // Post-stall: use the smooth model
      const m = modelPostStall(alpha, stallMeta);
      cl.push(m.cl);
      cd.push(m.cd);
      // Smooth CM decay after stall
      const cmPost = modelPostStallCm(alpha, stallMeta);
      cm.push(cmPost);
    }
  }

  // Build enhanced meta
  const enhancedMeta: PolarMeta & StallMeta = {
    ...raw.meta,
    stallBehaviour: stallMeta.stallBehaviour,
    clMax: stallMeta.clMax,
    alphaStallDeg: stallMeta.alphaStallDeg,
    cdAtStall: stallMeta.cdAtStall,
    cmAtStall: stallMeta.cmAtStall,
  };

  return {
    meta: enhancedMeta,
    alpha_deg: alphaGrid,
    cl,
    cd,
    cm,
  };
}

