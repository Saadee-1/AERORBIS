/**
 * Advanced aircraft thrust-loading utilities (additive).
 *
 * Includes:
 *   - vnDiagram: V-n flight envelope (maneuver + gust lines, FAR 23/25)
 *   - serviceCeiling: Climb rate vs altitude, finds altitude where ROC → 100 fpm
 *   - dragPolar: CL vs CD parabolic polar
 *   - breguetRange / breguetEndurance for jet & prop
 *   - thrustLapse: Mattingly-style turbojet/turbofan/turboprop curves
 *   - sustainedTurnRate / cornerVelocity
 *
 * References: Mattingly "Aircraft Engine Design", Raymer "Aircraft Design",
 *   Anderson "Intro to Flight", FAR Part 23/25.
 */

import { calculateAtmosphere } from "@/tools/atmosphere/utils/calcAtmosphere";

const G = 9.80665;

// ---------------------------------------------------------------------------
// V-n diagram (FAR 25 transport-style)
// ---------------------------------------------------------------------------

export interface VnPoint { v: number; nPos: number; nNeg: number; nGustPos?: number; nGustNeg?: number; nStallPos?: number; nStallNeg?: number; }

export function vnDiagram(params: {
  wsKgPerM2: number;     // wing loading W/S (kg/m²)
  clMax: number;
  clMaxNeg?: number;     // negative CLmax (default 0.7 * positive)
  nLimitPos?: number;    // structural limit
  nLimitNeg?: number;
  vCruiseMs: number;
  vDiveMs?: number;      // default 1.4 * Vcruise
  altitudeM?: number;    // default 0
  uGustMs?: number;      // gust velocity, default 15.24 m/s (50 fps)
  steps?: number;
}): VnPoint[] {
  const {
    wsKgPerM2,
    clMax,
    vCruiseMs,
  } = params;
  const clMaxNeg = params.clMaxNeg ?? clMax * 0.7;
  const nLimitPos = params.nLimitPos ?? 2.5;
  const nLimitNeg = params.nLimitNeg ?? -1.0;
  const vDive = params.vDiveMs ?? 1.4 * vCruiseMs;
  const atm = calculateAtmosphere(params.altitudeM ?? 0, 0);
  const rho = atm.density;
  const Uref = params.uGustMs ?? 15.24;
  const steps = params.steps ?? 60;

  // Gust load factor (simplified): n = 1 + (rho * U * V * CLα) / (2 * W/S * g)
  // Use CLα = 2π/rad (thin airfoil)
  const CLa = 2 * Math.PI;
  const wsN = wsKgPerM2 * G;

  const out: VnPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const v = (vDive * i) / steps;
    const q = 0.5 * rho * v * v;
    const nStallPos = (q * clMax) / wsN;
    const nStallNeg = -(q * clMaxNeg) / wsN;
    const nPos = Math.min(nStallPos, nLimitPos);
    const nNeg = Math.max(nStallNeg, nLimitNeg);
    const nGustPos = v > 0 ? 1 + (rho * Uref * v * CLa) / (2 * wsN) : 1;
    const nGustNeg = v > 0 ? 1 - (rho * Uref * v * CLa) / (2 * wsN) : 1;
    out.push({ v, nPos, nNeg, nGustPos, nGustNeg, nStallPos, nStallNeg });
  }
  return out;
}

/** Corner velocity: where stall curve meets structural limit. V* = √(2 n_max W / (ρ S CLmax)) */
export function cornerVelocity(wsKgPerM2: number, clMax: number, nMax: number, altitudeM = 0): number {
  const atm = calculateAtmosphere(altitudeM, 0);
  const wsN = wsKgPerM2 * G;
  return Math.sqrt((2 * nMax * wsN) / (atm.density * clMax));
}

// ---------------------------------------------------------------------------
// Service ceiling — ROC vs altitude
// ---------------------------------------------------------------------------

export interface CeilingPoint { altM: number; rocMs: number; rocFpm: number; vBestMs: number; }

export function serviceCeilingSweep(params: {
  thrustN: number;
  weightN: number;
  wingAreaM2: number;
  cd0: number;
  k: number;
  thrustLapseExponent?: number; // T(h) = T0 * (rho/rho0)^n; jet ≈ 0.7, prop ≈ 1.0
  hMaxM?: number;
  steps?: number;
}): { points: CeilingPoint[]; serviceCeilingM: number; absoluteCeilingM: number } {
  const exp = params.thrustLapseExponent ?? 0.7;
  const hMax = params.hMaxM ?? 20000;
  const steps = params.steps ?? 40;
  const points: CeilingPoint[] = [];
  const rho0 = 1.225;
  let serviceCeilingM = 0;
  let absoluteCeilingM = 0;

  for (let i = 0; i <= steps; i++) {
    const h = (hMax * i) / steps;
    const atm = calculateAtmosphere(h, 0);
    const rho = atm.density;
    const T = params.thrustN * Math.pow(rho / rho0, exp);
    // V_best climb ≈ √(2W/(ρ S √(CD0/k)))
    const vBest = Math.sqrt((2 * params.weightN) / (rho * params.wingAreaM2 * Math.sqrt(params.cd0 / params.k)));
    // ROC = V (T/W − D/W),  D/W at L=W ≈ 2√(CD0 k)
    const dOverW = 2 * Math.sqrt(params.cd0 * params.k);
    const roc = vBest * (T / params.weightN - dOverW);
    const rocFpm = roc * 196.85;
    points.push({ altM: h, rocMs: roc, rocFpm, vBestMs: vBest });

    if (rocFpm >= 100) serviceCeilingM = h;
    if (roc > 0) absoluteCeilingM = h;
  }
  return { points, serviceCeilingM, absoluteCeilingM };
}

// ---------------------------------------------------------------------------
// Drag polar
// ---------------------------------------------------------------------------

export interface PolarPoint { cl: number; cd: number; ld: number; }

export function dragPolar(cd0: number, k: number, clMin = -0.5, clMax = 2.0, steps = 60): PolarPoint[] {
  const out: PolarPoint[] = [];
  const dCL = (clMax - clMin) / steps;
  for (let i = 0; i <= steps; i++) {
    const cl = clMin + dCL * i;
    const cd = cd0 + k * cl * cl;
    const ld = cd > 0 ? cl / cd : 0;
    out.push({ cl, cd, ld });
  }
  return out;
}

/** Maximum L/D and the CL at which it occurs. */
export function maxLD(cd0: number, k: number): { ldMax: number; clOpt: number } {
  const clOpt = Math.sqrt(cd0 / k);
  const ldMax = 1 / (2 * Math.sqrt(cd0 * k));
  return { ldMax, clOpt };
}

// ---------------------------------------------------------------------------
// Breguet range / endurance
// ---------------------------------------------------------------------------

/** Jet range:  R = (V/c) * (L/D) * ln(W0/W1)   [m] with c in 1/s (TSFC) */
export function breguetRangeJet(vMs: number, tsfcPerS: number, ld: number, w0: number, w1: number): number {
  if (!(tsfcPerS > 0) || !(ld > 0) || !(w0 > 0) || !(w1 > 0) || w1 >= w0) return 0;
  return (vMs / tsfcPerS) * ld * Math.log(w0 / w1);
}

/** Jet endurance: E = (1/c) * (L/D) * ln(W0/W1) [s] */
export function breguetEnduranceJet(tsfcPerS: number, ld: number, w0: number, w1: number): number {
  if (!(tsfcPerS > 0) || !(ld > 0) || w1 >= w0) return 0;
  return (1 / tsfcPerS) * ld * Math.log(w0 / w1);
}

/** Prop range: R = (η_p / c) * (L/D) * ln(W0/W1) [m], c in 1/s (BSFC*g) */
export function breguetRangeProp(etaProp: number, bsfcPerS: number, ld: number, w0: number, w1: number): number {
  if (!(bsfcPerS > 0) || !(ld > 0) || w1 >= w0) return 0;
  return (etaProp / bsfcPerS) * ld * Math.log(w0 / w1);
}

/** Prop endurance: E = (η/c) * (L/D) * √(2ρS/W1) * (1/√CL_E) … simplified version */
export function breguetEnduranceProp(etaProp: number, bsfcPerS: number, ld: number, w0: number, w1: number, vMs: number): number {
  if (!(bsfcPerS > 0) || !(ld > 0) || !(vMs > 0) || w1 >= w0) return 0;
  return (etaProp / bsfcPerS) * (ld / vMs) * Math.log(w0 / w1);
}

// ---------------------------------------------------------------------------
// Thrust lapse (Mattingly)
// ---------------------------------------------------------------------------

export type EngineClass = "turbojet" | "lowBypass" | "highBypass" | "turboprop";

export interface LapsePoint { altM: number; mach: number; thrustRatio: number; }

/**
 * Approximate installed-thrust lapse vs altitude & Mach.
 * Empirical Mattingly form: α = (ρ/ρ0)^n * f(M)
 */
export function thrustLapseSweep(eng: EngineClass, maxMach = 1.5, altSteps = 5, machSteps = 30): LapsePoint[] {
  const exponent: Record<EngineClass, number> = {
    turbojet: 0.7,
    lowBypass: 0.7,
    highBypass: 0.8,
    turboprop: 1.0,
  };
  const out: LapsePoint[] = [];
  const altitudes = [0, 3000, 6000, 9000, 12000].slice(0, altSteps);
  const rho0 = 1.225;

  for (const h of altitudes) {
    const atm = calculateAtmosphere(h, 0);
    const sigma = atm.density / rho0;
    for (let i = 0; i <= machSteps; i++) {
      const M = (maxMach * i) / machSteps;
      let fM = 1;
      switch (eng) {
        case "turbojet":
          fM = 1 - 0.3 * M + 0.1 * M * M;
          break;
        case "lowBypass":
          fM = 1 - 0.4 * M + 0.18 * M * M;
          break;
        case "highBypass":
          fM = 1 - 0.55 * M + 0.15 * M * M;
          break;
        case "turboprop":
          fM = 1 / Math.max(0.3, 1 + M * 1.5);
          break;
      }
      const ratio = Math.max(0, Math.pow(sigma, exponent[eng]) * fM);
      out.push({ altM: h, mach: M, thrustRatio: ratio });
    }
  }
  return out;
}

/** Sustained turn rate at a given speed and load factor. */
export function sustainedTurnRateDegPerS(vMs: number, nLoad: number): number {
  if (nLoad <= 1 || vMs <= 0) return 0;
  const omega = (G * Math.sqrt(nLoad * nLoad - 1)) / vMs;
  return omega * (180 / Math.PI);
}

export function turnRadiusM(vMs: number, nLoad: number): number {
  if (nLoad <= 1 || vMs <= 0) return Infinity;
  return (vMs * vMs) / (G * Math.sqrt(nLoad * nLoad - 1));
}

/* ============================================================ */
/*  Phase B additions                                            */
/* ============================================================ */

/** Curated aircraft presets (sea-level reference values). */
export interface AircraftPreset {
  id: string;
  name: string;
  category: "Fighter" | "Transport" | "GA" | "UAV";
  weightN: number;
  wingAreaM2: number;
  thrustN: number;
  cd0: number;
  k: number;
  clMax: number;
  vCruiseMs: number;
  engineClass: EngineClass;
  notes?: string;
}

export const AIRCRAFT_PRESETS: AircraftPreset[] = [
  {
    id: "f16",   name: "F-16C Fighting Falcon", category: "Fighter",
    weightN: 12000 * G, wingAreaM2: 27.87, thrustN: 129000,
    cd0: 0.020, k: 0.117, clMax: 1.4, vCruiseMs: 280, engineClass: "lowBypass",
    notes: "F110-GE-129 afterburning turbofan",
  },
  {
    id: "b737", name: "Boeing 737-800", category: "Transport",
    weightN: 79000 * G, wingAreaM2: 124.6, thrustN: 2 * 117000,
    cd0: 0.018, k: 0.043, clMax: 2.6, vCruiseMs: 230, engineClass: "highBypass",
    notes: "2 × CFM56-7B27",
  },
  {
    id: "c172", name: "Cessna 172 Skyhawk", category: "GA",
    weightN: 1110 * G, wingAreaM2: 16.17, thrustN: 800,
    cd0: 0.027, k: 0.054, clMax: 1.6, vCruiseMs: 62, engineClass: "turboprop",
    notes: "Lycoming O-360 / propeller",
  },
  {
    id: "rq4", name: "RQ-4 Global Hawk", category: "UAV",
    weightN: 14628 * G, wingAreaM2: 50.17, thrustN: 34000,
    cd0: 0.013, k: 0.030, clMax: 1.8, vCruiseMs: 175, engineClass: "highBypass",
    notes: "AE3007H, high-altitude long endurance",
  },
  {
    id: "su27", name: "Su-27 Flanker", category: "Fighter",
    weightN: 23000 * G, wingAreaM2: 62.0, thrustN: 2 * 122600,
    cd0: 0.018, k: 0.10, clMax: 1.6, vCruiseMs: 320, engineClass: "lowBypass",
    notes: "2 × AL-31F",
  },
  {
    id: "a320", name: "Airbus A320neo", category: "Transport",
    weightN: 79000 * G, wingAreaM2: 122.6, thrustN: 2 * 120000,
    cd0: 0.017, k: 0.041, clMax: 2.7, vCruiseMs: 233, engineClass: "highBypass",
    notes: "2 × PW1100G geared turbofan",
  },
];

/**
 * Thrust required vs thrust available across Mach.
 * T_req = q S CD0 + (W²/(q S)) k     (steady level flight)
 * T_avail = T0 · α(h, M)
 */
export function thrustVsMachSweep(params: {
  thrustN: number;
  weightN: number;
  wingAreaM2: number;
  cd0: number;
  k: number;
  altitudeM: number;
  engineClass: EngineClass;
  maxMach?: number;
  steps?: number;
}): Array<{ mach: number; tReq: number; tAvail: number; excess: number }> {
  const max = params.maxMach ?? 1.6;
  const steps = params.steps ?? 50;
  const atm = calculateAtmosphere(params.altitudeM, 0);
  const rho = atm.density, a = atm.speedOfSound;
  const rho0 = 1.225;
  const exponent: Record<EngineClass, number> = {
    turbojet: 0.7, lowBypass: 0.7, highBypass: 0.8, turboprop: 1.0,
  };
  const sigma = rho / rho0;
  const out: Array<{ mach: number; tReq: number; tAvail: number; excess: number }> = [];
  for (let i = 1; i <= steps; i++) {
    const M = (max * i) / steps;
    const V = M * a;
    const q = 0.5 * rho * V * V;
    if (q <= 0) continue;
    const tReq = q * params.wingAreaM2 * params.cd0 +
                 (params.weightN * params.weightN) / (q * params.wingAreaM2) * params.k;
    let fM = 1;
    switch (params.engineClass) {
      case "turbojet":  fM = 1 - 0.3 * M + 0.10 * M * M; break;
      case "lowBypass": fM = 1 - 0.4 * M + 0.18 * M * M; break;
      case "highBypass":fM = 1 - 0.55 * M + 0.15 * M * M; break;
      case "turboprop": fM = 1 / Math.max(0.3, 1 + M * 1.5); break;
    }
    const tAvail = Math.max(0, params.thrustN * Math.pow(sigma, exponent[params.engineClass]) * fM);
    out.push({ mach: M, tReq, tAvail, excess: tAvail - tReq });
  }
  return out;
}

/**
 * Constraint analysis (sizing diagram). Returns curves T/W vs W/S for:
 * takeoff, cruise, climb, landing (vertical line), ceiling.
 * Feasibility = all constraints satisfied (T/W above every curve, W/S left of landing line).
 */
export interface SizingPoint {
  ws: number;       // wing loading (N/m²)
  takeoff: number;
  cruise: number;
  climb: number;
  ceiling: number;
}

export function sizingDiagram(params: {
  cd0: number;
  k: number;
  clMaxTO: number;
  clMaxLand: number;
  sigmaTO?: number;      // ρ/ρ₀ at takeoff
  takeoffParam?: number; // TOP for TO distance constraint
  cruiseMachOrV: { mach?: number; vMs?: number; altitudeM: number };
  climbAngleDeg?: number;
  ceilingAltM?: number;
  vApproachMs?: number;  // for landing W/S
  rocClimbMs?: number;   // ROC at ceiling-defining alt
  wsMaxNPerM2?: number;
  steps?: number;
}): { points: SizingPoint[]; landingWSMax: number } {
  const sigmaTO = params.sigmaTO ?? 1.0;
  const TOP = params.takeoffParam ?? 280; // (W/S)/(σ CLmax TW)
  const climbAngle = ((params.climbAngleDeg ?? 3) * Math.PI) / 180;
  const cruiseAtm = calculateAtmosphere(params.cruiseMachOrV.altitudeM, 0);
  const Vc = params.cruiseMachOrV.vMs ?? (params.cruiseMachOrV.mach ?? 0.8) * cruiseAtm.speedOfSound;
  const qC = 0.5 * cruiseAtm.density * Vc * Vc;
  const ceilingAtm = calculateAtmosphere(params.ceilingAltM ?? 12000, 0);
  const qCeil = 0.5 * ceilingAtm.density * Vc * Vc;
  const rocClimb = params.rocClimbMs ?? 0.508; // 100 fpm

  // Landing: W/S = ρ V_app² CLmax_land / (2 * 1.3²)
  const vApp = params.vApproachMs ?? 70;
  const landingWSMax = (1.225 * vApp * vApp * params.clMaxLand) / (2 * 1.69);

  const wsMax = params.wsMaxNPerM2 ?? Math.max(landingWSMax * 1.2, 8000);
  const steps = params.steps ?? 60;
  const points: SizingPoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const ws = (wsMax * i) / steps;
    // Takeoff: T/W = (W/S) / (TOP · σ · CLmax_TO)
    const takeoff = ws / (TOP * sigmaTO * params.clMaxTO);
    // Cruise: T/W = qC CD0 / (W/S) + k (W/S) / qC
    const cruise = (qC * params.cd0) / ws + (params.k * ws) / qC;
    // Climb (steady): T/W = sin γ + (qC CD0)/ws + (k ws)/qC
    const climb = Math.sin(climbAngle) + (qC * params.cd0) / ws + (params.k * ws) / qC;
    // Ceiling: ROC/V + 2√(CD0 k)
    const ceiling = rocClimb / Vc + 2 * Math.sqrt(params.cd0 * params.k) +
                    (qCeil * params.cd0) / ws + (params.k * ws) / qCeil - (qC * params.cd0) / ws - (params.k * ws) / qC;
    points.push({ ws, takeoff, cruise, climb, ceiling: Math.max(0, ceiling) });
  }
  return { points, landingWSMax };
}

/**
 * Mission segment fuel burn (energy/Breguet method).
 * Returns per-segment fuel kg and totals.
 */
export type SegmentKind = "taxi" | "climb" | "cruise" | "loiter" | "descent" | "reserve";
export interface MissionSegment {
  kind: SegmentKind;
  durationS?: number;     // taxi / loiter / reserve
  rangeM?: number;        // cruise / climb / descent
  vMs?: number;
  tsfcPerS: number;       // engine TSFC
  thrustFraction?: number;// fraction of max thrust used (default cruise≈L/D-based)
  ldRatio?: number;       // L/D for the segment
}
export interface SegmentResult { kind: SegmentKind; fuelKg: number; weightFraction: number; }

export function missionFuelBurn(
  startMassKg: number,
  segments: MissionSegment[],
  thrustMaxN: number,
): { results: SegmentResult[]; finalMassKg: number; totalFuelKg: number } {
  let mass = startMassKg;
  const results: SegmentResult[] = [];
  for (const s of segments) {
    let frac = 1;
    if (s.kind === "taxi") {
      // Fuel = TSFC * T * dt; assume idle 5% thrust
      const burn = s.tsfcPerS * (0.05 * thrustMaxN) * (s.durationS ?? 600) / G;
      frac = Math.max(0.5, 1 - burn / mass);
    } else if (s.kind === "cruise" && s.rangeM && s.vMs && s.ldRatio) {
      // W1/W0 = exp(-R c / (V (L/D)))
      frac = Math.exp(-(s.rangeM * s.tsfcPerS) / (s.vMs * s.ldRatio));
    } else if (s.kind === "loiter" && s.durationS && s.ldRatio) {
      frac = Math.exp(-(s.durationS * s.tsfcPerS) / s.ldRatio);
    } else if (s.kind === "climb" && s.durationS) {
      const burn = s.tsfcPerS * (0.9 * thrustMaxN) * s.durationS / G;
      frac = Math.max(0.5, 1 - burn / mass);
    } else if (s.kind === "descent" && s.durationS) {
      const burn = s.tsfcPerS * (0.2 * thrustMaxN) * s.durationS / G;
      frac = Math.max(0.5, 1 - burn / mass);
    } else if (s.kind === "reserve" && s.durationS && s.ldRatio) {
      frac = Math.exp(-(s.durationS * s.tsfcPerS) / s.ldRatio);
    }
    const newMass = mass * frac;
    const fuelKg = Math.max(0, mass - newMass);
    results.push({ kind: s.kind, fuelKg, weightFraction: frac });
    mass = newMass;
  }
  return { results, finalMassKg: mass, totalFuelKg: startMassKg - mass };
}