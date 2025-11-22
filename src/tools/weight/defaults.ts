import { WeightEstimationInputs } from './utils/weightEngine';
import { MissionProfile, createStandardMissionProfile } from './utils/iteration';

export const DEFAULT_WEIGHT_INPUTS: WeightEstimationInputs = {
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
    power: 120000,
    n_engines: 1,
    includeNacelle: true,
    includePylon: true,
    includeMounts: true,
  },
  systems: {
    W_crew: 800 * 9.81,
    avionics: {
      autopilot: false,
      uavMissionComputer: false,
      sensors: false,
      cameras: false,
      adsb: true,
      ifr: true,
    },
    controls: {
      isFBW: false,
    },
    fixedEquipment: {
      n_seats: 4,
      isPressurized: false,
      hasOxygen: false,
      hasHVAC: true,
      telemetry: false,
      antennaPackage: false,
    },
  },
  W_payload: 400 * 9.81,
  method: {
    wing: 'raymer',
    fuselage: 'raymer',
  },
  W_to: 1100 * 9.81,
};

export const DEFAULT_WEIGHT_MISSION_PROFILE: MissionProfile = createStandardMissionProfile({
  range: 1000,
  includeAlternate: true,
  reserve: 0.05,
});

export const createDefaultWeightInputs = (): WeightEstimationInputs =>
  JSON.parse(JSON.stringify(DEFAULT_WEIGHT_INPUTS));

export const createDefaultMissionProfile = (): MissionProfile =>
  JSON.parse(JSON.stringify(DEFAULT_WEIGHT_MISSION_PROFILE));


