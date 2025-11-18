/**
 * Validation schemas for Standard Atmosphere Calculator
 */

import { z } from 'zod';
import { MIN_ALTITUDE, MAX_ALTITUDE } from '../utils/constants';

export const atmosphereInputSchema = z.object({
  altitude: z.number()
    .min(MIN_ALTITUDE, `Altitude must be at least ${MIN_ALTITUDE} m`)
    .max(MAX_ALTITUDE, `Altitude must not exceed ${MAX_ALTITUDE} m`)
    .refine((val) => !isNaN(val) && isFinite(val), 'Altitude must be a valid number'),
  
  velocity: z.number()
    .min(0, 'Velocity must be non-negative')
    .optional(),
  
  unitSystem: z.enum(['SI', 'Imperial']).default('SI'),
});

export type AtmosphereInput = z.infer<typeof atmosphereInputSchema>;

