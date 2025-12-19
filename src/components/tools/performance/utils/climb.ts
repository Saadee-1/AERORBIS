/**
 * Climb Performance Calculator - Core Computation Logic
 * 
 * Formulas:
 * - q = 0.5 * ρ * V²
 * - CL = W / (q * S)
 * - CD = C_D0 + k * CL²
 * - D = q * S * CD
 * - P_req = D * V
 * - P_avail ≈ T_total * V  (for jets) OR P_avail = η_p * T_total * V for prop simplification OR use engine power if available
 * - Excess power P_ex = P_avail - P_req
 * - ROC = P_ex / W  (m/s)
 * - Climb gradient γ = (T_total - D) / W  (unitless)
 * - Convert m/s to kts: * 1.94384; m/s to ft/min * 196.8504
 */

import { calculateISADensity } from "../utils/isaAtmosphere";

export type ClimbInputs = {
  weightN: number; // N
  wingAreaM2: number;
  cd0: number;
  k: number;
  totalThrustN?: number; // N
  engineType?: 'jet' | 'turbofan' | 'prop' | 'rocket';
  propEfficiency?: number; // for propellers (default 0.85)
  densityKgM3: number;
  clMax?: number;
  vMin?: number;
  vMax?: number;
  nPoints?: number;
  propulsionModel?: PropulsionModel; // Optional propulsion model (default: "constant")
};

export type ClimbPoint = {
  v: number;
  q: number;
  cl: number;
  cd: number;
  dragN: number;
  pReq: number;
  pAvail?: number;
  pEx?: number;
  roc?: number;
  tEx?: number;
  gamma?: number;
  sinGammaRaw?: number; // Raw (T-D)/W before clamping (advanced model only)
  valid: boolean;
};

export type ValidityLevel = "valid" | "marginal" | "invalid";

export interface ValidityEnvelope {
  overall: ValidityLevel;
  checks: {
    climbAngle: ValidityLevel;
    thrustToWeight: ValidityLevel;
    rocVsVelocity: ValidityLevel;
  };
  notes: string[];
}

export type ClimbResult = {
  points: ClimbPoint[];
  vY?: number; // Best rate of climb speed (m/s)
  vX?: number; // Best angle of climb speed (m/s)
  rocVy?: number; // Rate of climb at V_y (m/s)
  gammaVy?: number; // Climb gradient at V_y
  rocVx?: number; // Rate of climb at V_x (m/s)
  gammaVx?: number; // Climb gradient at V_x
  validityEnvelope?: ValidityEnvelope; // Validity evaluation metadata
  energyClimb?: {
    serviceCeilingM: number | null;
    profile: Array<{ altitude: number; roc: number }>;
  };
};

const GRAVITY = 9.81; // m/s²
const KNOTS_TO_MS = 1.94384;
const MS_TO_FPM = 196.8504;

export type PropulsionModel = "constant" | "speedDecay" | "lapsed";

/**
 * Apply jet thrust lapse with altitude (standard preliminary model).
 * T(h) = T₀ × σ, where σ = density ratio
 */
function applyJetThrustLapse(thrustSL: number, sigma: number): number {
  return thrustSL * sigma;
}

/**
 * Apply propeller power lapse with altitude.
 * P_avail(h) = P₀ × σ, converted to effective thrust proxy.
 */
function applyPropPowerLapse(thrustProxy: number, sigma: number): number {
  return thrustProxy * sigma;
}

/**
 * Apply speed degradation factor for jets (optional high-speed correction).
 * T(V) = T(h) × (1 − k_v × (V / V_ref))
 */
function applySpeedDegradation(thrustAtAltitude: number, velocity: number): number {
  const kV = 0.3; // Speed degradation coefficient
  const Vref = 300; // m/s — reference speed
  const speedFactor = Math.max(0.5, 1 - kV * (velocity / Vref));
  return thrustAtAltitude * speedFactor;
}

/**
 * Resolve effective thrust based on propulsion model, altitude, and speed.
 * Pure helper function - applies altitude and speed-dependent lapse if enabled.
 * 
 * @param params - Thrust computation parameters
 * @returns Effective thrust (N)
 */
export function resolveEffectiveThrust(params: {
  thrustInput: number;      // N - sea-level static thrust input
  densityKgM3: number;     // kg/m³ - current air density
  velocity: number;         // m/s - current velocity
  propulsionType: "jet" | "turbofan" | "prop" | "rocket"; // Engine type
  model: PropulsionModel;  // Propulsion model selection
}): number {
  if (params.model === "constant") {
    return params.thrustInput;
  }

  if (params.model === "speedDecay") {
    // Speed-dependent decay model (first-order realism correction)
    const Vref = 100; // m/s — reference decay speed
    const decay = Math.max(0.3, 1 - params.velocity / Vref);
    return params.thrustInput * decay;
  }

  // Lapsed model: altitude-aware with optional speed degradation
  // Compute density ratio σ = ρ / ρ₀ (sea-level ISA density = 1.225 kg/m³)
  const sigma = params.densityKgM3 / 1.225;
  
  let thrustAtAltitude: number;
  
  if (params.propulsionType === "prop") {
    // Propeller: power lapses with altitude, convert to thrust proxy
    thrustAtAltitude = applyPropPowerLapse(params.thrustInput, sigma);
  } else {
    // Jet/Turbofan: thrust lapses with altitude
    thrustAtAltitude = applyJetThrustLapse(params.thrustInput, sigma);
    
    // Apply speed degradation for jets only (high-speed correction)
    thrustAtAltitude = applySpeedDegradation(thrustAtAltitude, params.velocity);
  }
  
  return thrustAtAltitude;
}

/**
 * Compute effective thrust based on propulsion model (legacy function for backward compatibility).
 * @deprecated Use resolveEffectiveThrust instead for altitude-aware models.
 */
export function computeEffectiveThrust(params: {
  thrustSL: number;   // N - sea-level static thrust
  velocity: number;   // m/s
  model: PropulsionModel;
}): number {
  if (params.model === "constant") {
    return params.thrustSL;
  }

  if (params.model === "speedDecay") {
    // Speed-dependent decay model (first-order realism correction)
    const Vref = 100; // m/s — reference decay speed
    const decay = Math.max(0.3, 1 - params.velocity / Vref);
    return params.thrustSL * decay;
  }

  // For "lapsed" model, this legacy function cannot compute altitude lapse
  // without density information, so fall back to constant
  return params.thrustSL;
}

/**
 * Preliminary (Small-Angle, Constant Thrust) climb performance model.
 * Uses small-angle approximation: sin(γ) ≈ γ, ROC = P_ex / W.
 * Default model for preliminary sizing studies.
 */
export function computeClimbPerformance(inputs: ClimbInputs): ClimbResult {
  const g = GRAVITY;
  const n = inputs.nPoints ?? 200;
  
  // Determine speed range
  let vMin = inputs.vMin ?? 5;
  let vMax = inputs.vMax;
  
  // If stall speed available, start from 0.8 * V_stall
  if (inputs.clMax && inputs.weightN && inputs.wingAreaM2 && inputs.densityKgM3) {
    const vStall = Math.sqrt((2 * inputs.weightN) / (inputs.densityKgM3 * inputs.wingAreaM2 * inputs.clMax));
    vMin = Math.max(vMin, 0.8 * vStall);
  }
  
  // Default max speed if not provided
  if (!vMax || !Number.isFinite(vMax)) {
    vMax = Math.max(120, vMin + 80); // Default to 120 m/s or vMin + 80, whichever is larger
  }
  
  const dv = (vMax - vMin) / (n - 1);
  const points: ClimbPoint[] = [];

  for (let i = 0; i < n; i++) {
    const v = vMin + dv * i;
    
    // Skip invalid speeds
    if (!Number.isFinite(v) || v <= 0) {
      continue;
    }
    
    const q = 0.5 * inputs.densityKgM3 * v * v;
    
    // Compute CL
    const cl = inputs.weightN / (q * inputs.wingAreaM2);
    
    // Check if CL exceeds CL_max (invalid point)
    const valid = !(inputs.clMax && cl > inputs.clMax);
    
    // Compute drag
    const cd = inputs.cd0 + inputs.k * cl * cl;
    const dragN = q * inputs.wingAreaM2 * cd;
    
    // Power required
    const pReq = dragN * v;
    
    // Compute effective thrust based on propulsion model
    const propulsionModel = inputs.propulsionModel ?? "constant";
    const effectiveThrust = inputs.totalThrustN !== undefined && Number.isFinite(inputs.totalThrustN) && inputs.totalThrustN > 0
      ? resolveEffectiveThrust({
          thrustInput: inputs.totalThrustN,
          densityKgM3: inputs.densityKgM3,
          velocity: v,
          propulsionType: inputs.engineType ?? "jet",
          model: propulsionModel,
        })
      : undefined;
    
    // Power available
    let pAvail: number | undefined;
    if (effectiveThrust !== undefined) {
      if (inputs.engineType === 'prop') {
        const eta = inputs.propEfficiency ?? 0.85;
        pAvail = effectiveThrust * v * eta;
      } else {
        // For jets/turbofans: P_avail = T * V (simplified)
        pAvail = effectiveThrust * v;
      }
    }
    
    // Excess power
    const pEx = pAvail !== undefined ? pAvail - pReq : undefined;
    
    // Rate of climb (ROC) = P_ex / W
    const roc = pEx !== undefined && pEx > 0 ? pEx / inputs.weightN : undefined;
    
    // Excess thrust
    const tEx = effectiveThrust !== undefined 
      ? effectiveThrust - dragN 
      : undefined;
    
    // Climb gradient γ = T_ex / W
    const gamma = tEx !== undefined ? tEx / inputs.weightN : undefined;

    points.push({ 
      v, 
      q, 
      cl, 
      cd, 
      dragN, 
      pReq, 
      pAvail, 
      pEx, 
      roc, 
      tEx, 
      gamma, 
      valid 
    });
  }

  // Find maxima
  let vY: number | undefined;
  let vX: number | undefined;
  let rocVy: number | undefined;
  let rocVx: number | undefined;
  let gammaVy: number | undefined;
  let gammaVx: number | undefined;
  
  let maxRoc = -Infinity;
  let maxGamma = -Infinity;
  
  for (const pt of points) {
    if (!pt.valid) continue;
    
    // V_y: maximum ROC (excess power per unit weight)
    if (pt.roc !== undefined && Number.isFinite(pt.roc) && pt.roc > maxRoc) {
      maxRoc = pt.roc;
      vY = pt.v;
      rocVy = pt.roc;
      gammaVy = pt.gamma;
    }
    
    // V_x: maximum climb gradient (excess thrust per unit weight)
    if (pt.gamma !== undefined && Number.isFinite(pt.gamma) && pt.gamma > maxGamma) {
      maxGamma = pt.gamma;
      vX = pt.v;
      rocVx = pt.roc !== undefined ? pt.roc : undefined; // Only assign if ROC is defined
      gammaVx = pt.gamma;
    }
  }
  
  return { 
    points, 
    vY, 
    vX, 
    rocVy, 
    rocVx, 
    gammaVy, 
    gammaVx 
  };
}

/**
 * Advanced climb performance model with exact trigonometric formulation.
 * Uses: sin(γ) = (T - D) / W, ROC = V × sin(γ).
 * Valid for all climb angles, including steep climbs (T/W > 1).
 */
export function computeClimbPerformanceAdvanced(inputs: ClimbInputs): ClimbResult {
  const n = inputs.nPoints ?? 200;
  
  // Determine speed range (same as preliminary)
  let vMin = inputs.vMin ?? 5;
  let vMax = inputs.vMax;
  
  if (inputs.clMax && inputs.weightN && inputs.wingAreaM2 && inputs.densityKgM3) {
    const vStall = Math.sqrt((2 * inputs.weightN) / (inputs.densityKgM3 * inputs.wingAreaM2 * inputs.clMax));
    vMin = Math.max(vMin, 0.8 * vStall);
  }
  
  if (!vMax || !Number.isFinite(vMax)) {
    vMax = Math.max(120, vMin + 80);
  }
  
  const dv = (vMax - vMin) / (n - 1);
  const points: ClimbPoint[] = [];

  for (let i = 0; i < n; i++) {
    const v = vMin + dv * i;
    
    if (!Number.isFinite(v) || v <= 0) {
      continue;
    }
    
    const q = 0.5 * inputs.densityKgM3 * v * v;
    const cl = inputs.weightN / (q * inputs.wingAreaM2);
    const valid = !(inputs.clMax && cl > inputs.clMax);
    
    const cd = inputs.cd0 + inputs.k * cl * cl;
    const dragN = q * inputs.wingAreaM2 * cd;
    const pReq = dragN * v;
    
    // Compute effective thrust based on propulsion model
    const propulsionModel = inputs.propulsionModel ?? "constant";
    const effectiveThrust = inputs.totalThrustN !== undefined && Number.isFinite(inputs.totalThrustN) && inputs.totalThrustN > 0
      ? resolveEffectiveThrust({
          thrustInput: inputs.totalThrustN,
          densityKgM3: inputs.densityKgM3,
          velocity: v,
          propulsionType: inputs.engineType ?? "jet",
          model: propulsionModel,
        })
      : undefined;
    
    // Power available (same as preliminary)
    let pAvail: number | undefined;
    if (effectiveThrust !== undefined) {
      if (inputs.engineType === 'prop') {
        const eta = inputs.propEfficiency ?? 0.85;
        pAvail = effectiveThrust * v * eta;
      } else {
        pAvail = effectiveThrust * v;
      }
    }
    
    const pEx = pAvail !== undefined ? pAvail - pReq : undefined;
    const tEx = effectiveThrust !== undefined 
      ? effectiveThrust - dragN 
      : undefined;
    
    // Advanced: Exact climb angle from force balance
    let gamma: number | undefined;
    let roc: number | undefined;
    let sinGammaRaw: number | undefined;
    
    if (tEx !== undefined && inputs.weightN > 0) {
      // Clamp (T - D) / W to [-1, 1] for asin domain
      sinGammaRaw = tEx / inputs.weightN;
      const sinGamma = Math.max(-1, Math.min(1, sinGammaRaw));
      
      // Store gamma as dimensionless gradient (sin(γ))
      gamma = sinGamma;
      
      // Advanced: Exact ROC = V × sin(γ) (only for positive climb)
      if (Number.isFinite(sinGamma) && v > 0 && sinGamma > 0) {
        roc = v * sinGamma;
      }
    }

    points.push({ 
      v, 
      q, 
      cl, 
      cd, 
      dragN, 
      pReq, 
      pAvail, 
      pEx, 
      roc, 
      tEx, 
      gamma, 
      sinGammaRaw,
      valid 
    });
  }

  // Find maxima (same logic as preliminary)
  let vY: number | undefined;
  let vX: number | undefined;
  let rocVy: number | undefined;
  let rocVx: number | undefined;
  let gammaVy: number | undefined;
  let gammaVx: number | undefined;
  
  let maxRoc = -Infinity;
  let maxGamma = -Infinity;
  
  for (const pt of points) {
    if (!pt.valid) continue;
    
    // V_y: maximum ROC (only consider positive ROC for climb)
    if (pt.roc !== undefined && Number.isFinite(pt.roc) && pt.roc > 0 && pt.roc > maxRoc) {
      maxRoc = pt.roc;
      vY = pt.v;
      rocVy = pt.roc;
      gammaVy = pt.gamma;
    }
    
    // V_x: maximum climb gradient (only consider positive gradient for climb)
    if (pt.gamma !== undefined && Number.isFinite(pt.gamma) && pt.gamma > 0 && pt.gamma > maxGamma) {
      maxGamma = pt.gamma;
      vX = pt.v;
      rocVx = pt.roc !== undefined ? pt.roc : undefined;
      gammaVx = pt.gamma;
    }
  }
  
  return { 
    points, 
    vY, 
    vX, 
    rocVy, 
    rocVx, 
    gammaVy, 
    gammaVx 
  };
}

/**
 * Evaluate validity envelope for climb performance results.
 * Pure evaluative function - does not modify calculations or results.
 * 
 * @param params - Climb performance parameters
 * @returns Validity envelope classification
 */
export function evaluateClimbValidityEnvelope(params: {
  gamma?: number;      // dimensionless gradient
  roc?: number;        // m/s
  velocity?: number;   // m/s
  thrust?: number;     // N
  weight?: number;     // N
  propulsionModel?: PropulsionModel; // Optional propulsion model
}): ValidityEnvelope {
  const checks: ValidityEnvelope['checks'] = {
    climbAngle: "valid",
    thrustToWeight: "valid",
    rocVsVelocity: "valid",
  };
  const notes: string[] = [];

  // Climb angle check: Compute angle from ROC and velocity (model-independent)
  // γ_angle = asin(ROC/V) in degrees, or fallback to atan(gamma) if ROC/V unavailable
  let gammaAngleDeg: number | undefined;
  if (params.roc !== undefined && params.velocity !== undefined &&
      Number.isFinite(params.roc) && Number.isFinite(params.velocity) && params.velocity > 0) {
    // Compute angle from ROC/V (physically correct, model-independent)
    gammaAngleDeg = Math.abs(Math.asin(Math.min(1, Math.max(-1, params.roc / params.velocity))) * 180 / Math.PI);
  } else if (params.gamma !== undefined && Number.isFinite(params.gamma)) {
    // Fallback: assume gamma = (T-D)/W and use atan (preliminary model interpretation)
    gammaAngleDeg = Math.abs(Math.atan(params.gamma) * 180 / Math.PI);
  }
  
  if (gammaAngleDeg !== undefined) {
    if (gammaAngleDeg > 30) {
      checks.climbAngle = "invalid";
      notes.push("Climb angle exceeds 30° — small-angle assumptions invalid");
    } else if (gammaAngleDeg > 15) {
      checks.climbAngle = "marginal";
      notes.push("Climb angle 15–30° — small-angle assumption likely violated");
    } else {
      checks.climbAngle = "valid";
    }
  }

  // Thrust-to-weight check: T/W
  if (params.thrust !== undefined && params.weight !== undefined && 
      Number.isFinite(params.thrust) && Number.isFinite(params.weight) && params.weight > 0) {
    const tOverW = params.thrust / params.weight;
    if (tOverW > 1.3) {
      checks.thrustToWeight = "invalid";
      notes.push("Excess thrust beyond steady climb domain (T/W > 1.3)");
    } else if (tOverW > 1.0) {
      checks.thrustToWeight = "marginal";
      notes.push("Excess thrust exceeds steady climb domain (T/W > 1.0)");
    } else {
      checks.thrustToWeight = "valid";
    }
  }

  // ROC vs velocity check: ROC ≤ V
  if (params.roc !== undefined && params.velocity !== undefined &&
      Number.isFinite(params.roc) && Number.isFinite(params.velocity) && params.velocity > 0) {
    if (params.roc > params.velocity) {
      checks.rocVsVelocity = "invalid";
      notes.push("ROC exceeds physical vertical speed limit (ROC > V)");
    } else {
      checks.rocVsVelocity = "valid";
    }
  }

  // Add informational note for speed-dependent propulsion model
  if (params.propulsionModel === "speedDecay" && params.velocity !== undefined && params.velocity > 0.8 * 100) {
    notes.push("Thrust reduced due to speed-dependent propulsion model");
  }
  
  // Add informational notes for energy climb analysis (if ROC is very low)
  if (params.roc !== undefined && Number.isFinite(params.roc) && params.roc > 0 && params.roc <= 1.0) {
    notes.push("ROC approaches zero — near service ceiling");
  }
  if (params.roc !== undefined && Number.isFinite(params.roc) && params.roc > 0 && params.roc <= 0.5) {
    notes.push("Energy-limited climb regime");
  }

  // Compute overall validity
  let overall: ValidityLevel = "valid";
  if (checks.climbAngle === "invalid" || checks.thrustToWeight === "invalid" || checks.rocVsVelocity === "invalid") {
    overall = "invalid";
  } else if (checks.climbAngle === "marginal" || checks.thrustToWeight === "marginal" || checks.rocVsVelocity === "marginal") {
    overall = "marginal";
  }

  return {
    overall,
    checks,
    notes,
  };
}

/**
 * Compute energy climb profile (ROC vs altitude) and service ceiling.
 * Pure helper function - sweeps altitude and re-uses existing climb solver.
 * 
 * @param params - Energy climb computation parameters
 * @returns Energy climb profile and service ceiling
 */
export function computeEnergyClimbProfile(params: {
  baseInputs: ClimbInputs;
  climbModel: "preliminary" | "advanced";
  propulsionModel: PropulsionModel;
  maxAltitudeM?: number;
  stepM?: number;
}): {
  profile: Array<{ altitude: number; roc: number }>;
  serviceCeilingM: number | null;
} {
  const maxAltitudeM = params.maxAltitudeM ?? 20000;
  const stepM = params.stepM ?? 500;
  const profile: Array<{ altitude: number; roc: number }> = [];
  let serviceCeilingM: number | null = null;
  
  // Sweep altitude from 0 to maxAltitudeM
  for (let altitude = 0; altitude <= maxAltitudeM; altitude += stepM) {
    // Compute density at this altitude using ISA
    const density = calculateISADensity(altitude, 0);
    
    // Create modified inputs with altitude-specific density
    const altitudeInputs: ClimbInputs = {
      ...params.baseInputs,
      densityKgM3: density,
      propulsionModel: params.propulsionModel,
    };
    
    // Re-run existing climb solver (do NOT recompute equations manually)
    const climbResult = params.climbModel === "advanced"
      ? computeClimbPerformanceAdvanced(altitudeInputs)
      : computeClimbPerformance(altitudeInputs);
    
    // Extract ROC at V_y
    const roc = climbResult.rocVy;
    
    if (roc !== undefined && Number.isFinite(roc)) {
      profile.push({ altitude, roc });
      
      // Service ceiling: first altitude where ROC <= 0.5 m/s
      if (serviceCeilingM === null && roc <= 0.5) {
        serviceCeilingM = altitude;
      }
    }
  }
  
  return {
    profile,
    serviceCeilingM,
  };
}

/**
 * Convert m/s to knots
 */
export function msToKts(ms: number): number {
  return ms * KNOTS_TO_MS;
}

/**
 * Convert m/s to ft/min
 */
export function msToFpm(ms: number): number {
  return ms * MS_TO_FPM;
}

/**
 * Convert knots to m/s
 */
export function ktsToMs(kts: number): number {
  return kts / KNOTS_TO_MS;
}

