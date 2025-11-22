export type RuntimeEnv = {
  DEV?: boolean | string;
  VITE_DEBUG_VISUALIZER?: boolean | string;
  [key: string]: any;
};

const getRuntimeEnv = (): RuntimeEnv => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env as RuntimeEnv;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env as RuntimeEnv;
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
