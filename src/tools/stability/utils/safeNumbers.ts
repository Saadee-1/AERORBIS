/**
 * Safe number conversion utilities
 * Prevents NaN and undefined errors throughout the calculator
 */

/**
 * Safely convert a value to a number, with fallback
 */
export function safeNumber(value: any, fallback: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isFinite(num) ? num : fallback;
}

/**
 * Safely format a number with toFixed, handling null/undefined/NaN
 */
export function safeToFixed(value: any, decimals: number = 3, fallback: string = 'N/A'): string {
  const num = safeNumber(value);
  if (num === 0 && value !== 0 && value !== '0') {
    return fallback;
  }
  return num.toFixed(decimals);
}

/**
 * Ensure all values in an object are numbers
 */
export function ensureNumbers<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj } as any;
  for (const key in result) {
    if (typeof result[key] === 'string') {
      result[key] = safeNumber(result[key], result[key] === '' ? undefined : 0);
    } else if (result[key] === null || result[key] === undefined) {
      // Keep undefined/null for optional fields
      continue;
    } else if (typeof result[key] === 'number' && !isFinite(result[key])) {
      result[key] = 0;
    }
  }
  return result as T;
}

