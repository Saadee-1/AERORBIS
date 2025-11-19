/**
 * Aircraft configuration presets for stability calculations
 * 
 * Includes typical values for common aircraft types
 */

export interface AircraftPreset {
  id: string;
  name: string;
  description: string;
  category: 'UAV' | 'Trainer' | 'Fighter' | 'Transport' | 'General Aviation';
  
  // Geometry
  S_w: number; // Wing area (m²)
  AR: number; // Aspect ratio
  c_bar: number; // Mean aerodynamic chord (m)
  x_ac_w: number; // Wing AC position (m, fraction of MAC)
  x_cg: number; // CG position (m, fraction of MAC)
  
  // Tail
  S_t: number; // Tail area (m²)
  AR_t: number; // Tail aspect ratio
  l_t: number; // Tail arm (m)
  
  // Vertical tail
  S_v?: number; // Vertical tail area (m²)
  l_v?: number; // Vertical tail arm (m)
  b_w?: number; // Wing span (m)
  
  // Aerodynamics
  a0: number; // Airfoil lift curve slope (per rad)
  e: number; // Wing efficiency
  e_t: number; // Tail efficiency
  eta_t: number; // Tail effectiveness
  
  // Control
  S_e?: number; // Elevator area (m²)
  tau_e?: number; // Elevator effectiveness
  S_a?: number; // Aileron area (m²)
  K_a?: number; // Aileron constant
  S_r?: number; // Rudder area (m²)
  K_r?: number; // Rudder constant
  
  // Lateral
  dihedralAngle?: number; // Dihedral angle (degrees)
  
  notes?: string;
}

export const AIRCRAFT_PRESETS: Record<string, AircraftPreset> = {
  'small-uav': {
    id: 'small-uav',
    name: 'Small UAV',
    description: 'Typical small unmanned aerial vehicle',
    category: 'UAV',
    S_w: 0.5,
    AR: 8,
    c_bar: 0.25,
    x_ac_w: 0.25,
    x_cg: 0.30,
    S_t: 0.15,
    AR_t: 4,
    l_t: 0.8,
    S_v: 0.10,
    l_v: 0.8,
    b_w: 2.0,
    a0: 2 * Math.PI,
    e: 0.85,
    e_t: 0.80,
    eta_t: 0.90,
    S_e: 0.05,
    tau_e: 0.40,
    S_a: 0.08,
    K_a: 0.35,
    S_r: 0.03,
    K_r: 0.25,
    dihedralAngle: 3,
    notes: 'Typical small quadcopter/fixed-wing hybrid',
  },
  'trainer': {
    id: 'trainer',
    name: 'Primary Trainer',
    description: 'Typical primary flight trainer aircraft',
    category: 'Trainer',
    S_w: 15,
    AR: 7,
    c_bar: 1.5,
    x_ac_w: 0.25,
    x_cg: 0.28,
    S_t: 4,
    AR_t: 4.5,
    l_t: 4.5,
    S_v: 2.5,
    l_v: 4.5,
    b_w: 10,
    a0: 2 * Math.PI,
    e: 0.90,
    e_t: 0.85,
    eta_t: 0.92,
    S_e: 1.2,
    tau_e: 0.45,
    S_a: 2.0,
    K_a: 0.40,
    S_r: 0.8,
    K_r: 0.30,
    dihedralAngle: 5,
    notes: 'Typical Cessna 172-like trainer',
  },
  'fighter': {
    id: 'fighter',
    name: 'Fighter Aircraft',
    description: 'Typical fighter/combat aircraft',
    category: 'Fighter',
    S_w: 50,
    AR: 3.5,
    c_bar: 4.0,
    x_ac_w: 0.30,
    x_cg: 0.35,
    S_t: 12,
    AR_t: 2.5,
    l_t: 8,
    S_v: 8,
    l_v: 8,
    b_w: 13,
    a0: 2 * Math.PI,
    e: 0.80,
    e_t: 0.75,
    eta_t: 0.88,
    S_e: 3.5,
    tau_e: 0.50,
    S_a: 6.0,
    K_a: 0.45,
    S_r: 2.5,
    K_r: 0.35,
    dihedralAngle: -2, // Anhedral for fighters
    notes: 'Typical fighter configuration with anhedral',
  },
  'transport': {
    id: 'transport',
    name: 'Transport Aircraft',
    description: 'Typical transport/airliner configuration',
    category: 'Transport',
    S_w: 200,
    AR: 9.5,
    c_bar: 5.5,
    x_ac_w: 0.25,
    x_cg: 0.30,
    S_t: 50,
    AR_t: 5.5,
    l_t: 18,
    S_v: 35,
    l_v: 18,
    b_w: 35,
    a0: 2 * Math.PI,
    e: 0.95,
    e_t: 0.90,
    eta_t: 0.95,
    S_e: 15,
    tau_e: 0.55,
    S_a: 25,
    K_a: 0.42,
    S_r: 12,
    K_r: 0.32,
    dihedralAngle: 7,
    notes: 'Typical airliner configuration',
  },
  'general-aviation': {
    id: 'general-aviation',
    name: 'General Aviation',
    description: 'Typical general aviation aircraft',
    category: 'General Aviation',
    S_w: 20,
    AR: 7.5,
    c_bar: 1.8,
    x_ac_w: 0.25,
    x_cg: 0.29,
    S_t: 5,
    AR_t: 4.5,
    l_t: 5,
    S_v: 3,
    l_v: 5,
    b_w: 12,
    a0: 2 * Math.PI,
    e: 0.88,
    e_t: 0.82,
    eta_t: 0.90,
    S_e: 1.5,
    tau_e: 0.42,
    S_a: 3.0,
    K_a: 0.38,
    S_r: 1.0,
    K_r: 0.28,
    dihedralAngle: 6,
    notes: 'Typical single-engine general aviation',
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

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: AircraftPreset['category']): AircraftPreset[] {
  return Object.values(AIRCRAFT_PRESETS).filter(p => p.category === category);
}
