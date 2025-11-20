/**
 * Keplerian Orbital Propagation
 * Computes orbital elements and propagates orbits using Kepler's equations
 */

export interface OrbitalElements {
  a: number; // Semi-major axis (m)
  e: number; // Eccentricity
  i: number; // Inclination (rad)
  Omega: number; // Longitude of ascending node (rad)
  omega: number; // Argument of periapsis (rad)
  M0: number; // Mean anomaly at epoch (rad)
  epoch: number; // Epoch time (s)
}

export interface OrbitalState {
  position: [number, number, number]; // m
  velocity: [number, number, number]; // m/s
  time: number; // s
}

/**
 * Convert position and velocity to orbital elements
 */
export function stateToOrbitalElements(
  position: [number, number, number],
  velocity: [number, number, number],
  mu: number,
  time: number = 0
): OrbitalElements {
  const r = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
  const v = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);

  // Specific angular momentum
  const h = [
    position[1] * velocity[2] - position[2] * velocity[1],
    position[2] * velocity[0] - position[0] * velocity[2],
    position[0] * velocity[1] - position[1] * velocity[0],
  ];
  const hMag = Math.sqrt(h[0] ** 2 + h[1] ** 2 + h[2] ** 2);

  // Specific energy
  const energy = (v ** 2) / 2 - mu / r;

  // Semi-major axis
  const a = -mu / (2 * energy);

  // Eccentricity vector
  const eVec = [
    ((v ** 2 - mu / r) * position[0] - (position[0] * velocity[0] + position[1] * velocity[1] + position[2] * velocity[2]) * velocity[0]) / mu,
    ((v ** 2 - mu / r) * position[1] - (position[0] * velocity[0] + position[1] * velocity[1] + position[2] * velocity[2]) * velocity[1]) / mu,
    ((v ** 2 - mu / r) * position[2] - (position[0] * velocity[0] + position[1] * velocity[1] + position[2] * velocity[2]) * velocity[2]) / mu,
  ];
  const e = Math.sqrt(eVec[0] ** 2 + eVec[1] ** 2 + eVec[2] ** 2);

  // Inclination
  const i = Math.acos(h[2] / hMag);

  // Longitude of ascending node
  const n = [-h[1], h[0], 0];
  const nMag = Math.sqrt(n[0] ** 2 + n[1] ** 2);
  const Omega = nMag > 0 ? Math.atan2(n[1], n[0]) : 0;

  // Argument of periapsis
  const omega = nMag > 0 && e > 0
    ? Math.acos((n[0] * eVec[0] + n[1] * eVec[1]) / (nMag * e))
    : 0;
  const adjustedOmega = eVec[2] < 0 ? 2 * Math.PI - omega : omega;

  // True anomaly
  const nu = e > 0 && r > 0
    ? Math.acos((eVec[0] * position[0] + eVec[1] * position[1] + eVec[2] * position[2]) / (e * r))
    : 0;
  const adjustedNu = (position[0] * velocity[0] + position[1] * velocity[1] + position[2] * velocity[2]) < 0
    ? 2 * Math.PI - nu
    : nu;

  // Mean anomaly
  const E = 2 * Math.atan2(
    Math.sqrt((1 - e) / (1 + e)) * Math.tan(adjustedNu / 2),
    1
  );
  const M = E - e * Math.sin(E);

  return {
    a,
    e,
    i,
    Omega,
    omega: adjustedOmega,
    M0: M,
    epoch: time,
  };
}

/**
 * Convert orbital elements to position and velocity
 */
export function orbitalElementsToState(
  elements: OrbitalElements,
  mu: number,
  time: number
): OrbitalState {
  const { a, e, i, Omega, omega, M0, epoch } = elements;

  // Mean anomaly at time
  const n = Math.sqrt(mu / (a ** 3)); // Mean motion
  const M = M0 + n * (time - epoch);

  // Solve Kepler's equation for eccentric anomaly
  let E = M;
  for (let iter = 0; iter < 50; iter++) {
    const ENew = M + e * Math.sin(E);
    if (Math.abs(ENew - E) < 1e-10) break;
    E = ENew;
  }

  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2),
    1
  );

  // Distance
  const r = a * (1 - e * Math.cos(E));

  // Position in perifocal frame
  const p = a * (1 - e ** 2);
  const rPerifocal = [
    r * Math.cos(nu),
    r * Math.sin(nu),
    0,
  ];
  const vPerifocal = [
    -Math.sqrt(mu / p) * Math.sin(nu),
    Math.sqrt(mu / p) * (e + Math.cos(nu)),
    0,
  ];

  // Rotation matrices
  const cosOmega = Math.cos(Omega);
  const sinOmega = Math.sin(Omega);
  const cosOmegaSmall = Math.cos(omega);
  const sinOmegaSmall = Math.sin(omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);

  // Rotate to ECI frame
  const position: [number, number, number] = [
    (cosOmega * cosOmegaSmall - sinOmega * sinOmegaSmall * cosI) * rPerifocal[0] +
    (-cosOmega * sinOmegaSmall - sinOmega * cosOmegaSmall * cosI) * rPerifocal[1],
    (sinOmega * cosOmegaSmall + cosOmega * sinOmegaSmall * cosI) * rPerifocal[0] +
    (-sinOmega * sinOmegaSmall + cosOmega * cosOmegaSmall * cosI) * rPerifocal[1],
    (sinOmegaSmall * sinI) * rPerifocal[0] + (cosOmegaSmall * sinI) * rPerifocal[1],
  ];

  const velocity: [number, number, number] = [
    (cosOmega * cosOmegaSmall - sinOmega * sinOmegaSmall * cosI) * vPerifocal[0] +
    (-cosOmega * sinOmegaSmall - sinOmega * cosOmegaSmall * cosI) * vPerifocal[1],
    (sinOmega * cosOmegaSmall + cosOmega * sinOmegaSmall * cosI) * vPerifocal[0] +
    (-sinOmega * sinOmegaSmall + cosOmega * cosOmegaSmall * cosI) * vPerifocal[1],
    (sinOmegaSmall * sinI) * vPerifocal[0] + (cosOmegaSmall * sinI) * vPerifocal[1],
  ];

  return {
    position,
    velocity,
    time,
  };
}

/**
 * Calculate orbital period
 */
export function getOrbitalPeriod(a: number, mu: number): number {
  return 2 * Math.PI * Math.sqrt((a ** 3) / mu);
}

/**
 * Calculate apoapsis and periapsis
 */
export function getApsides(a: number, e: number): { apoapsis: number; periapsis: number } {
  return {
    apoapsis: a * (1 + e),
    periapsis: a * (1 - e),
  };
}
