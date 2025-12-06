/**
 * Helper to get all airfoils with engineering metrics for recommendation engine
 * Computes real metrics from polar JSON files
 */

import { AIRFOIL_DATA, AIRFOILS } from "@/data/airfoils";
import { loadPolarForComparison } from "@/lib/polarChartUtils";
import { polarsConfig } from "@/config/polarsConfig";
import { getReSetForAirfoil } from "@/data/airfoilReSets";
import type { PolarData } from "@/lib/pdfExport";

export interface AirfoilPolarMetrics {
  airfoilId: string;
  re: number;
  clMax: number;
  cdMin: number;
  ldMax: number;
  alphaAtClMax: number | null;
  stallAlpha: number | null;
  stallSoftness: number | null; // higher = softer
  cmMean: number | null;
  cmRange: number | null;
}

export interface AirfoilWithMetrics extends AirfoilPolarMetrics {
  name?: string;
  tags?: string[];
}

/**
 * Find the closest available Reynolds number to targetRe
 * Uses per-airfoil Re sets if airfoilId is provided, otherwise falls back to global config
 * Safety: Returns default 1M if no Re set is available
 */
function findClosestRe(targetRe: number, airfoilId?: string): number {
  // Use per-airfoil Re set if airfoilId is provided
  const preferredRes = airfoilId 
    ? getReSetForAirfoil(airfoilId)
    : polarsConfig.preferredRes;
  
  // Safety guard: if preferredRes is empty, return default
  if (!preferredRes || preferredRes.length === 0) {
    console.warn("[findClosestRe] preferredRes is empty, using default 1M");
    return 1000000;
  }
  
  let closest = preferredRes[0];
  let minDiff = Math.abs(targetRe - closest);

  for (const re of preferredRes) {
    const diff = Math.abs(targetRe - re);
    if (diff < minDiff) {
      minDiff = diff;
      closest = re;
    }
  }

  return closest;
}

/**
 * Load or derive polar data for a given airfoil + Reynolds
 * and compute engineering metrics.
 */
export async function getPolarMetricsForAirfoil(
  airfoilId: string,
  targetRe: number
): Promise<AirfoilPolarMetrics | null> {
  try {
    // Find closest available Re using per-airfoil set
    const closestRe = findClosestRe(targetRe, airfoilId);
    
    // Load polar data
    const polar = await loadPolarForComparison(airfoilId, closestRe);
    
    if (!polar || !polar.alpha || !polar.cl || !polar.cd) {
      return null;
    }

    const { alpha, cl, cd, cm, meta } = polar;

    // Filter out invalid data points
    const validIndices: number[] = [];
    for (let i = 0; i < alpha.length; i++) {
      if (
        Number.isFinite(alpha[i]) &&
        Number.isFinite(cl[i]) &&
        Number.isFinite(cd[i]) &&
        cd[i] > 0 // Avoid division by zero
      ) {
        validIndices.push(i);
      }
    }

    if (validIndices.length === 0) {
      return null;
    }

    // Compute clMax and alphaAtClMax
    // Safety: validIndices.length > 0 guaranteed by check above
    let clMax = -Infinity;
    let idxMax = -1;
    for (const idx of validIndices) {
      if (cl[idx] > clMax) {
        clMax = cl[idx];
        idxMax = idx;
      }
    }
    // Safety: clMax will be finite since validIndices contains only indices with finite cl values
    if (!Number.isFinite(clMax)) {
      return null; // Should never happen, but defensive check
    }

    const alphaAtClMax = idxMax >= 0 ? alpha[idxMax] : null;

    // Compute cdMin
    // Safety: validIndices.length > 0 guaranteed, and all cd[idx] are finite and > 0
    let cdMin = Infinity;
    for (const idx of validIndices) {
      if (cd[idx] < cdMin) {
        cdMin = cd[idx];
      }
    }
    // Safety: cdMin will be finite since validIndices contains only indices with finite cd values
    if (!Number.isFinite(cdMin)) {
      return null; // Should never happen, but defensive check
    }

    // Compute ldMax (max L/D ratio)
    let ldMax = -Infinity;
    for (const idx of validIndices) {
      const ld = cl[idx] / cd[idx];
      if (Number.isFinite(ld) && ld > ldMax) {
        ldMax = ld;
      }
    }

    // Compute stallAlpha
    let stallAlpha: number | null = null;
    if (meta?.stall_alpha !== undefined) {
      stallAlpha = meta.stall_alpha;
    } else if (alphaAtClMax !== null) {
      stallAlpha = alphaAtClMax;
    }

    // Compute stallSoftness
    let stallSoftness: number | null = null;
    if (idxMax >= 0 && idxMax + 2 < cl.length) {
      const afterIdx = idxMax + 2;
      if (afterIdx < cl.length && Number.isFinite(cl[afterIdx])) {
        const drop = clMax - cl[afterIdx];
        // Higher value = softer stall (less drop)
        stallSoftness = 1 / (1 + Math.max(drop, 0));
      }
    }

    // Compute cmMean and cmRange
    // Safety: validCm.length > 0 check ensures Math.min/max won't throw
    let cmMean: number | null = null;
    let cmRange: number | null = null;
    if (cm && cm.length > 0) {
      const validCm = cm.filter(c => Number.isFinite(c));
      if (validCm.length > 0) {
        const sum = validCm.reduce((a, b) => a + b, 0);
        cmMean = sum / validCm.length;
        
        // Safe: validCm.length > 0 guaranteed by check above
        const cmMin = Math.min(...validCm);
        const cmMax = Math.max(...validCm);
        cmRange = cmMax - cmMin;
      }
    }

    return {
      airfoilId,
      re: closestRe,
      clMax: Number.isFinite(clMax) ? clMax : 0,
      cdMin: Number.isFinite(cdMin) ? cdMin : 1,
      ldMax: Number.isFinite(ldMax) ? ldMax : 0,
      alphaAtClMax,
      stallAlpha,
      stallSoftness,
      cmMean,
      cmRange,
    };
  } catch (error) {
    console.error(`Error computing metrics for ${airfoilId} at Re=${targetRe}:`, error);
    return null;
  }
}

/**
 * Get all airfoils with engineering metrics for a given Reynolds number
 */
export async function getAllAirfoilsWithMetricsForRe(targetRe: number): Promise<AirfoilWithMetrics[]> {
  const airfoils = AIRFOILS.filter(af => !af.custom);
  const results: AirfoilWithMetrics[] = [];

  // Extract tags helper (reused from original)
  const extractTags = (af: typeof AIRFOILS[0]): string[] => {
    const tags: string[] = [];
    const data = AIRFOIL_DATA[af.id];
    const nameLower = (data?.name || af.name).toLowerCase();
    const descLower = (data?.description || "").toLowerCase();
    
    if (nameLower.includes("trainer") || descLower.includes("trainer") || descLower.includes("cessna")) {
      tags.push("trainer");
    }
    if (nameLower.includes("stol") || descLower.includes("stol") || nameLower.includes("clarkyh")) {
      tags.push("stol");
    }
    if (nameLower.includes("uav") || descLower.includes("uav") || nameLower.includes("endurance") || nameLower.includes("mh114")) {
      tags.push("uav");
    }
    if (nameLower.includes("racer") || descLower.includes("racer") || descLower.includes("high-speed")) {
      tags.push("racer");
    }
    if (nameLower.includes("symmetric") || descLower.includes("symmetric") || descLower.includes("aerobatic") || af.id.includes("00")) {
      tags.push("symmetric");
    }
    if (nameLower.includes("glider") || descLower.includes("glider") || descLower.includes("soaring") || nameLower.includes("sd7037")) {
      tags.push("glider");
    }
    if (nameLower.includes("turbine") || descLower.includes("turbine") || nameLower.includes("du91")) {
      tags.push("turbine");
    }
    if (nameLower.includes("supercritical") || descLower.includes("supercritical") || descLower.includes("transport")) {
      tags.push("supercritical");
    }
    if (nameLower.includes("low re") || descLower.includes("low reynolds") || nameLower.includes("s1223")) {
      tags.push("lowre");
    }
    
    return tags;
  };

  // Load metrics for each airfoil
  for (const af of airfoils) {
    const metrics = await getPolarMetricsForAirfoil(af.id, targetRe);
    if (metrics) {
      const data = AIRFOIL_DATA[af.id];
      results.push({
        ...metrics,
        name: data?.name || af.name,
        tags: extractTags(af),
      });
    }
  }

  return results;
}

/**
 * Get all airfoils with basic metadata (backward compatibility)
 * @deprecated Use getAllAirfoilsWithMetricsForRe instead
 */
export function getAllAirfoilsWithBasicMetrics(): AirfoilWithMetrics[] {
  return AIRFOILS
    .filter(af => !af.custom)
    .map(af => {
      const data = AIRFOIL_DATA[af.id];
      const nameLower = (data?.name || af.name).toLowerCase();
      const descLower = (data?.description || "").toLowerCase();
      const tags: string[] = [];
      
      if (nameLower.includes("trainer") || descLower.includes("trainer") || descLower.includes("cessna")) {
        tags.push("trainer");
      }
      if (nameLower.includes("stol") || descLower.includes("stol") || nameLower.includes("clarkyh")) {
        tags.push("stol");
      }
      if (nameLower.includes("uav") || descLower.includes("uav") || nameLower.includes("endurance") || nameLower.includes("mh114")) {
        tags.push("uav");
      }
      if (nameLower.includes("racer") || descLower.includes("racer") || descLower.includes("high-speed")) {
        tags.push("racer");
      }
      if (nameLower.includes("symmetric") || descLower.includes("symmetric") || descLower.includes("aerobatic") || af.id.includes("00")) {
        tags.push("symmetric");
      }
      if (nameLower.includes("glider") || descLower.includes("glider") || descLower.includes("soaring") || nameLower.includes("sd7037")) {
        tags.push("glider");
      }
      if (nameLower.includes("turbine") || descLower.includes("turbine") || nameLower.includes("du91")) {
        tags.push("turbine");
      }
      if (nameLower.includes("supercritical") || descLower.includes("supercritical") || descLower.includes("transport")) {
        tags.push("supercritical");
      }
      if (nameLower.includes("low re") || descLower.includes("low reynolds") || nameLower.includes("s1223")) {
        tags.push("lowre");
      }
      
      return {
        airfoilId: af.id,
        re: 1000000, // Default
        clMax: 0,
        cdMin: 1,
        ldMax: 0,
        alphaAtClMax: null,
        stallAlpha: null,
        stallSoftness: null,
        cmMean: null,
        cmRange: null,
        name: data?.name || af.name,
        tags,
      };
    });
}

