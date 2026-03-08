/**
 * Orbital Ground Track - 2D Mercator Projection
 * Shows the satellite's ground track on Earth's surface
 * Physics: ECI position → latitude/longitude via Earth rotation
 * Features: Day/night terminator, real-time satellite dot, sub-satellite point coordinates
 */

import { useMemo, useState, useRef, useCallback } from 'react';
import { Download } from 'lucide-react';

interface LaunchSiteOrbit {
  periapsisAltitude: string;
  inclination: string;
  eccentricity: string;
  raan: string;
  argOfPeriapsis: string;
  trueAnomaly: string;
}

interface GroundTrackProps {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  raan: number;
  argOfPeriapsis: number;
  gm: number;
  numOrbits?: number;
  currentTrueAnomaly?: number;
  /** Called when user clicks a launch site — provides typical orbit params */
  onLaunchSiteClick?: (params: LaunchSiteOrbit, siteName: string) => void;
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
// Earth axial tilt (radians)
const EARTH_OBLIQUITY = 23.4393 * Math.PI / 180;

/**
 * Compute day/night terminator line on equirectangular projection.
 * The subsolar point longitude depends on current time of day;
 * we use real wall-clock time for a live feel.
 * Returns array of {lat, lon} points tracing the terminator.
 */
function computeTerminator(): Array<{ lat: number; lon: number }> {
  const now = new Date();
  // Day of year (approximate)
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);

  // Solar declination (approximate)
  const declination = EARTH_OBLIQUITY * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));

  // Subsolar longitude from UTC hour
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const subsolarLon = (12 - hours) * 15; // degrees, 15°/hour

  const points: Array<{ lat: number; lon: number }> = [];
  // Trace terminator: for each longitude, find the latitude where sun elevation = 0
  for (let lonDeg = -180; lonDeg <= 180; lonDeg += 2) {
    const lonRad = lonDeg * Math.PI / 180;
    const subsolarLonRad = subsolarLon * Math.PI / 180;
    const hourAngle = lonRad - subsolarLonRad;
    // At terminator: sin(alt)=0 → sin(lat)·sin(dec) + cos(lat)·cos(dec)·cos(H) = 0
    // → tan(lat) = -cos(H)·cos(dec)/sin(dec) = -cos(H)/tan(dec)
    // Handle edge case where declination ≈ 0
    let latRad: number;
    if (Math.abs(declination) < 1e-6) {
      // Equinox: terminator is a great circle through poles at ±90° from subsolar
      latRad = Math.atan(-Math.cos(hourAngle) * 1e6); // approaches ±π/2
    } else {
      latRad = Math.atan(-Math.cos(hourAngle) / Math.tan(declination));
    }
    const latDeg = latRad * 180 / Math.PI;
    points.push({ lat: latDeg, lon: lonDeg });
  }
  return points;
}

/**
 * Build the dark-side polygon for SVG fill.
 * The terminator splits Earth into day/night; we fill the night side.
 */
function buildNightPolygon(
  terminatorPoints: Array<{ lat: number; lon: number }>,
  toSVG: (lat: number, lon: number) => [number, number],
  W: number,
  H: number
): string {
  if (terminatorPoints.length === 0) return '';

  // Determine which side is night by checking subsolar point
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const subsolarLon = (12 - hours) * 15;
  // Night is opposite side of subsolar longitude
  const nightLon = ((subsolarLon + 360 + 180) % 360) - 180;

  // Check if the night center is above or below the terminator at that longitude
  const midTerminator = terminatorPoints[Math.floor(terminatorPoints.length / 2)];
  const nightIsAbove = nightLon > -90 && nightLon < 90
    ? midTerminator.lat < 0  // rough heuristic
    : midTerminator.lat > 0;

  // Build path: terminator line + close along top or bottom edge
  let path = '';
  terminatorPoints.forEach((p, idx) => {
    const [x, y] = toSVG(p.lat, p.lon);
    path += idx === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` L${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Close polygon along the night side edge
  if (nightIsAbove) {
    // Night is toward top (higher latitudes → smaller Y)
    path += ` L${W},0 L0,0 Z`;
  } else {
    // Night is toward bottom
    path += ` L${W},${H} L0,${H} Z`;
  }

  return path;
}

// Launch sites with typical orbit parameters from each site
const LAUNCH_SITES = [
  { name: 'Cape Canaveral', lat: 28.396, lon: -80.605, country: 'USA', operator: 'NASA / SpaceX / ULA', pads: 4, since: 1950, orbit: { periapsisAltitude: '400', inclination: '28.5', eccentricity: '0.001', raan: '0', argOfPeriapsis: '0', trueAnomaly: '0' } },
  { name: 'Baikonur', lat: 45.965, lon: 63.305, country: 'Kazakhstan', operator: 'Roscosmos', pads: 6, since: 1955, orbit: { periapsisAltitude: '400', inclination: '51.6', eccentricity: '0.001', raan: '0', argOfPeriapsis: '0', trueAnomaly: '0' } },
  { name: 'Kourou', lat: 5.236, lon: -52.768, country: 'French Guiana', operator: 'ESA / Arianespace', pads: 3, since: 1968, orbit: { periapsisAltitude: '35786', inclination: '5.2', eccentricity: '0.0', raan: '0', argOfPeriapsis: '0', trueAnomaly: '0' } },
  { name: 'Vandenberg', lat: 34.632, lon: -120.611, country: 'USA', operator: 'USSF / SpaceX', pads: 2, since: 1958, orbit: { periapsisAltitude: '800', inclination: '98.2', eccentricity: '0.001', raan: '0', argOfPeriapsis: '0', trueAnomaly: '0' } },
  { name: 'Tanegashima', lat: 30.400, lon: 131.000, country: 'Japan', operator: 'JAXA', pads: 2, since: 1969, orbit: { periapsisAltitude: '300', inclination: '30.4', eccentricity: '0.001', raan: '0', argOfPeriapsis: '0', trueAnomaly: '0' } },
  { name: 'Sriharikota', lat: 13.720, lon: 80.230, country: 'India', operator: 'ISRO', pads: 2, since: 1971, orbit: { periapsisAltitude: '600', inclination: '13.7', eccentricity: '0.001', raan: '0', argOfPeriapsis: '0', trueAnomaly: '0' } },
  { name: 'Jiuquan', lat: 40.958, lon: 100.291, country: 'China', operator: 'CNSA / CASC', pads: 3, since: 1958, orbit: { periapsisAltitude: '400', inclination: '42.8', eccentricity: '0.001', raan: '0', argOfPeriapsis: '0', trueAnomaly: '0' } },
  { name: 'Plesetsk', lat: 62.925, lon: 40.577, country: 'Russia', operator: 'Russian MoD', pads: 4, since: 1966, orbit: { periapsisAltitude: '800', inclination: '82.5', eccentricity: '0.001', raan: '0', argOfPeriapsis: '0', trueAnomaly: '0' } },
];

export function OrbitalGroundTrack({
  semiMajorAxis,
  eccentricity,
  inclination,
  raan,
  argOfPeriapsis,
  gm,
  numOrbits = 3,
  currentTrueAnomaly,
  onLaunchSiteClick,
}: GroundTrackProps) {
  const [showCoords, setShowCoords] = useState(true);
  const [hoveredSite, setHoveredSite] = useState<typeof LAUNCH_SITES[number] | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Orbit color palette (HSL strings)
  const ORBIT_COLORS = useMemo(() => [
    'hsl(210 90% 60%)',  // Blue
    'hsl(145 70% 50%)',  // Green
    'hsl(35 95% 55%)',   // Orange
    'hsl(280 70% 60%)',  // Purple
    'hsl(0 80% 60%)',    // Red
    'hsl(180 70% 50%)',  // Cyan
    'hsl(60 80% 50%)',   // Yellow
    'hsl(320 70% 55%)',  // Pink
  ], []);

  const { tracks, currentPos, nodes } = useMemo(() => {
    if (!semiMajorAxis || semiMajorAxis <= 0 || !gm || gm <= 0) {
      return { tracks: [], currentPos: null, nodes: [] };
    }

    const n = Math.sqrt(gm / Math.pow(semiMajorAxis, 3));
    const period = (2 * Math.PI) / n;
    const totalTime = period * numOrbits;
    const stepsPerOrbit = 200;
    const steps = stepsPerOrbit * numOrbits;
    const dt = totalTime / steps;

    const tracks: Array<{ lat: number; lon: number; orbitIdx: number }> = [];
    const nodes: Array<{ lat: number; lon: number; type: 'ascending' | 'descending'; orbitIdx: number }> = [];
    let currentPos: { lat: number; lon: number } | null = null;
    let prevLat = 0;

    for (let s = 0; s <= steps; s++) {
      const t = s * dt;
      const orbitIdx = Math.min(Math.floor(t / period), numOrbits - 1);
      const M = (n * t) % (2 * Math.PI);
      const E = solveKepler(M, eccentricity);

      const nu = 2 * Math.atan2(
        Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.sin(E / 2),
        Math.cos(E / 2)
      );

      const r = semiMajorAxis * (1 - eccentricity * Math.cos(E));
      const x_p = r * Math.cos(nu);
      const y_p = r * Math.sin(nu);
      const [x, y, z] = perifocalToECI(x_p, y_p, inclination, raan, argOfPeriapsis);

      const rMag = Math.sqrt(x * x + y * y + z * z);
      const lat = Math.asin(z / rMag) * (180 / Math.PI);
      const theta_g = EARTH_OMEGA * t;
      let lon = (Math.atan2(y, x) - theta_g) * (180 / Math.PI);
      lon = ((lon + 540) % 360) - 180;

      // Detect equator crossings (lat sign change)
      if (s > 0 && prevLat * lat < 0 && Math.abs(prevLat - lat) < 30) {
        // Interpolate longitude at equator crossing
        const frac = Math.abs(prevLat) / (Math.abs(prevLat) + Math.abs(lat));
        const prevTrack = tracks[tracks.length - 1];
        let interpLon = prevTrack.lon + frac * (lon - prevTrack.lon);
        // Handle antimeridian
        if (Math.abs(lon - prevTrack.lon) > 180) {
          interpLon = lon; // skip interpolation at wrap
        }
        interpLon = ((interpLon + 540) % 360) - 180;
        const type = lat > prevLat ? 'ascending' : 'descending';
        nodes.push({ lat: 0, lon: interpLon, type, orbitIdx });
      }
      prevLat = lat;

      tracks.push({ lat, lon, orbitIdx });
      if (s === 0) currentPos = { lat, lon };
    }

    return { tracks, currentPos, nodes };
  }, [semiMajorAxis, eccentricity, inclination, raan, argOfPeriapsis, gm, numOrbits]);

  const W = 720;
  const H = 360;

  const toSVG = (lat: number, lon: number): [number, number] => {
    const x = ((lon + 180) / 360) * W;
    const y = ((90 - lat) / 180) * H;
    return [x, y];
  };

  // Build path segments per orbit (with color index)
  const orbitSegments = useMemo(() => {
    if (tracks.length === 0) return [];
    const result: Array<{ d: string; orbitIdx: number }> = [];
    let currentPath = '';
    let currentOrbit = tracks[0].orbitIdx;

    for (let i = 0; i < tracks.length; i++) {
      const [x, y] = toSVG(tracks[i].lat, tracks[i].lon);
      const orbitIdx = tracks[i].orbitIdx;

      if (i === 0) {
        currentPath = `M${x.toFixed(1)},${y.toFixed(1)}`;
        currentOrbit = orbitIdx;
      } else {
        const lonDiff = Math.abs(tracks[i].lon - tracks[i - 1].lon);
        const orbitChanged = orbitIdx !== currentOrbit;

        if (lonDiff > 180 || orbitChanged) {
          // Save current segment
          result.push({ d: currentPath, orbitIdx: currentOrbit });
          currentPath = `M${x.toFixed(1)},${y.toFixed(1)}`;
          currentOrbit = orbitIdx;
        } else {
          currentPath += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        }
      }
    }
    if (currentPath) result.push({ d: currentPath, orbitIdx: currentOrbit });
    return result;
  }, [tracks]);

  // Day/night terminator
  const { terminatorPath, nightPolygon } = useMemo(() => {
    const points = computeTerminator();
    let terminatorPath = '';
    points.forEach((p, idx) => {
      const [x, y] = toSVG(p.lat, p.lon);
      terminatorPath += idx === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` L${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const nightPolygon = buildNightPolygon(points, toSVG, W, H);
    return { terminatorPath, nightPolygon };
  }, []);

  // Real-time satellite position with lat/lon + velocity direction
  const satelliteData = useMemo(() => {
    if (currentTrueAnomaly === undefined || !semiMajorAxis || semiMajorAxis <= 0) return null;

    const computeLatLon = (nu: number) => {
      const r = semiMajorAxis * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(nu));
      const x_p = r * Math.cos(nu);
      const y_p = r * Math.sin(nu);
      const [x, y, z] = perifocalToECI(x_p, y_p, inclination, raan, argOfPeriapsis);
      const rMag = Math.sqrt(x * x + y * y + z * z);
      const lat = Math.asin(z / rMag) * (180 / Math.PI);
      let lon = Math.atan2(y, x) * (180 / Math.PI);
      lon = ((lon + 540) % 360) - 180;
      return { lat, lon, rMag };
    };

    const current = computeLatLon(currentTrueAnomaly);
    // Small step ahead for velocity vector direction
    const ahead = computeLatLon(currentTrueAnomaly + 0.02);

    const svgPos = toSVG(current.lat, current.lon);
    const svgAhead = toSVG(ahead.lat, ahead.lon);

    // Velocity direction in SVG space (normalized)
    let dx = svgAhead[0] - svgPos[0];
    let dy = svgAhead[1] - svgPos[1];
    // Handle antimeridian wrap
    if (Math.abs(dx) > W / 2) dx = dx > 0 ? dx - W : dx + W;
    const mag = Math.sqrt(dx * dx + dy * dy);
    const velDir = mag > 0.01 ? { dx: dx / mag, dy: dy / mag } : { dx: 1, dy: 0 };

    return { lat: current.lat, lon: current.lon, altitude: current.rMag - 6371, svgPos, velDir };
  }, [currentTrueAnomaly, semiMajorAxis, eccentricity, inclination, raan, argOfPeriapsis]);

  if (tracks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Calculate an orbit to see the ground track
      </div>
    );
  }

  const latLines = [-60, -30, 0, 30, 60];
  const lonLines = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
  const currentSVG = currentPos ? toSVG(currentPos.lat, currentPos.lon) : null;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg border border-border"
        style={{ background: 'hsl(var(--background))' }}
      >
        {/* Ocean background */}
        <rect x={0} y={0} width={W} height={H} fill="hsl(220 60% 8%)" />

        {/* Night side overlay */}
        {nightPolygon && (
          <path d={nightPolygon} fill="hsl(220 80% 3%)" opacity="0.55" />
        )}

        {/* Continent outlines */}
        <path d="M100,60 L160,55 L170,80 L155,120 L130,130 L100,110 Z" fill="hsl(140 30% 15%)" opacity="0.6" />
        <path d="M155,140 L175,130 L185,170 L170,220 L145,230 L140,190 Z" fill="hsl(140 30% 15%)" opacity="0.6" />
        <path d="M340,55 L380,50 L395,65 L385,85 L350,80 Z" fill="hsl(140 30% 15%)" opacity="0.6" />
        <path d="M340,100 L390,95 L400,140 L380,195 L345,200 L335,150 Z" fill="hsl(140 30% 15%)" opacity="0.6" />
        <path d="M400,35 L540,30 L560,70 L530,100 L460,105 L400,90 Z" fill="hsl(140 30% 15%)" opacity="0.6" />
        <path d="M530,170 L580,165 L590,195 L560,210 L530,200 Z" fill="hsl(140 30% 15%)" opacity="0.6" />

        {/* Day/Night terminator line */}
        {terminatorPath && (
          <path d={terminatorPath} fill="none" stroke="hsl(45 90% 60%)" strokeWidth="1.2" opacity="0.5" strokeDasharray="4 3" />
        )}

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

        {/* Launch site markers (clickable + hoverable) */}
        {LAUNCH_SITES.map(site => {
          const [sx, sy] = toSVG(site.lat, site.lon);
          const isClickable = !!onLaunchSiteClick;
          const isHovered = hoveredSite?.name === site.name;
          return (
            <g
              key={site.name}
              opacity={isHovered ? 1 : 0.75}
              className={isClickable ? 'cursor-pointer' : ''}
              onClick={isClickable ? () => onLaunchSiteClick(site.orbit, site.name) : undefined}
              onMouseEnter={(e) => {
                setHoveredSite(site);
                if (svgRef.current) {
                  const rect = svgRef.current.getBoundingClientRect();
                  const scaleX = rect.width / W;
                  const scaleY = rect.height / H;
                  setTooltipPos({ x: sx * scaleX, y: sy * scaleY });
                }
              }}
              onMouseLeave={() => setHoveredSite(null)}
            >
              <circle cx={sx} cy={sy} r="14" fill="transparent" />
              {/* Diamond marker */}
              <polygon
                points={`${sx},${sy - (isHovered ? 5 : 4)} ${sx + (isHovered ? 4 : 3)},${sy} ${sx},${sy + (isHovered ? 5 : 4)} ${sx - (isHovered ? 4 : 3)},${sy}`}
                fill={isHovered ? 'hsl(45 95% 65%)' : 'hsl(45 90% 55%)'}
                stroke="hsl(220 60% 8%)"
                strokeWidth="0.6"
              />
              <text x={sx + 5} y={sy + 3} fill={isHovered ? 'hsl(45 95% 75%)' : 'hsl(45 80% 65%)'} fontSize="6.5" fontWeight={isHovered ? '700' : '500'}>
                {site.name}
              </text>
              {isClickable && (
                <text x={sx + 5} y={sy + 11} fill="hsl(45 70% 50%)" fontSize="5" opacity="0.6">
                  i={site.orbit.inclination}° h={site.orbit.periapsisAltitude}km
                </text>
              )}
            </g>
          );
        })}

        {/* Inclination bands */}
        {inclination !== 0 && (
          <>
            <line x1={0} y1={toSVG(inclination * 180 / Math.PI, 0)[1]} x2={W} y2={toSVG(inclination * 180 / Math.PI, 0)[1]}
              stroke="hsl(var(--destructive))" strokeWidth="0.4" opacity="0.3" strokeDasharray="2 4" />
            <line x1={0} y1={toSVG(-inclination * 180 / Math.PI, 0)[1]} x2={W} y2={toSVG(-inclination * 180 / Math.PI, 0)[1]}
              stroke="hsl(var(--destructive))" strokeWidth="0.4" opacity="0.3" strokeDasharray="2 4" />
          </>
        )}

        {/* Ground track paths - color-coded per orbit */}
        {orbitSegments.map((seg, i) => {
          const color = ORBIT_COLORS[seg.orbitIdx % ORBIT_COLORS.length];
          return (
            <g key={`track-${i}`}>
              <path d={seg.d} fill="none" stroke={color} strokeWidth="2.5" opacity="0.15" />
              <path d={seg.d} fill="none" stroke={color} strokeWidth="1.2" opacity="0.85" />
            </g>
          );
        })}

        {/* Orbit legend */}
        {numOrbits > 1 && (
          <g>
            {Array.from({ length: numOrbits }, (_, i) => {
              const color = ORBIT_COLORS[i % ORBIT_COLORS.length];
              const lx = 8;
              const ly = 26 + i * 14;
              return (
                <g key={`legend-${i}`}>
                  <line x1={lx} y1={ly} x2={lx + 14} y2={ly} stroke={color} strokeWidth="2" opacity="0.9" />
                  <text x={lx + 18} y={ly + 3} fill={color} fontSize="8" fontWeight="600" opacity="0.8">
                    Orbit {i + 1}
                  </text>
                </g>
              );
            })}
          </g>
        )}

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

        {/* Satellite footprint / coverage area */}
        {satelliteData && satelliteData.altitude > 0 && (() => {
          // Half-angle of Earth horizon from satellite: ρ = arccos(R_e / (R_e + h))
          const R_E = 6371; // km
          const rho = Math.acos(R_E / (R_E + satelliteData.altitude)) * (180 / Math.PI); // degrees
          // Draw footprint as ellipse on equirectangular projection
          // At sub-satellite lat, longitude degrees shrink by cos(lat)
          const latRad = satelliteData.lat * Math.PI / 180;
          const lonStretch = Math.abs(Math.cos(latRad)) > 0.01 ? 1 / Math.cos(latRad) : 50;
          // SVG radii in pixels
          const ryPx = (rho / 180) * H;
          const rxPx = Math.min((rho * lonStretch / 360) * W, W * 0.4);
          // Build a proper spherical footprint polygon for better accuracy
          const footprintPoints: string[] = [];
          for (let a = 0; a <= 360; a += 5) {
            const aRad = a * Math.PI / 180;
            const rhoRad = rho * Math.PI / 180;
            // Great circle point at angular distance rho, bearing a from sub-satellite point
            const lat1 = latRad;
            const lon1 = satelliteData.lon * Math.PI / 180;
            const lat2 = Math.asin(Math.sin(lat1) * Math.cos(rhoRad) + Math.cos(lat1) * Math.sin(rhoRad) * Math.cos(aRad));
            const lon2 = lon1 + Math.atan2(
              Math.sin(aRad) * Math.sin(rhoRad) * Math.cos(lat1),
              Math.cos(rhoRad) - Math.sin(lat1) * Math.sin(lat2)
            );
            const latDeg = lat2 * 180 / Math.PI;
            const lonDeg = ((lon2 * 180 / Math.PI) + 540) % 360 - 180;
            const [px, py] = toSVG(latDeg, lonDeg);
            footprintPoints.push(`${px.toFixed(1)},${py.toFixed(1)}`);
          }
          return (
            <g>
              <polygon
                points={footprintPoints.join(' ')}
                fill="hsl(var(--primary))"
                opacity="0.07"
                stroke="hsl(var(--primary))"
                strokeWidth="0.7"
                strokeOpacity="0.3"
                strokeDasharray="3 2"
              />
            </g>
          );
        })()}

        {/* Real-time satellite position */}
        {satelliteData && (
          <g>
            {/* Pulse ring */}
            <circle cx={satelliteData.svgPos[0]} cy={satelliteData.svgPos[1]} r="8" fill="none" stroke="hsl(var(--destructive))" strokeWidth="1" opacity="0.4">
              <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.05;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Outer glow */}
            <circle cx={satelliteData.svgPos[0]} cy={satelliteData.svgPos[1]} r="6" fill="hsl(var(--destructive))" opacity="0.15" />
            {/* Main dot */}
            <circle cx={satelliteData.svgPos[0]} cy={satelliteData.svgPos[1]} r="3.5" fill="hsl(var(--destructive))" stroke="hsl(var(--background))" strokeWidth="1" />
            {/* Velocity vector arrow */}
            {(() => {
              const arrowLen = 22;
              const sx = satelliteData.svgPos[0];
              const sy = satelliteData.svgPos[1];
              const ex = sx + satelliteData.velDir.dx * arrowLen;
              const ey = sy + satelliteData.velDir.dy * arrowLen;
              // Arrowhead
              const headLen = 5;
              const angle = Math.atan2(satelliteData.velDir.dy, satelliteData.velDir.dx);
              const h1x = ex - headLen * Math.cos(angle - 0.45);
              const h1y = ey - headLen * Math.sin(angle - 0.45);
              const h2x = ex - headLen * Math.cos(angle + 0.45);
              const h2y = ey - headLen * Math.sin(angle + 0.45);
              return (
                <g>
                  <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="hsl(var(--destructive))" strokeWidth="1.5" opacity="0.8" />
                  <polygon points={`${ex},${ey} ${h1x},${h1y} ${h2x},${h2y}`} fill="hsl(var(--destructive))" opacity="0.8" />
                </g>
              );
            })()}
            {/* Label */}
            <text x={satelliteData.svgPos[0] + 10} y={satelliteData.svgPos[1] - 6} fill="hsl(var(--destructive))" fontSize="8" fontWeight="700">
              SAT
            </text>
          </g>
        )}

        {/* Day/Night label */}
        <text x={W - 6} y={14} textAnchor="end" fill="hsl(45 90% 60%)" fontSize="8" opacity="0.5">
          ☀ Day/Night
        </text>

        {/* Title */}
        <text x={W / 2} y={14} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600" opacity="0.7">
          Ground Track — {numOrbits} Orbit{numOrbits > 1 ? 's' : ''}
        </text>
      </svg>

      {/* Launch site hover tooltip */}
      {hoveredSite && (
        <div
          className="absolute z-10 pointer-events-none bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2.5 shadow-xl text-xs"
          style={{
            left: Math.min(tooltipPos.x + 16, (svgRef.current?.getBoundingClientRect().width ?? W) - 200),
            top: Math.max(tooltipPos.y - 80, 4),
            minWidth: 185,
          }}
        >
          <div className="font-bold text-foreground text-[11px] mb-1.5 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'hsl(45 90% 55%)' }} />
            {hoveredSite.name}
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-muted-foreground font-mono">
            <span>Country</span>
            <span className="text-foreground">{hoveredSite.country}</span>
            <span>Operator</span>
            <span className="text-foreground">{hoveredSite.operator}</span>
            <span>Pads</span>
            <span className="text-foreground">{hoveredSite.pads}</span>
            <span>Active</span>
            <span className="text-foreground">Since {hoveredSite.since}</span>
            <span>Lat/Lon</span>
            <span className="text-foreground">{hoveredSite.lat.toFixed(1)}° / {hoveredSite.lon.toFixed(1)}°</span>
            <span>Typical i</span>
            <span className="text-foreground">{hoveredSite.orbit.inclination}°</span>
          </div>
          {onLaunchSiteClick && (
            <div className="mt-1.5 text-[9px] text-muted-foreground/60 italic">Click to load orbit</div>
          )}
        </div>
      )}

      {satelliteData && showCoords && (
        <div
          className="absolute bottom-2 left-2 bg-background/85 backdrop-blur-sm border border-border rounded-md px-3 py-2 text-xs font-mono shadow-lg"
          style={{ minWidth: 180 }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-destructive font-bold text-[11px] tracking-wide">● SUB-SATELLITE POINT</span>
            <button
              onClick={() => setShowCoords(false)}
              className="text-muted-foreground hover:text-foreground text-[10px] ml-2"
              aria-label="Hide coordinates"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
            <span>Lat:</span>
            <span className="text-foreground font-semibold">
              {satelliteData.lat >= 0 ? '+' : ''}{satelliteData.lat.toFixed(2)}°
              {satelliteData.lat >= 0 ? ' N' : ' S'}
            </span>
            <span>Lon:</span>
            <span className="text-foreground font-semibold">
              {satelliteData.lon >= 0 ? '+' : ''}{satelliteData.lon.toFixed(2)}°
              {satelliteData.lon >= 0 ? ' E' : ' W'}
            </span>
            <span>Alt:</span>
            <span className="text-foreground font-semibold">
              {satelliteData.altitude.toFixed(1)} km
            </span>
            <span>ν:</span>
            <span className="text-foreground font-semibold">
              {((currentTrueAnomaly ?? 0) * 180 / Math.PI).toFixed(1)}°
            </span>
          </div>
        </div>
      )}

      {/* Show coords button when hidden */}
      {satelliteData && !showCoords && (
        <button
          onClick={() => setShowCoords(true)}
          className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm border border-border rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground shadow"
        >
          Show Coordinates
        </button>
      )}
    </div>
  );
}
