// src/components/tools/utils/interlink.ts
import { INTERLINK_PUBLISHERS, FieldKey, ToolId } from './interlinkConfig';
import { getDesignSession, saveDesignSession } from '@/contexts/designSession';

// Strongly-typed mapping for design session keys we use
export type DesignSessionData = Partial<Record<FieldKey, number | string>>;

export function getAvailableDataForTool(toolId?: ToolId): DesignSessionData {
  const ds = getDesignSession();
  const out: DesignSessionData = {};
  const pubs = INTERLINK_PUBLISHERS.find((p) => p.toolId === toolId)?.publishes ?? [];
  for (const k of pubs) {
    const val = (ds as unknown as Record<string, unknown>)[k];
    if (val !== undefined && val !== null) out[k as FieldKey] = val as unknown;
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
    if (val !== undefined && val !== null) out[k] = val as unknown;
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
    prev[targetKey as FieldKey] = (ds as unknown as Record<string, unknown>)[targetKey as FieldKey] as unknown;
    (ds as unknown as Record<string, unknown>)[targetKey as FieldKey] = (data as unknown as Record<string, unknown>)[rawKey];
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
