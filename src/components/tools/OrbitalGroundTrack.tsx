/**
 * Orbital Ground Track - 2D Mercator Projection
 * Shows the satellite's ground track on Earth's surface
 * Physics: ECI position → latitude/longitude via Earth rotation
 */

import { useMemo } from 'react';

interface GroundTrackProps {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  raan: number;
  argOfPeriapsis: number;
  gm: number;
  numOrbits?: number;
  /** Current true anomaly in radians - for real-time satellite dot */
  currentTrueAnomaly?: number;
}

// Physics: Solve Kepler's equation M = E - e·sin(E)
function solveKepler(M: number, e: number): number {
  if (e < 1e-8) return M;
  let E = M;
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

// Physics: Perifocal → ECI rotation
function perifocalToECI(
  x_p: number, y_p: number,
  i: number, raan: number, w: number
): [number, number, number] {
  const cO = Math.cos(raan), sO = Math.sin(raan);
  const cI = Math.cos(i), sI = Math.sin(i);
  const cW = Math.cos(w), sW = Math.sin(w);

  return [
    (cO * cW - sO * sW * cI) * x_p + (-cO * sW - sO * cW * cI) * y_p,
    (sO * cW + cO * sW * cI) * x_p + (-sO * sW + cO * cW * cI) * y_p,
    (sW * sI) * x_p + (cW * sI) * y_p,
  ];
}

// Earth rotation rate (rad/s)
const EARTH_OMEGA = 7.2921159e-5;

export function OrbitalGroundTrack({
  semiMajorAxis,
  eccentricity,
  inclination,
  raan,
  argOfPeriapsis,
  gm,
  numOrbits = 3,
  currentTrueAnomaly,
}: GroundTrackProps) {
  const { tracks, currentPos } = useMemo(() => {
    if (!semiMajorAxis || semiMajorAxis <= 0 || !gm || gm <= 0) {
      return { tracks: [], currentPos: null };
    }

    const n = Math.sqrt(gm / Math.pow(semiMajorAxis, 3)); // mean motion (rad/s)
    const period = (2 * Math.PI) / n;
    const totalTime = period * numOrbits;
    const steps = 600;
    const dt = totalTime / steps;

    const tracks: Array<{ lat: number; lon: number }> = [];
    let currentPos: { lat: number; lon: number } | null = null;

    for (let s = 0; s <= steps; s++) {
      const t = s * dt;
      const M = (n * t) % (2 * Math.PI);
      const E = solveKepler(M, eccentricity);

      // True anomaly
      const nu = 2 * Math.atan2(
        Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.sin(E / 2),
        Math.cos(E / 2)
      );

      // Distance
      const r = semiMajorAxis * (1 - eccentricity * Math.cos(E));

      // Perifocal position
      const x_p = r * Math.cos(nu);
      const y_p = r * Math.sin(nu);

      // ECI position
      const [x, y, z] = perifocalToECI(x_p, y_p, inclination, raan, argOfPeriapsis);

      // Convert ECI → lat/lon (accounting for Earth rotation)
      const rMag = Math.sqrt(x * x + y * y + z * z);
      const lat = Math.asin(z / rMag) * (180 / Math.PI);

      // Greenwich sidereal angle rotates with Earth
      const theta_g = EARTH_OMEGA * t; // simplified
      let lon = (Math.atan2(y, x) - theta_g) * (180 / Math.PI);
      // Normalize to [-180, 180]
      lon = ((lon + 540) % 360) - 180;

      tracks.push({ lat, lon });
      if (s === 0) currentPos = { lat, lon };
    }

    return { tracks, currentPos };
  }, [semiMajorAxis, eccentricity, inclination, raan, argOfPeriapsis, gm, numOrbits]);

  // SVG dimensions
  const W = 720;
  const H = 360;
  const PAD = 0;

  // Convert lat/lon to SVG coords (Mercator-like equirectangular)
  const toSVG = (lat: number, lon: number): [number, number] => {
    const x = ((lon + 180) / 360) * W + PAD;
    const y = ((90 - lat) / 180) * H + PAD;
    return [x, y];
  };

  // Build path segments (break at antimeridian crossings)
  const pathSegments = useMemo(() => {
    if (tracks.length === 0) return [];

    const segments: string[] = [];
    let currentPath = '';

    for (let i = 0; i < tracks.length; i++) {
      const [x, y] = toSVG(tracks[i].lat, tracks[i].lon);

      if (i === 0) {
        currentPath = `M${x.toFixed(1)},${y.toFixed(1)}`;
      } else {
        // Detect antimeridian crossing (large longitude jump)
        const lonDiff = Math.abs(tracks[i].lon - tracks[i - 1].lon);
        if (lonDiff > 180) {
          // Break the path
          segments.push(currentPath);
          currentPath = `M${x.toFixed(1)},${y.toFixed(1)}`;
        } else {
          currentPath += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        }
      }
    }
    if (currentPath) segments.push(currentPath);
    return segments;
  }, [tracks]);

  if (tracks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Calculate an orbit to see the ground track
      </div>
    );
  }

  // Grid lines
  const latLines = [-60, -30, 0, 30, 60];
  const lonLines = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

  const currentSVG = currentPos ? toSVG(currentPos.lat, currentPos.lon) : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg border border-border"
        style={{ background: 'hsl(var(--background))' }}
      >
        {/* Ocean background */}
        <rect x={0} y={0} width={W} height={H} fill="hsl(220 60% 8%)" />

        {/* Simplified continent outlines (rough boxes for major landmasses) */}
        {/* North America */}
        <path d="M100,60 L160,55 L170,80 L155,120 L130,130 L100,110 Z" fill="hsl(140 30% 15%)" opacity="0.6" />
        {/* South America */}
        <path d="M155,140 L175,130 L185,170 L170,220 L145,230 L140,190 Z" fill="hsl(140 30% 15%)" opacity="0.6" />
        {/* Europe */}
        <path d="M340,55 L380,50 L395,65 L385,85 L350,80 Z" fill="hsl(140 30% 15%)" opacity="0.6" />
        {/* Africa */}
        <path d="M340,100 L390,95 L400,140 L380,195 L345,200 L335,150 Z" fill="hsl(140 30% 15%)" opacity="0.6" />
        {/* Asia */}
        <path d="M400,35 L540,30 L560,70 L530,100 L460,105 L400,90 Z" fill="hsl(140 30% 15%)" opacity="0.6" />
        {/* Australia */}
        <path d="M530,170 L580,165 L590,195 L560,210 L530,200 Z" fill="hsl(140 30% 15%)" opacity="0.6" />

        {/* Grid lines */}
        {latLines.map(lat => {
          const [, y] = toSVG(lat, 0);
          return (
            <g key={`lat-${lat}`}>
              <line x1={0} y1={y} x2={W} y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
              <text x={4} y={y - 3} fill="hsl(var(--muted-foreground))" fontSize="8" opacity="0.5">{lat}°</text>
            </g>
          );
        })}
        {lonLines.map(lon => {
          const [x] = toSVG(0, lon);
          return (
            <g key={`lon-${lon}`}>
              <line x1={x} y1={0} x2={x} y2={H} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
              <text x={x + 2} y={H - 4} fill="hsl(var(--muted-foreground))" fontSize="8" opacity="0.5">{lon}°</text>
            </g>
          );
        })}

        {/* Equator */}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="hsl(var(--primary))" strokeWidth="0.6" opacity="0.3" strokeDasharray="4 4" />

        {/* Inclination bands */}
        {inclination !== 0 && (
          <>
            {/* Max latitude = inclination */}
            <line x1={0} y1={toSVG(inclination * 180 / Math.PI, 0)[1]} x2={W} y2={toSVG(inclination * 180 / Math.PI, 0)[1]}
              stroke="hsl(var(--destructive))" strokeWidth="0.4" opacity="0.3" strokeDasharray="2 4" />
            <line x1={0} y1={toSVG(-inclination * 180 / Math.PI, 0)[1]} x2={W} y2={toSVG(-inclination * 180 / Math.PI, 0)[1]}
              stroke="hsl(var(--destructive))" strokeWidth="0.4" opacity="0.3" strokeDasharray="2 4" />
          </>
        )}

        {/* Ground track paths */}
        {pathSegments.map((d, i) => (
          <g key={`track-${i}`}>
            {/* Glow */}
            <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" opacity="0.15" />
            {/* Main line */}
            <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.8" />
          </g>
        ))}

        {/* Starting position marker */}
        {currentSVG && (
          <g>
            <circle cx={currentSVG[0]} cy={currentSVG[1]} r="6" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.5" />
            <circle cx={currentSVG[0]} cy={currentSVG[1]} r="3" fill="hsl(var(--primary))" />
            <text x={currentSVG[0] + 10} y={currentSVG[1] + 3} fill="hsl(var(--primary))" fontSize="9" fontWeight="600">
              START
            </text>
          </g>
        )}

        {/* Labels */}
        <text x={W / 2} y={14} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600" opacity="0.7">
          Ground Track — {numOrbits} Orbit{numOrbits > 1 ? 's' : ''}
        </text>
      </svg>
    </div>
  );
}
