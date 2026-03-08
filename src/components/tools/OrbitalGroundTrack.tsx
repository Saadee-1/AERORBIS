/**
 * Orbital Ground Track - 2D Mercator Projection
 * Shows the satellite's ground track on Earth's surface
 * Physics: ECI position → latitude/longitude via Earth rotation
 * Features: Day/night terminator, real-time satellite dot, sub-satellite point coordinates,
 *           ground station visibility, elapsed time, orbit number
 */

import { useMemo, useState, useRef, useCallback } from 'react';
import { Download, Radio, Satellite } from 'lucide-react';

interface LaunchSiteOrbit {
  periapsisAltitude: string;
  inclination: string;
  eccentricity: string;
  raan: string;
  argOfPeriapsis: string;
  trueAnomaly: string;
}

interface ConstellationSatellite {
  raan: number; // rad
  argOfPeriapsis: number; // rad
  trueAnomaly: number; // rad - phase offset
  label?: string;
}

interface ConstellationPreset {
  name: string;
  description: string;
  semiMajorAxis: number; // km
  eccentricity: number;
  inclination: number; // rad
  gm: number;
  satellites: ConstellationSatellite[];
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
const R_E_KM = 6371; // Earth radius in km

/**
 * Ground station network for communication visibility
 */
const GROUND_STATIONS = [
  { name: 'Goldstone', lat: 35.43, lon: -116.89, network: 'DSN', minElev: 5 },
  { name: 'Canberra', lat: -35.40, lon: 148.98, network: 'DSN', minElev: 5 },
  { name: 'Madrid', lat: 40.43, lon: -3.95, network: 'DSN', minElev: 5 },
  { name: 'Svalbard', lat: 78.23, lon: 15.39, network: 'KSAT', minElev: 3 },
  { name: 'McMurdo', lat: -77.85, lon: 166.67, network: 'NASA', minElev: 5 },
  { name: 'Wallops', lat: 37.94, lon: -75.46, network: 'NASA', minElev: 5 },
  { name: 'Singapore', lat: 1.35, lon: 103.82, network: 'KSAT', minElev: 3 },
  { name: 'Troll', lat: -72.01, lon: 2.53, network: 'KSAT', minElev: 3 },
  { name: 'Kiruna', lat: 67.86, lon: 20.96, network: 'SSC', minElev: 5 },
  { name: 'Hartebeesthoek', lat: -25.89, lon: 27.69, network: 'SANSA', minElev: 5 },
];

/**
 * Check if a ground station can see the satellite
 * Uses angular distance between sub-satellite point and station
 */
function isStationVisible(
  satLat: number, satLon: number, satAltKm: number,
  stationLat: number, stationLon: number, minElevDeg: number
): boolean {
  const lat1 = satLat * Math.PI / 180;
  const lat2 = stationLat * Math.PI / 180;
  const dLon = (satLon - stationLon) * Math.PI / 180;
  // Haversine angular distance
  const a = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const angDist = 2 * Math.asin(Math.sqrt(a)); // radians
  // Max slant angle from satellite horizon: ρ = arccos(R / (R+h))
  const rho = Math.acos(R_E_KM / (R_E_KM + satAltKm));
  // Adjust for minimum elevation
  const minElevRad = minElevDeg * Math.PI / 180;
  const maxAngDist = rho - minElevRad;
  return angDist <= maxAngDist;
}

/**
 * Compute day/night terminator line on equirectangular projection.
 */
function computeTerminator(): Array<{ lat: number; lon: number }> {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  const declination = EARTH_OBLIQUITY * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const subsolarLon = (12 - hours) * 15;

  const points: Array<{ lat: number; lon: number }> = [];
  for (let lonDeg = -180; lonDeg <= 180; lonDeg += 2) {
    const lonRad = lonDeg * Math.PI / 180;
    const subsolarLonRad = subsolarLon * Math.PI / 180;
    const hourAngle = lonRad - subsolarLonRad;
    let latRad: number;
    if (Math.abs(declination) < 1e-6) {
      latRad = Math.atan(-Math.cos(hourAngle) * 1e6);
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
 */
function buildNightPolygon(
  terminatorPoints: Array<{ lat: number; lon: number }>,
  toSVG: (lat: number, lon: number) => [number, number],
  W: number,
  H: number
): string {
  if (terminatorPoints.length === 0) return '';

  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const subsolarLon = (12 - hours) * 15;
  const nightLon = ((subsolarLon + 360 + 180) % 360) - 180;
  const midTerminator = terminatorPoints[Math.floor(terminatorPoints.length / 2)];
  const nightIsAbove = nightLon > -90 && nightLon < 90
    ? midTerminator.lat < 0
    : midTerminator.lat > 0;

  let path = '';
  terminatorPoints.forEach((p, idx) => {
    const [x, y] = toSVG(p.lat, p.lon);
    path += idx === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` L${x.toFixed(1)},${y.toFixed(1)}`;
  });

  if (nightIsAbove) {
    path += ` L${W},0 L0,0 Z`;
  } else {
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

// Better continent SVG paths (simplified but more recognizable coastlines)
const CONTINENT_PATHS = [
  // North America
  'M80,58 L88,48 L105,42 L130,38 L148,40 L162,48 L168,58 L170,72 L162,82 L155,95 L148,108 L140,118 L130,122 L118,118 L108,108 L98,95 L88,82 L82,70 Z',
  // Central America + Caribbean
  'M118,118 L125,128 L132,132 L130,140 L125,148 L120,145 L115,138 L112,130 Z',
  // South America
  'M138,148 L148,142 L160,148 L168,165 L172,185 L168,208 L158,225 L148,235 L138,228 L132,210 L128,188 L130,170 L134,158 Z',
  // Europe
  'M340,50 L348,42 L360,38 L375,40 L385,48 L388,58 L382,68 L372,75 L360,78 L350,72 L342,62 Z',
  // Africa
  'M342,98 L355,88 L370,85 L385,90 L395,102 L400,120 L398,142 L390,165 L378,185 L368,198 L355,205 L342,198 L335,178 L332,155 L334,132 L338,115 Z',
  // Asia (simplified)
  'M390,32 L420,28 L450,25 L480,28 L510,32 L540,38 L558,48 L562,62 L555,78 L540,88 L520,95 L498,98 L478,95 L458,90 L440,82 L425,72 L415,58 L405,48 L395,40 Z',
  // India
  'M462,98 L472,95 L478,102 L476,118 L470,132 L462,138 L456,130 L455,115 L458,105 Z',
  // Southeast Asia
  'M510,98 L522,95 L535,100 L540,110 L535,120 L525,125 L515,118 L510,108 Z',
  // Indonesia/Malaysia
  'M515,130 L525,128 L540,132 L555,130 L565,135 L558,142 L545,145 L530,142 L518,138 Z',
  // Australia
  'M530,170 L548,162 L568,160 L585,165 L592,178 L588,195 L578,208 L565,212 L548,208 L535,198 L530,185 Z',
  // Japan
  'M555,52 L560,48 L565,52 L568,60 L565,68 L558,65 L555,58 Z',
  // UK/Ireland
  'M338,42 L342,38 L348,40 L350,48 L346,52 L340,50 Z',
  // Greenland
  'M168,18 L190,15 L205,18 L210,28 L205,38 L192,42 L178,38 L172,28 Z',
  // Antarctica hint
  'M50,340 L150,345 L250,342 L350,345 L450,342 L550,345 L650,340 L680,350 L680,360 L0,360 L0,350 Z',
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
  const [showStations, setShowStations] = useState(true);
  const [hoveredSite, setHoveredSite] = useState<typeof LAUNCH_SITES[number] | null>(null);
  const [hoveredStation, setHoveredStation] = useState<typeof GROUND_STATIONS[number] | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Orbit color palette (HSL strings)
  const ORBIT_COLORS = useMemo(() => [
    'hsl(210 90% 60%)',
    'hsl(145 70% 50%)',
    'hsl(35 95% 55%)',
    'hsl(280 70% 60%)',
    'hsl(0 80% 60%)',
    'hsl(180 70% 50%)',
    'hsl(60 80% 50%)',
    'hsl(320 70% 55%)',
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

      // Detect equator crossings
      if (s > 0 && prevLat * lat < 0 && Math.abs(prevLat - lat) < 30) {
        const frac = Math.abs(prevLat) / (Math.abs(prevLat) + Math.abs(lat));
        const prevTrack = tracks[tracks.length - 1];
        let interpLon = prevTrack.lon + frac * (lon - prevTrack.lon);
        if (Math.abs(lon - prevTrack.lon) > 180) {
          interpLon = lon;
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

  // Build path segments per orbit
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
    const ahead = computeLatLon(currentTrueAnomaly + 0.02);

    const svgPos = toSVG(current.lat, current.lon);
    const svgAhead = toSVG(ahead.lat, ahead.lon);

    let dx = svgAhead[0] - svgPos[0];
    let dy = svgAhead[1] - svgPos[1];
    if (Math.abs(dx) > W / 2) dx = dx > 0 ? dx - W : dx + W;
    const mag = Math.sqrt(dx * dx + dy * dy);
    const velDir = mag > 0.01 ? { dx: dx / mag, dy: dy / mag } : { dx: 1, dy: 0 };

    // Compute elapsed time and orbit number from true anomaly
    const n = Math.sqrt(gm / Math.pow(semiMajorAxis, 3));
    const period = (2 * Math.PI) / n;
    // Mean anomaly from true anomaly
    const E = 2 * Math.atan2(
      Math.sqrt((1 - eccentricity) / (1 + eccentricity)) * Math.sin(currentTrueAnomaly / 2),
      Math.cos(currentTrueAnomaly / 2)
    );
    const M = E - eccentricity * Math.sin(E);
    const elapsedInOrbit = (M < 0 ? M + 2 * Math.PI : M) / (2 * Math.PI) * period;

    return {
      lat: current.lat,
      lon: current.lon,
      altitude: current.rMag - R_E_KM,
      svgPos,
      velDir,
      elapsedTime: elapsedInOrbit,
      orbitalPeriod: period,
    };
  }, [currentTrueAnomaly, semiMajorAxis, eccentricity, inclination, raan, argOfPeriapsis, gm]);

  // Ground station visibility
  const stationVisibility = useMemo(() => {
    if (!satelliteData || satelliteData.altitude <= 0) return [];
    return GROUND_STATIONS.map(station => ({
      ...station,
      visible: isStationVisible(
        satelliteData.lat, satelliteData.lon, satelliteData.altitude,
        station.lat, station.lon, station.minElev
      ),
    }));
  }, [satelliteData]);

  const visibleCount = stationVisibility.filter(s => s.visible).length;

  // Export as SVG
  const exportSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ground-track.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Export as PNG
  const exportPNG = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, W * scale, H * scale);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'ground-track.png';
      a.click();
    };
    img.src = url;
  }, []);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
      {/* Export + Station toggle buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-1.5">
        <button
          onClick={() => setShowStations(s => !s)}
          className={`flex items-center gap-1 backdrop-blur-sm border border-border rounded-md px-2 py-1 text-[10px] transition-colors shadow-sm ${
            showStations
              ? 'bg-primary/20 text-primary border-primary/30'
              : 'bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          title="Toggle ground stations"
        >
          <Radio className="w-3 h-3" /> GS
        </button>
        <button
          onClick={exportSVG}
          className="flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-border rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-sm"
          title="Download as SVG"
        >
          <Download className="w-3 h-3" /> SVG
        </button>
        <button
          onClick={exportPNG}
          className="flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-border rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-sm"
          title="Download as PNG"
        >
          <Download className="w-3 h-3" /> PNG
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg border border-border"
        style={{ background: 'hsl(var(--background))' }}
      >
        {/* Deep ocean background with gradient */}
        <defs>
          <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="hsl(215 55% 12%)" />
            <stop offset="100%" stopColor="hsl(220 60% 6%)" />
          </radialGradient>
          <filter id="continentGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
          </filter>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="url(#oceanGrad)" />

        {/* Night side overlay */}
        {nightPolygon && (
          <path d={nightPolygon} fill="hsl(220 80% 2%)" opacity="0.55" />
        )}

        {/* Continent fills - more visible with glow and better colors */}
        {CONTINENT_PATHS.map((path, i) => (
          <g key={`cont-${i}`}>
            {/* Glow underneath */}
            <path d={path} fill="hsl(140 25% 22%)" opacity="0.3" filter="url(#continentGlow)" />
            {/* Main fill */}
            <path d={path} fill="hsl(140 20% 18%)" opacity="0.75" stroke="hsl(140 30% 30%)" strokeWidth="0.6" />
          </g>
        ))}

        {/* Day/Night terminator line */}
        {terminatorPath && (
          <path d={terminatorPath} fill="none" stroke="hsl(45 90% 60%)" strokeWidth="1.2" opacity="0.5" strokeDasharray="4 3" />
        )}

        {/* Grid lines */}
        {latLines.map(lat => {
          const [, y] = toSVG(lat, 0);
          return (
            <g key={`lat-${lat}`}>
              <line x1={0} y1={y} x2={W} y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.2" />
              <text x={4} y={y - 3} fill="hsl(var(--muted-foreground))" fontSize="8" opacity="0.4">{lat}°</text>
            </g>
          );
        })}
        {lonLines.map(lon => {
          const [x] = toSVG(0, lon);
          return (
            <g key={`lon-${lon}`}>
              <line x1={x} y1={0} x2={x} y2={H} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.2" />
              <text x={x + 2} y={H - 4} fill="hsl(var(--muted-foreground))" fontSize="8" opacity="0.4">{lon}°</text>
            </g>
          );
        })}

        {/* Equator */}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="hsl(var(--primary))" strokeWidth="0.6" opacity="0.3" strokeDasharray="4 4" />

        {/* Ground stations */}
        {showStations && stationVisibility.map(station => {
          const [sx, sy] = toSVG(station.lat, station.lon);
          const isVisible = station.visible;
          const isHovered = hoveredStation?.name === station.name;
          return (
            <g
              key={`gs-${station.name}`}
              opacity={isHovered ? 1 : 0.8}
              onMouseEnter={(e) => {
                setHoveredStation(station);
                if (svgRef.current) {
                  const rect = svgRef.current.getBoundingClientRect();
                  const scaleX = rect.width / W;
                  const scaleY = rect.height / H;
                  setTooltipPos({ x: sx * scaleX, y: sy * scaleY });
                }
              }}
              onMouseLeave={() => setHoveredStation(null)}
            >
              {/* Visibility cone on ground */}
              {isVisible && satelliteData && (
                <circle
                  cx={sx} cy={sy}
                  r={Math.max(6, (Math.acos(R_E_KM / (R_E_KM + satelliteData.altitude)) * 180 / Math.PI / 180) * H * 0.7)}
                  fill="hsl(145 70% 50%)"
                  opacity="0.08"
                  stroke="hsl(145 70% 50%)"
                  strokeWidth="0.5"
                  strokeOpacity="0.25"
                />
              )}
              {/* Station marker — antenna icon */}
              <circle cx={sx} cy={sy} r={isHovered ? 4.5 : 3.5}
                fill={isVisible ? 'hsl(145 70% 50%)' : 'hsl(0 0% 45%)'}
                stroke="hsl(220 60% 8%)" strokeWidth="0.6"
              />
              {/* Pulsing ring when visible */}
              {isVisible && (
                <circle cx={sx} cy={sy} r="3.5" fill="none" stroke="hsl(145 70% 50%)" strokeWidth="1">
                  <animate attributeName="r" values="3.5;8;3.5" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Communication link line to satellite */}
              {isVisible && satelliteData && (
                <line
                  x1={sx} y1={sy}
                  x2={satelliteData.svgPos[0]} y2={satelliteData.svgPos[1]}
                  stroke="hsl(145 70% 50%)"
                  strokeWidth="0.6"
                  strokeDasharray="2 2"
                  opacity="0.4"
                >
                  <animate attributeName="strokeDashoffset" values="0;-4" dur="0.5s" repeatCount="indefinite" />
                </line>
              )}
              <text x={sx + 6} y={sy + 3}
                fill={isVisible ? 'hsl(145 70% 65%)' : 'hsl(0 0% 50%)'}
                fontSize="5.5" fontWeight={isHovered ? '700' : '500'}
              >
                {station.name}
              </text>
            </g>
          );
        })}

        {/* Launch site markers */}
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

        {/* Ascending/Descending node markers */}
        {nodes.map((node, i) => {
          const [nx, ny] = toSVG(node.lat, node.lon);
          const isAsc = node.type === 'ascending';
          const color = ORBIT_COLORS[node.orbitIdx % ORBIT_COLORS.length];
          return (
            <g key={`node-${i}`} opacity="0.75">
              {isAsc ? (
                <polygon
                  points={`${nx},${ny - 5} ${nx + 4},${ny + 3} ${nx - 4},${ny + 3}`}
                  fill={color}
                  stroke="hsl(220 60% 8%)"
                  strokeWidth="0.5"
                />
              ) : (
                <polygon
                  points={`${nx},${ny + 5} ${nx + 4},${ny - 3} ${nx - 4},${ny - 3}`}
                  fill={color}
                  stroke="hsl(220 60% 8%)"
                  strokeWidth="0.5"
                />
              )}
              <text x={nx + 6} y={ny + 3} fill={color} fontSize="5.5" fontWeight="600" opacity="0.7">
                {isAsc ? 'AN' : 'DN'}
              </text>
            </g>
          );
        })}

        {/* Ground track paths */}
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
          const rho = Math.acos(R_E_KM / (R_E_KM + satelliteData.altitude)) * (180 / Math.PI);
          const latRad = satelliteData.lat * Math.PI / 180;
          const footprintPoints: string[] = [];
          for (let a = 0; a <= 360; a += 5) {
            const aRad = a * Math.PI / 180;
            const rhoRad = rho * Math.PI / 180;
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
            <polygon
              points={footprintPoints.join(' ')}
              fill="hsl(var(--primary))"
              opacity="0.07"
              stroke="hsl(var(--primary))"
              strokeWidth="0.7"
              strokeOpacity="0.3"
              strokeDasharray="3 2"
            />
          );
        })()}

        {/* Real-time satellite position */}
        {satelliteData && (
          <g>
            <circle cx={satelliteData.svgPos[0]} cy={satelliteData.svgPos[1]} r="8" fill="none" stroke="hsl(var(--destructive))" strokeWidth="1" opacity="0.4">
              <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.05;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={satelliteData.svgPos[0]} cy={satelliteData.svgPos[1]} r="6" fill="hsl(var(--destructive))" opacity="0.15" />
            <circle cx={satelliteData.svgPos[0]} cy={satelliteData.svgPos[1]} r="3.5" fill="hsl(var(--destructive))" stroke="hsl(var(--background))" strokeWidth="1" />
            {/* Velocity vector arrow */}
            {(() => {
              const arrowLen = 22;
              const sx = satelliteData.svgPos[0];
              const sy = satelliteData.svgPos[1];
              const ex = sx + satelliteData.velDir.dx * arrowLen;
              const ey = sy + satelliteData.velDir.dy * arrowLen;
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

        {/* Visible stations count badge */}
        {showStations && satelliteData && (
          <g>
            <rect x={8} y={H - 22} width={85} height={16} rx="3" fill="hsl(220 60% 8%)" fillOpacity="0.8" stroke="hsl(145 70% 50%)" strokeWidth="0.5" strokeOpacity="0.4" />
            <circle cx={18} cy={H - 14} r="3" fill={visibleCount > 0 ? 'hsl(145 70% 50%)' : 'hsl(0 0% 40%)'} />
            <text x={25} y={H - 10.5} fill={visibleCount > 0 ? 'hsl(145 70% 65%)' : 'hsl(0 0% 50%)'} fontSize="7.5" fontWeight="600">
              {visibleCount}/{GROUND_STATIONS.length} GS
            </text>
          </g>
        )}
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

      {/* Ground station hover tooltip */}
      {hoveredStation && (
        <div
          className="absolute z-10 pointer-events-none bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-xl text-xs"
          style={{
            left: Math.min(tooltipPos.x + 16, (svgRef.current?.getBoundingClientRect().width ?? W) - 180),
            top: Math.max(tooltipPos.y - 60, 4),
            minWidth: 160,
          }}
        >
          <div className="font-bold text-foreground text-[11px] mb-1 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{
              background: stationVisibility.find(s => s.name === hoveredStation.name)?.visible
                ? 'hsl(145 70% 50%)' : 'hsl(0 0% 45%)'
            }} />
            {hoveredStation.name}
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-muted-foreground font-mono">
            <span>Network</span>
            <span className="text-foreground">{hoveredStation.network}</span>
            <span>Min Elev</span>
            <span className="text-foreground">{hoveredStation.minElev}°</span>
            <span>Lat/Lon</span>
            <span className="text-foreground">{hoveredStation.lat.toFixed(1)}° / {hoveredStation.lon.toFixed(1)}°</span>
            <span>Status</span>
            <span className={stationVisibility.find(s => s.name === hoveredStation.name)?.visible
              ? 'text-green-400 font-semibold' : 'text-muted-foreground'}>
              {stationVisibility.find(s => s.name === hoveredStation.name)?.visible ? '● IN VIEW' : '○ No contact'}
            </span>
          </div>
        </div>
      )}

      {/* Sub-satellite point info box with elapsed time + orbit number */}
      {satelliteData && showCoords && (
        <div
          className="absolute bottom-2 left-2 bg-background/85 backdrop-blur-sm border border-border rounded-md px-3 py-2 text-xs font-mono shadow-lg"
          style={{ minWidth: 200 }}
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
          {/* Elapsed time and orbit info */}
          <div className="mt-1.5 pt-1.5 border-t border-border/50 grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
            <span>Elapsed:</span>
            <span className="text-foreground font-semibold tabular-nums">
              {formatTime(satelliteData.elapsedTime)}
            </span>
            <span>Period:</span>
            <span className="text-foreground font-semibold tabular-nums">
              {formatTime(satelliteData.orbitalPeriod)}
            </span>
            <span>Orbit #:</span>
            <span className="text-foreground font-semibold">
              {Math.floor(satelliteData.elapsedTime / satelliteData.orbitalPeriod) + 1} / {numOrbits}
            </span>
            <span>Progress:</span>
            <span className="text-foreground font-semibold">
              {((satelliteData.elapsedTime / satelliteData.orbitalPeriod % 1) * 100).toFixed(1)}%
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
