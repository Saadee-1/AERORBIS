export type RuntimeEnv = {
  DEV?: boolean | string;
  VITE_DEBUG_VISUALIZER?: boolean | string;
  // TODO: refine type for index signature — changed any -> unknown automatically by chore/typed-cleanup
  [key: string]: unknown;
};

const getRuntimeEnv = (): RuntimeEnv => {
  if (typeof import.meta !== 'undefined' && (import.meta as unknown as Record<string, unknown>).env) {
    return ((import.meta as unknown as Record<string, unknown>).env) as RuntimeEnv;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { process?: { env?: RuntimeEnv } }).process?.env) {
    return (globalThis as unknown as { process: { env: RuntimeEnv } }).process.env;
  }
  return {};
};

const RUNTIME_ENV = getRuntimeEnv();

const normalizeFlag = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return false;
};

export const isDevEnv = (): boolean => {
  // Check for explicit disable flag first
  if (RUNTIME_ENV?.VITE_DISABLE_DEV !== undefined) {
    const disabled = normalizeFlag(RUNTIME_ENV.VITE_DISABLE_DEV);
    if (disabled) return false;
  }
  if (RUNTIME_ENV?.DEV !== undefined) {
    return normalizeFlag(RUNTIME_ENV.DEV);
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV) {
    return (globalThis as unknown as { process: { env: { NODE_ENV: string } } }).process.env.NODE_ENV !== 'production';
  }
  return false;
};

export const isVisualizerDebug = (): boolean => {
  if (RUNTIME_ENV?.VITE_DEBUG_VISUALIZER !== undefined) {
    return normalizeFlag(RUNTIME_ENV.VITE_DEBUG_VISUALIZER);
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { process?: { env?: { VITE_DEBUG_VISUALIZER?: unknown } } }).process?.env?.VITE_DEBUG_VISUALIZER) {
    return normalizeFlag((globalThis as unknown as { process: { env: { VITE_DEBUG_VISUALIZER: unknown } } }).process.env.VITE_DEBUG_VISUALIZER);
  }
  return false;
};
