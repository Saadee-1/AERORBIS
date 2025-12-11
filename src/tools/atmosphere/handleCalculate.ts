import type { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { calculateAtmosphere } from './utils/calcAtmosphere';

// TODO: refine type for `ToolContextUpdater` — changed any -> unknown automatically by chore/typed-cleanup
type ToolContextUpdater = (ctx: { tool: string; inputs: Record<string, unknown>; results: Record<string, unknown> }) => void;

export interface AtmosphereHandleOptions {
  altitudeMeters?: number;
  velocity?: number;
  updateToolContext?: ToolContextUpdater;
}

const sanitizeNumber = (value: unknown, fallback: number): number => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export async function handleCalculate(options: AtmosphereHandleOptions = {}): Promise<AeroverseAIPayload> {
  const altitude = sanitizeNumber(options.altitudeMeters ?? 1000, 1000);
  const velocity = sanitizeNumber(options.velocity ?? 0, 0);
  const result = calculateAtmosphere(altitude, velocity || undefined);

  const inputs = {
    altitudeMeters: altitude,
    velocity,
    unitSystem: 'SI',
  };

  const results = {
    geopotentialAltitude: result.geopotentialAltitude,
    geometricAltitude: result.geometricAltitude,
    temperature: result.temperature,
    pressure: result.pressure,
    density: result.density,
    speedOfSound: result.speedOfSound,
    viscosity: result.viscosity,
    gravity: result.gravity,
    layerName: result.layerName,
  };

  const payload: AeroverseAIPayload = {
    requestId: `calc-atmosphere-${Date.now()}`,
    toolName: 'Standard Atmosphere Calculator',
    toolVersion: '1.0.0',
    inputs,
    results,
    units: {
      altitudeMeters: 'm',
      velocity: 'm/s',
      temperature: 'K',
      pressure: 'Pa',
      density: 'kg/m³',
      speedOfSound: 'm/s',
      viscosity: 'Pa·s',
    },
    charts: [],
    configuration: {},
    metadata: {
      timestamp: new Date().toISOString(),
      steps: [
        `Evaluated 1976 atmosphere at ${altitude.toFixed(0)} m`,
        `Computed temperature ${result.temperature.toFixed(2)} K`,
        `Computed pressure ${result.pressure.toFixed(2)} Pa`,
      ],
      unitsSystem: 'SI',
      approxLevel: 'exact',
      confidence: 'high',
      warnings: result.warnings || [],
      version: '1.0.0',
    },
  };

  options.updateToolContext?.({
    tool: 'Standard Atmosphere Calculator',
    inputs: payload.inputs,
    results: payload.results,
  });

  return payload;
}

