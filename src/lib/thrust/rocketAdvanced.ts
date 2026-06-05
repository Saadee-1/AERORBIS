/**
 * Advanced rocket physics utilities (additive — does not modify existing math).
 *
 * Includes:
 *   - optimumEpsilon: ε that yields Pe = Pa at given altitude (peak Isp)
 *   - bartzHeatFlux: Throat convective heat flux (Bartz correlation, 1957)
 *   - summerfieldSeparation: Flow separation criterion (Pe/Pa < ~0.4)
 *   - shockDiamondCount: Visual indicator of off-design operation
 *   - multiStageDeltaV: Tsiolkovsky chained for staged vehicles
 *   - tsiolkovsky: ΔV = Ve * ln(m0/mf)
 *   - nozzleProfile: Bell-nozzle (80% bell, Rao approximation) (x,r) points
 *
 * References: Sutton & Biblarz, Anderson, Bartz (1957), Huzel & Huang (1992).
 */

import { solveForMe } from "@/tools/rocketEngine/utils/numeric";
import { pressureRatioFromMach } from "@/tools/rocketEngine/utils/isentropic";

const G0 = 9.80665;

/* ============================================================ */
/*  Phase B additions                                            */
/* ============================================================ */

/** Detailed propellant presets including γ, Tc, M_molar, typical c*. */
export interface PropellantSpec {
  id: string;
  name: string;
  gamma: number;
  Tc: number;        // K
  M_molar: number;   // kg/kmol
  cStar: number;     // m/s
  PcTypical: number; // Pa
  notes?: string;
}

export const PROPELLANT_SPECS: PropellantSpec[] = [
  { id: "lox-rp1",   name: "LOX / RP-1",   gamma: 1.22, Tc: 3500, M_molar: 22.0, cStar: 1715, PcTypical: 9.7e6,  notes: "Merlin / F-1 / RD-180" },
  { id: "lox-lh2",   name: "LOX / LH₂",    gamma: 1.24, Tc: 3600, M_molar: 16.0, cStar: 2360, PcTypical: 20.0e6, notes: "RS-25 / RL10" },
  { id: "lox-ch4",   name: "LOX / CH₄",    gamma: 1.23, Tc: 3550, M_molar: 20.0, cStar: 1830, PcTypical: 30.0e6, notes: "Raptor / BE-4" },
  { id: "n2o4-mmh",  name: "N₂O₄ / MMH",   gamma: 1.24, Tc: 3400, M_molar: 21.5, cStar: 1720, PcTypical: 10.0e6, notes: "Hypergolic storable" },
  { id: "solid-apcp",name: "Solid APCP",   gamma: 1.18, Tc: 3300, M_molar: 30.0, cStar: 1580, PcTypical: 7.0e6,  notes: "Shuttle SRB-class" },
  { id: "hydrazine", name: "Hydrazine (mono)", gamma: 1.27, Tc: 1200, M_molar: 16.0, cStar: 1180, PcTypical: 2.0e6, notes: "ACS / RCS" },
];

/**
 * Approximate nozzle-type thrust-coefficient efficiency factor.
 * Bell (Rao 80%) ≈ 0.99 baseline; conical uses divergence loss
 * λ = (1 + cos α)/2; aerospike has altitude-compensation (η rises with εeff).
 */
export function nozzleTypeEfficiency(
  type: "bell" | "conical" | "aerospike",
  epsilon: number,
  halfAngleDeg = 15,
): number {
  if (type === "bell") return 0.99;
  if (type === "conical") {
    const a = (halfAngleDeg * Math.PI) / 180;
    return (1 + Math.cos(a)) / 2; // divergence efficiency
  }
  // aerospike: rises asymptotically with ε (altitude-compensation benefit)
  const e = Math.max(1, epsilon);
  return Math.min(0.985, 0.93 + 0.02 * Math.log10(e));
}

/**
 * Real-gas (equilibrium-flow) Isp uplift over frozen-flow assumption.
 * Engineering rule of thumb: equilibrium recombination gains 3–6 % over frozen
 * for hot bipropellants; we scale with Tc.
 */
export function equilibriumIspFactor(Tc: number): number {
  if (Tc <= 0) return 1;
  // 0% gain at Tc≤2000 K, ~5% gain at Tc=3700 K (typical LOX/LH2)
  const f = (Tc - 2000) / (3700 - 2000);
  return 1 + 0.05 * Math.max(0, Math.min(1, f));
}

/**
 * Estimate the number of visible shock-diamond cells from off-design ratio.
 * Empirical fit: count grows roughly with √(|ln(Pe/Pa)|) · ε^0.25.
 * Returns 0 when ideally expanded (Pe≈Pa).
 */
export function shockDiamondCount(Pe: number, Pa: number, epsilon: number): number {
  if (Pe <= 0 || Pa <= 0 || epsilon < 1) return 0;
  const lr = Math.abs(Math.log(Pe / Pa));
  if (lr < 0.05) return 0;
  const n = Math.round(2 + 2.5 * Math.sqrt(lr) * Math.pow(epsilon, 0.25));
  return Math.min(12, n);
}

/** Tsiolkovsky rocket equation. */
export function tsiolkovsky(Ve: number, m0: number, mf: number): number {
  if (Ve <= 0 || m0 <= 0 || mf <= 0 || mf >= m0) return 0;
  return Ve * Math.log(m0 / mf);
}

export interface Stage {
  name: string;
  isp: number;       // s
  m0: number;        // wet mass (kg)
  mf: number;        // dry mass (kg) — including payload + upper stages
}

export interface StageDeltaV {
  name: string;
  dv: number;
  ve: number;
  ratio: number;
}

/** Compute ΔV for each stage and total. */
export function multiStageDeltaV(stages: Stage[]): { stages: StageDeltaV[]; total: number } {
  const out: StageDeltaV[] = stages.map((s) => {
    const ve = s.isp * G0;
    return {
      name: s.name,
      ve,
      ratio: s.m0 / s.mf,
      dv: tsiolkovsky(ve, s.m0, s.mf),
    };
  });
  return { stages: out, total: out.reduce((a, b) => a + b.dv, 0) };
}

/**
 * Find expansion ratio ε that produces Pe = Pa for a given chamber pressure.
 * Uses bisection on the isentropic exit-Mach solver.
 */
export function optimumEpsilon(Pc: number, Pa: number, gamma: number): number | null {
  if (Pc <= 0 || Pa <= 0 || Pa >= Pc || gamma <= 1) return null;
  // Search ε in [1.5, 500] for Pe/Pc closest to Pa/Pc
  const target = Pa / Pc;
  let lo = 1.5,
    hi = 500;
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    const r = solveForMe(mid, gamma);
    if (!r.success) return null;
    const peOverPc = pressureRatioFromMach(r.value, gamma);
    if (peOverPc > target) lo = mid;
    else hi = mid;
    if (Math.abs(hi - lo) / lo < 1e-4) break;
  }
  return Math.sqrt(lo * hi);
}

/**
 * Bartz convective heat-flux correlation at the nozzle throat.
 * q" = C * (Pc^0.8 / D_t^0.2) [W/m²]   (simplified engineering form)
 * Returns heat flux in W/m² and wall-side heat transfer coefficient h_g.
 * This is an order-of-magnitude estimate (within 2× of real engines).
 */
export function bartzHeatFlux(params: {
  Pc: number;        // Pa
  Tc: number;        // K
  Dt: number;        // throat diameter (m)
  cStar: number;     // m/s
  gamma: number;
  cp?: number;       // J/(kg·K), default 2000 (combustion products)
  prandtl?: number;  // default 0.6
  Twall?: number;    // wall temperature (K), default 800
}): { qFlux: number; hg: number; Taw: number } {
  const { Pc, Tc, Dt, cStar, gamma } = params;
  const cp = params.cp ?? 2000;
  const Pr = params.prandtl ?? 0.6;
  const Tw = params.Twall ?? 800;

  // Adiabatic wall temperature (recovery)
  const rFactor = Math.cbrt(Pr); // turbulent recovery ≈ Pr^(1/3)
  // At throat, M=1 → T = Tc / (1 + (γ-1)/2) = Tc * 2/(γ+1)
  const Tstatic = (Tc * 2) / (gamma + 1);
  const Taw = Tstatic + rFactor * (Tc - Tstatic);

  // Bartz (simplified): h_g = 0.026 / D_t^0.2 * (μ^0.2 cp / Pr^0.6) * (Pc/cStar)^0.8 * σ
  // Use μ ≈ 8e-5 Pa·s for combustion gas
  const mu = 8e-5;
  const sigma = 1 / (
    Math.pow(0.5 * (Tw / Tc) * (1 + 0.5 * (gamma - 1)) + 0.5, 0.68) *
    Math.pow(1 + 0.5 * (gamma - 1), 0.12)
  );
  const hg =
    (0.026 / Math.pow(Dt, 0.2)) *
    (Math.pow(mu, 0.2) * cp / Math.pow(Pr, 0.6)) *
    Math.pow(Pc / cStar, 0.8) *
    sigma;

  const qFlux = hg * (Taw - Tw);
  return { qFlux, hg, Taw };
}

/**
 * Summerfield flow-separation criterion.
 * Separation occurs in overexpanded nozzles when Pe/Pa < ~0.35-0.40.
 */
export function summerfieldSeparation(Pe: number, Pa: number): {
  ratio: number;
  separated: boolean;
  margin: number;
  severity: "none" | "mild" | "severe";
} {
  const threshold = 0.4;
  const ratio = Pa > 0 ? Pe / Pa : Infinity;
  const separated = ratio < threshold;
  const margin = ratio - threshold;
  const severity = ratio < 0.25 ? "severe" : separated ? "mild" : "none";
  return { ratio, separated, margin, severity };
}

/**
 * Generate 80% bell nozzle profile (Rao approximation).
 * Returns array of {x, r} from throat (0,Rt) to exit (L, Re).
 */
export function nozzleProfile(Rt: number, epsilon: number, npoints = 60):
  Array<{ x: number; r: number; m?: number }> {
  const Re = Rt * Math.sqrt(epsilon);
  // Length of 80% bell ≈ 0.8 * (conical 15° length)
  const Lc = (Re - Rt) / Math.tan((15 * Math.PI) / 180);
  const L = 0.8 * Lc;

  const out: Array<{ x: number; r: number }> = [];
  // Throat arc: circular, radius 0.382*Rt downstream
  const rArc = 0.382 * Rt;
  // Initial parabolic angle ~30°, exit ~10° (typical Rao)
  const thetaN = (30 * Math.PI) / 180;

  // Throat circle segment 0 → thetaN
  const arcSteps = 8;
  for (let i = 0; i <= arcSteps; i++) {
    const a = (thetaN * i) / arcSteps;
    out.push({ x: rArc * Math.sin(a), r: Rt + rArc * (1 - Math.cos(a)) });
  }
  // Parabolic skirt: simple Bezier-like blend from (x1,r1) to (L, Re)
  const x1 = out[out.length - 1].x;
  const r1 = out[out.length - 1].r;
  for (let i = 1; i <= npoints; i++) {
    const t = i / npoints;
    // Quadratic blend with control point biased to maintain initial slope
    const cx = x1 + (L - x1) * 0.4;
    const cr = r1 + Math.tan(thetaN) * (cx - x1);
    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * L;
    const r = (1 - t) * (1 - t) * r1 + 2 * (1 - t) * t * cr + t * t * Re;
    out.push({ x, r });
  }
  return out;
}

/** Build CSV from an array of records. */
export function toCSV(rows: Array<Record<string, number | string>>): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const head = keys.join(",");
  const body = rows
    .map((r) =>
      keys
        .map((k) => {
          const v = r[k];
          if (typeof v === "number") return Number.isFinite(v) ? v.toString() : "";
          return `"${String(v).replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");
  return `${head}\n${body}`;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}