// Airfoil dropdown list for L/D Ratio Analyzer
export interface AirfoilOption {
  id: string;
  name: string;
  custom?: boolean;
}

export const AIRFOILS: AirfoilOption[] = [
  { id: "naca0006", name: "NACA 0006 (Thin)" },
  { id: "naca0009", name: "NACA 0009" },
  { id: "naca0012", name: "NACA 0012 (Symmetric)" },
  { id: "naca0015", name: "NACA 0015" },

  { id: "naca2412", name: "NACA 2412 (Cambered)" },
  { id: "naca4412", name: "NACA 4412 (High Lift)" },
  { id: "naca4415", name: "NACA 4415" },
  { id: "naca23012", name: "NACA 23012" },

  { id: "naca63215", name: "NACA 63-215 (Laminar)" },

  { id: "clarky", name: "Clark Y" },
  { id: "s1223", name: "Selig S1223 (Low Re UAV)" },
  { id: "eppler320", name: "Eppler 320" },
  { id: "fx63137", name: "Wortmann FX 63-137" },

  { id: "du91w2250", name: "DU 91-W2-250 (Wind Turbine)" },

  { id: "supercritical", name: "NASA SC(2)-0412 (Supercritical)" },

  { id: "custom", name: "-- Custom Airfoil --", custom: true }
];

// Airfoil coefficient data for calculations
export interface AirfoilData {
  name: string;
  description: string;
  CL_alpha: number; // Lift coefficient per degree
  CL_0: number; // Zero-lift coefficient
  CD_0: number; // Zero-lift drag coefficient
  alpha_stall: number; // Stall angle in degrees
}

export const AIRFOIL_DATA: Record<string, AirfoilData> = {
  naca0006: {
    name: "NACA 0006 (Thin)",
    description: "Very thin symmetric airfoil, used in high-speed applications",
    CL_alpha: 0.102,
    CL_0: 0,
    CD_0: 0.0055,
    alpha_stall: 14,
  },
  naca0009: {
    name: "NACA 0009",
    description: "Thin symmetric airfoil",
    CL_alpha: 0.103,
    CL_0: 0,
    CD_0: 0.0058,
    alpha_stall: 14.5,
  },
  naca0012: {
    name: "NACA 0012 (Symmetric)",
    description: "General purpose symmetric airfoil, commonly used in aircraft tails",
    CL_alpha: 0.105,
    CL_0: 0,
    CD_0: 0.006,
    alpha_stall: 15,
  },
  naca0015: {
    name: "NACA 0015",
    description: "Thicker symmetric airfoil for structural strength",
    CL_alpha: 0.106,
    CL_0: 0,
    CD_0: 0.0062,
    alpha_stall: 15.5,
  },
  naca2412: {
    name: "NACA 2412 (Cambered)",
    description: "Popular cambered airfoil for general aviation wings",
    CL_alpha: 0.11,
    CL_0: 0.25,
    CD_0: 0.007,
    alpha_stall: 16,
  },
  naca4412: {
    name: "NACA 4412 (High Lift)",
    description: "High-lift cambered airfoil for slower aircraft",
    CL_alpha: 0.108,
    CL_0: 0.50,
    CD_0: 0.0075,
    alpha_stall: 14.5,
  },
  naca4415: {
    name: "NACA 4415 (High Lift)",
    description: "High-lift cambered airfoil for slower aircraft",
    CL_alpha: 0.108,
    CL_0: 0.55,
    CD_0: 0.008,
    alpha_stall: 14,
  },
  naca23012: {
    name: "NACA 23012",
    description: "Cambered airfoil with good lift characteristics",
    CL_alpha: 0.109,
    CL_0: 0.30,
    CD_0: 0.0072,
    alpha_stall: 15.5,
  },
  naca63215: {
    name: "NACA 63-215 (Laminar)",
    description: "Laminar flow airfoil for reduced drag",
    CL_alpha: 0.104,
    CL_0: 0.20,
    CD_0: 0.005,
    alpha_stall: 16,
  },
  clarky: {
    name: "Clark Y",
    description: "Classic airfoil for vintage and sport aircraft",
    CL_alpha: 0.103,
    CL_0: 0.30,
    CD_0: 0.0065,
    alpha_stall: 15.5,
  },
  s1223: {
    name: "Selig S1223 (Low Re UAV)",
    description: "Optimized for low Reynolds number applications (UAVs, model aircraft)",
    CL_alpha: 0.112,
    CL_0: 0.40,
    CD_0: 0.0085,
    alpha_stall: 13,
  },
  eppler320: {
    name: "Eppler 320",
    description: "High-performance glider airfoil",
    CL_alpha: 0.107,
    CL_0: 0.25,
    CD_0: 0.006,
    alpha_stall: 16.5,
  },
  fx63137: {
    name: "Wortmann FX 63-137",
    description: "High-performance sailplane airfoil",
    CL_alpha: 0.106,
    CL_0: 0.28,
    CD_0: 0.0058,
    alpha_stall: 17,
  },
  du91w2250: {
    name: "DU 91-W2-250 (Wind Turbine)",
    description: "Specialized airfoil for wind turbine blades",
    CL_alpha: 0.110,
    CL_0: 0.35,
    CD_0: 0.0075,
    alpha_stall: 14,
  },
  supercritical: {
    name: "NASA SC(2)-0412 (Supercritical)",
    description: "Modern high-speed airfoil for commercial jets",
    CL_alpha: 0.095,
    CL_0: 0.15,
    CD_0: 0.0055,
    alpha_stall: 17,
  },
};

