/**
 * Airfoil Descriptions for NASA-style Aerodynamic Reports
 * 
 * Contains detailed information about each airfoil including:
 * - Family classification
 * - Camber and thickness (if known)
 * - Design purpose
 * - Recommended Reynolds range
 * - Intended applications
 * - Aerodynamic behavior summary
 */

export interface AirfoilDescription {
  name: string;
  family: 'NACA' | 'Selig' | 'Eppler' | 'Wortmann' | 'Supercritical' | 'Wind Turbine' | 'General Aviation';
  camber?: number; // Percentage camber
  thickness?: number; // Percentage thickness
  designPurpose: string;
  recommendedReRange: string;
  applications: string[];
  behaviorSummary: string;
}

export const AIRFOIL_DESCRIPTIONS: Record<string, AirfoilDescription> = {
  naca0006: {
    name: "NACA 0006",
    family: "NACA",
    camber: 0,
    thickness: 6,
    designPurpose: "Very thin symmetric airfoil for high-speed applications",
    recommendedReRange: "500k - 10M",
    applications: ["Supersonic aircraft control surfaces", "High-speed UAVs", "Racing aircraft"],
    behaviorSummary: "Extremely low drag at low angles of attack, but limited lift capability. Excellent for high-speed applications where drag minimization is critical."
  },
  naca0009: {
    name: "NACA 0009",
    family: "NACA",
    camber: 0,
    thickness: 9,
    designPurpose: "Thin symmetric airfoil with moderate thickness",
    recommendedReRange: "500k - 10M",
    applications: ["Aircraft tails", "Control surfaces", "High-speed wings"],
    behaviorSummary: "Low drag symmetric profile with good structural properties. Suitable for tail surfaces and high-speed applications."
  },
  naca0012: {
    name: "NACA 0012",
    family: "NACA",
    camber: 0,
    thickness: 12,
    designPurpose: "General purpose symmetric airfoil",
    recommendedReRange: "100k - 10M",
    applications: ["Aircraft tails", "Rotor blades", "General aviation", "UAVs"],
    behaviorSummary: "Well-documented symmetric airfoil with predictable behavior. Excellent for educational purposes and baseline comparisons."
  },
  naca0015: {
    name: "NACA 0015",
    family: "NACA",
    camber: 0,
    thickness: 15,
    designPurpose: "Thick symmetric airfoil for structural strength",
    recommendedReRange: "200k - 5M",
    applications: ["Thick wing sections", "Structural applications", "Low-speed aircraft"],
    behaviorSummary: "Thicker symmetric profile providing good structural properties while maintaining low drag characteristics."
  },
  naca2412: {
    name: "NACA 2412",
    family: "NACA",
    camber: 2,
    thickness: 12,
    designPurpose: "Popular cambered airfoil for general aviation",
    recommendedReRange: "200k - 5M",
    applications: ["General aviation aircraft", "Training aircraft", "Light sport aircraft"],
    behaviorSummary: "Classic cambered airfoil with good lift-to-drag ratio. Excellent for general aviation applications with balanced performance."
  },
  naca2415: {
    name: "NACA 2415",
    family: "NACA",
    camber: 2,
    thickness: 15,
    designPurpose: "Thicker variant of NACA 2412 for trainers and heavy-lift wings",
    recommendedReRange: "200k - 5M",
    applications: ["Training aircraft", "Heavy-lift aircraft", "Bush planes", "STOL aircraft"],
    behaviorSummary: "Thicker variant of NACA 2412 with higher maximum lift and softer stall, suitable for trainers and heavy-lift wings. The increased thickness provides better structural properties and more docile stall characteristics."
  },
  naca4412: {
    name: "NACA 4412",
    family: "NACA",
    camber: 4,
    thickness: 12,
    designPurpose: "High-lift cambered airfoil",
    recommendedReRange: "100k - 3M",
    applications: ["Slow-flying aircraft", "STOL aircraft", "Gliders"],
    behaviorSummary: "High camber provides excellent lift characteristics at low speeds. Ideal for aircraft requiring short takeoff and landing distances."
  },
  naca4415: {
    name: "NACA 4415",
    family: "NACA",
    camber: 4,
    thickness: 15,
    designPurpose: "High-lift thick cambered airfoil",
    recommendedReRange: "100k - 3M",
    applications: ["Slow-flying aircraft", "STOL aircraft", "Agricultural aircraft"],
    behaviorSummary: "Combines high camber with increased thickness for both high lift and structural strength. Suitable for low-speed, high-lift applications."
  },
  naca23012: {
    name: "NACA 23012",
    family: "NACA",
    camber: 2,
    thickness: 12,
    designPurpose: "Cambered airfoil with good lift characteristics",
    recommendedReRange: "200k - 5M",
    applications: ["General aviation", "Light aircraft", "Training aircraft"],
    behaviorSummary: "Moderate camber provides good lift-to-drag performance across a wide range of angles of attack."
  },
  naca63215: {
    name: "NACA 63-215",
    family: "NACA",
    camber: 2,
    thickness: 15,
    designPurpose: "Laminar flow airfoil for reduced drag",
    recommendedReRange: "500k - 10M",
    applications: ["High-performance aircraft", "Gliders", "Long-range aircraft"],
    behaviorSummary: "Designed to maintain laminar flow over a significant portion of the chord, resulting in reduced drag. Excellent for high-performance applications."
  },
  clarky: {
    name: "Clark Y",
    family: "General Aviation",
    camber: 3.4,
    thickness: 11.7,
    designPurpose: "Classic airfoil for vintage and sport aircraft",
    recommendedReRange: "200k - 3M",
    applications: ["Vintage aircraft", "Sport aircraft", "Homebuilt aircraft"],
    behaviorSummary: "Time-tested airfoil with predictable characteristics. Good balance of lift, drag, and structural properties for general aviation use."
  },
  s1223: {
    name: "Selig S1223",
    family: "Selig",
    camber: 4.2,
    thickness: 12.2,
    designPurpose: "Optimized for low Reynolds number applications",
    recommendedReRange: "50k - 500k",
    applications: ["UAVs", "Model aircraft", "Small drones", "Low-speed applications"],
    behaviorSummary: "Specifically designed for low Reynolds number flows. Excellent performance at small scales with high lift-to-drag ratios."
  },
  mh114: {
    name: "MH 114",
    family: "MH-series",
    camber: 3.8,
    thickness: 11.4,
    designPurpose: "Long-endurance UAV airfoil for loitering and surveillance missions",
    recommendedReRange: "100k - 3M",
    applications: ["Endurance UAVs", "Long-range surveillance", "Loitering munitions", "Solar-powered aircraft"],
    behaviorSummary: "Endurance UAV airfoil with good lift-to-drag at medium lift coefficients, suitable for long-range and loitering missions. Optimized for efficient cruise and extended flight times."
  },
  eppler320: {
    name: "Eppler 320",
    family: "Eppler",
    designPurpose: "High-performance glider airfoil",
    recommendedReRange: "200k - 2M",
    applications: ["Gliders", "Sailplanes", "High-performance aircraft"],
    behaviorSummary: "Optimized for maximum lift-to-drag ratio. Excellent for soaring applications where efficiency is paramount."
  },
  fx63137: {
    name: "Wortmann FX 63-137",
    family: "Wortmann",
    designPurpose: "High-performance sailplane airfoil",
    recommendedReRange: "300k - 3M",
    applications: ["Sailplanes", "Gliders", "High-performance aircraft"],
    behaviorSummary: "Advanced airfoil design with exceptional lift-to-drag characteristics. Ideal for long-range soaring and high-performance gliding."
  },
  sd7037: {
    name: "SD7037",
    family: "SD-series",
    camber: 3.2,
    thickness: 9.7,
    designPurpose: "Glider and electric sailplane airfoil for efficient small UAVs",
    recommendedReRange: "100k - 3M",
    applications: ["RC gliders", "Electric sailplanes", "Small UAVs", "Efficient cruisers"],
    behaviorSummary: "Glider and electric sailplane airfoil commonly used in RC gliders and efficient small UAVs, offering good L/D and smooth stall. Popular choice for electric sailplanes due to excellent efficiency across a wide speed range."
  },
  du91w2250: {
    name: "DU 91-W2-250",
    family: "Wind Turbine",
    designPurpose: "Specialized airfoil for wind turbine blades",
    recommendedReRange: "100k - 2M",
    applications: ["Wind turbine blades", "Renewable energy", "Large-scale rotors"],
    behaviorSummary: "Engineered for wind turbine applications with emphasis on power extraction efficiency. Optimized for the specific Reynolds number ranges encountered in wind energy systems."
  },
  supercritical: {
    name: "NASA SC(2)-0412",
    family: "Supercritical",
    camber: 0.4,
    thickness: 12,
    designPurpose: "Modern high-speed airfoil for commercial jets",
    recommendedReRange: "1M - 50M",
    applications: ["Commercial airliners", "Business jets", "High-speed transport"],
    behaviorSummary: "Revolutionary design that delays the onset of transonic drag rise. Allows higher cruise speeds with improved fuel efficiency. Critical for modern commercial aviation."
  },
  naca64012: {
    name: "NACA 64-012",
    family: "NACA",
    camber: 0,
    thickness: 12,
    designPurpose: "Symmetric laminar flow airfoil for high-speed racing",
    recommendedReRange: "100k - 3M",
    applications: ["Racing aircraft", "High-speed RC models", "Fast UAVs", "Speed competitions"],
    behaviorSummary: "Thin laminar NACA 6-series airfoil for high-speed RC racers. Symmetric profile with extended laminar flow region provides minimal drag at racing speeds while maintaining good structural properties."
  },
  naca65a012: {
    name: "NACA 65A012",
    family: "NACA",
    camber: 0.5,
    thickness: 12,
    designPurpose: "High-speed laminar flow airfoil for racing applications",
    recommendedReRange: "100k - 3M",
    applications: ["Racing aircraft", "High-speed RC models", "Performance aircraft", "Speed record attempts"],
    behaviorSummary: "Laminar-flow NACA 6-series airfoil optimized for high-speed racing. Features extended laminar flow region for minimal drag at cruise speeds. Excellent for competitive racing and high-performance applications."
  }
};

/**
 * Get airfoil description by ID
 */
export function getAirfoilDescription(airfoilId: string): AirfoilDescription | null {
  return AIRFOIL_DESCRIPTIONS[airfoilId] || null;
}

