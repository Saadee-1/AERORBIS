// Unit conversion utilities for aerospace calculations

export type UnitSystem = 'SI' | 'Imperial' | 'Custom';

export interface UnitConfig {
  length: string;
  mass: string;
  velocity: string;
  force: string;
  area: string;
  density: string;
  pressure: string;
  specificImpulse: string;
}

export const unitConfigs: Record<UnitSystem, UnitConfig> = {
  SI: {
    length: 'm',
    mass: 'kg',
    velocity: 'm/s',
    force: 'N',
    area: 'm²',
    density: 'kg/m³',
    pressure: 'Pa',
    specificImpulse: 's',
  },
  Imperial: {
    length: 'ft',
    mass: 'lb',
    velocity: 'ft/s',
    force: 'lbf',
    area: 'ft²',
    density: 'slug/ft³',
    pressure: 'psi',
    specificImpulse: 's',
  },
  Custom: {
    length: 'unit',
    mass: 'unit',
    velocity: 'unit/s',
    force: 'unit',
    area: 'unit²',
    density: 'unit/unit³',
    pressure: 'unit',
    specificImpulse: 's',
  },
};

// Conversion factors to SI
export const toSI = {
  length: {
    m: 1,
    ft: 0.3048,
    km: 1000,
    mi: 1609.34,
  },
  mass: {
    kg: 1,
    lb: 0.453592,
    slug: 14.5939,
    ton: 1000,
  },
  velocity: {
    'm/s': 1,
    'ft/s': 0.3048,
    'km/h': 1 / 3.6,
    'mph': 0.44704,
    'knots': 0.514444,
    'mach': 343, // at sea level
  },
  force: {
    N: 1,
    lbf: 4.44822,
    kN: 1000,
  },
  area: {
    'm²': 1,
    'ft²': 0.092903,
  },
  density: {
    'kg/m³': 1,
    'slug/ft³': 515.379,
  },
  pressure: {
    Pa: 1,
    psi: 6894.76,
    kPa: 1000,
    atm: 101325,
  },
};

export function convertToSI(value: number, unit: string, type: keyof typeof toSI): number {
  const conversions = toSI[type] as Record<string, number>;
  return value * (conversions[unit] || 1);
}

export function convertFromSI(value: number, unit: string, type: keyof typeof toSI): number {
  const conversions = toSI[type] as Record<string, number>;
  return value / (conversions[unit] || 1);
}

export function formatValue(value: number, decimals: number = 3): string {
  if (Math.abs(value) < 0.001) return value.toExponential(decimals);
  if (Math.abs(value) > 1e6) return value.toExponential(decimals);
  return value.toFixed(decimals);
}
