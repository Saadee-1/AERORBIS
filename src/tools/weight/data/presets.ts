/**
 * Aircraft presets for Structural Weight Estimator
 * Includes typical configurations for common aircraft types
 */

import { WeightEstimationInputs } from '../utils/weightEngine';
import { DEFAULT_MATERIALS } from './materials';

export interface AircraftPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  inputs: Partial<WeightEstimationInputs>;
}

export const AIRCRAFT_PRESETS: Record<string, AircraftPreset> = {
  'rc-plane': {
    id: 'rc-plane',
    name: 'RC Plane',
    description: 'Typical radio-controlled model aircraft',
    category: 'RC',
    inputs: {
      geometry: {
        S_w: 0.5, // m²
        AR: 8.0,
        lambda: 0.6,
        t_c: 0.12,
        b: 2.0, // m
        S_ht: 0.08,
        AR_ht: 4.0,
        S_vt: 0.06,
        S_fuse: 0.3,
        L_fuse: 0.8,
      },
      flight: {
        q: 500, // Pa (low speed)
        N_ult: 6.0,
        hasThrustRelief: false,
      },
      propulsion: {
        type: 'electric',
        power: 2000, // W (2 kW)
        n_engines: 1,
        includeNacelle: false,
        includePylon: false,
        includeMounts: true,
      },
      systems: {
        W_crew: 0, // No crew
        avionics: {
          uavMissionComputer: false,
          sensors: false,
        },
        controls: {
          isFBW: false,
        },
        fixedEquipment: {
          n_seats: 0,
          isPressurized: false,
          hasOxygen: false,
          hasHVAC: false,
          telemetry: false,
          antennaPackage: false,
        },
      },
      W_payload: 10 * 9.81, // 10 N (camera, etc.)
      method: {
        wing: 'raymer',
        fuselage: 'raymer',
      },
      W_to: 50 * 9.81, // Initial guess: 50 N
      materials: DEFAULT_MATERIALS['rc-plane'],
    },
  },
  
  'fpv-wing': {
    id: 'fpv-wing',
    name: 'FPV Wing',
    description: 'First-person view flying wing',
    category: 'RC',
    inputs: {
      geometry: {
        S_w: 0.3,
        AR: 6.0,
        lambda: 0.4,
        t_c: 0.10,
        b: 1.3,
        S_ht: 0, // Flying wing
        AR_ht: 0,
        S_vt: 0.04,
        S_fuse: 0.1,
        L_fuse: 0.4,
      },
      flight: {
        q: 600,
        N_ult: 8.0,
        hasThrustRelief: false,
      },
      propulsion: {
        type: 'electric',
        power: 1500,
        n_engines: 1,
      },
      systems: {
        W_crew: 0,
        avionics: {
          cameras: true,
          sensors: true,
        },
        controls: {
          isFBW: false,
        },
        fixedEquipment: {
          n_seats: 0,
          telemetry: true,
        },
      },
      W_payload: 5 * 9.81,
      method: {
        wing: 'raymer',
        fuselage: 'raymer',
      },
      W_to: 30 * 9.81,
      materials: DEFAULT_MATERIALS['fpv-wing'],
    },
  },
  
  'small-uav': {
    id: 'small-uav',
    name: 'Small UAV',
    description: 'Small unmanned aerial vehicle (15-200 kg)',
    category: 'UAV',
    inputs: {
      geometry: {
        S_w: 2.0,
        AR: 12.0,
        lambda: 0.5,
        t_c: 0.15,
        b: 4.9,
        S_ht: 0.4,
        AR_ht: 5.0,
        S_vt: 0.3,
        S_fuse: 1.5,
        L_fuse: 2.5,
      },
      flight: {
        q: 2000,
        N_ult: 4.4,
        hasThrustRelief: false,
      },
      propulsion: {
        type: 'electric',
        power: 10000, // 10 kW
        n_engines: 1,
      },
      systems: {
        W_crew: 0,
        avionics: {
          autopilot: true,
          uavMissionComputer: true,
          sensors: true,
          cameras: true,
          adsb: true,
        },
        controls: {
          isFBW: true,
        },
        fixedEquipment: {
          n_seats: 0,
          telemetry: true,
          antennaPackage: true,
        },
      },
      W_payload: 50 * 9.81,
      method: {
        wing: 'raymer',
        fuselage: 'raymer',
      },
      W_to: 150 * 9.81,
      materials: DEFAULT_MATERIALS['small-uav'],
    },
  },
  
  'large-uav': {
    id: 'large-uav',
    name: 'Large UAV (MALE/HALE)',
    description: 'Medium to high altitude long endurance UAV',
    category: 'UAV',
    inputs: {
      geometry: {
        S_w: 25.0,
        AR: 20.0,
        lambda: 0.4,
        t_c: 0.12,
        b: 22.4,
        S_ht: 5.0,
        AR_ht: 6.0,
        S_vt: 3.0,
        S_fuse: 15.0,
        L_fuse: 10.0,
      },
      flight: {
        q: 5000,
        N_ult: 3.0,
        hasThrustRelief: true,
      },
      propulsion: {
        type: 'piston',
        power: 150000, // 150 kW
        n_engines: 1,
      },
      systems: {
        W_crew: 0,
        avionics: {
          autopilot: true,
          uavMissionComputer: true,
          sensors: true,
          cameras: true,
          adsb: true,
        },
        controls: {
          isFBW: true,
        },
        fixedEquipment: {
          n_seats: 0,
          isPressurized: true,
          telemetry: true,
          antennaPackage: true,
        },
      },
      W_payload: 500 * 9.81,
      method: {
        wing: 'torenbeek',
        fuselage: 'torenbeek',
      },
      W_to: 3000 * 9.81,
      materials: DEFAULT_MATERIALS['large-uav'],
    },
  },
  
  'ga-aircraft': {
    id: 'ga-aircraft',
    name: 'GA Aircraft (C172-class)',
    description: 'General aviation aircraft similar to Cessna 172',
    category: 'GA',
    inputs: {
      geometry: {
        S_w: 16.2,
        AR: 7.5,
        lambda: 0.6,
        t_c: 0.15,
        b: 11.0,
        S_ht: 3.5,
        AR_ht: 4.0,
        S_vt: 1.8,
        S_fuse: 25.0,
        L_fuse: 8.0,
      },
      flight: {
        q: 8000,
        N_ult: 4.4,
        hasThrustRelief: false,
      },
      propulsion: {
        type: 'piston',
        power: 120000, // 120 kW (160 hp)
        n_engines: 1,
      },
      systems: {
        W_crew: 800 * 9.81, // 2 crew
        avionics: {
          autopilot: false,
          ifr: true,
          adsb: true,
        },
        controls: {
          isFBW: false,
        },
        fixedEquipment: {
          n_seats: 4,
          isPressurized: false,
          hasOxygen: false,
          hasHVAC: true,
        },
      },
      W_payload: 400 * 9.81,
      method: {
        wing: 'raymer',
        fuselage: 'raymer',
      },
      W_to: 1100 * 9.81,
      materials: DEFAULT_MATERIALS['ga-aircraft'],
    },
  },
  
  'business-jet': {
    id: 'business-jet',
    name: 'Business Jet',
    description: 'Light business jet aircraft',
    category: 'Jet',
    inputs: {
      geometry: {
        S_w: 30.0,
        AR: 7.0,
        lambda: 0.3,
        t_c: 0.12,
        b: 14.5,
        S_ht: 8.0,
        AR_ht: 4.5,
        S_vt: 5.0,
        S_fuse: 60.0,
        L_fuse: 15.0,
      },
      flight: {
        q: 15000,
        N_ult: 4.4,
        hasThrustRelief: true,
      },
      propulsion: {
        type: 'turbofan',
        power: 40000, // 40 kN thrust
        n_engines: 2,
      },
      systems: {
        W_crew: 200 * 9.81, // 2 crew
        avionics: {
          autopilot: true,
          ifr: true,
          adsb: true,
        },
        controls: {
          isFBW: true,
        },
        fixedEquipment: {
          n_seats: 8,
          isPressurized: true,
          hasOxygen: true,
          hasHVAC: true,
        },
      },
      W_payload: 1000 * 9.81,
      method: {
        wing: 'raymer',
        fuselage: 'raymer',
      },
      W_to: 7000 * 9.81,
      materials: DEFAULT_MATERIALS['business-jet'],
    },
  },
  
  'fighter': {
    id: 'fighter',
    name: 'Fighter (F-16-class)',
    description: 'Fighter aircraft similar to F-16',
    category: 'Fighter',
    inputs: {
      geometry: {
        S_w: 27.9,
        AR: 3.2,
        lambda: 0.2,
        t_c: 0.04,
        b: 9.8,
        S_ht: 5.9,
        AR_ht: 2.0,
        S_vt: 5.0,
        S_fuse: 40.0,
        L_fuse: 15.0,
      },
      flight: {
        q: 50000,
        N_ult: 9.0,
        hasThrustRelief: true,
      },
      propulsion: {
        type: 'turbofan',
        power: 130000, // 130 kN thrust
        n_engines: 1,
      },
      systems: {
        W_crew: 900 * 9.81, // 1 pilot with gear
        avionics: {
          autopilot: true,
          sensors: true,
          ifr: true,
        },
        controls: {
          isFBW: true,
        },
        fixedEquipment: {
          n_seats: 1,
          isPressurized: true,
          hasOxygen: true,
          hasHVAC: true,
        },
      },
      W_payload: 3000 * 9.81, // Weapons, fuel
      method: {
        wing: 'torenbeek',
        fuselage: 'torenbeek',
      },
      W_to: 16000 * 9.81,
      materials: DEFAULT_MATERIALS['fighter'],
    },
  },
  
  'transport': {
    id: 'transport',
    name: 'Transport / Airliner',
    description: 'Large transport aircraft',
    category: 'Transport',
    inputs: {
      geometry: {
        S_w: 260.0,
        AR: 9.5,
        lambda: 0.3,
        t_c: 0.12,
        b: 50.0,
        S_ht: 40.0,
        AR_ht: 4.5,
        S_vt: 25.0,
        S_fuse: 500.0,
        L_fuse: 50.0,
      },
      flight: {
        q: 20000,
        N_ult: 3.75,
        hasThrustRelief: true,
      },
      propulsion: {
        type: 'turbofan',
        power: 300000, // 300 kN per engine
        n_engines: 2,
      },
      systems: {
        W_crew: 2000 * 9.81, // 4 crew
        avionics: {
          autopilot: true,
          ifr: true,
          adsb: true,
        },
        controls: {
          isFBW: true,
        },
        fixedEquipment: {
          n_seats: 200,
          isPressurized: true,
          hasOxygen: true,
          hasHVAC: true,
        },
      },
      W_payload: 20000 * 9.81,
      method: {
        wing: 'torenbeek',
        fuselage: 'torenbeek',
      },
      W_to: 80000 * 9.81,
      materials: DEFAULT_MATERIALS['transport'],
    },
  },
};

/**
 * Get preset by ID
 */
export function getPreset(id: string): AircraftPreset | undefined {
  return AIRCRAFT_PRESETS[id];
}

/**
 * Get all presets
 */
export function getAllPresets(): AircraftPreset[] {
  return Object.values(AIRCRAFT_PRESETS);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: string): AircraftPreset[] {
  return Object.values(AIRCRAFT_PRESETS).filter(p => p.category === category);
}
