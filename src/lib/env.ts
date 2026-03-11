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
  if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) {
    return (globalThis as any).process.env as RuntimeEnv;
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
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  return false;
};

export const isVisualizerDebug = (): boolean => {
  if (RUNTIME_ENV?.VITE_DEBUG_VISUALIZER !== undefined) {
    return normalizeFlag(RUNTIME_ENV.VITE_DEBUG_VISUALIZER);
  }
  if (typeof process !== 'undefined' && process.env?.VITE_DEBUG_VISUALIZER) {
    return normalizeFlag(process.env.VITE_DEBUG_VISUALIZER);
  }
  return false;
};
