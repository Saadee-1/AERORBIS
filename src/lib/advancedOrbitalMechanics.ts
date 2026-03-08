/**
 * Advanced Orbital Mechanics Library
 * All physics formulas are FROZEN — do not refactor or optimize.
 * 
 * Topics:
 * 1. Maneuver Types: Bi-elliptic, plane change, combined, phasing
 * 2. J2 Perturbations: nodal regression, apsidal precession, SSO
 * 3. Energy & Momentum: vis-viva, specific energy, angular momentum, C3
 * 4. Lambert Problem & Interplanetary basics
 */

// ─── Constants ──────────────────────────────────────────────────────────────
export const GM_EARTH = 398600.4418;       // km³/s²
export const R_EARTH = 6371.0;             // km
export const J2_EARTH = 1.08263e-3;        // Earth J2 oblateness coefficient
export const GM_SUN = 1.32712440018e11;    // km³/s²
export const AU_KM = 1.496e8;             // 1 AU in km

// Planetary data (semi-major axis in AU, GM in km³/s²)
export const PLANETS: Record<string, { name: string; a_AU: number; gm: number; radius: number }> = {
  mercury: { name: 'Mercury', a_AU: 0.387, gm: 22032, radius: 2440 },
  venus:   { name: 'Venus',   a_AU: 0.723, gm: 324859, radius: 6052 },
  earth:   { name: 'Earth',   a_AU: 1.000, gm: GM_EARTH, radius: R_EARTH },
  mars:    { name: 'Mars',    a_AU: 1.524, gm: 42828, radius: 3390 },
  jupiter: { name: 'Jupiter', a_AU: 5.203, gm: 126686534, radius: 69911 },
  saturn:  { name: 'Saturn',  a_AU: 9.537, gm: 37931187, radius: 58232 },
};

// ─── Step-by-step derivation types ──────────────────────────────────────────
export interface DerivationStep {
  label: string;       // e.g. "Vis-viva equation"
  equation: string;    // LaTeX-like string: "v = √(μ(2/r - 1/a))"
  substitution: string; // Values plugged in
  result: string;      // Computed value with units
}

export interface AdvancedResult {
  title: string;
  value: number;
  unit: string;
  steps: DerivationStep[];
  interpretation: string; // Real-world paragraph
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. MANEUVER TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bi-elliptic transfer between two circular orbits via an intermediate apoapsis
 * More efficient than Hohmann when r_final/r_initial > 11.94
 */
export function biEllipticTransfer(
  r1: number, r2: number, r_intermediate: number, mu: number
): AdvancedResult[] {
  // Transfer orbit 1: from r1 to r_intermediate
  const a_t1 = (r1 + r_intermediate) / 2;
  const v1_circular = Math.sqrt(mu / r1);
  const v1_transfer = Math.sqrt(mu * (2 / r1 - 1 / a_t1));
  const dv1 = Math.abs(v1_transfer - v1_circular);

  // At r_intermediate
  const v_intermediate_t1 = Math.sqrt(mu * (2 / r_intermediate - 1 / a_t1));
  const a_t2 = (r_intermediate + r2) / 2;
  const v_intermediate_t2 = Math.sqrt(mu * (2 / r_intermediate - 1 / a_t2));
  const dv2 = Math.abs(v_intermediate_t2 - v_intermediate_t1);

  // At r2
  const v2_transfer = Math.sqrt(mu * (2 / r2 - 1 / a_t2));
  const v2_circular = Math.sqrt(mu / r2);
  const dv3 = Math.abs(v2_circular - v2_transfer);

  const total_dv = dv1 + dv2 + dv3;

  // Transfer times
  const T_t1 = Math.PI * Math.sqrt(Math.pow(a_t1, 3) / mu);
  const T_t2 = Math.PI * Math.sqrt(Math.pow(a_t2, 3) / mu);
  const totalTime = (T_t1 + T_t2) / 60; // minutes

  // Hohmann comparison
  const a_h = (r1 + r2) / 2;
  const v1_h = Math.sqrt(mu * (2 / r1 - 1 / a_h));
  const v2_h = Math.sqrt(mu * (2 / r2 - 1 / a_h));
  const dv_hohmann = Math.abs(v1_h - v1_circular) + Math.abs(v2_circular - v2_h);

  return [
    {
      title: 'ΔV₁ (First Burn — Departure)',
      value: dv1,
      unit: 'km/s',
      steps: [
        { label: 'Circular velocity at r₁', equation: 'v₁ = √(μ/r₁)', substitution: `v₁ = √(${mu}/${r1.toFixed(1)})`, result: `${v1_circular.toFixed(4)} km/s` },
        { label: 'Transfer orbit 1 semi-major axis', equation: 'a_t1 = (r₁ + r_b) / 2', substitution: `a_t1 = (${r1.toFixed(1)} + ${r_intermediate.toFixed(1)}) / 2`, result: `${a_t1.toFixed(2)} km` },
        { label: 'Velocity at r₁ on transfer 1 (vis-viva)', equation: 'v = √(μ(2/r₁ - 1/a_t1))', substitution: `v = √(${mu}(2/${r1.toFixed(1)} - 1/${a_t1.toFixed(2)}))`, result: `${v1_transfer.toFixed(4)} km/s` },
        { label: 'First burn ΔV₁', equation: 'ΔV₁ = |v_transfer - v_circular|', substitution: `ΔV₁ = |${v1_transfer.toFixed(4)} - ${v1_circular.toFixed(4)}|`, result: `${dv1.toFixed(4)} km/s` },
      ],
      interpretation: `The first burn raises the apoapsis to ${r_intermediate.toFixed(0)} km. This is a prograde burn at periapsis.`,
    },
    {
      title: 'ΔV₂ (Second Burn — At Intermediate Apoapsis)',
      value: dv2,
      unit: 'km/s',
      steps: [
        { label: 'Velocity at r_b on transfer 1', equation: 'v_b1 = √(μ(2/r_b - 1/a_t1))', substitution: `v_b1 = √(${mu}(2/${r_intermediate.toFixed(1)} - 1/${a_t1.toFixed(2)}))`, result: `${v_intermediate_t1.toFixed(4)} km/s` },
        { label: 'Transfer orbit 2 semi-major axis', equation: 'a_t2 = (r_b + r₂) / 2', substitution: `a_t2 = (${r_intermediate.toFixed(1)} + ${r2.toFixed(1)}) / 2`, result: `${a_t2.toFixed(2)} km` },
        { label: 'Velocity at r_b on transfer 2', equation: 'v_b2 = √(μ(2/r_b - 1/a_t2))', substitution: `v_b2 = √(${mu}(2/${r_intermediate.toFixed(1)} - 1/${a_t2.toFixed(2)}))`, result: `${v_intermediate_t2.toFixed(4)} km/s` },
        { label: 'Second burn ΔV₂', equation: 'ΔV₂ = |v_b2 - v_b1|', substitution: `ΔV₂ = |${v_intermediate_t2.toFixed(4)} - ${v_intermediate_t1.toFixed(4)}|`, result: `${dv2.toFixed(4)} km/s` },
      ],
      interpretation: `The second burn at the intermediate apoapsis adjusts the periapsis to target orbit radius. This burn occurs at the slowest point of the trajectory.`,
    },
    {
      title: 'ΔV₃ (Third Burn — Circularization)',
      value: dv3,
      unit: 'km/s',
      steps: [
        { label: 'Arrival velocity at r₂', equation: 'v_arr = √(μ(2/r₂ - 1/a_t2))', substitution: `v_arr = √(${mu}(2/${r2.toFixed(1)} - 1/${a_t2.toFixed(2)}))`, result: `${v2_transfer.toFixed(4)} km/s` },
        { label: 'Circular velocity at r₂', equation: 'v₂ = √(μ/r₂)', substitution: `v₂ = √(${mu}/${r2.toFixed(1)})`, result: `${v2_circular.toFixed(4)} km/s` },
        { label: 'Third burn ΔV₃', equation: 'ΔV₃ = |v₂ - v_arr|', substitution: `ΔV₃ = |${v2_circular.toFixed(4)} - ${v2_transfer.toFixed(4)}|`, result: `${dv3.toFixed(4)} km/s` },
      ],
      interpretation: `Final circularization burn at the target orbit. This retrograde or prograde burn matches the circular velocity.`,
    },
    {
      title: 'Total ΔV & Comparison',
      value: total_dv,
      unit: 'km/s',
      steps: [
        { label: 'Total bi-elliptic ΔV', equation: 'ΔV_total = ΔV₁ + ΔV₂ + ΔV₃', substitution: `ΔV = ${dv1.toFixed(4)} + ${dv2.toFixed(4)} + ${dv3.toFixed(4)}`, result: `${total_dv.toFixed(4)} km/s` },
        { label: 'Hohmann transfer ΔV (comparison)', equation: 'ΔV_H = |v₁_t - v₁| + |v₂ - v₂_t|', substitution: `ΔV_H = ${dv_hohmann.toFixed(4)}`, result: `${dv_hohmann.toFixed(4)} km/s` },
        { label: 'ΔV savings', equation: 'Savings = ΔV_H - ΔV_bi', substitution: `${dv_hohmann.toFixed(4)} - ${total_dv.toFixed(4)}`, result: `${(dv_hohmann - total_dv).toFixed(4)} km/s (${((1 - total_dv / dv_hohmann) * 100).toFixed(1)}%)` },
        { label: 'Total transfer time', equation: 'T = π√(a_t1³/μ) + π√(a_t2³/μ)', substitution: `T = ${T_t1.toFixed(0)} + ${T_t2.toFixed(0)} s`, result: `${totalTime.toFixed(1)} min` },
      ],
      interpretation: `Bi-elliptic transfer ${total_dv < dv_hohmann ? 'saves' : 'costs more than'} Hohmann by ${Math.abs(dv_hohmann - total_dv).toFixed(4)} km/s. Bi-elliptic is optimal when r₂/r₁ > 11.94. The tradeoff is significantly longer transfer time (${totalTime.toFixed(1)} min). Ratio r₂/r₁ = ${(r2/r1).toFixed(2)}.`,
    },
  ];
}

/**
 * Simple plane change (inclination change) at constant altitude
 */
export function planeChangeManeuver(
  r: number, inclChange_deg: number, mu: number
): AdvancedResult {
  const v = Math.sqrt(mu / r);
  const di_rad = inclChange_deg * Math.PI / 180;
  const dv = 2 * v * Math.sin(di_rad / 2);

  return {
    title: 'Pure Plane Change ΔV',
    value: dv,
    unit: 'km/s',
    steps: [
      { label: 'Orbital velocity', equation: 'v = √(μ/r)', substitution: `v = √(${mu}/${r.toFixed(1)})`, result: `${v.toFixed(4)} km/s` },
      { label: 'Inclination change', equation: 'Δi = ' + inclChange_deg + '°', substitution: `Δi = ${di_rad.toFixed(4)} rad`, result: `${inclChange_deg}°` },
      { label: 'Plane change ΔV', equation: 'ΔV = 2v·sin(Δi/2)', substitution: `ΔV = 2 × ${v.toFixed(4)} × sin(${(di_rad / 2).toFixed(4)})`, result: `${dv.toFixed(4)} km/s` },
    ],
    interpretation: `A ${inclChange_deg}° plane change at ${(r - R_EARTH).toFixed(0)} km altitude requires ${dv.toFixed(4)} km/s. Plane changes are extremely expensive — doing them at the highest possible altitude (where v is lowest) significantly reduces ΔV. A 60° plane change costs as much as the orbital velocity itself!`,
  };
}

/**
 * Combined plane change + altitude change (optimal single-burn)
 */
export function combinedManeuver(
  r1: number, r2: number, inclChange_deg: number, mu: number
): AdvancedResult {
  const v1 = Math.sqrt(mu / r1);
  const a_t = (r1 + r2) / 2;
  const v1t = Math.sqrt(mu * (2 / r1 - 1 / a_t));
  const v2t = Math.sqrt(mu * (2 / r2 - 1 / a_t));
  const v2 = Math.sqrt(mu / r2);
  const di_rad = inclChange_deg * Math.PI / 180;

  // Combined maneuver at departure
  const dv1 = Math.sqrt(v1 * v1 + v1t * v1t - 2 * v1 * v1t * Math.cos(di_rad));
  const dv2 = Math.abs(v2 - v2t);
  const total = dv1 + dv2;

  // Separate maneuvers comparison
  const hohmann_dv = Math.abs(v1t - v1) + Math.abs(v2 - v2t);
  const plane_dv = 2 * v1 * Math.sin(di_rad / 2);
  const separate_total = hohmann_dv + plane_dv;

  return {
    title: 'Combined Maneuver (Altitude + Plane Change)',
    value: total,
    unit: 'km/s',
    steps: [
      { label: 'Departure velocity (circular)', equation: 'v₁ = √(μ/r₁)', substitution: `v₁ = √(${mu}/${r1.toFixed(1)})`, result: `${v1.toFixed(4)} km/s` },
      { label: 'Transfer orbit velocity at r₁', equation: 'v₁ₜ = √(μ(2/r₁ - 1/aₜ))', substitution: `v₁ₜ = √(${mu}(2/${r1.toFixed(1)} - 1/${a_t.toFixed(2)}))`, result: `${v1t.toFixed(4)} km/s` },
      { label: 'Combined burn (cosine rule)', equation: 'ΔV₁ = √(v₁² + v₁ₜ² - 2v₁v₁ₜcos(Δi))', substitution: `ΔV₁ = √(${v1.toFixed(4)}² + ${v1t.toFixed(4)}² - 2×${v1.toFixed(4)}×${v1t.toFixed(4)}×cos(${di_rad.toFixed(4)}))`, result: `${dv1.toFixed(4)} km/s` },
      { label: 'Circularization at r₂', equation: 'ΔV₂ = |v₂ - v₂ₜ|', substitution: `ΔV₂ = |${v2.toFixed(4)} - ${v2t.toFixed(4)}|`, result: `${dv2.toFixed(4)} km/s` },
      { label: 'Total combined ΔV', equation: 'ΔV = ΔV₁ + ΔV₂', substitution: `${dv1.toFixed(4)} + ${dv2.toFixed(4)}`, result: `${total.toFixed(4)} km/s` },
      { label: 'Separate maneuvers (comparison)', equation: 'ΔV_sep = ΔV_Hohmann + ΔV_plane', substitution: `${hohmann_dv.toFixed(4)} + ${plane_dv.toFixed(4)}`, result: `${separate_total.toFixed(4)} km/s` },
    ],
    interpretation: `Combining altitude and plane change into a single burn saves ${(separate_total - total).toFixed(4)} km/s (${((1 - total / separate_total) * 100).toFixed(1)}% savings) compared to doing them separately. This is because the cosine law vector addition is always more efficient than separate scalar additions. Always combine maneuvers when possible!`,
  };
}

/**
 * Phasing orbit maneuver (rendezvous with target at same altitude)
 */
export function phasingOrbit(
  r: number, phaseAngle_deg: number, k: number, mu: number
): AdvancedResult {
  const v_circ = Math.sqrt(mu / r);
  const T_target = 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / mu);
  const phi_rad = phaseAngle_deg * Math.PI / 180;
  
  // Phasing orbit period
  const T_phase = T_target * (1 - phi_rad / (2 * Math.PI * k));
  const a_phase = Math.pow((mu * T_phase * T_phase) / (4 * Math.PI * Math.PI), 1 / 3);
  
  const v_phase = Math.sqrt(mu * (2 / r - 1 / a_phase));
  const dv = Math.abs(v_phase - v_circ);
  const total_dv = 2 * dv; // inject + re-circularize

  return {
    title: `Phasing Orbit (${k} rev${k > 1 ? 's' : ''})`,
    value: total_dv,
    unit: 'km/s',
    steps: [
      { label: 'Target orbit period', equation: 'T = 2π√(r³/μ)', substitution: `T = 2π√(${r.toFixed(1)}³/${mu})`, result: `${T_target.toFixed(1)} s (${(T_target / 60).toFixed(1)} min)` },
      { label: 'Phase angle', equation: `φ = ${phaseAngle_deg}°`, substitution: `φ = ${phi_rad.toFixed(4)} rad`, result: `${phaseAngle_deg}°` },
      { label: 'Phasing orbit period', equation: 'T_ph = T(1 - φ/(2πk))', substitution: `T_ph = ${T_target.toFixed(1)} × (1 - ${phi_rad.toFixed(4)}/(2π×${k}))`, result: `${T_phase.toFixed(1)} s (${(T_phase / 60).toFixed(1)} min)` },
      { label: 'Phasing orbit semi-major axis', equation: 'a_ph = (μT_ph²/4π²)^(1/3)', substitution: `a_ph = (${mu}×${T_phase.toFixed(1)}²/4π²)^(1/3)`, result: `${a_phase.toFixed(2)} km` },
      { label: 'ΔV per burn', equation: 'ΔV = |√(μ(2/r - 1/a_ph)) - √(μ/r)|', substitution: `ΔV = |${v_phase.toFixed(4)} - ${v_circ.toFixed(4)}|`, result: `${dv.toFixed(4)} km/s` },
      { label: 'Total ΔV (2 burns)', equation: 'ΔV_total = 2 × ΔV', substitution: `2 × ${dv.toFixed(4)}`, result: `${total_dv.toFixed(4)} km/s` },
    ],
    interpretation: `To close a ${phaseAngle_deg}° phase angle in ${k} revolution(s), the spacecraft enters a phasing orbit with a = ${a_phase.toFixed(0)} km (${a_phase > r ? 'higher' : 'lower'} than target). After ${k} revolution(s) in the phasing orbit, a second burn re-circularizes. More revolutions (higher k) require less ΔV but more time.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. J2 PERTURBATION EFFECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * J2 perturbation effects: nodal regression and apsidal precession
 */
export function j2Perturbations(
  a: number, e: number, i_deg: number, R_body: number = R_EARTH, J2: number = J2_EARTH, mu: number = GM_EARTH
): AdvancedResult[] {
  const i_rad = i_deg * Math.PI / 180;
  const n = Math.sqrt(mu / Math.pow(a, 3)); // mean motion (rad/s)
  const p = a * (1 - e * e); // semi-latus rectum

  // Nodal regression rate (Ω̇)
  const Omega_dot = -(3 / 2) * n * J2 * Math.pow(R_body / p, 2) * Math.cos(i_rad);
  const Omega_dot_deg_day = Omega_dot * (180 / Math.PI) * 86400;

  // Apsidal precession rate (ω̇)
  const omega_dot = (3 / 2) * n * J2 * Math.pow(R_body / p, 2) * (2 - (5 / 2) * Math.sin(i_rad) * Math.sin(i_rad));
  const omega_dot_deg_day = omega_dot * (180 / Math.PI) * 86400;

  // Critical inclination (where ω̇ = 0)
  const i_critical = Math.asin(Math.sqrt(2 / 5)) * (180 / Math.PI); // ≈ 63.43°

  // Sun-synchronous inclination for this orbit
  const Omega_dot_SSO = (360 / 365.2422) * (Math.PI / 180) / 86400; // rad/s needed
  const cos_i_SSO = -Omega_dot_SSO / ((3 / 2) * n * J2 * Math.pow(R_body / p, 2));
  const i_SSO = Math.abs(cos_i_SSO) <= 1 ? Math.acos(cos_i_SSO) * (180 / Math.PI) : NaN;

  return [
    {
      title: 'RAAN Regression Rate (Ω̇)',
      value: Omega_dot_deg_day,
      unit: '°/day',
      steps: [
        { label: 'Mean motion', equation: 'n = √(μ/a³)', substitution: `n = √(${mu}/${a.toFixed(1)}³)`, result: `${n.toExponential(4)} rad/s` },
        { label: 'Semi-latus rectum', equation: 'p = a(1-e²)', substitution: `p = ${a.toFixed(1)}(1-${e}²)`, result: `${p.toFixed(2)} km` },
        { label: 'RAAN regression', equation: 'Ω̇ = -(3/2)n·J₂·(R/p)²·cos(i)', substitution: `Ω̇ = -(3/2)×${n.toExponential(3)}×${J2}×(${R_body}/${p.toFixed(1)})²×cos(${i_rad.toFixed(4)})`, result: `${Omega_dot.toExponential(4)} rad/s` },
        { label: 'Daily rate', equation: 'Ω̇ = Ω̇_rad × (180/π) × 86400', substitution: `${Omega_dot.toExponential(4)} × 57.296 × 86400`, result: `${Omega_dot_deg_day.toFixed(4)} °/day` },
      ],
      interpretation: `The orbital plane precesses ${Omega_dot_deg_day > 0 ? 'eastward' : 'westward'} at ${Math.abs(Omega_dot_deg_day).toFixed(4)}°/day due to Earth's equatorial bulge. ${Math.abs(i_deg) < 90 ? 'Prograde orbits regress westward' : 'Retrograde orbits precess eastward'}. This is exploited by sun-synchronous orbits to maintain constant sun angle.`,
    },
    {
      title: 'Argument of Perigee Precession (ω̇)',
      value: omega_dot_deg_day,
      unit: '°/day',
      steps: [
        { label: 'Apsidal precession', equation: 'ω̇ = (3/2)n·J₂·(R/p)²·(2 - 5/2·sin²i)', substitution: `ω̇ = (3/2)×${n.toExponential(3)}×${J2}×(${R_body}/${p.toFixed(1)})²×(2 - 2.5×sin²(${i_rad.toFixed(4)}))`, result: `${omega_dot.toExponential(4)} rad/s` },
        { label: 'Daily rate', equation: 'ω̇_day = ω̇ × (180/π) × 86400', substitution: `${omega_dot.toExponential(4)} × 57.296 × 86400`, result: `${omega_dot_deg_day.toFixed(4)} °/day` },
        { label: 'Critical inclination', equation: 'i_c = arcsin(√(2/5))', substitution: 'sin²(i_c) = 0.4', result: `${i_critical.toFixed(2)}° (where ω̇ = 0)` },
      ],
      interpretation: `The argument of periapsis ${omega_dot_deg_day > 0 ? 'advances' : 'regresses'} at ${Math.abs(omega_dot_deg_day).toFixed(4)}°/day. At the critical inclination of ${i_critical.toFixed(2)}° (or ${(180 - i_critical).toFixed(2)}°), apsidal precession is zero — this is why Molniya orbits use i ≈ 63.4°, keeping their apogee fixed over a desired hemisphere.`,
    },
    {
      title: 'Sun-Synchronous Inclination',
      value: isNaN(i_SSO) ? -1 : i_SSO,
      unit: '°',
      steps: [
        { label: 'Required Ω̇ for SSO', equation: 'Ω̇_SSO = 360°/365.25 days', substitution: `Ω̇_SSO = 0.9856°/day`, result: `${(Omega_dot_SSO * 180 / Math.PI * 86400).toFixed(6)} °/day` },
        { label: 'Solve for inclination', equation: 'cos(i) = -Ω̇_SSO / [(3/2)n·J₂·(R/p)²]', substitution: `cos(i) = ${cos_i_SSO.toFixed(6)}`, result: isNaN(i_SSO) ? 'No SSO possible at this altitude' : `${i_SSO.toFixed(2)}°` },
      ],
      interpretation: isNaN(i_SSO) 
        ? `No sun-synchronous orbit exists at this altitude. The required nodal regression rate cannot be achieved.`
        : `For this orbit geometry (a=${a.toFixed(0)} km, e=${e}), a sun-synchronous orbit requires i = ${i_SSO.toFixed(2)}°. This ensures the orbital plane precesses exactly 360°/year, maintaining a constant angle with the Sun — essential for Earth observation missions like Landsat and Sentinel.`,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ENERGY & MOMENTUM ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete energy and momentum analysis for an orbit
 */
export function energyMomentumAnalysis(
  a: number, e: number, mu: number, r_current?: number
): AdvancedResult[] {
  const r = r_current ?? a * (1 - e); // default to periapsis
  const v = Math.sqrt(mu * (2 / r - 1 / a)); // vis-viva

  // Specific orbital energy
  const epsilon = -mu / (2 * a);

  // Specific angular momentum
  const p = a * (1 - e * e);
  const h = Math.sqrt(mu * p);

  // C3 (characteristic energy) — for hyperbolic context
  const C3 = -mu / a; // = 2ε = v_inf² for hyperbolic

  // Escape velocity at current r
  const v_escape = Math.sqrt(2 * mu / r);

  // Velocity components at r
  const v_r = (mu / h) * e * Math.sin(0); // radial (0 at periapsis)
  const v_theta = h / r; // tangential

  // Flight path angle
  const gamma = Math.atan2(v_r, v_theta) * (180 / Math.PI);

  return [
    {
      title: 'Vis-Viva Velocity',
      value: v,
      unit: 'km/s',
      steps: [
        { label: 'Vis-viva equation', equation: 'v = √(μ(2/r - 1/a))', substitution: `v = √(${mu}(2/${r.toFixed(1)} - 1/${a.toFixed(1)}))`, result: `${v.toFixed(4)} km/s` },
        { label: 'Escape velocity at r', equation: 'v_esc = √(2μ/r)', substitution: `v_esc = √(2×${mu}/${r.toFixed(1)})`, result: `${v_escape.toFixed(4)} km/s` },
        { label: 'Velocity ratio v/v_esc', equation: 'v/v_esc', substitution: `${v.toFixed(4)}/${v_escape.toFixed(4)}`, result: `${(v / v_escape).toFixed(4)} (${v > v_escape ? '> 1: HYPERBOLIC' : '< 1: BOUND'})` },
      ],
      interpretation: `At r = ${r.toFixed(0)} km, the spacecraft velocity is ${v.toFixed(4)} km/s. The local escape velocity is ${v_escape.toFixed(4)} km/s. ${v < v_escape ? 'The orbit is bound (elliptical).' : 'The orbit is unbound (hyperbolic escape).'} The vis-viva equation relates velocity to position for any Keplerian orbit — it is the energy conservation equation of orbital mechanics.`,
    },
    {
      title: 'Specific Orbital Energy (ε)',
      value: epsilon,
      unit: 'km²/s²',
      steps: [
        { label: 'Specific energy', equation: 'ε = -μ/(2a)', substitution: `ε = -${mu}/(2×${a.toFixed(1)})`, result: `${epsilon.toFixed(4)} km²/s²` },
        { label: 'Kinetic energy at r', equation: 'KE = v²/2', substitution: `KE = ${v.toFixed(4)}²/2`, result: `${(v * v / 2).toFixed(4)} km²/s²` },
        { label: 'Potential energy at r', equation: 'PE = -μ/r', substitution: `PE = -${mu}/${r.toFixed(1)}`, result: `${(-mu / r).toFixed(4)} km²/s²` },
        { label: 'Verify: ε = KE + PE', equation: 'ε = v²/2 - μ/r', substitution: `ε = ${(v * v / 2).toFixed(4)} + ${(-mu / r).toFixed(4)}`, result: `${(v * v / 2 - mu / r).toFixed(4)} km²/s² ✓` },
      ],
      interpretation: `The specific orbital energy ε = ${epsilon.toFixed(4)} km²/s² is ${epsilon < 0 ? 'negative (bound orbit)' : epsilon > 0 ? 'positive (hyperbolic)' : 'zero (parabolic)'}. This quantity is conserved everywhere in the orbit. For elliptical orbits, ε depends only on the semi-major axis, NOT on eccentricity — two orbits with the same 'a' have the same energy regardless of shape.`,
    },
    {
      title: 'Specific Angular Momentum (h)',
      value: h,
      unit: 'km²/s',
      steps: [
        { label: 'Semi-latus rectum', equation: 'p = a(1-e²)', substitution: `p = ${a.toFixed(1)}×(1-${e}²)`, result: `${p.toFixed(2)} km` },
        { label: 'Angular momentum', equation: 'h = √(μp)', substitution: `h = √(${mu}×${p.toFixed(2)})`, result: `${h.toFixed(2)} km²/s` },
        { label: 'Tangential velocity at r', equation: 'v_⊥ = h/r', substitution: `v_⊥ = ${h.toFixed(2)}/${r.toFixed(1)}`, result: `${v_theta.toFixed(4)} km/s` },
      ],
      interpretation: `The specific angular momentum h = ${h.toFixed(2)} km²/s is conserved throughout the orbit. It equals r × v_⊥ at every point. At periapsis and apoapsis the velocity is purely tangential, so h = r_p × v_p = r_a × v_a. Angular momentum conservation is why spacecraft speed up at periapsis and slow down at apoapsis.`,
    },
    {
      title: 'Characteristic Energy (C₃)',
      value: C3,
      unit: 'km²/s²',
      steps: [
        { label: 'C₃ definition', equation: 'C₃ = -μ/a = 2ε', substitution: `C₃ = -${mu}/${a.toFixed(1)}`, result: `${C3.toFixed(4)} km²/s²` },
        { label: 'Hyperbolic excess velocity', equation: 'v∞ = √(C₃) [if C₃ > 0]', substitution: C3 > 0 ? `v∞ = √(${C3.toFixed(4)})` : 'N/A (bound orbit)', result: C3 > 0 ? `${Math.sqrt(C3).toFixed(4)} km/s` : 'N/A — orbit is bound' },
      ],
      interpretation: C3 < 0 
        ? `C₃ = ${C3.toFixed(4)} km²/s² is negative, confirming a bound (elliptical) orbit. For interplanetary missions, C₃ must be positive (v > v_escape). The launch vehicle must provide enough ΔV to achieve positive C₃ for departure.`
        : `C₃ = ${C3.toFixed(4)} km²/s². The hyperbolic excess velocity v∞ = ${Math.sqrt(C3).toFixed(4)} km/s is the velocity the spacecraft retains at infinity after escaping. This is the key parameter for interplanetary trajectory design.`,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LAMBERT PROBLEM & INTERPLANETARY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Simplified Lambert solver using the universal variable method
 * Solves for the transfer orbit between two position vectors in a given time
 */
export function solveLambert(
  r1_mag: number, r2_mag: number, dtheta_deg: number, tof_seconds: number, mu: number
): AdvancedResult {
  const dtheta = dtheta_deg * Math.PI / 180;

  // Geometry
  const cos_dtheta = Math.cos(dtheta);
  const A = Math.sqrt(r1_mag * r2_mag * (1 + cos_dtheta));

  if (Math.abs(A) < 1e-10) {
    return {
      title: 'Lambert Solution',
      value: 0,
      unit: 'km/s',
      steps: [{ label: 'Error', equation: 'A ≈ 0', substitution: 'Collinear positions (180°)', result: 'No solution' }],
      interpretation: 'The transfer angle is 180°, which is a degenerate case requiring an out-of-plane maneuver. Try a slightly different angle.',
    };
  }

  // Iterative solution using Stumpff functions
  let z = 0; // initial guess (parabolic)
  const maxIter = 50;
  const tol = 1e-8;

  function stumpffC(z: number): number {
    if (z > 1e-6) return (1 - Math.cos(Math.sqrt(z))) / z;
    if (z < -1e-6) return (1 - Math.cosh(Math.sqrt(-z))) / z;
    return 1 / 2;
  }

  function stumpffS(z: number): number {
    if (z > 1e-6) { const sq = Math.sqrt(z); return (sq - Math.sin(sq)) / Math.pow(z, 1.5); }
    if (z < -1e-6) { const sq = Math.sqrt(-z); return (Math.sinh(sq) - sq) / Math.pow(-z, 1.5); }
    return 1 / 6;
  }

  let converged = false;
  for (let iter = 0; iter < maxIter; iter++) {
    const C_z = stumpffC(z);
    const S_z = stumpffS(z);

    const y = r1_mag + r2_mag + A * (z * S_z - 1) / Math.sqrt(C_z);
    if (y < 0) { z += 0.5; continue; }

    const x = Math.sqrt(y / C_z);
    const t_z = (x * x * x * S_z + A * Math.sqrt(y)) / Math.sqrt(mu);

    // Newton-Raphson update
    const dt_dz_numer = (x * x * x * (S_z - 3 * S_z * C_z + 2) / (2 * C_z)) + (A / 8) * (3 * S_z * Math.sqrt(y) / C_z + A / x);
    const dt_dz = dt_dz_numer / Math.sqrt(mu);

    if (Math.abs(dt_dz) < 1e-20) break;
    const z_new = z + (tof_seconds - t_z) / dt_dz;

    if (Math.abs(z_new - z) < tol) { z = z_new; converged = true; break; }
    z = z_new;
  }

  // Compute velocities
  const C_z = stumpffC(z);
  const S_z = stumpffS(z);
  const y = r1_mag + r2_mag + A * (z * S_z - 1) / Math.sqrt(C_z);

  const f = 1 - y / r1_mag;
  const g_dot = 1 - y / r2_mag;
  const g = A * Math.sqrt(y / mu);

  const v1_mag = Math.sqrt(r1_mag * r1_mag * (1 - f) * (1 - f) + r1_mag * r2_mag * (1 - f) * (g_dot - 1) + r2_mag * r2_mag * (g_dot - 1) * (g_dot - 1)) / Math.abs(g);

  // Semi-major axis of transfer
  const a_transfer = mu * tof_seconds * tof_seconds / (16 * y * y * y * S_z * S_z);

  return {
    title: 'Lambert Problem Solution',
    value: v1_mag,
    unit: 'km/s',
    steps: [
      { label: 'Position magnitudes', equation: '|r₁|, |r₂|', substitution: `r₁ = ${r1_mag.toFixed(1)} km, r₂ = ${r2_mag.toFixed(1)} km`, result: `Δθ = ${dtheta_deg}°` },
      { label: 'Transfer parameter A', equation: 'A = √(r₁·r₂·(1+cos(Δθ)))', substitution: `A = √(${r1_mag.toFixed(1)}×${r2_mag.toFixed(1)}×(1+cos(${dtheta_deg}°)))`, result: `${A.toFixed(2)} km` },
      { label: 'Universal variable z', equation: 'Iterative Newton-Raphson', substitution: `${maxIter} max iterations`, result: `z = ${z.toFixed(6)} ${converged ? '(converged)' : '(max iter)'}` },
      { label: 'Lagrange coefficients', equation: 'f = 1-y/r₁, g = A√(y/μ)', substitution: `f = ${f.toFixed(6)}, g = ${g.toFixed(6)}`, result: `ġ = ${g_dot.toFixed(6)}` },
      { label: 'Departure velocity', equation: '|v₁| from Lagrange coefficients', substitution: 'v₁ = (r₂ - f·r₁) / g', result: `${v1_mag.toFixed(4)} km/s` },
      { label: 'Time of flight', equation: 'TOF = input', substitution: `TOF = ${tof_seconds} s`, result: `${(tof_seconds / 3600).toFixed(2)} hours` },
    ],
    interpretation: `The Lambert solution gives the transfer orbit connecting two positions (r₁=${r1_mag.toFixed(0)} km, r₂=${r2_mag.toFixed(0)} km) with Δθ=${dtheta_deg}° in ${(tof_seconds / 3600).toFixed(2)} hours. The required departure velocity is ${v1_mag.toFixed(4)} km/s. ${converged ? 'Solution converged successfully.' : 'Solution may not have fully converged — try adjusting inputs.'} This is the fundamental problem for interplanetary trajectory design, rendezvous planning, and orbit determination.`,
  };
}

/**
 * Interplanetary Hohmann transfer between two planets
 */
export function interplanetaryHohmann(
  departPlanet: string, arrivePlanet: string
): AdvancedResult[] {
  const p1 = PLANETS[departPlanet];
  const p2 = PLANETS[arrivePlanet];
  if (!p1 || !p2) return [];

  const r1 = p1.a_AU * AU_KM;
  const r2 = p2.a_AU * AU_KM;
  const mu = GM_SUN;

  const a_t = (r1 + r2) / 2;
  const v1_planet = Math.sqrt(mu / r1);
  const v1_transfer = Math.sqrt(mu * (2 / r1 - 1 / a_t));
  const v_inf_depart = Math.abs(v1_transfer - v1_planet);

  const v2_planet = Math.sqrt(mu / r2);
  const v2_transfer = Math.sqrt(mu * (2 / r2 - 1 / a_t));
  const v_inf_arrive = Math.abs(v2_planet - v2_transfer);

  const C3_depart = v_inf_depart * v_inf_depart;
  const C3_arrive = v_inf_arrive * v_inf_arrive;

  const T_transfer = Math.PI * Math.sqrt(Math.pow(a_t, 3) / mu);
  const T_days = T_transfer / 86400;

  // Phase angle
  const n2 = Math.sqrt(mu / Math.pow(r2, 3)); // target planet mean motion
  const phase_angle = Math.PI - n2 * T_transfer;
  const phase_deg = phase_angle * (180 / Math.PI);

  // Synodic period
  const T1 = 2 * Math.PI * Math.sqrt(Math.pow(r1, 3) / mu);
  const T2 = 2 * Math.PI * Math.sqrt(Math.pow(r2, 3) / mu);
  const T_synodic = Math.abs(1 / (1 / T1 - 1 / T2));

  return [
    {
      title: `Departure from ${p1.name}`,
      value: v_inf_depart,
      unit: 'km/s',
      steps: [
        { label: `${p1.name} orbital velocity`, equation: 'v₁ = √(μ_☉/r₁)', substitution: `v₁ = √(${mu}/${r1.toExponential(4)})`, result: `${v1_planet.toFixed(4)} km/s` },
        { label: 'Transfer orbit velocity at departure', equation: 'v_t1 = √(μ_☉(2/r₁ - 1/a_t))', substitution: `v_t1 = √(${mu}(2/${r1.toExponential(4)} - 1/${a_t.toExponential(4)}))`, result: `${v1_transfer.toFixed(4)} km/s` },
        { label: 'Hyperbolic excess velocity', equation: 'v∞ = |v_t1 - v₁|', substitution: `v∞ = |${v1_transfer.toFixed(4)} - ${v1_planet.toFixed(4)}|`, result: `${v_inf_depart.toFixed(4)} km/s` },
        { label: 'Departure C₃', equation: 'C₃ = v∞²', substitution: `C₃ = ${v_inf_depart.toFixed(4)}²`, result: `${C3_depart.toFixed(4)} km²/s²` },
      ],
      interpretation: `The spacecraft must achieve v∞ = ${v_inf_depart.toFixed(2)} km/s relative to ${p1.name} (C₃ = ${C3_depart.toFixed(2)} km²/s²). This is the velocity at the edge of ${p1.name}'s sphere of influence, after escaping its gravity.`,
    },
    {
      title: `Arrival at ${p2.name}`,
      value: v_inf_arrive,
      unit: 'km/s',
      steps: [
        { label: `${p2.name} orbital velocity`, equation: 'v₂ = √(μ_☉/r₂)', substitution: `v₂ = √(${mu}/${r2.toExponential(4)})`, result: `${v2_planet.toFixed(4)} km/s` },
        { label: 'Transfer orbit velocity at arrival', equation: 'v_t2 = √(μ_☉(2/r₂ - 1/a_t))', substitution: `v_t2 = √(${mu}(2/${r2.toExponential(4)} - 1/${a_t.toExponential(4)}))`, result: `${v2_transfer.toFixed(4)} km/s` },
        { label: 'Arrival hyperbolic excess', equation: 'v∞ = |v₂ - v_t2|', substitution: `v∞ = |${v2_planet.toFixed(4)} - ${v2_transfer.toFixed(4)}|`, result: `${v_inf_arrive.toFixed(4)} km/s` },
        { label: 'Arrival C₃', equation: 'C₃ = v∞²', substitution: `C₃ = ${v_inf_arrive.toFixed(4)}²`, result: `${C3_arrive.toFixed(4)} km²/s²` },
      ],
      interpretation: `At ${p2.name}, the spacecraft arrives with v∞ = ${v_inf_arrive.toFixed(2)} km/s. An orbit insertion burn or aerocapture is needed to be captured by ${p2.name}'s gravity.`,
    },
    {
      title: 'Transfer Orbit & Launch Window',
      value: T_days,
      unit: 'days',
      steps: [
        { label: 'Transfer semi-major axis', equation: 'a_t = (r₁+r₂)/2', substitution: `a_t = (${r1.toExponential(4)}+${r2.toExponential(4)})/2`, result: `${a_t.toExponential(4)} km (${(a_t / AU_KM).toFixed(3)} AU)` },
        { label: 'Transfer time (half period)', equation: 'T = π√(a_t³/μ_☉)', substitution: `T = π√(${a_t.toExponential(4)}³/${mu})`, result: `${T_transfer.toFixed(0)} s = ${T_days.toFixed(1)} days` },
        { label: 'Required phase angle', equation: 'φ = π - n₂·T', substitution: `φ = π - ${n2.toExponential(4)}×${T_transfer.toFixed(0)}`, result: `${phase_deg.toFixed(1)}°` },
        { label: 'Synodic period (launch window interval)', equation: 'T_syn = |1/(1/T₁ - 1/T₂)|', substitution: `T_syn`, result: `${(T_synodic / 86400).toFixed(1)} days (${(T_synodic / 86400 / 365.25).toFixed(2)} years)` },
      ],
      interpretation: `The Hohmann transfer from ${p1.name} to ${p2.name} takes ${T_days.toFixed(0)} days (${(T_days / 365.25).toFixed(2)} years). The planets must be at a phase angle of ${phase_deg.toFixed(1)}° at departure. Launch windows repeat every ${(T_synodic / 86400).toFixed(0)} days (${(T_synodic / 86400 / 365.25).toFixed(1)} years) — the synodic period. For Mars, this is about 26 months, which is why Mars missions cluster in specific years.`,
    },
  ];
}
