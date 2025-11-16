/**
 * Antenna Pattern Analyzer - Antenna Models
 * 
 * This module provides pattern functions for various antenna types.
 * All patterns are normalized approximations suitable for engineering planning.
 * 
 * Pattern functions return normalized power gain (0-1) for given (θ, φ)
 * where θ ∈ [0, π] (elevation, 0 = zenith) and φ ∈ [0, 2π] (azimuth)
 * 
 * References:
 * - Balanis, C.A., "Antenna Theory: Analysis and Design", 3rd Edition
 * - Kraus, J.D., Marhefka, R.J., "Antennas: For All Applications", 3rd Edition
 */

import { wavelength, arrayFactorLinear, arrayFactorPlanar, arrayFactorCircular } from "./math";

// ============================================================================
// Type Definitions
// ============================================================================

export interface AntennaParams {
  [key: string]: number | string | boolean | undefined;
}

export interface ArrayParams {
  numElements: number;
  spacing: number;
  progressivePhase?: number;
  taper?: "uniform" | "taylor";
  taylorNbar?: number;
  taylorSLL?: number;
}

export type PatternFunction = (theta: number, phi: number, params: AntennaParams, wavelength: number) => number;

// ============================================================================
// Basic Antennas
// ============================================================================

/**
 * 1. Isotropic Antenna
 * Uniform radiation in all directions
 */
export const isotropicPattern: PatternFunction = () => {
  return 1.0;
};

/**
 * 2. Short Dipole
 * E(θ) ∝ sin(θ)
 * Reference: Balanis, Eq. 4.26
 */
export const shortDipolePattern: PatternFunction = (theta) => {
  return Math.sin(theta) * Math.sin(theta); // Power pattern
};

/**
 * 3. Half-Wave Dipole
 * E(θ) ∝ cos((π/2)cos(θ)) / sin(θ)
 * Reference: Balanis, Eq. 4.56
 */
export const halfWaveDipolePattern: PatternFunction = (theta) => {
  if (theta === 0 || theta === Math.PI) return 0;
  const cosTerm = Math.cos((Math.PI / 2) * Math.cos(theta));
  const sinTerm = Math.sin(theta);
  const eField = cosTerm / sinTerm;
  return eField * eField; // Power pattern
};

/**
 * 4. Folded Dipole
 * Similar to half-wave dipole but with slightly different impedance
 * Pattern is approximately the same
 */
export const foldedDipolePattern: PatternFunction = (theta) => {
  return halfWaveDipolePattern(theta, 0, {}, 0);
};

/**
 * 5. Quarter-Wave Monopole
 * Pattern above ground plane: E(θ) ∝ sin(θ) for θ < π/2
 * Reference: Balanis, Section 4.5
 */
export const quarterWaveMonopolePattern: PatternFunction = (theta) => {
  if (theta > Math.PI / 2) return 0; // Below ground plane
  return Math.sin(theta) * Math.sin(theta);
};

/**
 * 6. Ground-Plane Monopole
 * Similar to quarter-wave but with finite ground plane
 */
export const groundPlaneMonopolePattern: PatternFunction = (theta, phi, params) => {
  const groundRadius = (params.groundRadius as number) || 0.5;
  const lambda = wavelength;
  // Simplified: pattern degrades below horizon based on ground plane size
  if (theta > Math.PI / 2) {
    const suppression = Math.exp(-(theta - Math.PI / 2) * (groundRadius / lambda));
    return suppression * Math.sin(theta) * Math.sin(theta);
  }
  return Math.sin(theta) * Math.sin(theta);
};

// ============================================================================
// Patch Antennas
// ============================================================================

/**
 * 7. Rectangular Patch
 * Approximate pattern using cavity model
 * Reference: Balanis, Section 14.2
 */
export const rectangularPatchPattern: PatternFunction = (theta, phi, params) => {
  const length = (params.length as number) || 0.5;
  const width = (params.width as number) || 0.5;
  const lambda = wavelength;
  
  // E-plane (φ = 0) and H-plane (φ = π/2) patterns
  const k = (2 * Math.PI) / lambda;
  const ePlane = Math.cos((k * length / 2) * Math.sin(theta) * Math.cos(phi));
  const hPlane = Math.cos((k * width / 2) * Math.sin(theta) * Math.sin(phi));
  
  return ePlane * ePlane * hPlane * hPlane * Math.sin(theta) * Math.sin(theta);
};

/**
 * 8. Circular Patch
 * Similar to rectangular but with circular symmetry
 */
export const circularPatchPattern: PatternFunction = (theta, phi, params) => {
  const radius = (params.radius as number) || 0.5;
  const lambda = wavelength;
  
  const k = (2 * Math.PI) / lambda;
  const ka = k * radius;
  const u = ka * Math.sin(theta);
  
  // Bessel function approximation J1(u)/u
  let besselTerm = 1;
  if (Math.abs(u) > 0.01) {
    // Approximation: J1(u) ≈ (u/2) * (1 - (u/2)²/2) for small u
    const u2 = u / 2;
    besselTerm = (2 / u) * u2 * (1 - (u2 * u2) / 2);
  }
  
  return besselTerm * besselTerm * Math.sin(theta) * Math.sin(theta);
};

/**
 * 9. Slotted Patch
 * Similar to patch but with slot loading
 */
export const slottedPatchPattern: PatternFunction = (theta, phi, params) => {
  return rectangularPatchPattern(theta, phi, params);
};

/**
 * 10. Stacked Patch
 * Dual-band or broadband patch with stacked elements
 */
export const stackedPatchPattern: PatternFunction = (theta, phi, params) => {
  // Simplified: similar to single patch but with slightly broader pattern
  const basePattern = rectangularPatchPattern(theta, phi, params);
  return basePattern * 0.9; // Slight degradation
};

// ============================================================================
// Horn Antennas
// ============================================================================

/**
 * 11. Standard Horn (Pyramidal/Conical)
 * Approximate pattern with cosⁿ(θ) weighting
 * Reference: Balanis, Section 13.3
 */
export const hornPattern: PatternFunction = (theta, phi, params) => {
  const mouthWidth = (params.mouthWidth as number) || 1.0;
  const mouthHeight = (params.mouthHeight as number) || 1.0;
  const lambda = wavelength;
  
  const k = (2 * Math.PI) / lambda;
  
  // E-plane pattern
  const ePlane = Math.sin((k * mouthWidth / 2) * Math.sin(theta) * Math.cos(phi)) /
                 ((k * mouthWidth / 2) * Math.sin(theta) * Math.cos(phi) + 1e-10);
  
  // H-plane pattern
  const hPlane = Math.sin((k * mouthHeight / 2) * Math.sin(theta) * Math.sin(phi)) /
                 ((k * mouthHeight / 2) * Math.sin(theta) * Math.sin(phi) + 1e-10);
  
  return ePlane * ePlane * hPlane * hPlane * Math.cos(theta) * Math.cos(theta);
};

// ============================================================================
// Reflector Antennas
// ============================================================================

/**
 * 12. Parabolic Dish (Prime Focus)
 * Gain pattern with main lobe and side lobes
 * Reference: Balanis, Section 15.4
 */
export const parabolicDishPattern: PatternFunction = (theta, phi, params) => {
  const diameter = (params.diameter as number) || 1.0;
  const efficiency = (params.efficiency as number) || 0.6;
  const lambda = wavelength;
  
  const k = (2 * Math.PI) / lambda;
  const ka = k * (diameter / 2);
  const u = ka * Math.sin(theta);
  
  // Circular aperture pattern: 2*J1(u)/u
  let pattern = 1;
  if (Math.abs(u) > 0.01) {
    // J1(u) approximation
    const u2 = u / 2;
    const j1 = u2 * (1 - (u2 * u2) / 2);
    pattern = (2 * j1) / u;
  }
  
  // Add side lobes (simplified)
  const sidelobe = 0.1 * Math.sin(1.5 * u) / (1.5 * u + 1e-10);
  
  return Math.max(0, (pattern * pattern + sidelobe * sidelobe) * efficiency);
};

/**
 * 13. Cassegrain
 * Similar to parabolic but with subreflector
 */
export const cassegrainPattern: PatternFunction = (theta, phi, params) => {
  // Simplified: similar to prime focus but with slightly different efficiency
  const basePattern = parabolicDishPattern(theta, phi, params);
  return basePattern * 0.95; // Slight efficiency loss
};

// ============================================================================
// Helical Antennas
// ============================================================================

/**
 * 14. Helical Axial-Mode
 * Circularly polarized, main lobe along axis
 * Reference: Balanis, Section 10.3
 */
export const helicalAxialPattern: PatternFunction = (theta, phi, params) => {
  const diameter = (params.diameter as number) || 0.3;
  const pitch = (params.pitch as number) || 0.25;
  const turns = (params.turns as number) || 10;
  const lambda = wavelength;
  
  const circumference = Math.PI * diameter;
  const cOverLambda = circumference / lambda;
  
  // Approximate pattern: cosⁿ(θ) with n based on turns
  const n = Math.min(10, turns * 0.5);
  const cosTerm = Math.pow(Math.cos(theta), n);
  
  // Add nulls at specific angles (simplified)
  return cosTerm * cosTerm;
};

/**
 * 15. Helical Normal-Mode
 * Smaller helix, omnidirectional pattern
 */
export const helicalNormalPattern: PatternFunction = (theta) => {
  // More omnidirectional
  return Math.sin(theta) * Math.sin(theta);
};

// ============================================================================
// Yagi-Uda Antennas
// ============================================================================

/**
 * 16. Yagi-Uda (N-element)
 * Directional array with driven, reflector, and directors
 * Reference: Balanis, Section 10.4
 */
export const yagiPattern: PatternFunction = (theta, phi, params) => {
  const numElements = (params.numElements as number) || 5;
  const spacing = (params.spacing as number) || 0.25;
  const lambda = wavelength;
  
  // Element pattern (half-wave dipole)
  const elementPattern = halfWaveDipolePattern(theta, phi, {}, lambda);
  
  // Array factor (simplified linear array)
  const k = (2 * Math.PI) / lambda;
  const psi = k * spacing * Math.cos(theta);
  let af = 1;
  if (numElements > 1) {
    af = Math.abs(Math.sin((numElements * psi) / 2) / (Math.sin(psi / 2) + 1e-10)) / numElements;
  }
  
  return elementPattern * af * af;
};

// ============================================================================
// Log-Periodic Antennas
// ============================================================================

/**
 * 17. LPDA (Log-Periodic Dipole Array)
 * Broadband directional antenna
 * Simplified model
 */
export const lpdaPattern: PatternFunction = (theta, phi, params) => {
  // Similar to Yagi but with frequency-dependent behavior
  return yagiPattern(theta, phi, params);
};

// ============================================================================
// Spiral and Tapered Slot Antennas
// ============================================================================

/**
 * 18. Spiral (Archimedean/Equiangular)
 * Circularly polarized, broadband
 */
export const spiralPattern: PatternFunction = (theta) => {
  // Broad beam, circularly polarized
  const cosTerm = Math.pow(Math.cos(theta), 2);
  return cosTerm;
};

/**
 * 19. Vivaldi (Tapered Slot)
 * End-fire, broadband
 */
export const vivaldiPattern: PatternFunction = (theta, phi) => {
  // End-fire pattern
  const endfire = Math.pow(Math.cos(theta), 4);
  return endfire;
};

/**
 * 20. Biconical
 * Broadband, omnidirectional in azimuth
 */
export const biconicalPattern: PatternFunction = (theta) => {
  return Math.sin(theta) * Math.sin(theta);
};

// ============================================================================
// Waveguide Antennas
// ============================================================================

/**
 * 21. Waveguide Slot
 * Slotted waveguide array pattern
 */
export const waveguideSlotPattern: PatternFunction = (theta, phi, params) => {
  return hornPattern(theta, phi, params);
};

// ============================================================================
// Array Antennas
// ============================================================================

/**
 * 22-26. Planar Patch Arrays
 */
export const patchArrayPattern: PatternFunction = (theta, phi, params) => {
  const numX = (params.numElementsX as number) || 2;
  const numY = (params.numElementsY as number) || 2;
  const spacingX = (params.spacingX as number) || 0.5;
  const spacingY = (params.spacingY as number) || 0.5;
  const lambda = wavelength;
  
  // Element pattern (patch)
  const elementPattern = rectangularPatchPattern(theta, phi, params);
  
  // Array factor
  const af = arrayFactorPlanar(
    theta,
    phi,
    lambda,
    numX,
    numY,
    spacingX * lambda,
    spacingY * lambda,
    (params.phaseX as number) || 0,
    (params.phaseY as number) || 0
  );
  
  return elementPattern * af * af;
};

/**
 * 27. Linear Phased Array
 */
export const linearPhasedArrayPattern: PatternFunction = (theta, phi, params) => {
  const numElements = (params.numElements as number) || 4;
  const spacing = (params.spacing as number) || 0.5;
  const steeringAngle = ((params.steeringAngle as number) || 0) * (Math.PI / 180);
  const lambda = wavelength;
  
  // Element pattern (isotropic for simplicity, can be changed)
  const elementPattern = 1;
  
  // Progressive phase for steering
  const k = (2 * Math.PI) / lambda;
  const progressivePhase = -k * spacing * lambda * Math.sin(steeringAngle);
  
  // Array factor
  const af = arrayFactorLinear(theta, lambda, numElements, spacing * lambda, progressivePhase);
  
  return elementPattern * af * af;
};

/**
 * 28. Planar Phased Array (Steerable)
 */
export const planarPhasedArrayPattern: PatternFunction = (theta, phi, params) => {
  return patchArrayPattern(theta, phi, params);
};

/**
 * 29. Circular Phased Array
 */
export const circularPhasedArrayPattern: PatternFunction = (theta, phi, params) => {
  const numElements = (params.numElements as number) || 8;
  const radius = (params.radius as number) || 0.5;
  const lambda = wavelength;
  
  const elementPattern = 1; // Isotropic elements
  const af = arrayFactorCircular(theta, phi, lambda, numElements, radius * lambda, 0);
  
  return elementPattern * af * af;
};

/**
 * 30. Conformal Cylindrical Array
 */
export const conformalArrayPattern: PatternFunction = (theta, phi, params) => {
  // Simplified: similar to circular array
  return circularPhasedArrayPattern(theta, phi, params);
};

// ============================================================================
// Specialty Antennas
// ============================================================================

/**
 * 31. Quadrifilar Helix (QHA) / Turnstile
 * Circularly polarized, used for GNSS
 */
export const quadrifilarHelixPattern: PatternFunction = (theta) => {
  // Hemispherical coverage with RHCP
  const cosTerm = Math.pow(Math.cos(theta / 2), 2);
  return cosTerm;
};

/**
 * 32. GNSS Patch (L1/L2)
 * Broad-beam RHCP for satellite reception
 */
export const gnssPatchPattern: PatternFunction = (theta) => {
  // Hemispherical with good coverage up to ~60° elevation
  if (theta > (2 * Math.PI / 3)) return 0;
  const cosTerm = Math.pow(Math.cos(theta), 1.5);
  return cosTerm;
};

/**
 * 33. Dielectric Resonator Antenna (DRA)
 * Compact, efficient
 */
export const draPattern: PatternFunction = (theta, phi, params) => {
  // Similar to patch antenna
  return rectangularPatchPattern(theta, phi, params);
};

// ============================================================================
// Antenna Registry
// ============================================================================

export interface AntennaType {
  id: string;
  name: string;
  description: string;
  pattern: PatternFunction;
  defaultParams: AntennaParams;
  paramLabels: { [key: string]: string };
}

export const ANTENNA_TYPES: AntennaType[] = [
  {
    id: "isotropic",
    name: "Isotropic",
    description: "Uniform radiation in all directions (theoretical reference)",
    pattern: isotropicPattern,
    defaultParams: {},
    paramLabels: {},
  },
  {
    id: "short-dipole",
    name: "Short Dipole",
    description: "Short dipole antenna (L << λ)",
    pattern: shortDipolePattern,
    defaultParams: {},
    paramLabels: {},
  },
  {
    id: "half-wave-dipole",
    name: "Half-Wave Dipole",
    description: "Standard half-wavelength dipole",
    pattern: halfWaveDipolePattern,
    defaultParams: {},
    paramLabels: {},
  },
  {
    id: "folded-dipole",
    name: "Folded Dipole",
    description: "Folded dipole with higher impedance",
    pattern: foldedDipolePattern,
    defaultParams: {},
    paramLabels: {},
  },
  {
    id: "quarter-monopole",
    name: "Quarter-Wave Monopole",
    description: "Quarter-wavelength monopole over ground plane",
    pattern: quarterWaveMonopolePattern,
    defaultParams: {},
    paramLabels: {},
  },
  {
    id: "ground-monopole",
    name: "Ground-Plane Monopole",
    description: "Monopole with finite ground plane",
    pattern: groundPlaneMonopolePattern,
    defaultParams: { groundRadius: 0.5 },
    paramLabels: { groundRadius: "Ground Plane Radius (m)" },
  },
  {
    id: "rect-patch",
    name: "Rectangular Patch",
    description: "Rectangular microstrip patch antenna",
    pattern: rectangularPatchPattern,
    defaultParams: { length: 0.05, width: 0.05 },
    paramLabels: { length: "Length (m)", width: "Width (m)" },
  },
  {
    id: "circ-patch",
    name: "Circular Patch",
    description: "Circular microstrip patch antenna",
    pattern: circularPatchPattern,
    defaultParams: { radius: 0.05 },
    paramLabels: { radius: "Radius (m)" },
  },
  {
    id: "parabolic-dish",
    name: "Parabolic Dish",
    description: "Prime focus parabolic reflector",
    pattern: parabolicDishPattern,
    defaultParams: { diameter: 1.0, efficiency: 0.6 },
    paramLabels: { diameter: "Diameter (m)", efficiency: "Efficiency (0-1)" },
  },
  {
    id: "helical-axial",
    name: "Helical (Axial Mode)",
    description: "Axial-mode helical antenna (circularly polarized)",
    pattern: helicalAxialPattern,
    defaultParams: { diameter: 0.3, pitch: 0.25, turns: 10 },
    paramLabels: { diameter: "Diameter (m)", pitch: "Pitch (m)", turns: "Number of Turns" },
  },
  {
    id: "yagi",
    name: "Yagi-Uda",
    description: "Yagi-Uda directional array",
    pattern: yagiPattern,
    defaultParams: { numElements: 5, spacing: 0.25 },
    paramLabels: { numElements: "Number of Elements", spacing: "Spacing (λ)" },
  },
  {
    id: "patch-array",
    name: "Patch Array",
    description: "Planar patch array (2×2, 4×4, etc.)",
    pattern: patchArrayPattern,
    defaultParams: { numElementsX: 2, numElementsY: 2, spacingX: 0.5, spacingY: 0.5 },
    paramLabels: {
      numElementsX: "Elements (X)",
      numElementsY: "Elements (Y)",
      spacingX: "Spacing X (λ)",
      spacingY: "Spacing Y (λ)",
    },
  },
  {
    id: "linear-array",
    name: "Linear Phased Array",
    description: "Linear array with beam steering",
    pattern: linearPhasedArrayPattern,
    defaultParams: { numElements: 4, spacing: 0.5, steeringAngle: 0 },
    paramLabels: {
      numElements: "Number of Elements",
      spacing: "Spacing (λ)",
      steeringAngle: "Steering Angle (deg)",
    },
  },
  {
    id: "gnss-patch",
    name: "GNSS Patch",
    description: "GNSS L1/L2 broad-beam RHCP patch",
    pattern: gnssPatchPattern,
    defaultParams: {},
    paramLabels: {},
  },
  {
    id: "qha",
    name: "Quadrifilar Helix",
    description: "QHA for circular polarization",
    pattern: quadrifilarHelixPattern,
    defaultParams: {},
    paramLabels: {},
  },
];

// Helper to get antenna by ID
export const getAntennaById = (id: string): AntennaType | undefined => {
  return ANTENNA_TYPES.find((ant) => ant.id === id);
};

