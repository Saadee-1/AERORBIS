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
    description: "Dipole much shorter than λ/2 (typically < λ/10). Current distribution approximated as uniform. Very low radiation resistance and low efficiency unless matched. Radiation Pattern: U(θ) ∝ sin²θ. Directivity: 1.5 (1.76 dBi). Radiation Resistance: Rᵣ = 80π²(l/λ)².",
    computeType: "shortdipole",
    defaultParams: {},
    paramLabels: {},
  },
  "half-wave-dipole": {
    id: "half-wave-dipole",
    name: "Half-Wave Dipole",
    description: "Classic resonant dipole with length ≈ λ/2. Produces a toroidal radiation pattern broadside to the wire. Good for VHF/UHF and reference measurements. Pattern independent of frequency if electrically half-wave. Radiation Intensity: U(θ) ∝ (cos(π/2·cosθ)/sinθ)². Directivity: D ≈ 1.64 (2.15 dBi). HPBW: ≈ 78°. Notes: Nulls at θ = 0°, 180°.",
    computeType: "halfwavedipole",
    defaultParams: {},
    paramLabels: {},
  },
  "folded-dipole": {
    id: "folded-dipole",
    name: "Folded Dipole",
    description: "Two-wire dipole with increased impedance (~300 Ω). Broader bandwidth and smoother match for transmission lines. Pattern: Same as half-wave dipole. Input Impedance: ≈ 4× that of regular dipole.",
    computeType: "foldeddipole",
    defaultParams: {},
    paramLabels: {},
  },
  "quarter-monopole": {
    id: "quarter-monopole",
    name: "Quarter-Wave Monopole",
    description: "Quarter-wave vertical over a ground plane. The ground plane acts as a mirror → equivalent to a half-wave dipole. Pattern: U(θ) ∝ cos²(π/2·cosθ)/sin²θ (only 0–90°). Gain: ≈ 5.15 dBi.",
    computeType: "quarterwavemonopole",
    defaultParams: {},
    paramLabels: {},
  },
  "ground-monopole": {
    id: "ground-monopole",
    name: "Ground-Plane Monopole",
    description: "Monopole with sloping ground radials; improves match and lowers input impedance. Directivity: ≈ 5 dBi. Effect of Radial Angle: Tilted radials lower impedance from 36.5 Ω → 50 Ω.",
    computeType: "monopoleground",
    defaultParams: { groundRadius: 0.5 },
    paramLabels: { groundRadius: "Ground Plane Radius (m)" },
  },
  "patch": {
    id: "patch",
    name: "Patch / Microstrip Antenna",
    description: "Low-profile resonant radiator. Works best on GHz ranges. Used in GPS, WiFi, CubeSats. Broadside Pattern: U(θ) ∝ cos(θ). Directivity: 5–8 dBi depending on substrate height.",
    computeType: "rectangularpatch",
    defaultParams: { length: 0.05, width: 0.05 },
    paramLabels: { length: "Length (m)", width: "Width (m)" },
  },
  "rect-patch": {
    id: "rect-patch",
    name: "Rectangular Patch",
    description: "Most common microstrip antenna. Treat as cavity resonator with fringing fields. Resonant Frequency: fᵣ = c/(2L√εₑff). Directivity: 6–9 dBi.",
    computeType: "rectangularpatch",
    defaultParams: { length: 0.05, width: 0.05 },
    paramLabels: { length: "Length (m)", width: "Width (m)" },
  },
  "circ-patch": {
    id: "circ-patch",
    name: "Circular Patch",
    description: "Rotational symmetry, supports TM₁₁ mode. Resonant Frequency: fᵣ ≈ (1.8412·c)/(2πa√εᵣ).",
    computeType: "circularpatch",
    defaultParams: { radius: 0.05 },
    paramLabels: { radius: "Radius (m)" },
  },
  "parabolic-dish": {
    id: "parabolic-dish",
    name: "Parabolic Dish",
    description: "High-gain, narrow-beam reflector for satellite dishes and radars. Directivity: D = η(πD/λ)². HPBW: ≈ 70λ/D. Gain: G ≈ η(πD/λ)².",
    computeType: "parabolicdish",
    defaultParams: { diameter: 1.0, efficiency: 0.6 },
    paramLabels: { diameter: "Diameter (m)", efficiency: "Efficiency (0-1)" },
  },
  "helical-axial": {
    id: "helical-axial",
    name: "Helical (Axial Mode)",
    description: "Produces circular polarization with high directivity when operated in axial mode. Gain: G ≈ 10·log₁₀(15NC²S/λ³) where N = turns, C = circumference, S = spacing. HPBW: ≈ 52λ/(C√NS).",
    computeType: "helix",
    defaultParams: { diameter: 0.3, pitch: 0.25, turns: 10 },
    paramLabels: { diameter: "Diameter (m)", pitch: "Pitch (m)", turns: "Number of Turns" },
  },
  "yagi": {
    id: "yagi",
    name: "Yagi-Uda",
    description: "Director/reflector array producing strong end-fire beam. Gain: 7–14 dBi. Pattern: One main lobe + rear nulls.",
    computeType: "yagi",
    defaultParams: { numElements: 5, spacing: 0.25 },
    paramLabels: { numElements: "Number of Elements", spacing: "Spacing (λ)" },
  },
  "lpda": {
    id: "lpda",
    name: "Log-Periodic Dipole Array (LPDA)",
    description: "Wideband frequency-independent antenna. Design Ratio: τ = Lₙ₊₁/Lₙ. Gain: Typically 7–9 dBi. Broadband directional antenna with active region that shifts with frequency.",
    computeType: "lpda",
    defaultParams: { numElements: 10, tau: 0.9, sigma: 0.07 },
    paramLabels: { 
      numElements: "Number of Elements", 
      tau: "Scale Factor τ", 
      sigma: "Spacing Factor σ" 
    },
  },
  "vivaldi": {
    id: "vivaldi",
    name: "Vivaldi (Tapered Slot Antenna)",
    description: "Ultra-wideband tapered slot antenna. Directivity: 6–12 dBi across bands. End-fire radiation pattern with exponential taper.",
    computeType: "vivaldi",
    defaultParams: { mouthWidth: 0.2, taperLength: 0.5 },
    paramLabels: { mouthWidth: "Mouth Width (m)", taperLength: "Taper Length (m)" },
  },
  "biconical": {
    id: "biconical",
    name: "Biconical Antenna",
    description: "Ultra-wideband omnidirectional antenna. Broadband pattern similar to dipole but broader beam. Wide impedance bandwidth.",
    computeType: "biconical",
    defaultParams: { coneAngle: 60, coneHeight: 0.3 },
    paramLabels: { coneAngle: "Cone Angle (deg)", coneHeight: "Cone Height (m)" },
  },
  "patch-array": {
    id: "patch-array",
    name: "Patch Array",
    description: "2D grid offering high gain and beam shaping. Planar patch array (2×2, 4×4, etc.) with element pattern multiplied by array factor. Directivity scales with element count.",
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
    description: "Electronically steerable beam. Array Factor: AF(θ) = Σₙ₌₀^(N-1) e^(jnkd·cosθ + jφₙ). Beam steering via progressive phase shift.",
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
    description: "Radiation pattern like a small dipole/loop hybrid. Low gain. Directivity: ≈ 2–3 dBi.",
    computeType: "helix",
    defaultParams: { diameter: 0.1, pitch: 0.05, turns: 3 },
    paramLabels: { diameter: "Diameter (m)", pitch: "Pitch (m)", turns: "Number of Turns" },
  },
  "horn-pyramidal": {
    id: "horn-pyramidal",
    name: "Pyramidal Horn",
    description: "Flared in both E and H planes; improves symmetry. HPBW (approx): E-plane: 50λ/a, H-plane: 60λ/b. Gain: G ≈ (4πA_ap/λ²)·η. Directivity: 10–20 dBi typically.",
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
    description: "Flare in only one plane. Produces one narrow and one broad beam. Gain: G ≈ (4πA_ap/λ²)·η.",
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
    description: "Dual-reflector (hyperbolic secondary). Improved feed blockage and scanning performance. Gain: Same as parabola but with feed efficiency corrections. Directivity: D = η(πD/λ)² with improved feed efficiency.",
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
    description: "Electrically small (circumference < 0.1λ). Produces a dipole-like pattern. Radiation Pattern: U(θ) ∝ sin²(θ). Radiation Resistance: Rᵣ = 31200(A/λ²)².",
    computeType: "smallloop",
    defaultParams: { radius: 0.05 },
    paramLabels: { radius: "Loop Radius (m)" },
  },
  "large-loop": {
    id: "large-loop",
    name: "Large Loop Antenna",
    description: "Circumference ≈ 1λ. Pattern becomes multi-lobed with increased directivity compared to small loop.",
    computeType: "loop",
    defaultParams: { radius: 0.15, numTurns: 1 },
    paramLabels: { radius: "Loop Radius (m)", numTurns: "Number of Turns" },
  },
  "spiral": {
    id: "spiral",
    name: "Spiral Antenna (Archimedean)",
    description: "Frequency-independent antenna with circular polarization. Impedance: ≈ 188 Ω (constant) across frequency band. Broadband performance.",
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
    description: "Space-filling geometry; reduces size and increases multiband performance. Uses self-similar Koch curve structure for compact design.",
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
    description: "Fractal resonances at f, 2f, 4f … Sierpinski triangle structure provides multiband operation with reduced size.",
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
    description: "Complement of dipole. Uses Babinet's principle. Impedance: ≈ 500–600 Ω for thin slots. Pattern similar to dipole but with orthogonal polarization.",
    computeType: "slotantenna",
    defaultParams: { slotLength: 0.5, slotWidth: 0.05 },
    paramLabels: { slotLength: "Slot Length (m)", slotWidth: "Slot Width (m)" },
  },
  "waveguide-slot": {
    id: "waveguide-slot",
    name: "Waveguide Slot Array",
    description: "Series of slots producing shaped beams. Used for radar and communication systems. Array factor controls beam shape and direction.",
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
    description: "Max radiation in axis of array. Directivity increases with element count. Progressive phase typically -90° for maximum end-fire gain.",
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
    description: "Max radiation perpendicular to array axis. Directivity increases with element count. Zero progressive phase for broadside maximum.",
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
    description: "Series-fed or corporate-fed stripline patches. Linear array of microstrip patch elements providing increased gain and beam control.",
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
    description: "2D grid offering high gain and beam shaping. Planar array of microstrip patch elements with both azimuth and elevation control.",
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
    description: "Produces circular polarization using orthogonal dipoles. Two crossed dipoles fed in quadrature (90° phase) for RHCP/LHCP operation.",
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
    description: "Broadband omnidirectional; used for scanners/SDR. Discone antenna (disc + cone) provides wide bandwidth with omnidirectional pattern in azimuth. Similar to biconical but with disc element.",
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
    description: "Flexible whip antenna, common in portable radios. Typically quarter-wave monopole providing omnidirectional coverage. Gain: ≈ 5 dBi.",
    computeType: "quarterwavemonopole",
    defaultParams: { length: 0.25 },
    paramLabels: { length: "Length (m)" },
  },
  "beverage": {
    id: "beverage",
    name: "Beverage Antenna (Long Wire)",
    description: "Long-wire, low-angle HF receiving antenna. Length: Typically 0.5–2 wavelengths. Optimized for low-angle wave reception over ground.",
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

