/**
 * Unit conversion utilities for density
 * All internal values stored in SI (kg/m³)
 * Conversion factor: 1 kg/m³ = 0.062428 lb/ft³
 */

const KG_PER_CUBIC_METER_TO_LB_PER_CUBIC_FT = 0.062428;

export const convertDensityToImperial = (densitySI: number): number => {
  return densitySI * KG_PER_CUBIC_METER_TO_LB_PER_CUBIC_FT;
};

export const convertDensityFromImperial = (densityImperial: number): number => {
  return densityImperial / KG_PER_CUBIC_METER_TO_LB_PER_CUBIC_FT;
};

export const formatDensity = (density: number, unitSystem: "SI" | "Imperial"): string => {
  if (unitSystem === "SI") {
    return `${density.toLocaleString('en-US', { maximumFractionDigits: 0 })} kg/m³`;
  } else {
    const imperial = convertDensityToImperial(density);
    return `${imperial.toLocaleString('en-US', { maximumFractionDigits: 2 })} lb/ft³`;
  }
};

