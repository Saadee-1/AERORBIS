/**
 * Aircraft configuration presets for stability calculations
 * 
 * Includes typical values for common aircraft types
 */

export interface AircraftPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  // Wing geometry
  S_w: number; // m²
  AR: number;
  c_bar: number; // m
  x_ac_w: number; // fraction of MAC
  // Tail geometry
  S_t: number; // m²
  AR_t: number;
  l_t: number; // m
  // Aerodynamics
  a0: number; // per radian
  e: number;
  e_t: number;
  eta: number;
  // Control surfaces
  S_e?: number; // m²
  tau_e?: number;
  S_a?: number; // m²
  S_r?: number; // m²
  S_v?: number; // m²
  // Typical CG range
  x_cg_min: number; // fraction of MAC
  x_cg_max: number; // fraction of MAC
  notes?: string;
}

export const AIRCRAFT_PRESETS: Record<string, AircraftPreset> = {
  'small-uav': {
    id: 'small-uav',
    name: 'Small UAV',
    description: 'Typical small unmanned aerial vehicle',
    category: 'UAV',
    S_w: 0.5,
    AR: 6.0,
    c_bar: 0.3,
    x_ac_w: 0.25,
    S_t: 0.1,
    AR_t: 4.0,
    l_t: 0.8,
    a0: 2 * Math.PI,
    e: 0.8,
    e_t: 0.85,
    eta: 0.9,
    S_e: 0.02,
    tau_e: 0.4,
    x_cg_min: 0.20,
    x_cg_max: 0.35,
    notes: 'Lightweight, high efficiency',
  },
  'trainer': {
    id: 'trainer',
    name: 'Primary Trainer',
    description: 'Typical primary training aircraft',
    category: 'Trainer',
    S_w: 15.0,
    AR: 7.0,
    c_bar: 1.5,
    x_ac_w: 0.25,
    S_t: 3.0,
    AR_t: 4.5,
    l_t: 4.0,
    a0: 2 * Math.PI,
    e: 0.85,
    e_t: 0.88,
    eta: 0.9,
    S_e: 0.6,
    tau_e: 0.45,
    S_a: 0.8,
    S_r: 0.5,
    S_v: 2.5,
    x_cg_min: 0.20,
    x_cg_max: 0.30,
    notes: 'Stable, forgiving handling characteristics',
  },
  'fighter': {
    id: 'fighter',
    name: 'Fighter Aircraft',
    description: 'Typical fighter/combat aircraft',
    category: 'Fighter',
    S_w: 50.0,
    AR: 3.5,
    c_bar: 4.0,
    x_ac_w: 0.30,
    S_t: 8.0,
    AR_t: 2.5,
    l_t: 6.0,
    a0: 2 * Math.PI,
    e: 0.90,
    e_t: 0.92,
    eta: 0.95,
    S_e: 1.2,
    tau_e: 0.5,
    S_a: 2.0,
    S_r: 1.0,
    S_v: 6.0,
    x_cg_min: 0.30,
    x_cg_max: 0.40,
    notes: 'High performance, relaxed stability possible',
  },
  'transport': {
    id: 'transport',
    name: 'Transport Aircraft',
    description: 'Typical transport/cargo aircraft',
    category: 'Transport',
    S_w: 200.0,
    AR: 9.0,
    c_bar: 5.0,
    x_ac_w: 0.25,
    S_t: 40.0,
    AR_t: 5.0,
    l_t: 15.0,
    a0: 2 * Math.PI,
    e: 0.88,
    e_t: 0.90,
    eta: 0.92,
    S_e: 4.0,
    tau_e: 0.45,
    S_a: 6.0,
    S_r: 3.0,
    S_v: 25.0,
    x_cg_min: 0.20,
    x_cg_max: 0.30,
    notes: 'High stability, large tail volume',
  },
  'glider': {
    id: 'glider',
    name: 'Sailplane/Glider',
    description: 'Typical high-performance glider',
    category: 'Glider',
    S_w: 18.0,
    AR: 20.0,
    c_bar: 1.0,
    x_ac_w: 0.25,
    S_t: 2.5,
    AR_t: 6.0,
    l_t: 5.0,
    a0: 2 * Math.PI,
    e: 0.95,
    e_t: 0.95,
    eta: 0.95,
    S_e: 0.3,
    tau_e: 0.4,
    x_cg_min: 0.25,
    x_cg_max: 0.35,
    notes: 'Very high aspect ratio, optimized for efficiency',
  },
};

/**
 * Get preset by ID
 */
export function getAircraftPreset(id: string): AircraftPreset | undefined {
  return AIRCRAFT_PRESETS[id];
}

/**
 * Get all preset IDs
 */
export function getAircraftPresetIds(): string[] {
  return Object.keys(AIRCRAFT_PRESETS);
}
