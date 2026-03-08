/**
 * Low-Thrust (Electric Propulsion) Spiral Transfer Calculator
 * Continuous thrust orbit raising/lowering with step-by-step equations
 */

import { useState } from 'react';
import { AeroCard } from '@/components/common/AeroCard';
import { AeroButton } from '@/components/common/AeroButton';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap } from 'lucide-react';
import { GM_EARTH, R_EARTH, type AdvancedResult } from '@/lib/advancedOrbitalMechanics';

// ── Presets ──
const EP_PRESETS: Record<string, { name: string; thrust_mN: number; isp: number; power_kW: number; massKg: number }> = {
  hall: { name: 'Hall Thruster (SPT-140)', thrust_mN: 290, isp: 1770, power_kW: 4.5, massKg: 1500 },
  ion: { name: 'Ion Engine (NSTAR)', thrust_mN: 92, isp: 3100, power_kW: 2.3, massKg: 500 },
  vasimr: { name: 'VASIMR (VX-200)', thrust_mN: 6000, isp: 5000, power_kW: 200, massKg: 5000 },
  pps1350: { name: 'PPS-1350 (SMART-1)', thrust_mN: 88, isp: 1640, power_kW: 1.5, massKg: 370 },
  custom: { name: 'Custom', thrust_mN: 0, isp: 0, power_kW: 0, massKg: 0 },
};

const G0 = 9.80665e-3; // km/s²

function computeLowThrust(
  r1_alt_km: number,
  r2_alt_km: number,
  thrust_mN: number,
  isp_s: number,
  massKg: number,
  mu: number = GM_EARTH
): AdvancedResult[] {
  const r1 = r1_alt_km + R_EARTH;
  const r2 = r2_alt_km + R_EARTH;
  const T_N = thrust_mN / 1000; // convert mN to N, but we work in km so T in km units
  const T_km = T_N / 1e6; // N -> kN -> force in km·kg/s² (1 N = 1e-3 kN = 1e-6 km·kg/s²... no)
  // Actually: F in Newtons, m in kg, a in m/s² -> convert to km/s²
  const accel_km_s2 = (T_N / massKg) / 1000; // m/s² -> km/s²

  // Edelbaum's approximation for low-thrust coplanar transfer
  // ΔV = |v1 - v2| for circular-to-circular spiral
  const v1 = Math.sqrt(mu / r1);
  const v2 = Math.sqrt(mu / r2);
  const deltaV = Math.abs(v1 - v2);

  // Exhaust velocity
  const ve = isp_s * G0; // km/s

  // Propellant mass (Tsiolkovsky)
  const massRatio = Math.exp(deltaV / ve);
  const m_propellant = massKg * (1 - 1 / massRatio);

  // Transfer time estimate: t ≈ ΔV / acceleration (simplified for constant thrust)
  const accel_avg = (T_N / 1000) / massKg; // km/s² from N to km: F(N)/m(kg) = m/s², /1000 = km/s²
  const t_seconds = deltaV / accel_avg;
  const t_days = t_seconds / 86400;

  // Number of revolutions (approximate)
  const T_orbit_avg = 2 * Math.PI * Math.sqrt(Math.pow((r1 + r2) / 2, 3) / mu);
  const n_revs = t_seconds / T_orbit_avg;

  // Hohmann comparison
  const a_h = (r1 + r2) / 2;
  const v1h = Math.sqrt(mu * (2 / r1 - 1 / a_h));
  const v2h = Math.sqrt(mu * (2 / r2 - 1 / a_h));
  const dv_hohmann = Math.abs(v1h - v1) + Math.abs(v2 - v2h);
  const T_hohmann = Math.PI * Math.sqrt(Math.pow(a_h, 3) / mu);

  // Efficiency comparison
  const dv_ratio = deltaV / dv_hohmann;

  // Power and specific thrust
  const jetPower = 0.5 * (T_N / 1000) * ve; // kW (F*ve/2) — in km units
  const jetPower_kW = 0.5 * T_N * (isp_s * 9.80665) / 1000; // proper kW

  return [
    {
      title: 'Low-Thrust ΔV (Edelbaum Approximation)',
      value: deltaV,
      unit: 'km/s',
      steps: [
        {
          label: 'Initial circular velocity',
          equation: 'v₁ = √(μ/r₁)',
          substitution: `v₁ = √(${mu}/${r1.toFixed(1)})`,
          result: `${v1.toFixed(4)} km/s`,
        },
        {
          label: 'Final circular velocity',
          equation: 'v₂ = √(μ/r₂)',
          substitution: `v₂ = √(${mu}/${r2.toFixed(1)})`,
          result: `${v2.toFixed(4)} km/s`,
        },
        {
          label: 'Low-thrust ΔV (coplanar spiral)',
          equation: 'ΔV_LT = |v₁ - v₂|',
          substitution: `ΔV = |${v1.toFixed(4)} - ${v2.toFixed(4)}|`,
          result: `${deltaV.toFixed(4)} km/s`,
        },
        {
          label: 'Hohmann ΔV (comparison)',
          equation: 'ΔV_H = |v₁ₜ - v₁| + |v₂ - v₂ₜ|',
          substitution: `ΔV_H = ${dv_hohmann.toFixed(4)} km/s`,
          result: `ΔV_LT/ΔV_H = ${dv_ratio.toFixed(4)} (${(dv_ratio * 100).toFixed(1)}%)`,
        },
      ],
      interpretation: `The low-thrust spiral requires ΔV = ${deltaV.toFixed(3)} km/s, which is ${dv_ratio < 1 ? 'less' : 'more'} than the Hohmann ΔV of ${dv_hohmann.toFixed(3)} km/s. For coplanar circular-to-circular transfers, the low-thrust ΔV equals the difference of circular velocities (Edelbaum's result). ${r2 > r1 ? 'The spiral continuously raises the orbit by thrusting along the velocity vector.' : 'The spiral continuously lowers the orbit by thrusting retrograde.'} This is fundamentally different from impulsive transfers.`,
    },
    {
      title: 'Propellant Mass & Mass Ratio',
      value: m_propellant,
      unit: 'kg',
      steps: [
        {
          label: 'Exhaust velocity',
          equation: 'vₑ = Isp × g₀',
          substitution: `vₑ = ${isp_s} × ${G0.toFixed(5)}`,
          result: `${ve.toFixed(4)} km/s`,
        },
        {
          label: 'Mass ratio (Tsiolkovsky)',
          equation: 'MR = exp(ΔV/vₑ)',
          substitution: `MR = exp(${deltaV.toFixed(4)}/${ve.toFixed(4)})`,
          result: `${massRatio.toFixed(6)}`,
        },
        {
          label: 'Propellant mass',
          equation: 'mₚ = m₀(1 - 1/MR)',
          substitution: `mₚ = ${massKg} × (1 - 1/${massRatio.toFixed(6)})`,
          result: `${m_propellant.toFixed(2)} kg`,
        },
        {
          label: 'Propellant fraction',
          equation: 'f = mₚ/m₀',
          substitution: `f = ${m_propellant.toFixed(2)}/${massKg}`,
          result: `${((m_propellant / massKg) * 100).toFixed(2)}%`,
        },
      ],
      interpretation: `With Isp = ${isp_s} s (vₑ = ${ve.toFixed(2)} km/s), only ${m_propellant.toFixed(1)} kg of propellant is needed (${((m_propellant / massKg) * 100).toFixed(1)}% of spacecraft mass). High-Isp electric propulsion is extremely propellant-efficient — a chemical thruster (Isp ~320s) would need ${(massKg * (1 - 1 / Math.exp(deltaV / (0.320 * G0)))).toFixed(0)} kg for the same ΔV. The tradeoff is transfer time.`,
    },
    {
      title: 'Transfer Duration & Revolutions',
      value: t_days,
      unit: 'days',
      steps: [
        {
          label: 'Spacecraft acceleration',
          equation: 'a = F/m₀',
          substitution: `a = ${T_N.toFixed(4)} N / ${massKg} kg`,
          result: `${(accel_avg * 1000).toExponential(3)} m/s² (${(accel_avg * 1e6).toFixed(2)} mm/s²)`,
        },
        {
          label: 'Approximate transfer time',
          equation: 't ≈ ΔV / a',
          substitution: `t = ${deltaV.toFixed(4)} / ${accel_avg.toExponential(4)}`,
          result: `${t_seconds.toFixed(0)} s = ${t_days.toFixed(1)} days`,
        },
        {
          label: 'Average orbital period',
          equation: 'T_avg = 2π√(r_avg³/μ)',
          substitution: `T_avg = 2π√(${((r1 + r2) / 2).toFixed(0)}³/${mu})`,
          result: `${T_orbit_avg.toFixed(0)} s (${(T_orbit_avg / 3600).toFixed(1)} hr)`,
        },
        {
          label: 'Number of spiral revolutions',
          equation: 'N ≈ t / T_avg',
          substitution: `N = ${t_seconds.toFixed(0)} / ${T_orbit_avg.toFixed(0)}`,
          result: `≈ ${n_revs.toFixed(0)} revolutions`,
        },
      ],
      interpretation: `The low-thrust transfer takes approximately ${t_days.toFixed(0)} days (${(t_days / 30.44).toFixed(1)} months), spiraling through ~${n_revs.toFixed(0)} revolutions. Compare to a Hohmann transfer: ${(T_hohmann / 3600).toFixed(1)} hours. This ${(t_days * 86400 / T_hohmann).toFixed(0)}× time increase is the fundamental cost of electric propulsion. However, the propellant savings enable either smaller launch vehicles or more payload mass — making EP ideal for cargo, station-keeping, and deep-space missions.`,
    },
    {
      title: 'Thruster Performance Summary',
      value: jetPower_kW,
      unit: 'kW (jet)',
      steps: [
        {
          label: 'Jet power',
          equation: 'P_jet = ½ × F × vₑ',
          substitution: `P_jet = 0.5 × ${T_N.toFixed(4)} × ${(isp_s * 9.80665).toFixed(1)}`,
          result: `${jetPower_kW.toFixed(2)} kW`,
        },
        {
          label: 'Thrust-to-weight ratio',
          equation: 'T/W = F / (m₀ × g₀)',
          substitution: `T/W = ${T_N.toFixed(4)} / (${massKg} × 9.80665)`,
          result: `${(T_N / (massKg * 9.80665)).toExponential(3)}`,
        },
        {
          label: 'Total impulse',
          equation: 'I_total = F × t',
          substitution: `I = ${T_N.toFixed(4)} × ${t_seconds.toFixed(0)}`,
          result: `${(T_N * t_seconds).toFixed(0)} N·s (${(T_N * t_seconds / 1000).toFixed(1)} kN·s)`,
        },
        {
          label: 'Characteristic acceleration',
          equation: 'a_c = F/m₀',
          substitution: `a_c = ${(T_N * 1000).toFixed(1)} mN / ${massKg} kg`,
          result: `${((T_N / massKg) * 1e6).toFixed(2)} μm/s² = ${((T_N / massKg) * 1000).toFixed(4)} mm/s²`,
        },
      ],
      interpretation: `The thruster produces ${(T_N * 1000).toFixed(0)} mN at Isp ${isp_s} s, requiring ${jetPower_kW.toFixed(1)} kW jet power. The thrust-to-weight ratio is ~${(T_N / (massKg * 9.80665)).toExponential(2)} — orders of magnitude less than chemical propulsion. EP cannot launch from a surface; it's designed for in-space maneuvers where continuous micro-thrust accumulates over weeks/months. SMART-1, Dawn, BepiColombo, and Starlink all use electric propulsion.`,
    },
  ];
}

interface LowThrustOptimizerProps {
  onResults?: (results: AdvancedResult[]) => void;
}

export function LowThrustOptimizer({ onResults }: LowThrustOptimizerProps) {
  const [preset, setPreset] = useState('hall');
  const [thrust, setThrust] = useState('290');
  const [isp, setIsp] = useState('1770');
  const [mass, setMass] = useState('1500');
  const [r1Alt, setR1Alt] = useState('400');
  const [r2Alt, setR2Alt] = useState('35786');
  const [results, setResults] = useState<AdvancedResult[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const applyPreset = (key: string) => {
    setPreset(key);
    const p = EP_PRESETS[key];
    if (p && key !== 'custom') {
      setThrust(p.thrust_mN.toString());
      setIsp(p.isp.toString());
      setMass(p.massKg.toString());
    }
  };

  const compute = () => {
    const T = parseFloat(thrust);
    const I = parseFloat(isp);
    const m = parseFloat(mass);
    const alt1 = parseFloat(r1Alt);
    const alt2 = parseFloat(r2Alt);
    if ([T, I, m, alt1, alt2].some(isNaN)) return;
    const res = computeLowThrust(alt1, alt2, T, I, m);
    setResults(res);
    onResults?.(res);
  };

  return (
    <AeroCard title="Low-Thrust Spiral Transfer (Electric Propulsion)" icon={Zap}>
      <p className="text-xs text-muted-foreground mb-3">
        Compute continuous low-thrust orbit transfers using Edelbaum's approximation.
        Includes propellant mass, transfer time, and comparison with impulsive Hohmann transfer.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <AeroFormField label="Thruster Preset">
          <Select value={preset} onValueChange={applyPreset}>
            <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(EP_PRESETS).map(([k, p]) => (
                <SelectItem key={k} value={k}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AeroFormField>
        <AeroFormField label="Spacecraft Mass (kg)">
          <Input type="number" value={mass} onChange={e => setMass(e.target.value)} placeholder="1500" className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Thrust (mN)">
          <Input type="number" value={thrust} onChange={e => setThrust(e.target.value)} placeholder="290" className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Isp (seconds)">
          <Input type="number" value={isp} onChange={e => setIsp(e.target.value)} placeholder="1770" className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Initial Altitude (km)">
          <Input type="number" value={r1Alt} onChange={e => setR1Alt(e.target.value)} placeholder="400" className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Target Altitude (km)">
          <Input type="number" value={r2Alt} onChange={e => setR2Alt(e.target.value)} placeholder="35786" className="bg-muted/50" />
        </AeroFormField>
      </div>

      <AeroButton onClick={compute} variant="primary" icon={Zap} className="w-full">
        Calculate Low-Thrust Transfer
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
