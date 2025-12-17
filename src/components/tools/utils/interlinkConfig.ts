export type FieldKey =
  | 'massKg'
  | 'weightN'
  | 'wingAreaM2'
  | 'wingLoadingKgm2'
  | 'totalThrustN'
  | 'perEngineThrustN'
  | 'numEngines'
  | 'cd0'
  | 'k'
  | 'clMax'
  | 'stallSpeedMs'
  | 'densityKgM3'
  | 'vClimbVyMs'
  | 'vClimbVxMs'
  | 'rocVyMs'
  | 'gammaVy'
  | 'takeoffRunwayM'
  | 'clTo'
  | 'muRoll'
  | 'other';

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
  { toolId: 'wingloading', publishes: ['massKg','weightN','wingAreaM2','wingLoadingKgm2','clMax','stallSpeedMs'], label: 'Wing Loading' },
  { toolId: 'thrust', publishes: ['totalThrustN','perEngineThrustN','numEngines'], label: 'Thrust Calculator' },
  { toolId: 'thrustloading', publishes: ['totalThrustN','perEngineThrustN','numEngines','wingLoadingKgm2'], label: 'Thrust Loading' },
  { toolId: 'ld', publishes: ['cd0','k','clMax'], label: 'L/D Analyzer' },
  { toolId: 'climb', publishes: ['vClimbVyMs','vClimbVxMs','rocVyMs','gammaVy'], label: 'Climb Performance' },
  { toolId: 'atmosphere', publishes: ['densityKgM3'], label: 'Atmosphere / ISA' },
  { toolId: 'materials', publishes: ['other'], label: 'Materials DB' }
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

