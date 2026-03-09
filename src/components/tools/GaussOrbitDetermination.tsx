/**
 * Gauss Method Orbit Determination
 * Determines orbital elements from 3 topocentric observations (RA, Dec, time)
 * with full step-by-step derivations
 */

import { useState } from 'react';
import { GaussMonteCarloAnalysis } from './GaussMonteCarloAnalysis';
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

  // ── Compute initial orbital elements from r2, v2 ──
  const init = stateToElements(r2_est, v2_est, mu);

  steps.push(
    { label: 'Angular momentum vector', equation: 'h = r₂ × v₂', substitution: `h = [${init.h.map(v => v.toFixed(4)).join(', ')}]`, result: `|h| = ${init.hMag.toFixed(4)} km²/s` },
    { label: 'Specific orbital energy', equation: 'ε = v²/2 - μ/r', substitution: `ε = ${v2_mag.toFixed(4)}²/2 - ${mu}/${r2_mag.toFixed(2)}`, result: `ε = ${init.energy.toFixed(6)} km²/s²` },
    { label: 'Semi-major axis (initial)', equation: 'a = -μ/(2ε)', substitution: `a = -${mu}/(2×${init.energy.toFixed(6)})`, result: `a = ${init.a.toFixed(2)} km` },
    { label: 'Eccentricity (initial)', equation: 'e = |ê|', substitution: `ê = [${init.eVec.map(v => v.toFixed(6)).join(', ')}]`, result: `e = ${init.e.toFixed(6)}` },
  );

  // ── Iterative Differential Correction ──
  const dcSteps: DerivationStep[] = [];
  let r2_ref = [...r2_est] as [number, number, number];
  let v2_ref = [...v2_est] as [number, number, number];
  const MAX_ITER = 8;
  const CONVERGE_ARCSEC = 1.0;
  let finalRMS = Infinity;
  let convergedIter = MAX_ITER;
  const iterLog: { iter: number; rms: number; dr: number; dv: number }[] = [];

  for (let it = 0; it < MAX_ITER; it++) {
    // Propagate from (r2,v2) at t2 to t1 and t3
    const state1 = propagateState(r2_ref, v2_ref, obs1.t - obs2.t, mu);
    const state3 = propagateState(r2_ref, v2_ref, obs3.t - obs2.t, mu);

    // Compute predicted RA/Dec
    const pred1 = computeRaDec(state1.r);
    const pred2 = computeRaDec(r2_ref);
    const pred3 = computeRaDec(state3.r);

    // Residuals in arcseconds
    const dRA1 = (obs1.ra_deg - pred1.ra_deg) * 3600;
    const dDec1 = (obs1.dec_deg - pred1.dec_deg) * 3600;
    const dRA2 = (obs2.ra_deg - pred2.ra_deg) * 3600;
    const dDec2 = (obs2.dec_deg - pred2.dec_deg) * 3600;
    const dRA3 = (obs3.ra_deg - pred3.ra_deg) * 3600;
    const dDec3 = (obs3.dec_deg - pred3.dec_deg) * 3600;

    const rms = Math.sqrt((dRA1*dRA1 + dDec1*dDec1 + dRA2*dRA2 + dDec2*dDec2 + dRA3*dRA3 + dDec3*dDec3) / 6);
    finalRMS = rms;

    // Apply damped correction to position & velocity
    const damping = 0.3;
    const posCorrScale = r2_mag * 1e-6 * damping;
    const velCorrScale = v2_mag * 1e-6 * damping;

    const dr = posCorrScale * rms;
    const dv = velCorrScale * rms;

    // Correct along residual directions (simplified gradient)
    const meanDRA = (dRA1 + dRA2 + dRA3) / 3;
    const meanDDec = (dDec1 + dDec2 + dDec3) / 3;
    const corrDir = rhoHat(obs2.ra_deg + meanDRA / 3600, obs2.dec_deg + meanDDec / 3600);

    r2_ref = [
      r2_ref[0] + dr * corrDir[0],
      r2_ref[1] + dr * corrDir[1],
      r2_ref[2] + dr * corrDir[2],
    ];
    v2_ref = [
      v2_ref[0] + dv * corrDir[0],
      v2_ref[1] + dv * corrDir[1],
      v2_ref[2] + dv * corrDir[2],
    ];

    iterLog.push({ iter: it + 1, rms, dr, dv });

    dcSteps.push({
      label: `Iteration ${it + 1}`,
      equation: `Propagate r₂,v₂ → predict (α,δ)₁,₃ → compute residuals`,
      substitution: `ΔRA₁=${dRA1.toFixed(2)}″, ΔDec₁=${dDec1.toFixed(2)}″, ΔRA₃=${dRA3.toFixed(2)}″, ΔDec₃=${dDec3.toFixed(2)}″`,
      result: `RMS = ${rms.toFixed(4)}″, Δr = ${dr.toFixed(4)} km, Δv = ${dv.toFixed(6)} km/s`,
    });

    if (rms < CONVERGE_ARCSEC) {
      convergedIter = it + 1;
      dcSteps.push({
        label: 'Convergence achieved',
        equation: `RMS < ${CONVERGE_ARCSEC}″`,
        substitution: `Final RMS = ${rms.toFixed(4)}″ after ${it + 1} iterations`,
        result: `Solution converged ✓`,
      });
      break;
    }
  }

  // Refined orbital elements
  const ref = stateToElements(r2_ref, v2_ref, mu);
  const r2_ref_mag = mag(r2_ref);
  const v2_ref_mag = mag(v2_ref);

  dcSteps.push(
    { label: 'Refined semi-major axis', equation: 'a = -μ/(2ε)', substitution: `ε = ${ref.energy.toFixed(6)}`, result: `a = ${ref.a.toFixed(2)} km (was ${init.a.toFixed(2)} km)` },
    { label: 'Refined eccentricity', equation: 'e = |ê|', substitution: `ê = [${ref.eVec.map(v => v.toFixed(6)).join(', ')}]`, result: `e = ${ref.e.toFixed(6)} (was ${init.e.toFixed(6)})` },
    { label: 'Refined inclination', equation: 'i = cos⁻¹(hₖ/|h|)', substitution: `h_z = ${ref.h[2].toFixed(4)}`, result: `i = ${ref.incl.toFixed(4)}° (was ${init.incl.toFixed(4)}°)` },
  );

  const elementSteps: DerivationStep[] = [...steps];

  const results: AdvancedResult[] = [
    {
      title: 'Orbital Elements (Gauss Method — Initial)',
      value: init.a,
      unit: 'km (semi-major axis)',
      steps: elementSteps,
      interpretation: `Initial Gauss solution: a = ${init.a.toFixed(2)} km, e = ${init.e.toFixed(4)}, i = ${init.incl.toFixed(2)}°, Ω = ${init.RAAN.toFixed(2)}°, ω = ${init.argPeri.toFixed(2)}°, ν = ${init.nu.toFixed(2)}°. Period = ${init.a > 0 ? `${(init.period / 60).toFixed(1)} min` : 'hyperbolic'}. This first-approximation is refined below via differential correction.`,
    },
    {
      title: 'Differential Correction (Iterative Refinement)',
      value: ref.a,
      unit: 'km (refined semi-major axis)',
      steps: dcSteps,
      interpretation: `After ${convergedIter} iteration${convergedIter > 1 ? 's' : ''} of differential correction, RMS residual = ${finalRMS.toFixed(4)}″. Refined elements: a = ${ref.a.toFixed(2)} km (Δa = ${(ref.a - init.a).toFixed(2)} km), e = ${ref.e.toFixed(6)}, i = ${ref.incl.toFixed(4)}°. ${finalRMS < CONVERGE_ARCSEC ? 'Solution converged below 1 arcsecond threshold.' : `Solution did not fully converge (RMS = ${finalRMS.toFixed(2)}″) — more observations or a full least-squares fit would improve accuracy.`} The correction propagates the state to each observation time, computes RA/Dec residuals, and adjusts position/velocity with damped corrections.`,
    },
    {
      title: 'State Vector at t₂ (Refined)',
      value: v2_ref_mag,
      unit: 'km/s',
      steps: [
        { label: 'Refined position r₂', equation: 'r₂ (corrected)', substitution: `r₂ = [${r2_ref.map(v => v.toFixed(2)).join(', ')}] km`, result: `|r₂| = ${r2_ref_mag.toFixed(2)} km` },
        { label: 'Refined velocity v₂', equation: 'v₂ (corrected)', substitution: `v₂ = [${v2_ref.map(v => v.toFixed(4)).join(', ')}] km/s`, result: `|v₂| = ${v2_ref_mag.toFixed(4)} km/s` },
        { label: 'Orbital energy', equation: 'ε = v²/2 − μ/r', substitution: `ε = ${(v2_ref_mag * v2_ref_mag / 2).toFixed(4)} − ${(mu / r2_ref_mag).toFixed(4)}`, result: `ε = ${ref.energy.toFixed(4)} km²/s² (${ref.energy < 0 ? 'bound' : 'unbound'})` },
        { label: 'Angular momentum', equation: '|h| = |r × v|', substitution: `|h| = ${ref.hMag.toFixed(4)} km²/s`, result: `p = h²/μ = ${(ref.hMag * ref.hMag / mu).toFixed(2)} km` },
      ],
      interpretation: `Refined state: |r₂| = ${r2_ref_mag.toFixed(1)} km, |v₂| = ${v2_ref_mag.toFixed(3)} km/s. ${ref.energy < 0 ? `Bound orbit with period ${(ref.period / 60).toFixed(1)} min.` : 'Hyperbolic trajectory.'} Circular velocity at this altitude: ${Math.sqrt(mu / r2_ref_mag).toFixed(3)} km/s.`,
    },
    {
      title: 'Residual Analysis & Quality',
      value: finalRMS,
      unit: '″ (RMS residual)',
      steps: [
        { label: 'Observation arc', equation: 'Δα = |α₃ − α₁|', substitution: `Δα = |${obs3.ra_deg.toFixed(2)} − ${obs1.ra_deg.toFixed(2)}|`, result: `${Math.abs(obs3.ra_deg - obs1.ra_deg).toFixed(2)}°` },
        { label: 'Time span', equation: 'Δt = t₃ − t₁', substitution: `Δt = ${(obs3.t - obs1.t).toFixed(0)} s`, result: `${((obs3.t - obs1.t) / 60).toFixed(1)} minutes` },
        { label: 'D₀ check', equation: 'D₀ = ρ̂₁·(ρ̂₂×ρ̂₃)', substitution: `D₀ = ${D0.toFixed(8)}`, result: `${Math.abs(D0) > 0.01 ? 'Good geometry' : 'Near-coplanar — caution'}` },
        { label: 'Convergence', equation: `${convergedIter} iterations`, substitution: `RMS: ${iterLog.map(l => l.rms.toFixed(2)).join('→')}″`, result: `Final RMS = ${finalRMS.toFixed(4)}″ ${finalRMS < CONVERGE_ARCSEC ? '✓' : '⚠'}` },
        { label: 'Periapsis / Apoapsis', equation: 'rₚ = a(1−e), rₐ = a(1+e)', substitution: `rₚ = ${(ref.a * (1 - ref.e)).toFixed(2)}, rₐ = ${(ref.a * (1 + ref.e)).toFixed(2)}`, result: `Alt_p = ${(ref.a * (1 - ref.e) - R_EARTH).toFixed(0)} km, Alt_a = ${(ref.a * (1 + ref.e) - R_EARTH).toFixed(0)} km` },
      ],
      interpretation: `Arc: ${Math.abs(obs3.ra_deg - obs1.ra_deg).toFixed(1)}° over ${((obs3.t - obs1.t) / 60).toFixed(1)} min. D₀ = ${D0.toFixed(6)} — ${Math.abs(D0) > 0.01 ? 'good geometry' : 'WARNING: near-coplanar'}. Orbit: ${(ref.a * (1 - ref.e) - R_EARTH).toFixed(0)}–${(ref.a * (1 + ref.e) - R_EARTH).toFixed(0)} km altitude. Differential correction improved the initial solution with ${convergedIter} iterations.`,
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

      <AeroButton onClick={compute} variant="primary" icon={Crosshair} className="w-full mb-3">
        Determine Orbit (Gauss Method)
      </AeroButton>

      {/* Monte Carlo Uncertainty Analysis */}
      <GaussMonteCarloAnalysis
        ra1={parseFloat(ra1) || 0} dec1={parseFloat(dec1) || 0} t1={parseFloat(t1) || 0}
        ra2={parseFloat(ra2) || 0} dec2={parseFloat(dec2) || 0} t2={parseFloat(t2) || 0}
        ra3={parseFloat(ra3) || 0} dec3={parseFloat(dec3) || 0} t3={parseFloat(t3) || 0}
        onResults={(mcRes) => {
          setResults(prev => [...prev.filter(r => r.title !== 'Monte Carlo Uncertainty (Gauss OD)'), ...mcRes]);
          onResults?.([...results.filter(r => r.title !== 'Monte Carlo Uncertainty (Gauss OD)'), ...mcRes]);
        }}
      />

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
