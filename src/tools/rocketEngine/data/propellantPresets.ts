/**
 * Propellant and engine presets for rocket engine calculations
 * 
 * Includes common propellant combinations and approximate engine configurations
 */

export interface PropellantPreset {
  id: string;
  name: string;
  description: string;
  category: 'Liquid' | 'Solid' | 'Hybrid' | 'Monopropellant' | 'Air-breathing';
  
  // Gas properties
  gamma: number; // Ratio of specific heats
  M_molar: number; // Molar mass (kg/kmol)
  
  // Typical chamber conditions
  Pc_typical: number; // Typical chamber pressure (Pa)
  Tc_typical: number; // Typical chamber temperature (K)
  
  // Typical efficiency factors
  nozzleEfficiency: number;
  cStarEfficiency: number;
  
  notes?: string;
}

export interface EnginePreset {
  id: string;
  name: string;
  description: string;
  propellantId: string;
  
  // Geometry
  At: number; // Throat area (m²)
  epsilon: number; // Expansion ratio
  
  // Operating conditions
  Pc: number; // Chamber pressure (Pa)
  Tc: number; // Chamber temperature (K)
  
  // Efficiency factors
  nozzleEfficiency?: number;
  cStarEfficiency?: number;
  pressureLossFraction?: number;
  
  notes?: string;
}

export const PROPELLANT_PRESETS: Record<string, PropellantPreset> = {
  'lox-rp1': {
    id: 'lox-rp1',
    name: 'LOX/RP-1',
    description: 'Liquid oxygen / Rocket propellant-1 (Kerosene)',
    category: 'Liquid',
    gamma: 1.22,
    M_molar: 22.0, // Approximate
    Pc_typical: 9.7e6, // ~97 bar
    Tc_typical: 3500,
    nozzleEfficiency: 0.98,
    cStarEfficiency: 0.95,
    notes: 'Common in first stages (Merlin, F-1, RD-180)',
  },
  'lox-lh2': {
    id: 'lox-lh2',
    name: 'LOX/LH2',
    description: 'Liquid oxygen / Liquid hydrogen',
    category: 'Liquid',
    gamma: 1.24,
    M_molar: 16.0, // Lower due to hydrogen
    Pc_typical: 20.0e6, // ~200 bar
    Tc_typical: 3600,
    nozzleEfficiency: 0.98,
    cStarEfficiency: 0.96,
    notes: 'High performance, used in upper stages (RL10, RS-25)',
  },
  'lox-methane': {
    id: 'lox-methane',
    name: 'LOX/CH4',
    description: 'Liquid oxygen / Methane',
    category: 'Liquid',
    gamma: 1.23,
    M_molar: 20.0,
    Pc_typical: 10.0e6, // ~100 bar
    Tc_typical: 3550,
    nozzleEfficiency: 0.98,
    cStarEfficiency: 0.95,
    notes: 'Emerging propellant for reusable engines (Raptor, BE-4)',
  },
  'n2o-htpb': {
    id: 'n2o-htpb',
    name: 'N2O/HTPB',
    description: 'Nitrous oxide / Hydroxyl-terminated polybutadiene',
    category: 'Hybrid',
    gamma: 1.20,
    M_molar: 28.0,
    Pc_typical: 3.5e6, // ~35 bar
    Tc_typical: 3200,
    nozzleEfficiency: 0.96,
    cStarEfficiency: 0.92,
    notes: 'Common in amateur and small commercial rockets',
  },
  'hydrazine': {
    id: 'hydrazine',
    name: 'Hydrazine (Monopropellant)',
    description: 'Decomposed hydrazine',
    category: 'Monopropellant',
    gamma: 1.25,
    M_molar: 16.0,
    Pc_typical: 2.0e6, // ~20 bar
    Tc_typical: 1200,
    nozzleEfficiency: 0.95,
    cStarEfficiency: 0.90,
    notes: 'Used in attitude control and small satellites',
  },
  'apcp': {
    id: 'apcp',
    name: 'APCP (Solid)',
    description: 'Ammonium perchlorate composite propellant',
    category: 'Solid',
    gamma: 1.18,
    M_molar: 30.0,
    Pc_typical: 7.0e6, // ~70 bar
    Tc_typical: 3300,
    nozzleEfficiency: 0.97,
    cStarEfficiency: 0.94,
    notes: 'Common solid rocket propellant',
  },
};

export const ENGINE_PRESETS: Record<string, EnginePreset> = {
  'merlin-like': {
    id: 'merlin-like',
    name: 'Merlin-like (LOX/RP-1)',
    description: 'Approximate Merlin 1D configuration',
    propellantId: 'lox-rp1',
    At: 0.5, // Approximate
    epsilon: 16,
    Pc: 9.7e6,
    Tc: 3500,
    nozzleEfficiency: 0.98,
    cStarEfficiency: 0.95,
    notes: 'First stage engine, sea-level optimized',
  },
  'rs25-like': {
    id: 'rs25-like',
    name: 'RS-25-like (LOX/LH2)',
    description: 'Approximate RS-25 (SSME) configuration',
    propellantId: 'lox-lh2',
    At: 0.4,
    epsilon: 77.5,
    Pc: 20.0e6,
    Tc: 3600,
    nozzleEfficiency: 0.99,
    cStarEfficiency: 0.97,
    notes: 'High-performance upper stage engine',
  },
  'rl10-like': {
    id: 'rl10-like',
    name: 'RL10-like (LOX/LH2)',
    description: 'Approximate RL10 configuration',
    propellantId: 'lox-lh2',
    At: 0.15,
    epsilon: 40,
    Pc: 4.0e6,
    Tc: 3600,
    nozzleEfficiency: 0.99,
    cStarEfficiency: 0.97,
    notes: 'Vacuum-optimized upper stage engine',
  },
  'raptor-like': {
    id: 'raptor-like',
    name: 'Raptor-like (LOX/CH4)',
    description: 'Approximate Raptor configuration',
    propellantId: 'lox-methane',
    At: 0.6,
    epsilon: 40,
    Pc: 30.0e6,
    Tc: 3550,
    nozzleEfficiency: 0.98,
    cStarEfficiency: 0.96,
    notes: 'Full-flow staged combustion, high pressure',
  },
  'small-solid': {
    id: 'small-solid',
    name: 'Small Solid Motor',
    description: 'Typical small solid rocket motor',
    propellantId: 'apcp',
    At: 0.01,
    epsilon: 8,
    Pc: 3.5e6,
    Tc: 3300,
    nozzleEfficiency: 0.96,
    cStarEfficiency: 0.93,
    notes: 'Amateur/small commercial solid motor',
  },
  'hybrid-small': {
    id: 'hybrid-small',
    name: 'Small Hybrid Motor',
    description: 'Typical small hybrid rocket',
    propellantId: 'n2o-htpb',
    At: 0.02,
    epsilon: 10,
    Pc: 3.5e6,
    Tc: 3200,
    nozzleEfficiency: 0.96,
    cStarEfficiency: 0.92,
    notes: 'Amateur/small commercial hybrid motor',
  },
};

