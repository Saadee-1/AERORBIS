/**
 * Monte Carlo Uncertainty Analysis for Gauss Orbit Determination
 * Runs N perturbed observation sets and computes confidence statistics on orbital elements
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AeroCard } from '@/components/common/AeroCard';
import { AeroButton } from '@/components/common/AeroButton';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Crosshair, BarChart3 } from 'lucide-react';
import { GM_EARTH, R_EARTH, type AdvancedResult, type DerivationStep } from '@/lib/advancedOrbitalMechanics';

const DEG2RAD = Math.PI / 180;

// ── Minimal Gauss solver (no UI, returns elements only) ──

function rhoHat(ra_deg: number, dec_deg: number): [number, number, number] {
  const ra = ra_deg * DEG2RAD;
  const dec = dec_deg * DEG2RAD;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
}

function cross(a: number[], b: number[]): [number, number, number] {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function dot(a: number[], b: number[]): number { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function mag(a: number[]): number { return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]); }
function scl(s: number, a: number[]): [number, number, number] { return [s*a[0], s*a[1], s*a[2]]; }

interface OrbElements {
  a: number; e: number; incl: number; RAAN: number; argPeri: number; nu: number;
}

function gaussSolveElements(
  ra1: number, dec1: number, t1: number,
  ra2: number, dec2: number, t2: number,
  ra3: number, dec3: number, t3: number,
  mu: number = GM_EARTH,
): OrbElements | null {
  const L1 = rhoHat(ra1, dec1), L2 = rhoHat(ra2, dec2), L3 = rhoHat(ra3, dec3);
  const tau1 = t1 - t2, tau3 = t3 - t2, tau = tau3 - tau1;
  const p1 = cross(L2, L3);
  const D0 = dot(L1, p1);
  if (Math.abs(D0) < 1e-12) return null;

  const c1 = tau3 / tau, c3 = -tau1 / tau;
  const A = c1 * dot(L1, p1) + dot(L2, p1) + c3 * dot(L3, p1);
  let rho2 = Math.abs(A / D0);
  if (rho2 < R_EARTH) rho2 = R_EARTH + 400;

  const r2 = scl(rho2, L2);
  const r1 = scl(Math.abs(rho2 * c1), L1);
  const r3 = scl(Math.abs(rho2 * c3), L3);

  const dt = t3 - t1;
  if (Math.abs(dt) < 1e-10) return null;
  const v2: [number, number, number] = [(r3[0]-r1[0])/dt, (r3[1]-r1[1])/dt, (r3[2]-r1[2])/dt];

  const rmag = mag(r2), vmag = mag(v2);
  const h = cross(r2, v2), hMag = mag(h);
  const energy = vmag*vmag/2 - mu/rmag;
  if (Math.abs(energy) < 1e-15) return null;
  const a = -mu / (2 * energy);

  const rdv = dot(r2, v2);
  const eVec: [number, number, number] = [
    ((vmag*vmag - mu/rmag)*r2[0] - rdv*v2[0]) / mu,
    ((vmag*vmag - mu/rmag)*r2[1] - rdv*v2[1]) / mu,
    ((vmag*vmag - mu/rmag)*r2[2] - rdv*v2[2]) / mu,
  ];
  const e = mag(eVec);
  const clamp = (x: number) => Math.min(1, Math.max(-1, x));
  const incl = Math.acos(clamp(h[2] / hMag)) / DEG2RAD;
  const n = cross([0,0,1], h), nm = mag(n);
  let RAAN = nm > 1e-10 ? Math.acos(clamp(n[0]/nm)) / DEG2RAD : 0;
  if (n[1] < 0) RAAN = 360 - RAAN;
  let argPeri = 0;
  if (nm > 1e-10 && e > 1e-6) {
    argPeri = Math.acos(clamp(dot(n, eVec)/(nm*e))) / DEG2RAD;
    if (eVec[2] < 0) argPeri = 360 - argPeri;
  }
  let nu = 0;
  if (e > 1e-6) {
    nu = Math.acos(clamp(dot(eVec, r2)/(e*rmag))) / DEG2RAD;
    if (rdv < 0) nu = 360 - nu;
  }
  return { a, e, incl, RAAN, argPeri, nu };
}

// ── Box-Muller normal random ──
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function mean(arr: number[]) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
function std(arr: number[]) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}
function percentile(arr: number[], p: number) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ── Confidence ellipse SVG ──
function ConfidenceEllipse({ xData, yData, xLabel, yLabel }: {
  xData: number[]; yData: number[]; xLabel: string; yLabel: string;
}) {
  const W = 280, H = 220, M = 40;
  const mx = mean(xData), my = mean(yData);
  const sx = std(xData), sy = std(yData);

  // Correlation
  let corr = 0;
  for (let i = 0; i < xData.length; i++) corr += (xData[i] - mx) * (yData[i] - my);
  corr /= (xData.length - 1) * sx * sy || 1;

  // Plot bounds: ±3σ
  const xMin = mx - 3.5 * sx, xMax = mx + 3.5 * sx;
  const yMin = my - 3.5 * sy, yMax = my + 3.5 * sy;
  const px = (v: number) => M + ((v - xMin) / (xMax - xMin || 1)) * (W - 2 * M);
  const py = (v: number) => H - M - ((v - yMin) / (yMax - yMin || 1)) * (H - 2 * M);

  // 1σ & 2σ ellipse via eigenvalue decomposition of covariance
  const cov11 = sx * sx, cov22 = sy * sy, cov12 = corr * sx * sy;
  const trace = cov11 + cov22;
  const det = cov11 * cov22 - cov12 * cov12;
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
  const lam1 = trace / 2 + disc;
  const lam2 = trace / 2 - disc;
  const angle = Math.atan2(cov12, lam1 - cov22) * (180 / Math.PI);
  const r1_1s = Math.sqrt(Math.max(0, lam1)) * 1;
  const r2_1s = Math.sqrt(Math.max(0, lam2)) * 1;
  const r1_2s = Math.sqrt(Math.max(0, lam1)) * 2;
  const r2_2s = Math.sqrt(Math.max(0, lam2)) * 2;

  // Scale radii to pixel space
  const sxPx = (W - 2 * M) / (xMax - xMin || 1);
  const syPx = (H - 2 * M) / (yMax - yMin || 1);

  // Sample points for scatter (max 200)
  const step = Math.max(1, Math.floor(xData.length / 200));
  const samplePts = xData.filter((_, i) => i % step === 0).map((x, i) => ({ x, y: yData[i * step] }));

  return (
    <svg width={W} height={H} className="mx-auto">
      {/* Axes */}
      <line x1={M} y1={H - M} x2={W - M} y2={H - M} stroke="hsl(var(--border))" strokeWidth={1} />
      <line x1={M} y1={M} x2={M} y2={H - M} stroke="hsl(var(--border))" strokeWidth={1} />
      <text x={W / 2} y={H - 5} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>{xLabel}</text>
      <text x={8} y={H / 2} textAnchor="middle" className="fill-muted-foreground" fontSize={9} transform={`rotate(-90,8,${H / 2})`}>{yLabel}</text>

      {/* 2σ ellipse */}
      <ellipse
        cx={px(mx)} cy={py(my)}
        rx={r1_2s * sxPx} ry={r2_2s * syPx}
        transform={`rotate(${-angle},${px(mx)},${py(my)})`}
        fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary) / 0.3)" strokeWidth={1} strokeDasharray="4,3"
      />
      {/* 1σ ellipse */}
      <ellipse
        cx={px(mx)} cy={py(my)}
        rx={r1_1s * sxPx} ry={r2_1s * syPx}
        transform={`rotate(${-angle},${px(mx)},${py(my)})`}
        fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth={1.5}
      />

      {/* Scatter */}
      {samplePts.map((p, i) => (
        <circle key={i} cx={px(p.x)} cy={py(p.y)} r={1.2} fill="hsl(var(--primary) / 0.5)" />
      ))}

      {/* Mean marker */}
      <circle cx={px(mx)} cy={py(my)} r={3} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1} />

      {/* Legend */}
      <text x={W - M} y={M + 10} textAnchor="end" className="fill-muted-foreground" fontSize={8}>1σ (solid), 2σ (dashed)</text>
      <text x={W - M} y={M + 20} textAnchor="end" className="fill-muted-foreground" fontSize={8}>ρ = {corr.toFixed(3)}</text>
    </svg>
  );
}

// ── Main Component ──

interface MonteCarloProps {
  ra1: number; dec1: number; t1: number;
  ra2: number; dec2: number; t2: number;
  ra3: number; dec3: number; t3: number;
  onResults?: (results: AdvancedResult[]) => void;
}

export function GaussMonteCarloAnalysis({ ra1, dec1, t1, ra2, dec2, t2, ra3, dec3, t3, onResults }: MonteCarloProps) {
  const [nSamples, setNSamples] = useState('1000');
  const [noiseSigma, setNoiseSigma] = useState('10'); // arcsec
  const [running, setRunning] = useState(false);
  const [mcResults, setMcResults] = useState<{
    samples: OrbElements[];
    stats: Record<string, { mean: number; std: number; p5: number; p95: number }>;
    n: number;
    sigma: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const runMC = useCallback(() => {
    setRunning(true);
    const N = Math.min(5000, Math.max(100, parseInt(nSamples) || 1000));
    const sigma_deg = (parseFloat(noiseSigma) || 10) / 3600; // arcsec → deg

    // Run in chunks to avoid blocking UI
    setTimeout(() => {
      const samples: OrbElements[] = [];
      for (let i = 0; i < N; i++) {
        const el = gaussSolveElements(
          ra1 + randn() * sigma_deg, dec1 + randn() * sigma_deg, t1,
          ra2 + randn() * sigma_deg, dec2 + randn() * sigma_deg, t2,
          ra3 + randn() * sigma_deg, dec3 + randn() * sigma_deg, t3,
        );
        if (el && isFinite(el.a) && el.a > 0 && el.a < 1e8) samples.push(el);
      }

      if (samples.length < 10) {
        setRunning(false);
        return;
      }

      const keys: (keyof OrbElements)[] = ['a', 'e', 'incl', 'RAAN', 'argPeri', 'nu'];
      const stats: Record<string, { mean: number; std: number; p5: number; p95: number }> = {};
      for (const k of keys) {
        const vals = samples.map(s => s[k]);
        stats[k] = { mean: mean(vals), std: std(vals), p5: percentile(vals, 5), p95: percentile(vals, 95) };
      }

      setMcResults({ samples, stats, n: samples.length, sigma: parseFloat(noiseSigma) || 10 });

      // Build AdvancedResult for PDF export
      const mcSteps: DerivationStep[] = keys.map(k => ({
        label: `${k} distribution`,
        equation: `μ ± σ`,
        substitution: `μ = ${stats[k].mean.toFixed(4)}, σ = ${stats[k].std.toFixed(4)}`,
        result: `90% CI: [${stats[k].p5.toFixed(4)}, ${stats[k].p95.toFixed(4)}]`,
      }));

      const advResult: AdvancedResult = {
        title: 'Monte Carlo Uncertainty (Gauss OD)',
        value: stats.a.std,
        unit: 'km (1σ in semi-major axis)',
        steps: [
          { label: 'Monte Carlo config', equation: `N = ${samples.length}, σ_obs = ${noiseSigma}″`, substitution: `Gaussian noise on RA,Dec`, result: `${samples.length} valid solutions from ${N} trials` },
          ...mcSteps,
        ],
        interpretation: `Monte Carlo analysis with ${samples.length} perturbed observations (σ = ${noiseSigma}″) shows: a = ${stats.a.mean.toFixed(2)} ± ${stats.a.std.toFixed(2)} km, e = ${stats.e.mean.toFixed(6)} ± ${stats.e.std.toFixed(6)}, i = ${stats.incl.mean.toFixed(4)} ± ${stats.incl.std.toFixed(4)}°. The 90% confidence intervals capture the sensitivity of the Gauss method to measurement noise. Larger observation arcs and lower noise reduce uncertainty.`,
      };

      onResults?.([advResult]);
      setRunning(false);
    }, 50);
  }, [ra1, dec1, t1, ra2, dec2, t2, ra3, dec3, t3, nSamples, noiseSigma, onResults]);

  const labels: Record<string, string> = {
    a: 'a (km)', e: 'e', incl: 'i (°)', RAAN: 'Ω (°)', argPeri: 'ω (°)', nu: 'ν (°)',
  };

  return (
    <AeroCard title="Monte Carlo Uncertainty Analysis" icon={BarChart3}>
      <p className="text-xs text-muted-foreground mb-3">
        Run {nSamples} perturbed observations with Gaussian noise to quantify orbital element uncertainty.
        Shows 1σ/2σ confidence ellipses and statistical distributions.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <AeroFormField label="Samples (N)">
          <Input type="number" value={nSamples} onChange={e => setNSamples(e.target.value)} className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Noise σ (arcsec)">
          <Input type="number" value={noiseSigma} onChange={e => setNoiseSigma(e.target.value)} className="bg-muted/50" />
        </AeroFormField>
      </div>

      <AeroButton onClick={runMC} variant="primary" icon={BarChart3} className="w-full" disabled={running}>
        {running ? 'Running Monte Carlo...' : `Run ${nSamples} Samples`}
      </AeroButton>

      {mcResults && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {/* Stats table */}
          <div className="text-xs font-semibold text-primary mb-1">
            {mcResults.n} valid solutions (σ = {mcResults.sigma}″)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1 text-muted-foreground">Element</th>
                  <th className="text-right py-1 text-muted-foreground">Mean</th>
                  <th className="text-right py-1 text-muted-foreground">1σ</th>
                  <th className="text-right py-1 text-muted-foreground">5th %</th>
                  <th className="text-right py-1 text-muted-foreground">95th %</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(mcResults.stats).map(([k, s]) => (
                  <tr key={k} className="border-b border-border/30">
                    <td className="py-1 font-semibold text-foreground">{labels[k] || k}</td>
                    <td className="text-right py-1">{s.mean.toFixed(4)}</td>
                    <td className="text-right py-1 text-primary">±{s.std.toFixed(4)}</td>
                    <td className="text-right py-1 text-muted-foreground">{s.p5.toFixed(4)}</td>
                    <td className="text-right py-1 text-muted-foreground">{s.p95.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Confidence ellipses */}
          <div className="text-xs font-semibold text-primary mt-3">Confidence Ellipses</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-muted/20 p-2">
              <div className="text-[10px] text-center text-muted-foreground mb-1">a vs e</div>
              <ConfidenceEllipse
                xData={mcResults.samples.map(s => s.a)}
                yData={mcResults.samples.map(s => s.e)}
                xLabel="a (km)" yLabel="e"
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2">
              <div className="text-[10px] text-center text-muted-foreground mb-1">a vs i</div>
              <ConfidenceEllipse
                xData={mcResults.samples.map(s => s.a)}
                yData={mcResults.samples.map(s => s.incl)}
                xLabel="a (km)" yLabel="i (°)"
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2">
              <div className="text-[10px] text-center text-muted-foreground mb-1">Ω vs ω</div>
              <ConfidenceEllipse
                xData={mcResults.samples.map(s => s.RAAN)}
                yData={mcResults.samples.map(s => s.argPeri)}
                xLabel="Ω (°)" yLabel="ω (°)"
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2">
              <div className="text-[10px] text-center text-muted-foreground mb-1">e vs i</div>
              <ConfidenceEllipse
                xData={mcResults.samples.map(s => s.e)}
                yData={mcResults.samples.map(s => s.incl)}
                xLabel="e" yLabel="i (°)"
              />
            </div>
          </div>
        </div>
      )}
    </AeroCard>
  );
}
