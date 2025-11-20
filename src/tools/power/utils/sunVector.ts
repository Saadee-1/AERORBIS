/**
 * Sun Vector Calculations
 * Computes sun position, elevation, azimuth, and irradiance
 */

export interface SunVector {
  elevation: number; // degrees (0 = horizon, 90 = zenith)
  azimuth: number; // degrees (0 = North, 90 = East, 180 = South, 270 = West)
  irradiance: number; // W/m²
}

export interface Location {
  latitude: number; // degrees
  longitude: number; // degrees
  altitude: number; // m
}

/**
 * Calculate solar declination angle (δ)
 * δ = 23.45° * sin(360° * (284 + n) / 365)
 * where n is day of year (1-365)
 */
function calculateDeclination(dayOfYear: number): number {
  return 23.45 * Math.sin((360 * (284 + dayOfYear)) / 365 * Math.PI / 180);
}

/**
 * Calculate hour angle (ω)
 * ω = 15° * (solarTime - 12)
 * where solarTime is in hours (0-24)
 */
function calculateHourAngle(solarTime: number): number {
  return 15 * (solarTime - 12);
}

/**
 * Calculate sun elevation angle
 * sin(α) = sin(φ) * sin(δ) + cos(φ) * cos(δ) * cos(ω)
 * where φ is latitude, δ is declination, ω is hour angle
 */
function calculateElevation(
  latitude: number,
  declination: number,
  hourAngle: number
): number {
  const latRad = latitude * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  const haRad = hourAngle * Math.PI / 180;
  
  const sinElevation = 
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  
  return Math.asin(sinElevation) * 180 / Math.PI;
}

/**
 * Calculate sun azimuth angle
 * cos(az) = (sin(δ) - sin(α) * sin(φ)) / (cos(α) * cos(φ))
 */
function calculateAzimuth(
  elevation: number,
  latitude: number,
  declination: number,
  hourAngle: number
): number {
  const elevRad = elevation * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  const haRad = hourAngle * Math.PI / 180;
  
  if (Math.cos(elevRad) === 0) return 0;
  
  const cosAz = (Math.sin(decRad) - Math.sin(elevRad) * Math.sin(latRad)) /
                (Math.cos(elevRad) * Math.cos(latRad));
  
  // Determine quadrant based on hour angle
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI;
  
  if (hourAngle > 0) {
    azimuth = 360 - azimuth; // Afternoon
  }
  
  return azimuth;
}

/**
 * Calculate solar irradiance at top of atmosphere
 * G_0 = 1361 W/m² (solar constant)
 */
function calculateTopOfAtmosphereIrradiance(elevation: number): number {
  const G0 = 1361; // W/m²
  const elevRad = elevation * Math.PI / 180;
  
  if (elevation <= 0) return 0; // Below horizon
  
  return G0 * Math.sin(elevRad);
}

/**
 * Calculate atmospheric transmission
 * Simplified model based on altitude and elevation
 */
function calculateAtmosphericTransmission(
  elevation: number,
  altitude: number
): number {
  if (elevation <= 0) return 0;
  
  // Base transmission at sea level
  let transmission = 0.7;
  
  // Improve with altitude (less atmosphere)
  if (altitude > 0) {
    // Exponential decrease in atmospheric density
    const scaleHeight = 8400; // m
    const densityFactor = Math.exp(-altitude / scaleHeight);
    transmission = 0.7 + (0.3 * (1 - densityFactor));
  }
  
  // Reduce transmission at low elevation (more atmosphere)
  if (elevation < 30) {
    const airMass = 1 / Math.sin(elevation * Math.PI / 180);
    transmission *= Math.exp(-0.1 * (airMass - 1));
  }
  
  return Math.max(0, Math.min(1, transmission));
}

/**
 * Calculate sun vector for given time and location
 */
export function calculateSunVector(
  location: Location,
  dayOfYear: number,
  solarTime: number
): SunVector {
  const declination = calculateDeclination(dayOfYear);
  const hourAngle = calculateHourAngle(solarTime);
  const elevation = calculateElevation(location.latitude, declination, hourAngle);
  const azimuth = calculateAzimuth(elevation, location.latitude, declination, hourAngle);
  
  // Calculate irradiance
  const topOfAtmosphere = calculateTopOfAtmosphereIrradiance(elevation);
  const transmission = calculateAtmosphericTransmission(elevation, location.altitude);
  const irradiance = topOfAtmosphere * transmission;
  
  return {
    elevation: Math.max(0, elevation),
    azimuth,
    irradiance: Math.max(0, irradiance),
  };
}

/**
 * Calculate angle between panel normal and sun vector
 * Panel orientation: tilt (degrees from horizontal), azimuth (degrees)
 */
export function calculateIncidenceAngle(
  panelTilt: number, // degrees from horizontal (0 = flat, 90 = vertical)
  panelAzimuth: number, // degrees (0 = North, 90 = East, 180 = South, 270 = West)
  sunVector: SunVector
): number {
  const panelTiltRad = panelTilt * Math.PI / 180;
  const panelAzRad = panelAzimuth * Math.PI / 180;
  const sunElevRad = sunVector.elevation * Math.PI / 180;
  const sunAzRad = sunVector.azimuth * Math.PI / 180;
  
  // Panel normal vector (pointing up)
  const panelNormal = {
    x: Math.sin(panelTiltRad) * Math.sin(panelAzRad),
    y: Math.sin(panelTiltRad) * Math.cos(panelAzRad),
    z: Math.cos(panelTiltRad),
  };
  
  // Sun vector (pointing toward sun)
  const sunVector3D = {
    x: Math.cos(sunElevRad) * Math.sin(sunAzRad),
    y: Math.cos(sunElevRad) * Math.cos(sunAzRad),
    z: Math.sin(sunElevRad),
  };
  
  // Dot product
  const dotProduct = 
    panelNormal.x * sunVector3D.x +
    panelNormal.y * sunVector3D.y +
    panelNormal.z * sunVector3D.z;
  
  // Angle between vectors
  const angleRad = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
  return angleRad * 180 / Math.PI;
}

/**
 * Calculate solar power generation
 */
export function calculateSolarPower(
  panelArea_m2: number,
  panelEfficiency: number,
  mpptEfficiency: number,
  sunVector: SunVector,
  panelTilt: number,
  panelAzimuth: number
): number {
  if (sunVector.elevation <= 0) return 0; // Night
  
  const incidenceAngle = calculateIncidenceAngle(panelTilt, panelAzimuth, sunVector);
  
  if (incidenceAngle > 90) return 0; // Panel facing away from sun
  
  // Effective irradiance = irradiance * cos(incidence angle)
  const effectiveIrradiance = sunVector.irradiance * Math.cos(incidenceAngle * Math.PI / 180);
  
  // Power = Area * Efficiency * MPPT Efficiency * Irradiance
  const power = panelArea_m2 * panelEfficiency * mpptEfficiency * effectiveIrradiance;
  
  return Math.max(0, power);
}
