/**
 * Shared helper to build standardized AI payloads for all Aeroverse tools
 * 
 * This function ensures all tools provide complete, structured data to the AI assistant
 * in a consistent format.
 */

import { AeroverseAIPayload } from './schema/AeroversePayload';

const APP_VERSION = '1.0.0'; // Update this when app version changes

/**
 * Builds a standardized Aeroverse AI payload from tool data
 * 
 * @param params - Partial payload data from tool
 * @returns Complete AeroverseAIPayload ready for AI assistant
 * 
 * @example
 * ```ts
 * const payload = buildAeroversePayload({
 *   toolName: "LiftDrag",
 *   inputs: { alpha: 5, airspeed: 100, airDensity: 1.225 },
 *   results: { CL: 0.5, CD: 0.03, L_D_ratio: 16.67 },
 *   units: { alpha: "deg", airspeed: "m/s", airDensity: "kg/m³" },
 *   charts: [{ id: "polar", title: "Polar Diagram" }],
 *   configuration: { unitSystem: "SI" },
 *   metadata: { steps: ["CL = f(alpha)", "CD = f(alpha)"], warnings: [] }
 * });
 * ```
 */
export function buildAeroversePayload({
  toolName,
  inputs = {},
  results = {},
  units = {},
  charts = [],
  configuration = {},
  metadata = {}
}: {
  toolName: string;
  inputs?: Record<string, any>;
  results?: Record<string, any>;
  units?: Record<string, string>;
  charts?: Array<{ id: string; title: string }>;
  configuration?: Record<string, any>;
  metadata?: {
    steps?: string[];
    unitsSystem?: string;
    approxLevel?: string;
    confidence?: string;
    warnings?: string[];
    userNotes?: string;
  };
}): AeroverseAIPayload {
  // Ensure required fields are present
  if (!toolName) {
    throw new Error('toolName is required for Aeroverse AI payload');
  }

  // Validate inputs and results are objects
  const validatedInputs = typeof inputs === 'object' && inputs !== null ? inputs : {};
  const validatedResults = typeof results === 'object' && results !== null ? results : {};

  return {
    toolName,
    inputs: validatedInputs,
    results: validatedResults,
    units: units || {},
    charts: Array.isArray(charts) ? charts : [],
    configuration: configuration || {},
    metadata: {
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      steps: metadata.steps || [],
      unitsSystem: metadata.unitsSystem || 'SI',
      approxLevel: metadata.approxLevel || 'numeric',
      confidence: metadata.confidence || 'medium',
      warnings: metadata.warnings || [],
      userNotes: metadata.userNotes,
    },
  };
}

/**
 * Validates that a payload contains minimum required data
 * 
 * @param payload - Payload to validate
 * @returns True if valid, throws error if invalid
 */
export function validateAeroversePayload(payload: any): payload is AeroverseAIPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be an object');
  }

  if (!payload.toolName || typeof payload.toolName !== 'string') {
    throw new Error('Payload must have a valid toolName');
  }

  if (!payload.inputs || typeof payload.inputs !== 'object') {
    throw new Error('Payload must have an inputs object');
  }

  if (!payload.results || typeof payload.results !== 'object') {
    throw new Error('Payload must have a results object');
  }

  if (!payload.metadata || typeof payload.metadata !== 'object') {
    throw new Error('Payload must have a metadata object');
  }

  if (!payload.metadata.timestamp || !payload.metadata.version) {
    throw new Error('Payload metadata must include timestamp and version');
  }

  return true;
}

