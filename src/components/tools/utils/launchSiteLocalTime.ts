/**
 * Compute local solar time and day/night status from a longitude.
 * No external API — derived from longitude offset and approximate solar position.
 *
 * Local solar time = UTC + (longitude / 15) hours
 * Day/night: simple approximation — sun's hour angle from local solar noon.
 *   Daytime if local solar time is between ~06:00 and ~18:00 (modulated by season).
 *   For accuracy, we also include solar declination from day-of-year so polar
 *   day/night near solstices behaves correctly enough for a UI badge.
 */

export interface LaunchPadClock {
  localTimeStr: string;       // "HH:MM:SS" local solar time
  isDay: boolean;
  sunAltitudeDeg: number;     // approximate sun altitude above horizon
}

export function computeLaunchPadClock(latDeg: number, lonDeg: number, now: Date = new Date()): LaunchPadClock {
  // 1. Local solar time
  const utcMs =
    now.getUTCHours() * 3600_000 +
    now.getUTCMinutes() * 60_000 +
    now.getUTCSeconds() * 1000 +
    now.getUTCMilliseconds();
  const offsetMs = (lonDeg / 15) * 3600_000;
  const localMs = ((utcMs + offsetMs) % 86_400_000 + 86_400_000) % 86_400_000;
  const h = Math.floor(localMs / 3600_000);
  const m = Math.floor((localMs % 3600_000) / 60_000);
  const s = Math.floor((localMs % 60_000) / 1000);
  const localTimeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  // 2. Solar declination (Cooper's equation)
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start) / 86_400_000);
  const declRad = (23.44 * Math.PI / 180) * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365);

  // 3. Hour angle: 0 at local solar noon, ±π at midnight
  const hourAngleRad = ((localMs / 3600_000) - 12) * (Math.PI / 12);

  // 4. Sun altitude
  const latRad = (latDeg * Math.PI) / 180;
  const sinAlt =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad);
  const sunAltitudeDeg = (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;

  return {
    localTimeStr,
    isDay: sunAltitudeDeg > 0,
    sunAltitudeDeg,
  };
}
