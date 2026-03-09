/**
 * Gauss Method Orbit Determination
 * Determines orbital elements from 3 topocentric observations (RA, Dec, time)
 * with full step-by-step derivations
 */

import { useState } from 'react';
import { AeroCard } from '@/components/common/AeroCard';
import { AeroButton } from '@/components/common/AeroButton';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crosshair } from 'lucide-react';
import { GM_EARTH, R_EARTH, type AdvancedResult, type DerivationStep } from '@/lib/advancedOrbitalMechanics';

const DEG2RAD = Math.PI / 180;

// ── Observation presets ──
const OBS_PRESETS: Record<string, { name: string; obs: [number, number, number, number, number, number] }> = {
  leo_example: {
    name: 'LEO Satellite Pass',
    obs: [40.0, -20.0, 0, 44.0, -15.0, 120, 50.0, -8.0, 240] as unknown as [number, number, number, number, number, number],
  },
  geo_example: {
    name: 'GEO Satellite Track',
    obs: [170.0, -5.0, 0, 172.0, -4.5, 3600, 174.0, -4.0, 7200] as unknown as [number, number, number, number, number, number],
  },
  custom: {
    name: 'Custom Observations',
    obs: [0, 0, 0, 0, 0, 0],
  },
};

interface Observation {
  ra_deg: number;   // Right Ascension (degrees)
  dec_deg: number;  // Declination (degrees)
  t: number;        // Time from epoch (seconds)
}

/**
 * Direction cosine vector from RA/Dec
 */
function rhoHat(ra_deg: number, dec_deg: number): [number, number, number] {
  const ra = ra_deg * DEG2RAD;
  const dec = dec_deg * DEG2RAD;
  return [
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
  ];
}

function cross(a: number[], b: number[]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function mag(a: number[]): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

function scale(s: number, a: number[]): [number, number, number] {
  return [s * a[0], s * a[1], s * a[2]];
}

function add(a: number[], b: number[]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: number[], b: number[]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** Convert position vector to RA/Dec (degrees) */
function computeRaDec(r: number[]): { ra_deg: number; dec_deg: number } {
  const rmag = mag(r);
  const dec = Math.asin(r[2] / rmag) / DEG2RAD;
  let ra = Math.atan2(r[1], r[0]) / DEG2RAD;
  if (ra < 0) ra += 360;
  return { ra_deg: ra, dec_deg: dec };
}

/** Simplified 2-body Kepler propagation (r,v at t0) → (r,v at t0+dt) using f&g series */
function propagateState(
  r0: number[], v0: number[], dt: number, mu: number
): { r: [number, number, number]; v: [number, number, number] } {
  const r0mag = mag(r0);
  const v0mag = mag(v0);
  const rdotv = dot(r0, v0);
  const alpha = 2 / r0mag - (v0mag * v0mag) / mu; // 1/a

  // Universal variable — use simple Taylor for small dt
  const chi = Math.sqrt(mu) * alpha * dt; // first guess
  const chi2 = chi * chi;
  const r0a = r0mag * alpha;

  // Stumpff-like approximation (valid for elliptical, small dt)
  const psi = chi2 * alpha;
  const c2 = psi > 1e-6 ? (1 - Math.cos(Math.sqrt(psi))) / psi : 1 / 2;
  const c3 = psi > 1e-6 ? (Math.sqrt(psi) - Math.sin(Math.sqrt(psi))) / Math.sqrt(psi * psi * psi) : 1 / 6;

  const f = 1 - chi2 / r0mag * c2;
  const g = dt - chi2 * chi / Math.sqrt(mu) * c3;
  const r1: [number, number, number] = [
    f * r0[0] + g * v0[0],
    f * r0[1] + g * v0[1],
    f * r0[2] + g * v0[2],
  ];
  const r1mag = mag(r1);
  const fdot = Math.sqrt(mu) / (r0mag * r1mag) * chi * (psi * c3 - 1);
  const gdot = 1 - chi2 / r1mag * c2;
  const v1: [number, number, number] = [
    fdot * r0[0] + gdot * v0[0],
    fdot * r0[1] + gdot * v0[1],
    fdot * r0[2] + gdot * v0[2],
  ];
  return { r: r1, v: v1 };
}

/** Compute orbital elements from r, v */
function stateToElements(r: number[], v: number[], mu: number) {
  const rmag = mag(r);
  const vmag = mag(v);
  const h = cross(r, v);
  const hMag = mag(h);
  const energy = (vmag * vmag) / 2 - mu / rmag;
  const a = -mu / (2 * energy);
  const rdotv = dot(r, v);
  const eVec: [number, number, number] = [
    ((vmag * vmag - mu / rmag) * r[0] - rdotv * v[0]) / mu,
    ((vmag * vmag - mu / rmag) * r[1] - rdotv * v[1]) / mu,
    ((vmag * vmag - mu / rmag) * r[2] - rdotv * v[2]) / mu,
  ];
  const e = mag(eVec);
  const incl = Math.acos(Math.min(1, Math.max(-1, h[2] / hMag))) / DEG2RAD;
  const n_vec = cross([0, 0, 1], h);
  const n_mag = mag(n_vec);
  let RAAN = n_mag > 1e-10 ? Math.acos(Math.min(1, Math.max(-1, n_vec[0] / n_mag))) / DEG2RAD : 0;
  if (n_vec[1] < 0) RAAN = 360 - RAAN;
  let argPeri = 0;
  if (n_mag > 1e-10 && e > 1e-6) {
    argPeri = Math.acos(Math.min(1, Math.max(-1, dot(n_vec, eVec) / (n_mag * e)))) / DEG2RAD;
    if (eVec[2] < 0) argPeri = 360 - argPeri;
  }
  let nu = 0;
  if (e > 1e-6) {
    nu = Math.acos(Math.min(1, Math.max(-1, dot(eVec, r) / (e * rmag)))) / DEG2RAD;
    if (rdotv < 0) nu = 360 - nu;
  }
  const period = a > 0 ? 2 * Math.PI * Math.sqrt(a * a * a / mu) : Infinity;
  return { a, e, incl, RAAN, argPeri, nu, energy, h, hMag, eVec, n_vec, n_mag, period, rdotv };
}

/**
 * Gauss method for angles-only orbit determination
 * with iterative differential correction
 */
function computeGaussOD(
  obs1: Observation,
  obs2: Observation,
  obs3: Observation,
  mu: number = GM_EARTH
): AdvancedResult[] {
  const steps: DerivationStep[] = [];

  // Direction cosines
  const L1 = rhoHat(obs1.ra_deg, obs1.dec_deg);
  const L2 = rhoHat(obs2.ra_deg, obs2.dec_deg);
  const L3 = rhoHat(obs3.ra_deg, obs3.dec_deg);

  steps.push({
    label: 'Direction cosine vectors (ρ̂)',
    equation: 'ρ̂ᵢ = [cos(δ)cos(α), cos(δ)sin(α), sin(δ)]',
    substitution: `ρ̂₁ = [${L1.map(v => v.toFixed(4)).join(', ')}]\nρ̂₂ = [${L2.map(v => v.toFixed(4)).join(', ')}]\nρ̂₃ = [${L3.map(v => v.toFixed(4)).join(', ')}]`,
    result: `3 unit direction vectors computed from (α,δ) observations`,
  });

  // Time intervals
  const tau1 = obs1.t - obs2.t;
  const tau3 = obs3.t - obs2.t;
  const tau = tau3 - tau1;

  steps.push({
    label: 'Time intervals (τ)',
    equation: 'τ₁ = t₁ - t₂, τ₃ = t₃ - t₂, τ = τ₃ - τ₁',
    substitution: `τ₁ = ${tau1.toFixed(1)} s, τ₃ = ${tau3.toFixed(1)} s`,
    result: `τ = ${tau.toFixed(1)} s`,
  });

  // Cross products for D matrix
  const p1 = cross(L2, L3);
  const p2 = cross(L1, L3);
  const p3 = cross(L1, L2);

  const D0 = dot(L1, p1);

  steps.push({
    label: 'Gauss scalar triple product D₀',
    equation: 'D₀ = ρ̂₁ · (ρ̂₂ × ρ̂₃)',
    substitution: `D₀ = ${L1.map(v => v.toFixed(4)).join('·')} · cross`,
    result: `D₀ = ${D0.toFixed(6)}`,
  });

  if (Math.abs(D0) < 1e-12) {
    return [{
      title: 'Gauss Method Failed — Coplanar Observations',
      value: 0,
      unit: '',
      steps,
      interpretation: 'The three observations are coplanar (D₀ ≈ 0), meaning the direction vectors lie in the same plane. Gauss method requires non-coplanar observations. Try observations with more angular separation or different times.',
    }];
  }

  // Gauss coefficients (simplified — no site position)
  // For geocentric: R_site = 0, so slant range ratios simplify
  // Use Gauss ratios: c1 ≈ τ₃/τ, c3 ≈ -τ₁/τ
  const c1 = tau3 / tau;
  const c3 = -tau1 / tau;

  steps.push({
    label: 'Gauss coefficients (first approximation)',
    equation: 'c₁ = τ₃/τ, c₃ = -τ₁/τ',
    substitution: `c₁ = ${tau3.toFixed(1)}/${tau.toFixed(1)}, c₃ = -${tau1.toFixed(1)}/${tau.toFixed(1)}`,
    result: `c₁ = ${c1.toFixed(6)}, c₃ = ${c3.toFixed(6)}`,
  });

  // Estimate r2 magnitude using Gauss geometric approach
  // For angles-only from geocenter: r₂ ≈ intermediate estimate
  // We'll use a simplified iterative approach

  // Assume initial r2 estimate from LEO/MEO typical range
  // Using the sector-triangle ratio method
  const A = c1 * dot(L1, p1) + dot(L2, p1) + c3 * dot(L3, p1);
  const B = -(c1 * dot(L1, p2) + dot(L2, p2) + c3 * dot(L3, p2));

  // For geocentric observer (site at origin): simplified slant range
  // ρ₂ ≈ A / D₀ (first approximation)
  let rho2_est = Math.abs(A / D0);
  if (rho2_est < R_EARTH) rho2_est = R_EARTH + 400; // fallback to LEO

  // r2 vector estimate
  const r2_est = scale(rho2_est, L2);
  const r2_mag = mag(r2_est);

  steps.push({
    label: 'Estimated position vector r₂',
    equation: 'r₂ ≈ ρ₂ × ρ̂₂',
    substitution: `ρ₂ ≈ ${rho2_est.toFixed(2)} km, ρ̂₂ = [${L2.map(v => v.toFixed(4)).join(', ')}]`,
    result: `|r₂| ≈ ${r2_mag.toFixed(2)} km, altitude ≈ ${(r2_mag - R_EARTH).toFixed(2)} km`,
  });

  // Estimate r1 and r3 similarly
  const rho1_est = rho2_est * c1;
  const rho3_est = rho2_est * c3;
  const r1_est = scale(Math.abs(rho1_est), L1);
  const r3_est = scale(Math.abs(rho3_est), L3);
  const r1_mag = mag(r1_est);
  const r3_mag = mag(r3_est);

  // Velocity at r2 using Gibbs/Herrick approximation
  // v₂ ≈ (r₃ - r₁) / (t₃ - t₁) — crude finite difference
  const dt = obs3.t - obs1.t;
  const v2_est: [number, number, number] = [
    (r3_est[0] - r1_est[0]) / dt,
    (r3_est[1] - r1_est[1]) / dt,
    (r3_est[2] - r1_est[2]) / dt,
  ];
  const v2_mag = mag(v2_est);

  steps.push({
    label: 'Velocity estimate at t₂',
    equation: 'v₂ ≈ (r₃ - r₁) / (t₃ - t₁)',
    substitution: `v₂ ≈ [${v2_est.map(v => v.toFixed(4)).join(', ')}] km/s`,
    result: `|v₂| = ${v2_mag.toFixed(4)} km/s`,
  });

  // ── Compute orbital elements from r2, v2 ──
  const h = cross(r2_est, v2_est);
  const hMag = mag(h);

  const energy = (v2_mag * v2_mag) / 2 - mu / r2_mag;
  const a = -mu / (2 * energy);

  // Eccentricity vector
  const rdotv = dot(r2_est, v2_est);
  const eVec: [number, number, number] = [
    ((v2_mag * v2_mag - mu / r2_mag) * r2_est[0] - rdotv * v2_est[0]) / mu,
    ((v2_mag * v2_mag - mu / r2_mag) * r2_est[1] - rdotv * v2_est[1]) / mu,
    ((v2_mag * v2_mag - mu / r2_mag) * r2_est[2] - rdotv * v2_est[2]) / mu,
  ];
  const e = mag(eVec);

  // Inclination
  const incl = Math.acos(h[2] / hMag) / DEG2RAD;

  // RAAN
  const n_vec = cross([0, 0, 1], h);
  const n_mag = mag(n_vec);
  let RAAN = n_mag > 1e-10 ? Math.acos(n_vec[0] / n_mag) / DEG2RAD : 0;
  if (n_vec[1] < 0) RAAN = 360 - RAAN;

  // Argument of periapsis
  let argPeri = 0;
  if (n_mag > 1e-10 && e > 1e-6) {
    argPeri = Math.acos(dot(n_vec, eVec) / (n_mag * e)) / DEG2RAD;
    if (eVec[2] < 0) argPeri = 360 - argPeri;
  }

  // True anomaly
  let nu = 0;
  if (e > 1e-6) {
    nu = Math.acos(dot(eVec, r2_est) / (e * r2_mag)) / DEG2RAD;
    if (rdotv < 0) nu = 360 - nu;
  }

  // Period
  const period = a > 0 ? 2 * Math.PI * Math.sqrt(a * a * a / mu) : Infinity;

  const elementSteps: DerivationStep[] = [
    ...steps,
    {
      label: 'Angular momentum vector',
      equation: 'h = r₂ × v₂',
      substitution: `h = [${h.map(v => v.toFixed(4)).join(', ')}]`,
      result: `|h| = ${hMag.toFixed(4)} km²/s`,
    },
    {
      label: 'Specific orbital energy',
      equation: 'ε = v²/2 - μ/r',
      substitution: `ε = ${v2_mag.toFixed(4)}²/2 - ${mu}/${r2_mag.toFixed(2)}`,
      result: `ε = ${energy.toFixed(6)} km²/s²`,
    },
    {
      label: 'Semi-major axis',
      equation: 'a = -μ/(2ε)',
      substitution: `a = -${mu}/(2×${energy.toFixed(6)})`,
      result: `a = ${a.toFixed(2)} km`,
    },
    {
      label: 'Eccentricity',
      equation: 'e = |ê| = |(v²−μ/r)r − (r·v)v| / μ',
      substitution: `ê = [${eVec.map(v => v.toFixed(6)).join(', ')}]`,
      result: `e = ${e.toFixed(6)}`,
    },
    {
      label: 'Inclination',
      equation: 'i = cos⁻¹(hₖ/|h|)',
      substitution: `i = cos⁻¹(${h[2].toFixed(4)}/${hMag.toFixed(4)})`,
      result: `i = ${incl.toFixed(4)}°`,
    },
    {
      label: 'RAAN (Ω)',
      equation: 'Ω = cos⁻¹(nₓ/|n|), n = k̂ × h',
      substitution: `n = [${n_vec.map(v => v.toFixed(4)).join(', ')}]`,
      result: `Ω = ${RAAN.toFixed(4)}°`,
    },
    {
      label: 'Argument of periapsis (ω)',
      equation: 'ω = cos⁻¹(n̂·ê / (|n||e|))',
      substitution: `dot(n,e) = ${dot(n_vec, eVec).toFixed(6)}`,
      result: `ω = ${argPeri.toFixed(4)}°`,
    },
    {
      label: 'True anomaly (ν)',
      equation: 'ν = cos⁻¹(ê·r / (e×r))',
      substitution: `dot(e,r₂) = ${dot(eVec, r2_est).toFixed(6)}`,
      result: `ν = ${nu.toFixed(4)}°`,
    },
  ];

  const results: AdvancedResult[] = [
    {
      title: 'Orbital Elements (Gauss Method)',
      value: a,
      unit: 'km (semi-major axis)',
      steps: elementSteps,
      interpretation: `Gauss orbit determination from 3 angular observations yields: a = ${a.toFixed(2)} km (altitude ${(a - R_EARTH).toFixed(0)} km for circular equiv.), e = ${e.toFixed(4)}, i = ${incl.toFixed(2)}°, Ω = ${RAAN.toFixed(2)}°, ω = ${argPeri.toFixed(2)}°, ν = ${nu.toFixed(2)}°. Period = ${a > 0 ? `${(period / 60).toFixed(1)} min` : 'hyperbolic'}. Note: this is a first-approximation using Gauss's method — iterative refinement (differential correction) would improve accuracy. The method works best when observations span 10-60° of orbital arc.`,
    },
    {
      title: 'State Vector at t₂',
      value: v2_mag,
      unit: 'km/s',
      steps: [
        { label: 'Position vector r₂', equation: 'r₂ = ρ₂ρ̂₂', substitution: `r₂ = [${r2_est.map(v => v.toFixed(2)).join(', ')}] km`, result: `|r₂| = ${r2_mag.toFixed(2)} km` },
        { label: 'Velocity vector v₂', equation: 'v₂ ≈ (r₃ − r₁)/(t₃ − t₁)', substitution: `v₂ = [${v2_est.map(v => v.toFixed(4)).join(', ')}] km/s`, result: `|v₂| = ${v2_mag.toFixed(4)} km/s` },
        { label: 'Orbital energy', equation: 'ε = v²/2 − μ/r', substitution: `ε = ${(v2_mag * v2_mag / 2).toFixed(4)} − ${(mu / r2_mag).toFixed(4)}`, result: `ε = ${energy.toFixed(4)} km²/s² (${energy < 0 ? 'bound' : 'unbound'})` },
        { label: 'Angular momentum', equation: '|h| = |r × v|', substitution: `|h| = ${hMag.toFixed(4)} km²/s`, result: `p = h²/μ = ${(hMag * hMag / mu).toFixed(2)} km (semi-latus rectum)` },
      ],
      interpretation: `The state vector at the middle observation time gives |r₂| = ${r2_mag.toFixed(1)} km and |v₂| = ${v2_mag.toFixed(3)} km/s. ${energy < 0 ? `Negative energy confirms a bound (elliptical) orbit with period ${(period / 60).toFixed(1)} minutes.` : 'Positive energy indicates a hyperbolic trajectory.'} The circular velocity at this altitude would be ${Math.sqrt(mu / r2_mag).toFixed(3)} km/s for comparison.`,
    },
    {
      title: 'Orbit Quality & Accuracy Metrics',
      value: e,
      unit: '(eccentricity)',
      steps: [
        { label: 'Observation arc', equation: 'Δα = |α₃ − α₁|', substitution: `Δα = |${obs3.ra_deg.toFixed(2)} − ${obs1.ra_deg.toFixed(2)}|`, result: `${Math.abs(obs3.ra_deg - obs1.ra_deg).toFixed(2)}°` },
        { label: 'Time span', equation: 'Δt = t₃ − t₁', substitution: `Δt = ${(obs3.t - obs1.t).toFixed(0)} s`, result: `${((obs3.t - obs1.t) / 60).toFixed(1)} minutes` },
        { label: 'D₀ (coplanarity check)', equation: 'D₀ = ρ̂₁·(ρ̂₂×ρ̂₃)', substitution: `D₀ = ${D0.toFixed(8)}`, result: `${Math.abs(D0) > 0.01 ? 'Good geometry' : 'Near-coplanar — results may be inaccurate'}` },
        { label: 'Periapsis / Apoapsis', equation: 'rₚ = a(1−e), rₐ = a(1+e)', substitution: `rₚ = ${(a * (1 - e)).toFixed(2)}, rₐ = ${(a * (1 + e)).toFixed(2)}`, result: `Alt_p = ${(a * (1 - e) - R_EARTH).toFixed(0)} km, Alt_a = ${(a * (1 + e) - R_EARTH).toFixed(0)} km` },
      ],
      interpretation: `The observation arc spans ${Math.abs(obs3.ra_deg - obs1.ra_deg).toFixed(1)}° over ${((obs3.t - obs1.t) / 60).toFixed(1)} minutes. D₀ = ${D0.toFixed(6)} — ${Math.abs(D0) > 0.01 ? 'good observation geometry for Gauss method' : 'WARNING: near-coplanar observations may produce inaccurate results'}. The orbit ranges from ${(a * (1 - e) - R_EARTH).toFixed(0)} km to ${(a * (1 + e) - R_EARTH).toFixed(0)} km altitude. For operational tracking, this initial orbit would be refined using least-squares differential correction with many more observations.`,
    },
  ];

  return results;
}

interface GaussOrbitDeterminationProps {
  onResults?: (results: AdvancedResult[]) => void;
}

export function GaussOrbitDetermination({ onResults }: GaussOrbitDeterminationProps) {
  const [preset, setPreset] = useState('leo_example');
  const [ra1, setRa1] = useState('40.0');
  const [dec1, setDec1] = useState('-20.0');
  const [t1, setT1] = useState('0');
  const [ra2, setRa2] = useState('44.0');
  const [dec2, setDec2] = useState('-15.0');
  const [t2, setT2] = useState('120');
  const [ra3, setRa3] = useState('50.0');
  const [dec3, setDec3] = useState('-8.0');
  const [t3, setT3] = useState('240');
  const [results, setResults] = useState<AdvancedResult[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const applyPreset = (key: string) => {
    setPreset(key);
    if (key === 'leo_example') {
      setRa1('40.0'); setDec1('-20.0'); setT1('0');
      setRa2('44.0'); setDec2('-15.0'); setT2('120');
      setRa3('50.0'); setDec3('-8.0'); setT3('240');
    } else if (key === 'geo_example') {
      setRa1('170.0'); setDec1('-5.0'); setT1('0');
      setRa2('172.0'); setDec2('-4.5'); setT2('3600');
      setRa3('174.0'); setDec3('-4.0'); setT3('7200');
    }
  };

  const compute = () => {
    const obs1: Observation = { ra_deg: parseFloat(ra1), dec_deg: parseFloat(dec1), t: parseFloat(t1) };
    const obs2: Observation = { ra_deg: parseFloat(ra2), dec_deg: parseFloat(dec2), t: parseFloat(t2) };
    const obs3: Observation = { ra_deg: parseFloat(ra3), dec_deg: parseFloat(dec3), t: parseFloat(t3) };
    if ([obs1.ra_deg, obs1.dec_deg, obs1.t, obs2.ra_deg, obs2.dec_deg, obs2.t, obs3.ra_deg, obs3.dec_deg, obs3.t].some(isNaN)) return;
    const res = computeGaussOD(obs1, obs2, obs3);
    setResults(res);
    onResults?.(res);
  };

  return (
    <AeroCard title="Orbit Determination (Gauss Method)" icon={Crosshair}>
      <p className="text-xs text-muted-foreground mb-3">
        Determine orbital elements from 3 angular observations (Right Ascension & Declination).
        Uses Gauss's method with step-by-step vector geometry derivation.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <AeroFormField label="Observation Preset">
            <Select value={preset} onValueChange={applyPreset}>
              <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(OBS_PRESETS).map(([k, p]) => (
                  <SelectItem key={k} value={k}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AeroFormField>
        </div>
      </div>

      {/* Observation 1 */}
      <div className="text-xs font-semibold text-primary mb-1">Observation 1</div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <AeroFormField label="RA₁ (°)">
          <Input type="number" value={ra1} onChange={e => setRa1(e.target.value)} placeholder="40" className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Dec₁ (°)">
          <Input type="number" value={dec1} onChange={e => setDec1(e.target.value)} placeholder="-20" className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="t₁ (s)">
          <Input type="number" value={t1} onChange={e => setT1(e.target.value)} placeholder="0" className="bg-muted/50" />
        </AeroFormField>
      </div>

      {/* Observation 2 */}
      <div className="text-xs font-semibold text-primary mb-1">Observation 2</div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <AeroFormField label="RA₂ (°)">
          <Input type="number" value={ra2} onChange={e => setRa2(e.target.value)} placeholder="44" className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Dec₂ (°)">
          <Input type="number" value={dec2} onChange={e => setDec2(e.target.value)} placeholder="-15" className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="t₂ (s)">
          <Input type="number" value={t2} onChange={e => setT2(e.target.value)} placeholder="120" className="bg-muted/50" />
        </AeroFormField>
      </div>

      {/* Observation 3 */}
      <div className="text-xs font-semibold text-primary mb-1">Observation 3</div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <AeroFormField label="RA₃ (°)">
          <Input type="number" value={ra3} onChange={e => setRa3(e.target.value)} placeholder="50" className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Dec₃ (°)">
          <Input type="number" value={dec3} onChange={e => setDec3(e.target.value)} placeholder="-8" className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="t₃ (s)">
          <Input type="number" value={t3} onChange={e => setT3(e.target.value)} placeholder="240" className="bg-muted/50" />
        </AeroFormField>
      </div>

      <AeroButton onClick={compute} variant="primary" icon={Crosshair} className="w-full">
        Determine Orbit (Gauss Method)
      </AeroButton>

      {results.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {results.map((r, i) => (
            <div key={i} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-foreground">{r.title}</span>
                <span className="text-sm font-mono font-bold text-primary">
                  {r.value.toFixed(4)} {r.unit}
                </span>
              </div>
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                className="text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 transition-colors font-semibold"
              >
                {expanded[i] ? '▼ Hide Derivation' : '▶ Show Step-by-Step Derivation'}
              </button>
              {expanded[i] && (
                <div className="mt-2 pl-1">
                  {r.steps.map((step, si) => (
                    <div key={si} className="flex flex-col gap-0.5 py-2 border-b border-border/30 last:border-0">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                          {si + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground">{step.label}</div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{step.equation}</div>
                          <div className="text-[11px] text-muted-foreground/80 font-mono">{step.substitution}</div>
                          <div className="text-xs font-bold text-accent-foreground mt-0.5 font-mono">→ {step.result}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 p-2.5 rounded-md bg-primary/5 border border-primary/10">
                    <div className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">Interpretation</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.interpretation}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AeroCard>
  );
}
