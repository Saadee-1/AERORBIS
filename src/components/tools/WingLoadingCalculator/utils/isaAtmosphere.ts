/**
 * ISA (International Standard Atmosphere) Model for Air Density
 * 
 * WingLoadingCalculator-specific ISA utilities
 * Based on ISA standard up to 11 km altitude.
 */

import { calculateISADensity, feetToMeters, metersToFeet } from "../../utils/isaAtmosphere";

// Re-export shared functions
export { calculateISADensity, feetToMeters, metersToFeet };

/**
 * Get altitude in meters for preset conditions
 * 
 * @param preset - Air density preset name
 * @returns Altitude in meters
 */
export function getPresetAltitude(preset: string): number {
  switch (preset) {
    case 'ISA Sea Level':
      return 0;
    case '2000 ft':
      return feetToMeters(2000);
    case '5000 ft':
      return feetToMeters(5000);
    case '8000 ft':
      return feetToMeters(8000);
    case '10000 ft':
      return feetToMeters(10000);
    case '15000 ft':
      return feetToMeters(15000);
    default:
      return 0;
  }
}

