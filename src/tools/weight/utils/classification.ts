/**
 * Aircraft classification system
 * Classifies aircraft based on MTOW, geometry, and propulsion
 */

export type AircraftClass =
  | 'RC Plane'
  | 'Small Fixed-Wing UAV'
  | 'Large UAV (MALE/HALE)'
  | 'General Aviation (GA)'
  | 'Trainer (Turboprop)'
  | 'Jet Fighter'
  | 'Transport / Airliner'
  | 'Custom';

export interface AircraftClassification {
  aircraftClass: AircraftClass;
  classificationReason: string;
  recommendedDesignGuidelines: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ClassificationInputs {
  MTOW: number; // Maximum takeoff weight (N)
  wingspan: number; // Wingspan (m)
  wingArea: number; // Wing area (m²)
  propulsionType: 'piston' | 'turbofan' | 'turbojet' | 'electric' | 'glow';
  power: number; // Power (W) or Thrust (N)
  n_engines: number;
  aspectRatio?: number;
  isPressurized?: boolean;
}

/**
 * Classify aircraft based on inputs
 */
export function classifyAircraft(inputs: ClassificationInputs): AircraftClassification {
  const { MTOW, wingspan, wingArea, propulsionType, power, n_engines, aspectRatio, isPressurized } = inputs;
  
  const MTOW_kg = MTOW / 9.81; // Convert N to kg
  const power_kW = power / 1000; // Convert W to kW
  
  // RC Plane
  if (MTOW_kg < 15 && wingspan < 3 && power_kW < 5 && 
      (propulsionType === 'electric' || propulsionType === 'glow')) {
    return {
      aircraftClass: 'RC Plane',
      classificationReason: `MTOW ${MTOW_kg.toFixed(1)} kg < 15 kg, wingspan ${wingspan.toFixed(1)} m < 3 m, power ${power_kW.toFixed(1)} kW < 5 kW, ${propulsionType} propulsion`,
      recommendedDesignGuidelines: [
        'Use lightweight materials (balsa, foam, carbon fiber)',
        'High aspect ratio wings (AR > 8) for efficiency',
        'Simple control surfaces (ailerons, elevator, rudder)',
        'Minimal avionics (RC receiver, servos only)',
        'No pressurization or complex systems',
      ],
      confidence: 'high',
    };
  }
  
  // Small Fixed-Wing UAV / Drone
  if (MTOW_kg >= 15 && MTOW_kg < 200 && 
      (propulsionType === 'electric' || propulsionType === 'piston') &&
      (aspectRatio === undefined || aspectRatio > 6)) {
    return {
      aircraftClass: 'Small Fixed-Wing UAV',
      classificationReason: `MTOW ${MTOW_kg.toFixed(1)} kg in 15-200 kg range, ${propulsionType} propulsion, high aspect ratio wing`,
      recommendedDesignGuidelines: [
        'Optimize for endurance (high AR, low drag)',
        'Electric propulsion for quiet operation',
        'Autopilot and mission computer required',
        'Lightweight composite construction',
        'Minimal payload capacity',
        'Long-range communication systems',
      ],
      confidence: 'high',
    };
  }
  
  // Large UAV (MALE/HALE)
  if (MTOW_kg >= 200 && MTOW_kg < 8000 &&
      (aspectRatio === undefined || aspectRatio > 10)) {
    return {
      aircraftClass: 'Large UAV (MALE/HALE)',
      classificationReason: `MTOW ${MTOW_kg.toFixed(1)} kg in 200-8000 kg range, long endurance geometry (high AR)`,
      recommendedDesignGuidelines: [
        'Very high aspect ratio wings (AR > 15)',
        'Turboprop or high-efficiency piston engines',
        'Pressurization for high-altitude operations',
        'Advanced autopilot and flight management',
        'Satellite communication systems',
        'Redundant systems for reliability',
        'Long-range sensors and payloads',
      ],
      confidence: 'high',
    };
  }
  
  // General Aviation (GA)
  if (MTOW_kg >= 600 && MTOW_kg < 3500 &&
      propulsionType === 'piston' &&
      n_engines <= 2 &&
      !isPressurized) {
    return {
      aircraftClass: 'General Aviation (GA)',
      classificationReason: `MTOW ${MTOW_kg.toFixed(1)} kg in 600-3500 kg range, piston engine, conventional 1-4 seat design`,
      recommendedDesignGuidelines: [
        'Conventional tail configuration',
        'Aspect ratio 6-8 for efficiency',
        'Simple systems (no pressurization)',
        'VFR/IFR avionics packages',
        'Fixed or retractable landing gear',
        '1-4 seats typical',
        'Range: 500-1500 km',
      ],
      confidence: 'high',
    };
  }
  
  // Trainer (Turboprop)
  if (MTOW_kg >= 3000 && MTOW_kg < 7000 &&
      propulsionType === 'turbofan' && // Turboprop approximated as turbofan
      n_engines <= 2) {
    return {
      aircraftClass: 'Trainer (Turboprop)',
      classificationReason: `MTOW ${MTOW_kg.toFixed(1)} kg in 3000-7000 kg range, turboprop propulsion`,
      recommendedDesignGuidelines: [
        'Turboprop engines for reliability',
        'Tandem or side-by-side seating',
        'Stable, forgiving handling',
        'Dual controls',
        'Ejection seats for military trainers',
        'Aspect ratio 7-9',
        'Pressurization optional',
      ],
      confidence: 'medium',
    };
  }
  
  // Jet Fighter
  if (MTOW_kg > 8000 &&
      (propulsionType === 'turbojet' || propulsionType === 'turbofan') &&
      n_engines >= 1) {
    return {
      aircraftClass: 'Jet Fighter',
      classificationReason: `MTOW ${MTOW_kg.toFixed(1)} kg > 8000 kg, turbojet/turbofan propulsion, high G structure`,
      recommendedDesignGuidelines: [
        'High thrust-to-weight ratio (>1.0)',
        'Low aspect ratio wings (AR 2-4)',
        'High G-load capability (9+ G)',
        'Advanced flight control (FBW)',
        'Pressurization and life support',
        'Radar and weapons systems',
        'Afterburner capability',
        'Swept or delta wings',
      ],
      confidence: 'high',
    };
  }
  
  // Transport / Airliner
  if (MTOW_kg > 20000 &&
      (propulsionType === 'turbofan') &&
      n_engines >= 2) {
    return {
      aircraftClass: 'Transport / Airliner',
      classificationReason: `MTOW ${MTOW_kg.toFixed(1)} kg > 20000 kg, multi-engine turbofans`,
      recommendedDesignGuidelines: [
        'High bypass turbofan engines',
        'Pressurized cabin',
        'High aspect ratio wings (AR 8-12)',
        'Winglets for efficiency',
        'Advanced flight management systems',
        'Multiple redundancy systems',
        'Large passenger/cargo capacity',
        'Long range capability',
      ],
      confidence: 'high',
    };
  }
  
  // Custom / Unclassified
  return {
    aircraftClass: 'Custom',
    classificationReason: `Aircraft does not fit standard categories. MTOW: ${MTOW_kg.toFixed(1)} kg, Propulsion: ${propulsionType}`,
    recommendedDesignGuidelines: [
      'Review design requirements carefully',
      'Consider hybrid configurations',
      'Optimize for specific mission',
      'Consult with design experts',
    ],
    confidence: 'low',
  };
}
