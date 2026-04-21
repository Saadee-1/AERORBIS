/**
 * Pure math helpers for live satellite overlays.
 *
 * - Eclipse test: cylindrical Earth shadow using sun unit vector
 * - Coverage circle: spherical-cap polygon around a sub-satellite point
 * - Ground-station visibility: elevation angle from station to satellite
 *
 * All angles in radians unless suffixed Deg. Distances in km.
 */

const R_E_KM = 6371;
const EARTH_OBLIQUITY = (23.4393 * Math.PI) / 180;

/** Approximate sun direction in ECI (unit vector). Good for eclipse classification. */
export function sunDirectionECI(date: Date = new Date()): [number, number, number] {
  // Days since J2000.0
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = ((280.46 + 0.9856474 * n) * Math.PI) / 180; // mean longitude
  const g = ((357.528 + 0.9856003 * n) * Math.PI) / 180; // mean anomaly
  const lambda = L + ((1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI) / 180;
  const x = Math.cos(lambda);
  const y = Math.sin(lambda) * Math.cos(EARTH_OBLIQUITY);
  const z = Math.sin(lambda) * Math.sin(EARTH_OBLIQUITY);
  return [x, y, z];
}

/**
 * Cylindrical Earth-shadow eclipse test.
 * @param posKm satellite ECI position in km
 * @param sunUnit sun unit vector in ECI
 * @returns true if the satellite is in Earth's umbra
 */
export function isEclipsed(
  posKm: [number, number, number],
  sunUnit: [number, number, number],
): boolean {
  // Project satellite onto sun direction; if behind Earth and within Earth radius perpendicular distance → in shadow.
  const dot = posKm[0] * sunUnit[0] + posKm[1] * sunUnit[1] + posKm[2] * sunUnit[2];
  if (dot >= 0) return false; // sun-side
  const projX = dot * sunUnit[0];
  const projY = dot * sunUnit[1];
  const projZ = dot * sunUnit[2];
  const perpX = posKm[0] - projX;
  const perpY = posKm[1] - projY;
  const perpZ = posKm[2] - projZ;
  const perpDist = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);
  return perpDist < R_E_KM;
}

/** Coverage half-angle (Earth-central) in radians from satellite altitude. */
export function coverageHalfAngle(altKm: number): number {
  if (altKm <= 0) return 0;
  return Math.acos(R_E_KM / (R_E_KM + altKm));
}

/**
 * Build a closed polygon of (lat,lon) points outlining the satellite footprint.
 * @param subLatDeg sub-satellite latitude
 * @param subLonDeg sub-satellite longitude
 * @param altKm altitude
 * @param steps number of polygon vertices
 */
export function footprintPolygon(
  subLatDeg: number,
  subLonDeg: number,
  altKm: number,
  steps = 60,
): Array<{ lat: number; lon: number }> {
  const rho = coverageHalfAngle(altKm);
  const lat1 = (subLatDeg * Math.PI) / 180;
  const lon1 = (subLonDeg * Math.PI) / 180;
  const out: Array<{ lat: number; lon: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const az = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(rho) + Math.cos(lat1) * Math.sin(rho) * Math.cos(az),
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(az) * Math.sin(rho) * Math.cos(lat1),
        Math.cos(rho) - Math.sin(lat1) * Math.sin(lat2),
      );
    let lonDeg = (lon2 * 180) / Math.PI;
    lonDeg = ((lonDeg + 540) % 360) - 180;
    out.push({ lat: (lat2 * 180) / Math.PI, lon: lonDeg });
  }
  return out;
}

/**
 * Topocentric elevation (radians) from a ground station to a satellite,
 * using simple spherical-Earth geometry. Positive = above horizon.
 */
export function elevationAngle(
  satLatDeg: number,
  satLonDeg: number,
  satAltKm: number,
  staLatDeg: number,
  staLonDeg: number,
): number {
  const lat1 = (satLatDeg * Math.PI) / 180;
  const lat2 = (staLatDeg * Math.PI) / 180;
  const dLon = ((satLonDeg - staLonDeg) * Math.PI) / 180;
  const a =
    Math.sin((lat2 - lat1) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const angDist = 2 * Math.asin(Math.sqrt(a)); // central angle
  // Slant range via law of cosines
  const r1 = R_E_KM;
  const r2 = R_E_KM + satAltKm;
  const slant = Math.sqrt(r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(angDist));
  // Elevation from local horizontal
  const elev = Math.asin((r2 * Math.cos(angDist) - r1) / slant);
  return elev;
}

/** Convert lat/lon (deg) + altKm to ECI Cartesian (km). Equator/prime-meridian frame, no Earth rotation. */
export function geodeticToECI(
  latDeg: number,
  lonDeg: number,
  altKm: number,
): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const r = R_E_KM + altKm;
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat)];
}