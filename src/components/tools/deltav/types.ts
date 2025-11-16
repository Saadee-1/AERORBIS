// Delta-V Budget Planner Types

export interface Stage {
  id: string;
  name: string;
  dryMass?: number; // kg
  structuralMassFraction?: number; // 0.08-0.12 typical
  propellantMass?: number; // kg
  desiredDeltaV?: number; // m/s (mutually exclusive with propellantMass)
  ispSeaLevel: number; // seconds
  ispVacuum: number; // seconds
  useVacuumIsp: boolean;
  numberOfEngines?: number;
  thrust?: number; // N (optional, for T/W check)
  interstageMass?: number; // kg
}

export interface MissionParameters {
  targetOrbitAltitude: number; // km
  orbitType: "LEO" | "GTO" | "GEO" | "Escape" | "Custom";
  targetInclination: number; // degrees
  payloadMass: number; // kg
  gravityLoss: number; // m/s
  dragLoss: number; // m/s
  steeringLoss: number; // m/s
  reserveMargin: number; // percentage (0-100)
  // In-space maneuvers
  hohmannTransfer?: {
    initialAltitude: number; // km
    finalAltitude: number; // km
  };
  planeChange?: {
    deltaInclination: number; // degrees
  };
  rendezvous?: boolean;
  oberthBurn?: boolean;
}

export interface StageResult {
  stage: Stage;
  initialMass: number; // kg
  finalMass: number; // kg
  propellantMass: number; // kg
  dryMass: number; // kg
  effectiveIsp: number; // seconds
  achievableDeltaV: number; // m/s
  requiredDeltaV: number; // m/s
  isFeasible: boolean;
  massRatio: number;
}

export interface DeltaVBreakdown {
  orbitalDeltaV: number; // m/s
  hohmannDeltaV: number; // m/s
  planeChangeDeltaV: number; // m/s
  gravityLoss: number; // m/s
  dragLoss: number; // m/s
  steeringLoss: number; // m/s
  totalRequired: number; // m/s
  totalWithMargin: number; // m/s
  totalAchievable: number; // m/s
  isFeasible: boolean;
}

export interface MissionResult {
  mission: MissionParameters;
  stages: StageResult[];
  breakdown: DeltaVBreakdown;
  totalLiftoffMass: number; // kg
  payloadMass: number; // kg
  warnings: string[];
  recommendations: string[];
}

export interface MissionPreset {
  name: string;
  description: string;
  mission: MissionParameters;
  stages: Omit<Stage, "id">[];
}

