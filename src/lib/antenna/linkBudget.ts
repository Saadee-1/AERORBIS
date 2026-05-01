/**
 * Antenna Link-Budget Engine
 *
 * Phase 3 of the Antenna Analyzer upgrade roadmap.
 * Friis transmission equation + simplified ITU-R P.676 (atmospheric gases)
 * + ITU-R P.618 (rain) + system-noise temperature → C/N₀ and Eb/N₀.
 *
 * Pure additive layer — does not change any existing physics.
 *
 * References:
 *   Friis, H.T., "A Note on a Simple Transmission Formula", Proc. IRE 1946.
 *   ITU-R P.676-12  (gaseous attenuation, simplified flat model used here).
 *   ITU-R P.618-13  (rain attenuation, k/α coefficients @ Ku/Ka, simplified).
 *   Sklar, "Digital Communications", §5.5 (Eb/N₀).
 *
 * NOTE: We deliberately use closed-form simplifications — the analyzer is an
 * educational tool, not a regulator-grade link planner. Coefficients and
 * approximations are clearly cited in code comments.
 */

import { C } from "./math";

const BOLTZMANN = 1.380649e-23; // J/K
const T0 = 290; // K, reference temperature

export interface LinkBudgetInputs {
  /** Carrier frequency in Hz. */
  frequencyHz: number;
  /** TX antenna EIRP in dBW (already includes Pt + Gt). */
  eirpDbw: number;
  /** Slant range / link distance in metres. */
  distanceM: number;
  /** RX antenna gain in dBi. */
  rxGainDbi: number;
  /** RX system noise temperature in K (LNA + antenna + sky). */
  systemTempK: number;
  /** Symbol / data rate in bits per second (for Eb/N₀). */
  dataRateBps: number;
  /** Bandwidth in Hz (for C/N). Defaults to dataRateBps. */
  bandwidthHz?: number;
  /** Rain attenuation rate in dB/km (set 0 for clear sky). */
  rainRateDbPerKm?: number;
  /** Polarization-mismatch loss in dB (default 0). */
  polarizationLossDb?: number;
  /** Pointing / misalignment loss in dB (default 0.5). */
  pointingLossDb?: number;
  /** Implementation / modem loss in dB (default 1.0). */
  implementationLossDb?: number;
  /** Required link margin in dB for "PASS" verdict (default 3). */
  requiredMarginDb?: number;
}

export interface LinkBudgetResult {
  wavelengthM: number;
  fsplDb: number;                 // free-space path loss
  atmosphericLossDb: number;      // ITU-R P.676 simplified
  rainLossDb: number;             // ITU-R P.618 simplified
  totalLossDb: number;            // FSPL + atm + rain + pol + point + impl
  rxPowerDbw: number;             // EIRP − total losses + Gr
  noisePowerDbw: number;          // 10·log10(k·T·B) + 30 if dBm
  cnRatioDb: number;              // C/N (in given bandwidth)
  cn0DbHz: number;                // C/N₀
  ebN0Db: number;                 // Eb/N₀
  gOverTDbK: number;              // RX figure of merit
  marginDb: number;               // rxPower − sensitivity
  verdict: "PASS" | "MARGINAL" | "FAIL";
  warnings: string[];
}

/** Free-space path loss (Friis): FSPL_dB = 20·log10(4π·d/λ). */
export function fsplDb(distanceM: number, frequencyHz: number): number {
  if (distanceM <= 0 || frequencyHz <= 0) return 0;
  const lambda = C / frequencyHz;
  return 20 * Math.log10((4 * Math.PI * distanceM) / lambda);
}

/**
 * Simplified atmospheric (gaseous) loss after ITU-R P.676.
 * One-way zenith attenuation in dB at sea level, then scaled by 1/sin(elev).
 * The piecewise model below reproduces the flat curve to ±0.3 dB up to 100 GHz
 * for clear-air conditions and is sufficient for educational use.
 */
export function atmosphericLossDb(frequencyHz: number, elevationDeg = 90): number {
  const fGHz = frequencyHz / 1e9;
  if (fGHz <= 0) return 0;

  // Piecewise zenith attenuation, dB (ITU-R P.676 simplified envelope).
  let zenith: number;
  if (fGHz < 1) zenith = 0.04;
  else if (fGHz < 10) zenith = 0.04 + 0.005 * (fGHz - 1);            // ~0.04..0.085
  else if (fGHz < 22) zenith = 0.085 + 0.04 * (fGHz - 10);           // climb to H₂O peak
  else if (fGHz < 30) zenith = 0.6 - 0.025 * (fGHz - 22);            // dip after 22 GHz
  else if (fGHz < 60) zenith = 0.4 + 0.6 * Math.pow((fGHz - 30) / 30, 2); // O₂ band
  else if (fGHz < 80) zenith = 15;                                    // O₂ peak ~60 GHz
  else zenith = 5 + 0.05 * (fGHz - 80);

  const elev = Math.max(1, Math.min(90, elevationDeg));
  return zenith / Math.sin((elev * Math.PI) / 180);
}

/** Path-length-scaled rain loss given dB/km coefficient and slant range. */
export function rainLossDb(rainRateDbPerKm: number, distanceM: number): number {
  if (rainRateDbPerKm <= 0 || distanceM <= 0) return 0;
  // Effective rain path is roughly the lower 5 km of atmosphere.
  const effectiveKm = Math.min(distanceM / 1000, 5);
  return rainRateDbPerKm * effectiveKm;
}

/** RX figure of merit: G/T_dBK = Gr_dBi − 10·log10(T_sys). */
export function gOverTDbK(rxGainDbi: number, systemTempK: number): number {
  if (systemTempK <= 0) return -Infinity;
  return rxGainDbi - 10 * Math.log10(systemTempK);
}

/** Compute the full link budget. */
export function computeLinkBudget(inp: LinkBudgetInputs): LinkBudgetResult {
  const warnings: string[] = [];
  const {
    frequencyHz,
    eirpDbw,
    distanceM,
    rxGainDbi,
    systemTempK,
    dataRateBps,
    bandwidthHz,
    rainRateDbPerKm = 0,
    polarizationLossDb = 0,
    pointingLossDb = 0.5,
    implementationLossDb = 1.0,
    requiredMarginDb = 3,
  } = inp;

  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) {
    throw new Error("Frequency must be positive.");
  }
  if (!Number.isFinite(distanceM) || distanceM <= 0) {
    throw new Error("Distance must be positive.");
  }

  const lambda = C / frequencyHz;
  const Lfs = fsplDb(distanceM, frequencyHz);
  const Latm = atmosphericLossDb(frequencyHz);
  const Lrain = rainLossDb(rainRateDbPerKm, distanceM);
  const Ltot = Lfs + Latm + Lrain + polarizationLossDb + pointingLossDb + implementationLossDb;

  const Pr = eirpDbw - Ltot + rxGainDbi; // dBW
  const B = bandwidthHz && bandwidthHz > 0 ? bandwidthHz : Math.max(1, dataRateBps);
  const Nw = BOLTZMANN * systemTempK * B;
  const NdBw = 10 * Math.log10(Math.max(Nw, 1e-30));
  const cn = Pr - NdBw;
  const cn0 = Pr - 10 * Math.log10(BOLTZMANN * systemTempK);
  const ebn0 = dataRateBps > 0 ? cn0 - 10 * Math.log10(dataRateBps) : NaN;
  const gT = gOverTDbK(rxGainDbi, systemTempK);

  // Sensitivity threshold = thermal floor + required Eb/N₀ ≈ 10 dB target.
  const sensitivityDbw = NdBw + 10; // assume QPSK BER 1e-6 ≈ 10 dB
  const margin = Pr - sensitivityDbw;

  if (Lfs > 250) warnings.push("Path loss exceeds 250 dB — verify distance/frequency.");
  if (systemTempK < 10 || systemTempK > 5000) warnings.push("System noise temperature looks unusual.");
  if (Latm > 20) warnings.push("Atmospheric loss > 20 dB — operating in a strong absorption band.");
  if (T0 !== 290) warnings.push("Reference temperature drift detected.");

  let verdict: LinkBudgetResult["verdict"];
  if (margin >= requiredMarginDb) verdict = "PASS";
  else if (margin >= 0) verdict = "MARGINAL";
  else verdict = "FAIL";

  return {
    wavelengthM: lambda,
    fsplDb: Lfs,
    atmosphericLossDb: Latm,
    rainLossDb: Lrain,
    totalLossDb: Ltot,
    rxPowerDbw: Pr,
    noisePowerDbw: NdBw,
    cnRatioDb: cn,
    cn0DbHz: cn0,
    ebN0Db: ebn0,
    gOverTDbK: gT,
    marginDb: margin,
    verdict,
    warnings,
  };
}

/** Common reference scenarios for quick presets. */
export const LINK_PRESETS = {
  iss_uplink: { name: "ISS Uplink (UHF)", distanceKm: 420, freqMHz: 437, rxGainDbi: 12, systemTempK: 290, dataRateKbps: 9.6 },
  starlink_user: { name: "Starlink User (Ku)", distanceKm: 550, freqMHz: 12000, rxGainDbi: 35, systemTempK: 150, dataRateKbps: 100000 },
  geo_dish: { name: "GEO Broadcast (Ku)", distanceKm: 35786, freqMHz: 11700, rxGainDbi: 41, systemTempK: 90, dataRateKbps: 30000 },
  lunar_dsn: { name: "Lunar Probe → DSN (X)", distanceKm: 384400, freqMHz: 8400, rxGainDbi: 74, systemTempK: 25, dataRateKbps: 256 },
  cubesat_lora: { name: "CubeSat LoRa (UHF)", distanceKm: 600, freqMHz: 433, rxGainDbi: 6, systemTempK: 350, dataRateKbps: 1.2 },
} as const;

export type LinkPresetKey = keyof typeof LINK_PRESETS;