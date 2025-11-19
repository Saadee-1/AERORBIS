/**
 * High-lift device data and presets
 */

import { HighLiftDevice } from '../utils/highLiftEffects';

/**
 * Typical flap deflection ranges (degrees)
 */
export const FLAP_DEFLECTION_RANGES = {
  'plain-flap': { min: 0, max: 50, typical: [0, 10, 20, 30] },
  'slotted-flap': { min: 0, max: 40, typical: [0, 15, 25, 35] },
  'fowler-flap': { min: 0, max: 40, typical: [0, 10, 20, 30] },
  'slat': { min: 0, max: 30, typical: [0, 10, 20] },
  'spoiler': { min: 0, max: 60, typical: [0, 15, 30, 45] },
};

/**
 * Typical high-lift device configurations
 */
export const HIGH_LIFT_PRESETS: Record<string, HighLiftDevice[]> = {
  'none': [],
  
  'simple-flaps': [
    {
      type: 'plain-flap',
      deflection: 20,
      span_fraction: 0.6,
      chord_fraction: 0.25,
      position: 'trailing-edge',
    },
  ],
  
  'slotted-flaps': [
    {
      type: 'slotted-flap',
      deflection: 25,
      span_fraction: 0.7,
      chord_fraction: 0.3,
      position: 'trailing-edge',
    },
  ],
  
  'fowler-flaps': [
    {
      type: 'fowler-flap',
      deflection: 30,
      span_fraction: 0.65,
      chord_fraction: 0.35,
      position: 'trailing-edge',
    },
  ],
  
  'slats-and-flaps': [
    {
      type: 'slat',
      deflection: 15,
      span_fraction: 0.8,
      chord_fraction: 0.15,
      position: 'leading-edge',
    },
    {
      type: 'slotted-flap',
      deflection: 25,
      span_fraction: 0.7,
      chord_fraction: 0.3,
      position: 'trailing-edge',
    },
  ],
  
  'spoilers': [
    {
      type: 'spoiler',
      deflection: 30,
      span_fraction: 0.5,
      chord_fraction: 0.2,
      position: 'trailing-edge',
    },
  ],
  
  'full-high-lift': [
    {
      type: 'slat',
      deflection: 20,
      span_fraction: 0.85,
      chord_fraction: 0.15,
      position: 'leading-edge',
    },
    {
      type: 'fowler-flap',
      deflection: 35,
      span_fraction: 0.7,
      chord_fraction: 0.4,
      position: 'trailing-edge',
    },
  ],
};

