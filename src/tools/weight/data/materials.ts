/**
 * Material Database for Structural Weight Estimator
 * 
 * Contains material properties and weight adjustment coefficients
 * for different aircraft components
 */

export interface Material {
  id: string;
  name: string;
  category: 'rc' | 'uav' | 'full-size' | 'composite' | 'metal';
  density: number; // kg/m³
  strengthFactor: number; // Relative to baseline (1.0 = baseline)
  stiffnessFactor: number; // Relative to baseline
  // Component-specific weight coefficients (1.0 = baseline, <1.0 = lighter, >1.0 = heavier)
  wingCoeff: number;
  fuseCoeff: number;
  tailCoeff: number;
  lgCoeff: number; // Landing gear
  nacelleCoeff: number;
  sparsCoeff: number;
  ribsCoeff: number;
  notes?: string;
}

export const MATERIALS: Record<string, Material> = {
  // RC Plane Materials
  'balsa-wood': {
    id: 'balsa-wood',
    name: 'Balsa Wood',
    category: 'rc',
    density: 160,
    strengthFactor: 0.3,
    stiffnessFactor: 0.4,
    wingCoeff: 0.85,
    fuseCoeff: 0.80,
    tailCoeff: 0.85,
    lgCoeff: 0.90,
    nacelleCoeff: 0.85,
    sparsCoeff: 0.75,
    ribsCoeff: 0.80,
    notes: 'Lightweight, easy to work with, traditional RC material',
  },
  'depron-sheet': {
    id: 'depron-sheet',
    name: 'Depron Sheet',
    category: 'rc',
    density: 30,
    strengthFactor: 0.2,
    stiffnessFactor: 0.15,
    wingCoeff: 0.60,
    fuseCoeff: 0.55,
    tailCoeff: 0.60,
    lgCoeff: 1.20,
    nacelleCoeff: 0.60,
    sparsCoeff: 1.50,
    ribsCoeff: 0.65,
    notes: 'Very lightweight foam, requires reinforcement for structure',
  },
  'foamboard': {
    id: 'foamboard',
    name: 'Foamboard',
    category: 'rc',
    density: 50,
    strengthFactor: 0.25,
    stiffnessFactor: 0.20,
    wingCoeff: 0.70,
    fuseCoeff: 0.65,
    tailCoeff: 0.70,
    lgCoeff: 1.10,
    nacelleCoeff: 0.70,
    sparsCoeff: 1.30,
    ribsCoeff: 0.75,
    notes: 'Common RC material, paper-faced foam',
  },
  'fiberglass-rc': {
    id: 'fiberglass-rc',
    name: 'Fiberglass (RC)',
    category: 'rc',
    density: 1800,
    strengthFactor: 1.2,
    stiffnessFactor: 1.0,
    wingCoeff: 1.10,
    fuseCoeff: 1.15,
    tailCoeff: 1.10,
    lgCoeff: 1.05,
    nacelleCoeff: 1.10,
    sparsCoeff: 0.95,
    ribsCoeff: 1.00,
    notes: 'Strong but heavier, used for high-performance RC',
  },
  'carbon-fiber-rods': {
    id: 'carbon-fiber-rods',
    name: 'Carbon Fiber Rods',
    category: 'rc',
    density: 1600,
    strengthFactor: 2.5,
    stiffnessFactor: 3.0,
    wingCoeff: 0.90,
    fuseCoeff: 0.95,
    tailCoeff: 0.90,
    lgCoeff: 0.85,
    nacelleCoeff: 0.90,
    sparsCoeff: 0.70,
    ribsCoeff: 0.85,
    notes: 'Excellent for spars and structural reinforcement',
  },
  'plywood-lite': {
    id: 'plywood-lite',
    name: 'Plywood Lite',
    category: 'rc',
    density: 500,
    strengthFactor: 0.8,
    stiffnessFactor: 0.9,
    wingCoeff: 1.05,
    fuseCoeff: 1.00,
    tailCoeff: 1.05,
    lgCoeff: 0.95,
    nacelleCoeff: 1.05,
    sparsCoeff: 0.90,
    ribsCoeff: 0.95,
    notes: 'Lightweight plywood for RC construction',
  },
  '3d-printed-pla': {
    id: '3d-printed-pla',
    name: '3D Printed PLA',
    category: 'rc',
    density: 1250,
    strengthFactor: 0.6,
    stiffnessFactor: 0.5,
    wingCoeff: 1.20,
    fuseCoeff: 1.25,
    tailCoeff: 1.20,
    lgCoeff: 1.15,
    nacelleCoeff: 1.20,
    sparsCoeff: 1.10,
    ribsCoeff: 1.15,
    notes: '3D printed parts, heavier but precise',
  },
  '3d-printed-petg': {
    id: '3d-printed-petg',
    name: '3D Printed PETG',
    category: 'rc',
    density: 1270,
    strengthFactor: 0.7,
    stiffnessFactor: 0.6,
    wingCoeff: 1.18,
    fuseCoeff: 1.22,
    tailCoeff: 1.18,
    lgCoeff: 1.12,
    nacelleCoeff: 1.18,
    sparsCoeff: 1.08,
    ribsCoeff: 1.12,
    notes: 'Stronger than PLA, better for structural parts',
  },

  // UAV Materials
  'carbon-fiber-skin': {
    id: 'carbon-fiber-skin',
    name: 'Carbon Fiber Skin',
    category: 'uav',
    density: 1600,
    strengthFactor: 2.5,
    stiffnessFactor: 3.0,
    wingCoeff: 0.75,
    fuseCoeff: 0.80,
    tailCoeff: 0.75,
    lgCoeff: 0.85,
    nacelleCoeff: 0.75,
    sparsCoeff: 0.65,
    ribsCoeff: 0.70,
    notes: 'Lightweight carbon fiber for UAV structures',
  },
  'glass-fiber': {
    id: 'glass-fiber',
    name: 'Glass Fiber',
    category: 'uav',
    density: 2000,
    strengthFactor: 1.5,
    stiffnessFactor: 1.2,
    wingCoeff: 0.95,
    fuseCoeff: 1.00,
    tailCoeff: 0.95,
    lgCoeff: 1.00,
    nacelleCoeff: 0.95,
    sparsCoeff: 0.90,
    ribsCoeff: 0.95,
    notes: 'Fiberglass composite for UAV',
  },
  'carbon-kevlar': {
    id: 'carbon-kevlar',
    name: 'Carbon-Kevlar Hybrid',
    category: 'uav',
    density: 1500,
    strengthFactor: 2.8,
    stiffnessFactor: 2.5,
    wingCoeff: 0.70,
    fuseCoeff: 0.75,
    tailCoeff: 0.70,
    lgCoeff: 0.80,
    nacelleCoeff: 0.70,
    sparsCoeff: 0.60,
    ribsCoeff: 0.65,
    notes: 'High-performance hybrid composite',
  },
  'foam-core-composite': {
    id: 'foam-core-composite',
    name: 'Foam Core Composite',
    category: 'uav',
    density: 100,
    strengthFactor: 0.8,
    stiffnessFactor: 0.6,
    wingCoeff: 0.55,
    fuseCoeff: 0.50,
    tailCoeff: 0.55,
    lgCoeff: 1.30,
    nacelleCoeff: 0.55,
    sparsCoeff: 1.50,
    ribsCoeff: 0.60,
    notes: 'Sandwich construction with foam core',
  },
  'honeycomb-sandwich': {
    id: 'honeycomb-sandwich',
    name: 'Honeycomb Sandwich',
    category: 'uav',
    density: 80,
    strengthFactor: 1.0,
    stiffnessFactor: 1.2,
    wingCoeff: 0.50,
    fuseCoeff: 0.45,
    tailCoeff: 0.50,
    lgCoeff: 1.40,
    nacelleCoeff: 0.50,
    sparsCoeff: 1.60,
    ribsCoeff: 0.55,
    notes: 'Ultra-lightweight honeycomb core construction',
  },
  'cf-tube': {
    id: 'cf-tube',
    name: 'Carbon Fiber Tube',
    category: 'uav',
    density: 1600,
    strengthFactor: 2.5,
    stiffnessFactor: 3.0,
    wingCoeff: 0.85,
    fuseCoeff: 0.90,
    tailCoeff: 0.85,
    lgCoeff: 0.80,
    nacelleCoeff: 0.85,
    sparsCoeff: 0.60,
    ribsCoeff: 0.75,
    notes: 'CF tubes for spars and structural members',
  },
  'cf-plate': {
    id: 'cf-plate',
    name: 'Carbon Fiber Plate',
    category: 'uav',
    density: 1600,
    strengthFactor: 2.5,
    stiffnessFactor: 3.0,
    wingCoeff: 0.80,
    fuseCoeff: 0.85,
    tailCoeff: 0.75,
    lgCoeff: 0.90,
    nacelleCoeff: 0.80,
    sparsCoeff: 0.70,
    ribsCoeff: 0.75,
    notes: 'CF plate for tail surfaces and control surfaces',
  },

  // Full-Size Aircraft Materials
  'aluminum-2024-t3': {
    id: 'aluminum-2024-t3',
    name: 'Aluminum 2024-T3',
    category: 'full-size',
    density: 2780,
    strengthFactor: 1.0,
    stiffnessFactor: 1.0,
    wingCoeff: 1.0,
    fuseCoeff: 1.0,
    tailCoeff: 1.0,
    lgCoeff: 1.0,
    nacelleCoeff: 1.0,
    sparsCoeff: 1.0,
    ribsCoeff: 1.0,
    notes: 'Baseline material - standard aircraft aluminum',
  },
  'aluminum-7075-t6': {
    id: 'aluminum-7075-t6',
    name: 'Aluminum 7075-T6',
    category: 'full-size',
    density: 2810,
    strengthFactor: 1.3,
    stiffnessFactor: 1.05,
    wingCoeff: 0.92,
    fuseCoeff: 0.95,
    tailCoeff: 0.92,
    lgCoeff: 0.88,
    nacelleCoeff: 0.92,
    sparsCoeff: 0.85,
    ribsCoeff: 0.90,
    notes: 'High-strength aluminum alloy',
  },
  'titanium-alloy': {
    id: 'titanium-alloy',
    name: 'Titanium Alloy',
    category: 'full-size',
    density: 4500,
    strengthFactor: 2.0,
    stiffnessFactor: 1.5,
    wingCoeff: 1.15,
    fuseCoeff: 1.20,
    tailCoeff: 1.15,
    lgCoeff: 0.95,
    nacelleCoeff: 1.15,
    sparsCoeff: 0.90,
    ribsCoeff: 1.00,
    notes: 'High-strength, heat-resistant, used in critical areas',
  },
  'steel-4130': {
    id: 'steel-4130',
    name: 'Steel 4130',
    category: 'full-size',
    density: 7850,
    strengthFactor: 1.8,
    stiffnessFactor: 1.2,
    wingCoeff: 1.40,
    fuseCoeff: 1.45,
    tailCoeff: 1.40,
    lgCoeff: 0.85,
    nacelleCoeff: 1.40,
    sparsCoeff: 0.80,
    ribsCoeff: 1.20,
    notes: 'Chromoly steel, heavy but very strong',
  },
  'carbon-fiber-layup': {
    id: 'carbon-fiber-layup',
    name: 'Carbon Fiber Layup',
    category: 'full-size',
    density: 1600,
    strengthFactor: 2.5,
    stiffnessFactor: 3.0,
    wingCoeff: 0.75,
    fuseCoeff: 0.80,
    tailCoeff: 0.75,
    lgCoeff: 0.85,
    nacelleCoeff: 0.75,
    sparsCoeff: 0.65,
    ribsCoeff: 0.70,
    notes: 'Advanced composite for modern aircraft',
  },
  'aluminum-lithium': {
    id: 'aluminum-lithium',
    name: 'Aluminum-Lithium Alloy',
    category: 'full-size',
    density: 2600,
    strengthFactor: 1.1,
    stiffnessFactor: 1.1,
    wingCoeff: 0.88,
    fuseCoeff: 0.90,
    tailCoeff: 0.88,
    lgCoeff: 0.92,
    nacelleCoeff: 0.88,
    sparsCoeff: 0.85,
    ribsCoeff: 0.88,
    notes: 'Lightweight aluminum-lithium for modern aircraft',
  },
  'steel-piano-wire': {
    id: 'steel-piano-wire',
    name: 'Steel Piano Wire',
    category: 'rc',
    density: 7850,
    strengthFactor: 2.5,
    stiffnessFactor: 1.8,
    wingCoeff: 1.30,
    fuseCoeff: 1.35,
    tailCoeff: 1.30,
    lgCoeff: 0.75,
    nacelleCoeff: 1.30,
    sparsCoeff: 0.70,
    ribsCoeff: 1.20,
    notes: 'High-strength wire for landing gear and control linkages',
  },
};

/**
 * Get material by ID
 */
export function getMaterial(id: string): Material | undefined {
  return MATERIALS[id];
}

/**
 * Get all materials
 */
export function getAllMaterials(): Material[] {
  return Object.values(MATERIALS);
}

/**
 * Get materials by category
 */
export function getMaterialsByCategory(category: Material['category']): Material[] {
  return Object.values(MATERIALS).filter(m => m.category === category);
}

/**
 * Apply material factor to component weight
 */
export function applyMaterialFactor(
  baseWeight: number,
  materialId: string | undefined,
  componentType: 'wing' | 'fuse' | 'tail' | 'lg' | 'nacelle' | 'spars' | 'ribs'
): number {
  if (!materialId) {
    return baseWeight; // No material selected, use baseline
  }

  const material = MATERIALS[materialId];
  if (!material) {
    return baseWeight; // Material not found, use baseline
  }

  const coeffMap: Record<string, number> = {
    wing: material.wingCoeff,
    fuse: material.fuseCoeff,
    tail: material.tailCoeff,
    lg: material.lgCoeff,
    nacelle: material.nacelleCoeff,
    spars: material.sparsCoeff,
    ribs: material.ribsCoeff,
  };

  const coefficient = coeffMap[componentType] ?? 1.0;
  return baseWeight * coefficient;
}

/**
 * Default material selections by aircraft type
 */
export const DEFAULT_MATERIALS: Record<string, {
  wing: string;
  fuselage: string;
  htail: string;
  vtail: string;
  spars: string;
  ribs: string;
  gear: string;
  nacelle: string;
}> = {
  'rc-plane': {
    wing: 'depron-sheet',
    fuselage: 'balsa-wood',
    htail: 'depron-sheet',
    vtail: 'depron-sheet',
    spars: 'carbon-fiber-rods',
    ribs: 'balsa-wood',
    gear: 'steel-piano-wire',
    nacelle: 'foamboard',
  },
  'fpv-wing': {
    wing: 'foam-core-composite',
    fuselage: 'foam-core-composite',
    htail: 'foam-core-composite',
    vtail: 'foam-core-composite',
    spars: 'cf-tube',
    ribs: 'foam-core-composite',
    gear: 'steel-piano-wire',
    nacelle: 'foamboard',
  },
  'small-uav': {
    wing: 'carbon-fiber-skin',
    fuselage: 'glass-fiber',
    htail: 'carbon-fiber-plate',
    vtail: 'carbon-fiber-plate',
    spars: 'cf-tube',
    ribs: 'carbon-fiber-skin',
    gear: 'aluminum-2024-t3',
    nacelle: 'carbon-fiber-skin',
  },
  'large-uav': {
    wing: 'carbon-fiber-layup',
    fuselage: 'carbon-fiber-layup',
    htail: 'carbon-fiber-layup',
    vtail: 'carbon-fiber-layup',
    spars: 'cf-tube',
    ribs: 'carbon-fiber-layup',
    gear: 'aluminum-7075-t6',
    nacelle: 'carbon-fiber-layup',
  },
  'ga-aircraft': {
    wing: 'aluminum-2024-t3',
    fuselage: 'aluminum-2024-t3',
    htail: 'aluminum-2024-t3',
    vtail: 'aluminum-2024-t3',
    spars: 'aluminum-2024-t3',
    ribs: 'aluminum-2024-t3',
    gear: 'steel-4130',
    nacelle: 'aluminum-2024-t3',
  },
  'business-jet': {
    wing: 'aluminum-lithium',
    fuselage: 'aluminum-lithium',
    htail: 'aluminum-lithium',
    vtail: 'aluminum-lithium',
    spars: 'aluminum-7075-t6',
    ribs: 'aluminum-lithium',
    gear: 'steel-4130',
    nacelle: 'aluminum-lithium',
  },
  'fighter': {
    wing: 'carbon-fiber-layup',
    fuselage: 'titanium-alloy',
    htail: 'carbon-fiber-layup',
    vtail: 'carbon-fiber-layup',
    spars: 'titanium-alloy',
    ribs: 'carbon-fiber-layup',
    gear: 'titanium-alloy',
    nacelle: 'titanium-alloy',
  },
  'transport': {
    wing: 'aluminum-lithium',
    fuselage: 'aluminum-lithium',
    htail: 'aluminum-lithium',
    vtail: 'aluminum-lithium',
    spars: 'aluminum-7075-t6',
    ribs: 'aluminum-lithium',
    gear: 'steel-4130',
    nacelle: 'aluminum-lithium',
  },
};
