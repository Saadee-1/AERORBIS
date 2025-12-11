import { INTERLINK_PUBLISHERS, FieldKey, ToolId } from './interlinkConfig';
import { getDesignSession, saveDesignSession } from '@/contexts/designSession';

export type DesignSessionData = Partial<Record<FieldKey, number | string>>;

export function getAvailableDataForTool(toolId?: ToolId): DesignSessionData {
  const ds = getDesignSession();
  const out: DesignSessionData = {};
  const pubs = INTERLINK_PUBLISHERS.find((p) => p.toolId === toolId)?.publishes ?? [];

  for (const k of pubs) {
    if (ds[k] !== undefined && ds[k] !== null) out[k] = ds[k];
  }
  return out;
}

export function getAvailableDataAny(): DesignSessionData {
  const ds = getDesignSession();
  const out: DesignSessionData = {};

  const known = new Set<FieldKey>();
  INTERLINK_PUBLISHERS.forEach((p) => p.publishes.forEach((f) => known.add(f)));

  for (const k of known) {
    if (ds[k] !== undefined && ds[k] !== null) out[k] = ds[k];
  }
  return out;
}

export function importDataToSession(data: DesignSessionData, mapping?: Record<string, string>) {
  const ds = getDesignSession();
  const prev: DesignSessionData = {};

  for (const key of Object.keys(data)) {
    const target = (mapping && mapping[key]) || key;
    prev[target as FieldKey] = ds[target as FieldKey];
    (ds as any)[target] = (data as any)[key];
  }
  saveDesignSession(ds);
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
