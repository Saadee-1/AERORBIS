import { buildAeroversePayload } from "@/ai/buildPayload";
import type { AeroverseAIPayload } from "@/ai/schema/AeroversePayload";
import type {
  MissionParameters,
  Stage,
  StageResult,
  DeltaVBreakdown,
} from "./types";

export type DeltaVUnitSystem = "SI" | "Imperial" | "Custom";

interface BuildDeltaVPayloadParams {
  mission: MissionParameters;
  stages: Stage[];
  stageResults: StageResult[];
  breakdown: DeltaVBreakdown;
  totalLiftoffMass: number;
  warnings: string[];
  recommendations: string[];
  unitSystem: DeltaVUnitSystem;
  customUnitName: string;
  customFactor: string;
  requestId?: string;
}

export function buildDeltaVPayload({
  mission,
  stages,
  stageResults,
  breakdown,
  totalLiftoffMass,
  warnings,
  recommendations,
  unitSystem,
  customUnitName,
  customFactor,
  requestId,
}: BuildDeltaVPayloadParams): AeroverseAIPayload {
  const missionInputs = {
    orbitType: mission.orbitType,
    targetOrbitAltitude_km: mission.targetOrbitAltitude,
    targetInclination_deg: mission.targetInclination,
    payloadMass_kg: mission.payloadMass,
    gravityLoss_mps: mission.gravityLoss,
    dragLoss_mps: mission.dragLoss,
    steeringLoss_mps: mission.steeringLoss,
    reserveMargin_percent: mission.reserveMargin,
    hohmannTransfer: mission.hohmannTransfer ?? null,
    planeChange: mission.planeChange ?? null,
    rendezvous: Boolean(mission.rendezvous),
    oberthBurn: Boolean(mission.oberthBurn),
  };

  const stageInputs = stages.map((stage, index) => ({
    stageNumber: index + 1,
    name: stage.name || `Stage ${index + 1}`,
    dryMass_kg: stage.dryMass ?? null,
    propellantMass_kg: stage.propellantMass ?? null,
    structuralMassFraction: stage.structuralMassFraction ?? null,
    desiredDeltaV_mps: stage.desiredDeltaV ?? null,
    ispSeaLevel_s: stage.ispSeaLevel,
    ispVacuum_s: stage.ispVacuum,
    useVacuumIsp: stage.useVacuumIsp,
    interstageMass_kg: stage.interstageMass ?? 0,
    thrust_N: stage.thrust ?? null,
    numberOfEngines: stage.numberOfEngines ?? null,
  }));

  const stageResultsSummary = stageResults.map((result, index) => ({
    stageNumber: index + 1,
    name: result.stage.name || `Stage ${index + 1}`,
    achievableDeltaV_mps: result.achievableDeltaV,
    requiredDeltaV_mps: result.requiredDeltaV,
    effectiveIsp_s: result.effectiveIsp,
    initialMass_kg: result.initialMass,
    finalMass_kg: result.finalMass,
    propellantMass_kg: result.propellantMass,
    dryMass_kg: result.dryMass,
    massRatio: result.massRatio,
    feasible: result.isFeasible,
  }));

  const steps = [
    `Mission: ${mission.orbitType} to ${mission.targetOrbitAltitude} km`,
    `Target inclination: ${mission.targetInclination}°`,
    `Payload mass: ${mission.payloadMass} kg`,
    `Total stages: ${stages.length}`,
    `Orbital Δv: ${breakdown.orbitalDeltaV.toFixed(1)} m/s`,
    `Hohmann Δv: ${breakdown.hohmannDeltaV.toFixed(1)} m/s`,
    `Plane change Δv: ${breakdown.planeChangeDeltaV.toFixed(1)} m/s`,
    `Losses (gravity/drag/steering): ${(mission.gravityLoss + mission.dragLoss + mission.steeringLoss).toFixed(1)} m/s`,
    `Reserve margin: ${mission.reserveMargin}%`,
    `Total required Δv: ${breakdown.totalRequired.toFixed(1)} m/s`,
    `Δv with margin: ${breakdown.totalWithMargin.toFixed(1)} m/s`,
    `Total achievable Δv: ${breakdown.totalAchievable.toFixed(1)} m/s`,
    `Total liftoff mass: ${totalLiftoffMass.toFixed(1)} kg`,
    ...stageResultsSummary.map(
      (stage) =>
        `Stage ${stage.stageNumber} (${stage.name}): Δv=${stage.achievableDeltaV_mps.toFixed(
          1
        )} m/s, m₀=${stage.initialMass_kg.toFixed(1)} kg, m_f=${stage.finalMass_kg.toFixed(
          1
        )} kg`
    ),
  ];

  const units = {
    targetOrbitAltitude_km: "km",
    targetInclination_deg: "deg",
    payloadMass_kg: "kg",
    gravityLoss_mps: "m/s",
    dragLoss_mps: "m/s",
    steeringLoss_mps: "m/s",
    reserveMargin_percent: "%",
    achievableDeltaV_mps: "m/s",
    totalRequiredDeltaV_mps: "m/s",
    totalDeltaVWithMargin_mps: "m/s",
    totalAchievableDeltaV_mps: "m/s",
    totalLiftoffMass_kg: "kg",
  };

  const configuration = {
    unitSystem,
    customUnitName: unitSystem === "Custom" ? customUnitName : undefined,
    customFactor: unitSystem === "Custom" ? customFactor : undefined,
    stageCount: stages.length,
    orbitType: mission.orbitType,
  };

  return buildAeroversePayload({
    requestId,
    toolName: "Delta-V Budget Planner",
    inputs: {
      mission: missionInputs,
      stages: stageInputs,
    },
    results: {
      feasibility: breakdown.isFeasible ? "Feasible" : "Not Feasible",
      totalRequiredDeltaV_mps: breakdown.totalRequired,
      totalDeltaVWithMargin_mps: breakdown.totalWithMargin,
      totalAchievableDeltaV_mps: breakdown.totalAchievable,
      totalLiftoffMass_kg: totalLiftoffMass,
      payloadMass_kg: mission.payloadMass,
      warnings,
      recommendations,
      stageResults: stageResultsSummary,
    },
    units,
    charts: [
      {
        id: "deltav-chart",
        title: "Delta-V Budget Chart",
        dataSummary: "Required vs achievable Δv comparison",
      },
      {
        id: "mass-breakdown-chart",
        title: "Mass Breakdown Chart",
        dataSummary: "Stage mass distribution",
      },
    ],
    configuration,
    metadata: {
      steps,
      unitsSystem: unitSystem,
      approxLevel: "orbital-budget",
      confidence:
        warnings.length === 0
          ? "high"
          : warnings.length < 3
            ? "medium"
            : "low",
      warnings,
    },
  });
}

