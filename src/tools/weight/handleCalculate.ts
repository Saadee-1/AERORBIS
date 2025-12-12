import type { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { buildWeightEstimatorPayload } from './utils/payloadBuilder';
import { WeightEstimationInputs, calculateComponentWeights, updateFuelSystemWeight } from './utils/weightEngine';
import { MissionProfile, calculateMissionFuelFraction, calculateFuelWeight, iterateTakeoffWeight } from './utils/iteration';
import { classifyAircraft } from './utils/classification';
import { ComponentLocation, calculateCG, calculateMAC, calculateCGonMAC, calculateMomentOfInertia } from './utils/cg';
import { validateWeightEstimationInputs } from './validation/schema';
import { createDefaultWeightInputs, createDefaultMissionProfile } from './defaults';

// TODO: refine type for `ToolContextUpdater` — changed any -> unknown automatically by chore/typed-cleanup
type ToolContextUpdater = (ctx: { tool: string; inputs: Record<string, unknown>; results: Record<string, unknown> }) => void;

export interface WeightHandleOptions {
  inputs?: WeightEstimationInputs;
  missionProfile?: MissionProfile;
  componentLocations?: ComponentLocation[];
  updateToolContext?: ToolContextUpdater;
}

interface WeightComputationResult {
  payload: AeroverseAIPayload;
}

const computeWeightEstimation = (config: Required<Omit<WeightHandleOptions, 'updateToolContext'>>): WeightComputationResult => {
  const validation = validateWeightEstimationInputs(config.inputs);
  if (!validation.valid) {
    throw new Error(validation.errors[0] || 'Invalid weight estimation inputs');
  }

  const fuelFraction = calculateMissionFuelFraction(config.missionProfile);
  const iteration = iterateTakeoffWeight(
    (W_to_guess) => {
      const testInputs = { ...config.inputs, W_to: W_to_guess };
      const testComponents = calculateComponentWeights(testInputs);
      return testComponents.empty;
    },
    config.inputs.W_payload,
    fuelFraction,
    config.inputs.W_to
  );

  const finalInputs = { ...config.inputs, W_to: iteration.W_to };
  let components = calculateComponentWeights(finalInputs);
  const W_fuel = calculateFuelWeight(iteration.W_to, fuelFraction);
  components = updateFuelSystemWeight(components, W_fuel);

  const classification = classifyAircraft({
    MTOW: iteration.W_to,
    wingspan: finalInputs.geometry.b,
    wingArea: finalInputs.geometry.S_w,
    propulsionType: finalInputs.propulsion.type,
    power: finalInputs.propulsion.power,
    n_engines: finalInputs.propulsion.n_engines,
    aspectRatio: finalInputs.geometry.AR,
    isPressurized: finalInputs.systems.fixedEquipment.isPressurized,
  });

  let cg: ReturnType<typeof calculateMAC> & { x_cg: number; x_cg_MAC: number } | undefined;
  if (config.componentLocations.length > 0) {
    const macResult = calculateMAC(
      finalInputs.geometry.S_w,
      finalInputs.geometry.b,
      finalInputs.geometry.lambda,
      finalInputs.geometry.L_fuse * 0.4
    );
    const W_total = iteration.W_to;
    const x_cg = calculateCG(config.componentLocations, W_total);
    const x_cg_MAC = calculateCGonMAC(x_cg, macResult.x_MAC, macResult.MAC);
    cg = { ...macResult, x_cg, x_cg_MAC };
  }

  let inertia;
  if (config.componentLocations.length > 0 && cg) {
    inertia = calculateMomentOfInertia(
      {
        components: config.componentLocations,
        geometry: {
          S_w: finalInputs.geometry.S_w,
          b: finalInputs.geometry.b,
          L_fuse: finalInputs.geometry.L_fuse,
          S_fuse: finalInputs.geometry.S_fuse,
        },
      },
      cg.x_cg
    );
  }

  const payload = buildWeightEstimatorPayload({
    inputs: finalInputs,
    components,
    W_empty: components.empty,
    W_fuel,
    W_to: iteration.W_to,
    iteration,
    classification,
    cg: cg
      ? {
          x_cg: cg.x_cg,
          x_cg_MAC: cg.x_cg_MAC,
          MAC: cg.MAC,
        }
      : undefined,
    inertia,
  });

  return { payload };
};

export async function handleCalculate(options: WeightHandleOptions = {}): Promise<AeroverseAIPayload> {
  const payload = computeWeightEstimation({
    inputs: options.inputs ?? createDefaultWeightInputs(),
    missionProfile: options.missionProfile ?? createDefaultMissionProfile(),
    componentLocations: options.componentLocations ?? [],
  }).payload;

  options.updateToolContext?.({
    tool: 'Structural Weight Estimator',
    inputs: payload.inputs,
    results: payload.results,
  });

  return payload;
}

