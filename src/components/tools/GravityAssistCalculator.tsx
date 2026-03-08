/**
 * Gravity Assist (Flyby) Calculator
 * Computes ΔV amplification from planetary flyby with step-by-step vector geometry
 */

import { useState } from 'react';
import { AeroCard } from '@/components/common/AeroCard';
import { AeroButton } from '@/components/common/AeroButton';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Orbit } from 'lucide-react';
import { PLANETS, type AdvancedResult, type DerivationStep } from '@/lib/advancedOrbitalMechanics';

// Flyby body data: name, GM (km³/s²), radius (km), SOI radius (km approx)
const FLYBY_BODIES: Record<string, { name: string; gm: number; radius: number; soiRadius: number; vPlanet: number }> = {
  venus:   { name: 'Venus',   gm: 324859,     radius: 6052,  soiRadius: 616000,  vPlanet: 35.02 },
  earth:   { name: 'Earth',   gm: 398600,     radius: 6371,  soiRadius: 925000,  vPlanet: 29.78 },
  mars:    { name: 'Mars',    gm: 42828,      radius: 3390,  soiRadius: 577000,  vPlanet: 24.07 },
  jupiter: { name: 'Jupiter', gm: 126686534,  radius: 69911, soiRadius: 48200000, vPlanet: 13.07 },
  saturn:  { name: 'Saturn',  gm: 37931187,   radius: 58232, soiRadius: 54800000, vPlanet: 9.69 },
};

export interface GravityAssistResult {
  results: AdvancedResult[];
}

function computeGravityAssist(
  flybyBody: string,
  vInfIn: number,
  rPeriapsis: number,
  turnAngleInput?: number
): AdvancedResult[] {
  const body = FLYBY_BODIES[flybyBody];
  if (!body) return [];

  const mu = body.gm;
  const rP = rPeriapsis;
  const vInf = vInfIn;

  // Hyperbolic flyby geometry
  // Semi-major axis of hyperbola: a = -μ/v∞²
  const a_hyp = mu / (vInf * vInf);

  // Eccentricity: e = 1 + rP/a = 1 + rP·v∞²/μ
  const e_hyp = 1 + (rP * vInf * vInf) / mu;

  // Turn angle (deflection): δ = 2·arcsin(1/e)
  const delta_rad = 2 * Math.asin(1 / e_hyp);
  const delta_deg = delta_rad * (180 / Math.PI);

  // Velocity at periapsis of hyperbola
  const vPeri = Math.sqrt(vInf * vInf + 2 * mu / rP);

  // ΔV from gravity assist (heliocentric frame)
  // |Δv| = 2·v∞·sin(δ/2)
  const deltaV = 2 * vInf * Math.sin(delta_rad / 2);

  // Max possible ΔV (180° turn, impossible but theoretical limit)
  const deltaV_max = 2 * vInf;

  // Altitude above surface
  const altitude = rP - body.radius;

  // B-plane impact parameter
  const b_param = a_hyp * Math.sqrt(e_hyp * e_hyp - 1);

  return [
    {
      title: `Flyby Hyperbola at ${body.name}`,
      value: delta_deg,
      unit: '°',
      steps: [
        {
          label: 'Hyperbolic semi-major axis',
          equation: 'a = μ / v∞²',
          substitution: `a = ${mu} / ${vInf.toFixed(2)}²`,
          result: `${a_hyp.toFixed(2)} km`,
        },
        {
          label: 'Hyperbolic eccentricity',
          equation: 'e = 1 + rₚ·v∞²/μ',
          substitution: `e = 1 + ${rP.toFixed(0)}×${vInf.toFixed(2)}²/${mu}`,
          result: `${e_hyp.toFixed(6)}`,
        },
        {
          label: 'Turn angle (deflection)',
          equation: 'δ = 2·arcsin(1/e)',
          substitution: `δ = 2·arcsin(1/${e_hyp.toFixed(6)})`,
          result: `${delta_deg.toFixed(2)}°`,
        },
        {
          label: 'Periapsis velocity',
          equation: 'vₚ = √(v∞² + 2μ/rₚ)',
          substitution: `vₚ = √(${vInf.toFixed(2)}² + 2×${mu}/${rP.toFixed(0)})`,
          result: `${vPeri.toFixed(4)} km/s`,
        },
      ],
      interpretation: `The spacecraft approaches ${body.name} with v∞ = ${vInf.toFixed(2)} km/s and passes at ${altitude.toFixed(0)} km altitude (rₚ = ${rP.toFixed(0)} km). The hyperbolic flyby has eccentricity e = ${e_hyp.toFixed(4)}, creating a ${delta_deg.toFixed(1)}° deflection. At closest approach, the velocity peaks at ${vPeri.toFixed(2)} km/s.`,
    },
    {
      title: `Heliocentric ΔV Gain`,
      value: deltaV,
      unit: 'km/s',
      steps: [
        {
          label: 'ΔV from flyby (vector geometry)',
          equation: '|Δv| = 2·v∞·sin(δ/2)',
          substitution: `|Δv| = 2×${vInf.toFixed(2)}×sin(${(delta_deg / 2).toFixed(2)}°)`,
          result: `${deltaV.toFixed(4)} km/s`,
        },
        {
          label: 'Maximum theoretical ΔV (180° turn)',
          equation: '|Δv|_max = 2·v∞',
          substitution: `|Δv|_max = 2×${vInf.toFixed(2)}`,
          result: `${deltaV_max.toFixed(4)} km/s`,
        },
        {
          label: 'Deflection efficiency',
          equation: 'η = |Δv| / |Δv|_max × 100%',
          substitution: `η = ${deltaV.toFixed(4)} / ${deltaV_max.toFixed(4)} × 100`,
          result: `${((deltaV / deltaV_max) * 100).toFixed(1)}%`,
        },
        {
          label: 'B-plane impact parameter',
          equation: 'b = a·√(e² - 1)',
          substitution: `b = ${a_hyp.toFixed(2)}×√(${e_hyp.toFixed(4)}² - 1)`,
          result: `${b_param.toFixed(0)} km`,
        },
      ],
      interpretation: `The gravity assist at ${body.name} provides a free ΔV of ${deltaV.toFixed(2)} km/s in the heliocentric frame — equivalent to a propulsive maneuver but requiring zero fuel. This is ${((deltaV / deltaV_max) * 100).toFixed(0)}% of the theoretical maximum. ${body.name === 'Jupiter' ? 'Jupiter is the most powerful gravity assist body in the solar system due to its enormous mass.' : ''} The b-plane targeting parameter is ${b_param.toFixed(0)} km. Voyager 1 & 2, Cassini, and New Horizons all used gravity assists to reach the outer solar system.`,
    },
    {
      title: `Flyby Geometry Summary`,
      value: altitude,
      unit: 'km altitude',
      steps: [
        {
          label: 'Closest approach altitude',
          equation: 'h = rₚ - R_body',
          substitution: `h = ${rP.toFixed(0)} - ${body.radius}`,
          result: `${altitude.toFixed(0)} km`,
        },
        {
          label: 'Planet velocity (heliocentric)',
          equation: 'v_planet ≈ √(μ_☉/r)',
          substitution: `v_planet`,
          result: `${body.vPlanet.toFixed(2)} km/s`,
        },
        {
          label: 'Post-flyby velocity range',
          equation: 'v_out = v_planet ± Δv',
          substitution: `v_out = ${body.vPlanet.toFixed(2)} ± ${deltaV.toFixed(2)}`,
          result: `${(body.vPlanet - deltaV).toFixed(2)} to ${(body.vPlanet + deltaV).toFixed(2)} km/s`,
        },
        {
          label: 'SOI radius',
          equation: 'r_SOI',
          substitution: `Sphere of influence`,
          result: `${body.soiRadius.toFixed(0)} km`,
        },
      ],
      interpretation: `The flyby occurs at ${altitude.toFixed(0)} km altitude above ${body.name}'s surface. The spacecraft enters and exits the sphere of influence (r = ${body.soiRadius.toFixed(0)} km) with the same speed relative to ${body.name} (v∞ = ${vInf.toFixed(2)} km/s), but the direction changes by ${delta_deg.toFixed(1)}°. In the heliocentric frame, this direction change translates to a velocity boost or reduction depending on flyby geometry (leading-side vs trailing-side).`,
    },
  ];
}

interface GravityAssistCalculatorProps {
  onResults?: (results: AdvancedResult[]) => void;
}

export function GravityAssistCalculator({ onResults }: GravityAssistCalculatorProps) {
  const [flybyBody, setFlybyBody] = useState('jupiter');
  const [vInf, setVInf] = useState('5.5');
  const [periAlt, setPeriAlt] = useState('');
  const [results, setResults] = useState<AdvancedResult[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const compute = () => {
    const body = FLYBY_BODIES[flybyBody];
    if (!body) return;
    const v = parseFloat(vInf);
    const alt = parseFloat(periAlt) || 500; // default 500 km altitude
    const rP = body.radius + alt;
    if (isNaN(v) || v <= 0) return;
    const res = computeGravityAssist(flybyBody, v, rP);
    setResults(res);
    onResults?.(res);
  };

  return (
    <AeroCard title="Gravity Assist (Flyby) Calculator" icon={Orbit}>
      <p className="text-xs text-muted-foreground mb-3">
        Compute ΔV amplification from a planetary flyby with step-by-step hyperbolic trajectory geometry.
        Used by Voyager, Cassini, New Horizons, and Parker Solar Probe missions.
      </p>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <AeroFormField label="Flyby Body">
          <Select value={flybyBody} onValueChange={setFlybyBody}>
            <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(FLYBY_BODIES).map(([k, b]) => (
                <SelectItem key={k} value={k}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AeroFormField>
        <AeroFormField label="v∞ (km/s)">
          <Input type="number" value={vInf} onChange={e => setVInf(e.target.value)} placeholder="5.5" className="bg-muted/50" step="0.1" />
        </AeroFormField>
        <AeroFormField label="Periapsis Alt (km)">
          <Input type="number" value={periAlt} onChange={e => setPeriAlt(e.target.value)} placeholder="500" className="bg-muted/50" />
        </AeroFormField>
      </div>
      <AeroButton onClick={compute} variant="primary" icon={Orbit} className="w-full">
        Calculate Gravity Assist
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
