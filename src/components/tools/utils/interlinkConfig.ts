/**
 * SINGLE SOURCE OF TRUTH: Interlink field key constants
 * All interlink keys MUST be defined here as constants.
 * The FieldKey type is derived from these constants to ensure type safety.
 */
export const FIELD_KEYS = {
  massKg: 'massKg',
  weightN: 'weightN',
  wingAreaM2: 'wingAreaM2',
  wingLoadingKgm2: 'wingLoadingKgm2',
  totalThrustN: 'totalThrustN',
  perEngineThrustN: 'perEngineThrustN',
  numEngines: 'numEngines',
  cd0: 'cd0',
  k: 'k',
  clMax: 'clMax',
  ldClimb: 'ldClimb',
  stallSpeedMs: 'stallSpeedMs',
  densityKgM3: 'densityKgM3',
  vClimbVyMs: 'vClimbVyMs',
  vClimbVxMs: 'vClimbVxMs',
  rocVyMs: 'rocVyMs',
  gammaVy: 'gammaVy',
  takeoffRunwayM: 'takeoffRunwayM',
  clTo: 'clTo',
  muRoll: 'muRoll',
  pressurePa: 'pressurePa',
  other: 'other',
} as const;

/**
 * FieldKey type derived from FIELD_KEYS constants
 * This ensures compile-time type safety and prevents key mismatches
 */
export type FieldKey = typeof FIELD_KEYS[keyof typeof FIELD_KEYS];

export type ToolId =
  | 'wingloading'
  | 'thrust'
  | 'thrustloading'
  | 'ld'
  | 'climb'
  | 'atmosphere'
  | 'materials'
  | 'reynolds'
  | string;

export type ToolPublish = {
  toolId: ToolId;
  publishes: FieldKey[];
  label?: string;
};

export const INTERLINK_PUBLISHERS: ToolPublish[] = [
  { toolId: 'wingloading', publishes: [FIELD_KEYS.massKg, FIELD_KEYS.weightN, FIELD_KEYS.wingAreaM2, FIELD_KEYS.wingLoadingKgm2, FIELD_KEYS.clMax, FIELD_KEYS.stallSpeedMs], label: 'Wing Loading' },
  { toolId: 'thrust', publishes: [FIELD_KEYS.totalThrustN, FIELD_KEYS.perEngineThrustN, FIELD_KEYS.numEngines], label: 'Thrust Calculator' },
  { toolId: 'thrustloading', publishes: [FIELD_KEYS.totalThrustN, FIELD_KEYS.perEngineThrustN, FIELD_KEYS.numEngines, FIELD_KEYS.wingLoadingKgm2], label: 'Thrust Loading' },
  { toolId: 'ld', publishes: [FIELD_KEYS.cd0, FIELD_KEYS.k, FIELD_KEYS.clMax, FIELD_KEYS.ldClimb], label: 'L/D Analyzer' },
  { toolId: 'climb', publishes: [FIELD_KEYS.vClimbVyMs, FIELD_KEYS.vClimbVxMs, FIELD_KEYS.rocVyMs, FIELD_KEYS.gammaVy], label: 'Climb Performance' },
  { toolId: 'atmosphere', publishes: [FIELD_KEYS.densityKgM3, FIELD_KEYS.pressurePa], label: 'Atmosphere / ISA' },
  { toolId: 'materials', publishes: [FIELD_KEYS.other], label: 'Materials DB' }
];

/**
 * SINGLE SOURCE OF TRUTH: ToolId → route mapping
 * All navigation MUST use this mapping. Never hardcode routes.
 */
export const TOOL_ROUTES: Record<ToolId, string> = {
  wingloading: '/tools/launch?tool=wing',
  thrust: '/tools/launch?tool=thrust',
  thrustloading: '/tools/launch?tool=thrust',
  ld: '/tools/launch?tool=liftdrag',
  climb: '/tools/launch?tool=climb',
  atmosphere: '/tools/launch?tool=atmosphere',
  materials: '/tools/launch?tool=materials',
  reynolds: '/tools/launch?tool=reynolds',
};

