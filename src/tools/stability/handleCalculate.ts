import type { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { StabilityInputs, calculateStability } from './utils/calcStability';
import { buildStabilityPayload, ExtendedStabilityResults } from './utils/payloadBuilder';

type ToolContextUpdater = (ctx: { tool: string; inputs: Record<string, any>; results: Record<string, any> }) => void;

export interface StabilityHandleOptions {
  inputs?: StabilityInputs;
  updateToolContext?: ToolContextUpdater;
}

const DEFAULT_INPUTS: StabilityInputs = {
  S_w: 15.0,
  AR: 7.0,
  c_bar: 1.5,
  x_ac_w: 0.25,
  x_cg: 0.25,
  S_t: 3.0,
  AR_t: 4.5,
  l_t: 4.0,
  a0: 5.7,
  e: 0.8,
  e_t: 0.8,
  eta: 0.9,
  useRoskamDownwash: false,
  S_e: 0.6,
  tau_e: 0.6,
  S_a: 0.8,
  S_r: 0.5,
  S_v: 2.5,
};

export async function handleCalculate(options: StabilityHandleOptions = {}): Promise<AeroverseAIPayload> {
  const inputs = options.inputs ?? { ...DEFAULT_INPUTS };
  const stability = calculateStability(inputs);

  const results: ExtendedStabilityResults = {
    stability,
  };

  const payload = buildStabilityPayload(inputs, results);

  options.updateToolContext?.({
    tool: 'Stability & Control Derivatives',
    inputs: payload.inputs,
    results: payload.results,
  });

  return payload;
}

