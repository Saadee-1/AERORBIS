/**
 * Antenna Pattern Analyzer - Math Utilities
 * 
 * This module provides core mathematical functions for antenna pattern analysis:
 * - Wavelength calculations
 * - Array factor computations
 * - Directivity and gain calculations
 * - HPBW (Half-Power Beamwidth) calculations
 * - dB conversions
 * - EIRP calculations
 * - Numerical integration for radiated power
 * 
 * References:
 * - Balanis, C.A., "Antenna Theory: Analysis and Design", 3rd Edition
 * - Stutzman, W.L., Thiele, G.A., "Antenna Theory and Design", 3rd Edition
 */

// Constants
export const C = 299792458; // Speed of light in m/s
export const EPSILON_0 = 8.854187817e-12; // Permittivity of free space
export const MU_0 = 4 * Math.PI * 1e-7; // Permeability of free space
export const ETA_0 = 376.730313668; // Intrinsic impedance of free space (Ω)

/**
 * Calculate wavelength from frequency
 * λ = c / f
 */
export const wavelength = (frequencyHz: number): number => {
  return C / frequencyHz;
};

/**
 * Convert frequency units to Hz
 */
export const frequencyToHz = (value: number, unit: "Hz" | "MHz" | "GHz"): number => {
  switch (unit) {
    case "Hz":
      return value;
    case "MHz":
      return value * 1e6;
    case "GHz":
      return value * 1e9;
  }
};

/**
 * Convert linear gain to dBi
 * G_dBi = 10 * log10(G_linear)
 */
export const linearToDbi = (linear: number): number => {
  if (linear <= 0) return -Infinity;
  return 10 * Math.log10(linear);
};

/**
 * Convert dBi to linear gain
 * G_linear = 10^(G_dBi / 10)
 */
export const dbiToLinear = (dbi: number): number => {
  return Math.pow(10, dbi / 10);
};

/**
 * Convert dBW to dBm
 * P_dBm = P_dBW + 30
 */
export const dbwToDbm = (dbw: number): number => {
  return dbw + 30;
};

/**
 * Convert watts to dBW
 * P_dBW = 10 * log10(P_W)
 */
export const wattsToDbw = (watts: number): number => {
  if (watts <= 0) return -Infinity;
  return 10 * Math.log10(watts);
};

/**
 * Calculate EIRP (Effective Isotropically Radiated Power)
 * EIRP = Pt * Gt (linear)
 * EIRP_dBW = Pt_dBW + Gt_dBi
 */
export const calculateEIRP = (powerWatts: number, gainLinear: number): {
  eirpWatts: number;
  eirpDbw: number;
  eirpDbm: number;
} => {
  const eirpWatts = powerWatts * gainLinear;
  const eirpDbw = wattsToDbw(eirpWatts);
  const eirpDbm = dbwToDbm(eirpDbw);
  return { eirpWatts, eirpDbw, eirpDbm };
};

/**
 * Array Factor for linear array
 * AF(θ) = (1/N) * (sin(N*ψ/2) / sin(ψ/2))
 * where ψ = k*d*cos(θ) + β
 * k = 2π/λ, d = spacing, β = progressive phase
 * 
 * Reference: Balanis, Eq. 6.52
 */
export const arrayFactorLinear = (
  theta: number,
  wavelength: number,
  numElements: number,
  spacing: number,
  progressivePhase: number = 0
): number => {
  if (numElements === 1) return 1;
  
  const k = (2 * Math.PI) / wavelength;
  const psi = k * spacing * Math.cos(theta) + progressivePhase;
  
  if (Math.abs(psi) < 1e-10) {
    // Avoid division by zero at broadside
    return 1;
  }
  
  const numerator = Math.sin((numElements * psi) / 2);
  const denominator = Math.sin(psi / 2);
  
  return Math.abs(numerator / denominator) / numElements;
};

/**
 * Array Factor for planar array (rectangular grid)
 * AF(θ, φ) = AF_x(θ, φ) * AF_y(θ, φ)
 * 
 * Reference: Balanis, Section 6.8
 */
export const arrayFactorPlanar = (
  theta: number,
  phi: number,
  wavelength: number,
  numElementsX: number,
  numElementsY: number,
  spacingX: number,
  spacingY: number,
  phaseX: number = 0,
  phaseY: number = 0
): number => {
  const k = (2 * Math.PI) / wavelength;
  
  // X-direction array factor
  const psiX = k * spacingX * Math.sin(theta) * Math.cos(phi) + phaseX;
  let afX = 1;
  if (numElementsX > 1) {
    if (Math.abs(psiX) < 1e-10) {
      afX = 1;
    } else {
      const numX = Math.sin((numElementsX * psiX) / 2);
      const denX = Math.sin(psiX / 2);
      afX = Math.abs(numX / denX) / numElementsX;
    }
  }
  
  // Y-direction array factor
  const psiY = k * spacingY * Math.sin(theta) * Math.sin(phi) + phaseY;
  let afY = 1;
  if (numElementsY > 1) {
    if (Math.abs(psiY) < 1e-10) {
      afY = 1;
    } else {
      const numY = Math.sin((numElementsY * psiY) / 2);
      const denY = Math.sin(psiY / 2);
      afY = Math.abs(numY / denY) / numElementsY;
    }
  }
  
  return afX * afY;
};

/**
 * Array Factor for circular array
 * AF(θ, φ) = (1/N) * Σ exp(j*k*r*sin(θ)*cos(φ-φn) + j*βn)
 * Simplified approximation for uniform circular array
 * 
 * Reference: Balanis, Section 6.9
 */
export const arrayFactorCircular = (
  theta: number,
  phi: number,
  wavelength: number,
  numElements: number,
  radius: number,
  progressivePhase: number = 0
): number => {
  if (numElements === 1) return 1;
  
  const k = (2 * Math.PI) / wavelength;
  let sumReal = 0;
  let sumImag = 0;
  
  for (let n = 0; n < numElements; n++) {
    const phiN = (2 * Math.PI * n) / numElements;
    const phase = k * radius * Math.sin(theta) * Math.cos(phi - phiN) + progressivePhase;
    sumReal += Math.cos(phase);
    sumImag += Math.sin(phase);
  }
  
  const magnitude = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
  return magnitude / numElements;
};

/**
 * Calculate directivity using numerical integration
 * D = 4π * U_max / P_rad
 * where P_rad = ∫∫ U(θ,φ) sin(θ) dθ dφ
 * 
 * Uses spherical coordinate integration with sin(θ) weighting
 */
export const calculateDirectivity = (
  pattern: (theta: number, phi: number) => number,
  thetaResolution: number = 1,
  phiResolution: number = 1
): { directivity: number; directivityDbi: number; radiatedPower: number } => {
  const thetaStep = (Math.PI * thetaResolution) / 180;
  const phiStep = (2 * Math.PI * phiResolution) / 180;
  
  let maxU = 0;
  let pRad = 0;
  
  // Find maximum and integrate
  for (let theta = 0; theta <= Math.PI; theta += thetaStep) {
    for (let phi = 0; phi <= 2 * Math.PI; phi += phiStep) {
      const u = pattern(theta, phi);
      if (u > maxU) maxU = u;
      
      // Integrate with sin(θ) weighting (spherical coordinates)
      pRad += u * Math.sin(theta) * thetaStep * phiStep;
    }
  }
  
  if (pRad <= 0 || maxU <= 0) {
    return { directivity: 1, directivityDbi: 0, radiatedPower: 0 };
  }
  
  const directivity = (4 * Math.PI * maxU) / pRad;
  const directivityDbi = linearToDbi(directivity);
  
  return { directivity, directivityDbi, radiatedPower: pRad };
};

/**
 * Find Half-Power Beamwidth (HPBW) in a given plane
 * HPBW is the angular width where pattern drops to 0.5 (3 dB) of peak
 * 
 * @param pattern Function that returns pattern value for given angle
 * @param planeAngle Angle of the plane (0 for E-plane, π/2 for H-plane)
 * @param resolution Angular resolution in degrees
 * @returns HPBW in degrees, or null if not found
 */
export const calculateHPBW = (
  pattern: (theta: number, phi: number) => number,
  planeAngle: number,
  resolution: number = 0.1
): { hpbm: number | null; angles: { theta: number; gain: number }[] } => {
  const step = (Math.PI * resolution) / 180;
  const samples: { theta: number; gain: number }[] = [];
  
  // Sample pattern in the plane
  for (let theta = 0; theta <= Math.PI; theta += step) {
    const gain = pattern(theta, planeAngle);
    samples.push({ theta, gain });
  }
  
  // Find peak
  const peak = Math.max(...samples.map(s => s.gain));
  const halfPower = peak * 0.5;
  
  if (peak <= 0) {
    return { hpbm: null, angles: samples };
  }
  
  // Find angles where pattern crosses half-power level
  const crossings: number[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const curr = samples[i].gain;
    const next = samples[i + 1].gain;
    
    if ((curr <= halfPower && next >= halfPower) || 
        (curr >= halfPower && next <= halfPower)) {
      // Linear interpolation for crossing point
      const t = (halfPower - curr) / (next - curr);
      const theta = samples[i].theta + t * (samples[i + 1].theta - samples[i].theta);
      crossings.push(theta);
    }
  }
  
  if (crossings.length < 2) {
    return { hpbm: null, angles: samples };
  }
  
  // HPBW is the width between first and last crossing
  const hpbm = (crossings[crossings.length - 1] - crossings[0]) * (180 / Math.PI);
  
  return { hpbm, angles: samples };
};

/**
 * Calculate side-lobe level (relative to main lobe peak)
 * Finds the maximum value excluding the main lobe region
 * 
 * @param pattern Pattern function
 * @param mainLobeTheta Center of main lobe in theta
 * @param mainLobeWidth Approximate width of main lobe in radians
 * @returns Side-lobe level in dB relative to peak
 */
export const calculateSideLobeLevel = (
  pattern: (theta: number, phi: number) => number,
  mainLobeTheta: number,
  mainLobeWidth: number,
  resolution: number = 1
): number => {
  const step = (Math.PI * resolution) / 180;
  let maxSidelobe = 0;
  let peak = 0;
  
  for (let theta = 0; theta <= Math.PI; theta += step) {
    for (let phi = 0; phi <= 2 * Math.PI; phi += step) {
      const gain = pattern(theta, phi);
      
      // Check if in main lobe region
      const distFromMain = Math.abs(theta - mainLobeTheta);
      const inMainLobe = distFromMain < mainLobeWidth / 2;
      
      if (gain > peak) peak = gain;
      if (!inMainLobe && gain > maxSidelobe) {
        maxSidelobe = gain;
      }
    }
  }
  
  if (peak <= 0 || maxSidelobe <= 0) return -Infinity;
  return linearToDbi(maxSidelobe / peak);
};

/**
 * Calculate front-to-back ratio
 * F/B = main_lobe_peak / back_lobe_peak (in dB)
 */
export const calculateFrontToBackRatio = (
  pattern: (theta: number, phi: number) => number,
  mainLobeTheta: number,
  resolution: number = 1
): number => {
  const step = (Math.PI * resolution) / 180;
  let frontPeak = 0;
  let backPeak = 0;
  
  for (let theta = 0; theta <= Math.PI; theta += step) {
    for (let phi = 0; phi <= 2 * Math.PI; phi += step) {
      const gain = pattern(theta, phi);
      
      // Front hemisphere (theta < π/2 from main lobe)
      if (Math.abs(theta - mainLobeTheta) < Math.PI / 2) {
        if (gain > frontPeak) frontPeak = gain;
      } else {
        // Back hemisphere
        if (gain > backPeak) backPeak = gain;
      }
    }
  }
  
  if (frontPeak <= 0 || backPeak <= 0) return Infinity;
  return linearToDbi(frontPeak / backPeak);
};

/**
 * Check for grating lobes in array
 * Grating lobes occur when d ≥ λ and steering angle is large
 * 
 * @returns true if grating lobes are likely
 */
export const checkGratingLobes = (
  wavelength: number,
  spacing: number,
  steeringAngle: number
): { hasGratingLobes: boolean; warning: string } => {
  if (spacing < wavelength) {
    return { hasGratingLobes: false, warning: "" };
  }
  
  const ratio = spacing / wavelength;
  const steeringRad = (steeringAngle * Math.PI) / 180;
  
  if (ratio > 1 && Math.abs(steeringAngle) > 0) {
    return {
      hasGratingLobes: true,
      warning: `Grating lobes likely: spacing (${(spacing * 1000).toFixed(2)} mm) > wavelength (${(wavelength * 1000).toFixed(2)} mm). Consider reducing spacing or steering angle.`,
    };
  }
  
  return { hasGratingLobes: false, warning: "" };
};

/**
 * Calculate far-field distance
 * r_ff ≈ 2*D²/λ where D is largest antenna dimension
 */
export const farFieldDistance = (largestDimension: number, wavelength: number): number => {
  return (2 * largestDimension * largestDimension) / wavelength;
};

/**
 * Convert spherical coordinates to Cartesian
 */
export const sphericalToCartesian = (
  r: number,
  theta: number,
  phi: number
): { x: number; y: number; z: number } => {
  const x = r * Math.sin(theta) * Math.cos(phi);
  const y = r * Math.sin(theta) * Math.sin(phi);
  const z = r * Math.cos(theta);
  return { x, y, z };
};

/**
 * Convert Cartesian to spherical coordinates
 */
export const cartesianToSpherical = (
  x: number,
  y: number,
  z: number
): { r: number; theta: number; phi: number } => {
  const r = Math.sqrt(x * x + y * y + z * z);
  const theta = Math.acos(z / r);
  const phi = Math.atan2(y, x);
  return { r, theta, phi };
};

