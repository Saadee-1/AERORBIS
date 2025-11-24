/**
 * Safe number formatting utilities
 * Guards against null, undefined, NaN, and Infinity before calling toFixed
 */

/**
 * Safely format a number with toFixed, returning '—' for invalid values
 */
export function safeToFixed(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return '—';
  }
  return Number(value).toFixed(decimals);
}

/**
 * Safely format a number with toFixed, returning a default string for invalid values
 */
export function safeToFixedWithDefault(
  value: number | null | undefined,
  decimals: number = 2,
  defaultValue: string = 'N/A'
): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return defaultValue;
  }
  return Number(value).toFixed(decimals);
}

/**
 * Check if a value is a valid number for calculations
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value);
}

/**
 * Safely get a number from a value, returning 0 for invalid values
 */
export function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (isValidNumber(value)) {
    return value;
  }
  return defaultValue;
}

