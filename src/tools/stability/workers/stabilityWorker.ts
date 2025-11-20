/**
 * Web Worker for Stability Calculations
 * Offloads heavy stability derivative calculations to background thread
 */

import { calculateStability, StabilityInputs } from '../utils/calcStability';
import { calculateDynamicDerivatives, DynamicDerivativesInputs } from '../utils/calcDynamicDerivatives';
import { sweepCGPosition } from '../utils/calcStability';

export interface StabilityWorkerMessage {
  type: 'calculate' | 'sweepCG' | 'cancel';
  id: string;
  inputs?: StabilityInputs;
  dynamicInputs?: DynamicDerivativesInputs;
  cgRange?: { min: number; max: number; steps: number };
}

export interface StabilityWorkerResponse {
  type: 'result' | 'progress' | 'error' | 'complete';
  id: string;
  result?: any;
  progress?: number;
  error?: string;
}

let currentJobId: string | null = null;

self.onmessage = (e: MessageEvent<StabilityWorkerMessage>) => {
  const { type, id, inputs, dynamicInputs, cgRange } = e.data;

  if (type === 'cancel') {
    if (currentJobId === id) {
      currentJobId = null;
      self.postMessage({ type: 'complete', id } as StabilityWorkerResponse);
    }
    return;
  }

  currentJobId = id;

  try {
    let result: any;

    if (type === 'calculate' && inputs) {
      // Base stability calculation
      result = calculateStability(inputs);

      // Add dynamic derivatives if inputs provided
      if (dynamicInputs) {
        result.dynamic = calculateDynamicDerivatives(dynamicInputs);
      }
    } else if (type === 'sweepCG' && inputs && cgRange) {
      // CG sweep calculation
      result = sweepCGPosition(inputs, cgRange.min, cgRange.max, cgRange.steps);
    } else {
      throw new Error(`Unknown calculation type: ${type}`);
    }

    if (currentJobId === id) {
      self.postMessage({
        type: 'result',
        id,
        result,
      } as StabilityWorkerResponse);
    }
  } catch (error: any) {
    if (currentJobId === id) {
      self.postMessage({
        type: 'error',
        id,
        error: error.message || 'Unknown error',
      } as StabilityWorkerResponse);
    }
  }
};
