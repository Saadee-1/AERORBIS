import { buildAeroversePayload } from "@/ai/buildPayload";
import type { AeroverseAIPayload } from "@/ai/schema/AeroversePayload";
import type { AntennaParams } from "@/lib/antenna/models";
import type { AntennaResult } from "./types";

interface ChartPoint {
  angle: number;
  gain: number;
  gainLinear: number;
}

interface ChartData {
  ePlane: ChartPoint[];
  hPlane: ChartPoint[];
}

interface BuildAntennaPayloadParams {
  requestId?: string;
  antennaId: string;
  antennaName: string;
  antennaParams: AntennaParams;
  frequency: number;
  frequencyUnit: "Hz" | "MHz" | "GHz" | "Custom";
  customFrequencyUnitName: string;
  customFrequencyFactor: string;
  frequencyHz: number;
  wavelengthMeters: number;
  transmitPower: number;
  polarization: string;
  resolution: number;
  computeMode: "fast" | "accurate";
  result: AntennaResult;
  chartData?: ChartData;
}

export function buildAntennaPayload({
  requestId,
  antennaId,
  antennaName,
  antennaParams,
  frequency,
  frequencyUnit,
  customFrequencyUnitName,
  customFrequencyFactor,
  frequencyHz,
  wavelengthMeters,
  transmitPower,
  polarization,
  resolution,
  computeMode,
  result,
  chartData,
}: BuildAntennaPayloadParams): AeroverseAIPayload {
  const wavelengthMm = wavelengthMeters * 1000;
  const steps = [
    `Antenna: ${antennaName} (${antennaId})`,
    `Frequency: ${frequency} ${frequencyUnit} (${frequencyHz.toExponential(3)} Hz, λ = ${wavelengthMm.toFixed(2)} mm)`,
    `Peak Gain: ${result.peakGainDbi.toFixed(2)} dBi (${result.peakGainLinear.toFixed(4)} linear)`,
    `Directivity: ${result.directivityDbi.toFixed(2)} dBi`,
    `EIRP: ${result.eirp.eirpDbw.toFixed(2)} dBW (${result.eirp.eirpWatts.toFixed(2)} W)`,
    `HPBW (E-plane): ${result.hpbmE !== null ? `${result.hpbmE.toFixed(2)}°` : "N/A"}`,
    `HPBW (H-plane): ${result.hpbmH !== null ? `${result.hpbmH.toFixed(2)}°` : "N/A"}`,
    `Side-lobe Level: ${result.sideLobeLevel.toFixed(2)} dB`,
    `Front-to-Back Ratio: ${result.frontToBackRatio.toFixed(2)} dB`,
  ];

  const approxLevel =
    result.metadata?.approxLevel ?? (computeMode === "fast" ? "approximate" : "numeric");
  const confidence =
    result.metadata?.confidence ?? (result.warnings.length > 0 ? "medium" : "high");

  const charts: AeroverseAIPayload["charts"] = [];
  if (chartData?.ePlane?.length) {
    charts.push({
      id: "e-plane-pattern",
      title: "E-Plane Radiation Pattern",
      dataSummary: `${chartData.ePlane.length} samples across 0-180°`,
    });
  }
  if (chartData?.hPlane?.length) {
    charts.push({
      id: "h-plane-pattern",
      title: "H-Plane Radiation Pattern",
      dataSummary: `${chartData.hPlane.length} samples across 0-180°`,
    });
  }

  return buildAeroversePayload({
    requestId,
    toolName: "Antenna Pattern Analyzer",
    inputs: {
      antenna: {
        id: antennaId,
        name: antennaName,
        parameters: antennaParams,
      },
      frequency: {
        value: frequency,
        unit: frequencyUnit,
        valueHz: frequencyHz,
        wavelength_m: wavelengthMeters,
        customUnitName: frequencyUnit === "Custom" ? customFrequencyUnitName : undefined,
        customUnitFactor: frequencyUnit === "Custom" ? customFrequencyFactor : undefined,
      },
      transmitPower_W: transmitPower,
      polarization,
      resolution_deg: resolution,
      computeMode,
    },
    results: {
      peakGain_dBi: result.peakGainDbi,
      peakGain_linear: result.peakGainLinear,
      directivity_dBi: result.directivityDbi,
      hpbw_eplane_deg: result.hpbmE,
      hpbw_hplane_deg: result.hpbmH,
      sideLobeLevel_dB: result.sideLobeLevel,
      frontToBackRatio_dB: result.frontToBackRatio,
      eirp_W: result.eirp.eirpWatts,
      eirp_dBW: result.eirp.eirpDbw,
      eirp_dBm: result.eirp.eirpDbm,
      wavelength_mm: wavelengthMm,
      warnings: result.warnings,
    },
    units: {
      peakGain_dBi: "dBi",
      peakGain_linear: "",
      directivity_dBi: "dBi",
      transmitPower_W: "W",
      frequency: frequencyUnit,
      frequencyHz: "Hz",
      wavelength_m: "m",
      wavelength_mm: "mm",
      hpbw_eplane_deg: "deg",
      hpbw_hplane_deg: "deg",
      sideLobeLevel_dB: "dB",
      frontToBackRatio_dB: "dB",
      eirp_W: "W",
      eirp_dBW: "dBW",
      eirp_dBm: "dBm",
    },
    charts,
    configuration: {
      polarization,
      resolution_deg: resolution,
      computeMode,
      antennaParams,
    },
    metadata: {
      steps,
      unitsSystem: "SI",
      approxLevel,
      confidence,
      warnings: result.warnings,
      userNotes: result.metadata?.notes?.join('; '),
    },
  });
}

