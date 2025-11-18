/**
 * Standard Atmosphere 1976 Layer Definitions
 * 
 * Each layer defines:
 * - Base height (geopotential, m)
 * - Base temperature (K)
 * - Lapse rate (K/m, 0 for isothermal)
 * - Base pressure (Pa, calculated)
 */

export interface AtmosphereLayer {
  id: string;
  name: string;
  baseHeight: number; // geopotential altitude (m)
  baseTemp: number; // K
  lapseRate: number; // K/m (0 = isothermal)
  basePressure?: number; // Pa (calculated, optional for reference)
}

/**
 * Standard Atmosphere 1976 Layers
 * 
 * Layer structure:
 * 0: Troposphere (0-11 km)
 * 1: Tropopause (11-20 km) - isothermal
 * 2: Stratosphere 1 (20-32 km)
 * 3: Stratosphere 2 (32-47 km)
 * 4: Stratopause (47-51 km) - isothermal
 * 5: Mesosphere 1 (51-71 km)
 * 6: Mesosphere 2 (71-86 km) - isothermal
 */
export const ATMOSPHERE_LAYERS: AtmosphereLayer[] = [
  {
    id: 'troposphere',
    name: 'Troposphere',
    baseHeight: 0,
    baseTemp: 288.15, // K
    lapseRate: -0.0065, // K/m
  },
  {
    id: 'tropopause',
    name: 'Tropopause',
    baseHeight: 11000, // m
    baseTemp: 216.65, // K
    lapseRate: 0, // isothermal
  },
  {
    id: 'stratosphere1',
    name: 'Stratosphere 1',
    baseHeight: 20000, // m
    baseTemp: 216.65, // K
    lapseRate: 0.001, // K/m
  },
  {
    id: 'stratosphere2',
    name: 'Stratosphere 2',
    baseHeight: 32000, // m
    baseTemp: 228.65, // K
    lapseRate: 0.0028, // K/m
  },
  {
    id: 'stratopause',
    name: 'Stratopause',
    baseHeight: 47000, // m
    baseTemp: 270.65, // K
    lapseRate: 0, // isothermal
  },
  {
    id: 'mesosphere1',
    name: 'Mesosphere 1',
    baseHeight: 51000, // m
    baseTemp: 270.65, // K
    lapseRate: -0.0028, // K/m
  },
  {
    id: 'mesosphere2',
    name: 'Mesosphere 2',
    baseHeight: 71000, // m
    baseTemp: 214.65, // K
    lapseRate: -0.002, // K/m (actually -0.002 K/m up to 86 km, but treated as layer 7)
  },
];

/**
 * Find the layer that contains a given geopotential altitude
 */
export function findLayerForAltitude(altitude: number): AtmosphereLayer | null {
  if (altitude < 0 || altitude > 86000) {
    return null;
  }

  // Find the layer where altitude falls
  for (let i = ATMOSPHERE_LAYERS.length - 1; i >= 0; i--) {
    if (altitude >= ATMOSPHERE_LAYERS[i].baseHeight) {
      return ATMOSPHERE_LAYERS[i];
    }
  }

  // Should never reach here if altitude is valid
  return ATMOSPHERE_LAYERS[0];
}

/**
 * Get layer name for display
 */
export function getLayerName(altitude: number): string {
  const layer = findLayerForAltitude(altitude);
  return layer?.name || 'Unknown';
}

