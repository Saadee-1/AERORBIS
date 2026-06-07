/**
 * L/D Analyzer — Performance Envelope Panel (Phase 2)
 *
 * Tabs: Polar Fit · Key Points · V-Speeds · Range/Endurance · Sink Polar · Altitude Sweep
 */

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AeroCard } from "@/components/common/AeroCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { Activity, Award, Wind, Fuel, MoveDown, Mountain } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceDot, Scatter, ScatterChart, Legend, ComposedChart,
} from "recharts";
import {
  fitDragPolar,
  keyPerformancePoints,
  vSpeeds,
  breguetJet,
  breguetProp,
  sinkRatePolar,
  altitudeSweep,
} from "@/lib/ld/performanceEnvelope";

const fmt = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : "—");

export interface LDPerformancePanelProps {
  /** Sampled polar (from base airfoil) — used for polar fit */
  cl: number[];
  cd: number[];
  AR: number;
  e: number;
  S: number;
  b: number;
  velocity_ms: number;
  density: number;
  CL_max?: number;
}

export function LDPerformancePanel(props: LDPerformancePanelProps) {
  const { cl, cd, AR, e, S, b, velocity_ms, density, CL_max = 1.5 } = props;

  // ── Polar fit ──
  const fit = useMemo(() => fitDragPolar(cl, cd), [cl, cd]);
  // Fallback to geometry-derived k if fit fails
  const k_geom = useMemo(() => (AR > 0 ? 1 / (Math.PI * AR * e) : 0), [AR, e]);
  const CD0 = fit.CD0 > 0 ? fit.CD0 : 0.02;
  const k = fit.k > 0 ? fit.k : k_geom;

  // ── Key points ──
  const kp = useMemo(() => keyPerformancePoints(CD0, k), [CD0, k]);

  // ── Weight input (default to 1g·S·1000 dummy; user adjustable) ──
  const [weight_N, setWeight] = useState("12000");
  const W = parseFloat(weight_N) || 12000;

  // ── V-speeds ──
  const vs = useMemo(
    () => vSpeeds({ weight_N: W, S, density, CL_max, CD0, k }),
    [W, S, density, CL_max, CD0, k]
  );

  // ── Range/Endurance ──
  const [mode, setMode] = useState<"jet" | "prop">("jet");
  const [fuelFrac, setFuelFrac] = useState("0.25");        // fuel as fraction of W0
  const [tsfc, setTsfc] = useState("0.00002");             // 1/s (≈ 0.6 lb/(lbf·hr))
  const [bsfc, setBsfc] = useState("8.5e-8");              // kg/(W·s) ≈ 0.5 lb/(hp·hr)
  const [etaProp, setEtaProp] = useState("0.82");

  const W0 = W;
  const W1 = W0 * (1 - (parseFloat(fuelFrac) || 0));
  const breguet = useMemo(() => {
    const base = { W0, W1, V: vs.V_bestGlide || velocity_ms, L_over_D: kp.LD_max };
    return mode === "jet"
      ? breguetJet({ ...base, TSFC: parseFloat(tsfc) })
      : breguetProp({ ...base, BSFC: parseFloat(bsfc), eta_prop: parseFloat(etaProp) });
  }, [mode, W0, W1, vs.V_bestGlide, velocity_ms, kp.LD_max, tsfc, bsfc, etaProp]);

  // ── Sink-rate polar ──
  const sinkData = useMemo(() => {
    const Vmin = Math.max(5, vs.V_stall * 0.9);
    const Vmax = vs.V_stall * 3 || 80;
    return sinkRatePolar({ weight_N: W, S, density, CD0, k, V_min: Vmin, V_max: Vmax });
  }, [W, S, density, CD0, k, vs.V_stall]);

  // ── Altitude sweep ──
  const altData = useMemo(
    () => altitudeSweep({ weight_N: W, S, CD0, k, altMax_m: 15000, steps: 30 }),
    [W, S, CD0, k]
  );

  // ── Polar comparison data (sampled fit vs raw) ──
  const polarCompare = useMemo(() => {
    const out: { CL: number; CD_raw: number | null; CD_fit: number }[] = [];
    const maxCL = Math.max(...cl, 1.5);
    const minCL = Math.min(...cl, -0.5);
    for (let i = 0; i <= 50; i++) {
      const CL = minCL + ((maxCL - minCL) * i) / 50;
      out.push({ CL: +CL.toFixed(3), CD_raw: null, CD_fit: +(CD0 + k * CL * CL).toFixed(5) });
    }
    cl.forEach((c, i) => {
      out.push({ CL: +c.toFixed(3), CD_raw: +cd[i].toFixed(5), CD_fit: +(CD0 + k * c * c).toFixed(5) });
    });
    return out.sort((a, b) => a.CL - b.CL);
  }, [cl, cd, CD0, k]);

  return (
    <AeroCard
      title="Performance Envelope"
      description="Polar fit • Key points • V-speeds • Range • Sink polar • Altitude sweep"
      icon={Activity}
    >
      <Alert className="mb-4 bg-primary/5 border-primary/30">
        <AlertDescription className="text-xs text-muted-foreground">
          <strong className="text-primary">Inputs:</strong> Weight in N · S in m² · ρ in kg/m³ ·
          TSFC in 1/s · BSFC in kg/(W·s). Range in m, endurance in s.
          Outputs derived from the parabolic polar CD = CD₀ + k·CL² fit.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Metric label="CD₀ (fit)" value={fmt(CD0, 5)} accent="text-primary" />
        <Metric label="k (fit)" value={fmt(k, 4)} accent="text-cyan-300" />
        <Metric label="R² (fit)" value={fmt(fit.rSquared, 4)} accent={fit.rSquared > 0.95 ? "text-green-400" : "text-amber-300"} />
        <Metric label="k (geometry)" value={fmt(k_geom, 4)} />
      </div>

      <Tabs defaultValue="fit">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="fit"><Activity className="h-3.5 w-3.5 mr-1" />Polar Fit</TabsTrigger>
          <TabsTrigger value="keypts"><Award className="h-3.5 w-3.5 mr-1" />Key Pts</TabsTrigger>
          <TabsTrigger value="vspeeds"><Wind className="h-3.5 w-3.5 mr-1" />V-Speeds</TabsTrigger>
          <TabsTrigger value="breguet"><Fuel className="h-3.5 w-3.5 mr-1" />Range</TabsTrigger>
          <TabsTrigger value="sink"><MoveDown className="h-3.5 w-3.5 mr-1" />Sink</TabsTrigger>
          <TabsTrigger value="alt"><Mountain className="h-3.5 w-3.5 mr-1" />Altitude</TabsTrigger>
        </TabsList>

        {/* ─── Polar Fit ─── */}
        <TabsContent value="fit" className="space-y-4 mt-4">
          <ChartCard title="Raw Polar vs Parabolic Fit (CD = CD₀ + k·CL²)" height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={polarCompare}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="CL" type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: "CL", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: "CD", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: number) => v?.toFixed?.(5) ?? v} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="CD_fit" name="Fit" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Scatter dataKey="CD_raw" name="Raw" fill="hsl(var(--destructive))" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="text-xs text-muted-foreground">
            Max residual: {fmt(fit.residualMax, 5)} · n = {cl.length}
          </div>
        </TabsContent>

        {/* ─── Key Points ─── */}
        <TabsContent value="keypts" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Metric label="(L/D)_max" value={fmt(kp.LD_max, 2)} accent="text-primary" />
            <Metric label="CL @ (L/D)_max" value={fmt(kp.CL_LDmax, 3)} />
            <Metric label="best-glide V" value={`${fmt(vs.V_bestGlide, 1)} m/s`} accent="text-cyan-300" />
            <Metric label="(CL^1.5/CD)_max — jet range / prop endur." value={fmt(kp.metric_endurance, 2)} accent="text-amber-300" />
            <Metric label="CL @ endurance" value={fmt(kp.CL_endurance, 3)} />
            <Metric label="(CL^0.5/CD)_max — prop range" value={fmt(kp.metric_propRange, 2)} accent="text-emerald-300" />
          </div>
          <ChartCard title="L/D vs CL (parabolic polar)" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={Array.from({ length: 60 }, (_, i) => {
                const CL = (i / 60) * 2.0;
                const CD = CD0 + k * CL * CL;
                return { CL: +CL.toFixed(3), LD: CD > 1e-6 ? +(CL / CD).toFixed(2) : 0 };
              })}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="CL" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <ReferenceLine x={kp.CL_LDmax} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: "L/D_max", fill: "hsl(var(--primary))", fontSize: 10 }} />
                <Line type="monotone" dataKey="LD" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* ─── V-Speeds ─── */}
        <TabsContent value="vspeeds" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Aircraft weight (N)</Label>
              <Input type="number" step="100" value={weight_N} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <Metric label="W/S" value={`${fmt(W / S, 1)} N/m²`} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="V_stall" value={`${fmt(vs.V_stall, 1)} m/s`} accent="text-destructive" />
            <Metric label="V_best-glide" value={`${fmt(vs.V_bestGlide, 1)} m/s`} accent="text-primary" />
            <Metric label="V_min-power" value={`${fmt(vs.V_minPower, 1)} m/s`} accent="text-amber-300" />
            <Metric label="V_best-range (prop)" value={`${fmt(vs.V_bestRangeProp, 1)} m/s`} accent="text-emerald-300" />
          </div>
        </TabsContent>

        {/* ─── Range / Endurance ─── */}
        <TabsContent value="breguet" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Engine type</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "jet" | "prop")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jet">Jet (Breguet)</SelectItem>
                  <SelectItem value="prop">Propeller (Breguet)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fuel fraction (W0)</Label>
              <Input type="number" step="0.01" value={fuelFrac} onChange={(e) => setFuelFrac(e.target.value)} />
            </div>
            {mode === "jet" ? (
              <div>
                <Label className="text-xs">TSFC (1/s)</Label>
                <Input type="number" step="0.000001" value={tsfc} onChange={(e) => setTsfc(e.target.value)} />
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-xs">BSFC (kg/(W·s))</Label>
                  <Input type="number" step="1e-9" value={bsfc} onChange={(e) => setBsfc(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">η_prop</Label>
                  <Input type="number" step="0.01" value={etaProp} onChange={(e) => setEtaProp(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="W₀" value={`${fmt(W0, 0)} N`} />
            <Metric label="W₁" value={`${fmt(W1, 0)} N`} />
            <Metric label="Range" value={`${fmt(breguet.range_m / 1000, 1)} km`} accent="text-primary" />
            <Metric label="Endurance" value={`${fmt(breguet.endurance_s / 3600, 2)} hr`} accent="text-cyan-300" />
          </div>
        </TabsContent>

        {/* ─── Sink Polar ─── */}
        <TabsContent value="sink" className="space-y-4 mt-4">
          <ChartCard title="Speed Polar — Sink Rate vs Velocity (sailplane hodograph)" height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sinkData}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="V" type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: "V (m/s)", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis reversed stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: "sink (m/s)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <ReferenceLine x={vs.V_bestGlide} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: "V_bg", fill: "hsl(var(--primary))", fontSize: 10 }} />
                <ReferenceLine x={vs.V_minPower} stroke="hsl(var(--accent))" strokeDasharray="3 3" label={{ value: "V_mp", fill: "hsl(var(--accent))", fontSize: 10 }} />
                <Line type="monotone" dataKey="sink" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="text-xs text-muted-foreground">
            Y-axis reversed: low = good. Tangent from origin to curve gives best L/D.
          </div>
        </TabsContent>

        {/* ─── Altitude Sweep ─── */}
        <TabsContent value="alt" className="space-y-4 mt-4">
          <ChartCard title="Best-Glide V vs Altitude (ISA)" height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={altData}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="alt_m" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: "Altitude (m)", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="V" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="ρ" orientation="right" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="V" type="monotone" dataKey="V_bestGlide" name="V_bg (m/s)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="ρ" type="monotone" dataKey="density" name="ρ (kg/m³)" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="text-xs text-muted-foreground">
            L/D_max is altitude-independent for a fixed parabolic polar; only best-glide V scales with √(1/ρ).
          </div>
        </TabsContent>
      </Tabs>
    </AeroCard>
  );
}

function Metric({ label, value, accent = "text-foreground" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg border border-border">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <p className={`font-bold text-sm ${accent}`}>{value}</p>
    </div>
  );
}