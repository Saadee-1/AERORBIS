/**
 * Planetary models for trajectory simulation
 * Includes Earth, Moon, Mars, and custom planet support
 */

export interface Planet {
  id: string;
  name: string;
  mu: number; // Gravitational parameter (m³/s²)
  radius: number; // Planetary radius (m)
  rotationRate: number; // Rotation rate (rad/s)
  hasAtmosphere: boolean;
  atmosphere?: {
    model: 'exponential' | 'table';
    rho0?: number; // Surface density (kg/m³)
    scaleHeight?: number; // Scale height (m)
    table?: Array<{
      altitude: number; // m
      density: number; // kg/m³
      temperature: number; // K
      pressure: number; // Pa
    }>;
  };
  surfaceGravity: number; // m/s²
}

export const PLANETS: Record<string, Planet> = {
  earth: {
    id: 'earth',
    name: 'Earth',
    mu: 3.986004418e14, // m³/s²
    radius: 6371000, // m
    rotationRate: 7.292115e-5, // rad/s
    hasAtmosphere: true,
    surfaceGravity: 9.80665, // m/s²
    atmosphere: {
      model: 'table',
      rho0: 1.225, // kg/m³ at sea level
      scaleHeight: 8400, // m (approximate)
      // Simplified US Standard Atmosphere 1976 table (key altitudes)
      table: [
        { altitude: 0, density: 1.225, temperature: 288.15, pressure: 101325 },
        { altitude: 1000, density: 1.112, temperature: 281.65, pressure: 89880 },
        { altitude: 2000, density: 1.007, temperature: 275.15, pressure: 79500 },
        { altitude: 5000, density: 0.736, temperature: 255.65, pressure: 54050 },
        { altitude: 10000, density: 0.413, temperature: 223.15, pressure: 26436 },
        { altitude: 15000, density: 0.195, temperature: 216.65, pressure: 12044 },
        { altitude: 20000, density: 0.088, temperature: 216.65, pressure: 5475 },
        { altitude: 30000, density: 0.018, temperature: 226.65, pressure: 1172 },
        { altitude: 40000, density: 0.004, temperature: 250.35, pressure: 287 },
        { altitude: 50000, density: 0.001, temperature: 270.65, pressure: 80 },
        { altitude: 60000, density: 0.0003, temperature: 247.02, pressure: 22 },
        { altitude: 80000, density: 0.000018, temperature: 198.64, pressure: 1 },
      ],
    },
  },
  moon: {
    id: 'moon',
    name: 'Moon',
    mu: 4.9048695e12, // m³/s²
    radius: 1737100, // m
    rotationRate: 2.6617e-6, // rad/s
    hasAtmosphere: false,
    surfaceGravity: 1.622, // m/s²
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    mu: 4.282837e13, // m³/s²
    radius: 3389500, // m
    rotationRate: 7.088e-5, // rad/s
    hasAtmosphere: true,
    surfaceGravity: 3.711, // m/s²
    atmosphere: {
      model: 'exponential',
      rho0: 0.02, // kg/m³ (CO₂ atmosphere, very thin)
      scaleHeight: 11000, // m
    },
  },
};

/**
 * Get planet by ID
 */
export function getPlanet(id: string): Planet | undefined {
  return PLANETS[id];
}

/**
 * Calculate atmospheric density at altitude
 */
export function getAtmosphericDensity(planet: Planet, altitude: number): number {
  if (!planet.hasAtmosphere || !planet.atmosphere) {
    return 0;
  }

  if (planet.atmosphere.model === 'exponential') {
    const { rho0, scaleHeight } = planet.atmosphere;
    if (!rho0 || !scaleHeight) return 0;
    return rho0 * Math.exp(-altitude / scaleHeight);
  } else if (planet.atmosphere.model === 'table' && planet.atmosphere.table) {
    const table = planet.atmosphere.table;
    
    // Below lowest altitude
    if (altitude < table[0].altitude) {
      return table[0].density;
    }
    
    // Above highest altitude
    if (altitude > table[table.length - 1].altitude) {
      // Extrapolate exponentially
      const last = table[table.length - 1];
      const secondLast = table[table.length - 2];
      const scaleHeight = (last.altitude - secondLast.altitude) / 
        Math.log(secondLast.density / last.density);
      return last.density * Math.exp(-(altitude - last.altitude) / scaleHeight);
    }
    
    // Interpolate between table entries
    for (let i = 0; i < table.length - 1; i++) {
      if (altitude >= table[i].altitude && altitude <= table[i + 1].altitude) {
        const t = (altitude - table[i].altitude) / 
          (table[i + 1].altitude - table[i].altitude);
        // Logarithmic interpolation for density
        const logDensity = Math.log(table[i].density) + 
          t * (Math.log(table[i + 1].density) - Math.log(table[i].density));
        return Math.exp(logDensity);
      }
    }
  }

  return 0;
}

/**
 * Calculate gravity at altitude
 */
export function getGravity(planet: Planet, altitude: number): number {
  const r = planet.radius + altitude;
  return (planet.mu / (r * r));
}

/**
 * Calculate gravitational acceleration vector (for 3D)
 */
export function getGravityVector(planet: Planet, position: [number, number, number]): [number, number, number] {
  const r = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
  const g = planet.mu / (r * r);
  const unit = [position[0] / r, position[1] / r, position[2] / r] as [number, number, number];
  return [-unit[0] * g, -unit[1] * g, -unit[2] * g];
}
