/**
 * Input validation schema for rocket engine calculations
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate rocket engine inputs
 */
export function validateRocketEngineInputs(inputs: {
  Pc?: number;
  Tc?: number;
  At?: number;
  epsilon?: number;
  Ae?: number;
  Pa?: number;
  gamma?: number;
  M_molar?: number;
  R?: number;
  nozzleEfficiency?: number;
  cStarEfficiency?: number;
  pressureLossFraction?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (inputs.Pc === undefined || inputs.Pc <= 0) {
    errors.push('Chamber pressure (Pc) must be positive');
  } else if (inputs.Pc < 1e5) {
    warnings.push('Very low chamber pressure (< 1 bar). Verify input.');
  } else if (inputs.Pc > 50e6) {
    warnings.push('Very high chamber pressure (> 500 bar). Verify input.');
  }
  
  if (inputs.Tc === undefined || inputs.Tc <= 0) {
    errors.push('Chamber temperature (Tc) must be positive');
  } else if (inputs.Tc < 500) {
    warnings.push('Very low chamber temperature (< 500 K). Verify input.');
  } else if (inputs.Tc > 5000) {
    warnings.push('Very high chamber temperature (> 5000 K). Verify input.');
  }
  
  if (inputs.At === undefined || inputs.At <= 0) {
    errors.push('Throat area (At) must be positive');
  } else if (inputs.At < 1e-4) {
    warnings.push('Very small throat area (< 1 cm²). Verify input.');
  } else if (inputs.At > 10) {
    warnings.push('Very large throat area (> 10 m²). Verify input.');
  }
  
  // Expansion ratio or exit area
  if (inputs.epsilon === undefined && inputs.Ae === undefined) {
    errors.push('Either expansion ratio (epsilon) or exit area (Ae) must be provided');
  } else {
    if (inputs.epsilon !== undefined) {
      if (inputs.epsilon <= 1) {
        errors.push('Expansion ratio (epsilon) must be > 1');
      } else if (inputs.epsilon > 200) {
        warnings.push('Very high expansion ratio (> 200). Verify input.');
      }
    }
    if (inputs.Ae !== undefined) {
      if (inputs.Ae <= 0) {
        errors.push('Exit area (Ae) must be positive');
      }
      if (inputs.At !== undefined && inputs.Ae <= inputs.At) {
        errors.push('Exit area (Ae) must be greater than throat area (At)');
      }
    }
  }
  
  // Ambient pressure
  if (inputs.Pa === undefined || inputs.Pa < 0) {
    errors.push('Ambient pressure (Pa) must be non-negative');
  }
  
  // Gas properties
  if (inputs.gamma === undefined || inputs.gamma <= 1) {
    errors.push('Gamma must be > 1');
  } else if (inputs.gamma < 1.1 || inputs.gamma > 1.4) {
    warnings.push('Gamma outside typical range (1.1-1.4). Verify input.');
  }
  
  // Either M_molar or R must be provided
  if (inputs.M_molar === undefined && inputs.R === undefined) {
    errors.push('Either molar mass (M_molar) or gas constant (R) must be provided');
  } else {
    if (inputs.M_molar !== undefined && (inputs.M_molar <= 0 || inputs.M_molar > 100)) {
      warnings.push('Molar mass outside typical range (1-100 kg/kmol). Verify input.');
    }
    if (inputs.R !== undefined && (inputs.R <= 0 || inputs.R > 10000)) {
      warnings.push('Gas constant outside typical range. Verify input.');
    }
  }
  
  // Efficiency factors
  if (inputs.nozzleEfficiency !== undefined) {
    if (inputs.nozzleEfficiency < 0 || inputs.nozzleEfficiency > 1) {
      errors.push('Nozzle efficiency must be between 0 and 1');
    } else if (inputs.nozzleEfficiency < 0.9) {
      warnings.push('Low nozzle efficiency (< 0.9). Verify input.');
    }
  }
  
  if (inputs.cStarEfficiency !== undefined) {
    if (inputs.cStarEfficiency < 0 || inputs.cStarEfficiency > 1) {
      errors.push('c* efficiency must be between 0 and 1');
    } else if (inputs.cStarEfficiency < 0.85) {
      warnings.push('Low c* efficiency (< 0.85). Verify input.');
    }
  }
  
  if (inputs.pressureLossFraction !== undefined) {
    if (inputs.pressureLossFraction < 0 || inputs.pressureLossFraction > 0.1) {
      warnings.push('Pressure loss fraction outside typical range (0-0.1). Verify input.');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

