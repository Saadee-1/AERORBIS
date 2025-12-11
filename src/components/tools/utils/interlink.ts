/**
 * Interlink Utility for Calculator Data Sharing
 * 
 * Provides utilities to detect and apply reusable data from designSession
 * across interdependent calculators.
 */

import { DesignSessionData, MissionType } from "@/contexts/designSession";
import { ReactNode } from "react";

export type CalculatorTool = 'thrust' | 'wing' | 'reynolds' | 'liftdrag' | 'atmosphere' | string;

/**
 * Source information for interlinking
 */
export interface SourceInfo {
  name: string; // e.g., 'Wing Loading'
  id: string; // e.g., 'wing'
  icon?: ReactNode;
  color?: string; // CSS color string
  fields: { key: string; label: string }[]; // e.g. [{key:'wingLoadingKgm2', label: 'W/S'}]
  confidence?: number; // optional tie-breaker (higher = better)
  path?: string; // route path to calculator
}

/**
 * Field mapping for calculators
 */
export interface FieldMapping {
  [fieldKey: string]: {
    label: string;
    sources: string[]; // source IDs that can provide this field
  };
}

export interface ReusableData {
  massKg?: number;
  weightN?: number;
  wingAreaM2?: number;
  wingLoadingKgm2?: number;
  stallSpeedMs?: number;
  stallSpeedKts?: number;
  clMaxUsed?: number;
  densityKgM3?: number;
  missionType?: MissionType;
  ldClimb?: number;
  clClimb?: number;
  alphaClimbDeg?: number;
  [key: string]: number | string | MissionType | undefined;
}

export interface DataSource {
  name: string;
  icon?: string;
  data: ReusableData;
}

/**
 * Get reusable data from designSession for a specific calculator
 * Returns only fields that are present and valid
 */
export function getReusableDataForCalculator(
  designSession: DesignSessionData | undefined | null,
  tool: CalculatorTool
): ReusableData {
  if (!designSession) {
    return {};
  }

  const reused: ReusableData = {};

  // Common fields available to all calculators
  if (typeof designSession.massKg === 'number' && Number.isFinite(designSession.massKg) && designSession.massKg > 0) {
    reused.massKg = designSession.massKg;
  }
  if (typeof designSession.weightN === 'number' && Number.isFinite(designSession.weightN) && designSession.weightN > 0) {
    reused.weightN = designSession.weightN;
  }
  if (designSession.missionType && designSession.missionType !== 'None') {
    reused.missionType = designSession.missionType;
  }

  // Tool-specific fields
  if (tool === 'thrust' || tool === 'ThrustLoadingCalculator') {
    if (typeof designSession.wingLoadingKgm2 === 'number' && Number.isFinite(designSession.wingLoadingKgm2) && designSession.wingLoadingKgm2 > 0) {
      reused.wingLoadingKgm2 = designSession.wingLoadingKgm2;
    }
    if (typeof designSession.wingAreaM2 === 'number' && Number.isFinite(designSession.wingAreaM2) && designSession.wingAreaM2 > 0) {
      reused.wingAreaM2 = designSession.wingAreaM2;
    }
    if (typeof designSession.stallSpeedMs === 'number' && Number.isFinite(designSession.stallSpeedMs) && designSession.stallSpeedMs > 0) {
      reused.stallSpeedMs = designSession.stallSpeedMs;
    }
    if (typeof designSession.stallSpeedKts === 'number' && Number.isFinite(designSession.stallSpeedKts) && designSession.stallSpeedKts > 0) {
      reused.stallSpeedKts = designSession.stallSpeedKts;
    }
    if (typeof designSession.clMaxUsed === 'number' && Number.isFinite(designSession.clMaxUsed) && designSession.clMaxUsed > 0) {
      reused.clMaxUsed = designSession.clMaxUsed;
    }
    if (typeof designSession.densityKgM3 === 'number' && Number.isFinite(designSession.densityKgM3) && designSession.densityKgM3 > 0) {
      reused.densityKgM3 = designSession.densityKgM3;
    }
    if (typeof designSession.ldClimb === 'number' && Number.isFinite(designSession.ldClimb) && designSession.ldClimb > 0) {
      reused.ldClimb = designSession.ldClimb;
    }
    if (typeof designSession.clClimb === 'number' && Number.isFinite(designSession.clClimb)) {
      reused.clClimb = designSession.clClimb;
    }
    if (typeof designSession.alphaClimbDeg === 'number' && Number.isFinite(designSession.alphaClimbDeg)) {
      reused.alphaClimbDeg = designSession.alphaClimbDeg;
    }
  }

  if (tool === 'wing' || tool === 'WingLoadingCalculator') {
    // Wing calculator can reuse mass/weight/mission from other sources
    // Already included in common fields above
  }

  if (tool === 'reynolds' || tool === 'ReynoldsNumberCalculator') {
    if (typeof designSession.densityKgM3 === 'number' && Number.isFinite(designSession.densityKgM3) && designSession.densityKgM3 > 0) {
      reused.densityKgM3 = designSession.densityKgM3;
    }
  }

  if (tool === 'liftdrag' || tool === 'LiftDragAnalyzer') {
    if (typeof designSession.clMaxUsed === 'number' && Number.isFinite(designSession.clMaxUsed) && designSession.clMaxUsed > 0) {
      reused.clMaxUsed = designSession.clMaxUsed;
    }
  }

  return reused;
}

/**
 * Get data sources (for multi-source scenarios)
 */
export function getDataSources(designSession: DesignSessionData | undefined | null): DataSource[] {
  if (!designSession) {
    return [];
  }

  const sources: DataSource[] = [];
  const hasWingLoadingData = 
    (typeof designSession.wingLoadingKgm2 === 'number' && Number.isFinite(designSession.wingLoadingKgm2)) ||
    (typeof designSession.wingAreaM2 === 'number' && Number.isFinite(designSession.wingAreaM2)) ||
    (typeof designSession.stallSpeedMs === 'number' && Number.isFinite(designSession.stallSpeedMs));

  if (hasWingLoadingData) {
    sources.push({
      name: 'Wing Loading',
      icon: 'Wind',
      data: getReusableDataForCalculator(designSession, 'wing'),
    });
  }

  const hasLiftDragData = 
    (typeof designSession.ldClimb === 'number' && Number.isFinite(designSession.ldClimb)) ||
    (typeof designSession.clClimb === 'number' && Number.isFinite(designSession.clClimb));

  if (hasLiftDragData) {
    sources.push({
      name: 'Lift/Drag Analyzer',
      icon: 'TrendingUp',
      data: getReusableDataForCalculator(designSession, 'liftdrag'),
    });
  }

  return sources;
}

/**
 * State setters interface for applying reusable data
 */
export interface StateSetters {
  setMassKg?: (value: string | number) => void;
  setWeightN?: (value: string | number) => void;
  setWingAreaM2?: (value: string | number) => void;
  setWingLoadingKgm2?: (value: string | number) => void;
  setStallSpeedMs?: (value: string | number) => void;
  setStallSpeedKts?: (value: string | number) => void;
  setClMaxUsed?: (value: string | number) => void;
  setDensityKgM3?: (value: string | number) => void;
  setMissionType?: (value: MissionType) => void;
  setLdClimb?: (value: string | number) => void;
  setClClimb?: (value: string | number) => void;
  setAlphaClimbDeg?: (value: string | number) => void;
  setUsedFromSession?: (value: boolean) => void;
  [key: string]: ((value: any) => void) | undefined;
}

/**
 * Apply reusable data to calculator state setters
 */
export function applyReusableDataToState(
  reused: ReusableData,
  setters: StateSetters,
  options?: {
    weightMode?: 'mass' | 'weight';
    unitSystem?: 'SI' | 'Imperial';
    onApplied?: (keys: string[]) => void;
  }
): string[] {
  const appliedKeys: string[] = [];

  // Apply mass/weight based on weight mode preference
  if (options?.weightMode === 'mass' && reused.massKg !== undefined && setters.setMassKg) {
    setters.setMassKg(reused.massKg.toString());
    appliedKeys.push('massKg');
  } else if (options?.weightMode === 'weight' && reused.weightN !== undefined && setters.setWeightN) {
    setters.setWeightN(reused.weightN.toString());
    appliedKeys.push('weightN');
  } else {
    // Fallback: apply whichever is available
    if (reused.massKg !== undefined && setters.setMassKg) {
      setters.setMassKg(reused.massKg.toString());
      appliedKeys.push('massKg');
    }
    if (reused.weightN !== undefined && setters.setWeightN) {
      setters.setWeightN(reused.weightN.toString());
      appliedKeys.push('weightN');
    }
  }

  // Apply other fields
  if (reused.wingAreaM2 !== undefined && setters.setWingAreaM2) {
    setters.setWingAreaM2(reused.wingAreaM2.toString());
    appliedKeys.push('wingAreaM2');
  }
  if (reused.wingLoadingKgm2 !== undefined && setters.setWingLoadingKgm2) {
    setters.setWingLoadingKgm2(reused.wingLoadingKgm2.toString());
    appliedKeys.push('wingLoadingKgm2');
  }
  if (reused.stallSpeedMs !== undefined && setters.setStallSpeedMs) {
    setters.setStallSpeedMs(reused.stallSpeedMs.toString());
    appliedKeys.push('stallSpeedMs');
  }
  if (reused.stallSpeedKts !== undefined && setters.setStallSpeedKts) {
    setters.setStallSpeedKts(reused.stallSpeedKts.toString());
    appliedKeys.push('stallSpeedKts');
  }
  if (reused.clMaxUsed !== undefined && setters.setClMaxUsed) {
    setters.setClMaxUsed(reused.clMaxUsed.toString());
    appliedKeys.push('clMaxUsed');
  }
  if (reused.densityKgM3 !== undefined && setters.setDensityKgM3) {
    setters.setDensityKgM3(reused.densityKgM3.toString());
    appliedKeys.push('densityKgM3');
  }
  if (reused.missionType !== undefined && setters.setMissionType) {
    setters.setMissionType(reused.missionType);
    appliedKeys.push('missionType');
  }
  if (reused.ldClimb !== undefined && setters.setLdClimb) {
    setters.setLdClimb(reused.ldClimb.toString());
    appliedKeys.push('ldClimb');
  }
  if (reused.clClimb !== undefined && setters.setClClimb) {
    setters.setClClimb(reused.clClimb.toString());
    appliedKeys.push('clClimb');
  }
  if (reused.alphaClimbDeg !== undefined && setters.setAlphaClimbDeg) {
    setters.setAlphaClimbDeg(reused.alphaClimbDeg.toString());
    appliedKeys.push('alphaClimbDeg');
  }

  // Mark as imported
  if (setters.setUsedFromSession) {
    setters.setUsedFromSession(true);
  }

  // Callback
  if (options?.onApplied) {
    options.onApplied(appliedKeys);
  }

  return appliedKeys;
}

/**
 * Generate a summary string for reusable data
 */
export function getReusableDataSummary(reused: ReusableData): string {
  const parts: string[] = [];
  
  if (reused.massKg !== undefined) {
    parts.push(`Mass: ${reused.massKg.toFixed(1)} kg`);
  } else if (reused.weightN !== undefined) {
    parts.push(`Weight: ${reused.weightN.toFixed(0)} N`);
  }
  
  if (reused.missionType && reused.missionType !== 'None') {
    parts.push(`Mission: ${reused.missionType}`);
  }
  
  if (reused.wingLoadingKgm2 !== undefined) {
    parts.push(`W/S: ${reused.wingLoadingKgm2.toFixed(1)} kg/m²`);
  }
  
  if (reused.ldClimb !== undefined) {
    parts.push(`L/D: ${reused.ldClimb.toFixed(1)}`);
  }
  
  return parts.join(' • ') || 'Design data available';
}

/**
 * Check if reusable data exists
 */
export function hasReusableData(reused: ReusableData): boolean {
  return Object.keys(reused).length > 0;
}

/**
 * Field label mappings
 */
const FIELD_LABELS: Record<string, string> = {
  massKg: 'Mass',
  weightN: 'Weight',
  wingAreaM2: 'Wing Area',
  wingLoadingKgm2: 'W/S',
  stallSpeedMs: 'Stall Speed',
  stallSpeedKts: 'Stall Speed',
  clMaxUsed: 'CL Max',
  densityKgM3: 'Density',
  missionType: 'Mission',
  ldClimb: 'L/D Climb',
  clClimb: 'CL Climb',
  alphaClimbDeg: 'Alpha Climb',
};

/**
 * Source definitions with field mappings
 */
const SOURCE_DEFINITIONS: Record<string, Omit<SourceInfo, 'fields'>> = {
  wing: {
    name: 'Wing Loading',
    id: 'wing',
    color: '#06b6d4', // cyan
    path: '/tools/launch?tool=wing',
    confidence: 10,
  },
  liftdrag: {
    name: 'L/D Analyzer',
    id: 'liftdrag',
    color: '#10b981', // emerald
    path: '/tools/launch?tool=liftdrag',
    confidence: 8,
  },
  atmosphere: {
    name: 'Atmosphere',
    id: 'atmosphere',
    color: '#8b5cf6', // violet
    path: '/tools/launch?tool=atmosphere',
    confidence: 5,
  },
};

/**
 * Field to source mapping (which sources can provide which fields)
 */
const FIELD_SOURCE_MAP: Record<string, string[]> = {
  massKg: ['wing', 'liftdrag'],
  weightN: ['wing', 'liftdrag'],
  wingAreaM2: ['wing'],
  wingLoadingKgm2: ['wing'],
  stallSpeedMs: ['wing'],
  stallSpeedKts: ['wing'],
  clMaxUsed: ['wing', 'liftdrag'],
  densityKgM3: ['wing', 'atmosphere'],
  missionType: ['wing', 'liftdrag'],
  ldClimb: ['liftdrag'],
  clClimb: ['liftdrag'],
  alphaClimbDeg: ['liftdrag'],
};

/**
 * Precedence order for resolving conflicts (higher index = higher priority)
 */
const SOURCE_PRECEDENCE: string[] = ['wing', 'liftdrag', 'atmosphere'];

/**
 * Find all sources that can provide at least one of the target fields
 */
export function findSourceList(
  designSession: DesignSessionData | undefined | null,
  targetFields: string[]
): SourceInfo[] {
  if (!designSession) {
    return [];
  }

  const sourcesMap = new Map<string, SourceInfo>();

  // Check each target field
  for (const fieldKey of targetFields) {
    const sourceIds = FIELD_SOURCE_MAP[fieldKey] || [];
    
    for (const sourceId of sourceIds) {
      // Check if this source actually has the field in designSession
      const hasField = checkFieldInSession(designSession, fieldKey, sourceId);
      
      if (hasField) {
        if (!sourcesMap.has(sourceId)) {
          const sourceDef = SOURCE_DEFINITIONS[sourceId];
          if (sourceDef) {
            sourcesMap.set(sourceId, {
              ...sourceDef,
              fields: [],
            });
          }
        }
        
        const source = sourcesMap.get(sourceId)!;
        if (!source.fields.some(f => f.key === fieldKey)) {
          source.fields.push({
            key: fieldKey,
            label: FIELD_LABELS[fieldKey] || fieldKey,
          });
        }
      }
    }
  }

  // Convert to array and sort by confidence (precedence)
  const sources = Array.from(sourcesMap.values());
  sources.sort((a, b) => {
    const aPrec = SOURCE_PRECEDENCE.indexOf(a.id);
    const bPrec = SOURCE_PRECEDENCE.indexOf(b.id);
    if (aPrec !== bPrec) {
      return bPrec - aPrec; // Higher precedence first
    }
    return (b.confidence || 0) - (a.confidence || 0);
  });

  return sources;
}

/**
 * Check if a field exists in designSession for a given source
 */
function checkFieldInSession(
  designSession: DesignSessionData,
  fieldKey: string,
  sourceId: string
): boolean {
  const value = (designSession as any)[fieldKey];
  
  if (value === undefined || value === null) {
    return false;
  }

  // Type-specific checks
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value === 'string') {
    return value !== '' && value !== 'None';
  }

  return true;
}

/**
 * Get reusable data with source tracking (returns which source provides each field)
 */
export function getReusableDataWithSources(
  designSession: DesignSessionData | undefined | null,
  targetFields: string[]
): { data: ReusableData; sources: Record<string, string> } {
  if (!designSession) {
    return { data: {}, sources: {} };
  }

  const data: ReusableData = {};
  const sources: Record<string, string> = {};

  // Resolve fields with precedence
  for (const fieldKey of targetFields) {
    const sourceIds = FIELD_SOURCE_MAP[fieldKey] || [];
    
    // Try sources in precedence order
    for (const sourceId of SOURCE_PRECEDENCE) {
      if (sourceIds.includes(sourceId)) {
        const hasField = checkFieldInSession(designSession, fieldKey, sourceId);
        if (hasField) {
          const value = (designSession as any)[fieldKey];
          (data as any)[fieldKey] = value;
          sources[fieldKey] = sourceId;
          break; // Use first available source (highest precedence)
        }
      }
    }
  }

  return { data, sources };
}

/**
 * Apply reusable data to setters with undo support
 * Returns applied keys and previous values for undo
 */
export function applyReusableDataToSetters(
  reusable: ReusableData,
  setters: StateSetters,
  getCurrentValues?: () => Record<string, any>
): { appliedKeys: string[]; previousValues: Record<string, any> } {
  const appliedKeys: string[] = [];
  const previousValues: Record<string, any> = {};
  const currentValues = getCurrentValues ? getCurrentValues() : {};

  // Helper to get current value
  const getCurrent = (key: string) => {
    return currentValues[key] ?? '';
  };

  // Apply mass/weight
  if (reusable.massKg !== undefined && setters.setMassKg) {
    previousValues.massKg = getCurrent('massKg');
    setters.setMassKg(reusable.massKg.toString());
    appliedKeys.push('massKg');
  }
  if (reusable.weightN !== undefined && setters.setWeightN) {
    previousValues.weightN = getCurrent('weightN');
    setters.setWeightN(reusable.weightN.toString());
    appliedKeys.push('weightN');
  }

  // Apply other fields
  const fieldMappings: Array<{ key: keyof ReusableData; setter?: (value: string | number) => void }> = [
    { key: 'wingAreaM2', setter: setters.setWingAreaM2 },
    { key: 'wingLoadingKgm2', setter: setters.setWingLoadingKgm2 },
    { key: 'stallSpeedMs', setter: setters.setStallSpeedMs },
    { key: 'stallSpeedKts', setter: setters.setStallSpeedKts },
    { key: 'clMaxUsed', setter: setters.setClMaxUsed },
    { key: 'densityKgM3', setter: setters.setDensityKgM3 },
    { key: 'ldClimb', setter: setters.setLdClimb },
    { key: 'clClimb', setter: setters.setClClimb },
    { key: 'alphaClimbDeg', setter: setters.setAlphaClimbDeg },
  ];

  for (const { key, setter } of fieldMappings) {
    const value = reusable[key];
    if (value !== undefined && setter) {
      previousValues[key] = getCurrent(key as string);
      if (typeof value === 'number') {
        setter(value.toString());
      } else {
        setter(value);
      }
      appliedKeys.push(key as string);
    }
  }

  // Apply mission type
  if (reusable.missionType !== undefined && setters.setMissionType) {
    previousValues.missionType = getCurrent('missionType');
    setters.setMissionType(reusable.missionType);
    appliedKeys.push('missionType');
  }

  // Mark as imported
  if (setters.setUsedFromSession) {
    setters.setUsedFromSession(true);
  }

  return { appliedKeys, previousValues };
}

