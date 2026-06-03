/**
 * Advanced Rocket Analysis Panel
 *
 * Tier-gated tabs:
 *   - Optimum ε finder       (University+)
 *   - Throttling / Pc sweep  (University+)
 *   - Nozzle profile SVG     (University+)
 *   - Multi-stage ΔV builder (Expert)
 *   - Bartz throat heat flux (Expert)
 *   - Shock / separation     (Expert)
 *
 * Additive — does not alter base calculator math.
 */

"use client";

import { useMemo, useState } from "react";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroButton } from "@/components/common/AeroButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Flame, Gauge, Layers, Sparkles, Zap, Activity, Download } from "lucide-react";
import {
  optimumEpsilon,
  bartzHeatFlux,
  summerfieldSeparation,
  multiStageDeltaV,
  nozzleProfile,
  toCSV,
  downloadCSV,
  type Stage,
} from "@/lib/thrust/rocketAdvanced";
import { calculateRocketEngine } from "@/tools/rocketEngine/utils/calcEngine";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

type Tier = "Beginner" | "University" | "Expert";

interface Props {
  tier: Tier;
  defaults?: {
    Pc?: number;     // Pa
    Pa?: number;     // Pa
    gamma?: number;
    Tc?: number;
    cStar?: number;
    Pe?: number;
  };
}

const fmt = (n: number, d = 3) =>
  !Number.isFinite(n) ? "—" : Math.abs(n) >= 1e5 || (Math.abs(n) < 1e-2 && n !== 0)
    ? n.toExponential(d) : n.toFixed(d);

export default function RocketAdvancedPanel({ tier, defaults }: Props) {
  if (tier === "Beginner") return null;

  const [pc, setPc] = useState(String(defaults?.Pc ?? 9.7e6));
  const [pa, setPa] = useState(String(defaults?.Pa ?? 101325));
  const [gamma, setGamma] = useState(String(defaults?.gamma ?? 1.22));

  // --- Optimum ε ---
  const optEps = useMemo(() => {
    const v = optimumEpsilon(parseFloat(pc), parseFloat(pa), parseFloat(gamma));
    return v;
  }, [pc, pa, gamma]);

  // --- Throttling / Pc sweep ---
  const [pcMin, setPcMin] = useState("3e6");
  const [pcMax, setPcMax] = useState("12e6");
  const [throttleEps, setThrottleEps] = useState("16");
  const [throttleTc, setThrottleTc] = useState(String(defaults?.Tc ?? 3500));
  const [throttleMolar, setThrottleMolar] = useState("22");

  const throttleData = useMemo(() => {
    const min = parseFloat(pcMin), max = parseFloat(pcMax);
    const eps = parseFloat(throttleEps), Tc = parseFloat(throttleTc), Mm = parseFloat(throttleMolar);
    if (!(min > 0 && max > min && eps > 1 && Tc > 0 && Mm > 0)) return [];
    const out: Array<{ pc: number; thrust: number; isp: number; cf: number; mdot: number }> = [];
    for (let i = 0; i <= 40; i++) {
      const Pc = min + ((max - min) * i) / 40;
      try {
        const r = calculateRocketEngine({
          Pc, Tc, At: 0.01, epsilon: eps, Pa: parseFloat(pa),
          gamma: parseFloat(gamma), M_molar: Mm,
        });
        out.push({ pc: Pc / 1e6, thrust: r.T / 1000, isp: r.Isp, cf: r.Cf, mdot: r.mdot });
      } catch { /* skip */ }
    }
    return out;
  }, [pcMin, pcMax, throttleEps, throttleTc, throttleMolar, pa, gamma]);

  // --- Nozzle profile SVG ---
  const [profileRt, setProfileRt] = useState("0.05");
  const [profileEps, setProfileEps] = useState("16");
  const profile = useMemo(() => {
    const Rt = parseFloat(profileRt), eps = parseFloat(profileEps);
    if (!(Rt > 0 && eps > 1)) return [];
    return nozzleProfile(Rt, eps, 60);
  }, [profileRt, profileEps]);

  // --- Multi-stage ΔV ---
  const [stages, setStages] = useState<Stage[]>([
    { name: "Stage 1", isp: 282, m0: 549000, mf: 137000 },
    { name: "Stage 2", isp: 348, m0: 116000, mf: 4000 },
  ]);
  const stageResult = useMemo(() => multiStageDeltaV(stages), [stages]);

  // --- Bartz heat flux ---
  const [bDt, setBDt] = useState("0.12");
  const [bCstar, setBCstar] = useState(String(defaults?.cStar ?? 1700));
  const [bTw, setBTw] = useState("800");
  const bartz = useMemo(() => {
    const Pc = parseFloat(pc), Dt = parseFloat(bDt), cStar = parseFloat(bCstar);
    const Tc = parseFloat(throttleTc), g = parseFloat(gamma), Tw = parseFloat(bTw);
    if (!(Pc > 0 && Dt > 0 && cStar > 0 && Tc > 0 && g > 1 && Tw > 0)) return null;
    return bartzHeatFlux({ Pc, Tc, Dt, cStar, gamma: g, Twall: Tw });
  }, [pc, bDt, bCstar, throttleTc, gamma, bTw]);

  // --- Separation ---
  const [pe, setPe] = useState(String(defaults?.Pe ?? 50000));
  const sep = useMemo(() => summerfieldSeparation(parseFloat(pe), parseFloat(pa)), [pe, pa]);

  const exportThrottle = () => {
    if (!throttleData.length) return;
    downloadCSV("throttling_sweep.csv", toCSV(throttleData));
  };

  return (
    <AeroCard
      title="Advanced Analysis"
      description="Optimum nozzle • throttling • stages • heat flux • separation"
      icon={Sparkles}
    >
      <Tabs defaultValue="opt" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 bg-muted/50 mb-4 h-auto">
          <TabsTrigger value="opt" className="text-xs"><Gauge className="w-3 h-3 mr-1" />Optimum ε</TabsTrigger>
          <TabsTrigger value="throttle" className="text-xs"><Activity className="w-3 h-3 mr-1" />Throttling</TabsTrigger>
          <TabsTrigger value="profile" className="text-xs"><Layers className="w-3 h-3 mr-1" />Nozzle Profile</TabsTrigger>
          {tier === "Expert" && <TabsTrigger value="stage" className="text-xs"><Zap className="w-3 h-3 mr-1" />Stages (ΔV)</TabsTrigger>}
          {tier === "Expert" && <TabsTrigger value="heat" className="text-xs"><Flame className="w-3 h-3 mr-1" />Heat / Sep</TabsTrigger>}
        </TabsList>

        {/* ============ Optimum ε ============ */}
        <TabsContent value="opt" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label className="text-xs">Chamber Pressure Pc (Pa)</Label><Input value={pc} onChange={(e) => setPc(e.target.value)} type="number" /></div>
            <div><Label className="text-xs">Ambient Pa (Pa)</Label><Input value={pa} onChange={(e) => setPa(e.target.value)} type="number" /></div>
            <div><Label className="text-xs">γ</Label><Input value={gamma} onChange={(e) => setGamma(e.target.value)} type="number" step="0.01" /></div>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
            <p className="text-xs text-muted-foreground uppercase">Peak-Isp expansion ratio (Pe = Pa)</p>
            <p className="text-2xl font-bold text-primary">{optEps ? `ε ≈ ${optEps.toFixed(2)}` : "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Bisection on isentropic Mach-area relation. Below this ε → underexpanded; above → overexpanded.
            </p>
          </div>
        </TabsContent>

        {/* ============ Throttling ============ */}
        <TabsContent value="throttle" className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div><Label className="text-xs">Pc min (Pa)</Label><Input value={pcMin} onChange={(e) => setPcMin(e.target.value)} type="number" /></div>
            <div><Label className="text-xs">Pc max (Pa)</Label><Input value={pcMax} onChange={(e) => setPcMax(e.target.value)} type="number" /></div>
            <div><Label className="text-xs">ε</Label><Input value={throttleEps} onChange={(e) => setThrottleEps(e.target.value)} type="number" /></div>
            <div><Label className="text-xs">Tc (K)</Label><Input value={throttleTc} onChange={(e) => setThrottleTc(e.target.value)} type="number" /></div>
            <div><Label className="text-xs">M (kg/kmol)</Label><Input value={throttleMolar} onChange={(e) => setThrottleMolar(e.target.value)} type="number" /></div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={throttleData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="pc" tick={{ fontSize: 10 }} label={{ value: "Pc (MPa)", position: "insideBottom", offset: -5, fontSize: 10 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} />
                <RTooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" name="Thrust (kN)" dataKey="thrust" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line yAxisId="r" name="Isp (s)" dataKey="isp" stroke="#f59e0b" dot={false} strokeWidth={2} />
                <Line yAxisId="r" name="Cf" dataKey="cf" stroke="#3b82f6" dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-end">
            <AeroButton onClick={exportThrottle} variant="outline" icon={Download}>Export CSV</AeroButton>
          </div>
        </TabsContent>

        {/* ============ Nozzle profile ============ */}
        <TabsContent value="profile" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Throat radius Rt (m)</Label><Input value={profileRt} onChange={(e) => setProfileRt(e.target.value)} type="number" step="0.001" /></div>
            <div><Label className="text-xs">Expansion ratio ε</Label><Input value={profileEps} onChange={(e) => setProfileEps(e.target.value)} type="number" /></div>
          </div>
          <div className="bg-muted/20 rounded-lg border border-border/50 p-4">
            <ProfileSVG points={profile} />
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              80% bell nozzle (Rao approximation). Throat circle radius = 0.382 Rt; parabolic skirt to exit.
            </p>
          </div>
        </TabsContent>

        {/* ============ Stages ============ */}
        {tier === "Expert" && (
          <TabsContent value="stage" className="space-y-3">
            <div className="space-y-2">
              {stages.map((s, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-end p-2 bg-muted/20 rounded border border-border/50">
                  <div><Label className="text-[10px]">Name</Label><Input value={s.name} onChange={(e) => { const c = [...stages]; c[i] = { ...c[i], name: e.target.value }; setStages(c); }} /></div>
                  <div><Label className="text-[10px]">Isp (s)</Label><Input type="number" value={s.isp} onChange={(e) => { const c = [...stages]; c[i] = { ...c[i], isp: +e.target.value }; setStages(c); }} /></div>
                  <div><Label className="text-[10px]">m₀ (kg)</Label><Input type="number" value={s.m0} onChange={(e) => { const c = [...stages]; c[i] = { ...c[i], m0: +e.target.value }; setStages(c); }} /></div>
                  <div><Label className="text-[10px]">m_f (kg)</Label><Input type="number" value={s.mf} onChange={(e) => { const c = [...stages]; c[i] = { ...c[i], mf: +e.target.value }; setStages(c); }} /></div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <AeroButton variant="outline" onClick={() => setStages([...stages, { name: `Stage ${stages.length + 1}`, isp: 300, m0: 10000, mf: 1500 }])}>+ Add Stage</AeroButton>
              <AeroButton variant="outline" onClick={() => setStages(stages.slice(0, -1))}>− Remove</AeroButton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {stageResult.stages.map((s, i) => (
                <div key={i} className="p-3 bg-muted/30 rounded border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">{s.name}</p>
                  <p className="text-lg font-bold text-primary">{fmt(s.dv, 0)} m/s</p>
                  <p className="text-[10px] text-muted-foreground">Ve {fmt(s.ve, 0)} · m₀/m_f {fmt(s.ratio, 2)}</p>
                </div>
              ))}
              <div className="p-3 bg-emerald-500/10 rounded border border-emerald-500/30 md:col-span-3">
                <p className="text-[10px] text-emerald-400 uppercase">Total mission ΔV</p>
                <p className="text-2xl font-bold text-emerald-400">{fmt(stageResult.total, 0)} m/s</p>
              </div>
            </div>
          </TabsContent>
        )}

        {/* ============ Heat / Separation ============ */}
        {tier === "Expert" && (
          <TabsContent value="heat" className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase">Bartz throat heat flux</p>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Throat dia. Dt (m)</Label><Input value={bDt} onChange={(e) => setBDt(e.target.value)} type="number" step="0.001" /></div>
                <div><Label className="text-xs">c* (m/s)</Label><Input value={bCstar} onChange={(e) => setBCstar(e.target.value)} type="number" /></div>
                <div><Label className="text-xs">Wall T (K)</Label><Input value={bTw} onChange={(e) => setBTw(e.target.value)} type="number" /></div>
              </div>
              {bartz && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="p-2 bg-orange-500/10 rounded border border-orange-500/30">
                    <p className="text-[10px] text-muted-foreground uppercase">Heat flux q″</p>
                    <p className="text-sm font-bold text-orange-400">{fmt(bartz.qFlux / 1e6, 2)} MW/m²</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">h_g</p>
                    <p className="text-sm font-bold">{fmt(bartz.hg, 0)} W/m²·K</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">T_aw</p>
                    <p className="text-sm font-bold">{fmt(bartz.Taw, 0)} K</p>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground mb-2 uppercase">Summerfield separation criterion</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Exit pressure Pe (Pa)</Label><Input value={pe} onChange={(e) => setPe(e.target.value)} type="number" /></div>
                <div><Label className="text-xs">Ambient Pa (Pa)</Label><Input value={pa} onChange={(e) => setPa(e.target.value)} type="number" /></div>
              </div>
              <div className={`mt-2 p-3 rounded border ${sep.separated ? (sep.severity === "severe" ? "bg-red-500/10 border-red-500/40" : "bg-yellow-500/10 border-yellow-500/40") : "bg-emerald-500/10 border-emerald-500/30"}`}>
                <p className="text-xs">Pe/Pa = <span className="font-bold">{fmt(sep.ratio, 3)}</span> · threshold 0.40</p>
                <p className="text-sm font-semibold mt-1">
                  {sep.severity === "severe" ? "⚠ Severe flow separation — internal shocks likely" :
                   sep.separated ? "Mild separation possible" :
                   "✓ Attached flow"}
                </p>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </AeroCard>
  );
}

// --- Inline nozzle profile SVG ---
function ProfileSVG({ points }: { points: Array<{ x: number; r: number }> }) {
  if (!points.length) return <div className="text-muted-foreground text-xs">Enter valid values</div>;
  const xs = points.map((p) => p.x);
  const rs = points.map((p) => p.r);
  const xMax = Math.max(...xs);
  const rMax = Math.max(...rs);
  const W = 600, H = 220, pad = 16;
  const sx = (W - 2 * pad) / xMax;
  const sy = (H / 2 - pad) / rMax;
  const px = (x: number) => pad + x * sx;
  const py = (r: number, sign = 1) => H / 2 - sign * r * sy;
  const top = points.map((p) => `${px(p.x)},${py(p.r, 1)}`).join(" ");
  const bot = points.slice().reverse().map((p) => `${px(p.x)},${py(p.r, -1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="nozGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <polygon points={`${top} ${bot}`} fill="url(#nozGrad)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke="hsl(var(--border))" strokeDasharray="3 3" />
      <circle cx={px(0)} cy={H / 2} r="3" fill="#ef4444" />
      <text x={px(0) + 6} y={H / 2 + 14} fontSize="9" fill="#ef4444">throat</text>
      <text x={W - pad - 30} y={H / 2 + 14} fontSize="9" fill="hsl(var(--primary))">exit</text>
    </svg>
  );
}