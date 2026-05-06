/**
 * Phase 10 — Avionics RF systems
 *
 *   • VOR (108–118 MHz)            — coverage range vs altitude (radio LOS)
 *   • ILS LOC (108–112) / GS (329–335) — beam coverage geometry
 *   • GPS L1/L2/L5                — link budget at sea level (SV → user)
 *   • ADS-B 1090 MHz              — link budget air-air & air-ground
 *   • TCAS 1030/1090 MHz          — interrogation budget vs range
 *   • Radar altimeter 4.2–4.4 GHz — return SNR vs AGL
 *   • Installed-pattern degradation factor (empirical, fuselage scattering)
 *
 * All numbers are nominal/educational, derived from public ICAO Annex 10
 * and RTCA MOPS published budgets.
 */

import { fsplDb, dopplerShiftHz } from "./propagation";

/** Radio horizon range (km): D ≈ 4.12·(√h_tx + √h_rx) for h in metres. */
export function radioHorizonKm(htxM: number, hrxM: number): number {
  return 4.12 * (Math.sqrt(Math.max(0, htxM)) + Math.sqrt(Math.max(0, hrxM)));
}

/** VOR theoretical coverage at altitude (NM). FAA AIM rule: D = 1.23·√h_ft. */
export function vorCoverageNM(altitudeFt: number): number {
  return 1.23 * Math.sqrt(Math.max(0, altitudeFt));
}

export interface ILSGeometry {
  glideslopeDeg: number;
  thresholdCrossingHeightM: number;
  distanceFromThresholdM: number;
}
/** Decision-altitude geometry: returns AGL height on glide path at given distance. */
export function ilsHeightOnGlideslopeM(g: ILSGeometry): number {
  const slopeRad = (g.glideslopeDeg * Math.PI) / 180;
  return g.thresholdCrossingHeightM + g.distanceFromThresholdM * Math.tan(slopeRad);
}

/** Generic narrowband RX C/N₀ (dB-Hz). */
export function cn0DbHz(args: {
  eirpDbw: number;
  pathLossDb: number;
  rxGainDbi: number;
  systemTempK: number;
  miscLossDb?: number;
}): number {
  const k = 10 * Math.log10(1.380649e-23);
  const Gt = -10 * Math.log10(args.systemTempK);
  return (
    args.eirpDbw - args.pathLossDb + args.rxGainDbi - (args.miscLossDb ?? 0) - k + Gt
  );
}

export interface AvionicsLinkResult {
  fsplDb: number;
  rxPowerDbm: number;
  cn0DbHz: number;
  marginDb: number;
  dopplerHz: number;
}

function fsplToRxPowerDbm(eirpDbw: number, fspl: number, gRxDbi: number): number {
  return eirpDbw + 30 - fspl + gRxDbi; // dBm
}

/** GPS L1 (1575.42 MHz) sea-level link from MEO SV (~20 200 km). */
export function gpsLinkBudget(altitudeM = 20200e3, gRxDbi = 3, requiredDbHz = 35): AvionicsLinkResult {
  const f = 1575.42e6;
  const fspl = fsplDb(f, altitudeM);
  const eirp = 26.8; // dBW per ICD-GPS-200
  const Pr = fsplToRxPowerDbm(eirp, fspl, gRxDbi);
  const cn0 = cn0DbHz({ eirpDbw: eirp, pathLossDb: fspl, rxGainDbi: gRxDbi, systemTempK: 290 });
  return { fsplDb: fspl, rxPowerDbm: Pr, cn0DbHz: cn0, marginDb: cn0 - requiredDbHz, dopplerHz: dopplerShiftHz(f, 800) };
}

/** ADS-B 1090 MHz extended squitter at slant range. */
export function adsbLinkBudget(rangeNM: number, txPowerW = 250, gRxDbi = 0, requiredDbm = -84): AvionicsLinkResult {
  const f = 1090e6;
  const dM = rangeNM * 1852;
  const fspl = fsplDb(f, dM);
  const eirp = 10 * Math.log10(txPowerW); // 0 dBi tx
  const Pr = fsplToRxPowerDbm(eirp, fspl, gRxDbi);
  return {
    fsplDb: fspl,
    rxPowerDbm: Pr,
    cn0DbHz: cn0DbHz({ eirpDbw: eirp, pathLossDb: fspl, rxGainDbi: gRxDbi, systemTempK: 290 }),
    marginDb: Pr - requiredDbm,
    dopplerHz: dopplerShiftHz(f, 250),
  };
}

/** TCAS interrogation 1030 MHz / reply 1090 MHz, line-of-sight. */
export function tcasLinkBudget(rangeNM: number, txPowerW = 250, gRxDbi = 0, requiredDbm = -74): AvionicsLinkResult {
  const f = 1030e6;
  const dM = rangeNM * 1852;
  const fspl = fsplDb(f, dM);
  const eirp = 10 * Math.log10(txPowerW);
  const Pr = fsplToRxPowerDbm(eirp, fspl, gRxDbi);
  return {
    fsplDb: fspl, rxPowerDbm: Pr,
    cn0DbHz: cn0DbHz({ eirpDbw: eirp, pathLossDb: fspl, rxGainDbi: gRxDbi, systemTempK: 290 }),
    marginDb: Pr - requiredDbm,
    dopplerHz: dopplerShiftHz(f, 500),
  };
}

/** Radar altimeter 4.3 GHz return — uses Pr = Pt G² λ² σ/((4π)³ R⁴). */
export function radarAltimeterSnrDb(altitudeM: number, ptW = 1, gainDbi = 10, sigmaM2 = 1, nfDb = 6, bwHz = 100e6): number {
  const f = 4.3e9;
  const lambda = 3e8 / f;
  const G = Math.pow(10, gainDbi / 10);
  const Pr = (ptW * G * G * lambda * lambda * sigmaM2) / (Math.pow(4 * Math.PI, 3) * Math.pow(altitudeM, 4));
  const Pn = 1.380649e-23 * 290 * bwHz * Math.pow(10, nfDb / 10);
  return 10 * Math.log10(Pr / Pn);
}

/** Installed-pattern degradation factor (Δgain dB) for fuselage-mounted antennas. */
export function installedGainDegradationDb(nominalGainDbi: number, fuselageDiameterWavelengths: number): number {
  // Empirical: -0.5 dB ripple per λ of fuselage diameter, capped at -4 dB
  const drop = Math.min(4, 0.5 * Math.sqrt(fuselageDiameterWavelengths));
  return -drop;
}