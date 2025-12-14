/**
 * Web Worker for Trajectory Simulation
 * Runs simulation in background thread for better performance
 */

import { run1D, Trajectory1DInputs } from '../utils/solver/run1d';
import { run2D, Trajectory2DInputs } from '../utils/solver/run2d';
import { run3D, Trajectory3DInputs } from '../utils/solver/run3d';

export interface WorkerMessage {
  type: 'run1d' | 'run2d' | 'run3d' | 'cancel';
  id: string;
  inputs?: Trajectory1DInputs | Trajectory2DInputs | Trajectory3DInputs;
}

export interface WorkerResponse {
  type: 'result' | 'progress' | 'error' | 'complete';
  id: string;
  result?: unknown;
  progress?: number;
  error?: string;
}

let currentJobId: string | null = null;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, id, inputs } = e.data;

  if (type === 'cancel') {
    if (currentJobId === id) {
      currentJobId = null;
      self.postMessage({ type: 'complete', id } as WorkerResponse);
    }
    return;
  }

  currentJobId = id;

  try {
    let result: unknown;

    if (type === 'run1d' && inputs) {
      result = run1D(inputs as Trajectory1DInputs);
    } else if (type === 'run2d' && inputs) {
      result = run2D(inputs as Trajectory2DInputs);
    } else if (type === 'run3d' && inputs) {
      result = run3D(inputs as Trajectory3DInputs);
    } else {
      throw new Error(`Unknown simulation type: ${type}`);
    }

    if (currentJobId === id) {
      self.postMessage({
        type: 'result',
        id,
        result,
      } as WorkerResponse);
    }
  } catch (error) {
    if (currentJobId === id) {
      self.postMessage({
        type: 'error',
        id,
        error: (error as Error)?.message || 'Unknown error',
      } as WorkerResponse);
    }
  }
};
