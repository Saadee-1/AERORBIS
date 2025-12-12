/**
 * Polar Chart Utilities
 * 
 * Utilities for rendering professional aerodynamic polar charts
 * with proper scaling, stall detection, and multi-airfoil comparison
 */

import type { PolarData } from './pdfExport';
import { buildEnhancedPolar, type EnhancedPolar } from '@/core/stallModel';
import { AIRFOIL_DATA } from '@/data/airfoils';

/**
 * Data quality types for polar data
 */
export type PolarDataQuality = 'experimental' | 'estimated' | 'extrapolated';

/**
 * Determine data quality from polar metadata
 * Returns 'estimated' for 404/missing polars, otherwise checks meta.source
 * Accepts both PolarData and EnhancedPolar
 */
export function getPolarDataQuality(
  polar: PolarData | { meta?: { source?: string } } | null,
  is404: boolean = false
): PolarDataQuality {
  if (!polar || is404) {
    return 'estimated'; // Missing polars are treated as estimated
  }

  const source = polar.meta?.source?.toLowerCase() || '';
  
  if (source === 'experimental' || source.includes('wind-tunnel') || source.includes('wind tunnel')) {
    return 'experimental';
  }
  
  if (source === 'extrapolated' || source.includes('extrapolated') || source.includes('beyond range')) {
    return 'extrapolated';
  }
  
  // Default to estimated for xfoil, estimated, model-based, or unknown sources
  return 'estimated';
}

/**
 * Get badge label and styling for data quality
 */
export function getDataQualityBadge(quality: PolarDataQuality): {
  label: string;
  className: string;
} {
  switch (quality) {
    case 'experimental':
      return {
        label: 'Verified Wind-Tunnel Data',
        className: 'bg-green-500/20 text-green-300 border border-green-600/50 text-xs px-2 py-0.5 rounded-md',
      };
    case 'estimated':
      return {
        label: 'Estimated / Model-Based',
        className: 'bg-yellow-500/20 text-yellow-300 border border-yellow-600/50 text-xs px-2 py-0.5 rounded-md',
      };
    case 'extrapolated':
      return {
        label: 'Mixed / Extrapolated Beyond Range',
        className: 'bg-orange-500/20 text-orange-300 border border-orange-600/50 text-xs px-2 py-0.5 rounded-md',
      };
  }
}

/**
 * Color palette for multi-airfoil comparison (up to 5 airfoils)
 * Each airfoil gets a consistent color across all charts (CL, CD, CM)
 */
export const AIRFOIL_COLORS = [
  '#22d3ee', // Cyan
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
];

/**
 * Detect stall index in polar data
 * Returns the index where stall begins (when CL drops significantly)
 */
export function detectStallIndex(polar: PolarData): number {
  if (!polar || !polar.cl || polar.cl.length === 0) {
    return polar?.alpha?.length || 0;
  }

  // Use meta.stall_alpha if available
  if (polar.meta?.stall_alpha !== undefined) {
    const stallAlpha = polar.meta.stall_alpha;
    const stallIdx = polar.alpha.findIndex(alpha => alpha >= stallAlpha);
    if (stallIdx >= 0) {
      return stallIdx;
    }
  }

  // Find where CL starts dropping (CL[i+1] < 0.9 * CL[i])
  for (let i = 1; i < polar.cl.length; i++) {
    if (polar.cl[i] < 0.9 * polar.cl[i - 1]) {
      return i;
    }
  }

  // No stall detected - return length (plot all data)
  return polar.cl.length;
}

/**
 * Split polar data into pre-stall and post-stall regions
 */
export function splitPolarAtStall(polar: PolarData): {
  preStall: { alpha: number[]; cl: number[]; cd: number[]; cm: number[] };
  postStall: { alpha: number[]; cl: number[]; cd: number[]; cm: number[] };
  stallIndex: number;
} {
  const stallIndex = detectStallIndex(polar);

  return {
    preStall: {
      alpha: polar.alpha.slice(0, stallIndex),
      cl: polar.cl.slice(0, stallIndex),
      cd: polar.cd.slice(0, stallIndex),
      cm: polar.cm?.slice(0, stallIndex) || [],
    },
    postStall: {
      alpha: polar.alpha.slice(stallIndex),
      cl: polar.cl.slice(stallIndex),
      cd: polar.cd.slice(stallIndex),
      cm: polar.cm?.slice(stallIndex) || [],
    },
    stallIndex,
  };
}

/**
 * Calculate axis range for CL chart
 * Adds padding of +/- 0.2 to data range
 */
export function calculateClRange(polars: PolarData[]): [number, number] {
  if (!polars || polars.length === 0) {
    return [-0.5, 2.0]; // Default range
  }

  let minCl = Infinity;
  let maxCl = -Infinity;

  for (const polar of polars) {
    if (polar && polar.cl) {
      for (const cl of polar.cl) {
        if (Number.isFinite(cl)) {
          minCl = Math.min(minCl, cl);
          maxCl = Math.max(maxCl, cl);
        }
      }
    }
  }

  // Add padding of +/- 0.2
  minCl = minCl - 0.2;
  maxCl = maxCl + 0.2;

  return [minCl, maxCl];
}

/**
 * Calculate axis range for CD chart
 * Auto-fit but never exceed 0.0 to 0.2 unless data > 0.2
 */
export function calculateCdRange(polars: PolarData[]): [number, number] {
  if (!polars || polars.length === 0) {
    return [0, 0.2]; // Default range
  }

  let maxCd = -Infinity;

  for (const polar of polars) {
    if (polar && polar.cd) {
      for (const cd of polar.cd) {
        if (Number.isFinite(cd)) {
          maxCd = Math.max(maxCd, cd);
        }
      }
    }
  }

  // If maxCd > 0.2, use dynamic upper bound
  const upperBound = maxCd > 0.2 ? maxCd + 0.02 : 0.2;

  return [0, upperBound];
}

/**
 * Calculate axis range for CM chart
 * Always includes zero-line
 */
export function calculateCmRange(polars: PolarData[]): [number, number] {
  if (!polars || polars.length === 0) {
    return [-0.1, 0.1]; // Default range
  }

  let minCm = 0;
  let maxCm = 0;

  for (const polar of polars) {
    if (polar && polar.cm) {
      for (const cm of polar.cm) {
        if (Number.isFinite(cm)) {
          minCm = Math.min(minCm, cm);
          maxCm = Math.max(maxCm, cm);
        }
      }
    }
  }

  // Add padding and ensure zero is included
  minCm = Math.min(minCm - 0.02, 0);
  maxCm = Math.max(maxCm + 0.02, 0);

  return [minCm, maxCm];
}

/**
 * Format tooltip value with proper precision
 */
export function formatTooltipValue(value: number, type: 'cl' | 'cd' | 'cm'): string {
  if (!Number.isFinite(value)) {
    return 'N/A';
  }

  switch (type) {
    case 'cl':
    case 'cm':
      return value.toFixed(3);
    case 'cd':
      return value.toFixed(4);
    default:
      return value.toFixed(3);
  }
}

/**
 * Get airfoil label for legend (includes name + role tag)
 */
export function getAirfoilLegendLabel(
  airfoilId: string,
  airfoilData: { name: string; description?: string }
): string {
  const name = airfoilData.name;
  
  // Extract role tag from description if available
  const desc = airfoilData.description || '';
  let roleTag = '';
  
  if (desc.includes('racer') || desc.includes('racing')) roleTag = 'Racer';
  else if (desc.includes('trainer') || desc.includes('training')) roleTag = 'Trainer';
  else if (desc.includes('endurance') || desc.includes('UAV')) roleTag = 'UAV';
  else if (desc.includes('glider') || desc.includes('sailplane')) roleTag = 'Glider';
  else if (desc.includes('aerobatic') || desc.includes('3D')) roleTag = 'Aerobatic';
  else if (desc.includes('transport') || desc.includes('heavy-lift')) roleTag = 'Transport';
  else if (desc.includes('STOL')) roleTag = 'STOL';

  return roleTag ? `${name} — ${roleTag}` : name;
}

/**
 * Track failed polar URLs to avoid repeated error logging
 */
const failedPolarUrls = new Set<string>();

/**
 * Track missing polar keys (404s) to avoid repeated warnings
 * Format: `${airfoilId}@Re=${re}`
 */
const missingPolarKeys = new Set<string>();

/**
 * Load polar data for a specific airfoil and Reynolds number
 */
export async function loadPolarForComparison(
  airfoilId: string,
  re: number
): Promise<PolarData | null> {
  // Format Reynolds number (using integer division like Python scripts)
  let reStr: string;
  if (re >= 1000000) {
    reStr = `${Math.floor(re / 1000000)}e6`;
  } else if (re >= 1000) {
    reStr = `${Math.floor(re / 1000)}k`;
  } else {
    reStr = `${re}`;
  }

  const url = `/polars/${airfoilId}/${reStr}.json`;

  try {
    const res = await fetch(url);

    // Check HTTP status - treat 404 as expected (missing polar)
    if (res.status === 404) {
      const key = `${airfoilId}@Re=${re}`;
      if (!missingPolarKeys.has(key)) {
        console.warn(
          `[Polars] Missing polar JSON for ${airfoilId} at Re=${re} (${url})`
        );
        missingPolarKeys.add(key);
      }
      return null; // graceful: no throw, caller sees "no polar"
    }

    // Other HTTP errors (500, etc.) - log once as error
    if (!res.ok) {
      if (!failedPolarUrls.has(url)) {
        console.error(
          `Error loading polar data for ${airfoilId} at Re=${re}: HTTP ${res.status} ${res.statusText}`
        );
        failedPolarUrls.add(url);
      }
      return null;
    }

    // Check content-type before parsing JSON
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      // Only log if we haven't seen this URL fail before
      if (!failedPolarUrls.has(url)) {
        console.error(
          `Error loading polar data for ${airfoilId} at Re=${re}: Unexpected content-type ${contentType}`
        );
        failedPolarUrls.add(url);
      }
      return null;
    }

    // Parse JSON with error handling
    let json: unknown;
    try {
      json = await res.json();
    } catch (err) {
      // JSON parse failure - warn once and return null (not a critical error)
      if (!failedPolarUrls.has(url)) {
        console.warn(
          `[Polars] Failed to parse polar JSON for ${airfoilId} at Re=${re}:`,
          err
        );
        failedPolarUrls.add(url);
      }
      return null;
    }

    // Normalize schema: handle both nested (from convertAirfoilToolsPolar.ts) and flat (new format) schemas
    let normalized: PolarData;
    
    if (json.data && json.data.alpha_deg) {
      // Nested schema from convertAirfoilToolsPolar.ts: { meta: {...}, data: { alpha_deg: [...], cl: [...], cd: [...], cm: [...] } }
      normalized = {
        airfoil: json.meta?.airfoil || airfoilId,
        re: json.meta?.re || re,
        mach: json.meta?.mach ?? 0.0,
        alpha: json.data.alpha_deg,
        cl: json.data.cl,
        cd: json.data.cd,
        cm: json.data.cm,
        meta: {
          source: json.meta?.source,
          generated_at: json.meta?.generated_at,
          filter: json.meta?.filter,
          notes: json.meta?.notes,
          cm_estimated: json.meta?.cm_estimated,
          stall_alpha: json.meta?.stall_alpha,
        },
      };
    } else if (json.alpha && Array.isArray(json.alpha)) {
      // Flat schema (new format): { airfoil: "...", re: ..., mach: ..., alpha: [...], cl: [...], cd: [...], cm: [...] }
      normalized = {
        airfoil: json.airfoil || airfoilId,
        re: json.re ?? re,
        mach: json.mach ?? 0.0,
        alpha: json.alpha,
        cl: json.cl,
        cd: json.cd,
        cm: json.cm,
        meta: json.meta,
      };
    } else {
      // Invalid schema
      if (!failedPolarUrls.has(url)) {
        console.error(
          `Error: Invalid polar JSON schema for ${airfoilId} at Re=${re}. Expected either nested (data.alpha_deg) or flat (alpha) schema.`
        );
        failedPolarUrls.add(url);
      }
      return null;
    }

    return normalized;
  } catch (error) {
    // Network or other fetch errors
    if (!failedPolarUrls.has(url)) {
      console.error(
        `Error loading polar data for ${airfoilId} at Re=${re}:`,
        error
      );
      failedPolarUrls.add(url);
    }
    return null;
  }
}

/**
 * Prepare chart data for multi-airfoil comparison
 * Returns data in Recharts format with one point per alpha value
 */
export function prepareMultiAirfoilChartData(
  polars: Array<{ id: string; data: PolarData }>,
  type: 'cl' | 'cd' | 'cm'
): Array<Record<string, number>> {
  if (!polars || polars.length === 0) {
    return [];
  }

  // Find common alpha grid (use first polar's alpha values)
  // Note: polars are now in flat schema format (PolarData), not nested
  const alphaGrid = polars[0].data.alpha;
  
  const chartData: Array<Record<string, number>> = [];

  for (let i = 0; i < alphaGrid.length; i++) {
    const point: Record<string, number> = {
      alpha: alphaGrid[i],
    };

    // Add data for each airfoil
    for (const polar of polars) {
      const { id, data } = polar;
      
      // Find matching alpha value in this polar's data
      const alphaIdx = data.alpha.findIndex(a => Math.abs(a - alphaGrid[i]) < 0.1);
      
      if (alphaIdx >= 0) {
        let value: number;
        switch (type) {
          case 'cl':
            value = data.cl[alphaIdx];
            break;
          case 'cd':
            value = data.cd[alphaIdx];
            break;
          case 'cm':
            value = data.cm?.[alphaIdx] ?? 0;
            break;
          default:
            value = 0;
        }
        point[id] = value;
      }
    }

    chartData.push(point);
  }

  return chartData;
}

/**
 * Export chart as PNG
 */
export async function exportChartAsPNG(
  chartElement: HTMLElement,
  filename: string
): Promise<void> {
  try {
    // Use html2canvas if available
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).html2canvas) {
      const canvas = await ((window as unknown as Record<string, unknown>).html2canvas as (el: HTMLElement) => Promise<HTMLCanvasElement>)(chartElement);
      const dataUrl = canvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.warn('html2canvas not available for chart export');
    }
  } catch (error) {
    console.error('Error exporting chart:', error);
    throw error;
  }
}

/**
 * Export chart as SVG
 */
export async function exportChartAsSVG(
  chartElement: HTMLElement,
  filename: string
): Promise<void> {
  try {
    // Find SVG element in the chart
    const svgElement = chartElement.querySelector('svg');
    if (!svgElement) {
      throw new Error('No SVG element found in chart');
    }

    // Serialize SVG
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    
    // Create blob and download
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting chart as SVG:', error);
    throw error;
  }
}

/**
 * Load enhanced polar data with stall model for a specific airfoil and Reynolds number
 * This wraps loadPolarForComparison and applies the stall model
 */
export async function loadEnhancedPolarForComparison(
  airfoilId: string,
  re: number
): Promise<EnhancedPolar | null> {
  const rawPolar = await loadPolarForComparison(airfoilId, re);
  if (!rawPolar) {
    return null;
  }

  try {
    const airfoilData = AIRFOIL_DATA[airfoilId];
    const family = airfoilData?.description || "";
    return buildEnhancedPolar(rawPolar, airfoilId, family);
  } catch (error) {
    console.error(`Error building enhanced polar for ${airfoilId} at Re=${re}:`, error);
    return null;
  }
}

