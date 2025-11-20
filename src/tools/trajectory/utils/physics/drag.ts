/**
 * Aerodynamic drag calculations
 */

/**
 * Calculate drag force
 * D = 0.5 * Cd * A * ρ * v²
 */
export function calculateDrag(
  Cd: number,
  area: number,
  density: number,
  velocity: number
): number {
  return 0.5 * Cd * area * density * velocity * velocity;
}

/**
 * Calculate dynamic pressure
 * q = 0.5 * ρ * v²
 */
export function calculateDynamicPressure(density: number, velocity: number): number {
  return 0.5 * density * velocity * velocity;
}

/**
 * Calculate Mach number
 * M = v / a
 */
export function calculateMachNumber(velocity: number, speedOfSound: number): number {
  return velocity / speedOfSound;
}

/**
 * Get speed of sound from temperature
 * a = √(γ * R * T)
 */
export function getSpeedOfSound(temperature: number, gamma: number = 1.4, R: number = 287.05): number {
  return Math.sqrt(gamma * R * temperature);
}

/**
 * Drag coefficient variation with Mach number (simplified)
 * Can be extended with more sophisticated models
 */
export function getDragCoefficient(Cd0: number, mach: number): number {
  // Simplified model: increase drag near Mach 1
  if (mach < 0.8) {
    return Cd0;
  } else if (mach < 1.2) {
    // Transonic drag rise
    const factor = 1 + 0.5 * Math.sin((mach - 0.8) * Math.PI / 0.4);
    return Cd0 * factor;
  } else {
    // Supersonic (simplified)
    return Cd0 * 0.8;
  }
}
