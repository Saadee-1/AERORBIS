/**
 * J2 Perturbation Modeling
 * Earth's oblateness effects on orbital elements
 */

import { OrbitalElements } from './kepler';

// J2 coefficient for Earth
const J2_EARTH = 1.08262668e-3;
const R_EARTH = 6378137; // m

export interface J2Perturbation {
  dOmega_dt: number; // Node regression rate (rad/s)
  dOmega_dt_deg: number; // Node regression rate (deg/day)
  domega_dt: number; // Perigee drift rate (rad/s)
  domega_dt_deg: number; // Perigee drift rate (deg/day)
}

/**
 * Calculate J2 perturbation rates
 */
export function calculateJ2Perturbation(
  elements: OrbitalElements,
  mu: number,
  J2: number = J2_EARTH,
  R: number = R_EARTH
): J2Perturbation {
  const { a, e, i } = elements;
  const n = Math.sqrt(mu / (a ** 3)); // Mean motion

  // Node regression
  const dOmega_dt = -(3 / 2) * J2 * n * ((R / (a * (1 - e ** 2))) ** 2) * Math.cos(i);
  const dOmega_dt_deg = (dOmega_dt * 180 / Math.PI) * 86400; // Convert to deg/day

  // Perigee drift
  const domega_dt = (3 / 4) * J2 * n * ((R / (a * (1 - e ** 2))) ** 2) * (5 * Math.cos(i) ** 2 - 1);
  const domega_dt_deg = (domega_dt * 180 / Math.PI) * 86400; // Convert to deg/day

  return {
    dOmega_dt,
    dOmega_dt_deg,
    domega_dt,
    domega_dt_deg,
  };
}

/**
 * Propagate orbital elements with J2 perturbation
 */
export function propagateWithJ2(
  elements: OrbitalElements,
  mu: number,
  dt: number,
  J2: number = J2_EARTH,
  R: number = R_EARTH
): OrbitalElements {
  const perturbation = calculateJ2Perturbation(elements, mu, J2, R);

  return {
    ...elements,
    Omega: elements.Omega + perturbation.dOmega_dt * dt,
    omega: elements.omega + perturbation.domega_dt * dt,
    M0: elements.M0 + Math.sqrt(mu / (elements.a ** 3)) * dt, // Mean anomaly advances
    epoch: elements.epoch + dt,
  };
}
