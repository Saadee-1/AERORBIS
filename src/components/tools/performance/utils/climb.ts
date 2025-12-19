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

export type ClimbResult = {
  points: ClimbPoint[];
  vY?: number; // Best rate of climb speed (m/s)
  vX?: number; // Best angle of climb speed (m/s)
  rocVy?: number; // Rate of climb at V_y (m/s)
  gammaVy?: number; // Climb gradient at V_y
  rocVx?: number; // Rate of climb at V_x (m/s)
  gammaVx?: number; // Climb gradient at V_x
};

const GRAVITY = 9.81; // m/s²
const KNOTS_TO_MS = 1.94384;
const MS_TO_FPM = 196.8504;

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
    
    // Power available
    let pAvail: number | undefined;
    if (inputs.totalThrustN !== undefined && Number.isFinite(inputs.totalThrustN) && inputs.totalThrustN > 0) {
      if (inputs.engineType === 'prop') {
        const eta = inputs.propEfficiency ?? 0.85;
        pAvail = inputs.totalThrustN * v * eta;
      } else {
        // For jets/turbofans: P_avail = T * V (simplified)
        pAvail = inputs.totalThrustN * v;
      }
    }
    
    // Excess power
    const pEx = pAvail !== undefined ? pAvail - pReq : undefined;
    
    // Rate of climb (ROC) = P_ex / W
    const roc = pEx !== undefined && pEx > 0 ? pEx / inputs.weightN : undefined;
    
    // Excess thrust
    const tEx = inputs.totalThrustN !== undefined && Number.isFinite(inputs.totalThrustN) 
      ? inputs.totalThrustN - dragN 
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
    
    // Power available (same as preliminary)
    let pAvail: number | undefined;
    if (inputs.totalThrustN !== undefined && Number.isFinite(inputs.totalThrustN) && inputs.totalThrustN > 0) {
      if (inputs.engineType === 'prop') {
        const eta = inputs.propEfficiency ?? 0.85;
        pAvail = inputs.totalThrustN * v * eta;
      } else {
        pAvail = inputs.totalThrustN * v;
      }
    }
    
    const pEx = pAvail !== undefined ? pAvail - pReq : undefined;
    const tEx = inputs.totalThrustN !== undefined && Number.isFinite(inputs.totalThrustN) 
      ? inputs.totalThrustN - dragN 
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

