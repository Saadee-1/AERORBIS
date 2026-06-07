/**
 * L/D Analyzer — Phase 2 Performance Envelope
 *
 * Pure functions. ADDITIVE — does not touch frozen physics.
 *
 * Modules:
 *  6. Drag-polar fit: extract CD0, k from {CL_i, CD_i} via least-squares on CD = CD0 + k·CL²
 *  7. Key performance points: (L/D)_max, (CL^1.5/CD)_max, (CL^0.5/CD)_max
 *  8. V-speed sweep at fixed altitude (stall, best-glide, best-range, min-power)
 *  9. Breguet range & endurance (jet & propeller)
 * 10. Sink-rate / glide hodograph
 * 11. Altitude sweep: L/D_max vs altitude via ISA
 */

const g0 = 9.80665;

// ───────────────────────────────────────────────────────────────────────────────
// 6. DRAG-POLAR FIT
// ───────────────────────────────────────────────────────────────────────────────

export interface PolarFit {
  CD0: number;
  k: number;
  rSquared: number;
  residualMax: number;
}

/** Least-squares fit of CD = CD0 + k · CL² on sample arrays. */
export function fitDragPolar(cl: number[], cd: number[]): PolarFit {
  if (cl.length !== cd.length || cl.length < 3) {
    return { CD0: 0, k: 0, rSquared: 0, residualMax: 0 };
  }
  // Linear regression: y = a + b·x, with x = CL², y = CD
  let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
  for (let i = 0; i < cl.length; i++) {
    const x = cl[i] * cl[i];
    const y = cd[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    sx += x; sy += y; sxx += x * x; sxy += x * y; n++;
  }
  if (n < 2) return { CD0: 0, k: 0, rSquared: 0, residualMax: 0 };
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-12) return { CD0: 0, k: 0, rSquared: 0, residualMax: 0 };
  const k = (n * sxy - sx * sy) / den;
  const CD0 = (sy - k * sx) / n;
  // R² + max residual
  const meanY = sy / n;
  let ssTot = 0, ssRes = 0, resMax = 0;
  for (let i = 0; i < cl.length; i++) {
    const pred = CD0 + k * cl[i] * cl[i];
    const resid = cd[i] - pred;
    ssTot += (cd[i] - meanY) ** 2;
    ssRes += resid * resid;
    if (Math.abs(resid) > resMax) resMax = Math.abs(resid);
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { CD0: Math.max(0, CD0), k: Math.max(0, k), rSquared: r2, residualMax: resMax };
}

// ───────────────────────────────────────────────────────────────────────────────
// 7. KEY PERFORMANCE POINTS (parabolic polar)
// ───────────────────────────────────────────────────────────────────────────────

export interface PerformancePoints {
  CL_LDmax: number;       // CL at (L/D)_max
  LD_max: number;
  CL_endurance: number;   // CL at max CL^1.5 / CD  (jet range / prop endurance approx)
  metric_endurance: number;
  CL_propRange: number;   // CL at max CL^0.5 / CD  (prop range)
  metric_propRange: number;
}

/** Closed-form points for parabolic polar CD = CD0 + k·CL². */
export function keyPerformancePoints(CD0: number, k: number): PerformancePoints {
  if (CD0 <= 0 || k <= 0) {
    return { CL_LDmax: 0, LD_max: 0, CL_endurance: 0, metric_endurance: 0, CL_propRange: 0, metric_propRange: 0 };
  }
  const CL_LDmax = Math.sqrt(CD0 / k);
  const LD_max = 1 / (2 * Math.sqrt(CD0 * k));
  // (CL^1.5)/CD  → max at CL = sqrt(3·CD0/k)
  const CL_end = Math.sqrt((3 * CD0) / k);
  const CD_end = CD0 + k * CL_end * CL_end;
  // (CL^0.5)/CD → max at CL = sqrt(CD0/(3·k))
  const CL_prop = Math.sqrt(CD0 / (3 * k));
  const CD_prop = CD0 + k * CL_prop * CL_prop;
  return {
    CL_LDmax,
    LD_max,
    CL_endurance: CL_end,
    metric_endurance: Math.pow(CL_end, 1.5) / CD_end,
    CL_propRange: CL_prop,
    metric_propRange: Math.sqrt(CL_prop) / CD_prop,
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// 8. V-SPEED SWEEP
// ───────────────────────────────────────────────────────────────────────────────

export interface VSpeedResult {
  V_stall: number;       // m/s
  V_bestGlide: number;   // V at L/D_max
  V_minPower: number;    // V at (CL^1.5/CD)_max  → minimum power required
  V_bestRangeProp: number;
}

export function vSpeeds(params: {
  weight_N: number;
  S: number;
  density: number;
  CL_max: number;
  CD0: number;
  k: number;
}): VSpeedResult {
  const { weight_N: W, S, density: ρ, CL_max, CD0, k } = params;
  const wS = W / S;
  const Vfor = (CL: number) => (CL > 0 ? Math.sqrt((2 * wS) / (ρ * CL)) : 0);
  const pts = keyPerformancePoints(CD0, k);
  return {
    V_stall: Vfor(CL_max),
    V_bestGlide: Vfor(pts.CL_LDmax),
    V_minPower: Vfor(pts.CL_endurance),
    V_bestRangeProp: Vfor(pts.CL_propRange),
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// 9. BREGUET RANGE & ENDURANCE
// ───────────────────────────────────────────────────────────────────────────────

export interface BreguetInputs {
  W0: number;        // initial weight, N
  W1: number;        // final weight, N (W1 < W0)
  V: number;         // cruise velocity, m/s
  L_over_D: number;
  TSFC?: number;     // jet: 1/s   (c_t)
  BSFC?: number;     // prop: kg/(W·s)
  eta_prop?: number; // prop efficiency 0..1
}

export interface BreguetResult {
  range_m: number;
  endurance_s: number;
}

/** Breguet for jet (TSFC in 1/s): R = V/c · L/D · ln(W0/W1) ; E = (1/c) · L/D · ln(W0/W1). */
export function breguetJet(p: BreguetInputs): BreguetResult {
  if (!p.TSFC || p.TSFC <= 0 || p.W1 >= p.W0) return { range_m: 0, endurance_s: 0 };
  const ln = Math.log(p.W0 / p.W1);
  return {
    range_m: (p.V / p.TSFC) * p.L_over_D * ln,
    endurance_s: (1 / p.TSFC) * p.L_over_D * ln,
  };
}

/** Breguet for propeller (BSFC in kg/(W·s)):
 *   R = (η/(c·g)) · L/D · ln(W0/W1) ; E = (η/(c·g·V)) · L/D · ln(W0/W1) (approx).
 */
export function breguetProp(p: BreguetInputs): BreguetResult {
  if (!p.BSFC || p.BSFC <= 0 || !p.eta_prop || p.W1 >= p.W0) return { range_m: 0, endurance_s: 0 };
  const ln = Math.log(p.W0 / p.W1);
  const cg = p.BSFC * g0;
  return {
    range_m: (p.eta_prop / cg) * p.L_over_D * ln,
    endurance_s: (p.eta_prop / (cg * p.V)) * p.L_over_D * ln,
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// 10. GLIDE / SINK-RATE HODOGRAPH
// ───────────────────────────────────────────────────────────────────────────────

export interface SinkPoint {
  V: number;        // m/s
  sink: number;     // m/s (positive downward)
  LD: number;
}

/** Build V vs sink-rate polar for a parabolic polar at given weight & altitude. */
export function sinkRatePolar(params: {
  weight_N: number;
  S: number;
  density: number;
  CD0: number;
  k: number;
  V_min: number;
  V_max: number;
  steps?: number;
}): SinkPoint[] {
  const { weight_N: W, S, density: ρ, CD0, k, V_min, V_max, steps = 60 } = params;
  const out: SinkPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const V = V_min + ((V_max - V_min) * i) / steps;
    if (V <= 0) continue;
    const CL = (2 * W) / (ρ * V * V * S);
    const CD = CD0 + k * CL * CL;
    const LD = CL / CD;
    // For shallow glide: γ ≈ 1/(L/D), sink = V·sin(γ) ≈ V/(L/D)
    const sink = LD > 0 ? V / LD : NaN;
    out.push({ V: +V.toFixed(2), sink: +sink.toFixed(3), LD: +LD.toFixed(2) });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────────
// 11. ALTITUDE SWEEP (L/D_max & best-glide V vs altitude)
// ───────────────────────────────────────────────────────────────────────────────

/** ISA density up to 25 km (matches isaAtmosphere util). */
function isaDensity(h_m: number): number {
  const T0 = 288.15, P0 = 101325, L = 0.0065, R = 287.05, gg = 9.80665;
  if (h_m <= 11000) {
    const T = T0 - L * h_m;
    const P = P0 * Math.pow(T / T0, gg / (R * L));
    return P / (R * T);
  }
  // Stratosphere isothermal slab 11-20km
  const T11 = 216.65;
  const P11 = P0 * Math.pow(T11 / T0, gg / (R * L));
  if (h_m <= 20000) {
    const P = P11 * Math.exp((-gg * (h_m - 11000)) / (R * T11));
    return P / (R * T11);
  }
  // 20-32 km: T rises at +1 K/km
  const T20 = T11;
  const P20 = P11 * Math.exp((-gg * (20000 - 11000)) / (R * T11));
  const L2 = -0.001;
  const T = T20 - L2 * (h_m - 20000);
  const P = P20 * Math.pow(T / T20, gg / (R * L2));
  return P / (R * T);
}

export interface AltitudeSweepPoint {
  alt_m: number;
  density: number;
  V_bestGlide: number;
  LD_max: number;
}

export function altitudeSweep(params: {
  weight_N: number;
  S: number;
  CD0: number;
  k: number;
  altMax_m?: number;
  steps?: number;
}): AltitudeSweepPoint[] {
  const { weight_N: W, S, CD0, k, altMax_m = 15000, steps = 30 } = params;
  const pts = keyPerformancePoints(CD0, k);
  const out: AltitudeSweepPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const h = (altMax_m * i) / steps;
    const ρ = isaDensity(h);
    const V = Math.sqrt((2 * W) / (ρ * S * pts.CL_LDmax));
    out.push({
      alt_m: Math.round(h),
      density: +ρ.toFixed(4),
      V_bestGlide: +V.toFixed(2),
      LD_max: +pts.LD_max.toFixed(2),
    });
  }
  return out;
}