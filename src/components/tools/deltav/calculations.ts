/**
 * Delta-V Budget Planner - Physics Calculations
 * All calculations use SI units (m, kg, m/s, s)
 */

// Constants
export const G0 = 9.80665; // m/s²
export const R_EARTH = 6371000; // m
export const MU_EARTH = 3.986004418e14; // m³/s²

import { Stage, MissionParameters, DeltaVBreakdown, StageResult } from "./types";

/**
 * Tsiolkovsky Rocket Equation
 * Δv = Isp × g₀ × ln(m₀ / m_f)
 */
export const calculateDeltaV = (
  isp: number,
  initialMass: number,
  finalMass: number
): number => {
  if (finalMass <= 0 || initialMass <= finalMass) {
    return 0;
  }
  return isp * G0 * Math.log(initialMass / finalMass);
};

/**
 * Calculate propellant mass required for given Δv
 * m_prop = m₀ × (1 − exp(−Δv / (Isp × g₀)))
 */
export const calculatePropellantMass = (
  deltaV: number,
  isp: number,
  initialMass: number
): number => {
  if (isp <= 0 || deltaV <= 0) {
    return 0;
  }
  const expTerm = Math.exp(-deltaV / (isp * G0));
  return initialMass * (1 - expTerm);
};

/**
 * Calculate circular orbital velocity
 * v = sqrt(μ / r)
 */
export const calculateOrbitalVelocity = (altitude: number): number => {
  const r = R_EARTH + altitude * 1000; // Convert km to m
  return Math.sqrt(MU_EARTH / r);
};

/**
 * Calculate orbital Δv (circularization)
 * Approximately equal to orbital velocity
 */
export const calculateOrbitalDeltaV = (altitude: number): number => {
  return calculateOrbitalVelocity(altitude);
};

/**
 * Calculate Hohmann transfer Δv
 * Δv₁ = v₁ × ( sqrt(2 r₂/(r₁+r₂)) − 1 )
 * Δv₂ = v₂ × (1 − sqrt(2 r₁/(r₁+r₂)))
 */
export const calculateHohmannTransfer = (
  initialAltitude: number,
  finalAltitude: number
): { deltaV1: number; deltaV2: number; total: number } => {
  const r1 = R_EARTH + initialAltitude * 1000;
  const r2 = R_EARTH + finalAltitude * 1000;
  
  const v1 = calculateOrbitalVelocity(initialAltitude);
  const v2 = calculateOrbitalVelocity(finalAltitude);
  
  const sqrtTerm1 = Math.sqrt((2 * r2) / (r1 + r2));
  const sqrtTerm2 = Math.sqrt((2 * r1) / (r1 + r2));
  
  const deltaV1 = v1 * (sqrtTerm1 - 1);
  const deltaV2 = v2 * (1 - sqrtTerm2);
  
  return {
    deltaV1: Math.abs(deltaV1),
    deltaV2: Math.abs(deltaV2),
    total: Math.abs(deltaV1) + Math.abs(deltaV2),
  };
};

/**
 * Calculate plane change Δv
 * Δv_plane = 2 × v × sin(Δi / 2)
 */
export const calculatePlaneChangeDeltaV = (
  velocity: number,
  deltaInclination: number
): number => {
  const deltaRad = (deltaInclination * Math.PI) / 180;
  return 2 * velocity * Math.sin(deltaRad / 2);
};

/**
 * Calculate escape Δv (from circular orbit)
 * Δv_escape ≈ v_circ × (sqrt(2) − 1)
 */
export const calculateEscapeDeltaV = (altitude: number): number => {
  const vCirc = calculateOrbitalVelocity(altitude);
  return vCirc * (Math.sqrt(2) - 1);
};

/**
 * Calculate total Δv breakdown for mission
 */
export const calculateDeltaVBreakdown = (
  mission: MissionParameters,
  totalAchievable: number
): DeltaVBreakdown => {
  let orbitalDeltaV = 0;
  let hohmannDeltaV = 0;
  let planeChangeDeltaV = 0;

  // Orbital Δv based on orbit type
  switch (mission.orbitType) {
    case "LEO":
    case "GTO":
    case "GEO":
      orbitalDeltaV = calculateOrbitalDeltaV(mission.targetOrbitAltitude);
      break;
    case "Escape":
      orbitalDeltaV = calculateEscapeDeltaV(mission.targetOrbitAltitude);
      break;
    case "Custom":
      orbitalDeltaV = calculateOrbitalDeltaV(mission.targetOrbitAltitude);
      break;
  }

  // Hohmann transfer
  if (mission.hohmannTransfer) {
    const hohmann = calculateHohmannTransfer(
      mission.hohmannTransfer.initialAltitude,
      mission.hohmannTransfer.finalAltitude
    );
    hohmannDeltaV = hohmann.total;
  }

  // Plane change
  if (mission.planeChange) {
    const velocity = calculateOrbitalVelocity(mission.targetOrbitAltitude);
    planeChangeDeltaV = calculatePlaneChangeDeltaV(
      velocity,
      mission.planeChange.deltaInclination
    );
  }

  const totalRequired =
    orbitalDeltaV +
    hohmannDeltaV +
    planeChangeDeltaV +
    mission.gravityLoss +
    mission.dragLoss +
    mission.steeringLoss;

  const totalWithMargin = totalRequired * (1 + mission.reserveMargin / 100);

  return {
    orbitalDeltaV,
    hohmannDeltaV,
    planeChangeDeltaV,
    gravityLoss: mission.gravityLoss,
    dragLoss: mission.dragLoss,
    steeringLoss: mission.steeringLoss,
    totalRequired,
    totalWithMargin,
    totalAchievable,
    isFeasible: totalAchievable >= totalWithMargin,
  };
};

/**
 * Calculate stage results (bottom-up mass propagation)
 */
export const calculateStageResults = (
  stages: Stage[],
  payloadMass: number,
  requiredDeltaV: number
): StageResult[] => {
  const results: StageResult[] = [];
  let cumulativePayload = payloadMass;

  // Process stages from top to bottom
  for (let i = stages.length - 1; i >= 0; i--) {
    const stage = stages[i];
    const effectiveIsp = stage.useVacuumIsp ? stage.ispVacuum : stage.ispSeaLevel;

    // Calculate dry mass
    let dryMass = stage.dryMass || 0;
    if (!dryMass && stage.structuralMassFraction && stage.propellantMass) {
      // Use structural mass fraction
      const totalMass = stage.propellantMass / (1 - stage.structuralMassFraction);
      dryMass = totalMass - stage.propellantMass;
    }

    // Calculate propellant mass
    let propellantMass = stage.propellantMass || 0;
    if (!propellantMass && stage.desiredDeltaV) {
      // Calculate propellant needed for desired Δv
      const initialMass = cumulativePayload + (dryMass || 0) + (stage.interstageMass || 0);
      propellantMass = calculatePropellantMass(stage.desiredDeltaV, effectiveIsp, initialMass);
    }

    // Calculate masses
    const interstageMass = stage.interstageMass || 0;
    const initialMass = cumulativePayload + dryMass + propellantMass + interstageMass;
    const finalMass = cumulativePayload + dryMass + interstageMass;

    // Calculate achievable Δv
    const achievableDeltaV = calculateDeltaV(effectiveIsp, initialMass, finalMass);

    // Distribute required Δv (proportional to stage capability or equal split)
    const stageRequiredDeltaV = requiredDeltaV / stages.length; // Simple equal split

    const massRatio = initialMass / finalMass;

    results.unshift({
      stage,
      initialMass,
      finalMass,
      propellantMass,
      dryMass,
      effectiveIsp,
      achievableDeltaV,
      requiredDeltaV: stageRequiredDeltaV,
      isFeasible: achievableDeltaV >= stageRequiredDeltaV,
      massRatio,
    });

    // Update cumulative payload for next stage
    cumulativePayload = initialMass;
  }

  return results;
};

/**
 * Calculate total achievable Δv from all stages
 */
export const calculateTotalAchievableDeltaV = (stageResults: StageResult[]): number => {
  return stageResults.reduce((sum, result) => sum + result.achievableDeltaV, 0);
};

/**
 * Generate warnings and recommendations
 */
export const generateWarningsAndRecommendations = (
  breakdown: DeltaVBreakdown,
  stageResults: StageResult[],
  payloadMass: number
): { warnings: string[]; recommendations: string[] } => {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Feasibility check
  if (!breakdown.isFeasible) {
    const deficit = breakdown.totalWithMargin - breakdown.totalAchievable;
    warnings.push(
      `Insufficient Δv: ${deficit.toFixed(1)} m/s deficit`
    );
    recommendations.push(
      `Increase total propellant mass by approximately ${(deficit / 1000).toFixed(2)} km/s equivalent`
    );
    recommendations.push("Consider adding an upper stage");
    recommendations.push("Use higher Isp engines for upper stages");
    recommendations.push(`Reduce payload mass (currently ${payloadMass.toFixed(1)} kg)`);
  }

  // Mass ratio checks
  stageResults.forEach((result, index) => {
    if (result.massRatio > 20) {
      warnings.push(
        `Stage ${index + 1} has very high mass ratio (${result.massRatio.toFixed(2)}). Structural fraction may be unrealistic.`
      );
    }
    if (result.stage.structuralMassFraction) {
      if (result.stage.structuralMassFraction < 0.02) {
        warnings.push(
          `Stage ${index + 1} structural fraction (${(result.stage.structuralMassFraction * 100).toFixed(1)}%) is very low`
        );
      }
      if (result.stage.structuralMassFraction > 0.3) {
        warnings.push(
          `Stage ${index + 1} structural fraction (${(result.stage.structuralMassFraction * 100).toFixed(1)}%) is very high`
        );
      }
    }
  });

  // Isp checks
  stageResults.forEach((result, index) => {
    if (result.effectiveIsp < 200) {
      warnings.push(`Stage ${index + 1} Isp (${result.effectiveIsp.toFixed(1)} s) is very low`);
    }
    if (result.effectiveIsp > 500) {
      warnings.push(`Stage ${index + 1} Isp (${result.effectiveIsp.toFixed(1)} s) is very high`);
    }
  });

  // Margin recommendations
  if (breakdown.isFeasible && breakdown.totalAchievable < breakdown.totalWithMargin * 1.1) {
    recommendations.push("Consider increasing reserve margin for safety");
  }

  return { warnings, recommendations };
};

/**
 * Test function for Tsiolkovsky equation
 * Known test: Isp=300s, m0=1000kg, mf=500kg → Δv ≈ 2039 m/s
 */
export const testTsiolkovsky = (): boolean => {
  const isp = 300;
  const m0 = 1000;
  const mf = 500;
  const expected = isp * G0 * Math.log(m0 / mf);
  const calculated = calculateDeltaV(isp, m0, mf);
  const error = Math.abs(calculated - expected) / expected;
  return error < 0.001; // Less than 0.1% error
};

