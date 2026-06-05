/**
 * Advanced Aircraft Analysis Panel
 *
 * Tier-gated tabs:
 *   - Drag polar (University+)
 *   - Service ceiling (University+)
 *   - Breguet range / endurance (University+)
 *   - V-n diagram (Expert)
 *   - Thrust lapse (Expert)
 *   - Sustained turn (Expert)
 */

"use client";

import { useMemo, useState } from "react";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroButton } from "@/components/common/AeroButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Activity, Gauge, Wind, Rocket, Plane, Download, Beaker, LayoutGrid, Route, BarChart3 } from "lucide-react";
import {
  vnDiagram, cornerVelocity, serviceCeilingSweep, dragPolar, maxLD,
  breguetRangeJet, breguetEnduranceJet, breguetRangeProp, breguetEnduranceProp,
  thrustLapseSweep, sustainedTurnRateDegPerS, turnRadiusM, type EngineClass,
  AIRCRAFT_PRESETS, thrustVsMachSweep, sizingDiagram, missionFuelBurn,
  type MissionSegment,
} from "@/lib/thrust/aircraftAdvanced";
import { toCSV, downloadCSV } from "@/lib/thrust/rocketAdvanced";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  ReferenceLine, Legend, Area, ComposedChart,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tier = "Beginner" | "University" | "Expert";

interface Props {
  tier: Tier;
  defaults?: {
    weightN?: number;
    wingAreaM2?: number;
    thrustN?: number;
    cd0?: number;
    k?: number;
    clMax?: number;
    vCruiseMs?: number;
  };
}

const fmt = (n: number, d = 2) =>
  !Number.isFinite(n) ? "—" :
    Math.abs(n) >= 1e5 ? n.toExponential(d) : n.toFixed(d);

export default function AircraftAdvancedPanel({ tier, defaults }: Props) {
  if (tier === "Beginner") return null;

  // Shared inputs (prefill from main calculator)
  const [cd0, setCd0] = useState(String(defaults?.cd0 ?? 0.02));
  const [k, setK] = useState(String(defaults?.k ?? 0.045));
  const [thrustN, setThrustN] = useState(String(defaults?.thrustN ?? 80000));
  const [weightN, setWeightN] = useState(String(defaults?.weightN ?? 78000 * 9.81));
  const [wingAreaM2, setWingAreaM2] = useState(String(defaults?.wingAreaM2 ?? 122));

  // --- Drag polar ---
  const polar = useMemo(() => dragPolar(parseFloat(cd0), parseFloat(k), -0.5, 2.0, 60), [cd0, k]);
  const ld = useMemo(() => maxLD(parseFloat(cd0), parseFloat(k)), [cd0, k]);

  // --- Service ceiling ---
  const [lapseExp, setLapseExp] = useState("0.7");
  const ceiling = useMemo(() => serviceCeilingSweep({
    thrustN: parseFloat(thrustN),
    weightN: parseFloat(weightN),
    wingAreaM2: parseFloat(wingAreaM2),
    cd0: parseFloat(cd0),
    k: parseFloat(k),
    thrustLapseExponent: parseFloat(lapseExp),
    hMaxM: 20000,
    steps: 40,
  }), [thrustN, weightN, wingAreaM2, cd0, k, lapseExp]);

  // --- Breguet ---
  const [engineKind, setEngineKind] = useState<"jet" | "prop">("jet");
  const [vCruiseMs, setVCruiseMs] = useState(String(defaults?.vCruiseMs ?? 230));
  const [tsfc, setTsfc] = useState("1.7e-5"); // 1/s (~0.6 lb/(lbf·hr))
  const [bsfc, setBsfc] = useState("8e-8");
  const [etaProp, setEtaProp] = useState("0.85");
  const [w0, setW0] = useState("80000");
  const [w1, setW1] = useState("55000");
  const breguet = useMemo(() => {
    const W0 = parseFloat(w0), W1 = parseFloat(w1), V = parseFloat(vCruiseMs);
    const ldVal = ld.ldMax;
    if (engineKind === "jet") {
      const c = parseFloat(tsfc);
      return {
        range: breguetRangeJet(V, c, ldVal, W0, W1),
        endurance: breguetEnduranceJet(c, ldVal, W0, W1),
      };
    }
    const c = parseFloat(bsfc);
    const eta = parseFloat(etaProp);
    return {
      range: breguetRangeProp(eta, c, ldVal, W0, W1),
      endurance: breguetEnduranceProp(eta, c, ldVal, W0, W1, V),
    };
  }, [engineKind, vCruiseMs, tsfc, bsfc, etaProp, w0, w1, ld]);

  // --- V-n diagram ---
  const [clMax, setClMax] = useState(String(defaults?.clMax ?? 1.6));
  const [nLimitPos, setNLimitPos] = useState("2.5");
  const [nLimitNeg, setNLimitNeg] = useState("-1.0");
  const wsKg = useMemo(() => {
    const W = parseFloat(weightN), S = parseFloat(wingAreaM2);
    return W > 0 && S > 0 ? (W / 9.81) / S : 0;
  }, [weightN, wingAreaM2]);
  const vn = useMemo(() => vnDiagram({
    wsKgPerM2: wsKg,
    clMax: parseFloat(clMax),
    nLimitPos: parseFloat(nLimitPos),
    nLimitNeg: parseFloat(nLimitNeg),
    vCruiseMs: parseFloat(vCruiseMs),
  }), [wsKg, clMax, nLimitPos, nLimitNeg, vCruiseMs]);
  const corner = useMemo(() => cornerVelocity(wsKg, parseFloat(clMax), parseFloat(nLimitPos)), [wsKg, clMax, nLimitPos]);

  // --- Thrust lapse ---
  const [engClass, setEngClass] = useState<EngineClass>("highBypass");
  const lapse = useMemo(() => thrustLapseSweep(engClass, 1.5, 5, 30), [engClass]);
  // Reshape for charting: group by altitude
  const lapseGrouped = useMemo(() => {
    const map = new Map<number, Array<{ mach: number; thrustRatio: number }>>();
    for (const p of lapse) {
      if (!map.has(p.altM)) map.set(p.altM, []);
      map.get(p.altM)!.push({ mach: p.mach, thrustRatio: p.thrustRatio });
    }
    // merge into single array keyed by mach
    const machSet = Array.from(new Set(lapse.map((p) => p.mach))).sort((a, b) => a - b);
    const rows = machSet.map((m) => {
      const row: Record<string, number> = { mach: m };
      for (const [alt, pts] of map) {
        const found = pts.find((p) => Math.abs(p.mach - m) < 1e-6);
        if (found) row[`h${alt}`] = found.thrustRatio;
      }
      return row;
    });
    return { rows, altitudes: Array.from(map.keys()).sort((a, b) => a - b) };
  }, [lapse]);

  // --- Sustained turn ---
  const [turnV, setTurnV] = useState("250");
  const [turnN, setTurnN] = useState("4");
  const turnRate = sustainedTurnRateDegPerS(parseFloat(turnV), parseFloat(turnN));
  const turnR = turnRadiusM(parseFloat(turnV), parseFloat(turnN));

  const exportPolar = () => downloadCSV("drag_polar.csv", toCSV(polar.map((p) => ({ cl: p.cl, cd: p.cd, ld: p.ld }))));
  const exportCeiling = () => downloadCSV("service_ceiling.csv", toCSV(ceiling.points.map((p) => ({ altitudeM: p.altM, rocMs: p.rocMs, rocFpm: p.rocFpm, vBestMs: p.vBestMs }))));

  const colors = ["hsl(var(--primary))", "#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

  return (
    <AeroCard
      title="Advanced Aircraft Analysis"
      description="Drag polar • service ceiling • Breguet • V-n • thrust lapse • turn"
      icon={Sparkles}
    >
      {/* shared inputs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4 p-2 bg-muted/20 rounded border border-border/40">
        <div><Label className="text-[10px]">CD₀</Label><Input value={cd0} onChange={(e) => setCd0(e.target.value)} type="number" step="0.001" /></div>
        <div><Label className="text-[10px]">k</Label><Input value={k} onChange={(e) => setK(e.target.value)} type="number" step="0.001" /></div>
        <div><Label className="text-[10px]">Weight (N)</Label><Input value={weightN} onChange={(e) => setWeightN(e.target.value)} type="number" /></div>
        <div><Label className="text-[10px]">Wing area (m²)</Label><Input value={wingAreaM2} onChange={(e) => setWingAreaM2(e.target.value)} type="number" /></div>
        <div><Label className="text-[10px]">Thrust SL (N)</Label><Input value={thrustN} onChange={(e) => setThrustN(e.target.value)} type="number" /></div>
      </div>

      <Tabs defaultValue="polar" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 bg-muted/50 mb-4 h-auto">
          <TabsTrigger value="polar" className="text-xs"><Activity className="w-3 h-3 mr-1" />Drag Polar</TabsTrigger>
          <TabsTrigger value="ceiling" className="text-xs"><Gauge className="w-3 h-3 mr-1" />Ceiling</TabsTrigger>
          <TabsTrigger value="breguet" className="text-xs"><Plane className="w-3 h-3 mr-1" />Breguet</TabsTrigger>
          {tier === "Expert" && <TabsTrigger value="vn" className="text-xs"><Wind className="w-3 h-3 mr-1" />V-n</TabsTrigger>}
          {tier === "Expert" && <TabsTrigger value="lapse" className="text-xs"><Rocket className="w-3 h-3 mr-1" />Lapse</TabsTrigger>}
          {tier === "Expert" && <TabsTrigger value="turn" className="text-xs"><Activity className="w-3 h-3 mr-1" />Turn</TabsTrigger>}
        </TabsList>

        {/* ----- Drag polar ----- */}
        <TabsContent value="polar" className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-primary/10 rounded border border-primary/30">
              <p className="text-[10px] text-muted-foreground uppercase">(L/D)_max</p>
              <p className="text-lg font-bold text-primary">{fmt(ld.ldMax, 2)}</p>
            </div>
            <div className="p-2 bg-muted/30 rounded border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase">CL at (L/D)_max</p>
              <p className="text-lg font-bold">{fmt(ld.clOpt, 3)}</p>
            </div>
            <div className="p-2 bg-muted/30 rounded border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase">CD₀ + k·CL²</p>
              <p className="text-xs font-mono">CD₀={cd0} · k={k}</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={polar}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="cd" tick={{ fontSize: 10 }} label={{ value: "CD", position: "insideBottom", offset: -5, fontSize: 10 }} type="number" />
                <YAxis dataKey="cl" tick={{ fontSize: 10 }} label={{ value: "CL", angle: -90, position: "insideLeft", fontSize: 10 }} />
                <RTooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 10 }} formatter={(v: number) => v.toFixed(3)} />
                <Line dataKey="cl" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-end"><AeroButton onClick={exportPolar} variant="outline" icon={Download}>Export CSV</AeroButton></div>
        </TabsContent>

        {/* ----- Service ceiling ----- */}
        <TabsContent value="ceiling" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Thrust lapse exponent n</Label><Input value={lapseExp} onChange={(e) => setLapseExp(e.target.value)} type="number" step="0.05" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/30">
                <p className="text-[10px] text-muted-foreground uppercase">Service ceiling</p>
                <p className="text-base font-bold text-emerald-400">{fmt(ceiling.serviceCeilingM / 1000, 1)} km · {fmt(ceiling.serviceCeilingM * 3.281, 0)} ft</p>
              </div>
              <div className="p-2 bg-muted/30 rounded border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase">Absolute ceiling</p>
                <p className="text-base font-bold">{fmt(ceiling.absoluteCeilingM / 1000, 1)} km</p>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={ceiling.points}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="altM" tick={{ fontSize: 10 }} label={{ value: "Altitude (m)", position: "insideBottom", offset: -5, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: "ROC (m/s)", angle: -90, position: "insideLeft", fontSize: 10 }} />
                <RTooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 10 }} formatter={(v: number) => v.toFixed(2)} />
                <ReferenceLine y={0.508} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "100 fpm", fontSize: 9, fill: "#f59e0b" }} />
                <Line dataKey="rocMs" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-end"><AeroButton onClick={exportCeiling} variant="outline" icon={Download}>Export CSV</AeroButton></div>
        </TabsContent>

        {/* ----- Breguet ----- */}
        <TabsContent value="breguet" className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setEngineKind("jet")} className={`px-3 py-1 text-xs rounded ${engineKind === "jet" ? "bg-primary/20 text-primary" : "bg-muted/50"}`}>Jet</button>
            <button onClick={() => setEngineKind("prop")} className={`px-3 py-1 text-xs rounded ${engineKind === "prop" ? "bg-primary/20 text-primary" : "bg-muted/50"}`}>Prop</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><Label className="text-[10px]">V cruise (m/s)</Label><Input value={vCruiseMs} onChange={(e) => setVCruiseMs(e.target.value)} type="number" /></div>
            <div><Label className="text-[10px]">W₀ (N)</Label><Input value={w0} onChange={(e) => setW0(e.target.value)} type="number" /></div>
            <div><Label className="text-[10px]">W₁ (N)</Label><Input value={w1} onChange={(e) => setW1(e.target.value)} type="number" /></div>
            {engineKind === "jet" ? (
              <div><Label className="text-[10px]">TSFC (1/s)</Label><Input value={tsfc} onChange={(e) => setTsfc(e.target.value)} type="number" /></div>
            ) : (
              <>
                <div><Label className="text-[10px]">BSFC (1/s)</Label><Input value={bsfc} onChange={(e) => setBsfc(e.target.value)} type="number" /></div>
                <div><Label className="text-[10px]">η prop</Label><Input value={etaProp} onChange={(e) => setEtaProp(e.target.value)} type="number" step="0.01" /></div>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-primary/10 rounded border border-primary/30">
              <p className="text-[10px] text-muted-foreground uppercase">Range</p>
              <p className="text-xl font-bold text-primary">{fmt(breguet.range / 1000, 0)} km</p>
              <p className="text-[10px] text-muted-foreground">{fmt(breguet.range / 1852, 0)} nmi</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded border border-emerald-500/30">
              <p className="text-[10px] text-muted-foreground uppercase">Endurance</p>
              <p className="text-xl font-bold text-emerald-400">{fmt(breguet.endurance / 3600, 2)} hr</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Uses (L/D)_max = {fmt(ld.ldMax, 2)} from drag polar.</p>
        </TabsContent>

        {/* ----- V-n ----- */}
        {tier === "Expert" && (
          <TabsContent value="vn" className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div><Label className="text-[10px]">CL max</Label><Input value={clMax} onChange={(e) => setClMax(e.target.value)} type="number" step="0.05" /></div>
              <div><Label className="text-[10px]">n+ limit</Label><Input value={nLimitPos} onChange={(e) => setNLimitPos(e.target.value)} type="number" step="0.1" /></div>
              <div><Label className="text-[10px]">n− limit</Label><Input value={nLimitNeg} onChange={(e) => setNLimitNeg(e.target.value)} type="number" step="0.1" /></div>
              <div className="p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
                <p className="text-[10px] text-muted-foreground uppercase">Corner V*</p>
                <p className="text-sm font-bold text-yellow-400">{fmt(corner, 1)} m/s</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={vn}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis dataKey="v" tick={{ fontSize: 10 }} label={{ value: "V (m/s)", position: "insideBottom", offset: -5, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: "Load factor n", angle: -90, position: "insideLeft", fontSize: 10 }} />
                  <RTooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 10 }} formatter={(v: number) => v.toFixed(2)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Line name="n+ envelope" dataKey="nPos" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                  <Line name="n− envelope" dataKey="nNeg" stroke="#ef4444" dot={false} strokeWidth={2} />
                  <Line name="Gust +" dataKey="nGustPos" stroke="#f59e0b" dot={false} strokeDasharray="4 4" />
                  <Line name="Gust −" dataKey="nGustNeg" stroke="#f59e0b" dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        )}

        {/* ----- Lapse ----- */}
        {tier === "Expert" && (
          <TabsContent value="lapse" className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {(["turbojet", "lowBypass", "highBypass", "turboprop"] as EngineClass[]).map((c) => (
                <button key={c} onClick={() => setEngClass(c)} className={`px-3 py-1 text-xs rounded ${engClass === c ? "bg-primary/20 text-primary" : "bg-muted/50"}`}>{c}</button>
              ))}
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={lapseGrouped.rows}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis dataKey="mach" tick={{ fontSize: 10 }} label={{ value: "Mach", position: "insideBottom", offset: -5, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 1.2]} label={{ value: "T/T₀", angle: -90, position: "insideLeft", fontSize: 10 }} />
                  <RTooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 10 }} formatter={(v: number) => v.toFixed(3)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {lapseGrouped.altitudes.map((alt, i) => (
                    <Line key={alt} name={`h=${alt} m`} dataKey={`h${alt}`} stroke={colors[i % colors.length]} dot={false} strokeWidth={1.5} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground">Mattingly-style empirical lapse: α = (ρ/ρ₀)^n · f(M).</p>
          </TabsContent>
        )}

        {/* ----- Turn ----- */}
        {tier === "Expert" && (
          <TabsContent value="turn" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Speed (m/s)</Label><Input value={turnV} onChange={(e) => setTurnV(e.target.value)} type="number" /></div>
              <div><Label className="text-xs">Load factor n</Label><Input value={turnN} onChange={(e) => setTurnN(e.target.value)} type="number" step="0.1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-primary/10 rounded border border-primary/30">
                <p className="text-[10px] text-muted-foreground uppercase">Turn rate</p>
                <p className="text-xl font-bold text-primary">{fmt(turnRate, 2)} °/s</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded border border-emerald-500/30">
                <p className="text-[10px] text-muted-foreground uppercase">Turn radius</p>
                <p className="text-xl font-bold text-emerald-400">{fmt(turnR, 0)} m</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">ω = g√(n²−1)/V · R = V²/[g√(n²−1)]</p>
          </TabsContent>
        )}
      </Tabs>
    </AeroCard>
  );
}