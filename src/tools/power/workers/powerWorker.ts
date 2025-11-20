/**
 * Web Worker for Power System Mission Simulation
 * Offloads heavy mission timeline calculations to background thread
 */

import { simulateMission, MissionPhase, PowerLoad } from '../utils/missionEngine';
import { BatteryPack } from '../utils/batteryModel';
import { SolarConfig } from '../utils/solarModel';
import { Location } from '../utils/sunVector';

export interface PowerWorkerMessage {
  type: 'simulate' | 'cancel';
  id: string;
  pack?: BatteryPack;
  solarConfig?: SolarConfig;
  loads?: PowerLoad;
  phases?: MissionPhase[];
  location?: Location;
  dayOfYear?: number;
  timeStep?: number;
}

export interface PowerWorkerResponse {
  type: 'result' | 'progress' | 'error' | 'complete';
  id: string;
  result?: any;
  progress?: number;
  error?: string;
}

let currentJobId: string | null = null;

self.onmessage = (e: MessageEvent<PowerWorkerMessage>) => {
  const { type, id, pack, solarConfig, loads, phases, location, dayOfYear, timeStep } = e.data;

  if (type === 'cancel') {
    if (currentJobId === id) {
      currentJobId = null;
      self.postMessage({ type: 'complete', id } as PowerWorkerResponse);
    }
    return;
  }

  currentJobId = id;

  try {
    if (type === 'simulate' && pack && solarConfig && loads && phases && location !== undefined && dayOfYear !== undefined) {
      const result = simulateMission(
        pack,
        solarConfig,
        loads,
        phases,
        location,
        dayOfYear,
        timeStep || 1 // timeStep_min in minutes
      );

      if (currentJobId === id) {
        self.postMessage({
          type: 'result',
          id,
          result,
        } as PowerWorkerResponse);
      }
    } else {
      throw new Error('Missing required parameters for simulation');
    }
  } catch (error: any) {
    if (currentJobId === id) {
      self.postMessage({
        type: 'error',
        id,
        error: error.message || 'Unknown error',
      } as PowerWorkerResponse);
    }
  }
};
