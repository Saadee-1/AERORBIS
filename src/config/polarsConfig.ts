/**
 * Polar Data Configuration
 * Configuration for aerodynamic polar data loading and analysis
 */

export interface PolarsConfig {
  preferredRes: number[];
  autoSelectRe: boolean;
}

export const polarsConfig: PolarsConfig = {
  preferredRes: [100000, 500000, 1000000, 3000000],
  autoSelectRe: true,
};

export default polarsConfig;

