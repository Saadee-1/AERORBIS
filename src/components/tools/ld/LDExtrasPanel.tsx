/**
 * L/D Analyzer — Phase 3 & 4 Panel
 *
 * Phase 3: Aircraft presets · Drag breakdown · Sensitivity sweep · Units legend & sanity warnings
 * Phase 4: Multi-variable lift solver · Interlink hints (W/S, CL_max)
 *
 * All additive — does not touch frozen physics in the main analyzer.
 */

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AeroCard } from "@/components/common/AeroCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { AlertTriangle, Plane, Layers, TrendingUp, Calculator, Ruler, Link as LinkIcon, Send, Undo2 } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { importDataToSession } from "@/components/tools/utils/interlink";
import { FIELD_KEYS, type FieldKey } from "@/components/tools/utils/interlinkConfig";
import { AIRCRAFT_PRESETS, type AircraftPreset } from "@/lib/ld/aircraftPresets";
import { dragBreakdownSweep } from "@/lib/ld/dragBreakdown";
import { sensitivitySweep, type SensitivityParam } from "@/lib/ld/sensitivity";
import { solveLift, type LdSolveVar } from "@/lib/ld/ldSolver";

const fmt = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : "—");
const g0 = 9.80665;

export interface LDExtrasPanelProps {
  CL: number;
  CD: number;
  AR: number;
  e: number;
  S: number;
  b: number;
  velocity_ms: number;
  density: number;
  k_factor: number;
  CL_max?: number;
  onApplyPreset?: (p: AircraftPreset) => void;
  onImportField?: (field: 'wingArea' | 'airspeed' | 'airDensity' | 'oswaldEfficiency', value: number) => void;
}

export function LDExtrasPanel(props: LDExtrasPanelProps) {
  const {
    CL, CD, AR, e, S, b, velocity_ms, density, k_factor,
    CL_max = 1.5, onApplyPreset, onImportField,
  } = props;

  // ── Derived ──
  const CD0_base = Math.max(1e-4, CD - CL * CL * (k_factor || 0));
  const k = k_factor > 0 ? k_factor : AR > 0 && e > 0 ? 1 / (Math.PI * AR * e) : 0;
  const W_N = 0.5 * density * velocity_ms * velocity_ms * S * CL; // implied weight for level cruise
  const wingLoading = S > 0 ? W_N / S : 0;
  const mach = velocity_ms / 340.29; // SL approx

  // ── Sanity warnings ──
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (AR <= 0 || !Number.isFinite(AR)) w.push("Aspect ratio invalid (AR ≤ 0).");
    if (AR > 40) w.push("AR > 40 is extreme — verify span/area.");
    if (e <= 0 || e > 1) w.push("Oswald efficiency must be in (0, 1].");
    if (density <= 0 || density > 1.4) w.push("Air density outside Earth ISA envelope.");
    if (velocity_ms <= 0) w.push("Airspeed must be > 0.");
    if (velocity_ms > 350) w.push("V > 350 m/s — compressibility/wave drag not modeled in base CD.");
    if (Math.abs(CL) > CL_max) w.push(`|CL| = ${Math.abs(CL).toFixed(2)} exceeds CL_max ≈ ${CL_max.toFixed(2)} (stall).`);
    if (CD <= 0) w.push("CD ≤ 0 is non-physical.");
    if (CD0_base < 0.003) w.push("Implied CD₀ < 0.003 is unrealistically low.");
    return w;
  }, [AR, e, density, velocity_ms, CL, CD, CD0_base, CL_max]);

  // ── Drag breakdown sweep ──
  const breakdown = useMemo(() =>
    dragBreakdownSweep({
      CD0: CD0_base, k, CL_min: -0.2, CL_max: Math.max(1.2, CL_max),
      mach, M_dd: 0.78, trimDeltaCD: 0.0005,
    }),
    [CD0_base, k, CL_max, mach]
  );

  // ── Sensitivity ──
  const [sensParam, setSensParam] = useState<SensitivityParam>('AR');
  const sensRange = useMemo(() => {
    switch (sensParam) {
      case 'AR':       return { min: 4,    max: 30,   steps: 25 };
      case 'oswald':   return { min: 0.5,  max: 1.0,  steps: 25 };
      case 'CD0':      return { min: 0.005,max: 0.05, steps: 25 };
      case 'altitude': return { min: 0,    max: 15000,steps: 25 };
      case 'airspeed': return { min: Math.max(10, velocity_ms*0.3), max: velocity_ms*2, steps: 25 };
    }
  }, [sensParam, velocity_ms]);
  const sensData = useMemo(() => sensitivitySweep(sensParam, {
    CD0: CD0_base, AR, e, S, W: W_N || 1, V: velocity_ms || 1, density,
  }, sensRange), [sensParam, sensRange, CD0_base, AR, e, S, W_N, velocity_ms, density]);

  // ── Multi-variable solver ──
  const [solveTarget, setSolveTarget] = useState<LdSolveVar>('L');
  const [solveInputs, setSolveInputs] = useState({ L: '', rho: '1.225', V: '50', S: '16', CL: '0.8' });
  const solveResult = useMemo(() => {
    const parsed: Record<string, number | undefined> = {};
    (['L','rho','V','S','CL'] as const).forEach(k => {
      if (k === solveTarget) { parsed[k] = undefined; return; }
      const n = parseFloat((solveInputs as Record<string, string>)[k]);
      parsed[k] = Number.isFinite(n) ? n : undefined;
    });
    return solveLift(parsed);
  }, [solveTarget, solveInputs]);

  // ── Preset selection ──
  const [presetId, setPresetId] = useState<string>('');
  const [presetPreviewOpen, setPresetPreviewOpen] = useState(false);

  // ── Push-to-Tools (cross-tool transfer) ──
  type TransferKey =
    | typeof FIELD_KEYS.cd0 | typeof FIELD_KEYS.k | typeof FIELD_KEYS.clMax
    | typeof FIELD_KEYS.ldClimb | typeof FIELD_KEYS.wingAreaM2 | typeof FIELD_KEYS.densityKgM3
    | typeof FIELD_KEYS.wingLoadingKgm2 | typeof FIELD_KEYS.stallSpeedMs | typeof FIELD_KEYS.weightN;

  interface TransferRow {
    key: TransferKey;
    label: string;
    value: number;
    unit: string;
    targets: string[];     // human-readable target tools
    valid: boolean;
  }

  const wingLoadingKgm2 = wingLoading > 0 ? wingLoading / g0 : NaN;
  const stallSpeedMs = (CL_max > 0 && density > 0 && wingLoading > 0)
    ? Math.sqrt((2 * wingLoading) / (density * CL_max))
    : NaN;
  const LD_current = CD > 0 ? CL / CD : NaN;

  const transferRows: TransferRow[] = useMemo(() => [
    { key: FIELD_KEYS.cd0,             label: 'Parasite drag CD₀',  value: CD0_base,      unit: '—',     targets: ['Climb', 'Thrust Loading'], valid: CD0_base > 0 },
    { key: FIELD_KEYS.k,               label: 'Induced factor k',   value: k,             unit: '—',     targets: ['Climb'],                   valid: k > 0 },
    { key: FIELD_KEYS.clMax,           label: 'CL max',             value: CL_max,        unit: '—',     targets: ['Wing Loading', 'Climb'],   valid: CL_max > 0 },
    { key: FIELD_KEYS.ldClimb,         label: 'L/D (cruise)',       value: LD_current,    unit: '—',     targets: ['Climb', 'Thrust'],         valid: Number.isFinite(LD_current) && LD_current > 0 },
    { key: FIELD_KEYS.wingAreaM2,      label: 'Wing area S',        value: S,             unit: 'm²',    targets: ['Wing Loading', 'Thrust Loading'], valid: S > 0 },
    { key: FIELD_KEYS.densityKgM3,     label: 'Air density ρ',      value: density,       unit: 'kg/m³', targets: ['Climb', 'Thrust', 'Atmosphere'], valid: density > 0 },
    { key: FIELD_KEYS.weightN,         label: 'Weight W (implied)', value: W_N,           unit: 'N',     targets: ['Wing Loading', 'Thrust Loading'], valid: W_N > 0 },
    { key: FIELD_KEYS.wingLoadingKgm2, label: 'Wing loading W/S',   value: wingLoadingKgm2, unit: 'kg/m²', targets: ['Wing Loading', 'Thrust Loading'], valid: Number.isFinite(wingLoadingKgm2) && wingLoadingKgm2 > 0 },
    { key: FIELD_KEYS.stallSpeedMs,    label: 'Stall speed V_s',    value: stallSpeedMs,  unit: 'm/s',   targets: ['Wing Loading', 'Climb'],   valid: Number.isFinite(stallSpeedMs) && stallSpeedMs > 0 },
  ], [CD0_base, k, CL_max, LD_current, S, density, W_N, wingLoadingKgm2, stallSpeedMs]);

  const [pushOpen, setPushOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  // pre-select all valid rows when dialog opens
  const openPushDialog = () => {
    const init: Record<string, boolean> = {};
    transferRows.forEach(r => { init[r.key] = r.valid; });
    setSelected(init);
    setPushOpen(true);
  };

  // Read current designSession for preview "current value" column
  const currentSession = useMemo(() => {
    if (typeof window === 'undefined') return {} as Record<string, unknown>;
    try {
      const raw = localStorage.getItem('aerorbis_design_session');
      return raw ? JSON.parse(raw) as Record<string, unknown> : {};
    } catch { return {}; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushOpen]);

  const handleConfirmPush = () => {
    const payload: Partial<Record<FieldKey, number>> = {};
    let count = 0;
    transferRows.forEach(r => {
      if (selected[r.key] && r.valid) {
        payload[r.key as FieldKey] = +r.value.toFixed(6);
        count++;
      }
    });
    if (count === 0) {
      toast.error('No fields selected to push.');
      return;
    }
    const prev = importDataToSession(payload as Record<string, number | string>);
    setPushOpen(false);
    toast.success(`Pushed ${count} value${count === 1 ? '' : 's'} to companion tools.`, {
      description: 'Open Wing Loading, Thrust, or Climb to see the imported values.',
      action: {
        label: 'Undo',
        onClick: () => {
          importDataToSession(prev as Record<string, number | string>);
          toast.message('Push reverted.');
        },
      },
    });
  };

  return (
    <AeroCard className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display tracking-wider text-primary text-lg uppercase">
            Phase 3 & 4 — Presets, Solver & Sensitivity
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Aircraft presets · Drag breakdown · Parameter sensitivity · Multi-variable solver · Interlinks
          </p>
        </div>
      </div>

      {/* Units legend */}
      <Alert>
        <Ruler className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>SI units throughout:</strong> S [m²] · b [m] · V [m/s] · ρ [kg/m³] · L,W [N] · W/S [N/m²] ·
          α [deg] · CL, CD, e, AR dimensionless. Sensitivity altitude in m; airspeed in m/s.
        </AlertDescription>
      </Alert>

      {/* Sanity warnings */}
      {warnings.length > 0 && (
        <Alert variant="destructive" className="border-yellow-500/40 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <ul className="list-disc pl-4 space-y-0.5">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="presets"><Plane className="h-3 w-3 mr-1" />Presets</TabsTrigger>
          <TabsTrigger value="breakdown"><Layers className="h-3 w-3 mr-1" />Drag Split</TabsTrigger>
          <TabsTrigger value="sensitivity"><TrendingUp className="h-3 w-3 mr-1" />Sensitivity</TabsTrigger>
          <TabsTrigger value="solver"><Calculator className="h-3 w-3 mr-1" />Solver</TabsTrigger>
          <TabsTrigger value="interlinks"><LinkIcon className="h-3 w-3 mr-1" />Interlinks</TabsTrigger>
        </TabsList>

        {/* ── Presets ── */}
        <TabsContent value="presets" className="space-y-3 pt-3">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Aircraft Preset</Label>
              <Select value={presetId} onValueChange={setPresetId}>
                <SelectTrigger><SelectValue placeholder="Choose aircraft…" /></SelectTrigger>
                <SelectContent>
                  {AIRCRAFT_PRESETS.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} <span className="text-xs text-muted-foreground">— {p.category}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              disabled={!presetId || !onApplyPreset}
              onClick={() => setPresetPreviewOpen(true)}
            >
              Preview & Apply
            </Button>
          </div>
          {presetId && (() => {
            const p = AIRCRAFT_PRESETS.find(x => x.id === presetId)!;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <Cell label="S [m²]" v={p.wingArea} />
                <Cell label="b [m]" v={p.wingSpan} />
                <Cell label="V [m/s]" v={p.airspeed} />
                <Cell label="ρ [kg/m³]" v={p.airDensity} />
                <Cell label="e" v={p.oswaldEfficiency} />
                <Cell label="AR" v={(p.wingSpan*p.wingSpan)/p.wingArea} />
                <Cell label="W₀ [N]" v={p.W0_N ?? NaN} />
                <Cell label="W₁ [N]" v={p.W1_N ?? NaN} />
                <div className="col-span-full text-muted-foreground italic">{p.notes}</div>
              </div>
            );
          })()}
        </TabsContent>

        {/* ── Drag breakdown ── */}
        <TabsContent value="breakdown" className="pt-3">
          <ChartCard title="Drag Components vs CL" description="Stacked: parasite (CD₀) · induced (k·CL²) · wave (Korn @ M_dd=0.78) · trim">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={breakdown}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="CL" label={{ value: 'CL', position: 'insideBottom', offset: -4 }} />
                <YAxis label={{ value: 'CD', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="CD_parasite" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.6)" name="Parasite" />
                <Area type="monotone" dataKey="CD_induced"  stackId="1" stroke="hsl(var(--accent))"  fill="hsl(var(--accent)/0.6)"  name="Induced" />
                <Area type="monotone" dataKey="CD_wave"     stackId="1" stroke="#f59e0b" fill="#f59e0b88" name="Wave" />
                <Area type="monotone" dataKey="CD_trim"     stackId="1" stroke="#a855f7" fill="#a855f788" name="Trim" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="text-xs text-muted-foreground mt-2">
            Implied CD₀ = {fmt(CD0_base, 5)} · k = {fmt(k, 5)} · M ≈ {fmt(mach, 2)} (SL) ·
            wave term active above M<sub>dd</sub> = 0.78.
          </div>
        </TabsContent>

        {/* ── Sensitivity ── */}
        <TabsContent value="sensitivity" className="space-y-3 pt-3">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <Label className="text-xs">Sweep parameter</Label>
              <Select value={sensParam} onValueChange={(v) => setSensParam(v as SensitivityParam)}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AR">Aspect Ratio</SelectItem>
                  <SelectItem value="oswald">Oswald efficiency e</SelectItem>
                  <SelectItem value="CD0">Parasite drag CD₀</SelectItem>
                  <SelectItem value="altitude">Altitude [m]</SelectItem>
                  <SelectItem value="airspeed">Airspeed [m/s]</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              Base: AR={fmt(AR,1)} · e={fmt(e,2)} · CD₀={fmt(CD0_base,4)} · V={fmt(velocity_ms,1)} m/s · ρ={fmt(density,3)}
            </div>
          </div>
          <ChartCard title={`L/D Sensitivity to ${sensParam}`} description="Single-parameter sweep with all other inputs frozen">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={sensData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="x" label={{ value: sensParam, position: 'insideBottom', offset: -4 }} />
                <YAxis yAxisId="left" label={{ value: 'L/D', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'CL', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="LD" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="L/D" />
                <Line yAxisId="right" type="monotone" dataKey="CL" stroke="hsl(var(--accent))" strokeWidth={1.5} dot={false} name="CL" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* ── Multi-variable solver ── */}
        <TabsContent value="solver" className="space-y-3 pt-3">
          <p className="text-xs text-muted-foreground">
            Solves <code className="text-primary">L = ½·ρ·V²·S·CL</code> for the variable marked “Unknown”.
            Provide the other four; the missing one is computed live.
          </p>
          <div className="flex gap-2 items-end flex-wrap">
            <div>
              <Label className="text-xs">Solve for</Label>
              <Select value={solveTarget} onValueChange={(v) => setSolveTarget(v as LdSolveVar)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Lift L [N]</SelectItem>
                  <SelectItem value="rho">Density ρ [kg/m³]</SelectItem>
                  <SelectItem value="V">Airspeed V [m/s]</SelectItem>
                  <SelectItem value="S">Wing area S [m²]</SelectItem>
                  <SelectItem value="CL">Lift coeff CL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['L','rho','V','S','CL'] as const).map(k => (
              <div key={k}>
                <Label className="text-xs">{k}{solveTarget === k && ' (unknown)'}</Label>
                <Input
                  type="number"
                  disabled={solveTarget === k}
                  value={solveTarget === k ? '' : (solveInputs as Record<string,string>)[k]}
                  onChange={(e) => setSolveInputs(s => ({ ...s, [k]: e.target.value }))}
                  placeholder={solveTarget === k ? '?' : ''}
                />
              </div>
            ))}
          </div>
          {solveResult ? (
            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="font-mono">{solveResult.formula}</div>
                <div className="mt-1 text-primary font-bold">
                  {solveResult.target} = {fmt(solveResult.value, 4)}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Provide four valid numeric inputs (excluding the unknown). Check for zero divisors.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* ── Interlinks ── */}
        <TabsContent value="interlinks" className="space-y-3 pt-3">
          <p className="text-xs text-muted-foreground">
            Auto-transfer current cruise-state values to companion tools. Review the preview
            below, deselect anything you don’t want to send, then confirm.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Cell label="W/S [N/m²]" v={wingLoading} />
            <Cell label="W [N] (implied)" v={W_N} />
            <Cell label="V_s [m/s]" v={stallSpeedMs} />
            <Cell label="L/D current" v={LD_current} />
            <Cell label="Mach (SL)" v={mach} />
            <Cell label="q [Pa]" v={0.5 * density * velocity_ms * velocity_ms} />
          </div>

          <div className="flex gap-2 flex-wrap pt-2">
            <Button size="sm" onClick={openPushDialog}>
              <Send className="h-3 w-3 mr-1" /> Push to Tools…
            </Button>
            {onImportField && (
              <>
                <Button size="sm" variant="outline" onClick={() => { onImportField('oswaldEfficiency', e); toast.success('Pushed e to input.'); }}>
                  e → input
                </Button>
                <Button size="sm" variant="outline" onClick={() => { onImportField('airDensity', density); toast.success('Pushed ρ to input.'); }}>
                  ρ → input
                </Button>
                <Button size="sm" variant="outline" onClick={() => { onImportField('airspeed', velocity_ms); toast.success('Pushed V to input.'); }}>
                  V → input
                </Button>
              </>
            )}
          </div>

          <Alert>
            <LinkIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Push writes to the shared design session — Wing Loading, Thrust, Climb and Atmosphere
              tools will pick up the values automatically via their inline import hints.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* ── Push-to-Tools confirmation dialog ── */}
      <Dialog open={pushOpen} onOpenChange={setPushOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Confirm transfer to companion tools
            </DialogTitle>
            <DialogDescription>
              Review each field before pushing. Existing session values will be overwritten;
              use the toast’s “Undo” to revert.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead>Targets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferRows.map(r => {
                  const cur = (currentSession as Record<string, unknown>)[r.key];
                  const curNum = typeof cur === 'number' ? cur : (typeof cur === 'string' ? parseFloat(cur) : NaN);
                  return (
                    <TableRow key={r.key} className={!r.valid ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={!!selected[r.key]}
                          disabled={!r.valid}
                          onCheckedChange={(c) => setSelected(s => ({ ...s, [r.key]: !!c }))}
                        />
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{r.label}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{r.key} [{r.unit}]</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {Number.isFinite(curNum) ? curNum.toPrecision(4) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-primary">
                        {r.valid ? r.value.toPrecision(4) : <span className="text-destructive">invalid</span>}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {r.targets.join(' · ')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={() => {
              const all: Record<string, boolean> = {};
              transferRows.forEach(r => { all[r.key] = r.valid; });
              setSelected(all);
            }}>Select all</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected({})}>Clear</Button>
            <Button variant="outline" size="sm" onClick={() => setPushOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleConfirmPush}>
              <Send className="h-3 w-3 mr-1" /> Confirm Push
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preset Apply confirmation dialog ── */}
      <Dialog open={presetPreviewOpen} onOpenChange={setPresetPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary" />
              Apply preset to inputs
            </DialogTitle>
            <DialogDescription>
              The following analyzer inputs will be replaced with preset values.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const p = AIRCRAFT_PRESETS.find(x => x.id === presetId);
            if (!p) return null;
            const rows: Array<[string, number, number, string]> = [
              ['Wing area S',       S,            p.wingArea,         'm²'],
              ['Wing span b',       b,            p.wingSpan,         'm'],
              ['Airspeed V',        velocity_ms,  p.airspeed,         'm/s'],
              ['Air density ρ',     density,      p.airDensity,       'kg/m³'],
              ['Oswald eff. e',     e,            p.oswaldEfficiency, '—'],
            ];
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Input</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Preset</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(([lbl, cur, nxt, u]) => (
                    <TableRow key={lbl}>
                      <TableCell className="text-xs">{lbl}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(cur, 3)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-primary">{fmt(nxt, 3)}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{u}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setPresetPreviewOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              const p = AIRCRAFT_PRESETS.find(x => x.id === presetId);
              if (p && onApplyPreset) {
                onApplyPreset(p);
                toast.success(`Applied preset: ${p.name}`);
              }
              setPresetPreviewOpen(false);
            }}>
              <Undo2 className="h-3 w-3 mr-1 rotate-180" /> Apply preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AeroCard>
  );
}

function Cell({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-md border border-border/40 bg-card/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-mono text-foreground">{fmt(v, 3)}</div>
    </div>
  );
}

export default LDExtrasPanel;