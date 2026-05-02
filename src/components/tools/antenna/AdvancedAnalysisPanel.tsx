/**
 * AdvancedAnalysisPanel
 *
 * Tier-1 (Phases 1–3) upgrades for the Antenna Pattern Analyzer:
 *   1. Bandwidth — frequency sweep with Gain / HPBW / FBR vs f curves
 *   2. Polarization — axial ratio, sense, XPD, mismatch loss explorer
 *   3. Link Budget — Friis + ITU-R losses → C/N₀, Eb/N₀, margin verdict
 *
 * Mounted below the existing analyzer results so the legacy UI is untouched.
 * All physics lives in `src/lib/antenna/{sweep,polarization,linkBudget}.ts`.
 */

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { Activity, Radio, Satellite, Zap, AlertTriangle, Layers, Disc3 } from "lucide-react";

import { AeroCard } from "@/components/common/AeroCard";
import { AeroButton } from "@/components/common/AeroButton";
import { AeroFormField } from "@/components/forms/AeroFormField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { spacingVertical } from "@/styles/spacing";
import { globalAxisCommonProps, globalAxisTickStyle } from "@/lib/chartAxisTheme";

import { runFrequencySweep, defaultSweepRange, type SweepResult } from "@/lib/antenna/sweep";
import {
  analyzePolarization,
  polarizationMismatchDb,
  type PolarizationResult,
} from "@/lib/antenna/polarization";
import {
  computeLinkBudget,
  LINK_PRESETS,
  type LinkBudgetResult,
  type LinkPresetKey,
} from "@/lib/antenna/linkBudget";
import {
  summarizeCoupledArray,
  type CoupledArraySummary,
} from "@/lib/antenna/coupling";
import {
  analyzePOReflector,
  type POReflectorResult,
} from "@/lib/antenna/po";
import type { AntennaGeometry } from "@/lib/antenna/models-enhanced";

interface AdvancedAnalysisPanelProps {
  antennaId: string;
  antennaName: string;
  geometry: AntennaGeometry;
  frequencyHz: number;
  peakGainDbi: number;
  peakGainLinear: number;
  eirpDbw: number;
  polarization: string;
}

const fmt = (n: number, d = 2) =>
  Number.isFinite(n) ? n.toFixed(d) : "—";

const fmtFreq = (hz: number) => {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`;
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MHz`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`;
  return `${hz.toFixed(1)} Hz`;
};

const verdictTone: Record<LinkBudgetResult["verdict"], string> = {
  PASS: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  MARGINAL: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  FAIL: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

export const AdvancedAnalysisPanel = ({
  antennaId,
  antennaName,
  geometry,
  frequencyHz,
  peakGainDbi,
  peakGainLinear,
  eirpDbw,
  polarization,
}: AdvancedAnalysisPanelProps) => {
  // ── Phase 1: Bandwidth sweep state ─────────────────────────────────────
  const defaultRange = useMemo(() => defaultSweepRange(frequencyHz), [frequencyHz]);
  const [sweepMinMhz, setSweepMinMhz] = useState(() => (defaultRange.fMinHz / 1e6).toFixed(2));
  const [sweepMaxMhz, setSweepMaxMhz] = useState(() => (defaultRange.fMaxHz / 1e6).toFixed(2));
  const [sweepSteps, setSweepSteps] = useState(41);
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [sweepBusy, setSweepBusy] = useState(false);

  const handleRunSweep = () => {
    setSweepError(null);
    setSweepBusy(true);
    try {
      const fMin = parseFloat(sweepMinMhz) * 1e6;
      const fMax = parseFloat(sweepMaxMhz) * 1e6;
      const r = runFrequencySweep(antennaId, geometry, fMin, fMax, {
        steps: Math.max(11, Math.min(101, sweepSteps)),
      });
      setSweepResult(r);
    } catch (e) {
      setSweepError((e as Error).message);
      setSweepResult(null);
    } finally {
      setSweepBusy(false);
    }
  };

  const sweepChartData = useMemo(
    () =>
      (sweepResult?.points ?? []).map((p) => ({
        f: Number(p.frequencyMHz.toFixed(3)),
        gain: Number(p.gainDbi.toFixed(2)),
        hpbw: Number.isFinite(p.hpbwMajorDeg) ? Number(p.hpbwMajorDeg.toFixed(1)) : null,
        fbr: Number.isFinite(p.fbrDb) ? Number(p.fbrDb.toFixed(1)) : null,
      })),
    [sweepResult],
  );

  // ── Phase 2: Polarization ──────────────────────────────────────────────
  const polResult: PolarizationResult = useMemo(
    () => analyzePolarization(peakGainLinear || 1, polarization),
    [peakGainLinear, polarization],
  );

  const [rxArDb, setRxArDb] = useState(3);
  const [rxTiltDeg, setRxTiltDeg] = useState(0);
  const polLossDb = useMemo(() => {
    const txAR = polResult.axialRatio;
    const rxAR = Math.pow(10, rxArDb / 20);
    return polarizationMismatchDb(txAR, rxAR, rxTiltDeg - polResult.tiltAngleDeg);
  }, [polResult, rxArDb, rxTiltDeg]);

  // ── Phase 3: Link Budget ───────────────────────────────────────────────
  const [presetKey, setPresetKey] = useState<LinkPresetKey | "custom">("starlink_user");
  const [distanceKm, setDistanceKm] = useState("550");
  const [rxGainDbi, setRxGainDbi] = useState("35");
  const [systemTempK, setSystemTempK] = useState("150");
  const [dataRateKbps, setDataRateKbps] = useState("100000");
  const [rainDbPerKm, setRainDbPerKm] = useState("0");

  const applyPreset = (k: LinkPresetKey | "custom") => {
    setPresetKey(k);
    if (k === "custom") return;
    const p = LINK_PRESETS[k];
    setDistanceKm(String(p.distanceKm));
    setRxGainDbi(String(p.rxGainDbi));
    setSystemTempK(String(p.systemTempK));
    setDataRateKbps(String(p.dataRateKbps));
  };

  const linkResult: LinkBudgetResult | null = useMemo(() => {
    try {
      const d = parseFloat(distanceKm) * 1000;
      const dr = parseFloat(dataRateKbps) * 1000;
      return computeLinkBudget({
        frequencyHz,
        eirpDbw,
        distanceM: d,
        rxGainDbi: parseFloat(rxGainDbi),
        systemTempK: parseFloat(systemTempK),
        dataRateBps: dr,
        bandwidthHz: dr,
        rainRateDbPerKm: parseFloat(rainDbPerKm),
        polarizationLossDb: polLossDb,
      });
    } catch {
      return null;
    }
  }, [frequencyHz, eirpDbw, distanceKm, rxGainDbi, systemTempK, dataRateKbps, rainDbPerKm, polLossDb]);

  return (
    <AeroCard
      title="Advanced Analyses"
      description="Bandwidth, polarization & link-budget toolkit (Tier-1 upgrades)"
      icon={Activity}
    >
      <Tabs defaultValue="bandwidth" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 border border-primary/20">
          <TabsTrigger value="bandwidth" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Activity className="h-4 w-4 mr-2" /> Bandwidth
          </TabsTrigger>
          <TabsTrigger value="polarization" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Radio className="h-4 w-4 mr-2" /> Polarization
          </TabsTrigger>
          <TabsTrigger value="link" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Satellite className="h-4 w-4 mr-2" /> Link Budget
          </TabsTrigger>
        </TabsList>

        {/* ─────────────── PHASE 1 — BANDWIDTH ─────────────── */}
        <TabsContent value="bandwidth" className={`pt-4 ${spacingVertical.M}`}>
          <p className="text-xs text-gray-400">
            Sweeps <span className="text-primary">{antennaName}</span> across the band and plots gain, HPBW and front-to-back ratio vs frequency. Identifies the −3 dB pattern bandwidth.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <AeroFormField label="f min (MHz)">
              <Input value={sweepMinMhz} onChange={(e) => setSweepMinMhz(e.target.value)} className="bg-slate-900/50 border-primary/30 text-white" />
            </AeroFormField>
            <AeroFormField label="f max (MHz)">
              <Input value={sweepMaxMhz} onChange={(e) => setSweepMaxMhz(e.target.value)} className="bg-slate-900/50 border-primary/30 text-white" />
            </AeroFormField>
            <AeroFormField label="Samples">
              <Input
                type="number"
                min={11}
                max={101}
                value={sweepSteps}
                onChange={(e) => setSweepSteps(parseInt(e.target.value, 10) || 41)}
                className="bg-slate-900/50 border-primary/30 text-white"
              />
            </AeroFormField>
            <div className="flex items-end">
              <AeroButton variant="primary" onClick={handleRunSweep} disabled={sweepBusy} icon={Zap}>
                {sweepBusy ? "Running…" : "Run sweep"}
              </AeroButton>
            </div>
          </div>

          {sweepError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sweep failed</AlertTitle>
              <AlertDescription>{sweepError}</AlertDescription>
            </Alert>
          )}

          {sweepResult && sweepResult.points.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Stat label="Peak gain" value={`${fmt(sweepResult.summary.peakGainDbi)} dBi`} />
                <Stat label="Peak f" value={fmtFreq(sweepResult.summary.peakGainFrequencyHz)} />
                <Stat
                  label="−3 dB BW"
                  value={
                    sweepResult.summary.bandwidth3dBHz
                      ? fmtFreq(sweepResult.summary.bandwidth3dBHz)
                      : "—"
                  }
                />
                <Stat
                  label="Fractional BW"
                  value={
                    sweepResult.summary.fractionalBandwidthPct !== null
                      ? `${fmt(sweepResult.summary.fractionalBandwidthPct, 1)} %`
                      : "—"
                  }
                />
              </div>

              <div className="h-72 w-full rounded-md border border-primary/10 bg-slate-900/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sweepChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="f"
                      label={{ value: "Frequency (MHz)", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }}
                      tick={globalAxisTickStyle}
                      {...globalAxisCommonProps}
                    />
                    <YAxis
                      yAxisId="gain"
                      label={{ value: "Gain (dBi)", angle: -90, position: "insideLeft", fill: "hsl(var(--primary))" }}
                      tick={globalAxisTickStyle}
                      {...globalAxisCommonProps}
                    />
                    <YAxis
                      yAxisId="hpbw"
                      orientation="right"
                      label={{ value: "HPBW (°)", angle: 90, position: "insideRight", fill: "hsl(var(--accent))" }}
                      tick={globalAxisTickStyle}
                      {...globalAxisCommonProps}
                    />
                    <RechartsTooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--primary) / 0.3)" }}
                      labelStyle={{ color: "hsl(var(--primary))" }}
                    />
                    <Legend />
                    <Line yAxisId="gain" type="monotone" dataKey="gain" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Gain (dBi)" />
                    <Line yAxisId="hpbw" type="monotone" dataKey="hpbw" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="HPBW (°)" />
                    <Line yAxisId="gain" type="monotone" dataKey="fbr" stroke="hsl(var(--destructive))" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="F/B (dB)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {sweepResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {sweepResult.warnings.join(" · ")}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </TabsContent>

        {/* ─────────────── PHASE 2 — POLARIZATION ─────────────── */}
        <TabsContent value="polarization" className={`pt-4 ${spacingVertical.M}`}>
          <p className="text-xs text-gray-400">
            Decomposes the field into orthogonal Eθ / Eφ components, derives axial ratio, tilt and sense, and computes the polarization-mismatch loss against an arbitrary RX antenna.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <Stat label="Axial ratio" value={polResult.axialRatioDb === Infinity ? "∞ (linear)" : `${fmt(polResult.axialRatioDb)} dB`} />
            <Stat label="Sense" value={polResult.sense} />
            <Stat label="Tilt τ" value={`${fmt(polResult.tiltAngleDeg, 1)}°`} />
            <Stat label="XPD" value={polResult.xpdDb === Infinity ? "∞" : `${fmt(polResult.xpdDb)} dB`} />
          </div>

          <div className="rounded-md border border-primary/20 bg-slate-900/40 p-3">
            <Label className="text-primary text-xs">Mismatch explorer</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              <AeroFormField label="RX axial ratio (dB)">
                <Input
                  type="number"
                  step="0.1"
                  value={rxArDb}
                  onChange={(e) => setRxArDb(parseFloat(e.target.value) || 0)}
                  className="bg-slate-900/50 border-primary/30 text-white"
                />
              </AeroFormField>
              <AeroFormField label="RX tilt (deg)">
                <Input
                  type="number"
                  step="1"
                  value={rxTiltDeg}
                  onChange={(e) => setRxTiltDeg(parseFloat(e.target.value) || 0)}
                  className="bg-slate-900/50 border-primary/30 text-white"
                />
              </AeroFormField>
              <div className="flex flex-col justify-end">
                <Label className="text-xs text-gray-400">Polarization loss</Label>
                <div className="text-lg font-semibold text-primary">{fmt(polLossDb, 2)} dB</div>
              </div>
            </div>
          </div>

          <Alert className="border-primary/20 bg-primary/5">
            <AlertDescription className="text-xs text-gray-300">
              {polResult.isCircular
                ? "TX is essentially circularly polarized — pair with an RX of matching sense for &lt; 0.5 dB loss."
                : polResult.isLinear
                  ? "TX is essentially linearly polarized — losses depend strongly on relative tilt angle."
                  : "TX is elliptically polarized — losses depend on both axial ratio and tilt."}
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* ─────────────── PHASE 3 — LINK BUDGET ─────────────── */}
        <TabsContent value="link" className={`pt-4 ${spacingVertical.M}`}>
          <p className="text-xs text-gray-400">
            Connects the computed EIRP ({fmt(eirpDbw)} dBW) to a Friis link budget with simplified ITU-R P.676 (atmosphere) and P.618 (rain). Polarization loss is wired in from the Polarization tab.
          </p>

          <AeroFormField label="Mission preset">
            <Select value={presetKey} onValueChange={(v) => applyPreset(v as LinkPresetKey | "custom")}>
              <SelectTrigger className="bg-slate-900/50 border-primary/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LINK_PRESETS).map(([k, p]) => (
                  <SelectItem key={k} value={k}>{p.name}</SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </AeroFormField>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <AeroFormField label="Distance (km)">
              <Input value={distanceKm} onChange={(e) => { setDistanceKm(e.target.value); setPresetKey("custom"); }} className="bg-slate-900/50 border-primary/30 text-white" />
            </AeroFormField>
            <AeroFormField label="RX gain (dBi)">
              <Input value={rxGainDbi} onChange={(e) => { setRxGainDbi(e.target.value); setPresetKey("custom"); }} className="bg-slate-900/50 border-primary/30 text-white" />
            </AeroFormField>
            <AeroFormField label="System temp (K)">
              <Input value={systemTempK} onChange={(e) => { setSystemTempK(e.target.value); setPresetKey("custom"); }} className="bg-slate-900/50 border-primary/30 text-white" />
            </AeroFormField>
            <AeroFormField label="Data rate (kbps)">
              <Input value={dataRateKbps} onChange={(e) => { setDataRateKbps(e.target.value); setPresetKey("custom"); }} className="bg-slate-900/50 border-primary/30 text-white" />
            </AeroFormField>
            <AeroFormField label="Rain (dB/km)">
              <Input value={rainDbPerKm} onChange={(e) => setRainDbPerKm(e.target.value)} className="bg-slate-900/50 border-primary/30 text-white" />
            </AeroFormField>
            <div className="flex flex-col justify-end">
              <Label className="text-xs text-gray-400">Peak gain (TX)</Label>
              <div className="text-sm text-primary">{fmt(peakGainDbi)} dBi</div>
            </div>
          </div>

          {linkResult && (
            <>
              <div className={`rounded-md border p-3 ${verdictTone[linkResult.verdict]}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider opacity-80">Link verdict</div>
                    <div className="text-2xl font-bold">{linkResult.verdict}</div>
                  </div>
                  <Badge variant="outline" className="text-sm bg-black/30">
                    Margin: {fmt(linkResult.marginDb)} dB
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Stat label="FSPL" value={`${fmt(linkResult.fsplDb)} dB`} />
                <Stat label="Atmospheric" value={`${fmt(linkResult.atmosphericLossDb)} dB`} />
                <Stat label="Rain" value={`${fmt(linkResult.rainLossDb)} dB`} />
                <Stat label="Total loss" value={`${fmt(linkResult.totalLossDb)} dB`} />
                <Stat label="RX power" value={`${fmt(linkResult.rxPowerDbw)} dBW`} />
                <Stat label="C/N₀" value={`${fmt(linkResult.cn0DbHz)} dB·Hz`} />
                <Stat label="Eb/N₀" value={`${fmt(linkResult.ebN0Db)} dB`} />
                <Stat label="G/T" value={`${fmt(linkResult.gOverTDbK)} dB/K`} />
              </div>

              {linkResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {linkResult.warnings.join(" · ")}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </AeroCard>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-slate-900/40 border border-primary/10 px-2 py-1.5">
    <div className="text-[10px] uppercase tracking-wider text-gray-400">{label}</div>
    <div className="text-sm font-semibold text-primary truncate">{value}</div>
  </div>
);

export default AdvancedAnalysisPanel;