/**
 * Interlink Utility for Calculator Data Sharing
 * 
 * Provides utilities to detect and apply reusable data from designSession
 * across interdependent calculators.
 */

import { DesignSessionData, MissionType } from "@/contexts/designSession";

export type CalculatorTool = 'thrust' | 'wing' | 'reynolds' | 'liftdrag' | 'atmosphere' | string;

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

