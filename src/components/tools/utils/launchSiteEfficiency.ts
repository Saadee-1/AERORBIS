/**
 * Launch Site Efficiency Ranking
 * Pure deterministic ranking — no external API.
 *
 * Physics:
 * - Earth rotation contributes free Δv eastward at the equator (~465 m/s).
 *   Eastward bonus(lat) ≈ 465 · cos(lat) m/s when launching prograde to a low-i orbit.
 * - Reaching an inclination i lower than the launch site latitude requires a
 *   plane change penalty proportional to the latitude excess.
 * - General penalty heuristic: penalty = max(0, lat - i_target) (deg → rad scaled)
 *
 * NOTE: Logic-freeze policy — this is a UI ranking heuristic, not a precise
 * mission Δv calculator. It exists only to help students compare launch sites.
 */
export interface LaunchSiteEfficiency {
  name: string;
  lat: number;
  lon: number;
  country: string;
  rotationBonusMs: number;     // m/s of free Δv from Earth spin
  planeChangePenaltyMs: number; // m/s penalty if i_target < lat
  netScoreMs: number;          // bonus - penalty
  stars: number;               // 1-5 visual rating
  minInclinationDeg: number;   // = |lat|, the lowest i achievable without plane change
  reachable: boolean;          // can this pad reach i_target without > ~3 km/s plane change?
}

const EARTH_EQUATORIAL_BONUS_MS = 465; // m/s at equator, eastward
const ORBITAL_VEL_LEO_MS = 7800;       // typical LEO velocity for plane-change estimate

/**
 * Rank a list of launch sites for a given target inclination.
 */
export function rankLaunchSites<
  T extends { name: string; lat: number; lon: number; country: string }
>(sites: T[], targetInclinationDeg: number): LaunchSiteEfficiency[] {
  const iTarget = Math.abs(targetInclinationDeg);

  const ranked = sites.map((s) => {
    const latAbs = Math.abs(s.lat);
    const latRad = (latAbs * Math.PI) / 180;

    // Eastward rotation bonus — scales with cos(lat). Reduced if i_target high (less alignment).
    const alignment = Math.cos(((iTarget - latAbs) * Math.PI) / 180);
    const rotationBonusMs = EARTH_EQUATORIAL_BONUS_MS * Math.cos(latRad) * Math.max(0, alignment);

    // Plane change penalty: if target inclination < launch latitude, need dogleg.
    const deficit = Math.max(0, latAbs - iTarget);
    // Δv_planeChange ≈ 2 · v · sin(Δi/2)
    const deficitRad = (deficit * Math.PI) / 180;
    const planeChangePenaltyMs = 2 * ORBITAL_VEL_LEO_MS * Math.sin(deficitRad / 2);

    const netScoreMs = rotationBonusMs - planeChangePenaltyMs;

    return {
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      country: s.country,
      rotationBonusMs,
      planeChangePenaltyMs,
      netScoreMs,
      stars: 0,
      minInclinationDeg: latAbs,
      reachable: planeChangePenaltyMs < 3000,
    };
  });

  ranked.sort((a, b) => b.netScoreMs - a.netScoreMs);

  // Assign stars 5..1 across the sorted band
  const best = ranked[0]?.netScoreMs ?? 0;
  const worst = ranked[ranked.length - 1]?.netScoreMs ?? 0;
  const range = Math.max(1, best - worst);
  ranked.forEach((r) => {
    const norm = (r.netScoreMs - worst) / range; // 0..1
    r.stars = Math.max(1, Math.min(5, Math.round(1 + norm * 4)));
  });

  return ranked;
}

export function starsLabel(n: number): string {
  return "★".repeat(n) + "☆".repeat(5 - n);
}
