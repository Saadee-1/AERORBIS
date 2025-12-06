/**
 * Per-airfoil Reynolds number sets
 * 
 * Defines the canonical Reynolds numbers for each airfoil based on their
 * typical operating conditions and design purpose.
 * 
 * Each airfoil has 4 recommended Reynolds numbers that cover its typical
 * operating range from low-speed to high-speed conditions.
 */

export const AIRFOIL_RE_SETS: Record<string, number[]> = {
  // STOL / slow UAV / low Reynolds
  selig1223: [80000, 120000, 200000, 300000],
  s1223: [80000, 120000, 200000, 300000],
  mh114: [80000, 120000, 200000, 300000],

  // Glider / endurance / moderate-low Reynolds
  selig3021: [150000, 300000, 500000, 800000],
  eppler205: [150000, 300000, 500000, 800000],
  eppler320: [150000, 300000, 500000, 800000],
  hq3012: [150000, 300000, 500000, 800000],
  sd7037: [150000, 300000, 500000, 800000],
  fx63137: [150000, 300000, 500000, 800000],

  // Trainer / GA / moderate Reynolds
  clarky: [500000, 1000000, 2000000, 3000000],
  clarkyh: [500000, 1000000, 2000000, 3000000],
  naca2410: [500000, 1000000, 2000000, 3000000],
  naca2412: [500000, 1000000, 2000000, 3000000],
  naca2415: [500000, 1000000, 2000000, 3000000],
  naca4412: [500000, 1000000, 2000000, 3000000],
  naca4415: [500000, 1000000, 2000000, 3000000],
  naca23012: [500000, 1000000, 2000000, 3000000],
  naca23015: [500000, 1000000, 2000000, 3000000],
  naca63215: [500000, 1000000, 2000000, 3000000],

  // Fast / laminar / high Reynolds
  naca64a010: [2000000, 4000000, 6000000, 9000000],
  naca64012: [2000000, 4000000, 6000000, 9000000],
  naca65415: [2000000, 4000000, 6000000, 9000000],
  naca65a012: [2000000, 4000000, 6000000, 9000000],
  supercritical: [2000000, 4000000, 6000000, 9000000],

  // Symmetric / aerobatic / moderate-high Reynolds
  naca0006: [500000, 1000000, 2000000, 3000000],
  naca0009: [500000, 1000000, 2000000, 3000000],
  naca0012: [500000, 1000000, 2000000, 3000000],
  naca0015: [500000, 1000000, 2000000, 3000000],
  naca0018: [500000, 1000000, 2000000, 3000000],

  // Wind turbine / specialized
  du91w2250: [200000, 500000, 1000000, 2000000],
};

/**
 * Get the recommended Reynolds number set for a given airfoil
 * 
 * @param airfoilId - The airfoil identifier
 * @returns Array of 4 recommended Reynolds numbers, or default set if not found
 */
export function getReSetForAirfoil(airfoilId: string): number[] {
  return AIRFOIL_RE_SETS[airfoilId] ?? [200000, 500000, 1000000, 2000000];
}

