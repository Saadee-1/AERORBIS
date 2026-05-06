/**
 * SystemsLabPanel — Phases 7–10 + Phase 11 (Beginner/University/Expert tiers)
 *
 * Unified UI for the new propagation, element-zoo, radar/RCS and avionics
 * solvers. Each module is a sub-tab; the global tier selector at the top
 * gates which inputs/outputs are visible — exactly mirroring the Orbital
 * Visualizer's tiered UX.
 */

import { useMemo, useState } from "react";
import { Activity, Radar, Plane, Antenna as AntennaIcon, Wifi, GraduationCap } from "lucide-react";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroFormField } from "@/components/forms/AeroFormField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { spacingVertical } from "@/styles/spacing";

import {
  itutLinkLossDb,
  twoRayReceivedPowerW,
  knifeEdgeLossDb,
  fresnelKirchhoffV,
  dopplerShiftHz,
  rainSpecificAttenuationDbPerKm,
  gaseousSpecificAttenuationDbPerKm,
} from "@/lib/antenna/propagation";
import {
  analyzePatch, analyzeHorn, analyzeYagi, analyzeHelix, analyzeLPDA, analyzeSpiral, analyzeSlot,
} from "@/lib/antenna/elements";
import {
  radarRange, pulseRangeResolutionM, unambiguousRangeM, fmcwBeatFrequencyHz,
  rcsSphereM2, rcsFlatPlateM2, rcsCylinderM2, rcsDihedralM2, rcsTrihedralM2, toDbsm, analyzeSAR,
} from "@/lib/antenna/radar";
import {
  vorCoverageNM, ilsHeightOnGlideslopeM, gpsLinkBudget, adsbLinkBudget,
  tcasLinkBudget, radarAltimeterSnrDb, installedGainDegradationDb,
} from "@/lib/antenna/avionics";

type Tier = "beginner" | "university" | "expert";

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-md border border-primary/15 bg-slate-950/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-primary/70" style={{ fontFamily: "Rajdhani, sans-serif" }}>{label}</div>
      <div className="text-lg text-foreground" style={{ fontFamily: "Orbitron, sans-serif" }}>
        {typeof value === "number" ? value.toFixed(2) : value}
        {unit && <span className="text-[10px] text-gray-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

// ───────────────── Propagation ─────────────────
function PropagationModule({ tier }: { tier: Tier }) {
  const [fGhz, setFGhz] = useState(12);
  const [dKm, setDKm] = useState(40);
  const [rain, setRain] = useState(20);
  const [obsH, setObsH] = useState(10);
  const [d1, setD1] = useState(5000);
  const [d2, setD2] = useState(5000);
  const [vMps, setVMps] = useState(250);
  const [htM, setHtM] = useState(30);
  const [hrM, setHrM] = useState(2);

  const link = useMemo(() => itutLinkLossDb({ frequencyHz: fGhz * 1e9, distanceKm: dKm, rainRateMmPerHr: rain }), [fGhz, dKm, rain]);
  const v = useMemo(() => fresnelKirchhoffV({ obstacleHeightM: obsH, d1M: d1, d2M: d2, frequencyHz: fGhz * 1e9 }), [obsH, d1, d2, fGhz]);
  const ke = useMemo(() => knifeEdgeLossDb(v), [v]);
  const dop = useMemo(() => dopplerShiftHz(fGhz * 1e9, vMps), [fGhz, vMps]);
  const twoRay = useMemo(() => twoRayReceivedPowerW({ ptW: 1, gtLin: 1, grLin: 1, htM, hrM, distanceM: dKm * 1000, frequencyHz: fGhz * 1e9 }), [fGhz, dKm, htM, hrM]);

  return (
    <div className={spacingVertical.M}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AeroFormField label="Frequency (GHz)"><Input type="number" value={fGhz} step="0.1" onChange={(e) => setFGhz(+e.target.value)} /></AeroFormField>
        <AeroFormField label="Distance (km)"><Input type="number" value={dKm} onChange={(e) => setDKm(+e.target.value)} /></AeroFormField>
        <AeroFormField label="Rain rate (mm/h)"><Input type="number" value={rain} onChange={(e) => setRain(+e.target.value)} /></AeroFormField>
        {tier !== "beginner" && (
          <AeroFormField label="Rel. velocity (m/s)"><Input type="number" value={vMps} onChange={(e) => setVMps(+e.target.value)} /></AeroFormField>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="FSPL (P.525)" value={link.fsplDb} unit="dB" />
        <Stat label="Gaseous (P.676)" value={link.gaseousDb} unit="dB" />
        <Stat label="Rain (P.838)" value={link.rainDb} unit="dB" />
        <Stat label="Total path loss" value={link.totalLossDb} unit="dB" />
      </div>

      {tier !== "beginner" && (
        <>
          <div className="text-[10px] uppercase tracking-wider text-primary/80" style={{ fontFamily: "Rajdhani, sans-serif" }}>Two-ray ground reflection</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AeroFormField label="TX height (m)"><Input type="number" value={htM} onChange={(e) => setHtM(+e.target.value)} /></AeroFormField>
            <AeroFormField label="RX height (m)"><Input type="number" value={hrM} onChange={(e) => setHrM(+e.target.value)} /></AeroFormField>
            <Stat label="Pr (Pt=1 W, G=1)" value={(10 * Math.log10(twoRay * 1000)).toFixed(2)} unit="dBm" />
            <Stat label="Doppler shift" value={dop.toFixed(1)} unit="Hz" />
          </div>
        </>
      )}

      {tier === "expert" && (
        <>
          <div className="text-[10px] uppercase tracking-wider text-primary/80" style={{ fontFamily: "Rajdhani, sans-serif" }}>Knife-edge diffraction (P.526)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AeroFormField label="Obstacle h (m)"><Input type="number" value={obsH} onChange={(e) => setObsH(+e.target.value)} /></AeroFormField>
            <AeroFormField label="d₁ TX→edge (m)"><Input type="number" value={d1} onChange={(e) => setD1(+e.target.value)} /></AeroFormField>
            <AeroFormField label="d₂ edge→RX (m)"><Input type="number" value={d2} onChange={(e) => setD2(+e.target.value)} /></AeroFormField>
            <Stat label="Diffraction loss" value={ke} unit="dB" />
          </div>
          <div className="text-[11px] text-gray-400">v = {v.toFixed(2)} (Fresnel-Kirchhoff). γ_rain = {rainSpecificAttenuationDbPerKm(fGhz, rain).toFixed(3)} dB/km · γ_gas = {gaseousSpecificAttenuationDbPerKm(fGhz).toFixed(3)} dB/km</div>
        </>
      )}
    </div>
  );
}

// ───────────────── Element zoo ─────────────────
function ElementsModule({ tier }: { tier: Tier }) {
  const [type, setType] = useState<"patch" | "horn" | "yagi" | "helix" | "lpda" | "spiral" | "slot">("patch");
  const [fGhz, setFGhz] = useState(2.4);

  // shared inputs
  const [er, setEr] = useState(4.4);
  const [hMm, setHMm] = useState(1.6);
  const [aMm, setAMm] = useState(150); const [bMm, setBMm] = useState(100);
  const [yagiN, setYagiN] = useState(7); const [yagiL, setYagiL] = useState(1.5);
  const [helD, setHelD] = useState(40); const [helP, setHelP] = useState(13); const [helN, setHelN] = useState(8);
  const [tau, setTau] = useState(0.88); const [sigma, setSigma] = useState(0.16); const [fLow, setFLow] = useState(0.3); const [fHigh, setFHigh] = useState(3);
  const [spOuter, setSpOuter] = useState(80); const [spInner, setSpInner] = useState(5);

  const f = fGhz * 1e9;
  const result = useMemo(() => {
    switch (type) {
      case "patch":  return analyzePatch({ frequencyHz: f, substrateEr: er, substrateHeightM: hMm * 1e-3 });
      case "horn":   return analyzeHorn({ apertureWidthM: aMm * 1e-3, apertureHeightM: bMm * 1e-3, frequencyHz: f });
      case "yagi":   return analyzeYagi({ numElements: yagiN, boomLengthWavelengths: yagiL });
      case "helix":  return analyzeHelix({ diameterM: helD * 1e-3, pitchAngleDeg: helP, numTurns: helN, frequencyHz: f });
      case "lpda":   return analyzeLPDA({ tau, sigma, fLowHz: fLow * 1e9, fHighHz: fHigh * 1e9 });
      case "spiral": return analyzeSpiral({ outerDiameterM: spOuter * 1e-3, innerDiameterM: spInner * 1e-3, frequencyHz: f });
      case "slot":   return analyzeSlot({ frequencyHz: f });
    }
  }, [type, f, er, hMm, aMm, bMm, yagiN, yagiL, helD, helP, helN, tau, sigma, fLow, fHigh, spOuter, spInner]);

  return (
    <div className={spacingVertical.M}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AeroFormField label="Element type">
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger className="bg-slate-900/40 border-primary/20"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="patch">Microstrip patch</SelectItem>
              <SelectItem value="horn">Pyramidal horn</SelectItem>
              <SelectItem value="yagi">Yagi-Uda</SelectItem>
              <SelectItem value="helix">Axial helix (Kraus)</SelectItem>
              <SelectItem value="lpda">Log-periodic dipole</SelectItem>
              <SelectItem value="spiral">Archimedean spiral</SelectItem>
              <SelectItem value="slot">Resonant λ/2 slot</SelectItem>
            </SelectContent>
          </Select>
        </AeroFormField>
        <AeroFormField label="Frequency (GHz)"><Input type="number" value={fGhz} step="0.1" onChange={(e) => setFGhz(+e.target.value)} /></AeroFormField>

        {type === "patch" && tier !== "beginner" && (
          <>
            <AeroFormField label="Substrate εr"><Input type="number" value={er} step="0.1" onChange={(e) => setEr(+e.target.value)} /></AeroFormField>
            <AeroFormField label="Substrate h (mm)"><Input type="number" value={hMm} step="0.1" onChange={(e) => setHMm(+e.target.value)} /></AeroFormField>
          </>
        )}
        {type === "horn" && tier !== "beginner" && (
          <>
            <AeroFormField label="Aperture a (mm)"><Input type="number" value={aMm} onChange={(e) => setAMm(+e.target.value)} /></AeroFormField>
            <AeroFormField label="Aperture b (mm)"><Input type="number" value={bMm} onChange={(e) => setBMm(+e.target.value)} /></AeroFormField>
          </>
        )}
        {type === "yagi" && (
          <>
            <AeroFormField label="# Elements"><Input type="number" value={yagiN} onChange={(e) => setYagiN(+e.target.value)} /></AeroFormField>
            <AeroFormField label="Boom length (λ)"><Input type="number" value={yagiL} step="0.1" onChange={(e) => setYagiL(+e.target.value)} /></AeroFormField>
          </>
        )}
        {type === "helix" && tier !== "beginner" && (
          <>
            <AeroFormField label="Diameter (mm)"><Input type="number" value={helD} onChange={(e) => setHelD(+e.target.value)} /></AeroFormField>
            <AeroFormField label="Pitch angle (°)"><Input type="number" value={helP} onChange={(e) => setHelP(+e.target.value)} /></AeroFormField>
            <AeroFormField label="# Turns"><Input type="number" value={helN} onChange={(e) => setHelN(+e.target.value)} /></AeroFormField>
          </>
        )}
        {type === "lpda" && tier === "expert" && (
          <>
            <AeroFormField label="τ (scale)"><Input type="number" value={tau} step="0.01" onChange={(e) => setTau(+e.target.value)} /></AeroFormField>
            <AeroFormField label="σ (spacing)"><Input type="number" value={sigma} step="0.01" onChange={(e) => setSigma(+e.target.value)} /></AeroFormField>
            <AeroFormField label="f-low (GHz)"><Input type="number" value={fLow} step="0.1" onChange={(e) => setFLow(+e.target.value)} /></AeroFormField>
            <AeroFormField label="f-high (GHz)"><Input type="number" value={fHigh} step="0.1" onChange={(e) => setFHigh(+e.target.value)} /></AeroFormField>
          </>
        )}
        {type === "spiral" && tier !== "beginner" && (
          <>
            <AeroFormField label="Outer Ø (mm)"><Input type="number" value={spOuter} onChange={(e) => setSpOuter(+e.target.value)} /></AeroFormField>
            <AeroFormField label="Inner Ø (mm)"><Input type="number" value={spInner} onChange={(e) => setSpInner(+e.target.value)} /></AeroFormField>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(result as Record<string, number>).map(([k, val]) => (
          <Stat
            key={k}
            label={k.replace(/([A-Z])/g, " $1").trim()}
            value={typeof val === "number" ? val : String(val)}
            unit={k.includes("Dbi") ? "dBi" : k.includes("Ohms") ? "Ω" : k.includes("Hz") ? "Hz" : k.includes("Deg") ? "°" : k.includes("M") ? "m" : ""}
          />
        ))}
      </div>
    </div>
  );
}

// ───────────────── Radar / RCS ─────────────────
function RadarModule({ tier }: { tier: Tier }) {
  const [ptW, setPtW] = useState(1000);
  const [g, setG] = useState(30);
  const [fGhz, setFGhz] = useState(10);
  const [sigma, setSigma] = useState(1);
  const [bw, setBw] = useState(1e6);
  const [nf, setNf] = useState(3);
  const [rangeKm, setRangeKm] = useState(50);
  const [pulseUs, setPulseUs] = useState(1);
  const [prfHz, setPrfHz] = useState(1000);
  const [shape, setShape] = useState<"sphere" | "plate" | "cylinder" | "dihedral" | "trihedral">("sphere");
  const [sizeM, setSizeM] = useState(1);

  const rr = useMemo(() => radarRange({ ptW, gainDbi: g, frequencyHz: fGhz * 1e9, rcsM2: sigma, noiseFigureDb: nf, bandwidthHz: bw, rangeM: rangeKm * 1000 }), [ptW, g, fGhz, sigma, nf, bw, rangeKm]);
  const rcs = useMemo(() => {
    switch (shape) {
      case "sphere":    return rcsSphereM2(sizeM, fGhz * 1e9);
      case "plate":     return rcsFlatPlateM2(sizeM * sizeM, fGhz * 1e9);
      case "cylinder":  return rcsCylinderM2(sizeM / 2, sizeM * 2, fGhz * 1e9);
      case "dihedral":  return rcsDihedralM2(sizeM, fGhz * 1e9);
      case "trihedral": return rcsTrihedralM2(sizeM, fGhz * 1e9);
    }
  }, [shape, sizeM, fGhz]);

  return (
    <div className={spacingVertical.M}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AeroFormField label="Pt (W)"><Input type="number" value={ptW} onChange={(e) => setPtW(+e.target.value)} /></AeroFormField>
        <AeroFormField label="Gain (dBi)"><Input type="number" value={g} onChange={(e) => setG(+e.target.value)} /></AeroFormField>
        <AeroFormField label="Frequency (GHz)"><Input type="number" value={fGhz} step="0.1" onChange={(e) => setFGhz(+e.target.value)} /></AeroFormField>
        <AeroFormField label="Range (km)"><Input type="number" value={rangeKm} onChange={(e) => setRangeKm(+e.target.value)} /></AeroFormField>
        {tier !== "beginner" && (
          <>
            <AeroFormField label="σ target (m²)"><Input type="number" value={sigma} step="0.1" onChange={(e) => setSigma(+e.target.value)} /></AeroFormField>
            <AeroFormField label="Bandwidth (Hz)"><Input type="number" value={bw} onChange={(e) => setBw(+e.target.value)} /></AeroFormField>
            <AeroFormField label="NF (dB)"><Input type="number" value={nf} onChange={(e) => setNf(+e.target.value)} /></AeroFormField>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="SNR @ R" value={rr.snrDb} unit="dB" />
        <Stat label="Max range (SNR=0)" value={(rr.maxRangeMforSnr0Db / 1000).toFixed(1)} unit="km" />
        <Stat label="Pr" value={(10 * Math.log10(rr.receivedPowerW * 1000)).toFixed(1)} unit="dBm" />
        <Stat label="Pn" value={(10 * Math.log10(rr.noisePowerW * 1000)).toFixed(1)} unit="dBm" />
      </div>

      {tier !== "beginner" && (
        <>
          <div className="text-[10px] uppercase tracking-wider text-primary/80" style={{ fontFamily: "Rajdhani, sans-serif" }}>Pulse / FMCW</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AeroFormField label="Pulse width (µs)"><Input type="number" value={pulseUs} step="0.1" onChange={(e) => setPulseUs(+e.target.value)} /></AeroFormField>
            <AeroFormField label="PRF (Hz)"><Input type="number" value={prfHz} onChange={(e) => setPrfHz(+e.target.value)} /></AeroFormField>
            <Stat label="ΔR resolution" value={pulseRangeResolutionM(pulseUs * 1e-6)} unit="m" />
            <Stat label="R unambig." value={(unambiguousRangeM(prfHz) / 1000).toFixed(1)} unit="km" />
            <Stat label="FMCW beat (50 km, 100 MHz, 1 ms)" value={fmcwBeatFrequencyHz(50000, 100e6, 1e-3).toFixed(0)} unit="Hz" />
          </div>
        </>
      )}

      <div className="text-[10px] uppercase tracking-wider text-primary/80" style={{ fontFamily: "Rajdhani, sans-serif" }}>RCS of canonical shapes</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AeroFormField label="Shape">
          <Select value={shape} onValueChange={(v) => setShape(v as typeof shape)}>
            <SelectTrigger className="bg-slate-900/40 border-primary/20"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sphere">Sphere</SelectItem>
              <SelectItem value="plate">Flat plate</SelectItem>
              <SelectItem value="cylinder">Cylinder</SelectItem>
              <SelectItem value="dihedral">Dihedral corner</SelectItem>
              <SelectItem value="trihedral">Trihedral corner</SelectItem>
            </SelectContent>
          </Select>
        </AeroFormField>
        <AeroFormField label="Size (m)"><Input type="number" value={sizeM} step="0.1" onChange={(e) => setSizeM(+e.target.value)} /></AeroFormField>
        <Stat label="σ" value={rcs} unit="m²" />
        <Stat label="σ" value={toDbsm(rcs)} unit="dBsm" />
      </div>

      {tier === "expert" && (() => {
        const sar = analyzeSAR({ bandwidthHz: 100e6, apertureLengthM: 4, rangeM: 500e3, frequencyHz: 9.6e9, velocityMps: 7500, prfHz: 1500 });
        return (
          <>
            <div className="text-[10px] uppercase tracking-wider text-primary/80" style={{ fontFamily: "Rajdhani, sans-serif" }}>SAR (Sentinel-1-class example)</div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Range res." value={sar.rangeResolutionM} unit="m" />
              <Stat label="Azimuth res." value={sar.azimuthResolutionM} unit="m" />
              <Stat label="Swath" value={(sar.swathWidthM / 1000).toFixed(1)} unit="km" />
            </div>
          </>
        );
      })()}
    </div>
  );
}

// ───────────────── Avionics ─────────────────
function AvionicsModule({ tier }: { tier: Tier }) {
  const [altFt, setAltFt] = useState(35000);
  const [adsbNM, setAdsbNM] = useState(150);
  const [tcasNM, setTcasNM] = useState(40);
  const [raAGL, setRaAGL] = useState(2500);
  const [gsDeg, setGsDeg] = useState(3);
  const [tchM, setTchM] = useState(15);
  const [distM, setDistM] = useState(2000);
  const [fuselageWl, setFuselageWl] = useState(20);

  const gps = useMemo(() => gpsLinkBudget(), []);
  const adsb = useMemo(() => adsbLinkBudget(adsbNM), [adsbNM]);
  const tcas = useMemo(() => tcasLinkBudget(tcasNM), [tcasNM]);
  const raSnr = useMemo(() => radarAltimeterSnrDb(raAGL * 0.3048), [raAGL]);

  return (
    <div className={spacingVertical.M}>
      <div className="text-[10px] uppercase tracking-wider text-primary/80" style={{ fontFamily: "Rajdhani, sans-serif" }}>VOR / ILS geometry</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AeroFormField label="Altitude (ft)"><Input type="number" value={altFt} onChange={(e) => setAltFt(+e.target.value)} /></AeroFormField>
        <Stat label="VOR coverage" value={vorCoverageNM(altFt).toFixed(1)} unit="NM" />
        {tier !== "beginner" && <>
          <AeroFormField label="GS angle (°)"><Input type="number" value={gsDeg} step="0.1" onChange={(e) => setGsDeg(+e.target.value)} /></AeroFormField>
          <AeroFormField label="TCH (m)"><Input type="number" value={tchM} onChange={(e) => setTchM(+e.target.value)} /></AeroFormField>
          <AeroFormField label="Dist. from THR (m)"><Input type="number" value={distM} onChange={(e) => setDistM(+e.target.value)} /></AeroFormField>
          <Stat label="Height on GS" value={ilsHeightOnGlideslopeM({ glideslopeDeg: gsDeg, thresholdCrossingHeightM: tchM, distanceFromThresholdM: distM }).toFixed(1)} unit="m" />
        </>}
      </div>

      <div className="text-[10px] uppercase tracking-wider text-primary/80" style={{ fontFamily: "Rajdhani, sans-serif" }}>Avionics link budgets</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="GPS L1 C/N₀" value={gps.cn0DbHz.toFixed(1)} unit="dB-Hz" />
        <Stat label="GPS margin" value={gps.marginDb.toFixed(1)} unit="dB" />
        <AeroFormField label="ADS-B range (NM)"><Input type="number" value={adsbNM} onChange={(e) => setAdsbNM(+e.target.value)} /></AeroFormField>
        <Stat label="ADS-B Pr" value={adsb.rxPowerDbm.toFixed(1)} unit="dBm" />
        <AeroFormField label="TCAS range (NM)"><Input type="number" value={tcasNM} onChange={(e) => setTcasNM(+e.target.value)} /></AeroFormField>
        <Stat label="TCAS margin" value={tcas.marginDb.toFixed(1)} unit="dB" />
        <AeroFormField label="RA AGL (ft)"><Input type="number" value={raAGL} onChange={(e) => setRaAGL(+e.target.value)} /></AeroFormField>
        <Stat label="Rad-Alt SNR" value={raSnr.toFixed(1)} unit="dB" />
      </div>

      {tier === "expert" && (
        <>
          <div className="text-[10px] uppercase tracking-wider text-primary/80" style={{ fontFamily: "Rajdhani, sans-serif" }}>Installed-pattern degradation</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AeroFormField label="Fuselage Ø (λ)"><Input type="number" value={fuselageWl} onChange={(e) => setFuselageWl(+e.target.value)} /></AeroFormField>
            <Stat label="ΔGain (installed)" value={installedGainDegradationDb(0, fuselageWl).toFixed(2)} unit="dB" />
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────── Top-level Systems Lab ─────────────────
export const SystemsLabPanel = () => {
  const [tier, setTier] = useState<Tier>("university");
  return (
    <AeroCard
      title="Systems Lab"
      description="Propagation · Element Zoo · Radar/RCS · Avionics — tier-gated"
      icon={Activity}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary/80" style={{ fontFamily: "Rajdhani, sans-serif" }}>Tier</span>
        </div>
        <div className="flex gap-1">
          {(["beginner", "university", "expert"] as Tier[]).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded border transition-colors ${
                tier === t ? "bg-primary/20 border-primary text-primary" : "border-primary/20 text-gray-400 hover:text-primary hover:border-primary/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="prop" className="w-full">
        <TabsList className="grid grid-cols-4 bg-slate-900/50 border border-primary/20">
          <TabsTrigger value="prop"><Wifi className="h-3 w-3 mr-1" /> Propagation</TabsTrigger>
          <TabsTrigger value="elem"><AntennaIcon className="h-3 w-3 mr-1" /> Elements</TabsTrigger>
          <TabsTrigger value="radar"><Radar className="h-3 w-3 mr-1" /> Radar/RCS</TabsTrigger>
          <TabsTrigger value="avi"><Plane className="h-3 w-3 mr-1" /> Avionics</TabsTrigger>
        </TabsList>
        <TabsContent value="prop" className="pt-4"><PropagationModule tier={tier} /></TabsContent>
        <TabsContent value="elem" className="pt-4"><ElementsModule tier={tier} /></TabsContent>
        <TabsContent value="radar" className="pt-4"><RadarModule tier={tier} /></TabsContent>
        <TabsContent value="avi" className="pt-4"><AvionicsModule tier={tier} /></TabsContent>
      </Tabs>

      <div className="mt-3 flex flex-wrap gap-1">
        <Badge variant="outline" className="border-primary/30 text-[9px]">P.525</Badge>
        <Badge variant="outline" className="border-primary/30 text-[9px]">P.676</Badge>
        <Badge variant="outline" className="border-primary/30 text-[9px]">P.838</Badge>
        <Badge variant="outline" className="border-primary/30 text-[9px]">Balanis cavity</Badge>
        <Badge variant="outline" className="border-primary/30 text-[9px]">Schelkunoff</Badge>
        <Badge variant="outline" className="border-primary/30 text-[9px]">NBS-688</Badge>
        <Badge variant="outline" className="border-primary/30 text-[9px]">Kraus</Badge>
        <Badge variant="outline" className="border-primary/30 text-[9px]">Skolnik radar</Badge>
        <Badge variant="outline" className="border-primary/30 text-[9px]">ICAO Annex 10</Badge>
      </div>
    </AeroCard>
  );
};

export default SystemsLabPanel;