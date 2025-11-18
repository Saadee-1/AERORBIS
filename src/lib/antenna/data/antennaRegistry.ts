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

