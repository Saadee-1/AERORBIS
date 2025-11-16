// Input validation utilities

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function validatePositive(value: number, name: string): ValidationResult {
  if (value <= 0) {
    return {
      isValid: false,
      message: `${name} must be greater than zero`,
    };
  }
  return { isValid: true };
}

export function validateNonNegative(value: number, name: string): ValidationResult {
  if (value < 0) {
    return {
      isValid: false,
      message: `${name} cannot be negative`,
    };
  }
  return { isValid: true };
}

export function validateRange(
  value: number,
  name: string,
  min: number,
  max: number
): ValidationResult {
  if (value < min || value > max) {
    return {
      isValid: false,
      message: `${name} must be between ${min} and ${max}`,
    };
  }
  return { isValid: true };
}

export function validateEccentricity(value: number): ValidationResult {
  if (value < 0) {
    return {
      isValid: false,
      message: 'Eccentricity cannot be negative',
    };
  }
  if (value >= 1) {
    return {
      isValid: false,
      message: 'Eccentricity must be less than 1 for closed orbits',
    };
  }
  return { isValid: true };
}

export function validateInclination(value: number): ValidationResult {
  return validateRange(value, 'Inclination', 0, 180);
}

export function validateMachNumber(value: number): ValidationResult {
  if (value < 0) {
    return {
      isValid: false,
      message: 'Mach number cannot be negative',
    };
  }
  if (value > 5) {
    return {
      isValid: false,
      message: 'Mach number above 5 may require special considerations',
    };
  }
  return { isValid: true };
}

export function validateAngleOfAttack(value: number): ValidationResult {
  return validateRange(value, 'Angle of attack', -20, 40);
}

export function validateDensity(value: number): ValidationResult {
  const result = validatePositive(value, 'Density');
  if (!result.isValid) return result;
  
  // Check for unrealistic densities
  if (value > 10000) {
    return {
      isValid: false,
      message: 'Density seems unrealistically high',
    };
  }
  
  return { isValid: true };
}

export function validateAltitude(value: number, maxAltitude: number): ValidationResult {
  if (value < 0) {
    return {
      isValid: false,
      message: 'Altitude cannot be negative',
    };
  }
  if (value > maxAltitude) {
    return {
      isValid: false,
      message: `Altitude exceeds maximum value of ${maxAltitude}`,
    };
  }
  return { isValid: true };
}
