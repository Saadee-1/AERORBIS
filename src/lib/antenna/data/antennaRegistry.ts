/**
 * Unified Antenna Registry
 * 
 * Maps all antenna IDs to their corresponding computePattern type names
 * and provides metadata for consistent loading across the application.
 */

import { ANTENNA_TYPES, AntennaType } from "../models";
import { computePattern, AntennaPatternResult, AntennaGeometry, PatternOptions } from "../models-enhanced";

/**
 * Antenna Registry Entry
 */
export interface AntennaRegistryEntry {
  id: string;
  name: string;
  description: string;
  computeType: string; // Type name for computePattern function
  defaultParams: { [key: string]: number | string | boolean | undefined };
  paramLabels: { [key: string]: string };
}

/**
 * Unified Antenna Registry
 * Maps antenna IDs to their computePattern type names and metadata
 */
export const ANTENNA_REGISTRY: Record<string, AntennaRegistryEntry> = {
  "isotropic": {
    id: "isotropic",
    name: "Isotropic",
    description: "Uniform radiation in all directions (theoretical reference)",
    computeType: "isotropic",
    defaultParams: {},
    paramLabels: {},
  },
  "short-dipole": {
    id: "short-dipole",
    name: "Short Dipole",
    description: "Short dipole antenna (L << λ)",
    computeType: "shortdipole",
    defaultParams: {},
    paramLabels: {},
  },
  "half-wave-dipole": {
    id: "half-wave-dipole",
    name: "Half-Wave Dipole",
    description: "Standard half-wavelength dipole",
    computeType: "halfwavedipole",
    defaultParams: {},
    paramLabels: {},
  },
  "folded-dipole": {
    id: "folded-dipole",
    name: "Folded Dipole",
    description: "Folded dipole with higher impedance",
    computeType: "foldeddipole",
    defaultParams: {},
    paramLabels: {},
  },
  "quarter-monopole": {
    id: "quarter-monopole",
    name: "Quarter-Wave Monopole",
    description: "Quarter-wavelength monopole over ground plane",
    computeType: "quarterwavemonopole",
    defaultParams: {},
    paramLabels: {},
  },
  "ground-monopole": {
    id: "ground-monopole",
    name: "Ground-Plane Monopole",
    description: "Monopole with finite ground plane",
    computeType: "monopoleground",
    defaultParams: { groundRadius: 0.5 },
    paramLabels: { groundRadius: "Ground Plane Radius (m)" },
  },
  "patch": {
    id: "patch",
    name: "Patch / Microstrip Antenna",
    description: "Rectangular microstrip patch antenna (generic)",
    computeType: "rectangularpatch",
    defaultParams: { length: 0.05, width: 0.05 },
    paramLabels: { length: "Length (m)", width: "Width (m)" },
  },
  "rect-patch": {
    id: "rect-patch",
    name: "Rectangular Patch",
    description: "Rectangular microstrip patch antenna",
    computeType: "rectangularpatch",
    defaultParams: { length: 0.05, width: 0.05 },
    paramLabels: { length: "Length (m)", width: "Width (m)" },
  },
  "circ-patch": {
    id: "circ-patch",
    name: "Circular Patch",
    description: "Circular microstrip patch antenna",
    computeType: "circularpatch",
    defaultParams: { radius: 0.05 },
    paramLabels: { radius: "Radius (m)" },
  },
  "parabolic-dish": {
    id: "parabolic-dish",
    name: "Parabolic Dish",
    description: "Prime focus parabolic reflector",
    computeType: "parabolicdish",
    defaultParams: { diameter: 1.0, efficiency: 0.6 },
    paramLabels: { diameter: "Diameter (m)", efficiency: "Efficiency (0-1)" },
  },
  "helical-axial": {
    id: "helical-axial",
    name: "Helical (Axial Mode)",
    description: "Axial-mode helical antenna (circularly polarized)",
    computeType: "helix",
    defaultParams: { diameter: 0.3, pitch: 0.25, turns: 10 },
    paramLabels: { diameter: "Diameter (m)", pitch: "Pitch (m)", turns: "Number of Turns" },
  },
  "yagi": {
    id: "yagi",
    name: "Yagi-Uda",
    description: "Yagi-Uda directional array",
    computeType: "yagi",
    defaultParams: { numElements: 5, spacing: 0.25 },
    paramLabels: { numElements: "Number of Elements", spacing: "Spacing (λ)" },
  },
  "patch-array": {
    id: "patch-array",
    name: "Patch Array",
    description: "Planar patch array (2×2, 4×4, etc.)",
    computeType: "patcharray",
    defaultParams: { numElementsX: 2, numElementsY: 2, spacingX: 0.5, spacingY: 0.5 },
    paramLabels: {
      numElementsX: "Elements (X)",
      numElementsY: "Elements (Y)",
      spacingX: "Spacing X (λ)",
      spacingY: "Spacing Y (λ)",
    },
  },
  "linear-array": {
    id: "linear-array",
    name: "Linear Phased Array",
    description: "Linear array with beam steering",
    computeType: "lineararray",
    defaultParams: { numElements: 4, spacing: 0.5, steeringAngle: 0 },
    paramLabels: {
      numElements: "Number of Elements",
      spacing: "Spacing (λ)",
      steeringAngle: "Steering Angle (deg)",
    },
  },
  "gnss-patch": {
    id: "gnss-patch",
    name: "GNSS Patch",
    description: "GNSS L1/L2 broad-beam RHCP patch",
    computeType: "rectangularpatch",
    defaultParams: {},
    paramLabels: {},
  },
  "qha": {
    id: "qha",
    name: "Quadrifilar Helix",
    description: "QHA for circular polarization",
    computeType: "helix",
    defaultParams: {},
    paramLabels: {},
  },
  // Additional antenna types
  "helical-normal": {
    id: "helical-normal",
    name: "Helical (Normal Mode)",
    description: "Normal-mode helical antenna (smaller than λ/4, broadside pattern)",
    computeType: "helix",
    defaultParams: { diameter: 0.1, pitch: 0.05, turns: 3 },
    paramLabels: { diameter: "Diameter (m)", pitch: "Pitch (m)", turns: "Number of Turns" },
  },
  "horn-pyramidal": {
    id: "horn-pyramidal",
    name: "Pyramidal Horn",
    description: "Pyramidal horn antenna with rectangular aperture",
    computeType: "pyramidalhorn",
    defaultParams: { apertureWidth: 0.5, apertureHeight: 0.4, hornLength: 1.0 },
    paramLabels: { 
      apertureWidth: "Aperture Width (m)", 
      apertureHeight: "Aperture Height (m)",
      hornLength: "Horn Length (m)" 
    },
  },
  "horn-sectoral": {
    id: "horn-sectoral",
    name: "Sectoral Horn",
    description: "Sectoral horn antenna (flared in one plane only)",
    computeType: "horn",
    defaultParams: { apertureWidth: 0.5, apertureHeight: 0.1, hornLength: 1.0 },
    paramLabels: { 
      apertureWidth: "Aperture Width (m)", 
      apertureHeight: "Aperture Height (m)",
      hornLength: "Horn Length (m)" 
    },
  },
  "cassegrain": {
    id: "cassegrain",
    name: "Cassegrain Reflector",
    description: "Cassegrain dual-reflector antenna system",
    computeType: "cassegrain",
    defaultParams: { diameter: 2.0, efficiency: 0.65, subreflectorDiameter: 0.3 },
    paramLabels: { 
      diameter: "Main Dish Diameter (m)", 
      efficiency: "Efficiency (0-1)",
      subreflectorDiameter: "Subreflector Diameter (m)" 
    },
  },
  "small-loop": {
    id: "small-loop",
    name: "Small Loop Antenna",
    description: "Small loop antenna (circumference << λ)",
    computeType: "smallloop",
    defaultParams: { radius: 0.05 },
    paramLabels: { radius: "Loop Radius (m)" },
  },
  "large-loop": {
    id: "large-loop",
    name: "Large Loop Antenna",
    description: "Large loop antenna (circumference ≈ λ)",
    computeType: "loop",
    defaultParams: { radius: 0.15, numTurns: 1 },
    paramLabels: { radius: "Loop Radius (m)", numTurns: "Number of Turns" },
  },
  "spiral": {
    id: "spiral",
    name: "Spiral Antenna (Archimedean)",
    description: "Archimedean spiral antenna for broadband applications",
    computeType: "spiral",
    defaultParams: { outerRadius: 0.15, innerRadius: 0.02, numTurns: 3 },
    paramLabels: { 
      outerRadius: "Outer Radius (m)", 
      innerRadius: "Inner Radius (m)",
      numTurns: "Number of Turns" 
    },
  },
  "fractal-koch": {
    id: "fractal-koch",
    name: "Fractal Antenna (Koch Curve)",
    description: "Koch curve fractal antenna",
    computeType: "fractal",
    defaultParams: { iterations: 3, boundingBoxSize: 0.2 },
    paramLabels: { 
      iterations: "Fractal Iterations", 
      boundingBoxSize: "Bounding Box Size (m)" 
    },
  },
  "fractal-sierpinski": {
    id: "fractal-sierpinski",
    name: "Fractal Antenna (Sierpinski)",
    description: "Sierpinski triangle fractal antenna",
    computeType: "fractal",
    defaultParams: { iterations: 4, boundingBoxSize: 0.2 },
    paramLabels: { 
      iterations: "Fractal Iterations", 
      boundingBoxSize: "Bounding Box Size (m)" 
    },
  },
  "slot": {
    id: "slot",
    name: "Slot Antenna",
    description: "Slot antenna cut in conducting sheet",
    computeType: "slotantenna",
    defaultParams: { slotLength: 0.5, slotWidth: 0.05 },
    paramLabels: { slotLength: "Slot Length (m)", slotWidth: "Slot Width (m)" },
  },
  "waveguide-slot": {
    id: "waveguide-slot",
    name: "Waveguide Slot Array",
    description: "Array of slots in waveguide wall",
    computeType: "slotarray",
    defaultParams: { numElements: 8, spacing: 0.5, slotLength: 0.4 },
    paramLabels: { 
      numElements: "Number of Slots", 
      spacing: "Spacing (λ)",
      slotLength: "Slot Length (m)" 
    },
  },
  "endfire-array": {
    id: "endfire-array",
    name: "End-Fire Array",
    description: "End-fire array with maximum radiation along array axis",
    computeType: "lineararray",
    defaultParams: { numElements: 4, spacing: 0.25, steeringAngle: 0, progressivePhase: -90 },
    paramLabels: { 
      numElements: "Number of Elements", 
      spacing: "Spacing (λ)",
      steeringAngle: "Steering Angle (deg)",
      progressivePhase: "Progressive Phase (deg)" 
    },
  },
  "broadside-array": {
    id: "broadside-array",
    name: "Broadside Array",
    description: "Broadside array with maximum radiation perpendicular to array axis",
    computeType: "lineararray",
    defaultParams: { numElements: 4, spacing: 0.5, steeringAngle: 90, progressivePhase: 0 },
    paramLabels: { 
      numElements: "Number of Elements", 
      spacing: "Spacing (λ)",
      steeringAngle: "Steering Angle (deg)",
      progressivePhase: "Progressive Phase (deg)" 
    },
  },
  "microstrip-linear-array": {
    id: "microstrip-linear-array",
    name: "Microstrip Linear Array",
    description: "Linear array of microstrip patch elements",
    computeType: "patcharray",
    defaultParams: { numElementsX: 4, numElementsY: 1, spacingX: 0.5, spacingY: 0.5 },
    paramLabels: {
      numElementsX: "Elements (X)",
      numElementsY: "Elements (Y)",
      spacingX: "Spacing X (λ)",
      spacingY: "Spacing Y (λ)",
    },
  },
  "microstrip-planar-array": {
    id: "microstrip-planar-array",
    name: "Microstrip Planar Array",
    description: "Planar array of microstrip patch elements",
    computeType: "patcharray",
    defaultParams: { numElementsX: 4, numElementsY: 4, spacingX: 0.5, spacingY: 0.5 },
    paramLabels: {
      numElementsX: "Elements (X)",
      numElementsY: "Elements (Y)",
      spacingX: "Spacing X (λ)",
      spacingY: "Spacing Y (λ)",
    },
  },
  "turnstile": {
    id: "turnstile",
    name: "Turnstile Antenna",
    description: "Two crossed dipoles fed in quadrature for circular polarization",
    computeType: "patcharray",
    defaultParams: { numElementsX: 2, numElementsY: 2, spacingX: 0.25, spacingY: 0.25 },
    paramLabels: {
      numElementsX: "Elements (X)",
      numElementsY: "Elements (Y)",
      spacingX: "Spacing X (λ)",
      spacingY: "Spacing Y (λ)",
    },
  },
  "discone": {
    id: "discone",
    name: "Discone Antenna",
    description: "Discone antenna (disc + cone) for broadband omnidirectional radiation",
    computeType: "biconical",
    defaultParams: { coneAngle: 60, discRadius: 0.1, coneHeight: 0.3 },
    paramLabels: { 
      coneAngle: "Cone Angle (deg)", 
      discRadius: "Disc Radius (m)",
      coneHeight: "Cone Height (m)" 
    },
  },
  "whip": {
    id: "whip",
    name: "Whip Antenna",
    description: "Flexible whip antenna, typically quarter-wave monopole",
    computeType: "quarterwavemonopole",
    defaultParams: { length: 0.25 },
    paramLabels: { length: "Length (m)" },
  },
  "beverage": {
    id: "beverage",
    name: "Beverage Antenna (Long Wire)",
    description: "Long wire antenna (several wavelengths) for low-frequency reception",
    computeType: "lineararray",
    defaultParams: { numElements: 8, spacing: 0.5, length: 4.0 },
    paramLabels: { 
      numElements: "Number of Segments", 
      spacing: "Spacing (λ)",
      length: "Total Length (m)" 
    },
  },
};

/**
 * Get antenna registry entry by ID
 */
export function getAntennaRegistryEntry(id: string): AntennaRegistryEntry | undefined {
  return ANTENNA_REGISTRY[id];
}

/**
 * Get all antenna registry entries as array
 */
export function getAllAntennaRegistryEntries(): AntennaRegistryEntry[] {
  return Object.values(ANTENNA_REGISTRY);
}

/**
 * Compute pattern using registry entry
 */
export function computePatternFromRegistry(
  antennaId: string,
  frequencyHz: number,
  geometry: AntennaGeometry,
  options: PatternOptions = {}
): AntennaPatternResult {
  const entry = getAntennaRegistryEntry(antennaId);
  if (!entry) {
    console.warn(`Unknown antenna ID: ${antennaId}, falling back to isotropic`);
    return computePattern("isotropic", frequencyHz, geometry, options);
  }
  
  return computePattern(entry.computeType, frequencyHz, geometry, options);
}

/**
 * Validate pattern result
 */
export function validatePatternResult(result: AntennaPatternResult | null): result is AntennaPatternResult {
  if (!result) return false;
  
  // Check for required properties
  if (!result.pattern || !Array.isArray(result.pattern)) return false;
  if (!result.pattern_db || !Array.isArray(result.pattern_db)) return false;
  if (!result.slices || !result.slices.E_plane || !result.slices.H_plane) return false;
  if (!result.scalars || typeof result.scalars.D_max_dBi !== 'number') return false;
  
  // Check for NaN or Infinity values
  if (!isFinite(result.scalars.D_max_dBi)) return false;
  if (!isFinite(result.scalars.G_dBi)) return false;
  
  // Check pattern arrays are not empty
  if (result.pattern.length === 0 || result.pattern[0]?.length === 0) return false;
  
  // Check slices have matching lengths
  const eLen = result.slices.E_plane.angleDeg.length;
  const hLen = result.slices.H_plane.angleDeg.length;
  if (eLen !== result.slices.E_plane.power.length || eLen !== result.slices.E_plane.power_db.length) return false;
  if (hLen !== result.slices.H_plane.power.length || hLen !== result.slices.H_plane.power_db.length) return false;
  
  return true;
}

