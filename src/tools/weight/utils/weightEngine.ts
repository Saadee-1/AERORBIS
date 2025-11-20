/**
 * Main weight estimation engine
 * Combines Raymer, Torenbeek, and Nicolai models
 */

import {
  calculateRaymerWingWeight,
  calculateRaymerFuselageWeight,
  calculateRaymerHorizontalTailWeight,
  calculateRaymerVerticalTailWeight,
  calculateRaymerLandingGearWeight,
  calculateRaymerFuelSystemWeight,
  calculateRaymerControlsWeight,
  calculateRaymerAvionicsWeight,
  RaymerWingInputs,
  RaymerFuselageInputs,
  RaymerTailInputs,
} from './raymer';
import {
  calculateTorenbeekWingWeight,
  TorenbeekWingInputs,
} from './torenbeek';
import {
  calculateNicolaiFixedEquipmentWeight,
  calculateNicolaiEngineWeight,
  NicolaiFixedEquipmentInputs,
} from './nicolai';
import { applyMaterialFactor } from '../data/materials';

export interface WeightEstimationInputs {
  // Geometry
  geometry: {
    S_w: number; // Wing area (m²)
    AR: number; // Aspect ratio
    lambda: number; // Taper ratio
    t_c: number; // Thickness-to-chord ratio
    b: number; // Wing span (m)
    S_ht: number; // Horizontal tail area (m²)
    AR_ht: number; // Horizontal tail aspect ratio
    S_vt: number; // Vertical tail area (m²)
    S_fuse: number; // Fuselage wetted area (m²)
    L_fuse: number; // Fuselage length (m)
  };
  
  // Flight conditions
  flight: {
    q: number; // Dynamic pressure (Pa)
    N_ult: number; // Ultimate load factor
    hasThrustRelief?: boolean;
  };
  
  // Propulsion
  propulsion: {
    type: 'piston' | 'turbofan' | 'turbojet' | 'electric';
    power: number; // Power (W) or Thrust (N)
    n_engines: number;
    includeNacelle?: boolean;
    includePylon?: boolean;
    includeMounts?: boolean;
  };
  
  // Systems
  systems: {
    W_crew: number; // Crew weight (N)
    avionics: {
      autopilot?: boolean;
      uavMissionComputer?: boolean;
      sensors?: boolean;
      cameras?: boolean;
      adsb?: boolean;
      ifr?: boolean;
    };
    controls: {
      isFBW?: boolean;
    };
    fixedEquipment: {
      n_seats: number;
      isPressurized?: boolean;
      hasOxygen?: boolean;
      hasHVAC?: boolean;
      batteryCapacity?: number; // Ah
      telemetry?: boolean;
      antennaPackage?: boolean;
    };
  };
  
  // Payload
  W_payload: number; // Payload weight (N)
  
  // Weight estimation method
  method: {
    wing: 'raymer' | 'torenbeek';
    fuselage: 'raymer' | 'torenbeek';
  };
  
  // Current takeoff weight estimate (for iteration)
  W_to: number; // Takeoff weight (N)
  
  // Material selections
  materials?: {
    wing?: string;
    fuselage?: string;
    htail?: string;
    vtail?: string;
    spars?: string;
    ribs?: string;
    gear?: string;
    nacelle?: string;
  };
}

export interface ComponentWeights {
  wing: number;
  fuselage: number;
  horizontalTail: number;
  verticalTail: number;
  landingGear: {
    main: number;
    nose: number;
    total: number;
  };
  engine: number;
  fuelSystem: number;
  controls: number;
  avionics: number;
  fixedEquipment: number;
  payload: number;
  empty: number;
}

export interface WeightEstimationResults {
  components: ComponentWeights;
  W_empty: number; // Empty weight (N)
  W_payload: number; // Payload weight (N)
  W_fuel: number; // Fuel weight (N) - calculated separately
  W_to: number; // Takeoff weight (N)
}

/**
 * Calculate all component weights
 */
export function calculateComponentWeights(inputs: WeightEstimationInputs): ComponentWeights {
  const { geometry, flight, propulsion, systems, W_payload, method, W_to, materials } = inputs;
  
  // Wing weight
  let W_wing_base: number;
  if (method.wing === 'raymer') {
    const wingInputs: RaymerWingInputs = {
      S_w: geometry.S_w,
      W_to,
      AR: geometry.AR,
      q: flight.q,
      lambda: geometry.lambda,
      t_c: geometry.t_c,
    };
    W_wing_base = calculateRaymerWingWeight(wingInputs);
  } else {
    const wingInputs: TorenbeekWingInputs = {
      S_w: geometry.S_w,
      t_c: geometry.t_c,
      W_to,
      b: geometry.b,
      N_ult: flight.N_ult,
      hasThrustRelief: flight.hasThrustRelief,
    };
    W_wing_base = calculateTorenbeekWingWeight(wingInputs);
  }
  
  // Apply material factor to wing
  const W_wing = applyMaterialFactor(W_wing_base, materials?.wing, 'wing');
  
  // Fuselage weight
  let W_fuselage_base: number;
  if (method.fuselage === 'raymer') {
    const fuseInputs: RaymerFuselageInputs = {
      S_fuse: geometry.S_fuse,
      W_to,
    };
    W_fuselage_base = calculateRaymerFuselageWeight(fuseInputs);
  } else {
    W_fuselage_base = calculateTorenbeekFuselageWeight(
      geometry.S_fuse,
      geometry.L_fuse,
      W_to,
      systems.fixedEquipment.isPressurized
    );
  }
  
  // Apply material factor to fuselage
  const W_fuselage = applyMaterialFactor(W_fuselage_base, materials?.fuselage, 'fuse');
  
  // Tail weights
  const tailInputs: RaymerTailInputs = {
    S_ht: geometry.S_ht,
    S_vt: geometry.S_vt,
    W_to,
    AR_ht: geometry.AR_ht,
  };
  const W_ht_base = calculateRaymerHorizontalTailWeight(tailInputs);
  const W_vt_base = calculateRaymerVerticalTailWeight(tailInputs);
  
  // Apply material factors to tails
  const W_ht = applyMaterialFactor(W_ht_base, materials?.htail, 'tail');
  const W_vt = applyMaterialFactor(W_vt_base, materials?.vtail, 'tail');
  
  // Landing gear
  const landingGear_base = calculateRaymerLandingGearWeight(W_to);
  
  // Apply material factor to landing gear
  const landingGear = {
    main: applyMaterialFactor(landingGear_base.main, materials?.gear, 'lg'),
    nose: applyMaterialFactor(landingGear_base.nose, materials?.gear, 'lg'),
    total: 0, // Will be calculated below
  };
  landingGear.total = landingGear.main + landingGear.nose;
  
  // Engine weight
  const W_engine_single_base = calculateNicolaiEngineWeight(
    propulsion.power,
    propulsion.type,
    propulsion.includeNacelle,
    propulsion.includePylon,
    propulsion.includeMounts
  );
  
  // Apply material factor to nacelle if included
  let W_engine_single = W_engine_single_base;
  if (propulsion.includeNacelle && materials?.nacelle) {
    // Only apply to nacelle portion (estimate ~10% of engine weight)
    const nacelleWeight = W_engine_single_base * 0.1;
    const nacelleWeightAdjusted = applyMaterialFactor(nacelleWeight, materials.nacelle, 'nacelle');
    W_engine_single = W_engine_single_base - nacelleWeight + nacelleWeightAdjusted;
  }
  
  const W_engine_total = W_engine_single * propulsion.n_engines;
  
  // Fuel system (will be updated after fuel calculation)
  const W_fuelSystem = calculateRaymerFuelSystemWeight(0); // Placeholder
  
  // Controls
  const W_controls = calculateRaymerControlsWeight(W_to, systems.controls.isFBW);
  
  // Avionics
  const W_avionics = calculateRaymerAvionicsWeight(systems.W_crew, systems.avionics);
  
  // Fixed equipment
  const fixedEquipInputs: NicolaiFixedEquipmentInputs = {
    ...systems.fixedEquipment,
    W_to,
  };
  const W_fixedEquipment = calculateNicolaiFixedEquipmentWeight(fixedEquipInputs);
  
  // Calculate empty weight
  const W_empty = W_wing +
    W_fuselage +
    W_ht +
    W_vt +
    landingGear.total +
    W_engine_total +
    W_fuelSystem +
    W_controls +
    W_avionics +
    W_fixedEquipment;
  
  return {
    wing: W_wing,
    fuselage: W_fuselage,
    horizontalTail: W_ht,
    verticalTail: W_vt,
    landingGear,
    engine: W_engine_total,
    fuelSystem: W_fuelSystem,
    controls: W_controls,
    avionics: W_avionics,
    fixedEquipment: W_fixedEquipment,
    payload: W_payload,
    empty: W_empty,
  };
}

/**
 * Update fuel system weight after fuel calculation
 */
export function updateFuelSystemWeight(components: ComponentWeights, W_fuel: number): ComponentWeights {
  return {
    ...components,
    fuelSystem: calculateRaymerFuelSystemWeight(W_fuel),
    empty: components.empty - components.fuelSystem + calculateRaymerFuelSystemWeight(W_fuel),
  };
}
