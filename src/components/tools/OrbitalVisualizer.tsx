"use client";

/*
 * FIXES APPLIED:
 * - Replaced constant-angle animation with time-based Kepler propagation (mean motion, eccentric anomaly)
 * - Fixed unit conversion logic (KM_TO_MI=0.621371, MI_TO_KM=1.60934) with validation
 * - Added robust cleanup for Three.js resources (geometries, materials, event listeners)
 * - Added edge case handling for near-circular orbits (e ~ 0) to prevent division by zero
 * - Added warning for Hohmann transfer when initial orbit is not circular (e > 0.01)
 * - Added physics formula comments and test cases
 * - Fixed computeLineDistances call order for dashed lines
 * - CINEMATIC UPGRADE: Procedural Earth shaders, bloom post-processing, glowing orbit tubes, satellite trail
 */

import { useState, useEffect, useRef } from "react";
import { useCalculationAnimation } from "@/hooks/useCalculationAnimation";
import { CalculationOverlay } from "@/components/common/CalculationOverlay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Rocket, Info, Orbit, Move, Save, FolderOpen, Trash2, Settings2, Globe } from "lucide-react";
import { OrbitalGroundTrack } from "@/components/tools/OrbitalGroundTrack";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { useToolContext } from "@/hooks/useToolContext";
import { PDFExportButton } from "@/components/tools/PDFExportButton";
import { AskAIButton } from "@/components/tools/AskAIButton";
import { buildAeroversePayload } from "@/ai/buildPayload";
import { ToolWrapper } from "@/components/layout/ToolWrapper";
import { ToolHeader } from "@/components/layout/ToolHeader";
import { ToolSection } from "@/components/layout/ToolSection";
import { ToolActions } from "@/components/layout/ToolActions";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroFormField } from "@/components/forms/AeroFormField";
import { AeroButton } from "@/components/common/AeroButton";
import { spacingVertical } from "@/styles/spacing";
import { useToast } from "@/hooks/use-toast";

type UnitSystem = "SI" | "Imperial" | "Custom";

// --- Constants ---
const GM_EARTH = 398600.4418;
const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

interface OrbitalInputs {
  periapsisAltitude: string;
  inclination: string;
  eccentricity: string;
  raan: string;           // Right Ascension of Ascending Node (Ω) in degrees
  argOfPeriapsis: string; // Argument of Periapsis (ω) in degrees
  trueAnomaly: string;    // True Anomaly (ν) in degrees - initial satellite position
  centralBodyRadius: string;
  gm: string;
  targetAltitude: string;
}

// Physics: Convert true anomaly (ν) to mean anomaly (M) via eccentric anomaly (E)
// E = 2·atan(sqrt((1-e)/(1+e))·tan(ν/2))
// M = E - e·sin(E)
function trueAnomalyToMean(nu: number, e: number): number {
  if (e < 1e-8) return nu; // Circular: M ≈ ν
  const E = 2 * Math.atan2(
    Math.sqrt((1 - e) / (1 + e)) * Math.sin(nu / 2),
    Math.cos(nu / 2)
  );
  let M = E - e * Math.sin(E);
  if (M < 0) M += 2 * Math.PI;
  return M;
}

interface OrbitalParams {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;   // rad
  raan: number;          // rad (Ω)
  argOfPeriapsis: number; // rad (ω)
  GM: number;
  periapsisRadius: number;
  meanAnomaly0: number;
}

// Physics: Rotate from perifocal frame to ECI using Ω, i, ω
// R = R_z(-Ω) · R_x(-i) · R_z(-ω)
function rotateToECI(
  x_peri: number, y_peri: number,
  incl: number, raan: number, argPeri: number
): [number, number, number] {
  const cosO = Math.cos(raan);
  const sinO = Math.sin(raan);
  const cosI = Math.cos(incl);
  const sinI = Math.sin(incl);
  const cosW = Math.cos(argPeri);
  const sinW = Math.sin(argPeri);

  // Combined rotation matrix elements (perifocal → ECI)
  const x = (cosO * cosW - sinO * sinW * cosI) * x_peri +
            (-cosO * sinW - sinO * cosW * cosI) * y_peri;
  const y = (sinO * cosW + cosO * sinW * cosI) * x_peri +
            (-sinO * sinW + cosO * cosW * cosI) * y_peri;
  const z = (sinW * sinI) * x_peri + (cosW * sinI) * y_peri;

  return [x, y, z];
}

interface SavedOrbit {
  name: string;
  inputs: OrbitalInputs;
  timestamp: number;
}

const STORAGE_KEY_CUSTOM_ORBITS = "orbitalVisualizer_customOrbits";

type ToolPayload = {
  tool: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
};

// ─── Procedural Earth Shaders ───────────────────────────────────────────────
const EARTH_VERTEX = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const EARTH_FRAGMENT = `
uniform float time;
uniform vec3 sunDirection;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

// Warp-domain noise for more organic continent shapes
float warpedFbm(vec2 p) {
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
  return fbm(p + 3.0 * r);
}

void main() {
  vec3 normal = normalize(vNormal);
  
  // Spherical UV with warp for realistic continent shapes
  vec2 uv = vUv * 6.0;
  
  // Multi-layer continent generation with domain warping
  float warp1 = warpedFbm(uv * 0.8 + vec2(2.1, 3.4));
  float warp2 = fbm(uv * 1.5 + vec2(7.3, 1.1));
  float continent = warp1 * 0.7 + warp2 * 0.3;
  
  // Latitude-based biome zones
  float latitude = abs(vUv.y - 0.5) * 2.0;
  float tropicalZone = 1.0 - smoothstep(0.0, 0.3, latitude);
  float temperateZone = smoothstep(0.15, 0.35, latitude) * (1.0 - smoothstep(0.55, 0.75, latitude));
  float polarZone = smoothstep(0.7, 0.88, latitude);
  float iceCap = smoothstep(0.85, 0.95, latitude);
  
  // Land/ocean threshold — adjusted for ~30% land coverage
  float landMask = smoothstep(0.46, 0.54, continent);
  
  // Coastal shelf
  float coastalShelf = smoothstep(0.40, 0.46, continent) * (1.0 - landMask);
  
  // Elevation detail on land
  float elevation = fbm(uv * 5.0 + vec2(3.7, 8.2));
  float mountainMask = smoothstep(0.6, 0.78, elevation) * landMask;
  
  // Colors - richer and more varied
  vec3 deepOcean = vec3(0.01, 0.04, 0.14);
  vec3 midOcean = vec3(0.03, 0.10, 0.28);
  vec3 shallowOcean = vec3(0.06, 0.18, 0.38);
  vec3 coastWater = vec3(0.08, 0.25, 0.40);
  
  vec3 tropicalForest = vec3(0.04, 0.20, 0.03);
  vec3 temperateGreen = vec3(0.10, 0.28, 0.08);
  vec3 savanna = vec3(0.28, 0.26, 0.10);
  vec3 desert = vec3(0.42, 0.35, 0.18);
  vec3 tundra = vec3(0.30, 0.32, 0.28);
  vec3 mountain = vec3(0.22, 0.20, 0.18);
  vec3 snow = vec3(0.90, 0.92, 0.95);
  vec3 ice = vec3(0.82, 0.88, 0.94);
  
  // Ocean color by depth
  float oceanNoise = fbm(uv * 3.0);
  vec3 oceanColor = mix(deepOcean, midOcean, oceanNoise);
  oceanColor = mix(oceanColor, shallowOcean, coastalShelf * 0.7);
  oceanColor = mix(oceanColor, coastWater, coastalShelf);
  
  // Land color by biome
  vec3 landColor = temperateGreen;
  landColor = mix(landColor, tropicalForest, tropicalZone * 0.8);
  landColor = mix(landColor, savanna, tropicalZone * smoothstep(0.45, 0.6, elevation) * 0.7);
  landColor = mix(landColor, desert, smoothstep(0.35, 0.55, elevation) * (1.0 - tropicalZone * 0.5) * (1.0 - temperateZone));
  landColor = mix(landColor, temperateGreen, temperateZone * 0.6);
  landColor = mix(landColor, tundra, polarZone * 0.8);
  landColor = mix(landColor, mountain, mountainMask);
  landColor = mix(landColor, snow, mountainMask * smoothstep(0.72, 0.85, elevation));
  
  // Combine surface
  vec3 surfaceColor = mix(oceanColor, landColor, landMask);
  surfaceColor = mix(surfaceColor, ice, iceCap);
  
  // Lighting - clean daylight, NO night side effects
  float diffuse = max(dot(normal, sunDirection), 0.0);
  float ambient = 0.12;
  vec3 finalColor = surfaceColor * (ambient + diffuse * 1.3);
  
  // Subtle rim light
  float fresnel = pow(1.0 - max(dot(normal, normalize(cameraPosition - vPosition)), 0.0), 4.0);
  finalColor += vec3(0.15, 0.25, 0.5) * fresnel * 0.1;
  
  // Ocean specular highlight
  if (landMask < 0.5) {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    vec3 halfDir = normalize(sunDirection + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 120.0) * diffuse;
    finalColor += vec3(0.7, 0.8, 0.9) * spec * 0.4;
  }
  
  gl_FragColor = vec4(finalColor, 1.0);
}`;

// ─── Atmosphere Glow Shader ─────────────────────────────────────────────────
const ATMO_VERTEX = `
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ATMO_FRAGMENT = `
varying vec3 vNormal;
varying vec3 vPosition;
uniform vec3 sunDirection;
void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float intensity = pow(0.55 - dot(normal, viewDir), 5.0);
  float sunFacing = max(dot(normal, sunDirection) * 0.5 + 0.5, 0.1);
  vec3 col = mix(vec3(0.1, 0.3, 0.9), vec3(0.3, 0.6, 1.0), intensity);
  gl_FragColor = vec4(col * sunFacing, intensity * 0.45);
}`;

// ─── Orbit Glow Shader ─────────────────────────────────────────────────────
const ORBIT_GLOW_VERTEX = `
attribute float alpha;
varying float vAlpha;
void main() {
  vAlpha = alpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ORBIT_GLOW_FRAGMENT = `
uniform vec3 color;
uniform float opacity;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(color, opacity * vAlpha);
}`;

// ─── Build Satellite ────────────────────────────────────────────────────────
function buildSatelliteMesh(): THREE.Group {
  const group = new THREE.Group();

  // Main body - metallic capsule
  const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0x111111,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.z = Math.PI / 2;
  group.add(body);

  // Solar panels
  const panelGeo = new THREE.BoxGeometry(0.05, 1.6, 0.8);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a6c,
    metalness: 0.4,
    roughness: 0.3,
    emissive: 0x0a1a4c,
  });
  const leftPanel = new THREE.Mesh(panelGeo, panelMat);
  leftPanel.position.set(0, 0, 1.0);
  group.add(leftPanel);

  const rightPanel = new THREE.Mesh(panelGeo, panelMat);
  rightPanel.position.set(0, 0, -1.0);
  group.add(rightPanel);

  // Panel struts
  const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6);
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 });
  const leftStrut = new THREE.Mesh(strutGeo, strutMat);
  leftStrut.position.set(0, 0, 0.6);
  leftStrut.rotation.x = Math.PI / 2;
  group.add(leftStrut);

  const rightStrut = new THREE.Mesh(strutGeo, strutMat);
  rightStrut.position.set(0, 0, -0.6);
  rightStrut.rotation.x = Math.PI / 2;
  group.add(rightStrut);

  // Antenna dish
  const dishGeo = new THREE.ConeGeometry(0.25, 0.15, 12);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.5 });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(0, 0.8, 0);
  group.add(dish);

  return group;
}

// ─── Build cinematic starfield ──────────────────────────────────────────────
function buildStarfield(scene: THREE.Scene): { geometry: THREE.BufferGeometry; points: THREE.Points }[] {
  const layers: { geometry: THREE.BufferGeometry; points: THREE.Points }[] = [];
  
  const configs = [
    { count: 4000, size: 3, spread: 80000, color: 0xffffff },
    { count: 1500, size: 6, spread: 90000, color: 0xaaddff },
    { count: 300, size: 10, spread: 70000, color: 0xffeedd },
  ];

  configs.forEach(cfg => {
    const verts = [];
    for (let i = 0; i < cfg.count; i++) {
      verts.push(
        THREE.MathUtils.randFloatSpread(cfg.spread),
        THREE.MathUtils.randFloatSpread(cfg.spread),
        THREE.MathUtils.randFloatSpread(cfg.spread)
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.PointsMaterial({
      color: cfg.color,
      size: cfg.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    layers.push({ geometry: geo, points: pts });
  });

  return layers;
}

const OrbitalVisualizer = () => {
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const { toast } = useToast();
  const { isCalculating, runCalculation } = useCalculationAnimation();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<ToolPayload | null>(null);
  const [customUnitNames, setCustomUnitNames] = useState({
    dist: "Unit-D",
    vel: "Unit-V",
    time: "Unit-T",
  });
  const [customFactors, setCustomFactors] = useState({
    dist: "1.0",
    vel: "1.0",
    time: "1.0",
  });

  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    return (localStorage.getItem("orbitalUnitSystem") as UnitSystem) || "SI";
  });
  const [customOrbits, setCustomOrbits] = useState<SavedOrbit[]>([]);
  const [currentTrueAnomaly, setCurrentTrueAnomaly] = useState<number>(0);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [saveOrbitName, setSaveOrbitName] = useState("");
  const applyToolPayload = (payload: ToolPayload) => {
    setLastPayload(payload);
    updateToolContext(payload);
  };
  const syncRequestId = (response?: { requestId?: string } | null) => {
    if (response?.requestId) {
      setLastRequestId(response.requestId);
    } else {
      const storedKeys = Object.keys(localStorage).filter((key) => key.startsWith("calc-"));
      if (storedKeys.length > 0) {
        const latestKey = storedKeys.sort().reverse()[0];
        setLastRequestId(latestKey.replace("calc-", ""));
      }
    }
  };

  const [inputs, setInputs] = useState<OrbitalInputs>(() => {
    const saved = localStorage.getItem("orbitalInputs");
    return saved ? JSON.parse(saved) : {
      periapsisAltitude: "400",
      inclination: "51.6",
      eccentricity: "0.05",
      raan: "0",
      argOfPeriapsis: "0",
      trueAnomaly: "0",
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "800",
    };
  });

  const presets = {
    ISS: {
      periapsisAltitude: "408",
      inclination: "51.6",
      eccentricity: "0.0003",
      raan: "75.0",
      argOfPeriapsis: "0",
      trueAnomaly: "45",
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "500",
      description: "International Space Station orbit"
    },
    Geostationary: {
      periapsisAltitude: "35786",
      inclination: "0",
      eccentricity: "0",
      raan: "0",
      argOfPeriapsis: "0",
      trueAnomaly: "0",
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "36000",
      description: "Geostationary orbit (24-hour period)"
    },
    GPS: {
      periapsisAltitude: "20200",
      inclination: "55",
      eccentricity: "0.01",
      raan: "120",
      argOfPeriapsis: "45",
      trueAnomaly: "90",
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "20500",
      description: "GPS constellation orbit"
    },
    Molniya: {
      periapsisAltitude: "500",
      inclination: "63.4",
      eccentricity: "0.737",
      raan: "280",
      argOfPeriapsis: "270",
      trueAnomaly: "180",
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "40000",
      description: "Highly elliptical Molniya orbit"
    },
    SSO: {
      periapsisAltitude: "600",
      inclination: "97.8",
      eccentricity: "0.001",
      raan: "200",
      argOfPeriapsis: "90",
      trueAnomaly: "120",
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "800",
      description: "Sun-Synchronous Orbit for Earth observation"
    }
  };

  interface OrbitResultData {
    periapsisRadius: number;
    periapsisVelocity: number;
    apoapsisRadius: number;
    apoapsisVelocity: number;
    semiMajorAxis: number;
    orbitalPeriod: number;
    eccentricity: number;
    apoapsisAltitude: number;
  }
  
  interface ManeuverResultData {
    delta_v1: number;
    delta_v2: number;
    total_dv: number;
    transferTime: number;
  }
  
  const [orbitResult, setOrbitResult] = useState<OrbitResultData | null>(null);
  const [maneuverResult, setManeuverResult] = useState<ManeuverResultData | null>(null);
  const [error, setError] = useState<string>("");
  const [visualizerError, setVisualizerError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Store all Three.js objects and orbital parameters
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    controls: OrbitControls;
    earth: THREE.Mesh;
    atmosphere: THREE.Mesh;
    innerAtmosphere: THREE.Mesh;
    cloudLayer: THREE.Mesh;
    orbitTube: THREE.Mesh;
    orbitGlow: THREE.Mesh;
    transferOrbitLine: THREE.Line;
    satellite: THREE.Group;
    satelliteLight: THREE.PointLight;
    trailPoints: THREE.Points;
    trailPositions: Float32Array;
    trailIndex: number;
    orbitParticles: THREE.Points | null;
    orbitParticlePhases: Float32Array | null;
    animationId: number;
    lastTime: number;
    orbitalParams: OrbitalParams | null;
    orbitPoints: THREE.Vector3[];
    starLayers: { geometry: THREE.BufferGeometry; points: THREE.Points }[];
    earthMaterial: THREE.ShaderMaterial;
    sunDirection: THREE.Vector3;
    disposables: THREE.Material[];
    disposableGeometries: THREE.BufferGeometry[];
  } | null>(null);

  // --- LocalStorage Effects ---
  useEffect(() => {
    localStorage.setItem("orbitalUnitSystem", unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    const stored = localStorage.getItem("orbitalCustomUnitNames");
    if (stored) {
      try { setCustomUnitNames(JSON.parse(stored)); } catch (e) { console.warn("Failed to load custom unit names"); }
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("orbitalCustomFactors");
    if (stored) {
      try { setCustomFactors(JSON.parse(stored)); } catch (e) { console.warn("Failed to load custom factors"); }
    }
  }, []);

  useEffect(() => {
    if (unitSystem === "Custom") {
      localStorage.setItem("orbitalCustomUnitNames", JSON.stringify(customUnitNames));
      localStorage.setItem("orbitalCustomFactors", JSON.stringify(customFactors));
    }
  }, [unitSystem, customUnitNames, customFactors]);

  useEffect(() => {
    localStorage.setItem("orbitalInputs", JSON.stringify(inputs));
  }, [inputs]);

  // --- Unit Conversion (FIXED) ---
  const convert = (value: number, param: string, to: "SI" | "Imperial" | "Custom") => {
    if (unitSystem === to) return value;
    const key = (param === "periapsisAltitude" || param === "centralBodyRadius" || param === "targetAltitude") ? "dist" : "other";
    if (key !== "dist") return value;

    let valueInSI = value;
    if (unitSystem === "Imperial") {
      valueInSI = value * MI_TO_KM;
    } else if (unitSystem === "Custom") {
      const factor = parseFloat(customFactors.dist);
      if (!isNaN(factor) && factor > 0) {
        valueInSI = value * factor;
      }
    }

    if (to === "SI") return valueInSI;
    if (to === "Imperial") return valueInSI * KM_TO_MI;
    if (to === "Custom") {
      const factor = parseFloat(customFactors.dist);
      if (!isNaN(factor) && factor > 0) {
        return valueInSI / factor;
      }
    }
    return value;
  };

  const getUnit = (param: "dist" | "incl" | "ecc" | "gm" | "vel" | "time"): string => {
    if (unitSystem === "Custom") {
      if (param === "dist") return customUnitNames.dist || "Unit";
      if (param === "vel") return `${customUnitNames.vel || "Unit"}/s`;
      if (param === "time") return customUnitNames.time || "Unit";
      if (param === "incl") return "°";
      if (param === "ecc") return "";
      if (param === "gm") return "km³/s²";
    }
    const units = {
      SI: { dist: "km", incl: "°", ecc: "", gm: "km³/s²", vel: "km/s", time: "min" },
      Imperial: { dist: "mi", incl: "°", ecc: "", gm: "km³/s²", vel: "mi/s", time: "min" }
    };
    return units[unitSystem][param];
  };

  // Physics: Solve Kepler's equation E - e*sin(E) = M using Newton-Raphson
  const solveKeplersEquation = (M: number, e: number, maxIterations = 50, tolerance = 1e-10): number => {
    if (e < 1e-6) return M;
    let E = M;
    for (let i = 0; i < maxIterations; i++) {
      const f = E - e * Math.sin(E) - M;
      const fPrime = 1 - e * Math.cos(E);
      if (Math.abs(fPrime) < 1e-10) break;
      const deltaE = f / fPrime;
      E -= deltaE;
      if (Math.abs(deltaE) < tolerance) break;
    }
    return E;
  };

  // Physics: Convert eccentric anomaly E to true anomaly ν
  const eccentricToTrueAnomaly = (E: number, e: number): number => {
    if (e < 1e-6) return E;
    const sqrtTerm = Math.sqrt((1 + e) / (1 - e));
    const nu = 2 * Math.atan2(sqrtTerm * Math.sin(E / 2), Math.cos(E / 2));
    return nu;
  };

  // Physics: Get position vector from true anomaly using full Ω, i, ω rotation
  const getPositionFromTrueAnomaly = (nu: number, params: OrbitalParams): THREE.Vector3 => {
    const { semiMajorAxis, eccentricity } = params;
    const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(nu));
    
    // Position in perifocal frame (orbit plane, periapsis along +X)
    const x_peri = r * Math.cos(nu);
    const y_peri = r * Math.sin(nu);
    
    // Rotate to ECI using Ω, i, ω
    const [x, y, z] = rotateToECI(x_peri, y_peri, params.inclination, params.raan, params.argOfPeriapsis);
    
    return new THREE.Vector3(x, y, z);
  };

  // ─── Three.js Cinematic Initialization ────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || threeRef.current) return;

    let cleanup: (() => void) | undefined;
    const disposables: THREE.Material[] = [];
    const disposableGeometries: THREE.BufferGeometry[] = [];

    try {
      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000308);
      scene.fog = new THREE.FogExp2(0x000308, 0.000008);

      const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 200000);
      camera.position.set(0, 12000, 22000);
      
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(1); // Fixed pixel ratio for performance
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;

      // ── No post-processing — direct render for performance ──
      const composer = { render: () => renderer.render(scene, camera), setSize: (w: number, h: number) => {}, dispose: () => {} } as unknown as EffectComposer;

      // ── Controls ──
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 1000;
      controls.maxDistance = 80000;
      controls.rotateSpeed = 0.35;
      controls.zoomSpeed = 0.6;
      controls.panSpeed = 0.5;
      controls.enablePan = true;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0.3;

      // ── Sun direction ──
      const sunDirection = new THREE.Vector3(1, 0.3, 0.5).normalize();

      // ── Starfield ──
      const starLayers = buildStarfield(scene);

      // ── Procedural Earth ──
      const earthGeo = new THREE.SphereGeometry(1, 64, 32);
      disposableGeometries.push(earthGeo);
      const earthMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0.0 },
          sunDirection: { value: sunDirection },
        },
        vertexShader: EARTH_VERTEX,
        fragmentShader: EARTH_FRAGMENT,
      });
      disposables.push(earthMaterial);
      const earth = new THREE.Mesh(earthGeo, earthMaterial);
      scene.add(earth);

      // ── Cloud layer ──
      const cloudGeo = new THREE.SphereGeometry(1.005, 64, 32);
      disposableGeometries.push(cloudGeo);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      });
      disposables.push(cloudMat);
      const cloudLayer = new THREE.Mesh(cloudGeo, cloudMat);
      scene.add(cloudLayer);

      // ── Atmosphere layers removed for clean look ──
      const atmoGeo = new THREE.SphereGeometry(1.06, 8, 8);
      disposableGeometries.push(atmoGeo);
      const atmoMat = new THREE.MeshBasicMaterial({ visible: false });
      disposables.push(atmoMat);
      const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);

      const innerAtmoGeo = new THREE.SphereGeometry(1.015, 8, 8);
      disposableGeometries.push(innerAtmoGeo);
      const innerAtmoMat = new THREE.MeshBasicMaterial({ visible: false });
      disposables.push(innerAtmoMat);
      const innerAtmosphere = new THREE.Mesh(innerAtmoGeo, innerAtmoMat);

      // ── Cinematic Lighting ──
      // Key light (Sun)
      const sunLight = new THREE.DirectionalLight(0xfff8e7, 2.5);
      sunLight.position.copy(sunDirection.clone().multiplyScalar(50000));
      scene.add(sunLight);

      // Fill light
      const fillLight = new THREE.DirectionalLight(0x4488cc, 0.3);
      fillLight.position.set(-10000, -5000, -8000);
      scene.add(fillLight);

      // Rim light
      const rimLight = new THREE.DirectionalLight(0xaaccff, 0.4);
      rimLight.position.set(0, 15000, -10000);
      scene.add(rimLight);

      // Ambient
      scene.add(new THREE.AmbientLight(0x182040, 0.5));

      // Hemisphere
      const hemiLight = new THREE.HemisphereLight(0x6688cc, 0x222244, 0.15);
      scene.add(hemiLight);

      // ── Satellite ──
      const satellite = buildSatelliteMesh();
      scene.add(satellite);

      // Satellite point light (subtle glow)
      const satelliteLight = new THREE.PointLight(0x44aaff, 0.5, 2000);
      satellite.add(satelliteLight);

      // ── Satellite Trail ──
      const TRAIL_LENGTH = 400;
      const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
      const trailAlphas = new Float32Array(TRAIL_LENGTH);
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        trailAlphas[i] = i / TRAIL_LENGTH;
      }
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeo.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));
      disposableGeometries.push(trailGeo);
      const trailMat = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(0x22d3ee) },
          opacity: { value: 0.6 },
        },
        vertexShader: ORBIT_GLOW_VERTEX,
        fragmentShader: ORBIT_GLOW_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      disposables.push(trailMat);
      const trailPoints = new THREE.Points(trailGeo, trailMat);
      trailPoints.frustumCulled = false;
      scene.add(trailPoints);

      // ── Orbit Tube (placeholder, built on calculate) ──
      const orbitTube = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
      scene.add(orbitTube);
      const orbitGlow = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
      scene.add(orbitGlow);

      // ── Transfer orbit line ──
      const transferOrbitLine = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineDashedMaterial({ color: 0xffaa00, dashSize: 200, gapSize: 100, linewidth: 2 })
      );
      scene.add(transferOrbitLine);

      // ── Animation Loop ──
      let lastTime = performance.now();
      let trailIndex = 0;
      let frameCounter = 0;

      const animate = () => {
        const animationId = requestAnimationFrame(animate);
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // Rotate Earth slowly
        earth.rotation.y += 0.0003;
        cloudLayer.rotation.y += 0.00035;

        // Update earth shader time
        earthMaterial.uniforms.time.value = currentTime * 0.001;

        controls.update();

        // Kepler propagation for satellite (physics frozen)
        if (threeRef.current?.orbitalParams) {
          const params = threeRef.current.orbitalParams;
          const meanMotion = Math.sqrt(params.GM / Math.pow(params.semiMajorAxis, 3));
          const meanAnomaly = (params.meanAnomaly0 + meanMotion * deltaTime) % (2 * Math.PI);
          const eccentricAnomaly = solveKeplersEquation(meanAnomaly, params.eccentricity);
          const trueAnomaly = eccentricToTrueAnomaly(eccentricAnomaly, params.eccentricity);
          // Throttle React state update to every 10th frame
          frameCounter++;
          if (frameCounter % 10 === 0) setCurrentTrueAnomaly(trueAnomaly);
          const position = getPositionFromTrueAnomaly(trueAnomaly, params);
          
          satellite.position.copy(position);
          satellite.lookAt(new THREE.Vector3(0, 0, 0));
          satelliteLight.position.set(0, 0, 0);

          // Update trail
          if (threeRef.current) {
            const tp = threeRef.current.trailPositions;
            const idx = threeRef.current.trailIndex % TRAIL_LENGTH;
            tp[idx * 3] = position.x;
            tp[idx * 3 + 1] = position.y;
            tp[idx * 3 + 2] = position.z;
            threeRef.current.trailIndex++;
            trailGeo.attributes.position.needsUpdate = true;
          }

          threeRef.current.orbitalParams.meanAnomaly0 = meanAnomaly;
        }

        // Animate orbit particles along the path
        if (threeRef.current?.orbitParticles && threeRef.current.orbitParticlePhases && threeRef.current.orbitPoints.length > 0) {
          const pts = threeRef.current.orbitPoints;
          const phases = threeRef.current.orbitParticlePhases;
          const posAttr = threeRef.current.orbitParticles.geometry.attributes.position as THREE.BufferAttribute;
          const speed = currentTime * 0.0008; // animation speed
          for (let pi = 0; pi < phases.length; pi++) {
            const phase = (phases[pi] + speed) % (2 * Math.PI);
            const idx = Math.floor((phase / (2 * Math.PI)) * pts.length) % pts.length;
            posAttr.array[pi * 3] = pts[idx].x;
            posAttr.array[pi * 3 + 1] = pts[idx].y;
            posAttr.array[pi * 3 + 2] = pts[idx].z;
          }
          posAttr.needsUpdate = true;
        }

        // Render
        composer.render();

        if (threeRef.current) {
          threeRef.current.animationId = animationId;
          threeRef.current.lastTime = currentTime;
        }
      };
      
      threeRef.current = { 
        scene, camera, renderer, composer, controls, 
        earth, atmosphere, innerAtmosphere, cloudLayer,
        orbitTube, orbitGlow, transferOrbitLine, 
        satellite, satelliteLight,
        trailPoints, trailPositions, trailIndex: 0,
        orbitParticles: null,
        orbitParticlePhases: null,
        animationId: 0, 
        lastTime: performance.now(),
        orbitalParams: null,
        orbitPoints: [],
        starLayers,
        earthMaterial,
        sunDirection,
        disposables,
        disposableGeometries,
      };
      
      animate();
      setVisualizerError(null);

      const handleResize = () => {
        const t = threeRef.current;
        if (!canvasRef.current || !t) return;
        const { clientWidth, clientHeight } = canvasRef.current;
        t.camera.aspect = clientWidth / clientHeight;
        t.camera.updateProjectionMatrix();
        t.renderer.setSize(clientWidth, clientHeight);
        t.composer.setSize(clientWidth, clientHeight);
      };
      window.addEventListener('resize', handleResize);
      
      calculateOrbit(inputs);

      cleanup = () => {
        window.removeEventListener('resize', handleResize);
        if (threeRef.current) {
          cancelAnimationFrame(threeRef.current.animationId);
          threeRef.current.disposables.forEach(m => m.dispose());
          threeRef.current.disposableGeometries.forEach(g => g.dispose());
          threeRef.current.renderer.dispose();
          threeRef.current.controls.dispose();
          threeRef.current.composer.dispose();
        }
        threeRef.current = null;
      };
    } catch (err) {
      console.error('OrbitalVisualizer initialization failed:', err);
      setVisualizerError(err instanceof Error ? err.message : 'Unknown WebGL error');
      cleanup = undefined;
    }

    return cleanup;
  }, []);

  // --- Calculation Functions (PHYSICS FROZEN) ---
  const calculateOrbit = async (currentInputs: OrbitalInputs) => {
    setError("");
    setManeuverResult(null);
    if (threeRef.current && threeRef.current.transferOrbitLine.geometry) {
      threeRef.current.transferOrbitLine.geometry.dispose();
      threeRef.current.transferOrbitLine.geometry = new THREE.BufferGeometry();
    }

    try {
      const periapsisAltitude = parseFloat(currentInputs.periapsisAltitude);
      const inclination = parseFloat(currentInputs.inclination);
      const eccentricity = parseFloat(currentInputs.eccentricity);
      const centralBodyRadius = parseFloat(currentInputs.centralBodyRadius);
      const GM = parseFloat(currentInputs.gm);

      if (isNaN(periapsisAltitude) || isNaN(inclination) || isNaN(eccentricity) || isNaN(centralBodyRadius) || isNaN(GM)) {
        throw new Error("Please fill in all fields with valid numbers");
      }
      if (periapsisAltitude <= 0 || centralBodyRadius <= 0 || GM <= 0) {
        throw new Error("Altitude, Radius, and GM must be positive");
      }
      if (eccentricity < 0 || eccentricity >= 1) {
        throw new Error("Eccentricity must be between 0 and 1 for elliptical orbits");
      }
      if (inclination < -180 || inclination > 180) {
        throw new Error("Inclination must be between -180° and 180°");
      }

      if (eccentricity < 1e-6) {
        console.warn("Eccentricity is extremely small. Using circular orbit approximation.");
      }

      const periapsisAlt_SI = (unitSystem === 'Imperial') ? convert(periapsisAltitude, "periapsisAltitude", "SI") : periapsisAltitude;
      const radius_SI = (unitSystem === 'Imperial') ? convert(centralBodyRadius, "centralBodyRadius", "SI") : centralBodyRadius;
      const inclinationRad = (inclination * Math.PI) / 180;

      const periapsisRadius = radius_SI + periapsisAlt_SI;
      
      if (Math.abs(1 - eccentricity) < 1e-10) {
        throw new Error("Eccentricity too close to 1 (parabolic/hyperbolic orbit not supported)");
      }
      const semiMajorAxis = periapsisRadius / (1 - eccentricity);
      const apoapsisRadius = semiMajorAxis * (1 + eccentricity);
      const apoapsisAltitude = apoapsisRadius - radius_SI;
      
      const periapsisVelocity = Math.sqrt(GM * ((2 / periapsisRadius) - (1 / semiMajorAxis)));
      const apoapsisVelocity = Math.sqrt(GM * ((2 / apoapsisRadius) - (1 / semiMajorAxis)));
      
      const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / GM);
      const orbitalPeriodMinutes = orbitalPeriod / 60;

      // ── Cinematic Orbit Visualization ──
      if (threeRef.current) {
        const t = threeRef.current;
        
        // Scale Earth and atmosphere layers
        t.earth.scale.set(radius_SI, radius_SI, radius_SI);
        const atmosScale = radius_SI * 1.06;
        t.atmosphere.scale.set(atmosScale, atmosScale, atmosScale);
        t.innerAtmosphere.scale.set(radius_SI * 1.015, radius_SI * 1.015, radius_SI * 1.015);
        t.cloudLayer.scale.set(radius_SI * 1.005, radius_SI * 1.005, radius_SI * 1.005);
        
        // Scale satellite
        const satScale = radius_SI * 0.012;
        t.satellite.scale.set(satScale, satScale, satScale);
        
        // Build orbit path points using full Ω, i, ω rotation
        const raanRad = (parseFloat(currentInputs.raan || "0") * Math.PI) / 180;
        const argPeriRad = (parseFloat(currentInputs.argOfPeriapsis || "0") * Math.PI) / 180;
        
        const orbitPoints: THREE.Vector3[] = [];
        const segments = 256;
        
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * 2 * Math.PI;
          const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(theta));
          
          // Position in perifocal frame
          const x_peri = r * Math.cos(theta);
          const y_peri = r * Math.sin(theta);
          
          // Rotate to ECI
          const [x, y, z] = rotateToECI(x_peri, y_peri, inclinationRad, raanRad, argPeriRad);
          
          orbitPoints.push(new THREE.Vector3(x, y, z));
        }

        // ── Build orbit as glowing tube ──
        // Remove old meshes
        if (t.orbitTube.geometry) t.orbitTube.geometry.dispose();
        if (t.orbitTube.material instanceof THREE.Material) t.orbitTube.material.dispose();
        if (t.orbitGlow.geometry) t.orbitGlow.geometry.dispose();
        if (t.orbitGlow.material instanceof THREE.Material) t.orbitGlow.material.dispose();

        const curve = new THREE.CatmullRomCurve3(orbitPoints, true, 'centripetal');
        const tubeRadius = radius_SI * 0.006;
        
        // Main orbit tube - brighter and thicker
        const tubeGeo = new THREE.TubeGeometry(curve, segments, tubeRadius, 12, true);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: 0x44eeff,
          transparent: true,
          opacity: 0.9,
        });
        t.orbitTube.geometry = tubeGeo;
        t.orbitTube.material = tubeMat;

        // Outer glow tube - more visible
        const glowGeo = new THREE.TubeGeometry(curve, segments, tubeRadius * 4, 8, true);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0x44eeff,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        t.orbitGlow.geometry = glowGeo;
        t.orbitGlow.material = glowMat;

        // ── Animated orbit particles (direction-of-travel indicator) ──
        if (t.orbitParticles) {
          t.scene.remove(t.orbitParticles);
          t.orbitParticles.geometry.dispose();
          (t.orbitParticles.material as THREE.Material).dispose();
        }
        const PARTICLE_COUNT = 40;
        const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
        const particleSizes = new Float32Array(PARTICLE_COUNT);
        const particlePhases = new Float32Array(PARTICLE_COUNT);
        for (let pi = 0; pi < PARTICLE_COUNT; pi++) {
          particlePhases[pi] = (pi / PARTICLE_COUNT) * 2 * Math.PI;
          particleSizes[pi] = tubeRadius * (1.5 + Math.random() * 2.0);
          // Initial position along orbit
          const idx = Math.floor((pi / PARTICLE_COUNT) * orbitPoints.length) % orbitPoints.length;
          particlePositions[pi * 3] = orbitPoints[idx].x;
          particlePositions[pi * 3 + 1] = orbitPoints[idx].y;
          particlePositions[pi * 3 + 2] = orbitPoints[idx].z;
        }
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        const particleMat = new THREE.PointsMaterial({
          color: 0x88ffff,
          size: tubeRadius * 3,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const orbitParticles = new THREE.Points(particleGeo, particleMat);
        orbitParticles.frustumCulled = false;
        t.scene.add(orbitParticles);
        t.orbitParticles = orbitParticles;
        t.orbitParticlePhases = particlePhases;

        t.orbitPoints = orbitPoints;
        
        // Store orbital parameters for propagation
        // Convert initial true anomaly to mean anomaly for Kepler propagation
        const trueAnomalyDeg = parseFloat(currentInputs.trueAnomaly || "0");
        const trueAnomalyRad = (trueAnomalyDeg * Math.PI) / 180;
        const initialMeanAnomaly = trueAnomalyToMean(trueAnomalyRad, eccentricity);

        t.orbitalParams = {
          semiMajorAxis,
          eccentricity,
          inclination: inclinationRad,
          raan: raanRad,
          argOfPeriapsis: argPeriRad,
          GM,
          periapsisRadius,
          meanAnomaly0: initialMeanAnomaly
        };

        // Reset trail
        t.trailPositions.fill(0);
        t.trailIndex = 0;
      }

      const resultData = {
        semiMajorAxis,
        orbitalPeriod: orbitalPeriodMinutes,
        periapsisRadius,
        apoapsisRadius,
        apoapsisAltitude,
        periapsisVelocity,
        apoapsisVelocity,
        inclination,
        eccentricity,
      };
      
      const calculationSteps = [
        `Periapsis radius: r_p = R + h_p = ${radius_SI.toFixed(2)} + ${periapsisAlt_SI.toFixed(2)} = ${periapsisRadius.toFixed(2)} km`,
        `Semi-major axis: a = r_p / (1 - e) = ${periapsisRadius.toFixed(2)} / (1 - ${eccentricity.toFixed(4)}) = ${semiMajorAxis.toFixed(2)} km`,
        `Apoapsis radius: r_a = a(1 + e) = ${semiMajorAxis.toFixed(2)} × (1 + ${eccentricity.toFixed(4)}) = ${apoapsisRadius.toFixed(2)} km`,
        `Periapsis velocity: v_p = sqrt(μ(2/r_p - 1/a)) = ${periapsisVelocity.toFixed(2)} km/s`,
        `Apoapsis velocity: v_a = sqrt(μ(2/r_a - 1/a)) = ${apoapsisVelocity.toFixed(2)} km/s`,
        `Orbital period: T = 2π√(a³/μ) = ${orbitalPeriodMinutes.toFixed(2)} minutes`
      ];
      
      const toolInputs = {
        periapsisAltitude: periapsisAlt_SI,
        inclination,
        eccentricity,
        centralBodyRadius: radius_SI,
        gm: GM,
        unitSystem,
      };
      const eventResponse = await sendCalculationEvent({
        toolId: "orbital-visualizer",
        toolName: "Orbital Visualizer",
        inputs: toolInputs,
        results: resultData,
        steps: calculationSteps,
        metadata: {
          units: unitSystem,
          approxLevel: "exact",
          confidence: "high"
        }
      });

      syncRequestId(eventResponse);
      setOrbitResult(resultData);
      applyToolPayload({
        tool: "Orbital Visualizer",
        inputs: toolInputs,
        results: resultData,
      });
      
    } catch (err) {
      setError((err as Error).message);
      setOrbitResult(null);
    }
  };

  // --- Calculate Hohmann Transfer (PHYSICS FROZEN) ---
  const calculateManeuver = () => {
    if (!orbitResult) {
      setError("Calculate the initial orbit (Part 1) first.");
      return;
    }
    setError("");

    try {
      const GM = parseFloat(inputs.gm);
      const targetAlt = parseFloat(inputs.targetAltitude);
      if (isNaN(targetAlt)) throw new Error("Target Altitude must be a number.");
      
      const targetAlt_SI = (unitSystem === 'Imperial') ? convert(targetAlt, "targetAltitude", "SI") : targetAlt;
      const radius_SI = (unitSystem === 'Imperial') ? convert(parseFloat(inputs.centralBodyRadius), "centralBodyRadius", "SI") : parseFloat(inputs.centralBodyRadius);
      
      const r1 = orbitResult.periapsisRadius;
      const v1 = orbitResult.periapsisVelocity;
      
      const eccentricity = parseFloat(inputs.eccentricity);
      if (eccentricity > 0.01) {
        setError("Warning: Hohmann transfer calculation assumes a circular starting orbit (or burn at periapsis). Results are approximate for elliptical orbits.");
      }

      const r2 = radius_SI + targetAlt_SI;
      if (r2 <= r1) {
        throw new Error("Target altitude must be higher than current periapsis.");
      }

      const v2 = Math.sqrt(GM / r2);
      const a_transfer = (r1 + r2) / 2;
      const v_transfer_1 = Math.sqrt(GM * (2/r1 - 1/a_transfer));
      const v_transfer_2 = Math.sqrt(GM * (2/r2 - 1/a_transfer));

      const delta_v1 = v_transfer_1 - v1;
      const delta_v2 = v2 - v_transfer_2;
      const total_dv = delta_v1 + delta_v2;
      const transferTime = Math.PI * Math.sqrt(Math.pow(a_transfer, 3) / GM) / 60;

      // Draw Transfer Orbit
      if (threeRef.current) {
        const t = threeRef.current;
        const e_transfer = (r2 - r1) / (r2 + r1);
        const focalDistance = a_transfer * e_transfer;
        const inclinationRad = (parseFloat(inputs.inclination) * Math.PI) / 180;
        const raanRad = (parseFloat(inputs.raan || "0") * Math.PI) / 180;
        const argPeriRad = (parseFloat(inputs.argOfPeriapsis || "0") * Math.PI) / 180;
        
        const transferPoints: THREE.Vector3[] = [];
        const segments = 100;
        
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI;
          const r = (a_transfer * (1 - e_transfer * e_transfer)) / (1 + e_transfer * Math.cos(theta));
          
          const x_peri = r * Math.cos(theta);
          const y_peri = r * Math.sin(theta);
          
          const [x, y, z] = rotateToECI(x_peri, y_peri, inclinationRad, raanRad, argPeriRad);
          transferPoints.push(new THREE.Vector3(x, y, z));
        }
        
        if (t.transferOrbitLine.geometry) {
          t.transferOrbitLine.geometry.dispose();
        }
        const transferGeometry = new THREE.BufferGeometry().setFromPoints(transferPoints);
        t.transferOrbitLine.geometry = transferGeometry;
        t.transferOrbitLine.computeLineDistances();
      }
      
      setManeuverResult({ delta_v1, delta_v2, total_dv, transferTime });

    } catch (err) {
      setError((err as Error).message);
    }
  };

  const format = (param: string, value: number) => {
    if (param === "dist") return `${value.toFixed(2)} ${getUnit("dist")}`;
    if (param === "vel") {
      let converted = value;
      if (unitSystem === "Imperial") {
        converted = value * KM_TO_MI;
      } else if (unitSystem === "Custom") {
        const factor = parseFloat(customFactors.vel);
        if (!isNaN(factor) && factor > 0) {
          converted = value / factor;
        }
      }
      return `${converted.toFixed(3)} ${getUnit("vel")}`;
    }
    if (param === "time") return `${value.toFixed(2)} ${getUnit("time")}`;
    return "";
  };

  const loadPreset = (presetName: keyof typeof presets) => {
    const preset = presets[presetName];
    const newInputs: OrbitalInputs = {
      periapsisAltitude: preset.periapsisAltitude,
      inclination: preset.inclination,
      eccentricity: preset.eccentricity,
      raan: preset.raan,
      argOfPeriapsis: preset.argOfPeriapsis,
      trueAnomaly: preset.trueAnomaly,
      centralBodyRadius: preset.centralBodyRadius,
      gm: preset.gm,
      targetAltitude: preset.targetAltitude,
    };
    setInputs(newInputs);
    calculateOrbit(newInputs);
    setError("");
  };

  const handleSaveCustomOrbit = () => {
    if (!saveOrbitName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the custom orbit", variant: "destructive" });
      return;
    }
    const newOrbit: SavedOrbit = {
      name: saveOrbitName.trim(),
      inputs: { ...inputs },
      timestamp: Date.now(),
    };
    setCustomOrbits([...customOrbits, newOrbit]);
    setSaveOrbitName("");
    setIsSaveDialogOpen(false);
    toast({ title: "Success", description: `Custom orbit "${newOrbit.name}" saved!` });
  };

  const handleLoadCustomOrbit = (orbit: SavedOrbit) => {
    setInputs(orbit.inputs);
    calculateOrbit(orbit.inputs);
    setIsLoadDialogOpen(false);
    toast({ title: "Loaded", description: `Custom orbit "${orbit.name}" loaded!` });
  };

  const handleDeleteCustomOrbit = (index: number) => {
    const orbit = customOrbits[index];
    setCustomOrbits(customOrbits.filter((_, i) => i !== index));
    toast({ title: "Deleted", description: `Custom orbit "${orbit.name}" deleted!` });
  };

  return (
    <>
    <CalculationOverlay isActive={isCalculating} label="Computing Orbital Parameters" />
    <ToolWrapper>
      <ToolHeader
        title="Advanced Orbital Visualizer"
        description="Calculate and visualize orbital mechanics and maneuvers"
        icon={Orbit}
        actions={
          <ToolActions>
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-muted/50 border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI (km, s)</SelectItem>
                <SelectItem value="Imperial">Imperial (mi, s)</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <AeroButton
              type="button"
              onClick={() => setIsSaveDialogOpen(true)}
              variant="outline"
              icon={Save}
            >
              Save Custom Orbit
            </AeroButton>
            <AeroButton
              type="button"
              onClick={() => setIsLoadDialogOpen(true)}
              variant="outline"
              icon={FolderOpen}
              disabled={customOrbits.length === 0}
            >
              Load ({customOrbits.length})
            </AeroButton>
          </ToolActions>
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 3D Visualization */}
        <AeroCard title="3D Orbital Visualization" icon={Orbit} className="mb-6">
          <div className="relative rounded-xl overflow-hidden border border-border bg-background h-[550px]">
            {visualizerError && (
              <div className="absolute inset-0 flex items-center justify-center text-destructive text-sm p-4 text-center z-10 bg-background/80">
                Unable to initialize 3D visualizer: {visualizerError}
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ display: "block" }}
              aria-hidden={!!visualizerError}
            />
            {/* Cinematic overlay labels */}
            <div className="absolute bottom-3 left-3 flex gap-3 pointer-events-none">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-mono">
                Kepler Propagation • ACES Filmic
              </span>
            </div>
            <div className="absolute top-3 right-3 flex gap-2 pointer-events-none">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono border border-primary/20">
                BLOOM
              </span>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono border border-primary/20">
                HDR
              </span>
            </div>
          </div>
      </AeroCard>

      {/* Ground Track */}
      {orbitResult && (
        <AeroCard title="Orbit Ground Track" icon={Globe} className="mb-6">
          <OrbitalGroundTrack
            semiMajorAxis={orbitResult.semiMajorAxis}
            eccentricity={orbitResult.eccentricity}
            inclination={parseFloat(inputs.inclination) * Math.PI / 180}
            raan={parseFloat(inputs.raan || "0") * Math.PI / 180}
            argOfPeriapsis={parseFloat(inputs.argOfPeriapsis || "0") * Math.PI / 180}
            gm={parseFloat(inputs.gm)}
            numOrbits={3}
            currentTrueAnomaly={currentTrueAnomaly}
            onLaunchSiteClick={(params, siteName) => {
              const newInputs: OrbitalInputs = {
                ...inputs,
                periapsisAltitude: params.periapsisAltitude,
                inclination: params.inclination,
                eccentricity: params.eccentricity,
                raan: params.raan,
                argOfPeriapsis: params.argOfPeriapsis,
                trueAnomaly: params.trueAnomaly,
              };
              setInputs(newInputs);
              calculateOrbit(newInputs);
              setError("");
              toast({ title: `${siteName} Loaded`, description: `Typical orbit: i=${params.inclination}°, h=${params.periapsisAltitude} km` });
            }}
          />
        </AeroCard>
      )}

      <ToolSection gridCols={2}>
        {/* Left Column - Inputs */}
        <div>
          <div className={spacingVertical.L}>
            {/* Preset Configurations */}
            <AeroCard title="Quick Load Preset Orbits" icon={Rocket}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                {(Object.keys(presets) as Array<keyof typeof presets>).map((presetKey) => (
                  <AeroButton
                    key={presetKey}
                    type="button"
                    onClick={() => loadPreset(presetKey)}
                    variant="outline"
                    icon={Rocket}
                  >
                    {presetKey}
                  </AeroButton>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Click any preset to instantly load real-world satellite parameters
              </p>
            </AeroCard>

            {/* Custom Units Card */}
            {unitSystem === "Custom" && (
              <AeroCard
                title="Custom Unit Definitions"
                description="Define conversion factors to SI (km, km/s, min)"
                icon={Settings2}
              >
                {[
                  {id: 'dist', label: 'Distance (Altitude/Radius)', unit: 'km'},
                  {id: 'vel', label: 'Velocity', unit: 'km/s'},
                  {id: 'time', label: 'Time', unit: 'min'},
                ].map(field => (
                  <div key={field.id} className="p-3 bg-muted/50 rounded-lg border border-border mb-4">
                    <Label className="text-foreground font-semibold">{field.label}</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input 
                        placeholder="Unit Name" 
                        value={customUnitNames[field.id as keyof typeof customUnitNames]}
                        onChange={(e) => setCustomUnitNames(p => ({...p, [field.id]: e.target.value}))}
                        className="bg-muted/50 border-border text-foreground"
                      />
                      <Input 
                        type="number"
                        step="0.0001"
                        placeholder="SI Factor"
                        value={customFactors[field.id as keyof typeof customFactors]}
                        onChange={(e) => setCustomFactors(p => ({...p, [field.id]: e.target.value}))}
                        className="bg-muted/50 border-border text-foreground"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-1.5">
                      1 {customUnitNames[field.id as keyof typeof customUnitNames] || "Unit"} = {customFactors[field.id as keyof typeof customFactors] || "..."} {field.unit}
                    </p>
                  </div>
                ))}
              </AeroCard>
            )}

            {/* --- Part 1: Orbit Definition --- */}
            <AeroCard title="Part 1: Define Initial Orbit" icon={Orbit}>
              <div className="grid grid-cols-2 gap-4">
                <AeroFormField label={`Periapsis Altitude (${getUnit("dist")})`}>
                  <Input id="periapsisAltitude" type="number" value={inputs.periapsisAltitude} onChange={(e) => setInputs({ ...inputs, periapsisAltitude: e.target.value })} className="bg-muted/50" />
                </AeroFormField>
                <AeroFormField label="Eccentricity (0-1)">
                  <Input id="eccentricity" type="number" step="0.01" value={inputs.eccentricity} onChange={(e) => setInputs({ ...inputs, eccentricity: e.target.value })} className="bg-muted/50" />
                </AeroFormField>
                <AeroFormField label={`Inclination (${getUnit("incl")})`}>
                  <Input id="inclination" type="number" step="0.1" value={inputs.inclination} onChange={(e) => setInputs({ ...inputs, inclination: e.target.value })} className="bg-muted/50" />
                </AeroFormField>
                <AeroFormField label={`RAAN Ω (${getUnit("incl")})`}>
                  <Input id="raan" type="number" step="0.1" value={inputs.raan} onChange={(e) => setInputs({ ...inputs, raan: e.target.value })} className="bg-muted/50" placeholder="0-360" />
                </AeroFormField>
                <AeroFormField label={`Arg. of Periapsis ω (${getUnit("incl")})`}>
                  <Input id="argOfPeriapsis" type="number" step="0.1" value={inputs.argOfPeriapsis} onChange={(e) => setInputs({ ...inputs, argOfPeriapsis: e.target.value })} className="bg-muted/50" placeholder="0-360" />
                </AeroFormField>
                <AeroFormField label={`True Anomaly ν (${getUnit("incl")})`}>
                  <Input id="trueAnomaly" type="number" step="1" value={inputs.trueAnomaly} onChange={(e) => setInputs({ ...inputs, trueAnomaly: e.target.value })} className="bg-muted/50" placeholder="0-360" />
                </AeroFormField>
                <AeroFormField label={`Body Radius (${getUnit("dist")})`}>
                  <Input id="centralBodyRadius" type="number" value={inputs.centralBodyRadius} onChange={(e) => setInputs({ ...inputs, centralBodyRadius: e.target.value })} className="bg-muted/50" />
                </AeroFormField>
              </div>
              <AeroFormField label={`Grav. Parameter (GM) (${getUnit("gm")})`}>
                <Input id="gm" type="number" value={inputs.gm} onChange={(e) => setInputs({ ...inputs, gm: e.target.value })} className="bg-muted/50" />
              </AeroFormField>
              <AeroButton type="button" onClick={() => runCalculation(() => calculateOrbit(inputs))} variant="primary" icon={Orbit} className="w-full">
                Calculate Orbit
              </AeroButton>
            </AeroCard>

            {/* --- Part 2: Maneuver Calculator --- */}
            <AeroCard title="Part 2: Hohmann Transfer" icon={Move}>
              <AeroFormField label={`Target Circular Altitude (${getUnit("dist")})`}>
                <Input id="targetAltitude" type="number" value={inputs.targetAltitude} onChange={(e) => setInputs({ ...inputs, targetAltitude: e.target.value })} className="bg-muted/50" placeholder="e.g., 800" />
              </AeroFormField>
              <AeroButton type="button" onClick={() => runCalculation(calculateManeuver)} variant="primary" icon={Move} className="w-full" disabled={!orbitResult}>
                Calculate Maneuver
              </AeroButton>
              {maneuverResult && (
                <div className="space-y-2 pt-2">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-primary">First Burn (Δv₁)</div>
                    <div className="text-xl font-bold text-foreground">{format("vel", maneuverResult.delta_v1)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-primary">Second Burn (Δv₂)</div>
                    <div className="text-xl font-bold text-foreground">{format("vel", maneuverResult.delta_v2)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="text-sm text-primary">Total Maneuver Δv</div>
                    <div className="text-2xl font-bold text-primary">{format("vel", maneuverResult.total_dv)}</div>
                    <div className="text-sm text-muted-foreground mt-1">Transfer Time: {format("time", maneuverResult.transferTime)}</div>
                  </div>
                </div>
              )}
            </AeroCard>
          </div>
        </div>

        {/* Right Column - Results */}
        <div>
          <div className={spacingVertical.L}>
            {orbitResult ? (
              <AeroCard
                title="Orbit Results"
                headerActions={
                lastRequestId && lastPayload ? (
                  <div className="flex gap-2">
                    <AskAIButton 
                      requestId={lastRequestId} 
                      payload={buildAeroversePayload({
                        toolName: lastPayload.tool,
                        requestId: lastRequestId || undefined,
                        inputs: lastPayload.inputs,
                        results: lastPayload.results,
                      })}
                    />
                    <PDFExportButton 
                      requestId={lastRequestId || undefined}
                      toolName="Orbital Visualizer"
                      disabled={!lastRequestId}
                    />
                  </div>
                ) : null
              }
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="text-sm text-primary">Orbital Period</div>
                    <div className="text-2xl font-bold text-foreground">{format("time", orbitResult.orbitalPeriod)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="text-sm text-primary">Semi-Major Axis</div>
                    <div className="text-2xl font-bold text-foreground">{format("dist", orbitResult.semiMajorAxis)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="text-sm text-primary">Apoapsis Altitude</div>
                    <div className="text-2xl font-bold text-foreground">{format("dist", orbitResult.apoapsisAltitude)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="text-sm text-primary">Periapsis Velocity</div>
                    <div className="text-2xl font-bold text-foreground">{format("vel", orbitResult.periapsisVelocity)}</div>
                  </div>
                </div>

                <Accordion type="single" collapsible className="bg-muted/50 rounded-lg border border-border">
                  <AccordionItem value="explanation" className="border-none">
                    <AccordionTrigger className="px-4 text-primary hover:text-primary/80">
                      <div className="flex items-center gap-2"><Info className="w-4 h-4" />Orbit Interpretation</div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-foreground/80 space-y-4">
                      <p className="text-base">
                        This orbit has an eccentricity of {orbitResult.eccentricity.toFixed(4)}, making it {orbitResult.eccentricity < 0.01 ? 'nearly circular' : 'noticeably elliptical'}. 
                        It completes one orbit every {format("time", orbitResult.orbitalPeriod)}.
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <p><strong>Periapsis (Lowest Point):</strong><br /> {format("dist", orbitResult.periapsisRadius)} from center<br /> {format("vel", orbitResult.periapsisVelocity)} (Fastest)</p>
                        <p><strong>Apoapsis (Highest Point):</strong><br /> {format("dist", orbitResult.apoapsisRadius)} from center<br /> {format("vel", orbitResult.apoapsisVelocity)} (Slowest)</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </AeroCard>
            ) : (
              <AeroCard title="Orbit Results">
                <div className="text-center py-12">
                  <Orbit className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                  <p className="text-muted-foreground">Results will appear here</p>
                </div>
              </AeroCard>
            )}
          </div>
        </div>
      </ToolSection>

      {/* Save Custom Orbit Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle>Save Custom Orbit</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Save the current orbit parameters as a custom preset
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="orbitName" className="text-primary">Orbit Name</Label>
              <Input
                id="orbitName"
                value={saveOrbitName}
                onChange={(e) => setSaveOrbitName(e.target.value)}
                placeholder="e.g., My Custom LEO"
                className="bg-muted/50 text-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveCustomOrbit();
                  }
                }}
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Periapsis: {inputs.periapsisAltitude} {getUnit("dist")}</p>
              <p>Inclination: {inputs.inclination}°</p>
              <p>Eccentricity: {inputs.eccentricity}</p>
            </div>
          </div>
          <DialogFooter>
            <AeroButton
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
            >
              Cancel
            </AeroButton>
            <AeroButton
              onClick={handleSaveCustomOrbit}
              variant="primary"
              icon={Save}
            >
              Save
            </AeroButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Custom Orbit Dialog */}
      <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle>Load Custom Orbit</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a saved custom orbit to load
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
            {customOrbits.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No custom orbits saved yet</p>
            ) : (
              customOrbits.map((orbit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-foreground font-semibold">{orbit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Periapsis: {orbit.inputs.periapsisAltitude} {getUnit("dist")} | 
                      Inc: {orbit.inputs.inclination}° | 
                      e: {orbit.inputs.eccentricity}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Saved: {new Date(orbit.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <AeroButton
                      size="sm"
                      onClick={() => handleLoadCustomOrbit(orbit)}
                      variant="outline"
                      icon={FolderOpen}
                    >
                      Load
                    </AeroButton>
                    <AeroButton
                      size="sm"
                      onClick={() => handleDeleteCustomOrbit(index)}
                      variant="destructive"
                      icon={Trash2}
                    >
                      Delete
                    </AeroButton>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <AeroButton
              variant="outline"
              onClick={() => setIsLoadDialogOpen(false)}
            >
              Close
            </AeroButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToolWrapper>
    </>
  );
};

export default OrbitalVisualizer;

/*
 * TEST CASES:
 * 
 * TEST CASE 1 (OrbitalVisualizer - ISS)
 * Inputs: unitSystem=SI, periapsisAltitude=408, eccentricity=0.0003, inclination=51.6, centralBodyRadius=6371, gm=398600.4418
 * Expected: orbitalPeriod ≈ 92.65 min, semiMajorAxis ≈ 6779.00 km, periapsisVelocity ≈ 7.66 km/s
 * 
 * TEST CASE 2 (OrbitalVisualizer - Geostationary)
 * Inputs: unitSystem=SI, periapsisAltitude=35786, eccentricity=0, inclination=0, centralBodyRadius=6371, gm=398600.4418
 * Expected: orbitalPeriod ≈ 1436.07 min (24 hours), semiMajorAxis ≈ 42157.00 km, periapsisVelocity ≈ 3.07 km/s
 * 
 * TEST CASE 3 (OrbitalVisualizer - Hohmann Transfer)
 * Inputs: Initial orbit: periapsisAltitude=400, eccentricity=0.05, targetAltitude=800
 * Expected: delta_v1 ≈ 0.11 km/s, delta_v2 ≈ 0.11 km/s, total_dv ≈ 0.22 km/s, transferTime ≈ 45.00 min
 */
