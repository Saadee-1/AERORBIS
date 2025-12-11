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
 *   requestId: "calc-123",
 *   toolName: "LiftDrag",
 *   toolVersion: "1.0.0",
 *   inputs: { alpha: 5, airspeed: 100, airDensity: 1.225 },
 *   results: { CL: 0.5, CD: 0.03, L_D_ratio: 16.67 },
 *   units: { alpha: "deg", airspeed: "m/s", airDensity: "kg/m³" },
 *   charts: [{ id: "polar", title: "Polar Diagram", dataSummary: "CL vs CD" }],
 *   configuration: { unitSystem: "SI" },
 *   userNotes: "Testing at cruise conditions",
 *   metadata: { steps: ["CL = f(alpha)", "CD = f(alpha)"], warnings: [] }
 * });
 * ```
 */
export function buildAeroversePayload({
  requestId,
  toolName,
  toolVersion,
  inputs = {},
  results = {},
  units = {},
  charts = [],
  configuration = {},
  userNotes,
  metadata = {}
}: {
  requestId?: string;
  toolName: string;
  toolVersion?: string;
  // TODO: refine type for `inputs` — changed any -> unknown automatically by chore/typed-cleanup
  inputs?: Record<string, unknown>;
  // TODO: refine type for `results` — changed any -> unknown automatically by chore/typed-cleanup
  results?: Record<string, unknown>;
  units?: Record<string, string>;
  charts?: Array<{ id: string; title: string; dataSummary?: string; imageBase64?: string }>;
  // TODO: refine type for `configuration` — changed any -> unknown automatically by chore/typed-cleanup
  configuration?: Record<string, unknown>;
  userNotes?: string;
  metadata?: {
    steps?: string[];
    unitsSystem?: string;
    approxLevel?: string;
    confidence?: string;
    warnings?: string[];
    userNotes?: string;
    userId?: string | null;
  };
}): AeroverseAIPayload {
  // Ensure required fields are present
  if (!toolName) {
    throw new Error('toolName is required for Aeroverse AI payload');
  }

  // Validate inputs and results are objects
  const validatedInputs = typeof inputs === 'object' && inputs !== null ? inputs : {};
  const validatedResults = typeof results === 'object' && results !== null ? results : {};

  // Generate requestId if not provided
  const finalRequestId = requestId || `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Get app version from env or use default
  // Note: process.env is not available in browser, use import.meta.env (Vite) instead
  const appVersion = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) || APP_VERSION;
  
  // Get user ID from localStorage if available
  const userId = metadata.userId ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') || null : null);

  return {
    requestId: finalRequestId,
    toolName,
    toolVersion: toolVersion || appVersion,
    inputs: validatedInputs,
    results: validatedResults,
    units: units || {},
    charts: Array.isArray(charts) ? charts : [],
    configuration: configuration || {},
    userNotes: userNotes || metadata.userNotes,
    metadata: {
      timestamp: new Date().toISOString(),
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      userId,
      appVersion,
      version: appVersion, // Legacy field for backward compatibility
      steps: metadata.steps || [],
      unitsSystem: metadata.unitsSystem || 'SI',
      approxLevel: metadata.approxLevel || 'numeric',
      confidence: metadata.confidence || 'medium',
      warnings: metadata.warnings || [],
      userNotes: userNotes || metadata.userNotes,
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

