/**
 * AI payload builder for Structural Weight Estimator
 */

import { buildAeroversePayload } from '@/ai/buildPayload';
import { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { WeightEstimationInputs, ComponentWeights } from './weightEngine';
import { AircraftClassification } from './classification';
import { IterationResult } from './iteration';
import { MATERIALS } from '../data/materials';

const formatCoefficient = (value?: number): string =>
  Number.isFinite(value as number) ? (value as number).toFixed(2) : '1.00';

export interface WeightEstimationResults {
  inputs: WeightEstimationInputs;
  components: ComponentWeights;
  W_empty: number;
  W_fuel: number;
  W_to: number;
  iteration: IterationResult;
  classification: AircraftClassification;
  cg?: {
    x_cg: number; // CG position (m from nose)
    x_cg_MAC: number; // CG position as fraction of MAC
    MAC: number; // Mean aerodynamic chord (m)
  };
  inertia?: {
    Ixx: number; // Roll moment of inertia (kg·m²)
    Iyy: number; // Pitch moment of inertia (kg·m²)
    Izz: number; // Yaw moment of inertia (kg·m²)
  };
}

/**
 * Build AI payload from weight estimation results
 */
export function buildWeightEstimatorPayload(
  results: WeightEstimationResults,
  requestId?: string
): AeroverseAIPayload {
  const { inputs, components, W_empty, W_fuel, W_to, iteration, classification, cg, inertia } = results;
  
  // Format calculation steps
  const steps: string[] = [
    'Wing weight: Raymer/Torenbeek model based on area, AR, taper ratio, and t/c',
  ];
  
    if (inputs.materials?.wing) {
      steps.push(`Wing material: ${MATERIALS[inputs.materials.wing]?.name || inputs.materials.wing} (coefficient: ${formatCoefficient(MATERIALS[inputs.materials.wing]?.wingCoeff)})`);
  }
  
  steps.push(
    `Wing weight = ${(components.wing / 9.81).toFixed(1)} kg`,
    'Fuselage weight: Raymer/Torenbeek model based on wetted area',
  );
  
    if (inputs.materials?.fuselage) {
      steps.push(`Fuselage material: ${MATERIALS[inputs.materials.fuselage]?.name || inputs.materials.fuselage} (coefficient: ${formatCoefficient(MATERIALS[inputs.materials.fuselage]?.fuseCoeff)})`);
  }
  
  steps.push(
    `Fuselage weight = ${(components.fuselage / 9.81).toFixed(1)} kg`,
    'Tail weights: Raymer model for horizontal and vertical tails',
  );
  
  if (inputs.materials?.htail || inputs.materials?.vtail) {
    const tailMaterials: string[] = [];
    if (inputs.materials.htail) {
      tailMaterials.push(`HT: ${MATERIALS[inputs.materials.htail]?.name || inputs.materials.htail}`);
    }
    if (inputs.materials.vtail) {
      tailMaterials.push(`VT: ${MATERIALS[inputs.materials.vtail]?.name || inputs.materials.vtail}`);
    }
    if (tailMaterials.length > 0) {
      steps.push(`Tail materials: ${tailMaterials.join(', ')}`);
    }
  }
  
  steps.push(
    `Horizontal tail = ${(components.horizontalTail / 9.81).toFixed(1)} kg, Vertical tail = ${(components.verticalTail / 9.81).toFixed(1)} kg`,
    'Landing gear: Raymer model (main + nose gear)',
  );
  
    if (inputs.materials?.gear) {
      steps.push(`Landing gear material: ${MATERIALS[inputs.materials.gear]?.name || inputs.materials.gear} (coefficient: ${formatCoefficient(MATERIALS[inputs.materials.gear]?.lgCoeff)})`);
  }
  
  steps.push(
    `Landing gear = ${(components.landingGear.total / 9.81).toFixed(1)} kg`,
    'Engine weight: Nicolai model based on power/thrust and type',
    `Engine weight = ${(components.engine / 9.81).toFixed(1)} kg`,
    'Systems weights: Raymer/Nicolai models for controls, avionics, fixed equipment',
    `Controls = ${(components.controls / 9.81).toFixed(1)} kg, Avionics = ${(components.avionics / 9.81).toFixed(1)} kg, Fixed Equipment = ${(components.fixedEquipment / 9.81).toFixed(1)} kg`,
    `Empty weight = ${(W_empty / 9.81).toFixed(1)} kg`,
    'Mission fuel calculation: Weight fraction method',
    `Fuel weight = ${(W_fuel / 9.81).toFixed(1)} kg`,
    'Takeoff weight iteration: Fixed-point iteration',
    `Final W_TO = ${(W_to / 9.81).toFixed(1)} kg (converged in ${iteration.iterations} iterations)`,
    `Aircraft classification: ${classification.aircraftClass}`,
  );
  
  if (cg) {
    steps.push(`CG position: ${cg.x_cg.toFixed(2)} m from nose, ${(cg.x_cg_MAC * 100).toFixed(1)}% MAC`);
  }
  
  if (inertia) {
    steps.push(`Moments of inertia: Ixx = ${inertia.Ixx.toFixed(1)} kg·m², Iyy = ${inertia.Iyy.toFixed(1)} kg·m², Izz = ${inertia.Izz.toFixed(1)} kg·m²`);
    formattedResults['Ixx (Roll)'] = `${inertia.Ixx.toFixed(1)} kg·m²`;
    formattedResults['Iyy (Pitch)'] = `${inertia.Iyy.toFixed(1)} kg·m²`;
    formattedResults['Izz (Yaw)'] = `${inertia.Izz.toFixed(1)} kg·m²`;
  }
  
  // Format inputs for display
  const formattedInputs: Record<string, any> = {
    'Wing area': `${inputs.geometry.S_w.toFixed(2)} m²`,
    'Aspect ratio': inputs.geometry.AR.toFixed(2),
    'Taper ratio': inputs.geometry.lambda.toFixed(2),
    'Thickness/chord': inputs.geometry.t_c.toFixed(3),
    'Wing span': `${inputs.geometry.b.toFixed(2)} m`,
    'Horizontal tail area': `${inputs.geometry.S_ht.toFixed(2)} m²`,
    'Vertical tail area': `${inputs.geometry.S_vt.toFixed(2)} m²`,
    'Fuselage wetted area': `${inputs.geometry.S_fuse.toFixed(2)} m²`,
    'Fuselage length': `${inputs.geometry.L_fuse.toFixed(2)} m`,
    'Dynamic pressure': `${(inputs.flight.q / 1000).toFixed(1)} kPa`,
    'Ultimate load factor': inputs.flight.N_ult.toFixed(2),
    'Propulsion type': inputs.propulsion.type,
    'Power/Thrust': `${(inputs.propulsion.power / 1000).toFixed(1)} kW/kN`,
    'Number of engines': inputs.propulsion.n_engines,
    'Payload weight': `${(inputs.W_payload / 9.81).toFixed(1)} kg`,
    'Weight method (wing)': inputs.method.wing,
    'Weight method (fuselage)': inputs.method.fuselage,
  };
  
  // Add material information
  if (inputs.materials) {
    if (inputs.materials.wing) {
      formattedInputs['Wing material'] = MATERIALS[inputs.materials.wing]?.name || inputs.materials.wing;
    }
    if (inputs.materials.fuselage) {
      formattedInputs['Fuselage material'] = MATERIALS[inputs.materials.fuselage]?.name || inputs.materials.fuselage;
    }
    if (inputs.materials.htail) {
      formattedInputs['Horizontal tail material'] = MATERIALS[inputs.materials.htail]?.name || inputs.materials.htail;
    }
    if (inputs.materials.vtail) {
      formattedInputs['Vertical tail material'] = MATERIALS[inputs.materials.vtail]?.name || inputs.materials.vtail;
    }
    if (inputs.materials.spars) {
      formattedInputs['Spars material'] = MATERIALS[inputs.materials.spars]?.name || inputs.materials.spars;
    }
    if (inputs.materials.ribs) {
      formattedInputs['Ribs material'] = MATERIALS[inputs.materials.ribs]?.name || inputs.materials.ribs;
    }
    if (inputs.materials.gear) {
      formattedInputs['Landing gear material'] = MATERIALS[inputs.materials.gear]?.name || inputs.materials.gear;
    }
    if (inputs.materials.nacelle) {
      formattedInputs['Nacelle material'] = MATERIALS[inputs.materials.nacelle]?.name || inputs.materials.nacelle;
    }
  }
  
  // Format results for display
  const formattedResults: Record<string, any> = {
    'Wing weight': `${(components.wing / 9.81).toFixed(1)} kg`,
    'Fuselage weight': `${(components.fuselage / 9.81).toFixed(1)} kg`,
    'Horizontal tail weight': `${(components.horizontalTail / 9.81).toFixed(1)} kg`,
    'Vertical tail weight': `${(components.verticalTail / 9.81).toFixed(1)} kg`,
    'Landing gear weight': `${(components.landingGear.total / 9.81).toFixed(1)} kg`,
    'Engine weight': `${(components.engine / 9.81).toFixed(1)} kg`,
    'Fuel system weight': `${(components.fuelSystem / 9.81).toFixed(1)} kg`,
    'Controls weight': `${(components.controls / 9.81).toFixed(1)} kg`,
    'Avionics weight': `${(components.avionics / 9.81).toFixed(1)} kg`,
    'Fixed equipment weight': `${(components.fixedEquipment / 9.81).toFixed(1)} kg`,
    'Empty weight': `${(W_empty / 9.81).toFixed(1)} kg`,
    'Fuel weight': `${(W_fuel / 9.81).toFixed(1)} kg`,
    'Takeoff weight': `${(W_to / 9.81).toFixed(1)} kg`,
    'Aircraft class': classification.aircraftClass,
    'Iteration converged': iteration.converged ? 'Yes' : 'No',
    'Iterations required': iteration.iterations.toString(),
  };
  
  if (cg) {
    formattedResults['CG position'] = `${cg.x_cg.toFixed(2)} m (${(cg.x_cg_MAC * 100).toFixed(1)}% MAC)`;
  }
  
  // Collect warnings
  const allWarnings: string[] = [];
  
  if (!iteration.converged) {
    allWarnings.push('Takeoff weight iteration did not converge');
  }
  
  if (cg && (cg.x_cg_MAC < 0.05 || cg.x_cg_MAC > 0.45)) {
    allWarnings.push(`CG position (${(cg.x_cg_MAC * 100).toFixed(1)}% MAC) is outside typical range (5-45% MAC)`);
  }
  
  if (classification.confidence === 'low') {
    allWarnings.push('Aircraft classification confidence is low - review design parameters');
  }
  
  // Add classification recommendations
  const recommendedGuidelines = classification.recommendedDesignGuidelines.join('; ');
  
  return buildAeroversePayload({
    requestId,
    toolName: 'Structural Weight Estimator',
    toolVersion: '1.0.0',
    inputs: formattedInputs,
    results: formattedResults,
    units: {
      'Wing area': 'm²',
      'Wing span': 'm',
      'Fuselage length': 'm',
      'Dynamic pressure': 'kPa',
      'Power/Thrust': 'kW/kN',
      'Weight': 'kg',
      'CG position': 'm',
    },
    charts: [
      { id: 'component-weights', title: 'Component Weight Breakdown', dataSummary: 'Bar chart of all component weights' },
      { id: 'weight-pie', title: 'Weight Distribution', dataSummary: 'Pie chart of empty weight breakdown' },
      { id: 'iteration-convergence', title: 'W_TO Iteration Convergence', dataSummary: 'Convergence curve showing iteration history' },
      { id: 'cg-position', title: 'CG Position on MAC', dataSummary: 'CG position relative to mean aerodynamic chord' },
      { id: 'mission-fuel', title: 'Mission Fuel Fractions', dataSummary: 'Fuel consumption by mission phase' },
      { id: 'wing-loading', title: 'Wing Loading vs W_TO', dataSummary: 'Wing loading as function of takeoff weight' },
    ],
    configuration: {
      preset: 'custom', // Will be set by UI
      aircraftClass: classification.aircraftClass,
      classificationReason: classification.classificationReason,
      recommendedDesignGuidelines: classification.recommendedDesignGuidelines,
      weightMethod: {
        wing: inputs.method.wing,
        fuselage: inputs.method.fuselage,
      },
      materials: inputs.materials || {},
      materialEffects: inputs.materials ? {
        wing: inputs.materials.wing ? MATERIALS[inputs.materials.wing]?.wingCoeff : 1.0,
        fuselage: inputs.materials.fuselage ? MATERIALS[inputs.materials.fuselage]?.fuseCoeff : 1.0,
        tail: inputs.materials.htail ? MATERIALS[inputs.materials.htail]?.tailCoeff : 1.0,
        gear: inputs.materials.gear ? MATERIALS[inputs.materials.gear]?.lgCoeff : 1.0,
      } : {},
    },
    metadata: {
      steps,
      unitsSystem: 'SI',
      approxLevel: 'semi-empirical',
      confidence: classification.confidence,
      warnings: allWarnings,
    },
  });
}
