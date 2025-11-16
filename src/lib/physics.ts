// Aerospace physics equations and constants

export const CONSTANTS = {
  G: 6.67430e-11, // Gravitational constant (m³/kg/s²)
  g0: 9.80665, // Standard gravity (m/s²)
  EARTH_RADIUS: 6371000, // Earth radius (m)
  EARTH_MU: 3.986004418e14, // Earth's gravitational parameter (m³/s²)
  AIR_DENSITY_SEA_LEVEL: 1.225, // kg/m³
  SPEED_OF_SOUND_SEA_LEVEL: 343, // m/s
};

// Rocket thrust equation: F = ṁVe + (Pe - Pa)Ae
export function calculateThrust(
  massFlowRate: number,
  exhaustVelocity: number,
  exitPressure: number,
  ambientPressure: number,
  exitArea: number
): number {
  const momentumThrust = massFlowRate * exhaustVelocity;
  const pressureThrust = (exitPressure - ambientPressure) * exitArea;
  return momentumThrust + pressureThrust;
}

// Specific impulse and exhaust velocity relationship
export function ispToVe(isp: number): number {
  return isp * CONSTANTS.g0;
}

export function veToIsp(ve: number): number {
  return ve / CONSTANTS.g0;
}

// Lift equation: L = ½ρV²SCL
export function calculateLift(
  density: number,
  velocity: number,
  area: number,
  liftCoefficient: number
): number {
  return 0.5 * density * velocity * velocity * area * liftCoefficient;
}

// Drag equation: D = ½ρV²SCD
export function calculateDrag(
  density: number,
  velocity: number,
  area: number,
  dragCoefficient: number
): number {
  return 0.5 * density * velocity * velocity * area * dragCoefficient;
}

// Lift coefficient with linear approximation
export function calculateCL(cl0: number, alpha: number, clAlpha: number): number {
  return cl0 + clAlpha * (alpha * Math.PI / 180); // Convert alpha to radians
}

// Drag coefficient with induced drag
export function calculateCD(cd0: number, cl: number, aspectRatio: number, e: number = 0.85): number {
  const k = 1 / (Math.PI * aspectRatio * e);
  return cd0 + k * cl * cl;
}

// Prandtl-Glauert compressibility correction
export function prandtlGlauertCorrection(mach: number): number {
  if (mach >= 1.0) return 1.0; // Don't apply in supersonic
  return 1 / Math.sqrt(1 - mach * mach);
}

// Wing loading: W/S = ½ρV²CLmax
export function calculateWingLoading(
  density: number,
  velocity: number,
  clMax: number
): number {
  return 0.5 * density * velocity * velocity * clMax;
}

// Stall speed: Vstall = √(2W/S / ρCLmax)
export function calculateStallSpeed(
  wingLoading: number,
  density: number,
  clMax: number
): number {
  return Math.sqrt((2 * wingLoading) / (density * clMax));
}

// Orbital mechanics - Semi-major axis from altitude
export function altitudeToSemiMajorAxis(altitude: number, bodyRadius: number): number {
  return bodyRadius + altitude;
}

// Orbital period (Kepler's third law): T = 2π√(a³/μ)
export function calculateOrbitalPeriod(semiMajorAxis: number, mu: number): number {
  return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
}

// Orbital velocity (vis-viva equation): v = √(μ(2/r - 1/a))
export function calculateOrbitalVelocity(
  radius: number,
  semiMajorAxis: number,
  mu: number
): number {
  return Math.sqrt(mu * (2 / radius - 1 / semiMajorAxis));
}

// Distance from focus at true anomaly
export function radiusAtTrueAnomaly(
  semiMajorAxis: number,
  eccentricity: number,
  trueAnomaly: number
): number {
  return (semiMajorAxis * (1 - eccentricity * eccentricity)) /
    (1 + eccentricity * Math.cos(trueAnomaly));
}

// Eccentric anomaly from mean anomaly (Newton-Raphson)
export function eccentricAnomalyFromMean(
  meanAnomaly: number,
  eccentricity: number,
  tolerance: number = 1e-8
): number {
  let E = meanAnomaly;
  let delta = 1;
  let iterations = 0;
  const maxIterations = 100;

  while (Math.abs(delta) > tolerance && iterations < maxIterations) {
    delta = (E - eccentricity * Math.sin(E) - meanAnomaly) /
      (1 - eccentricity * Math.cos(E));
    E -= delta;
    iterations++;
  }

  return E;
}

// True anomaly from eccentric anomaly
export function trueAnomalyFromEccentric(
  eccentricAnomaly: number,
  eccentricity: number
): number {
  return 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
  );
}

// Hohmann transfer Δv
export function hohmannTransferDeltaV(
  r1: number,
  r2: number,
  mu: number
): { deltaV1: number; deltaV2: number; total: number } {
  const v1 = Math.sqrt(mu / r1);
  const v2 = Math.sqrt(mu / r2);
  const aTransfer = (r1 + r2) / 2;
  
  const vTransfer1 = Math.sqrt(mu * (2 / r1 - 1 / aTransfer));
  const vTransfer2 = Math.sqrt(mu * (2 / r2 - 1 / aTransfer));
  
  const deltaV1 = Math.abs(vTransfer1 - v1);
  const deltaV2 = Math.abs(v2 - vTransfer2);
  
  return {
    deltaV1,
    deltaV2,
    total: deltaV1 + deltaV2,
  };
}

// Periapsis and apoapsis
export function calculatePeriapsis(semiMajorAxis: number, eccentricity: number): number {
  return semiMajorAxis * (1 - eccentricity);
}

export function calculateApoapsis(semiMajorAxis: number, eccentricity: number): number {
  return semiMajorAxis * (1 + eccentricity);
}
