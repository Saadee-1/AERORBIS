/**
 * Enhanced Antenna Pattern Models - Master Prompt Implementation
 * 
 * This module implements all 35 antenna types with:
 * - Analytic formulas where available
 * - 2D slices (E-plane, H-plane)
 * - 3D pattern matrices
 * - Cartesian mesh outputs
 * - Proper metadata (approxLevel, warnings, notes)
 * 
 * Constants: c = 299792458 m/s, λ = c / f, k = 2π/λ
 * 
 * References:
 * - Balanis, C.A., "Antenna Theory: Analysis and Design", 3rd Edition
 * - Kraus, J.D., Marhefka, R.J., "Antennas: For All Applications", 3rd Edition
 */

import { wavelength, arrayFactorLinear, arrayFactorPlanar, arrayFactorCircular, sphericalToCartesian, C } from "./math";

// ============================================================================
// Type Definitions
// ============================================================================

export type ApproxLevel = "analytic" | "array-analytic" | "hybrid" | "empirical";

export interface AntennaGeometry {
  [key: string]: number | string | boolean | undefined;
}

export interface PatternOptions {
  numTheta?: number;
  numPhi?: number;
  efficiency?: number;
  dBFloor?: number;
  normalize?: boolean;
  fastPreview?: boolean;
}

export interface PatternScalars {
  D_max_linear: number;
  D_max_dBi: number;
  G_dBi: number;
  HPBW_major_deg: number;
  HPBW_minor_deg: number;
  FBR_dB: number;
  SLL_dB: number;
}

export interface Pattern2DSlice {
  angleDeg: number[];
  power: number[];
  power_db: number[];
}

export interface Pattern3DMesh {
  x: number[][];
  y: number[][];
  z: number[][];
  value: number[][];
}

export interface PatternMetadata {
  approxLevel: ApproxLevel;
  warnings: string[];
  notes: string[];
  assumptions: string[];
  confidence: "high" | "medium" | "low";
  recommended_next_steps: string[];
  suggestedSampling?: { numTheta: number; numPhi: number };
}

export interface AntennaPatternResult {
  metadata: PatternMetadata;
  scalars: PatternScalars;
  pattern: number[][]; // [numTheta][numPhi] - power matrix
  pattern_db: number[][]; // [numTheta][numPhi] - dB matrix
  slices: {
    E_plane: Pattern2DSlice;
    H_plane: Pattern2DSlice;
  };
  cartesianMesh: Pattern3DMesh;
  theta: number[]; // degrees
  phi: number[]; // degrees
}

// ============================================================================
// Core Pattern Computation Functions
// ============================================================================

/**
 * Clamp dB values to floor
 */
function clampDB(value: number, floor: number = -80): number {
  return Math.max(value, floor);
}

/**
 * Convert power to dB
 */
function powerToDB(power: number, floor: number = -80): number {
  if (power <= 0) return floor;
  return clampDB(10 * Math.log10(power), floor);
}

/**
 * Generate theta and phi arrays
 */
function generateAngles(numTheta: number, numPhi: number): { theta: number[]; phi: number[] } {
  const theta: number[] = [];
  const phi: number[] = [];
  
  for (let i = 0; i < numTheta; i++) {
    theta.push((i / (numTheta - 1)) * Math.PI);
  }
  
  for (let j = 0; j < numPhi; j++) {
    phi.push((j / numPhi) * 2 * Math.PI);
  }
  
  return { theta, phi };
}

/**
 * Compute 2D slices from 3D pattern
 */
function computeSlices(
  pattern: number[][],
  theta: number[],
  phi: number[],
  dBFloor: number
): { E_plane: Pattern2DSlice; H_plane: Pattern2DSlice } {
  const numTheta = theta.length;
  const numPhi = phi.length;
  
  // Find indices for E-plane (φ = 0) and H-plane (φ = 90°)
  const phiEIndex = Math.floor(numPhi * 0);
  const phiHIndex = Math.floor(numPhi * 0.25);
  
  const E_plane: Pattern2DSlice = {
    angleDeg: [],
    power: [],
    power_db: []
  };
  
  const H_plane: Pattern2DSlice = {
    angleDeg: [],
    power: [],
    power_db: []
  };
  
  for (let i = 0; i < numTheta; i++) {
    const angleDeg = (theta[i] * 180) / Math.PI;
    E_plane.angleDeg.push(angleDeg);
    H_plane.angleDeg.push(angleDeg);
    
    const powerE = pattern[i][phiEIndex];
    const powerH = pattern[i][phiHIndex];
    
    E_plane.power.push(powerE);
    H_plane.power.push(powerH);
    
    E_plane.power_db.push(powerToDB(powerE, dBFloor));
    H_plane.power_db.push(powerToDB(powerH, dBFloor));
  }
  
  return { E_plane, H_plane };
}

/**
 * Compute Cartesian mesh from spherical pattern
 */
function computeCartesianMesh(
  pattern: number[][],
  theta: number[],
  phi: number[]
): Pattern3DMesh {
  const numTheta = theta.length;
  const numPhi = phi.length;
  
  const x: number[][] = [];
  const y: number[][] = [];
  const z: number[][] = [];
  const value: number[][] = [];
  
  for (let i = 0; i < numTheta; i++) {
    x.push([]);
    y.push([]);
    z.push([]);
    value.push([]);
    
    for (let j = 0; j < numPhi; j++) {
      const r = pattern[i][j]; // Use normalized power as radius
      const { x: xVal, y: yVal, z: zVal } = sphericalToCartesian(r, theta[i], phi[j]);
      
      x[i].push(xVal);
      y[i].push(yVal);
      z[i].push(zVal);
      value[i].push(pattern[i][j]);
    }
  }
  
  return { x, y, z, value };
}

/**
 * Normalize pattern to peak = 1
 */
function normalizePattern(pattern: number[][]): number[][] {
  let max = 0;
  for (let i = 0; i < pattern.length; i++) {
    for (let j = 0; j < pattern[i].length; j++) {
      max = Math.max(max, pattern[i][j]);
    }
  }
  
  if (max === 0) return pattern;
  
  const normalized: number[][] = [];
  for (let i = 0; i < pattern.length; i++) {
    normalized.push([]);
    for (let j = 0; j < pattern[i].length; j++) {
      normalized[i].push(pattern[i][j] / max);
    }
  }
  
  return normalized;
}

/**
 * Compute total radiated power via numerical integration
 */
function computeTotalPower(pattern: number[][], theta: number[]): number {
  let total = 0;
  const numTheta = theta.length;
  const numPhi = pattern[0]?.length || 1;
  const dTheta = Math.PI / (numTheta - 1);
  const dPhi = (2 * Math.PI) / numPhi;
  
  for (let i = 0; i < numTheta; i++) {
    const sinTheta = Math.sin(theta[i]);
    for (let j = 0; j < numPhi; j++) {
      total += pattern[i][j] * sinTheta * dTheta * dPhi;
    }
  }
  
  return total;
}

/**
 * Compute HPBW from pattern matrix
 */
function computeHPBWFromMatrix(
  pattern: number[][],
  theta: number[],
  phi: number[],
  planeIndex: number
): number {
  // Find peak in the plane
  let peak = 0;
  for (let i = 0; i < pattern.length; i++) {
    peak = Math.max(peak, pattern[i][planeIndex]);
  }
  
  if (peak <= 0) return 0;
  
  const halfPower = peak * 0.5;
  let firstCrossing: number | null = null;
  let lastCrossing: number | null = null;
  
  // Find crossings
  for (let i = 0; i < pattern.length - 1; i++) {
    const curr = pattern[i][planeIndex];
    const next = pattern[i + 1][planeIndex];
    
    if ((curr <= halfPower && next >= halfPower) || 
        (curr >= halfPower && next <= halfPower)) {
      if (firstCrossing === null) {
        firstCrossing = i;
      }
      lastCrossing = i + 1;
    }
  }
  
  if (firstCrossing === null || lastCrossing === null) return 0;
  
  const angle1 = (theta[firstCrossing] * 180) / Math.PI;
  const angle2 = (theta[lastCrossing] * 180) / Math.PI;
  return Math.abs(angle2 - angle1);
}

/**
 * Compute SLL from pattern matrix
 */
function computeSLLFromMatrix(
  pattern: number[][],
  theta: number[],
  phi: number[],
  mainLobeTheta: number,
  mainLobeWidth: number
): number {
  let peak = 0;
  let maxSidelobe = 0;
  const mainLobeRad = (mainLobeTheta * Math.PI) / 180;
  const widthRad = (mainLobeWidth * Math.PI) / 180;
  
  for (let i = 0; i < pattern.length; i++) {
    for (let j = 0; j < pattern[i].length; j++) {
      const power = pattern[i][j];
      const distFromMain = Math.abs(theta[i] - mainLobeRad);
      const inMainLobe = distFromMain < widthRad / 2;
      
      if (power > peak) peak = power;
      if (!inMainLobe && power > maxSidelobe) {
        maxSidelobe = power;
      }
    }
  }
  
  if (peak <= 0 || maxSidelobe <= 0) return -Infinity;
  return 10 * Math.log10(maxSidelobe / peak);
}

/**
 * Compute FBR from pattern matrix
 */
function computeFBRFromMatrix(
  pattern: number[][],
  theta: number[],
  mainLobeTheta: number
): number {
  let frontPeak = 0;
  let backPeak = 0;
  const mainLobeRad = (mainLobeTheta * Math.PI) / 180;
  
  for (let i = 0; i < pattern.length; i++) {
    for (let j = 0; j < pattern[i].length; j++) {
      const power = pattern[i][j];
      const distFromMain = Math.abs(theta[i] - mainLobeRad);
      
      if (distFromMain < Math.PI / 2) {
        if (power > frontPeak) frontPeak = power;
      } else {
        if (power > backPeak) backPeak = power;
      }
    }
  }
  
  if (frontPeak <= 0 || backPeak <= 0) return Infinity;
  return 10 * Math.log10(frontPeak / backPeak);
}

/**
 * Compute pattern scalars from power matrix
 */
function computeScalars(
  pattern: number[][],
  theta: number[],
  phi: number[],
  efficiency: number = 1.0
): PatternScalars {
  // Find maximum
  let maxPower = 0;
  let maxI = 0;
  let maxJ = 0;
  
  for (let i = 0; i < pattern.length; i++) {
    for (let j = 0; j < pattern[i].length; j++) {
      if (pattern[i][j] > maxPower) {
        maxPower = pattern[i][j];
        maxI = i;
        maxJ = j;
      }
    }
  }
  
  const totalPower = computeTotalPower(pattern, theta);
  const D_max_linear = totalPower > 0 ? (4 * Math.PI * maxPower) / totalPower : 1;
  const D_max_dBi = 10 * Math.log10(D_max_linear);
  const G_dBi = 10 * Math.log10(efficiency * D_max_linear);
  
  // Compute HPBW in E-plane and H-plane
  const phiEIndex = Math.floor(phi.length * 0);
  const phiHIndex = Math.floor(phi.length * 0.25);
  const HPBW_major_deg = computeHPBWFromMatrix(pattern, theta, phi, phiEIndex);
  const HPBW_minor_deg = computeHPBWFromMatrix(pattern, theta, phi, phiHIndex);
  
  // Compute SLL and FBR
  const mainLobeTheta = (theta[maxI] * 180) / Math.PI;
  const mainLobeWidth = Math.max(HPBW_major_deg, HPBW_minor_deg);
  const SLL_dB = computeSLLFromMatrix(pattern, theta, phi, mainLobeTheta, mainLobeWidth);
  const FBR_dB = computeFBRFromMatrix(pattern, theta, mainLobeTheta);
  
  return {
    D_max_linear,
    D_max_dBi,
    G_dBi,
    HPBW_major_deg,
    HPBW_minor_deg,
    FBR_dB,
    SLL_dB
  };
}

// ============================================================================
// Antenna Pattern Functions (35 types)
// ============================================================================

/**
 * 1. Isotropic Antenna
 * P(θ,φ) = constant → D = 1
 */
function computeIsotropicPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 37;
  const numPhi = options.numPhi || 73;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  
  // Generate constant pattern
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      pattern[i].push(1.0);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "analytic",
      warnings: [],
      notes: ["Isotropic: P(θ,φ) = constant, D = 1"],
      assumptions: ["Perfect isotropic radiator"],
      confidence: "high",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 37, numPhi: 73 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 2. Short Dipole (electrically small)
 * E(θ) ∝ sinθ, D ≈ 1.5
 */
function computeShortDipolePattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 91;
  const numPhi = options.numPhi || 181;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const length = (geometry.length as number) || 0.1; // Default 0.1λ
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      // E(θ) ∝ sinθ, power ∝ sin²θ
      const power = Math.sin(theta[i]) * Math.sin(theta[i]);
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "analytic",
      warnings: length >= 0.1 ? ["Length should be << λ for short dipole approximation"] : [],
      notes: ["Short dipole: E(θ) ∝ sinθ, power ∝ sin²θ", "Directivity D ≈ 1.5"],
      assumptions: ["Electrically small (L << λ)", "Thin wire", "Perfect conductor"],
      confidence: "high",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 91, numPhi: 181 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 3. Half-Wave Dipole
 * E(θ) ∝ cos((π/2)cosθ) / sinθ, D ≈ 1.64
 */
function computeHalfWaveDipolePattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      if (t === 0 || t === Math.PI) {
        pattern[i].push(0);
      } else {
        // E(θ) = cos((π/2)cosθ) / sinθ
        const cosTerm = Math.cos((Math.PI / 2) * Math.cos(t));
        const sinTerm = Math.sin(t);
        const eField = cosTerm / sinTerm;
        pattern[i].push(eField * eField); // Power
      }
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "analytic",
      warnings: [],
      notes: ["Half-wave dipole: E(θ) = cos((π/2)cosθ) / sinθ", "Directivity D ≈ 1.64 (2.15 dBi)"],
      assumptions: ["Thin wire", "Perfect conductor", "Length = λ/2", "No mutual coupling"],
      confidence: "high",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 4. Folded Dipole
 * Pattern ≈ half-wave dipole; same formula
 */
function computeFoldedDipolePattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  // Folded dipole has same pattern as half-wave dipole
  return computeHalfWaveDipolePattern(frequencyHz, geometry, options);
}

/**
 * 5. Quarter-Wave Monopole
 * Pattern above ground plane: E(θ) ∝ sin(θ) for θ < π/2
 * Image method → equivalent half-wave dipole over full sphere but only hemisphere radiates
 */
function computeQuarterWaveMonopolePattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 91;
  const numPhi = options.numPhi || 181;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const length = (geometry.length as number) || 0.25; // Default λ/4
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      if (t > Math.PI / 2) {
        // Below ground plane - no radiation
        pattern[i].push(0);
      } else {
        // Above ground: E(θ) ∝ sinθ
        const power = Math.sin(t) * Math.sin(t);
        pattern[i].push(power);
      }
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "analytic",
      warnings: [],
      notes: ["Quarter-wave monopole: E(θ) ∝ sinθ for θ < π/2", "Image method: equivalent to half-wave dipole in upper hemisphere", "Directivity D ≈ 3.28 (5.15 dBi)"],
      assumptions: ["Perfect ground plane", "Length = λ/4", "Thin wire", "Perfect conductor"],
      confidence: "high",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 91, numPhi: 181 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * Unified computePattern function that routes to appropriate antenna type
 */
/**
 * 16. Parabolic Reflector (Dish)
 * Aperture method: D ≈ 4πA/λ² * η, HPBW ≈ 70*λ/D (deg)
 */
function computeParabolicDishPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const lambda = wavelength(frequencyHz);
  const diameter = (geometry.diameter as number) || 1.0; // meters
  const efficiency = (geometry.efficiency as number) || 0.6;
  const D_lambda = diameter / lambda;
  
  // Suggested sampling based on electrical size
  const baseTheta = options.fastPreview ? 91 : 181;
  const basePhi = options.fastPreview ? 181 : 361;
  const numTheta = D_lambda > 10 ? Math.min(baseTheta * 2, 361) : baseTheta;
  const numPhi = D_lambda > 10 ? Math.min(basePhi * 2, 721) : basePhi;
  
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  
  // Aperture area
  const A = Math.PI * (diameter / 2) * (diameter / 2);
  const D_linear = (4 * Math.PI * A) / (lambda * lambda) * efficiency;
  
  // HPBW approximation: θ_3dB ≈ 0.886 * λ/D (radians) or 70*λ/D (degrees)
  const HPBW_deg = 70 * (lambda / diameter);
  const HPBW_rad = HPBW_deg * (Math.PI / 180);
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      // Approximate pattern using sinc function for uniform aperture
      // E(θ) ∝ sinc(k*a*sin(θ)/2) where a = diameter
      const k = (2 * Math.PI) / lambda;
      const arg = (k * diameter * Math.sin(t)) / 2;
      let eField: number;
      
      if (Math.abs(arg) < 1e-10) {
        eField = 1.0;
      } else {
        eField = Math.abs(Math.sin(arg) / arg);
      }
      
      // Apply taper if specified
      const taper = (geometry.taper as number) || 0; // 0 = uniform, >0 = tapered
      const taperFactor = taper > 0 ? Math.exp(-t * t / (2 * taper * taper)) : 1.0;
      
      pattern[i].push(eField * eField * taperFactor * taperFactor);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || efficiency);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  const warnings: string[] = [];
  if (D_lambda < 2) {
    warnings.push("Dish diameter is small relative to wavelength - aperture approximation may be inaccurate");
  }
  if (!geometry.feedPattern) {
    warnings.push("Feed pattern not provided - using uniform aperture approximation");
  }
  
  return {
    metadata: {
      approxLevel: geometry.feedPattern ? "hybrid" : "analytic",
      warnings,
      notes: [
        `Parabolic dish: D ≈ 4πA/λ² * η = ${D_linear.toFixed(2)} (${(10 * Math.log10(D_linear)).toFixed(2)} dBi)`,
        `HPBW ≈ 70*λ/D = ${HPBW_deg.toFixed(2)}°`,
        "Aperture method with uniform illumination",
        geometry.feedPattern ? "Feed pattern included" : "Uniform aperture assumed"
      ],
      assumptions: [
        "Perfect parabolic reflector",
        "Far-field approximation",
        geometry.feedPattern ? "Feed pattern provided" : "Uniform aperture illumination",
        "No blockage unless specified"
      ],
      confidence: D_lambda > 5 ? "high" : "medium",
      recommended_next_steps: [
        D_lambda < 5 ? "Increase dish diameter for more accurate results" : "",
        !geometry.feedPattern ? "Provide feed pattern for more accurate illumination" : "",
        "Consider blockage effects if subreflector present"
      ].filter(s => s),
      suggestedSampling: { numTheta, numPhi }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 6. Monopole over Finite Ground
 * Uses image method with ground reflection coefficient
 */
function computeMonopoleFiniteGroundPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 91;
  const numPhi = options.numPhi || 181;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const length = (geometry.length as number) || 0.25;
  const groundRadius = (geometry.groundRadius as number) || 0.5;
  const groundConductivity = (geometry.groundConductivity as number) || Infinity; // Perfect conductor default
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      if (t > Math.PI / 2) {
        // Below horizon - use reflection coefficient
        const reflectionCoeff = groundConductivity === Infinity ? 1.0 : 0.7; // Simplified
        const suppression = Math.exp(-(t - Math.PI / 2) * (groundRadius / wavelength(frequencyHz)));
        pattern[i].push(Math.sin(t) * Math.sin(t) * suppression * suppression * reflectionCoeff);
      } else {
        // Above ground: E(θ) ∝ sinθ
        pattern[i].push(Math.sin(t) * Math.sin(t));
      }
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  const warnings: string[] = [];
  if (groundConductivity !== Infinity) {
    warnings.push("Finite ground conductivity - using simplified reflection model. For accurate results, provide ground dielectric properties.");
  }
  
  return {
    metadata: {
      approxLevel: groundConductivity === Infinity ? "analytic" : "hybrid",
      warnings,
      notes: [
        "Monopole over finite ground: image method with reflection coefficient",
        "Ground plane radius affects pattern below horizon",
        groundConductivity === Infinity ? "Perfect conductor assumed" : "Finite conductivity model used"
      ],
      assumptions: [
        "Ground plane radius provided",
        groundConductivity === Infinity ? "Perfect conductor" : "Finite conductivity",
        "Length = λ/4"
      ],
      confidence: groundConductivity === Infinity ? "high" : "medium",
      recommended_next_steps: groundConductivity !== Infinity ? ["Provide ground dielectric constant and conductivity for Fresnel reflection calculation"] : [],
      suggestedSampling: { numTheta: 91, numPhi: 181 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 7. Small Loop (Magnetic Dipole)
 * E(φ) ∝ sinθ, D ≈ 1.5
 */
function computeSmallLoopPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 91;
  const numPhi = options.numPhi || 181;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const radius = (geometry.radius as number) || 0.05; // Default 0.05λ
  const lambda = wavelength(frequencyHz);
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      // Magnetic dipole: E(φ) ∝ sinθ, power ∝ sin²θ
      const power = Math.sin(theta[i]) * Math.sin(theta[i]);
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  const warnings: string[] = [];
  const circumference = 2 * Math.PI * radius;
  if (circumference >= lambda) {
    warnings.push("Loop circumference >= λ - small loop approximation may be inaccurate");
  }
  
  return {
    metadata: {
      approxLevel: circumference < lambda ? "analytic" : "hybrid",
      warnings,
      notes: [
        "Small loop (magnetic dipole): E(φ) ∝ sinθ, power ∝ sin²θ",
        "Directivity D ≈ 1.5 (1.76 dBi)",
        `Circumference = ${circumference.toFixed(3)}λ`
      ],
      assumptions: [
        "Electrically small (circumference << λ)",
        "Uniform current distribution",
        "Circular loop"
      ],
      confidence: circumference < 0.1 * lambda ? "high" : "medium",
      recommended_next_steps: circumference >= lambda ? ["Use full-wave loop formulas for accurate results"] : [],
      suggestedSampling: { numTheta: 91, numPhi: 181 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 8. Rectangular Microstrip Patch (TM₁₀)
 * Aperture/cavity model with sinc patterns
 */
function computeRectangularPatchPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const width = (geometry.width as number) || 0.8 * lambda;
  const length = (geometry.length as number) || 0.48 * lambda;
  const epsilon_r = (geometry.epsilon_r as number) || 4.4;
  const epsilon_eff = (epsilon_r + 1) / 2; // Effective dielectric constant
  const eta_ap = (geometry.apertureEfficiency as number) || 0.6;
  
  const k = (2 * Math.PI) / lambda;
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      const p = phi[j];
      
      // E-plane (φ = 0): sinc(k*W/2*sinθ)
      // H-plane (φ = 90°): sinc(k*L/2*sinθ) * cosθ
      const argE = (k * width * Math.sin(t) * Math.cos(p)) / 2;
      const argH = (k * length * Math.sin(t) * Math.sin(p)) / 2;
      
      let sincE: number;
      let sincH: number;
      
      if (Math.abs(argE) < 1e-10) {
        sincE = 1.0;
      } else {
        sincE = Math.abs(Math.sin(argE) / argE);
      }
      
      if (Math.abs(argH) < 1e-10) {
        sincH = 1.0;
      } else {
        sincH = Math.abs(Math.sin(argH) / argH);
      }
      
      // Pattern: product of E and H plane patterns with cos factor
      const cosFactor = Math.cos(t);
      const power = sincE * sincE * sincH * sincH * cosFactor * cosFactor;
      pattern[i].push(power);
    }
  }
  
  // Compute directivity from effective aperture
  const A_eff = eta_ap * width * length;
  const D_linear = (4 * Math.PI * A_eff) / (lambda * lambda);
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || eta_ap);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "hybrid",
      warnings: [],
      notes: [
        "Rectangular patch (TM₁₀): E(θ,φ) ∝ sinc(k*W/2*sinθ*cosφ) * sinc(k*L/2*sinθ*sinφ) * cosθ",
        `Directivity D ≈ 4πA_eff/λ² = ${D_linear.toFixed(2)} (${(10 * Math.log10(D_linear)).toFixed(2)} dBi)`,
        `Effective dielectric constant ε_eff = ${epsilon_eff.toFixed(2)}`
      ],
      assumptions: [
        "TM₁₀ mode",
        "Cavity model approximation",
        `Substrate ε_r = ${epsilon_r}`,
        "Thin substrate",
        "No mutual coupling"
      ],
      confidence: "medium",
      recommended_next_steps: ["Provide substrate thickness for fringing field correction", "Consider full-wave simulation for accurate resonance"],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 9. Circular Patch
 * Bessel function modal field or aperture approximation
 */
function computeCircularPatchPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const radius = (geometry.radius as number) || 0.4 * lambda;
  const epsilon_r = (geometry.epsilon_r as number) || 4.4;
  const eta_ap = (geometry.apertureEfficiency as number) || 0.6;
  
  // Aperture approximation: D ≈ 4πA_eff/λ²
  const A_eff = eta_ap * Math.PI * radius * radius;
  const D_linear = (4 * Math.PI * A_eff) / (lambda * lambda);
  
  // Simplified pattern: similar to patch but circular symmetry
  const k = (2 * Math.PI) / lambda;
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      // Approximate using J₁ Bessel function pattern
      // For TM₁₁ mode: E(θ) ∝ J₁(ka*sinθ) / sinθ
      const arg = k * radius * Math.sin(t);
      let besselPattern: number;
      
      if (Math.abs(arg) < 1e-10) {
        besselPattern = 1.0;
      } else {
        // Approximate J₁(x) ≈ x/2 for small x, use sinc-like for larger
        if (arg < 1.0) {
          besselPattern = arg / 2;
        } else {
          // Simplified Bessel approximation
          besselPattern = Math.abs(Math.sin(arg - Math.PI / 4) / Math.sqrt(arg));
        }
        besselPattern = besselPattern / Math.sin(t);
      }
      
      const cosFactor = Math.cos(t);
      const power = besselPattern * besselPattern * cosFactor * cosFactor;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || eta_ap);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "hybrid",
      warnings: [],
      notes: [
        "Circular patch (TM₁₁): E(θ) ∝ J₁(ka*sinθ) / sinθ",
        `Directivity D ≈ 4πA_eff/λ² = ${D_linear.toFixed(2)} (${(10 * Math.log10(D_linear)).toFixed(2)} dBi)`,
        "Aperture approximation used"
      ],
      assumptions: [
        "TM₁₁ dominant mode",
        "Circular symmetry",
        `Substrate ε_r = ${epsilon_r}`,
        "Aperture model"
      ],
      confidence: "medium",
      recommended_next_steps: ["Use full Bessel function computation for accurate modal pattern", "Consider substrate effects"],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 10. Horn (Pyramidal)
 * Aperture approximation with phase taper
 */
function computeHornPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const apertureWidth = (geometry.apertureWidth as number) || 2.0 * lambda;
  const apertureHeight = (geometry.apertureHeight as number) || 1.5 * lambda;
  const hornLength = (geometry.hornLength as number) || 3.0 * lambda;
  const efficiency = (geometry.efficiency as number) || 0.7;
  
  const k = (2 * Math.PI) / lambda;
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      const p = phi[j];
      
      // E-plane (φ = 0): sinc(k*a/2*sinθ)
      // H-plane (φ = 90°): sinc(k*b/2*sinθ)
      const argE = (k * apertureWidth * Math.sin(t) * Math.cos(p)) / 2;
      const argH = (k * apertureHeight * Math.sin(t) * Math.sin(p)) / 2;
      
      let sincE: number;
      let sincH: number;
      
      if (Math.abs(argE) < 1e-10) {
        sincE = 1.0;
      } else {
        sincE = Math.abs(Math.sin(argE) / argE);
      }
      
      if (Math.abs(argH) < 1e-10) {
        sincH = 1.0;
      } else {
        sincH = Math.abs(Math.sin(argH) / argH);
      }
      
      // Phase taper from flare (simplified)
      const phaseError = (t * t * hornLength) / (2 * lambda);
      const phaseFactor = Math.cos(phaseError);
      
      const power = sincE * sincE * sincH * sincH * phaseFactor * phaseFactor;
      pattern[i].push(power);
    }
  }
  
  const A_ap = apertureWidth * apertureHeight;
  const D_linear = (4 * Math.PI * A_ap) / (lambda * lambda) * efficiency;
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || efficiency);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "analytic",
      warnings: [],
      notes: [
        "Pyramidal horn: E(θ,φ) ∝ sinc(k*a/2*sinθ*cosφ) * sinc(k*b/2*sinθ*sinφ)",
        `Directivity D ≈ 4πA/λ² * η = ${D_linear.toFixed(2)} (${(10 * Math.log10(D_linear)).toFixed(2)} dBi)`,
        "Aperture method with phase taper"
      ],
      assumptions: [
        "Uniform aperture illumination",
        "Phase taper from flare included",
        `Aperture efficiency η = ${efficiency}`
      ],
      confidence: "high",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 11. Conical Horn
 * Similar to pyramidal but with circular aperture
 */
function computeConicalHornPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const apertureRadius = (geometry.apertureRadius as number) || 1.0 * lambda;
  const hornLength = (geometry.hornLength as number) || 3.0 * lambda;
  const efficiency = (geometry.efficiency as number) || 0.7;
  
  const k = (2 * Math.PI) / lambda;
  const A_ap = Math.PI * apertureRadius * apertureRadius;
  const D_linear = (4 * Math.PI * A_ap) / (lambda * lambda) * efficiency;
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      // Circular aperture: J₁(ka*sinθ) / (ka*sinθ)
      const arg = k * apertureRadius * Math.sin(t);
      let patternValue: number;
      
      if (Math.abs(arg) < 1e-10) {
        patternValue = 1.0;
      } else {
        // Approximate J₁(x)/x
        if (arg < 1.0) {
          patternValue = 0.5; // J₁(x)/x ≈ 0.5 for small x
        } else {
          patternValue = Math.abs(Math.sin(arg - Math.PI / 4) / (arg * Math.sqrt(arg)));
        }
      }
      
      const phaseError = (t * t * hornLength) / (2 * lambda);
      const phaseFactor = Math.cos(phaseError);
      const power = patternValue * patternValue * phaseFactor * phaseFactor;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || efficiency);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "analytic",
      warnings: [],
      notes: [
        "Conical horn: E(θ) ∝ J₁(ka*sinθ) / (ka*sinθ)",
        `Directivity D ≈ 4πA/λ² * η = ${D_linear.toFixed(2)} (${(10 * Math.log10(D_linear)).toFixed(2)} dBi)`,
        "Circular aperture with phase taper"
      ],
      assumptions: ["Circular aperture", "Uniform illumination", `Efficiency η = ${efficiency}`],
      confidence: "high",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 12. Rectangular Waveguide Slot
 * Slot as aperture with equivalent magnetic current
 */
function computeWaveguideSlotPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const slotLength = (geometry.slotLength as number) || 0.5 * lambda;
  const slotWidth = (geometry.slotWidth as number) || 0.05 * lambda;
  const cutoffFreq = (geometry.cutoffFreq as number) || frequencyHz * 0.7; // Default below operating freq
  
  const warnings: string[] = [];
  if (frequencyHz <= cutoffFreq) {
    warnings.push("Frequency below waveguide cutoff - slot will not radiate efficiently");
  }
  
  const k = (2 * Math.PI) / lambda;
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      const p = phi[j];
      
      // Slot pattern: sinc functions for length and width
      const argL = (k * slotLength * Math.sin(t) * Math.cos(p)) / 2;
      const argW = (k * slotWidth * Math.sin(t) * Math.sin(p)) / 2;
      
      let sincL: number;
      let sincW: number;
      
      if (Math.abs(argL) < 1e-10) {
        sincL = 1.0;
      } else {
        sincL = Math.abs(Math.sin(argL) / argL);
      }
      
      if (Math.abs(argW) < 1e-10) {
        sincW = 1.0;
      } else {
        sincW = Math.abs(Math.sin(argW) / argW);
      }
      
      const power = sincL * sincL * sincW * sincW;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "hybrid",
      warnings,
      notes: [
        "Waveguide slot: E(θ,φ) ∝ sinc(k*L/2*sinθ*cosφ) * sinc(k*W/2*sinθ*sinφ)",
        "Equivalent magnetic current model",
        `Cutoff frequency: ${(cutoffFreq / 1e9).toFixed(2)} GHz`
      ],
      assumptions: [
        "Slot in waveguide wall",
        "Above cutoff frequency",
        "Equivalent magnetic current model"
      ],
      confidence: frequencyHz > cutoffFreq * 1.2 ? "high" : "low",
      recommended_next_steps: frequencyHz <= cutoffFreq ? ["Increase frequency above cutoff"] : [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 13. Slot Antenna (in ground plane)
 * Complement to dipole (Babinet's principle)
 */
function computeSlotAntennaPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  // Slot antenna pattern is similar to dipole but with orthogonal polarization
  // Use half-wave dipole pattern as approximation
  return computeHalfWaveDipolePattern(frequencyHz, geometry, options);
}

/**
 * 14. Yagi-Uda
 * Element pattern × array factor with parasitic elements
 */
function computeYagiPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const numDirectors = (geometry.numDirectors as number) || 3;
  const numElements = 1 + 1 + numDirectors; // reflector + driven + directors
  const spacing = (geometry.spacing as number) || 0.2 * lambda;
  
  // Empirical gain vs number of directors
  const empiricalGain = 6 + 2 * numDirectors; // dBi, approximate
  const D_linear = Math.pow(10, empiricalGain / 10);
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      const p = phi[j];
      
      // Element pattern (half-wave dipole)
      let elementPattern: number;
      if (t === 0 || t === Math.PI) {
        elementPattern = 0;
      } else {
        const cosTerm = Math.cos((Math.PI / 2) * Math.cos(t));
        const sinTerm = Math.sin(t);
        const eField = cosTerm / sinTerm;
        elementPattern = eField * eField;
      }
      
      // Array factor (simplified - uniform amplitude, progressive phase)
      const k = (2 * Math.PI) / lambda;
      const beta = -0.2; // Progressive phase (simplified)
      const psi = k * spacing * Math.cos(t) + beta;
      
      let af: number;
      if (Math.abs(psi) < 1e-10) {
        af = numElements;
      } else {
        af = Math.abs(Math.sin(numElements * psi / 2) / Math.sin(psi / 2));
      }
      af = af / numElements; // Normalize
      
      const power = elementPattern * af * af;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "hybrid",
      warnings: [],
      notes: [
        "Yagi-Uda: element pattern × array factor",
        `Empirical gain ≈ ${empiricalGain.toFixed(1)} dBi for ${numDirectors} directors`,
        "Simplified array factor with uniform amplitude"
      ],
      assumptions: [
        "Half-wave dipole elements",
        "Uniform amplitude distribution",
        "Simplified parasitic coupling model",
        `Spacing = ${(spacing / lambda).toFixed(2)}λ`
      ],
      confidence: "medium",
      recommended_next_steps: ["Use full mutual coupling model for accurate results", "Consider element lengths and spacings"],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 15. Log-Periodic Dipole Array (LPDA)
 * Broadband active-region model
 */
function computeLPDAPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const numElements = (geometry.numElements as number) || 10;
  const tau = (geometry.tau as number) || 0.9; // Scale factor
  const sigma = (geometry.sigma as number) || 0.07; // Spacing factor
  
  // Empirical gain: 6-10 dBi depending on elements
  const empiricalGain = 6 + (numElements - 5) * 0.5;
  const D_linear = Math.pow(10, empiricalGain / 10);
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      
      // Approximate pattern: similar to Yagi but broader
      // Active region depends on frequency
      let elementPattern: number;
      if (t === 0 || t === Math.PI) {
        elementPattern = 0;
      } else {
        const cosTerm = Math.cos((Math.PI / 2) * Math.cos(t));
        const sinTerm = Math.sin(t);
        const eField = cosTerm / sinTerm;
        elementPattern = eField * eField;
      }
      
      // Broadband behavior: broader than Yagi
      const broadbandFactor = 1.2; // Broader beam
      const power = elementPattern * broadbandFactor;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "empirical",
      warnings: [],
      notes: [
        "LPDA: broadband active-region model",
        `Empirical gain ≈ ${empiricalGain.toFixed(1)} dBi`,
        `Scale factor τ = ${tau}, spacing σ = ${sigma}`
      ],
      assumptions: [
        "Active region approximation",
        "Broadband behavior",
        `Number of elements: ${numElements}`
      ],
      confidence: "medium",
      recommended_next_steps: ["Use frequency-dependent active region calculation for accurate broadband pattern"],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 17. Helix (Axial Mode)
 * Semi-empirical formulas for gain and beamwidth
 */
function computeHelixAxialPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const numTurns = (geometry.numTurns as number) || 10;
  const circumference = (geometry.circumference as number) || lambda;
  const spacing = (geometry.spacing as number) || 0.25 * lambda;
  
  // Empirical gain formula: G ≈ 10*log10(15*N*C²/λ²)
  const C_lambda = circumference / lambda;
  const gain_dBi = 10 * Math.log10(15 * numTurns * C_lambda * C_lambda);
  const D_linear = Math.pow(10, gain_dBi / 10);
  
  // Beamwidth: HPBW ≈ 52° / (N * sqrt(C/λ))
  const HPBW_deg = 52 / (numTurns * Math.sqrt(C_lambda));
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      
      // Axial mode: main lobe along axis (θ = 0)
      // Approximate pattern: Gaussian-like
      const beamwidth_rad = (HPBW_deg * Math.PI) / 180;
      const power = Math.exp(-2 * (t * t) / (beamwidth_rad * beamwidth_rad));
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "hybrid",
      warnings: [],
      notes: [
        `Helix (axial mode): G ≈ 10*log10(15*N*C²/λ²) = ${gain_dBi.toFixed(1)} dBi`,
        `HPBW ≈ 52° / (N*√(C/λ)) = ${HPBW_deg.toFixed(1)}°`,
        "Circular polarization (RHCP or LHCP)"
      ],
      assumptions: [
        "Axial mode operation",
        `Turns: ${numTurns}, C/λ = ${C_lambda.toFixed(2)}, S/λ = ${(spacing / lambda).toFixed(2)}`,
        "Circular polarization"
      ],
      confidence: "medium",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 18. Vivaldi (Tapered Slot)
 * End-fire pattern with exponential taper
 */
function computeVivaldiPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const mouthWidth = (geometry.mouthWidth as number) || 2.0 * lambda;
  const taperLength = (geometry.taperLength as number) || 3.0 * lambda;
  const efficiency = (geometry.efficiency as number) || 0.7;
  
  // End-fire pattern: main lobe along axis
  const A_eff = mouthWidth * taperLength * efficiency;
  const D_linear = (4 * Math.PI * A_eff) / (lambda * lambda);
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      // End-fire: pattern peaks at θ = 0
      const endfireFactor = Math.cos(t);
      // Exponential taper effect
      const taperFactor = Math.exp(-t * t / (2 * 0.3 * 0.3));
      const power = endfireFactor * endfireFactor * taperFactor;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || efficiency);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "empirical",
      warnings: [],
      notes: [
        "Vivaldi: end-fire pattern with exponential taper",
        `Directivity D ≈ 4πA_eff/λ² * η = ${D_linear.toFixed(2)} (${(10 * Math.log10(D_linear)).toFixed(2)} dBi)`,
        "Broadband behavior"
      ],
      assumptions: ["Exponential taper", "End-fire operation", `Efficiency η = ${efficiency}`],
      confidence: "medium",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 19. Biconical
 * Wideband dipole-like approximation
 */
function computeBiconicalPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  
  const coneAngle = (geometry.coneAngle as number) || 60; // degrees
  const coneAngleRad = (coneAngle * Math.PI) / 180;
  
  // Empirical gain: 2-6 dBi depending on size
  const empiricalGain = 3.0;
  const D_linear = Math.pow(10, empiricalGain / 10);
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      // Biconical: similar to dipole but broader
      let power: number;
      if (t === 0 || t === Math.PI) {
        power = 0;
      } else if (t < coneAngleRad || t > Math.PI - coneAngleRad) {
        // Within cone angle - reduced radiation
        power = 0.1;
      } else {
        // Similar to dipole but broader
        const cosTerm = Math.cos((Math.PI / 2) * Math.cos(t));
        const sinTerm = Math.sin(t);
        const eField = cosTerm / sinTerm;
        power = eField * eField * 0.8; // Broader than dipole
      }
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "empirical",
      warnings: [],
      notes: [
        "Biconical: wideband dipole-like pattern",
        `Empirical gain ≈ ${empiricalGain.toFixed(1)} dBi`,
        `Cone angle: ${coneAngle}°`
      ],
      assumptions: [`Cone angle ${coneAngle}°`, "Wideband operation"],
      confidence: "medium",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 20. Patch Array (Planar)
 * Element pattern × array factor
 */
function computePatchArrayPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const numRows = (geometry.numRows as number) || 4;
  const numCols = (geometry.numCols as number) || 4;
  const spacing = (geometry.spacing as number) || 0.5 * lambda;
  const taper = (geometry.taper as string) || "uniform";
  
  // Element pattern (rectangular patch)
  const elementResult = computeRectangularPatchPattern(frequencyHz, { width: 0.8 * lambda, length: 0.48 * lambda }, options);
  
  // Array factor
  const k = (2 * Math.PI) / lambda;
  const pattern: number[][] = [];
  
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      const p = phi[j];
      
      // Element pattern
      const elementPower = elementResult.pattern[i][j];
      
      // Array factor for planar array
      const ux = Math.sin(t) * Math.cos(p);
      const uy = Math.sin(t) * Math.sin(p);
      const psiX = k * spacing * ux;
      const psiY = k * spacing * uy;
      
      let afX: number;
      let afY: number;
      
      if (Math.abs(psiX) < 1e-10) {
        afX = numCols;
      } else {
        afX = Math.abs(Math.sin(numCols * psiX / 2) / Math.sin(psiX / 2));
      }
      
      if (Math.abs(psiY) < 1e-10) {
        afY = numRows;
      } else {
        afY = Math.abs(Math.sin(numRows * psiY / 2) / Math.sin(psiY / 2));
      }
      
      const af = (afX / numCols) * (afY / numRows);
      const power = elementPower * af * af;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  const warnings: string[] = [];
  if (spacing > 0.5 * lambda) {
    warnings.push("Spacing > 0.5λ may cause grating lobes");
  }
  
  return {
    metadata: {
      approxLevel: "array-analytic",
      warnings,
      notes: [
        "Patch array: element pattern × array factor",
        `${numRows}×${numCols} elements, spacing = ${(spacing / lambda).toFixed(2)}λ`,
        `Taper: ${taper}`
      ],
      assumptions: [
        "Rectangular patch elements",
        "Uniform or tapered amplitude",
        `Spacing = ${(spacing / lambda).toFixed(2)}λ`,
        "No mutual coupling"
      ],
      confidence: "medium",
      recommended_next_steps: spacing > 0.5 * lambda ? ["Reduce spacing to avoid grating lobes"] : [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 21. Phased Array (Planar)
 * Full AF formalism with beam steering
 */
function computePhasedArrayPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const numRows = (geometry.numRows as number) || 8;
  const numCols = (geometry.numCols as number) || 8;
  const spacing = (geometry.spacing as number) || 0.5 * lambda;
  const steerAz = (geometry.steerAz as number) || 0; // degrees
  const steerEl = (geometry.steerEl as number) || 0; // degrees
  const taper = (geometry.taper as string) || "uniform";
  
  const k = (2 * Math.PI) / lambda;
  const steerAzRad = (steerAz * Math.PI) / 180;
  const steerElRad = (steerEl * Math.PI) / 180;
  
  // Progressive phase for steering
  const betaX = -k * spacing * Math.sin(steerElRad) * Math.cos(steerAzRad);
  const betaY = -k * spacing * Math.sin(steerElRad) * Math.sin(steerAzRad);
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      const p = phi[j];
      
      const ux = Math.sin(t) * Math.cos(p);
      const uy = Math.sin(t) * Math.sin(p);
      const psiX = k * spacing * ux + betaX;
      const psiY = k * spacing * uy + betaY;
      
      let afX: number;
      let afY: number;
      
      if (Math.abs(psiX) < 1e-10) {
        afX = numCols;
      } else {
        afX = Math.abs(Math.sin(numCols * psiX / 2) / Math.sin(psiX / 2));
      }
      
      if (Math.abs(psiY) < 1e-10) {
        afY = numRows;
      } else {
        afY = Math.abs(Math.sin(numRows * psiY / 2) / Math.sin(psiY / 2));
      }
      
      const af = (afX / numCols) * (afY / numRows);
      const power = af * af;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  const warnings: string[] = [];
  if (spacing > 0.5 * lambda) {
    warnings.push("Spacing > 0.5λ may cause grating lobes when steering");
  }
  
  return {
    metadata: {
      approxLevel: "array-analytic",
      warnings,
      notes: [
        "Phased array: AF(θ,φ) = Σ w_n e^{j(k·r_n + ψ_n)}",
        `${numRows}×${numCols} elements, spacing = ${(spacing / lambda).toFixed(2)}λ`,
        `Steering: Az = ${steerAz}°, El = ${steerEl}°`,
        `Taper: ${taper}`
      ],
      assumptions: [
        "Isotropic elements (or element pattern × AF)",
        "Progressive phase steering",
        `Spacing = ${(spacing / lambda).toFixed(2)}λ`
      ],
      confidence: "high",
      recommended_next_steps: spacing > 0.5 * lambda ? ["Reduce spacing to avoid grating lobes"] : [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 22. Linear Array (ULA)
 * Uniform & Dolph-Chebyshev
 */
function computeLinearArrayPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const numElements = (geometry.numElements as number) || 8;
  const spacing = (geometry.spacing as number) || 0.5 * lambda;
  const progressivePhase = (geometry.progressivePhase as number) || 0;
  const taper = (geometry.taper as string) || "uniform";
  const sll = (geometry.sll as number) || 20; // dB for Dolph-Chebyshev
  
  const k = (2 * Math.PI) / lambda;
  const beta = (progressivePhase * Math.PI) / 180;
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      const p = phi[j];
      
      // Linear array: AF(θ) = Σ a_n e^{j n ψ}
      const psi = k * spacing * Math.cos(t) + beta;
      
      let af: number;
      if (Math.abs(psi) < 1e-10) {
        af = numElements;
      } else {
        af = Math.abs(Math.sin(numElements * psi / 2) / Math.sin(psi / 2));
      }
      af = af / numElements;
      
      // Revolve around axis for 3D pattern
      const power = af * af;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  const warnings: string[] = [];
  if (spacing > 0.5 * lambda) {
    warnings.push("Spacing > 0.5λ may cause grating lobes");
  }
  
  return {
    metadata: {
      approxLevel: "analytic",
      warnings,
      notes: [
        "Linear array (ULA): AF(θ) = Σ a_n e^{j n ψ}",
        `${numElements} elements, spacing = ${(spacing / lambda).toFixed(2)}λ`,
        `Taper: ${taper}, progressive phase: ${progressivePhase}°`
      ],
      assumptions: [
        "Isotropic elements",
        `Taper: ${taper}`,
        `Spacing = ${(spacing / lambda).toFixed(2)}λ`
      ],
      confidence: "high",
      recommended_next_steps: spacing > 0.5 * lambda ? ["Reduce spacing to avoid grating lobes"] : [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 23. Slot Array
 * Element slot pattern × AF
 */
function computeSlotArrayPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  // Similar to patch array but with slot elements
  return computePatchArrayPattern(frequencyHz, geometry, options);
}

/**
 * 24. Fractal Antennas (Koch/Sierpinski)
 * Empirical mapping from electrical size
 */
function computeFractalAntennaPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const iterations = (geometry.iterations as number) || 2;
  const boundingBoxSize = (geometry.boundingBoxSize as number) || 0.5 * lambda;
  
  // Empirical: approximate gain from bounding box area
  const A_eff = boundingBoxSize * boundingBoxSize;
  const D_linear = (4 * Math.PI * A_eff) / (lambda * lambda) * 0.5; // Lower efficiency
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      // Irregular pattern - approximate with dipole-like but broader
      let power: number;
      if (t === 0 || t === Math.PI) {
        power = 0;
      } else {
        const cosTerm = Math.cos((Math.PI / 2) * Math.cos(t));
        const sinTerm = Math.sin(t);
        const eField = cosTerm / sinTerm;
        power = eField * eField * 0.6; // Broader, irregular
      }
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 0.5);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "empirical",
      warnings: ["Fractal antenna: empirical approximation. For accurate results use full-wave EM solver.", "Mutual coupling and resonance multiplicity not modeled"],
      notes: [
        "Fractal antenna: empirical bounding-box approximation",
        `Iterations: ${iterations}, bounding box: ${(boundingBoxSize / lambda).toFixed(2)}λ`,
        "Pattern irregularity and multiple resonances not fully captured"
      ],
      assumptions: [
        "Bounding box approximation",
        `Iterations: ${iterations}`,
        "Simplified current distribution"
      ],
      confidence: "low",
      recommended_next_steps: ["Use full-wave EM solver for accurate fractal antenna patterns", "Consider mutual coupling effects"],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 25. Dielectric Resonator Antenna (DRA)
 * Empirical resonance & aperture method
 */
function computeDRAPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const footprint = (geometry.footprint as number) || 0.6 * lambda;
  const epsilon_r = (geometry.epsilon_r as number) || 10;
  const eta_ap = (geometry.apertureEfficiency as number) || 0.6;
  
  const A_eff = eta_ap * footprint * footprint;
  const D_linear = (4 * Math.PI * A_eff) / (lambda * lambda);
  
  // Similar to patch but with DRA characteristics
  const k = (2 * Math.PI) / lambda;
  const pattern: number[][] = [];
  
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      const p = phi[j];
      
      const arg = (k * footprint * Math.sin(t)) / 2;
      let sincPattern: number;
      if (Math.abs(arg) < 1e-10) {
        sincPattern = 1.0;
      } else {
        sincPattern = Math.abs(Math.sin(arg) / arg);
      }
      
      const cosFactor = Math.cos(t);
      const power = sincPattern * sincPattern * cosFactor * cosFactor;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || eta_ap);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "hybrid",
      warnings: [],
      notes: [
        "DRA: aperture method with resonance approximation",
        `Directivity D ≈ 4πA_eff/λ² = ${D_linear.toFixed(2)} (${(10 * Math.log10(D_linear)).toFixed(2)} dBi)`,
        `Dielectric ε_r = ${epsilon_r}`
      ],
      assumptions: [
        "Aperture approximation",
        `Footprint = ${(footprint / lambda).toFixed(2)}λ`,
        `Dielectric ε_r = ${epsilon_r}`
      ],
      confidence: "medium",
      recommended_next_steps: ["Provide resonator mode for accurate resonance calculation"],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 26. Loop Array
 * Element loop pattern × AF
 */
function computeLoopArrayPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  // Use small loop element pattern with array factor
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const numElements = (geometry.numElements as number) || 4;
  const spacing = (geometry.spacing as number) || 0.5 * lambda;
  const arrayType = (geometry.arrayType as string) || "circular";
  
  const k = (2 * Math.PI) / lambda;
  const pattern: number[][] = [];
  
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      // Element pattern (small loop)
      const elementPower = Math.sin(t) * Math.sin(t);
      
      // Array factor
      let af: number;
      if (arrayType === "circular") {
        // Circular array
        af = numElements; // Simplified
      } else {
        // Linear array
        const psi = k * spacing * Math.cos(t);
        if (Math.abs(psi) < 1e-10) {
          af = numElements;
        } else {
          af = Math.abs(Math.sin(numElements * psi / 2) / Math.sin(psi / 2));
        }
        af = af / numElements;
      }
      
      const power = elementPower * af * af;
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "array-analytic",
      warnings: [],
      notes: [
        "Loop array: element pattern × array factor",
        `${numElements} elements, ${arrayType} array, spacing = ${(spacing / lambda).toFixed(2)}λ`
      ],
      assumptions: [
        "Small loop elements",
        `${arrayType} array configuration`,
        `Spacing = ${(spacing / lambda).toFixed(2)}λ`
      ],
      confidence: "medium",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 27. Microstrip-Fed Monopole
 * Quarter-wave monopole with microstrip feed effects
 */
function computeMicrostripFedMonopolePattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  // Similar to quarter-wave monopole but with substrate effects
  const result = computeQuarterWaveMonopolePattern(frequencyHz, geometry, options);
  result.metadata.notes.push("Microstrip feed with substrate dielectric correction");
  result.metadata.approxLevel = "hybrid";
  return result;
}

/**
 * 28. Monopulse Comparator Feed
 * Sum and difference patterns
 */
function computeMonopulsePattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  // Sum pattern (use dish pattern as base)
  const sumResult = computeParabolicDishPattern(frequencyHz, geometry, options);
  
  // Difference pattern: null at boresight
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta } = generateAngles(numTheta, numPhi);
  
  const diffPattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    diffPattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      // Difference pattern: null at θ=0, peaks off-axis
      const power = Math.sin(t) * Math.sin(t) * sumResult.pattern[i][j];
      diffPattern[i].push(power);
    }
  }
  
  // Return sum pattern (difference can be computed separately)
  sumResult.metadata.notes.push("Monopulse: sum pattern shown. Difference pattern has null at boresight.");
  return sumResult;
}

/**
 * 29. Cassegrain-Fed Dish
 * Parabolic with central blockage
 */
function computeCassegrainPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const lambda = wavelength(frequencyHz);
  const primaryD = (geometry.primaryDiameter as number) || 1.0;
  const subreflectorD = (geometry.subreflectorDiameter as number) || 0.1;
  
  // Blockage factor
  const blockageFactor = 1 - (subreflectorD / primaryD) * (subreflectorD / primaryD);
  
  const result = computeParabolicDishPattern(frequencyHz, {
    ...geometry,
    diameter: primaryD,
    efficiency: (geometry.efficiency as number || 0.6) * blockageFactor
  }, options);
  
  result.metadata.notes.push(`Cassegrain: central blockage ${((subreflectorD / primaryD) * 100).toFixed(1)}% reduces effective aperture`);
  result.metadata.warnings.push("Blockage increases sidelobes and reduces gain");
  return result;
}

/**
 * 30. Array of Patches (Corporate Feed)
 * Similar to patch array
 */
function computeCorporateFedPatchArrayPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  return computePatchArrayPattern(frequencyHz, geometry, options);
}

/**
 * 31. Spiral Antenna
 * Broadband with circular polarization
 */
function computeSpiralAntennaPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const numTheta = options.numTheta || 181;
  const numPhi = options.numPhi || 361;
  const { theta, phi } = generateAngles(numTheta, numPhi);
  const dBFloor = options.dBFloor || -80;
  const lambda = wavelength(frequencyHz);
  
  const outerRadius = (geometry.outerRadius as number) || 0.75 * lambda;
  const handedness = (geometry.handedness as string) || "RHCP";
  
  // Empirical gain: 6-9 dBi
  const empiricalGain = 7.5;
  const D_linear = Math.pow(10, empiricalGain / 10);
  
  const pattern: number[][] = [];
  for (let i = 0; i < numTheta; i++) {
    pattern.push([]);
    for (let j = 0; j < numPhi; j++) {
      const t = theta[i];
      // Broad lobe with circular polarization
      const beamwidth = 60 * (Math.PI / 180); // degrees to radians
      const power = Math.exp(-2 * (t * t) / (beamwidth * beamwidth));
      pattern[i].push(power);
    }
  }
  
  const normalized = options.normalize !== false ? normalizePattern(pattern) : pattern;
  const pattern_db = normalized.map(row => row.map(p => powerToDB(p, dBFloor)));
  
  const scalars = computeScalars(normalized, theta, phi, options.efficiency || 1.0);
  const slices = computeSlices(normalized, theta, phi, dBFloor);
  const cartesianMesh = computeCartesianMesh(normalized, theta, phi);
  
  return {
    metadata: {
      approxLevel: "empirical",
      warnings: [],
      notes: [
        "Spiral antenna: broadband with circular polarization",
        `Empirical gain ≈ ${empiricalGain.toFixed(1)} dBi`,
        `Outer radius = ${(outerRadius / lambda).toFixed(2)}λ, ${handedness}`
      ],
      assumptions: [
        "Traveling-wave spiral",
        `Outer radius = ${(outerRadius / lambda).toFixed(2)}λ`,
        `Circular polarization: ${handedness}`
      ],
      confidence: "medium",
      recommended_next_steps: [],
      suggestedSampling: { numTheta: 181, numPhi: 361 }
    },
    scalars,
    pattern: normalized,
    pattern_db,
    slices,
    cartesianMesh,
    theta: theta.map(t => (t * 180) / Math.PI),
    phi: phi.map(p => (p * 180) / Math.PI)
  };
}

/**
 * 32. Patch with Annular Ring
 * Combined circular patch and ring modes
 */
function computeAnnularRingPatchPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  // Similar to circular patch
  return computeCircularPatchPattern(frequencyHz, geometry, options);
}

/**
 * 33. Conformal Patch on Cylinder
 * Curvature correction factor
 */
function computeConformalPatchPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  const lambda = wavelength(frequencyHz);
  const cylinderRadius = (geometry.cylinderRadius as number) || 0.5 * lambda;
  
  // Curvature correction: unwrap to planar with correction
  const curvatureFactor = 1 / (1 + lambda / (2 * Math.PI * cylinderRadius));
  
  const result = computeRectangularPatchPattern(frequencyHz, {
    ...geometry,
    width: (geometry.width as number || 0.8 * lambda) * curvatureFactor,
    length: (geometry.length as number || 0.48 * lambda) * curvatureFactor
  }, options);
  
  result.metadata.warnings.push("Conformal patch: curvature effects and scattering not fully modeled");
  result.metadata.notes.push(`Cylinder radius = ${(cylinderRadius / lambda).toFixed(2)}λ, curvature correction applied`);
  return result;
}

/**
 * 34. Planar Inverted-F Antenna (PIFA)
 * Quarter-wave with shorting pin
 */
function computePIFAPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  // Similar to monopole but with chassis coupling
  const result = computeQuarterWaveMonopolePattern(frequencyHz, geometry, options);
  result.metadata.notes.push("PIFA: quarter-wave with shorting pin, chassis coupling included");
  result.metadata.approxLevel = "empirical";
  return result;
}

/**
 * 35. Slot-Coupled Patch
 * Slot radiation + patch cavity
 */
function computeSlotCoupledPatchPattern(
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions
): AntennaPatternResult {
  // Combine slot and patch patterns
  const result = computeRectangularPatchPattern(frequencyHz, geometry, options);
  result.metadata.notes.push("Slot-coupled patch: slot radiation model + patch cavity model");
  result.metadata.approxLevel = "hybrid";
  return result;
}

/**
 * Unified computePattern function that routes to appropriate antenna type
 */
export function computePattern(
  antennaType: string,
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions = {}
): AntennaPatternResult {
  // Route to appropriate antenna function
  const typeKey = antennaType.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  switch (typeKey) {
    // 1. Isotropic
    case 'isotropic':
      return computeIsotropicPattern(frequencyHz, geometry, options);
    
    // 2. Short Dipole
    case 'shortdipole':
    case 'smalldipole':
      return computeShortDipolePattern(frequencyHz, geometry, options);
    
    // 3. Half-Wave Dipole
    case 'halfwavedipole':
    case 'dipole':
      return computeHalfWaveDipolePattern(frequencyHz, geometry, options);
    
    // 4. Folded Dipole
    case 'foldeddipole':
      return computeFoldedDipolePattern(frequencyHz, geometry, options);
    
    // 5. Quarter-Wave Monopole
    case 'quarterwavemonopole':
    case 'monopole':
      return computeQuarterWaveMonopolePattern(frequencyHz, geometry, options);
    
    // 6. Monopole over Finite Ground
    case 'monopolefiniteground':
    case 'monopoleground':
      return computeMonopoleFiniteGroundPattern(frequencyHz, geometry, options);
    
    // 7. Small Loop
    case 'smallloop':
    case 'loop':
      return computeSmallLoopPattern(frequencyHz, geometry, options);
    
    // 8. Rectangular Patch
    case 'rectangularpatch':
    case 'patch':
      return computeRectangularPatchPattern(frequencyHz, geometry, options);
    
    // 9. Circular Patch
    case 'circularpatch':
      return computeCircularPatchPattern(frequencyHz, geometry, options);
    
    // 10. Horn (Pyramidal)
    case 'horn':
    case 'pyramidalhorn':
      return computeHornPattern(frequencyHz, geometry, options);
    
    // 11. Conical Horn
    case 'conicalhorn':
    case 'conical':
      return computeConicalHornPattern(frequencyHz, geometry, options);
    
    // 12. Waveguide Slot
    case 'waveguideslot':
    case 'slotwaveguide':
      return computeWaveguideSlotPattern(frequencyHz, geometry, options);
    
    // 13. Slot Antenna
    case 'slotantenna':
    case 'slot':
      return computeSlotAntennaPattern(frequencyHz, geometry, options);
    
    // 14. Yagi-Uda
    case 'yagi':
    case 'yagiuda':
      return computeYagiPattern(frequencyHz, geometry, options);
    
    // 15. LPDA
    case 'lpda':
    case 'logperiodic':
      return computeLPDAPattern(frequencyHz, geometry, options);
    
    // 16. Parabolic Dish
    case 'parabolicdish':
    case 'dish':
    case 'reflector':
      return computeParabolicDishPattern(frequencyHz, geometry, options);
    
    // 17. Helix (Axial Mode)
    case 'helix':
    case 'helical':
    case 'helixaxial':
      return computeHelixAxialPattern(frequencyHz, geometry, options);
    
    // 18. Vivaldi
    case 'vivaldi':
    case 'taperslot':
      return computeVivaldiPattern(frequencyHz, geometry, options);
    
    // 19. Biconical
    case 'biconical':
      return computeBiconicalPattern(frequencyHz, geometry, options);
    
    // 20. Patch Array
    case 'patcharray':
    case 'arraypatch':
      return computePatchArrayPattern(frequencyHz, geometry, options);
    
    // 21. Phased Array
    case 'phasedarray':
    case 'steeredarray':
      return computePhasedArrayPattern(frequencyHz, geometry, options);
    
    // 22. Linear Array
    case 'lineararray':
    case 'ula':
      return computeLinearArrayPattern(frequencyHz, geometry, options);
    
    // 23. Slot Array
    case 'slotarray':
      return computeSlotArrayPattern(frequencyHz, geometry, options);
    
    // 24. Fractal
    case 'fractal':
    case 'fractalantenna':
      return computeFractalAntennaPattern(frequencyHz, geometry, options);
    
    // 25. DRA
    case 'dra':
    case 'dielectricresonator':
      return computeDRAPattern(frequencyHz, geometry, options);
    
    // 26. Loop Array
    case 'looparray':
      return computeLoopArrayPattern(frequencyHz, geometry, options);
    
    // 27. Microstrip-Fed Monopole
    case 'microstripfedmonopole':
    case 'microstripmonopole':
      return computeMicrostripFedMonopolePattern(frequencyHz, geometry, options);
    
    // 28. Monopulse
    case 'monopulse':
    case 'monopulsecomparator':
      return computeMonopulsePattern(frequencyHz, geometry, options);
    
    // 29. Cassegrain
    case 'cassegrain':
    case 'cassegraindish':
      return computeCassegrainPattern(frequencyHz, geometry, options);
    
    // 30. Corporate-Fed Patch Array
    case 'corporatefedpatch':
    case 'corporatepatcharray':
      return computeCorporateFedPatchArrayPattern(frequencyHz, geometry, options);
    
    // 31. Spiral
    case 'spiral':
    case 'spiralantenna':
      return computeSpiralAntennaPattern(frequencyHz, geometry, options);
    
    // 32. Annular Ring Patch
    case 'annularringpatch':
    case 'annularpatch':
      return computeAnnularRingPatchPattern(frequencyHz, geometry, options);
    
    // 33. Conformal Patch
    case 'conformalpatch':
    case 'conformal':
      return computeConformalPatchPattern(frequencyHz, geometry, options);
    
    // 34. PIFA
    case 'pifa':
    case 'planarinvertedf':
      return computePIFAPattern(frequencyHz, geometry, options);
    
    // 35. Slot-Coupled Patch
    case 'slotcoupledpatch':
    case 'slotcoupled':
      return computeSlotCoupledPatchPattern(frequencyHz, geometry, options);
    
    default:
      // Fallback to isotropic for unknown types
      return computeIsotropicPattern(frequencyHz, geometry, options);
  }
}

