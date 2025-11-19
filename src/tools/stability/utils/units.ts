/**
 * Unit conversion utilities for stability calculations
 */

export type LengthUnit = 'm' | 'cm' | 'ft' | 'in';
export type AreaUnit = 'm²' | 'cm²' | 'ft²' | 'in²';
export type AngleUnit = 'rad' | 'deg';

/**
 * Convert length to SI (m)
 */
export function convertLengthToSI(value: number, unit: LengthUnit): number {
  const conversions: Record<LengthUnit, number> = {
    m: 1,
    cm: 0.01,
    ft: 0.3048,
    in: 0.0254,
  };
  return value * conversions[unit];
}

/**
 * Convert length from SI (m)
 */
export function convertLengthFromSI(value: number, unit: LengthUnit): number {
  const conversions: Record<LengthUnit, number> = {
    m: 1,
    cm: 0.01,
    ft: 0.3048,
    in: 0.0254,
  };
  return value / conversions[unit];
}

/**
 * Convert area to SI (m²)
 */
export function convertAreaToSI(value: number, unit: AreaUnit): number {
  const conversions: Record<AreaUnit, number> = {
    'm²': 1,
    'cm²': 1e-4,
    'ft²': 0.092903,
    'in²': 0.00064516,
  };
  return value * conversions[unit];
}

/**
 * Convert area from SI (m²)
 */
export function convertAreaFromSI(value: number, unit: AreaUnit): number {
  const conversions: Record<AreaUnit, number> = {
    'm²': 1,
    'cm²': 1e-4,
    'ft²': 0.092903,
    'in²': 0.00064516,
  };
  return value / conversions[unit];
}

/**
 * Convert angle to SI (rad)
 */
export function convertAngleToSI(value: number, unit: AngleUnit): number {
  if (unit === 'rad') return value;
  if (unit === 'deg') return value * Math.PI / 180;
  return value;
}

/**
 * Convert angle from SI (rad)
 */
export function convertAngleFromSI(value: number, unit: AngleUnit): number {
  if (unit === 'rad') return value;
  if (unit === 'deg') return value * 180 / Math.PI;
  return value;
}
