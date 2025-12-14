/**
 * Validation schema for weight estimation inputs
 */

import { z } from 'zod';

export const WeightEstimationInputsSchema = z.object({
  geometry: z.object({
    S_w: z.number().positive('Wing area must be positive'),
    AR: z.number().positive('Aspect ratio must be positive'),
    lambda: z.number().min(0).max(1, 'Taper ratio must be between 0 and 1'),
    t_c: z.number().min(0.01).max(0.5, 'Thickness-to-chord ratio must be between 0.01 and 0.5'),
    b: z.number().positive('Wing span must be positive'),
    S_ht: z.number().min(0, 'Horizontal tail area must be non-negative'),
    AR_ht: z.number().min(0, 'Horizontal tail aspect ratio must be non-negative'),
    S_vt: z.number().min(0, 'Vertical tail area must be non-negative'),
    S_fuse: z.number().positive('Fuselage wetted area must be positive'),
    L_fuse: z.number().positive('Fuselage length must be positive'),
  }),
  flight: z.object({
    q: z.number().positive('Dynamic pressure must be positive'),
    N_ult: z.number().min(1, 'Ultimate load factor must be at least 1'),
    hasThrustRelief: z.boolean().optional(),
  }),
  propulsion: z.object({
    type: z.enum(['piston', 'turbofan', 'turbojet', 'electric']),
    power: z.number().positive('Power/Thrust must be positive'),
    n_engines: z.number().int().min(1, 'Number of engines must be at least 1'),
    includeNacelle: z.boolean().optional(),
    includePylon: z.boolean().optional(),
    includeMounts: z.boolean().optional(),
  }),
  systems: z.object({
    W_crew: z.number().min(0, 'Crew weight must be non-negative'),
    avionics: z.object({
      autopilot: z.boolean().optional(),
      uavMissionComputer: z.boolean().optional(),
      sensors: z.boolean().optional(),
      cameras: z.boolean().optional(),
      adsb: z.boolean().optional(),
      ifr: z.boolean().optional(),
    }),
    controls: z.object({
      isFBW: z.boolean().optional(),
    }),
    fixedEquipment: z.object({
      n_seats: z.number().int().min(0, 'Number of seats must be non-negative'),
      isPressurized: z.boolean().optional(),
      hasOxygen: z.boolean().optional(),
      hasHVAC: z.boolean().optional(),
      batteryCapacity: z.number().min(0).optional(),
      telemetry: z.boolean().optional(),
      antennaPackage: z.boolean().optional(),
    }),
  }),
  W_payload: z.number().min(0, 'Payload weight must be non-negative'),
  method: z.object({
    wing: z.enum(['raymer', 'torenbeek']),
    fuselage: z.enum(['raymer', 'torenbeek']),
  }),
  W_to: z.number().positive('Takeoff weight must be positive'),
  materials: z.object({
    wing: z.string().optional(),
    fuselage: z.string().optional(),
    htail: z.string().optional(),
    vtail: z.string().optional(),
    spars: z.string().optional(),
    ribs: z.string().optional(),
    gear: z.string().optional(),
    nacelle: z.string().optional(),
  }).optional(),
});

export type WeightEstimationInputsType = z.infer<typeof WeightEstimationInputsSchema>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate weight estimation inputs
 */
interface ValidatableInputs {
  geometry?: {
    b: number;
    S_w: number;
    AR: number;
  };
  propulsion?: {
    type?: string;
  };
  W_to?: number;
  flight?: {
    N_ult: number;
  };
}

export function validateWeightEstimationInputs(inputs: unknown): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };
  
  try {
    // Validate with Zod schema
    WeightEstimationInputsSchema.parse(inputs);
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.valid = false;
      result.errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    } else {
      result.valid = false;
      result.errors.push('Unknown validation error');
    }
  }
  
  // Additional business logic validations
  const typedInputs = inputs as ValidatableInputs | null | undefined;
  if (typedInputs?.geometry) {
    // Check aspect ratio consistency
    const AR_calculated = Math.pow(typedInputs.geometry.b, 2) / typedInputs.geometry.S_w;
    if (Math.abs(AR_calculated - typedInputs.geometry.AR) > 0.1) {
      result.warnings.push(
        `Calculated AR (${AR_calculated.toFixed(2)}) differs from input AR (${typedInputs.geometry.AR.toFixed(2)})`
      );
    }
    
    // Check electric propulsion weight limit
    if (typedInputs.propulsion?.type === 'electric' && typedInputs.W_to && typedInputs.W_to > 10000 * 9.81) {
      result.warnings.push(
        'Electric propulsion typically limited to aircraft < 1000 kg. Consider turbofan/turbojet for larger aircraft.'
      );
    }
    
    // Check CG position (will be validated after calculation)
    // Check load factor
    if (typedInputs.flight && typedInputs.flight.N_ult < 2.5) {
      result.warnings.push('Ultimate load factor < 2.5 may be too low for safe operation');
    }
    if (typedInputs.flight && typedInputs.flight.N_ult > 12) {
      result.warnings.push('Ultimate load factor > 12 is very high (fighter aircraft typically 9 G)');
    }
  }
  
  return result;
}
