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
import { Activity, Radio, Satellite, Zap, AlertTriangle, Layers, Disc3, Cpu, Download, GitCompare, Save, Trash2, BookmarkPlus } from "lucide-react";

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
import {
  solveThinWireMoM,
  type MomResult,
} from "@/lib/antenna/mom";
import type { AntennaGeometry } from "@/lib/antenna/models-enhanced";

// ── Saved MoM run preset (localStorage) ─────────────────────────────────
interface SavedMomRun {
  id: string;
  label: string;
  savedAt: string;
  antennaId: string;
  antennaName: string;
  frequencyHz: number;
  inputs: { lengthM: number; radiusM: number; segments: number };
  zin: { re: number; im: number };
  vswr50: number;
  peakGainDbi: number;
  hpbwDeg: number;
  pattern: { thetaDeg: number[]; gainDbi: number[] };
  current: { zM: number; mag: number }[];
  analyticPeakGainDbi: number;
}
const MOM_RUNS_KEY = "aerorbis_mom_runs";
const loadSavedMomRuns = (): SavedMomRun[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MOM_RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedMomRun[]) : [];
  } catch {
    return [];
  }
};
const persistSavedMomRuns = (runs: SavedMomRun[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOM_RUNS_KEY, JSON.stringify(runs));
};

// Overlay palette (semantic-token friendly via inline HSL refs)
const OVERLAY_COLORS = [
  "hsl(var(--accent))",
  "hsl(45 95% 60%)",
  "hsl(280 80% 65%)",
  "hsl(150 70% 55%)",
  "hsl(15 85% 60%)",
];

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

  // ── Phase 4: Mutual coupling (Carter) ─────────────────────────────────
  const initialN = Number((geometry as Record<string, unknown>).numElements) || 4;
  const initialSpacing = Number((geometry as Record<string, unknown>).spacing) || 0.5;
  const initialPhase = Number((geometry as Record<string, unknown>).progressivePhase) || 0;
  const [coupN, setCoupN] = useState(initialN);
  const [coupSpacing, setCoupSpacing] = useState(String(initialSpacing));
  const [coupPhase, setCoupPhase] = useState(String(initialPhase));
  const [coupResult, setCoupResult] = useState<CoupledArraySummary | null>(null);
  const [coupError, setCoupError] = useState<string | null>(null);

  const handleRunCoupling = () => {
    setCoupError(null);
    try {
      const N = Math.max(2, Math.min(32, Math.floor(coupN)));
      const sp = parseFloat(coupSpacing);
      const ph = parseFloat(coupPhase);
      if (!Number.isFinite(sp) || sp <= 0) throw new Error("Spacing must be > 0 λ");
      setCoupResult(summarizeCoupledArray(N, sp, Number.isFinite(ph) ? ph : 0));
    } catch (e) {
      setCoupError((e as Error).message);
      setCoupResult(null);
    }
  };

  // ── Phase 5: PO Reflector ─────────────────────────────────────────────
  const initialDish = Number((geometry as Record<string, unknown>).diameter) || 1.0;
  const [dishD, setDishD] = useState(String(initialDish));
  const [dishFD, setDishFD] = useState("0.4");
  const [feedQ, setFeedQ] = useState("2");
  const [poResult, setPoResult] = useState<POReflectorResult | null>(null);
  const [poError, setPoError] = useState<string | null>(null);
  const [poBusy, setPoBusy] = useState(false);

  const handleRunPO = () => {
    setPoError(null);
    setPoBusy(true);
    try {
      const D = parseFloat(dishD);
      const fOverD = parseFloat(dishFD);
      const q = parseFloat(feedQ);
      if (!Number.isFinite(D) || D <= 0) throw new Error("Diameter must be > 0");
      if (!Number.isFinite(fOverD) || fOverD <= 0) throw new Error("f/D must be > 0");
      const r = analyzePOReflector({
        diameterM: D,
        fOverD,
        frequencyHz,
        feedQ: Number.isFinite(q) && q > 0 ? q : 2,
      });
      setPoResult(r);
    } catch (e) {
      setPoError((e as Error).message);
      setPoResult(null);
    } finally {
      setPoBusy(false);
    }
  };

  const poChartData = useMemo(
    () =>
      (poResult?.pattern.thetaDeg ?? []).map((t, i) => ({
        theta: Number(t.toFixed(3)),
        gain: Number((poResult?.pattern.gainDbi[i] ?? -80).toFixed(2)),
      })),
    [poResult],
  );

  // ── Phase 6: Thin-wire MoM solver ─────────────────────────────────────
  const initialLength =
    Number((geometry as Record<string, unknown>).length) ||
    (299792458 / Math.max(frequencyHz, 1)) / 2; // λ/2 default
  const [momLength, setMomLength] = useState(initialLength.toFixed(4));
  const [momRadius, setMomRadius] = useState("0.001");
  const [momSegments, setMomSegments] = useState(51);
  const [momResult, setMomResult] = useState<MomResult | null>(null);
  const [momError, setMomError] = useState<string | null>(null);
  const [momBusy, setMomBusy] = useState(false);
  const [momScale, setMomScale] = useState<"dB" | "linear">("dB");
  const [momConvergence, setMomConvergence] = useState<{
    deltaZinPct: number;
    deltaPeakGainDb: number;
    currentCorr: number;
    converged: boolean;
    refinedSegments: number;
    failedConditions: string[];
  } | null>(null);

  // Configurable convergence thresholds
  const [convThreshZinPct, setConvThreshZinPct] = useState(5);
  const [convThreshGainDb, setConvThreshGainDb] = useState(0.5);
  const [convThreshCorr, setConvThreshCorr] = useState(0.99);

  // Saved MoM runs (preset library)
  const [savedMomRuns, setSavedMomRuns] = useState<SavedMomRun[]>(() => loadSavedMomRuns());
  const [overlayIds, setOverlayIds] = useState<string[]>([]);
  const [savePresetLabel, setSavePresetLabel] = useState("");

  const C0 = 299792458;
  const lambda = C0 / Math.max(frequencyHz, 1);
  const momPresets: { label: string; L: number; a: number; note: string }[] = [
    { label: "λ/2 dipole", L: lambda * 0.5, a: lambda * 1e-3, note: "Resonant, ~73 Ω" },
    { label: "λ/4 monopole", L: lambda * 0.25, a: lambda * 1e-3, note: "Quarter-wave" },
    { label: "Full-wave", L: lambda, a: lambda * 1e-3, note: "1λ wire" },
    { label: "Short dipole", L: lambda * 0.1, a: lambda * 1e-3, note: "0.1λ, capacitive" },
    { label: "1.25λ extended", L: lambda * 1.25, a: lambda * 1e-3, note: "Higher gain" },
  ];

  const applyMomPreset = (p: { L: number; a: number }) => {
    setMomLength(p.L.toFixed(4));
    setMomRadius(p.a.toExponential(3));
  };

  const handleRunMoM = () => {
    setMomError(null);
    setMomBusy(true);
    setMomConvergence(null);
    try {
      const L = parseFloat(momLength);
      const a = parseFloat(momRadius);
      if (!Number.isFinite(L) || L <= 0) throw new Error("Length must be > 0 m");
      if (!Number.isFinite(a) || a <= 0) throw new Error("Radius must be > 0 m");
      // Defer to keep UI responsive for ~150 segments.
      setTimeout(() => {
        try {
          const r = solveThinWireMoM({
            lengthM: L,
            radiusM: a,
            frequencyHz,
            numSegments: momSegments,
          });
          setMomResult(r);
          // ── Auto convergence check: re-run with denser mesh
          try {
            const refinedN = Math.min(151, (momSegments % 2 === 0 ? momSegments + 1 : momSegments) + 20);
            if (refinedN > momSegments) {
              const r2 = solveThinWireMoM({
                lengthM: L,
                radiusM: a,
                frequencyHz,
                numSegments: refinedN,
              });
              const z1 = Math.hypot(r.inputImpedance.re, r.inputImpedance.im);
              const z2 = Math.hypot(r2.inputImpedance.re, r2.inputImpedance.im);
              const deltaZinPct = z1 > 0 ? Math.abs(z2 - z1) / z1 * 100 : 0;
              const deltaPeakGainDb = Math.abs(r2.peakGainDbi - r.peakGainDbi);
              // Sample-aligned correlation of |I| envelopes
              const N = Math.min(r.current.length, r2.current.length);
              const a1: number[] = [];
              const a2: number[] = [];
              for (let i = 0; i < N; i++) {
                const idx2 = Math.round((i / (N - 1)) * (r2.current.length - 1));
                a1.push(r.current[i].mag);
                a2.push(r2.current[idx2].mag);
              }
              const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
              const m1 = mean(a1), m2 = mean(a2);
              let num = 0, d1 = 0, d2 = 0;
              for (let i = 0; i < N; i++) {
                const x = a1[i] - m1, y = a2[i] - m2;
                num += x * y; d1 += x * x; d2 += y * y;
              }
              const corr = d1 > 0 && d2 > 0 ? num / Math.sqrt(d1 * d2) : 1;
              const failed: string[] = [];
              if (deltaZinPct >= convThreshZinPct) failed.push(`ΔZ_in ${deltaZinPct.toFixed(2)}% ≥ ${convThreshZinPct}%`);
              if (deltaPeakGainDb >= convThreshGainDb) failed.push(`ΔPeakGain ${deltaPeakGainDb.toFixed(3)} dB ≥ ${convThreshGainDb} dB`);
              if (corr <= convThreshCorr) failed.push(`corr ${corr.toFixed(4)} ≤ ${convThreshCorr}`);
              setMomConvergence({
                deltaZinPct,
                deltaPeakGainDb,
                currentCorr: corr,
                converged: failed.length === 0,
                refinedSegments: refinedN,
                failedConditions: failed,
              });
            }
          } catch {
            /* convergence is best-effort */
          }
        } catch (e) {
          setMomError((e as Error).message);
          setMomResult(null);
        } finally {
          setMomBusy(false);
        }
      }, 10);
    } catch (e) {
      setMomError((e as Error).message);
      setMomResult(null);
      setMomBusy(false);
    }
  };

  const momCurrentChart = useMemo(
    () =>
      (momResult?.current ?? []).map((c) => ({
        z: Number((c.zM * 1000).toFixed(2)),
        mag: Number((c.mag * 1000).toFixed(4)),
      })),
    [momResult],
  );

  const momPatternChart = useMemo(
    () =>
      (momResult?.pattern.thetaDeg ?? []).map((t, i) => ({
        theta: Number(t.toFixed(2)),
        gain: Number((momResult?.pattern.gainDbi[i] ?? -60).toFixed(2)),
        gainLin: Number(
          Math.pow(10, (momResult?.pattern.gainDbi[i] ?? -60) / 10).toFixed(4),
        ),
      })),
    [momResult],
  );

  // ── Export helpers ────────────────────────────────────────────────
  const downloadBlob = (filename: string, mime: string, data: string) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMomJson = () => {
    if (!momResult) return;
    const payload = {
      antenna: { id: antennaId, name: antennaName },
      frequencyHz,
      input: {
        lengthM: momResult.lengthM,
        radiusM: momResult.radiusM,
        segments: momResult.segments,
      },
      results: {
        inputImpedance: momResult.inputImpedance,
        vswr50: momResult.vswr50,
        returnLoss50Db: momResult.returnLoss50Db,
        peakGainDbi: momResult.peakGainDbi,
        hpbwDeg: momResult.hpbwDeg,
        radiatedPowerW: momResult.radiatedPowerW,
        wavelengthM: momResult.wavelengthM,
      },
      convergence: momConvergence,
      currentDistribution: momResult.current,
      pattern: momResult.pattern,
      backend: momResult.backend,
      exportedAt: new Date().toISOString(),
    };
    downloadBlob(
      `mom_${antennaId}_${Date.now()}.json`,
      "application/json",
      JSON.stringify(payload, null, 2),
    );
  };

  const handleExportMomCsv = () => {
    if (!momResult) return;
    const lines: string[] = [];
    lines.push("# AERORBIS MoM export");
    lines.push(`# antenna,${antennaName} (${antennaId})`);
    lines.push(`# frequency_Hz,${frequencyHz}`);
    lines.push(`# length_m,${momResult.lengthM}`);
    lines.push(`# radius_m,${momResult.radiusM}`);
    lines.push(`# segments,${momResult.segments}`);
    lines.push(`# Zin_re_ohm,${momResult.inputImpedance.re}`);
    lines.push(`# Zin_im_ohm,${momResult.inputImpedance.im}`);
    lines.push(`# vswr50,${momResult.vswr50}`);
    lines.push(`# return_loss_dB,${momResult.returnLoss50Db}`);
    lines.push(`# peak_gain_dBi,${momResult.peakGainDbi}`);
    lines.push(`# hpbw_deg,${momResult.hpbwDeg}`);
    lines.push("");
    lines.push("section,index,x,y,extra");
    momResult.current.forEach((c, i) =>
      lines.push(`current,${i},${c.zM},${c.mag},${c.re};${c.im}`),
    );
    momResult.pattern.thetaDeg.forEach((t, i) =>
      lines.push(`pattern,${i},${t},${momResult.pattern.gainDbi[i]},`),
    );
    downloadBlob(
      `mom_${antennaId}_${Date.now()}.csv`,
      "text/csv",
      lines.join("\n"),
    );
  };

  // ── Save / Load / Delete MoM run presets ─────────────────────────────
  const handleSaveMomRun = () => {
    if (!momResult) return;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const label =
      savePresetLabel.trim() ||
      `${antennaName} · ${(momResult.lengthM / momResult.wavelengthM).toFixed(2)}λ · ${fmtFreq(frequencyHz)}`;
    const entry: SavedMomRun = {
      id,
      label,
      savedAt: new Date().toISOString(),
      antennaId,
      antennaName,
      frequencyHz,
      inputs: {
        lengthM: momResult.lengthM,
        radiusM: momResult.radiusM,
        segments: momResult.segments,
      },
      zin: { ...momResult.inputImpedance },
      vswr50: momResult.vswr50,
      peakGainDbi: momResult.peakGainDbi,
      hpbwDeg: momResult.hpbwDeg,
      pattern: {
        thetaDeg: [...momResult.pattern.thetaDeg],
        gainDbi: [...momResult.pattern.gainDbi],
      },
      current: momResult.current.map((c) => ({ zM: c.zM, mag: c.mag })),
      analyticPeakGainDbi: peakGainDbi,
    };
    const next = [entry, ...savedMomRuns].slice(0, 12);
    setSavedMomRuns(next);
    persistSavedMomRuns(next);
    setOverlayIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSavePresetLabel("");
  };

  const handleDeleteMomRun = (id: string) => {
    const next = savedMomRuns.filter((r) => r.id !== id);
    setSavedMomRuns(next);
    persistSavedMomRuns(next);
    setOverlayIds((prev) => prev.filter((x) => x !== id));
  };

  const handleLoadMomRun = (run: SavedMomRun) => {
    setMomLength(run.inputs.lengthM.toFixed(4));
    setMomRadius(run.inputs.radiusM.toExponential(3));
    setMomSegments(run.inputs.segments);
  };

  const toggleOverlay = (id: string) => {
    setOverlayIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Build overlay datasets for pattern comparison chart
  const activeOverlays = useMemo(
    () => savedMomRuns.filter((r) => overlayIds.includes(r.id)),
    [savedMomRuns, overlayIds],
  );

  const overlayPatternChart = useMemo(() => {
    // Use a unified θ axis (0..180 in 2° steps) and resample each overlay
    const thetaAxis: number[] = [];
    for (let t = 0; t <= 180; t += 2) thetaAxis.push(t);
    const sample = (theta: number[], gain: number[], at: number) => {
      if (!theta.length) return null;
      // linear interp
      let lo = 0;
      for (let i = 0; i < theta.length - 1; i++) {
        if (theta[i] <= at && at <= theta[i + 1]) {
          lo = i;
          break;
        }
        if (at > theta[theta.length - 1]) lo = theta.length - 2;
      }
      const x0 = theta[lo], x1 = theta[lo + 1];
      const y0 = gain[lo], y1 = gain[lo + 1];
      if (x1 === x0) return y0;
      const u = (at - x0) / (x1 - x0);
      return y0 + u * (y1 - y0);
    };
    return thetaAxis.map((t) => {
      const row: Record<string, number | null> = { theta: t };
      if (momResult) {
        row["__current"] = sample(
          momResult.pattern.thetaDeg,
          momResult.pattern.gainDbi,
          t,
        );
      }
      // Analytic baseline = constant peak gain reference
      row["__analytic"] = peakGainDbi;
      activeOverlays.forEach((r) => {
        row[r.id] = sample(r.pattern.thetaDeg, r.pattern.gainDbi, t);
      });
      return row;
    });
  }, [momResult, activeOverlays, peakGainDbi]);

  const handleExportComparison = (fmtKind: "json" | "csv") => {
    if (!momResult) return;
    const base = {
      antenna: { id: antennaId, name: antennaName },
      frequencyHz,
      analytic: {
        peakGainDbi,
        eirpDbw,
        polarizationAxialRatioDb: polResult.axialRatioDb,
      },
      mom: {
        zin: momResult.inputImpedance,
        vswr50: momResult.vswr50,
        peakGainDbi: momResult.peakGainDbi,
        hpbwDeg: momResult.hpbwDeg,
      },
      linkBudget: linkResult
        ? { eirpDbw, distanceKm: parseFloat(distanceKm) }
        : null,
      savedRuns: activeOverlays.map((r) => ({
        id: r.id,
        label: r.label,
        zin: r.zin,
        vswr50: r.vswr50,
        peakGainDbi: r.peakGainDbi,
        analyticPeakGainDbi: r.analyticPeakGainDbi,
      })),
      exportedAt: new Date().toISOString(),
    };
    if (fmtKind === "json") {
      downloadBlob(
        `mom_comparison_${antennaId}_${Date.now()}.json`,
        "application/json",
        JSON.stringify(base, null, 2),
      );
      return;
    }
    const lines: string[] = [];
    lines.push("# AERORBIS MoM-vs-Analytic comparison");
    lines.push(`# antenna,${antennaName} (${antennaId})`);
    lines.push(`# frequency_Hz,${frequencyHz}`);
    lines.push("source,label,Zin_re_ohm,Zin_im_ohm,vswr50,peak_gain_dBi,analytic_peak_gain_dBi");
    lines.push(
      `analytic,registry,,,,${peakGainDbi},${peakGainDbi}`,
    );
    lines.push(
      `mom,current run,${momResult.inputImpedance.re},${momResult.inputImpedance.im},${momResult.vswr50},${momResult.peakGainDbi},${peakGainDbi}`,
    );
    activeOverlays.forEach((r) =>
      lines.push(
        `mom_saved,${r.label.replace(/,/g, ";")},${r.zin.re},${r.zin.im},${r.vswr50},${r.peakGainDbi},${r.analyticPeakGainDbi}`,
      ),
    );
    downloadBlob(
      `mom_comparison_${antennaId}_${Date.now()}.csv`,
      "text/csv",
      lines.join("\n"),
    );
  };

  return (
    <AeroCard
      title="Advanced Analyses"
      description="Bandwidth, polarization, link-budget, coupling, PO reflector & MoM solver"
      icon={Activity}
    >
      <Tabs defaultValue="bandwidth" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-slate-900/50 border border-primary/20">
          <TabsTrigger value="bandwidth" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Activity className="h-4 w-4 mr-2" /> Bandwidth
          </TabsTrigger>
          <TabsTrigger value="polarization" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Radio className="h-4 w-4 mr-2" /> Polarization
          </TabsTrigger>
          <TabsTrigger value="link" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Satellite className="h-4 w-4 mr-2" /> Link Budget
          </TabsTrigger>
          <TabsTrigger value="coupling" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Layers className="h-4 w-4 mr-2" /> Coupling
          </TabsTrigger>
          <TabsTrigger value="po" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Disc3 className="h-4 w-4 mr-2" /> PO Reflector
          </TabsTrigger>
          <TabsTrigger value="mom" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Cpu className="h-4 w-4 mr-2" /> MoM Solver
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

        {/* ─────────────── PHASE 4 — MUTUAL COUPLING (CARTER) ─────────────── */}
        <TabsContent value="coupling" className={`pt-4 ${spacingVertical.M}`}>
          <p className="text-xs text-gray-400">
            Carter&rsquo;s closed-form mutual impedance for parallel side-by-side λ/2
            dipoles. Solves the Z-matrix and reports the active driving-point impedance
            and the realised gain correction relative to the analytic isolated-element
            assumption (Balanis §8.6).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AeroFormField label="Elements N">
              <Input
                type="number"
                min={2}
                max={32}
                value={coupN}
                onChange={(e) => setCoupN(parseInt(e.target.value, 10) || 4)}
                className="bg-slate-900/50 border-primary/30 text-white"
              />
            </AeroFormField>
            <AeroFormField label="Spacing (λ)">
              <Input
                value={coupSpacing}
                onChange={(e) => setCoupSpacing(e.target.value)}
                className="bg-slate-900/50 border-primary/30 text-white"
              />
            </AeroFormField>
            <AeroFormField label="Progressive phase (deg)">
              <Input
                value={coupPhase}
                onChange={(e) => setCoupPhase(e.target.value)}
                className="bg-slate-900/50 border-primary/30 text-white"
              />
            </AeroFormField>
            <div className="flex items-end">
              <AeroButton variant="primary" onClick={handleRunCoupling} icon={Zap}>
                Solve coupling
              </AeroButton>
            </div>
          </div>

          {coupError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Coupling failed</AlertTitle>
              <AlertDescription>{coupError}</AlertDescription>
            </Alert>
          )}

          {coupResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Stat label="Self R (λ/2 dipole)" value={`${fmt(coupResult.selfR)} Ω`} />
                <Stat
                  label="Avg active Z"
                  value={`${fmt(coupResult.averageActiveR)} + j${fmt(coupResult.averageActiveX)} Ω`}
                />
                <Stat
                  label="Coupling η"
                  value={`${fmt(coupResult.couplingEfficiency * 100, 1)} %`}
                />
                <Stat
                  label="Gain correction"
                  value={`${coupResult.gainCorrectionDb >= 0 ? "+" : ""}${fmt(coupResult.gainCorrectionDb, 2)} dB`}
                />
              </div>

              <div className="rounded-md border border-primary/20 bg-slate-900/40 p-3 max-h-56 overflow-auto">
                <Label className="text-primary text-xs">Per-element driving impedance</Label>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1 text-[11px] font-mono text-gray-300">
                  {coupResult.activeZ.map((z, i) => (
                    <div key={i} className="px-2 py-1 rounded bg-slate-900/60 border border-primary/10">
                      <span className="text-gray-500">#{i + 1}</span>{" "}
                      {fmt(z.re, 1)}
                      {z.im >= 0 ? " + j" : " − j"}
                      {fmt(Math.abs(z.im), 1)} Ω
                    </div>
                  ))}
                </div>
              </div>

              <Alert className="border-primary/20 bg-primary/5">
                <AlertDescription className="text-xs text-gray-300">
                  Apply the {fmt(coupResult.gainCorrectionDb, 2)} dB correction on top of the
                  analytic array gain to account for mutual coupling between elements.
                  Tighter spacings (&lt; 0.4 λ) usually push the correction more negative.
                </AlertDescription>
              </Alert>
            </>
          )}
        </TabsContent>

        {/* ─────────────── PHASE 5 — PO REFLECTOR ─────────────── */}
        <TabsContent value="po" className={`pt-4 ${spacingVertical.M}`}>
          <p className="text-xs text-gray-400">
            Physical-Optics surface-current integration for prime-focus parabolic
            reflectors. Replaces the sinc² aperture approximation with a J<sub>0</sub>
            Hankel-transform of cos<sup>q</sup> feed illumination and reports edge taper,
            spillover and aperture efficiency.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AeroFormField label="Diameter D (m)">
              <Input
                value={dishD}
                onChange={(e) => setDishD(e.target.value)}
                className="bg-slate-900/50 border-primary/30 text-white"
              />
            </AeroFormField>
            <AeroFormField label="f / D">
              <Input
                value={dishFD}
                onChange={(e) => setDishFD(e.target.value)}
                className="bg-slate-900/50 border-primary/30 text-white"
              />
            </AeroFormField>
            <AeroFormField label="Feed taper q (cos^q)">
              <Input
                value={feedQ}
                onChange={(e) => setFeedQ(e.target.value)}
                className="bg-slate-900/50 border-primary/30 text-white"
              />
            </AeroFormField>
            <div className="flex items-end">
              <AeroButton variant="primary" onClick={handleRunPO} disabled={poBusy} icon={Zap}>
                {poBusy ? "Running…" : "Run PO solver"}
              </AeroButton>
            </div>
          </div>

          {poError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>PO solver failed</AlertTitle>
              <AlertDescription>{poError}</AlertDescription>
            </Alert>
          )}

          {poResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Stat label="Peak gain" value={`${fmt(poResult.peakGainDbi)} dBi`} />
                <Stat label="HPBW" value={Number.isFinite(poResult.hpbwDeg) ? `${fmt(poResult.hpbwDeg, 2)}°` : "—"} />
                <Stat label="Edge taper" value={`${fmt(poResult.edgeTaperDb)} dB`} />
                <Stat label="Rim ψ₀" value={`${fmt(poResult.rimAngleDeg, 1)}°`} />
                <Stat label="Spillover η" value={`${fmt(poResult.spilloverEfficiency * 100, 1)} %`} />
                <Stat label="Illumination η" value={`${fmt(poResult.illuminationEfficiency * 100, 1)} %`} />
                <Stat label="Aperture η" value={`${fmt(poResult.apertureEfficiency * 100, 1)} %`} />
                <Stat label="D / λ" value={fmt(poResult.diameterM / poResult.wavelengthM, 1)} />
              </div>

              <div className="h-72 w-full rounded-md border border-primary/10 bg-slate-900/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={poChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="theta"
                      label={{ value: "θ (deg, principal cut)", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }}
                      tick={globalAxisTickStyle}
                      {...globalAxisCommonProps}
                    />
                    <YAxis
                      domain={[(dataMin: number) => Math.max(-60, dataMin - 5), (dataMax: number) => dataMax + 2]}
                      label={{ value: "Gain (dBi)", angle: -90, position: "insideLeft", fill: "hsl(var(--primary))" }}
                      tick={globalAxisTickStyle}
                      {...globalAxisCommonProps}
                    />
                    <RechartsTooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--primary) / 0.3)" }}
                      labelStyle={{ color: "hsl(var(--primary))" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="gain" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="PO gain (dBi)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {poResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {poResult.warnings.join(" · ")}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </TabsContent>

        {/* ─────────────── PHASE 6 — THIN-WIRE MoM ─────────────── */}
        <TabsContent value="mom" className={`pt-4 ${spacingVertical.M}`}>
          <p className="text-xs text-gray-400">
            High-fidelity Pocklington thin-wire Method-of-Moments kernel
            (pulse-basis, point-matching) for centre-fed straight wires.
            Solves the full Z-matrix → driving-point impedance, current
            distribution, VSWR, and the integrated radiation pattern.
            Manual trigger to preserve interactivity (Expert default
            stays analytic).
          </p>
          <div className="flex flex-wrap gap-2">
            {momPresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyMomPreset(p)}
                title={p.note}
                className="px-2.5 py-1 text-[11px] rounded-md border border-primary/30 bg-slate-900/50 hover:bg-primary/15 text-primary transition"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AeroFormField label="Length L (m)">
              <Input
                value={momLength}
                onChange={(e) => setMomLength(e.target.value)}
                className="bg-slate-900/50 border-primary/30 text-white"
              />
            </AeroFormField>
            <AeroFormField label="Radius a (m)">
              <Input
                value={momRadius}
                onChange={(e) => setMomRadius(e.target.value)}
                className="bg-slate-900/50 border-primary/30 text-white"
              />
            </AeroFormField>
            <AeroFormField label="Segments N (odd)">
              <Input
                type="number"
                min={11}
                max={151}
                step={2}
                value={momSegments}
                onChange={(e) =>
                  setMomSegments(parseInt(e.target.value, 10) || 51)
                }
                className="bg-slate-900/50 border-primary/30 text-white"
              />
            </AeroFormField>
            <div className="flex items-end">
              <AeroButton
                variant="primary"
                onClick={handleRunMoM}
                disabled={momBusy}
                icon={Zap}
              >
                {momBusy ? "Solving…" : "Run MoM"}
              </AeroButton>
            </div>
          </div>

          {momError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>MoM solver failed</AlertTitle>
              <AlertDescription>{momError}</AlertDescription>
            </Alert>
          )}

          {momResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Stat
                  label="Z_in"
                  value={`${fmt(momResult.inputImpedance.re, 1)} ${
                    momResult.inputImpedance.im >= 0 ? "+ j" : "− j"
                  }${fmt(Math.abs(momResult.inputImpedance.im), 1)} Ω`}
                />
                <Stat
                  label="VSWR (50 Ω)"
                  value={
                    Number.isFinite(momResult.vswr50)
                      ? fmt(momResult.vswr50, 2)
                      : "∞"
                  }
                />
                <Stat
                  label="Return loss"
                  value={
                    Number.isFinite(momResult.returnLoss50Db)
                      ? `${fmt(momResult.returnLoss50Db, 2)} dB`
                      : "∞"
                  }
                />
                <Stat
                  label="Peak gain"
                  value={`${fmt(momResult.peakGainDbi, 2)} dBi`}
                />
                <Stat
                  label="HPBW"
                  value={
                    Number.isFinite(momResult.hpbwDeg)
                      ? `${fmt(momResult.hpbwDeg, 1)}°`
                      : "—"
                  }
                />
                <Stat
                  label="Radiated P"
                  value={`${(momResult.radiatedPowerW * 1000).toFixed(3)} mW`}
                />
                <Stat label="Segments" value={`${momResult.segments}`} />
                <Stat
                  label="L / λ"
                  value={fmt(momResult.lengthM / momResult.wavelengthM, 3)}
                />
              </div>

              {/* Toolbar: scale toggle + exports */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 mr-1">Pattern scale:</span>
                  <button
                    type="button"
                    onClick={() => setMomScale("dB")}
                    className={`px-2 py-1 rounded-md border text-[11px] ${
                      momScale === "dB"
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-primary/20 text-gray-300 hover:bg-primary/10"
                    }`}
                  >
                    dB
                  </button>
                  <button
                    type="button"
                    onClick={() => setMomScale("linear")}
                    className={`px-2 py-1 rounded-md border text-[11px] ${
                      momScale === "linear"
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-primary/20 text-gray-300 hover:bg-primary/10"
                    }`}
                  >
                    Linear
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <AeroButton variant="secondary" onClick={handleExportMomCsv} icon={Download}>
                    CSV
                  </AeroButton>
                  <AeroButton variant="secondary" onClick={handleExportMomJson} icon={Download}>
                    JSON
                  </AeroButton>
                </div>
              </div>

              {/* Configurable convergence thresholds */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] rounded-md border border-primary/15 bg-slate-900/30 p-2">
                <AeroFormField label="ΔZ_in threshold (%)">
                  <Input
                    type="number"
                    step={0.1}
                    min={0}
                    value={convThreshZinPct}
                    onChange={(e) => setConvThreshZinPct(parseFloat(e.target.value) || 0)}
                    className="h-8 bg-slate-900/50 border-primary/30 text-white"
                  />
                </AeroFormField>
                <AeroFormField label="ΔPeakGain threshold (dB)">
                  <Input
                    type="number"
                    step={0.05}
                    min={0}
                    value={convThreshGainDb}
                    onChange={(e) => setConvThreshGainDb(parseFloat(e.target.value) || 0)}
                    className="h-8 bg-slate-900/50 border-primary/30 text-white"
                  />
                </AeroFormField>
                <AeroFormField label="Min current correlation">
                  <Input
                    type="number"
                    step={0.001}
                    min={0}
                    max={1}
                    value={convThreshCorr}
                    onChange={(e) => setConvThreshCorr(parseFloat(e.target.value) || 0)}
                    className="h-8 bg-slate-900/50 border-primary/30 text-white"
                  />
                </AeroFormField>
              </div>

              {momConvergence && (
                <Alert
                  className={
                    momConvergence.converged
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-amber-500/40 bg-amber-500/10"
                  }
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-xs">
                    Convergence check (N={momResult.segments} → {momConvergence.refinedSegments})
                  </AlertTitle>
                  <AlertDescription className="text-[11px] text-gray-300">
                    ΔZ_in = {fmt(momConvergence.deltaZinPct, 2)}% · ΔPeakGain ={" "}
                    {fmt(momConvergence.deltaPeakGainDb, 3)} dB · current corr ={" "}
                    {fmt(momConvergence.currentCorr, 4)}.{" "}
                    {momConvergence.converged
                      ? "Solution is converged."
                      : `Failed: ${momConvergence.failedConditions.join("; ")} — increase N for stable results.`}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="h-64 w-full rounded-md border border-primary/10 bg-slate-900/30 p-2">
                  <Label className="text-primary text-xs px-2">
                    Current distribution |I(z)| (mA)
                  </Label>
                  <ResponsiveContainer width="100%" height="92%">
                    <LineChart data={momCurrentChart}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="z"
                        label={{
                          value: "z along wire (mm)",
                          position: "insideBottom",
                          offset: -5,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        tick={globalAxisTickStyle}
                        {...globalAxisCommonProps}
                      />
                      <YAxis
                        tick={globalAxisTickStyle}
                        {...globalAxisCommonProps}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--primary) / 0.3)",
                        }}
                        labelStyle={{ color: "hsl(var(--primary))" }}
                        formatter={(value: number, name: string) => [
                          `${Number(value).toFixed(4)} mA`,
                          name,
                        ]}
                        labelFormatter={(z: number) => `z = ${Number(z).toFixed(2)} mm`}
                      />
                      <Line
                        type="monotone"
                        dataKey="mag"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name="|I| (mA)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-64 w-full rounded-md border border-primary/10 bg-slate-900/30 p-2">
                  <Label className="text-primary text-xs px-2">
                    E-plane radiation pattern (dBi)
                  </Label>
                  <ResponsiveContainer width="100%" height="92%">
                    <LineChart data={momPatternChart}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="theta"
                        label={{
                          value: "θ (deg)",
                          position: "insideBottom",
                          offset: -5,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        tick={globalAxisTickStyle}
                        {...globalAxisCommonProps}
                      />
                      <YAxis
                        domain={[
                          (dataMin: number) => Math.max(-40, dataMin - 5),
                          (dataMax: number) => dataMax + 2,
                        ]}
                        tick={globalAxisTickStyle}
                        {...globalAxisCommonProps}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--primary) / 0.3)",
                        }}
                        labelStyle={{ color: "hsl(var(--primary))" }}
                        formatter={(value: number, name: string) => [
                          momScale === "dB"
                            ? `${Number(value).toFixed(2)} dBi`
                            : `${Number(value).toFixed(4)}`,
                          name,
                        ]}
                        labelFormatter={(t: number) => `θ = ${Number(t).toFixed(2)}°`}
                      />
                      <Line
                        type="monotone"
                        dataKey={momScale === "dB" ? "gain" : "gainLin"}
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={false}
                        name={momScale === "dB" ? "MoM gain (dBi)" : "MoM gain (linear)"}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cross-engine comparison panel */}
              <AeroCard
                title="Cross-Engine Comparison"
                description="Validate MoM Z_in / VSWR / gain against analytic + link-budget values"
                icon={GitCompare}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-primary/20">
                        <th className="py-1.5 pr-3">Quantity</th>
                        <th className="py-1.5 pr-3">Analytic / Registry</th>
                        <th className="py-1.5 pr-3">MoM (Pocklington)</th>
                        <th className="py-1.5 pr-3">Δ</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-200">
                      <tr className="border-b border-primary/10">
                        <td className="py-1.5 pr-3">Peak gain (dBi)</td>
                        <td className="py-1.5 pr-3">{fmt(peakGainDbi, 2)}</td>
                        <td className="py-1.5 pr-3">{fmt(momResult.peakGainDbi, 2)}</td>
                        <td className="py-1.5 pr-3 text-primary">
                          {fmt(momResult.peakGainDbi - peakGainDbi, 2)} dB
                        </td>
                      </tr>
                      <tr className="border-b border-primary/10">
                        <td className="py-1.5 pr-3">Z_in (Ω)</td>
                        <td className="py-1.5 pr-3">73 + j42 (λ/2 ref.)</td>
                        <td className="py-1.5 pr-3">
                          {fmt(momResult.inputImpedance.re, 1)}{" "}
                          {momResult.inputImpedance.im >= 0 ? "+ j" : "− j"}
                          {fmt(Math.abs(momResult.inputImpedance.im), 1)}
                        </td>
                        <td className="py-1.5 pr-3 text-primary">
                          {fmt(Math.hypot(momResult.inputImpedance.re - 73, momResult.inputImpedance.im - 42), 1)} Ω
                        </td>
                      </tr>
                      <tr className="border-b border-primary/10">
                        <td className="py-1.5 pr-3">VSWR (50 Ω)</td>
                        <td className="py-1.5 pr-3">—</td>
                        <td className="py-1.5 pr-3">
                          {Number.isFinite(momResult.vswr50) ? fmt(momResult.vswr50, 2) : "∞"}
                        </td>
                        <td className="py-1.5 pr-3 text-primary">—</td>
                      </tr>
                      <tr className="border-b border-primary/10">
                        <td className="py-1.5 pr-3">Polarization AR (dB)</td>
                        <td className="py-1.5 pr-3">{fmt(polResult.axialRatioDb, 2)}</td>
                        <td className="py-1.5 pr-3">linear (thin wire)</td>
                        <td className="py-1.5 pr-3 text-primary">—</td>
                      </tr>
                      {linkResult && (
                        <tr>
                          <td className="py-1.5 pr-3">EIRP used in link (dBW)</td>
                          <td className="py-1.5 pr-3">{fmt(eirpDbw, 2)}</td>
                          <td className="py-1.5 pr-3">
                            {fmt(eirpDbw + (momResult.peakGainDbi - peakGainDbi), 2)} (gain-corrected)
                          </td>
                          <td className="py-1.5 pr-3 text-primary">
                            {fmt(momResult.peakGainDbi - peakGainDbi, 2)} dB
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                  Reference Z_in (73 + j42 Ω) is the canonical resonant λ/2 dipole
                  benchmark from Balanis §8.4. For other geometries, Δ is informational.
                </p>
              </AeroCard>

              <Alert className="border-primary/20 bg-primary/5">
                <AlertDescription className="text-xs text-gray-300">
                  Backend: <code>{momResult.backend}</code>. NEC2-WASM
                  backend can be swapped in behind the same{" "}
                  <code>solveThinWireMoM</code> contract without UI
                  changes.
                </AlertDescription>
              </Alert>

              {momResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {momResult.warnings.join(" · ")}
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