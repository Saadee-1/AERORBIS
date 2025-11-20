/**
 * Validation Schema for Power System Inputs
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PowerSystemInputs {
  battery: {
    chemistryId: string;
    capacity_mAh: number;
    S_count: number;
    P_count: number;
    cycles: number;
    temperature: number;
  };
  solar: {
    area_m2: number;
    efficiency: number;
    mpptEfficiency: number;
    tilt: number;
    azimuth: number;
  };
  loads: {
    propulsion?: number;
    avionics?: number;
    servos?: number;
    cameras?: number;
    telemetry?: number;
    payload?: number;
    thermal?: number;
    adcs?: number;
    transmitter?: number;
    obc?: number;
  };
  location: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  dayOfYear: number;
}

export function validatePowerSystemInputs(inputs: PowerSystemInputs): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Battery validation
  if (!inputs.battery.chemistryId) {
    errors.push('Battery chemistry must be selected');
  }
  
  if (inputs.battery.capacity_mAh <= 0) {
    errors.push('Battery capacity must be greater than 0');
  }
  
  if (inputs.battery.S_count <= 0 || !Number.isInteger(inputs.battery.S_count)) {
    errors.push('Series count must be a positive integer');
  }
  
  if (inputs.battery.P_count <= 0 || !Number.isInteger(inputs.battery.P_count)) {
    errors.push('Parallel count must be a positive integer');
  }
  
  if (inputs.battery.cycles < 0) {
    errors.push('Cycle count cannot be negative');
  }
  
  if (inputs.battery.temperature < -50 || inputs.battery.temperature > 100) {
    warnings.push('Battery temperature outside typical operating range');
  }
  
  // Solar validation
  if (inputs.solar.area_m2 <= 0) {
    errors.push('Solar panel area must be greater than 0');
  }
  
  if (inputs.solar.efficiency <= 0 || inputs.solar.efficiency > 1) {
    errors.push('Solar panel efficiency must be between 0 and 1');
  }
  
  if (inputs.solar.mpptEfficiency <= 0 || inputs.solar.mpptEfficiency > 1) {
    errors.push('MPPT efficiency must be between 0 and 1');
  }
  
  if (inputs.solar.tilt < 0 || inputs.solar.tilt > 90) {
    warnings.push('Solar panel tilt should be between 0 and 90 degrees');
  }
  
  if (inputs.solar.azimuth < 0 || inputs.solar.azimuth >= 360) {
    warnings.push('Solar panel azimuth should be between 0 and 360 degrees');
  }
  
  // Load validation
  const totalLoad = Object.values(inputs.loads).reduce((sum, val) => sum + (val || 0), 0);
  if (totalLoad <= 0) {
    errors.push('At least one power load must be greater than 0');
  }
  
  // Location validation
  if (inputs.location.latitude < -90 || inputs.location.latitude > 90) {
    errors.push('Latitude must be between -90 and 90 degrees');
  }
  
  if (inputs.location.longitude < -180 || inputs.location.longitude > 180) {
    errors.push('Longitude must be between -180 and 180 degrees');
  }
  
  if (inputs.location.altitude < 0) {
    warnings.push('Altitude should be non-negative');
  }
  
  // Day of year validation
  if (inputs.dayOfYear < 1 || inputs.dayOfYear > 365) {
    errors.push('Day of year must be between 1 and 365');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
