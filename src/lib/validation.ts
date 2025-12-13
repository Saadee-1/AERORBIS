/**
 * Unified Input Validation Engine
 * Prevents NaN, Infinity, undefined values and provides meaningful error messages
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRule {
  field: string;
  // TODO: refine type for `validator` — changed any -> unknown automatically by chore/typed-cleanup
  validator: (value: unknown) => boolean | string;
  errorMessage?: string;
  warningMessage?: string;
}

/**
 * Validate a number is finite and positive
 */
// TODO: refine type for `value` — changed any -> unknown automatically by chore/typed-cleanup
export function validatePositiveNumber(
  value: unknown,
  fieldName: string,
  min: number = 0,
  max?: number
): string | null {
  if (value === undefined || value === null || value === '') {
    return `${fieldName} is required`;
  }

  const num = typeof value === 'string' ? parseFloat(value) : (value as number);

  if (isNaN(num) || !isFinite(num)) {
    return `${fieldName} must be a valid number`;
  }

  if (num < min) {
    return `${fieldName} must be >= ${min}`;
  }

  if (max !== undefined && num > max) {
    return `${fieldName} must be <= ${max}`;
  }

  return null;
}

/**
 * Validate a number is finite (can be negative)
 */
export function validateFiniteNumber(
  value: unknown,
  fieldName: string
): string | null {
  if (value === undefined || value === null || value === '') {
    return `${fieldName} is required`;
  }

  const num = typeof value === 'string' ? parseFloat(value) : (value as number);

  if (isNaN(num) || !isFinite(num)) {
    return `${fieldName} must be a valid number`;
  }

  return null;
}

/**
 * Safe toFixed that handles NaN, Infinity, and undefined
 */
export function safeToFixed(
  value: number | undefined | null,
  decimals: number = 2,
  fallback: string = 'N/A'
): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (isNaN(value) || !isFinite(value)) {
    return fallback;
  }

  return value.toFixed(decimals);
}

/**
 * Safe number formatting with engineering notation
 */
export function formatNumber(
  value: number | undefined | null,
  decimals: number = 2,
  useEngineering: boolean = false
): string {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return 'N/A';
  }

  if (useEngineering && Math.abs(value) >= 1000) {
    const exp = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
    const mantissa = value / Math.pow(10, exp);
    return `${mantissa.toFixed(decimals)}e${exp}`;
  }

  return value.toFixed(decimals);
}

/**
 * Validate object with multiple rules
 */
// TODO: refine type for `validateObject` — changed any -> unknown automatically by chore/typed-cleanup
export function validateObject(
  obj: Record<string, unknown>,
  rules: ValidationRule[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    const value = obj[rule.field];
    const result = rule.validator(value);

    if (result === false) {
      errors.push(
        rule.errorMessage || `${rule.field} is invalid`
      );
    } else if (typeof result === 'string') {
      if (result.startsWith('WARNING:')) {
        warnings.push(result.replace('WARNING:', ''));
      } else {
        errors.push(result);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize number input - convert to number and validate
 */
// TODO: refine type for `value` — changed any -> unknown automatically by chore/typed-cleanup
export function sanitizeNumber(
  value: unknown,
  defaultValue: number = 0
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const num = typeof value === 'string' ? parseFloat(value) : (value as number);

  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }

  return num;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  if (isNaN(value) || !isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
