/**
 * L/D Analyzer — Advanced Aerodynamics Panel (Phase 1)
 *
 * Adds 5 expert tabs: Compressibility, Re-Scaling, 3D Wing, High-Lift, Trim Drag.
 * Pure UI — all math lives in src/lib/ld/aerodynamicsAdvanced.ts.
 */

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AeroCard } from "@/components/common/AeroCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { AlertTriangle, Gauge, Wind, Layers, ChevronsUp, Scale } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";
import {
  prandtlGlauertCL,
  criticalMach,
  dragDivergenceMach,
  waveDragCoefficient,
  cfTurbulent,
  cfLaminar,
  airfoilFormFactor,
  rescaleCD0,
  reynoldsNumber,
  liftCurveSlope3D,
  liftCurveSlopeSwept,
  glauertDelta,
  oswaldEfficiency,
  highLiftDelta,
  trimDrag,
  type FlapType,
  type SlatType,
} from "@/lib/ld/aerodynamicsAdvanced";

const fmt = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : "—");

export interface LDAdvancedPanelProps {
  /** Current base inputs from the parent analyzer (SI) */
  CL: number;
  CD0_base: number;
  AR: number;
  e: number;
  S: number;
  b: number;
  velocity_ms: number;
  density: number;
}

export function LDAdvancedPanel(props: LDAdvancedPanelProps) {
  const {
    CL: CL_in, CD0_base, AR, e, S, b,
    velocity_ms, density,
  } = props;

  // ── Compressibility tab state ──
  const [toC, setToC] = useState("0.12");
  const [sweep_deg, setSweep] = useState("0");
  const [kappa, setKappa] = useState("0.87");
  const machNow = useMemo(() => velocity_ms / 340.3, [velocity_ms]);

  const toCNum = parseFloat(toC) || 0.12;
  const sweepNum = parseFloat(sweep_deg) || 0;
  const kappaNum = parseFloat(kappa) || 0.87;

  const M_cr = useMemo(() => criticalMach(toCNum, sweepNum), [toCNum, sweepNum]);
  const M_dd = useMemo(
    () => dragDivergenceMach({ toC: toCNum, sweep_deg: sweepNum, cl: CL_in, kappa: kappaNum }),
    [toCNum, sweepNum, CL_in, kappaNum]
  );

  const compressData = useMemo(() => {
    const pts: { M: number; CL_corr: number; CD_wave: number }[] = [];
    for (let m = 0; m <= 0.95; m += 0.025) {
      pts.push({
        M: +m.toFixed(3),
        CL_corr: +prandtlGlauertCL(CL_in, m).toFixed(4),
        CD_wave: +waveDragCoefficient(m, M_dd).toFixed(5),
      });
    }
    return pts;
  }, [CL_in, M_dd]);

  // ── Re-Scaling tab state ──
  const chord = useMemo(() => (b > 0 ? S / b : 1), [S, b]);
  const [Re_ref, setReRef] = useState("1000000");
  const ReRefNum = parseFloat(Re_ref) || 1e6;
  const Re_now = useMemo(() => reynoldsNumber(density, velocity_ms, chord), [density, velocity_ms, chord]);
  const cd0_scaled = useMemo(() => rescaleCD0(CD0_base, ReRefNum, Re_now), [CD0_base, ReRefNum, Re_now]);
  const ff = useMemo(() => airfoilFormFactor(toCNum, machNow), [toCNum, machNow]);

  const reSweepData = useMemo(() => {
    const pts: { Re: number; Cf_turb: number; Cf_lam: number; CD0: number }[] = [];
    for (let p = 5; p <= 8; p += 0.1) {
      const Re = Math.pow(10, p);
      pts.push({
        Re,
        Cf_turb: +cfTurbulent(Re).toFixed(5),
        Cf_lam: +cfLaminar(Re).toFixed(5),
        CD0: +rescaleCD0(CD0_base, ReRefNum, Re).toFixed(5),
      });
    }
    return pts;
  }, [CD0_base, ReRefNum]);

  // ── 3D Wing tab state ──
  const [a2D, setA2D] = useState("6.28");
  const [taper, setTaper] = useState("0.4");
  const [dihedral, setDihedral] = useState("3");

  const a2DNum = parseFloat(a2D) || 6.28;
  const taperNum = parseFloat(taper) || 0.4;

  const a3D_straight = useMemo(() => liftCurveSlope3D(a2DNum, AR, e), [a2DNum, AR, e]);
  const a3D_swept = useMemo(
    () => liftCurveSlopeSwept(a2DNum, AR, sweepNum, machNow),
    [a2DNum, AR, sweepNum, machNow]
  );
  const delta_glauert = useMemo(() => glauertDelta(taperNum), [taperNum]);
  const e_raymer = useMemo(() => oswaldEfficiency(AR, sweepNum), [AR, sweepNum]);

  const arSweepData = useMemo(() => {
    const pts: { AR: number; a3D: number; e: number }[] = [];
    for (let ar = 3; ar <= 20; ar += 0.5) {
      pts.push({
        AR: ar,
        a3D: +liftCurveSlope3D(a2DNum, ar, e).toFixed(4),
        e: +oswaldEfficiency(ar, sweepNum).toFixed(4),
      });
    }
    return pts;
  }, [a2DNum, e, sweepNum]);

  // ── High-lift tab state ──
  const [flap, setFlap] = useState<FlapType>("slotted");
  const [flapDef, setFlapDef] = useState("30");
  const [flapSpan, setFlapSpan] = useState("0.6");
  const [slat, setSlat] = useState<SlatType>("none");

  const hl = useMemo(
    () => highLiftDelta({
      flap,
      flapDeflection_deg: parseFloat(flapDef) || 0,
      flapSpanFraction: parseFloat(flapSpan) || 0,
      slat,
    }),
    [flap, flapDef, flapSpan, slat]
  );

  const flapSweepData = useMemo(() => {
    const pts: { def: number; dCL: number; dCD: number }[] = [];
    for (let d = 0; d <= 60; d += 2) {
      const r = highLiftDelta({
        flap,
        flapDeflection_deg: d,
        flapSpanFraction: parseFloat(flapSpan) || 0,
        slat,
      });
      pts.push({ def: d, dCL: +r.dClMax.toFixed(4), dCD: +r.dCD0.toFixed(5) });
    }
    return pts;
  }, [flap, flapSpan, slat]);

  // ── Trim drag tab state ──
  const [SM, setSM] = useState("0.10");
  const [S_t, setSt] = useState((S * 0.22).toFixed(2));
  const [AR_t, setARt] = useState("4.5");
  const [l_t, setLt] = useState((b * 0.45).toFixed(2));
  const [c_bar, setCbar] = useState(chord.toFixed(2));

  const trim = useMemo(
    () =>
      trimDrag({
        CL_wing: CL_in,
        staticMargin: parseFloat(SM) || 0,
        S_wing: S,
        S_tail: parseFloat(S_t) || 0,
        AR_tail: parseFloat(AR_t) || 0,
        l_tail: parseFloat(l_t) || 0,
        c_bar: parseFloat(c_bar) || 0,
      }),
    [CL_in, SM, S, S_t, AR_t, l_t, c_bar]
  );

  // ── Sanity warnings ──
  const warnings: string[] = [];
  if (machNow > 0.99) warnings.push(`Mach ${machNow.toFixed(2)} exceeds subsonic range — Prandtl–Glauert invalid.`);
  if (machNow > M_dd) warnings.push(`Mach ${machNow.toFixed(2)} > M_dd (${M_dd.toFixed(2)}) — wave drag active.`);
  if (toCNum < 0.04 || toCNum > 0.25) warnings.push(`t/c = ${toCNum} outside typical range [0.04, 0.25].`);
  if (Re_now < 2e5) warnings.push(`Re = ${Re_now.toExponential(2)} below trusted polar range.`);
  if (AR < 3) warnings.push(`AR = ${AR.toFixed(2)} very low — lifting-line theory loses accuracy.`);
  if (parseFloat(SM) < 0) warnings.push("Negative static margin — aircraft statically unstable.");

  return (
    <AeroCard
      title="Advanced Aerodynamics"
      description="Compressibility • Re-scaling • 3D wing • High-lift • Trim drag"
      icon={Gauge}
    >
      {/* SI units legend */}
      <Alert className="mb-4 bg-primary/5 border-primary/30">
        <AlertDescription className="text-xs text-muted-foreground">
          <strong className="text-primary">SI units:</strong> velocity m/s · density kg/m³ · area m² ·
          span m · sweep deg · t/c dimensionless · Re dimensionless · CL/CD dimensionless.
          Mach computed from a = 340.3 m/s (ISA SL).
        </AlertDescription>
      </Alert>

      {warnings.length > 0 && (
        <Alert className="mb-4 bg-yellow-400/10 border-yellow-400/30">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400 text-xs space-y-1">
            {warnings.map((w, i) => <div key={i}>• {w}</div>)}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="compress">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="compress"><Wind className="h-3.5 w-3.5 mr-1" />Compressibility</TabsTrigger>
          <TabsTrigger value="re"><Gauge className="h-3.5 w-3.5 mr-1" />Re-Scaling</TabsTrigger>
          <TabsTrigger value="wing3d"><Layers className="h-3.5 w-3.5 mr-1" />3D Wing</TabsTrigger>
          <TabsTrigger value="highlift"><ChevronsUp className="h-3.5 w-3.5 mr-1" />High-Lift</TabsTrigger>
          <TabsTrigger value="trim"><Scale className="h-3.5 w-3.5 mr-1" />Trim Drag</TabsTrigger>
        </TabsList>

        {/* ─── Compressibility ─── */}
        <TabsContent value="compress" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">t/c (thickness ratio)</Label>
              <Input type="number" step="0.01" value={toC} onChange={(e) => setToC(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Sweep Λ (deg)</Label>
              <Input type="number" step="1" value={sweep_deg} onChange={(e) => setSweep(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">κ (0.87 conv / 0.95 supercrit)</Label>
              <Input type="number" step="0.01" value={kappa} onChange={(e) => setKappa(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Mach (current)" value={fmt(machNow, 3)} />
            <Metric label="M_critical" value={fmt(M_cr, 3)} accent="text-cyan-300" />
            <Metric label="M_dd (drag-div.)" value={fmt(M_dd, 3)} accent="text-amber-300" />
            <Metric label="CL (P–G corrected)" value={fmt(prandtlGlauertCL(CL_in, machNow), 3)} accent="text-primary" />
          </div>

          <ChartCard title="Mach Sweep — CL Correction & Wave Drag" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compressData}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="M" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: "Mach", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="L" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="D" orientation="right" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine x={M_dd} yAxisId="L" stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "M_dd", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                <Line yAxisId="L" type="monotone" dataKey="CL_corr" name="CL (P–G)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="D" type="monotone" dataKey="CD_wave" name="CD_wave" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* ─── Re-Scaling ─── */}
        <TabsContent value="re" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Reference Re (polar source)</Label>
              <Input type="number" step="100000" value={Re_ref} onChange={(e) => setReRef(e.target.value)} />
            </div>
            <Metric label="Re (current flight)" value={Re_now.toExponential(2)} accent="text-cyan-300" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Chord (S/b)" value={`${fmt(chord, 2)} m`} />
            <Metric label="Cf (turbulent)" value={fmt(cfTurbulent(Re_now), 5)} />
            <Metric label="Form factor" value={fmt(ff, 3)} />
            <Metric label="CD₀ rescaled" value={fmt(cd0_scaled, 5)} accent="text-primary" />
          </div>

          <ChartCard title="Skin-Friction & CD₀ vs Reynolds" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reSweepData}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="Re" scale="log" domain={['dataMin', 'dataMax']} type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickFormatter={(v) => v.toExponential(0)} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: number) => v.toFixed(5)} labelFormatter={(v: number) => `Re = ${v.toExponential(2)}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine x={Re_now} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: "current", fill: "hsl(var(--primary))", fontSize: 10 }} />
                <Line type="monotone" dataKey="Cf_turb" name="Cf turbulent" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Cf_lam" name="Cf laminar" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="CD0" name="CD₀ scaled" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* ─── 3D Wing ─── */}
        <TabsContent value="wing3d" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">2-D slope a₀ (per rad)</Label>
              <Input type="number" step="0.01" value={a2D} onChange={(e) => setA2D(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Taper λ (c_tip/c_root)</Label>
              <Input type="number" step="0.05" value={taper} onChange={(e) => setTaper(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Dihedral Γ (deg)</Label>
              <Input type="number" step="0.5" value={dihedral} onChange={(e) => setDihedral(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="a_3D (straight)" value={`${fmt(a3D_straight, 3)} /rad`} accent="text-primary" />
            <Metric label="a_3D (swept DATCOM)" value={`${fmt(a3D_swept, 3)} /rad`} />
            <Metric label="Glauert δ" value={fmt(delta_glauert, 4)} accent="text-amber-300" />
            <Metric label="Oswald e (Raymer)" value={fmt(e_raymer, 3)} accent="text-cyan-300" />
          </div>

          <ChartCard title="AR Sweep — Lift-Curve Slope & Oswald Efficiency" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={arSweepData}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="AR" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: "Aspect Ratio", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="a" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="e" orientation="right" domain={[0, 1]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine x={AR} yAxisId="a" stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: "current", fill: "hsl(var(--primary))", fontSize: 10 }} />
                <Line yAxisId="a" type="monotone" dataKey="a3D" name="a_3D" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="e" type="monotone" dataKey="e" name="e (Raymer)" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* ─── High-Lift ─── */}
        <TabsContent value="highlift" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Flap type</Label>
              <Select value={flap} onValueChange={(v) => setFlap(v as FlapType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="plain">Plain</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                  <SelectItem value="slotted">Slotted</SelectItem>
                  <SelectItem value="fowler">Fowler</SelectItem>
                  <SelectItem value="doubleslotted">Double-slotted</SelectItem>
                  <SelectItem value="tripleslotted">Triple-slotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Deflection δ_f (deg)</Label>
              <Input type="number" step="1" value={flapDef} onChange={(e) => setFlapDef(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Span fraction</Label>
              <Input type="number" step="0.05" min="0" max="1" value={flapSpan} onChange={(e) => setFlapSpan(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Slat type</Label>
              <Select value={slat} onValueChange={(v) => setSlat(v as SlatType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="leadingedge">Leading-edge</SelectItem>
                  <SelectItem value="krueger">Krueger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Metric label="ΔCL_max" value={`+${fmt(hl.dClMax, 3)}`} accent="text-primary" />
            <Metric label="ΔCD₀" value={`+${fmt(hl.dCD0, 5)}`} accent="text-destructive" />
            <Metric label="Δα_stall" value={`${fmt(hl.dAlphaStall_deg, 2)}°`} accent="text-amber-300" />
          </div>

          <ChartCard title="Flap Deflection Sweep" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={flapSweepData}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="def" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: "Flap deflection δ_f (deg)", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="cl" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="cd" orientation="right" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="cl" type="monotone" dataKey="dCL" name="ΔCL_max" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="cd" type="monotone" dataKey="dCD" name="ΔCD₀" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* ─── Trim Drag ─── */}
        <TabsContent value="trim" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Static margin SM</Label>
              <Input type="number" step="0.01" value={SM} onChange={(e) => setSM(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">S_tail (m²)</Label>
              <Input type="number" step="0.1" value={S_t} onChange={(e) => setSt(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">AR_tail</Label>
              <Input type="number" step="0.1" value={AR_t} onChange={(e) => setARt(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">l_tail (m)</Label>
              <Input type="number" step="0.1" value={l_t} onChange={(e) => setLt(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">c̄ (m)</Label>
              <Input type="number" step="0.05" value={c_bar} onChange={(e) => setCbar(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Metric label="CL_wing (current)" value={fmt(CL_in, 3)} />
            <Metric label="CL_tail (required)" value={fmt(trim.CL_tail, 3)} accent="text-amber-300" />
            <Metric label="CD_trim (penalty)" value={fmt(trim.CD_trim, 5)} accent="text-destructive" />
          </div>

          <Alert className="bg-muted/30 border-border">
            <AlertDescription className="text-xs text-muted-foreground">
              Trim drag is the induced drag added by the horizontal tail download required for
              pitch equilibrium. Positive SM means a stable aircraft; tail download grows with CL_wing
              and SM. Couple this with the Stability calculator for higher fidelity.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </AeroCard>
  );
}

// ── small metric card ────────────────────────────────────────────────────────
function Metric({ label, value, accent = "text-foreground" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg border border-border">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <p className={`font-bold text-sm ${accent}`}>{value}</p>
    </div>
  );
}