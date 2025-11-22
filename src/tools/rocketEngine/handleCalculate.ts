import type { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { RocketEngineInputs, calculateRocketEngine } from './utils/calcEngine';
import { validateRocketEngineInputs } from './validation/schema';
import { buildRocketEnginePayload } from './utils/payloadBuilder';

type ToolContextUpdater = (ctx: { tool: string; inputs: Record<string, any>; results: Record<string, any> }) => void;

export interface RocketEngineHandleOptions {
  inputs?: RocketEngineInputs;
  updateToolContext?: ToolContextUpdater;
}

const DEFAULT_INPUTS: RocketEngineInputs = {
  Pc: 9.7e6,
  Tc: 3500,
  At: 0.005,
  epsilon: 16,
  Pa: 101325,
  gamma: 1.22,
  M_molar: 22.0,
  nozzleEfficiency: 0.98,
  cStarEfficiency: 0.95,
  pressureLossFraction: 0.03,
};

export async function handleCalculate(options: RocketEngineHandleOptions = {}): Promise<AeroverseAIPayload> {
  const inputs = options.inputs ?? { ...DEFAULT_INPUTS };

  const validation = validateRocketEngineInputs(inputs);
  if (!validation.valid) {
    throw new Error(validation.errors[0] || 'Invalid rocket engine inputs');
  }

  const engineResults = calculateRocketEngine(inputs);
  const payload = buildRocketEnginePayload(inputs, engineResults);

  options.updateToolContext?.({
    tool: 'Rocket Engine Performance',
    inputs: payload.inputs,
    results: payload.results,
  });

  return payload;
}

