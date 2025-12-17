// src/components/tools/utils/interlink.ts
import { INTERLINK_PUBLISHERS, FieldKey, ToolId, TOOL_ROUTES } from './interlinkConfig';
import { getDesignSession, saveDesignSession } from '@/contexts/designSession';

// Strongly-typed mapping for design session keys we use
export type DesignSessionData = Partial<Record<FieldKey, number | string>>;

export function getAvailableDataForTool(toolId?: ToolId): DesignSessionData {
  const ds = getDesignSession();
  const out: DesignSessionData = {};
  const pubs = INTERLINK_PUBLISHERS.find((p) => p.toolId === toolId)?.publishes ?? [];
  for (const k of pubs) {
    const val = (ds as unknown as Record<string, unknown>)[k];
    if (val !== undefined && val !== null) out[k as FieldKey] = val as string | number;
  }
  return out;
}

export function getAvailableDataAny(): DesignSessionData {
  const ds = getDesignSession();
  const out: DesignSessionData = {};
  const known = new Set<FieldKey>();
  INTERLINK_PUBLISHERS.forEach((p) => p.publishes.forEach((f) => known.add(f)));
  for (const k of Array.from(known)) {
    const val = (ds as unknown as Record<string, unknown>)[k];
    if (val !== undefined && val !== null) out[k] = val as string | number;
  }
  return out;
}

/**
 * Import `data` into designSession using optional mapping srcKey->targetKey.
 * Returns previous values for undo.
 */
export function importDataToSession(
  data: DesignSessionData,
  mapping?: Record<string, string>
): DesignSessionData {
  const ds = getDesignSession();
  const prev: DesignSessionData = {};
  for (const rawKey of Object.keys(data)) {
    const targetKey = (mapping && mapping[rawKey]) ?? rawKey;
    prev[targetKey as FieldKey] = (ds as unknown as Record<string, string | number>)[targetKey] as string | number;
    (ds as unknown as Record<string, string | number>)[targetKey] = (data as Record<string, string | number>)[rawKey];
  }
  saveDesignSession(ds);
  // Emit event so other components can refresh if they listen
  try {
    window.dispatchEvent(new CustomEvent('designSessionUpdated', { detail: { source: 'import' } }));
  } catch (e) {
    // noop in non-browser env
  }
  return prev;
}

export function labelForField(k: FieldKey | string) {
  const map: Record<string, string> = {
    massKg: 'Mass (kg)',
    weightN: 'Weight (N)',
    wingAreaM2: 'Wing Area (m²)',
    wingLoadingKgm2: 'Wing Loading (kg/m²)',
    totalThrustN: 'Total Thrust (N)',
    cd0: 'C_D0',
    k: 'Induced Factor (k)',
    clMax: 'CL_max',
    stallSpeedMs: 'Stall Speed (m/s)',
    densityKgM3: 'Air Density (kg/m³)',
    vClimbVyMs: 'V_y (m/s)',
    vClimbVxMs: 'V_x (m/s)',
  };
  return map[k] ?? k;
}

// Compatibility exports for existing components
export type ReusableData = DesignSessionData;

// TODO: refine type for `StateSetters` — changed any -> unknown automatically by chore/typed-cleanup
export interface StateSetters {
  [key: string]: ((value: unknown) => void) | undefined;
}

export interface SourceInfo {
  name: string;
  id: string;
  icon?: string;
  color?: string;
  fields: { key: string; label: string }[];
  confidence?: number;
  path?: string;
}

export function hasReusableData(data: ReusableData): boolean {
  return Object.keys(data).length > 0;
}

export function getReusableDataSummary(data: ReusableData): string {
  const parts: string[] = [];
  
  if (typeof data.massKg === 'number' && Number.isFinite(data.massKg)) {
    parts.push(`Mass: ${data.massKg.toFixed(1)} kg`);
  } else if (typeof data.weightN === 'number' && Number.isFinite(data.weightN)) {
    parts.push(`Weight: ${data.weightN.toFixed(0)} N`);
  }
  
  if (typeof data.wingAreaM2 === 'number' && Number.isFinite(data.wingAreaM2)) {
    parts.push(`Wing Area: ${data.wingAreaM2.toFixed(2)} m²`);
  }
  
  if (typeof data.wingLoadingKgm2 === 'number' && Number.isFinite(data.wingLoadingKgm2)) {
    parts.push(`W/S: ${data.wingLoadingKgm2.toFixed(1)} kg/m²`);
  }
  
  return parts.join(' • ') || 'Design data available';
}

// TODO: refine type for `applyReusableDataToSetters` — changed any -> unknown automatically by chore/typed-cleanup
export function applyReusableDataToSetters(
  reusable: ReusableData,
  setters: StateSetters,
  getCurrentValues?: () => Record<string, unknown>
): { appliedKeys: string[]; previousValues: Record<string, unknown> } {
  const appliedKeys: string[] = [];
  // TODO: refine type for `previousValues` — changed any -> unknown automatically by chore/typed-cleanup
  const previousValues: Record<string, unknown> = {};
  const currentValues = getCurrentValues ? getCurrentValues() : {};

  const getCurrent = (key: string) => {
    return currentValues[key] ?? '';
  };

  // Apply all fields
  for (const key of Object.keys(reusable)) {
    const setter = setters[`set${key.charAt(0).toUpperCase() + key.slice(1)}`] || setters[key];
    if (setter && reusable[key] !== undefined) {
      const keyStr = String(key);
      previousValues[keyStr] = getCurrent(keyStr);
      const value = reusable[key];
      if (typeof value === 'number') {
        setter(value.toString());
      } else {
        setter(value);
      }
      appliedKeys.push(keyStr);
    }
  }

  return { appliedKeys, previousValues };
}

// Compatibility functions for existing components
export function getReusableDataForCalculator(
  designSession: DesignSessionData | undefined | null,
  tool: ToolId | string
): ReusableData {
  if (!designSession) {
    return {};
  }
  return getAvailableDataForTool(tool as ToolId);
}

export function findSourceList(
  designSession: DesignSessionData | undefined | null,
  targetFields: string[]
): SourceInfo[] {
  if (!designSession) {
    return [];
  }

  const sourcesMap = new Map<string, SourceInfo>();

  for (const fieldKey of targetFields) {
    const publisher = INTERLINK_PUBLISHERS.find(p => p.publishes.includes(fieldKey as FieldKey));
    if (publisher && designSession[fieldKey as FieldKey] !== undefined) {
      if (!sourcesMap.has(publisher.toolId)) {
        // Use TOOL_ROUTES for correct route
        const route = TOOL_ROUTES[publisher.toolId] || `/tools/launch?tool=${publisher.toolId}`;
        sourcesMap.set(publisher.toolId, {
          name: publisher.label || publisher.toolId,
          id: publisher.toolId,
          fields: [],
          path: route,
        });
      }
      const source = sourcesMap.get(publisher.toolId)!;
      if (!source.fields.some(f => f.key === fieldKey)) {
        source.fields.push({
          key: fieldKey,
          label: labelForField(fieldKey),
        });
      }
    }
  }

  return Array.from(sourcesMap.values());
}

export function getReusableDataWithSources(
  designSession: DesignSessionData | undefined | null,
  targetFields: string[]
): { data: ReusableData; sources: Record<string, string> } {
  if (!designSession) {
    return { data: {}, sources: {} };
  }

  const data: ReusableData = {};
  const sources: Record<string, string> = {};

  for (const fieldKey of targetFields) {
    const publisher = INTERLINK_PUBLISHERS.find(p => p.publishes.includes(fieldKey as FieldKey));
    if (publisher && designSession[fieldKey as FieldKey] !== undefined) {
      data[fieldKey as FieldKey] = designSession[fieldKey as FieldKey];
      sources[fieldKey] = publisher.toolId;
    }
  }

  return { data, sources };
}
