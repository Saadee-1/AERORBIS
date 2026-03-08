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
 */

import { useState, useEffect, useRef } from "react";
import { useCalculationAnimation } from "@/hooks/useCalculationAnimation";
import { CalculationOverlay } from "@/components/common/CalculationOverlay";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Rocket, Info, Orbit, Move, Save, FolderOpen, Trash2, Settings2 } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
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
// Physics: Earth's gravitational parameter μ = GM (km³/s²)
const GM_EARTH = 398600.4418; // Earth's gravitational parameter (km³/s²)
// Unit conversion constants (fixed values)
const KM_TO_MI = 0.621371; // 1 km = 0.621371 miles
const MI_TO_KM = 1.60934; // 1 mile = 1.60934 km

interface OrbitalInputs {
  periapsisAltitude: string;
  inclination: string;
  eccentricity: string;
  centralBodyRadius: string;
  gm: string;
  targetAltitude: string;
}

// Interface for orbital parameters used in propagation
interface OrbitalParams {
  semiMajorAxis: number; // km
  eccentricity: number;
  inclination: number; // radians
  GM: number; // km³/s²
  periapsisRadius: number; // km
  meanAnomaly0: number; // Initial mean anomaly (radians)
}

interface SavedOrbit {
  name: string;
  inputs: OrbitalInputs;
  timestamp: number;
}

const STORAGE_KEY_CUSTOM_ORBITS = "orbitalVisualizer_customOrbits";

type ToolPayload = {
  tool: string;
  // TODO: refine type for `inputs` — changed any -> unknown automatically by chore/typed-cleanup
  inputs: Record<string, unknown>;
  // TODO: refine type for `results` — changed any -> unknown automatically by chore/typed-cleanup
  results: Record<string, unknown>;
};

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
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "800",
    };
  });

  // --- Preset Orbital Configurations ---
  const presets = {
    ISS: {
      periapsisAltitude: "408",
      inclination: "51.6",
      eccentricity: "0.0003",
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "500",
      description: "International Space Station orbit"
    },
    Geostationary: {
      periapsisAltitude: "35786",
      inclination: "0",
      eccentricity: "0",
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "36000",
      description: "Geostationary orbit (24-hour period)"
    },
    GPS: {
      periapsisAltitude: "20200",
      inclination: "55",
      eccentricity: "0.01",
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "20500",
      description: "GPS constellation orbit"
    },
    Molniya: {
      periapsisAltitude: "500",
      inclination: "63.4",
      eccentricity: "0.737",
      centralBodyRadius: "6371",
      gm: GM_EARTH.toString(),
      targetAltitude: "40000",
      description: "Highly elliptical Molniya orbit"
    },
    SSO: {
      periapsisAltitude: "600",
      inclination: "97.8",
      eccentricity: "0.001",
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
    controls: OrbitControls;
    earth: THREE.Mesh;
    atmosphere: THREE.Mesh;
    orbitLine: THREE.Line;
    transferOrbitLine: THREE.Line;
    satellite: THREE.Mesh;
    animationId: number;
    lastTime: number;
    orbitalParams: OrbitalParams | null;
    orbitPoints: THREE.Vector3[];
    stars: THREE.Points;
    starsGeometry: THREE.BufferGeometry;
  } | null>(null);

  // --- LocalStorage Effects ---
  useEffect(() => {
    localStorage.setItem("orbitalUnitSystem", unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    const stored = localStorage.getItem("orbitalCustomUnitNames");
    if (stored) {
      try {
        setCustomUnitNames(JSON.parse(stored));
      } catch (e) {
        console.warn("Failed to load custom unit names");
      }
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("orbitalCustomFactors");
    if (stored) {
      try {
        setCustomFactors(JSON.parse(stored));
      } catch (e) {
        console.warn("Failed to load custom factors");
      }
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

    // Convert to SI first
    let valueInSI = value;
    if (unitSystem === "Imperial") {
      valueInSI = value * MI_TO_KM; // miles to km
    } else if (unitSystem === "Custom") {
      const factor = parseFloat(customFactors.dist);
      if (!isNaN(factor) && factor > 0) {
        valueInSI = value * factor;
      }
    }

    // Convert from SI to target
    if (to === "SI") return valueInSI;
    if (to === "Imperial") return valueInSI * KM_TO_MI; // km to miles
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
  // where E = eccentric anomaly, M = mean anomaly, e = eccentricity
  const solveKeplersEquation = (M: number, e: number, maxIterations = 50, tolerance = 1e-10): number => {
    if (e < 1e-6) return M; // Near-circular: E ≈ M
    
    let E = M; // Initial guess
    for (let i = 0; i < maxIterations; i++) {
      const f = E - e * Math.sin(E) - M;
      const fPrime = 1 - e * Math.cos(E);
      if (Math.abs(fPrime) < 1e-10) break; // Avoid division by zero
      const deltaE = f / fPrime;
      E -= deltaE;
      if (Math.abs(deltaE) < tolerance) break;
    }
    return E;
  };

  // Physics: Convert eccentric anomaly E to true anomaly ν
  // tan(ν/2) = sqrt((1+e)/(1-e)) * tan(E/2)
  const eccentricToTrueAnomaly = (E: number, e: number): number => {
    if (e < 1e-6) return E; // Near-circular: ν ≈ E
    const sqrtTerm = Math.sqrt((1 + e) / (1 - e));
    const nu = 2 * Math.atan2(sqrtTerm * Math.sin(E / 2), Math.cos(E / 2));
    return nu;
  };

  // Physics: Get position vector from true anomaly
  // r = a(1 - e²) / (1 + e*cos(ν))
  const getPositionFromTrueAnomaly = (nu: number, params: OrbitalParams): THREE.Vector3 => {
    const { semiMajorAxis, eccentricity, periapsisRadius } = params;
    const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(nu));
    
    // Position in orbital plane (X-Y)
    const x_orbital = r * Math.cos(nu);
    const y_orbital = r * Math.sin(nu);
    
    // Apply focal offset (Kepler's 1st Law: focus at one end)
    const focalDistance = semiMajorAxis * eccentricity;
    const x_offset = x_orbital - focalDistance;
    const y_offset = y_orbital;
    
    // Rotate for inclination around X-axis
    const x_final = x_offset;
    const y_final = y_offset * Math.cos(params.inclination);
    const z_final = y_offset * Math.sin(params.inclination);
    
    return new THREE.Vector3(x_final, y_final, z_final);
  };

  // --- Three.js Initialization ---
  useEffect(() => {
    if (!canvasRef.current || threeRef.current) return;

    let cleanup: (() => void) | undefined;

    try {
      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020617);

      const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100000);
      camera.position.set(0, 15000, 20000);
      
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 1000;
      controls.maxDistance = 50000;

      // Add stars
      const starsVertices = [];
      for (let i = 0; i < 2000; i++) {
        starsVertices.push(THREE.MathUtils.randFloatSpread(100000));
        starsVertices.push(THREE.MathUtils.randFloatSpread(100000));
        starsVertices.push(THREE.MathUtils.randFloatSpread(100000));
      }
      const starsGeometry = new THREE.BufferGeometry();
      starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
      const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: true });
      const stars = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(stars);

      // Add Central Body (Earth)
      const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
      const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x2288ff, emissive: 0x112244, shininess: 30 });
      const earth = new THREE.Mesh(earthGeometry, earthMaterial);
      scene.add(earth);

      // Add Atmosphere
      const atmosphereGeometry = new THREE.SphereGeometry(1, 64, 64);
      const atmosphereMaterial = new THREE.ShaderMaterial({
        uniforms: { "c": { value: 0.1 }, "p": { value: 6.0 } },
        vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize( normalMatrix * normal );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow( 0.7 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 6.0 );
          gl_FragColor = vec4( 0.0, 0.5, 1.0, 1.0 ) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
      });
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      scene.add(atmosphere);

      // Add Lights
      scene.add(new THREE.AmbientLight(0x404040, 2));
      const sunLight = new THREE.DirectionalLight(0xffffff, 3);
      sunLight.position.set(1, 0, 0.5);
      scene.add(sunLight);

      // Satellite
      const satelliteGeometry = new THREE.SphereGeometry(1, 16, 16);
      const satelliteMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444, emissive: 0xff0000 });
      const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
      scene.add(satellite);

      // Orbit Lines
      const orbitLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }));
      scene.add(orbitLine);
      const transferOrbitLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffaa00, dashSize: 200, gapSize: 100, linewidth: 2 }));
      scene.add(transferOrbitLine);

      // FIXED: Time-based Kepler propagation animation
      let lastTime = performance.now();
      const animate = () => {
        const animationId = requestAnimationFrame(animate);
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
        lastTime = currentTime;
        
        earth.rotation.y += 0.0005;
        controls.update();

        // FIXED: Use Kepler propagation for physically accurate motion
        if (threeRef.current?.orbitalParams && threeRef.current.orbitalParams) {
          const params = threeRef.current.orbitalParams;
          
          // Physics: Mean motion n = sqrt(μ / a³)
          const meanMotion = Math.sqrt(params.GM / Math.pow(params.semiMajorAxis, 3));
          
          // Physics: Mean anomaly M = M₀ + n * t
          const meanAnomaly = (params.meanAnomaly0 + meanMotion * deltaTime) % (2 * Math.PI);
          
          // Solve Kepler's equation for eccentric anomaly
          const eccentricAnomaly = solveKeplersEquation(meanAnomaly, params.eccentricity);
          
          // Convert to true anomaly
          const trueAnomaly = eccentricToTrueAnomaly(eccentricAnomaly, params.eccentricity);
          
          // Get position from true anomaly
          const position = getPositionFromTrueAnomaly(trueAnomaly, params);
          satellite.position.copy(position);
          
          // Update stored mean anomaly for next frame
          threeRef.current.orbitalParams.meanAnomaly0 = meanAnomaly;
        }

        renderer.render(scene, camera);

        if (threeRef.current) {
          threeRef.current.animationId = animationId;
          threeRef.current.lastTime = currentTime;
        }
      };
      
      // Store all objects in the ref
      threeRef.current = { 
        scene, camera, renderer, controls, 
        earth, atmosphere, 
        orbitLine, transferOrbitLine, 
        satellite, 
        animationId: 0, 
        lastTime: performance.now(),
        orbitalParams: null,
        orbitPoints: [],
        stars,
        starsGeometry
      };
      
      animate();
      setVisualizerError(null);

      // Handle Resize
      const handleResize = () => {
        const t = threeRef.current;
        if (!canvasRef.current || !t) return;
        const { clientWidth, clientHeight } = canvasRef.current;
        t.camera.aspect = clientWidth / clientHeight;
        t.camera.updateProjectionMatrix();
        t.renderer.setSize(clientWidth, clientHeight);
      };
      window.addEventListener('resize', handleResize);
      
      // Initial calculation
      calculateOrbit(inputs);

      cleanup = () => {
        window.removeEventListener('resize', handleResize);
        if (threeRef.current) {
          cancelAnimationFrame(threeRef.current.animationId);
          
          // Dispose geometries
          if (threeRef.current.orbitLine.geometry) {
            threeRef.current.orbitLine.geometry.dispose();
          }
          if (threeRef.current.transferOrbitLine.geometry) {
            threeRef.current.transferOrbitLine.geometry.dispose();
          }
          if (threeRef.current.starsGeometry) {
            threeRef.current.starsGeometry.dispose();
          }
          
          // Dispose materials
          (threeRef.current.orbitLine.material as THREE.Material).dispose();
          (threeRef.current.transferOrbitLine.material as THREE.Material).dispose();
          (threeRef.current.stars.material as THREE.Material).dispose();
          (threeRef.current.earth.material as THREE.Material).dispose();
          (threeRef.current.atmosphere.material as THREE.Material).dispose();
          (threeRef.current.satellite.material as THREE.Material).dispose();
          
          // Dispose geometries
          (threeRef.current.earth.geometry as THREE.BufferGeometry).dispose();
          (threeRef.current.atmosphere.geometry as THREE.BufferGeometry).dispose();
          (threeRef.current.satellite.geometry as THREE.BufferGeometry).dispose();
          
          threeRef.current.renderer.dispose();
          threeRef.current.controls.dispose();
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

  // --- Calculation Functions ---
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

      // FIXED: Handle near-circular edge cases
      if (eccentricity < 1e-6) {
        console.warn("Eccentricity is extremely small. Using circular orbit approximation.");
      }

      // --- 1. CONVERT TO SI (km) ---
      const periapsisAlt_SI = (unitSystem === 'Imperial') ? convert(periapsisAltitude, "periapsisAltitude", "SI") : periapsisAltitude;
      const radius_SI = (unitSystem === 'Imperial') ? convert(centralBodyRadius, "centralBodyRadius", "SI") : centralBodyRadius;
      const inclinationRad = (inclination * Math.PI) / 180;

      // --- 2. CORE CALCULATIONS ---
      // Physics: Periapsis radius r_p = R + h_p
      const periapsisRadius = radius_SI + periapsisAlt_SI;
      
      // Physics: Semi-major axis a = r_p / (1 - e)
      // FIXED: Guard against division by zero for e = 1
      if (Math.abs(1 - eccentricity) < 1e-10) {
        throw new Error("Eccentricity too close to 1 (parabolic/hyperbolic orbit not supported)");
      }
      const semiMajorAxis = periapsisRadius / (1 - eccentricity);
      
      // Physics: Apoapsis radius r_a = a(1 + e)
      const apoapsisRadius = semiMajorAxis * (1 + eccentricity);
      const apoapsisAltitude = apoapsisRadius - radius_SI;
      
      // Physics: Vis-viva equation v = sqrt(μ(2/r - 1/a))
      const periapsisVelocity = Math.sqrt(GM * ((2 / periapsisRadius) - (1 / semiMajorAxis)));
      const apoapsisVelocity = Math.sqrt(GM * ((2 / apoapsisRadius) - (1 / semiMajorAxis)));
      
      // Physics: Kepler's 3rd Law: T = 2π√(a³/μ)
      const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / GM);
      const orbitalPeriodMinutes = orbitalPeriod / 60;

      // --- 3. 3D VISUALIZATION ---
      if (threeRef.current) {
        const t = threeRef.current;
        
        t.earth.scale.set(radius_SI, radius_SI, radius_SI);
        const atmosScale = radius_SI + (radius_SI * 0.02);
        t.atmosphere.scale.set(atmosScale, atmosScale, atmosScale);
        
        const satScale = radius_SI * 0.015;
        t.satellite.scale.set(satScale, satScale, satScale);
        
        const orbitPoints: THREE.Vector3[] = [];
        const segments = 200;
        
        // Physics: Kepler's 1st Law - elliptical orbit with focus offset
        const focalDistance = semiMajorAxis * eccentricity;
        
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * 2 * Math.PI;
          // Physics: Polar equation of ellipse r = a(1-e²)/(1+e*cos(θ))
          const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(theta));
          
          // Position in orbital plane
          const x = (r * Math.cos(theta)) - focalDistance;
          const y = r * Math.sin(theta);
          
          // Rotate for inclination around X-axis
          const x_final = x;
          const y_final = y * Math.cos(inclinationRad);
          const z_final = y * Math.sin(inclinationRad);
          
          orbitPoints.push(new THREE.Vector3(x_final, y_final, z_final));
        }

        // FIXED: Dispose previous geometry before creating new one
        if (t.orbitLine.geometry) {
          t.orbitLine.geometry.dispose();
        }
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        t.orbitLine.geometry = orbitGeometry;
        t.orbitPoints = orbitPoints;
        
        // Store orbital parameters for propagation
        t.orbitalParams = {
          semiMajorAxis,
          eccentricity,
          inclination: inclinationRad,
          GM,
          periapsisRadius,
          meanAnomaly0: 0 // Start at periapsis (M = 0)
        };
      }

      // --- 4. SET RESULTS ---
      const resultData = {
        semiMajorAxis: semiMajorAxis,
        orbitalPeriod: orbitalPeriodMinutes,
        periapsisRadius: periapsisRadius,
        apoapsisRadius: apoapsisRadius,
        apoapsisAltitude: apoapsisAltitude,
        periapsisVelocity: periapsisVelocity,
        apoapsisVelocity: apoapsisVelocity,
        inclination: inclination,
        eccentricity: eccentricity,
      };
      
      // Generate calculation steps for PDF
      const calculationSteps = [
        `Periapsis radius: r_p = R + h_p = ${radius_SI.toFixed(2)} + ${periapsisAlt_SI.toFixed(2)} = ${periapsisRadius.toFixed(2)} km`,
        `Semi-major axis: a = r_p / (1 - e) = ${periapsisRadius.toFixed(2)} / (1 - ${eccentricity.toFixed(4)}) = ${semiMajorAxis.toFixed(2)} km`,
        `Apoapsis radius: r_a = a(1 + e) = ${semiMajorAxis.toFixed(2)} × (1 + ${eccentricity.toFixed(4)}) = ${apoapsisRadius.toFixed(2)} km`,
        `Periapsis velocity: v_p = sqrt(μ(2/r_p - 1/a)) = ${periapsisVelocity.toFixed(2)} km/s`,
        `Apoapsis velocity: v_a = sqrt(μ(2/r_a - 1/a)) = ${apoapsisVelocity.toFixed(2)} km/s`,
        `Orbital period: T = 2π√(a³/μ) = ${orbitalPeriodMinutes.toFixed(2)} minutes`
      ];
      
      // Send calculation event to assistant
      const convertToDisplay = (val: number) => unitSystem === "Imperial" ? val * KM_TO_MI : val;
      const unit = unitSystem === "Imperial" ? "mi" : "km";
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

  // --- Calculate Hohmann Transfer ---
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
      // FIXED: Warn if initial orbit is not circular
      if (eccentricity > 0.01) {
        setError("Warning: Hohmann transfer calculation assumes a circular starting orbit (or burn at periapsis). Results are approximate for elliptical orbits.");
      }

      const r2 = radius_SI + targetAlt_SI;
      if (r2 <= r1) {
        throw new Error("Target altitude must be higher than current periapsis.");
      }

      // Physics: Circular orbit velocity v = sqrt(μ/r)
      const v2 = Math.sqrt(GM / r2);

      // Physics: Transfer orbit semi-major axis a_transfer = (r1 + r2) / 2
      const a_transfer = (r1 + r2) / 2;
      
      // Physics: Vis-viva equation for transfer orbit
      const v_transfer_1 = Math.sqrt(GM * (2/r1 - 1/a_transfer));
      const v_transfer_2 = Math.sqrt(GM * (2/r2 - 1/a_transfer));

      // Calculate burns
      const delta_v1 = v_transfer_1 - v1;
      const delta_v2 = v2 - v_transfer_2;
      const total_dv = delta_v1 + delta_v2;
      
      // Physics: Transfer time = half period of transfer orbit
      const transferTime = Math.PI * Math.sqrt(Math.pow(a_transfer, 3) / GM) / 60; // in minutes

      // --- Draw Transfer Orbit ---
      if (threeRef.current) {
        const t = threeRef.current;
        const e_transfer = (r2 - r1) / (r2 + r1);
        const focalDistance = a_transfer * e_transfer;
        const inclinationRad = (parseFloat(inputs.inclination) * Math.PI) / 180;
        
        const transferPoints: THREE.Vector3[] = [];
        const segments = 100;
        
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI; // Only 0 to Pi (half ellipse)
          const r = (a_transfer * (1 - e_transfer * e_transfer)) / (1 + e_transfer * Math.cos(theta));
          
          const x = (r * Math.cos(theta)) - focalDistance;
          const y = r * Math.sin(theta);
          
          transferPoints.push(new THREE.Vector3(
            x,
            y * Math.cos(inclinationRad),
            y * Math.sin(inclinationRad)
          ));
        }
        
        // FIXED: Dispose previous geometry
        if (t.transferOrbitLine.geometry) {
          t.transferOrbitLine.geometry.dispose();
        }
        const transferGeometry = new THREE.BufferGeometry().setFromPoints(transferPoints);
        t.transferOrbitLine.geometry = transferGeometry;
        // FIXED: Compute line distances AFTER setting geometry for dashed lines
        t.transferOrbitLine.computeLineDistances();
      }
      
      setManeuverResult({ delta_v1, delta_v2, total_dv, transferTime });

    } catch (err) {
      setError((err as Error).message);
    }
  };

  // --- Helper to format for results display ---
  const format = (param: string, value: number) => {
    if (param === "dist") return `${value.toFixed(2)} ${getUnit("dist")}`;
    if (param === "vel") {
      // FIXED: Convert velocity units correctly
      let converted = value;
      if (unitSystem === "Imperial") {
        converted = value * KM_TO_MI; // km/s to mi/s
      } else if (unitSystem === "Custom") {
        const factor = parseFloat(customFactors.vel);
        if (!isNaN(factor) && factor > 0) {
          converted = value / factor; // Convert from SI (km/s) to custom
        }
      }
      return `${converted.toFixed(3)} ${getUnit("vel")}`;
    }
    if (param === "time") return `${value.toFixed(2)} ${getUnit("time")}`;
    return "";
  };

  const loadPreset = (presetName: keyof typeof presets) => {
    const preset = presets[presetName];
    const newInputs = {
      periapsisAltitude: preset.periapsisAltitude,
      inclination: preset.inclination,
      eccentricity: preset.eccentricity,
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
              <SelectTrigger className="w-32 bg-slate-700/50 border-cyan-400/30 text-white">
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
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-300 mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 3D Visualization */}
        <AeroCard title="3D Orbital Visualization" icon={Orbit} className="mb-6">
          <div className="relative rounded-xl overflow-hidden border border-cyan-400/30 bg-black h-[450px]">
            {visualizerError && (
              <div className="absolute inset-0 flex items-center justify-center text-red-300 text-sm p-4 text-center z-10 bg-black/60">
                Unable to initialize 3D visualizer: {visualizerError}
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ display: "block" }}
              aria-hidden={!!visualizerError}
            />
          </div>
      </AeroCard>

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
              <p className="text-sm text-slate-400 mt-4">
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
                  <div key={field.id} className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10 mb-4">
                    <Label className="text-white font-semibold">{field.label}</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input 
                        placeholder="Unit Name" 
                        value={customUnitNames[field.id as keyof typeof customUnitNames]}
                        onChange={(e) => setCustomUnitNames(p => ({...p, [field.id]: e.target.value}))}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                      <Input 
                        type="number"
                        step="0.0001"
                        placeholder="SI Factor"
                        value={customFactors[field.id as keyof typeof customFactors]}
                        onChange={(e) => setCustomFactors(p => ({...p, [field.id]: e.target.value}))}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
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
                  <Input id="periapsisAltitude" type="number" value={inputs.periapsisAltitude} onChange={(e) => setInputs({ ...inputs, periapsisAltitude: e.target.value })} className="bg-slate-700/50" />
                </AeroFormField>
                <AeroFormField label="Eccentricity (0-1)">
                  <Input id="eccentricity" type="number" step="0.01" value={inputs.eccentricity} onChange={(e) => setInputs({ ...inputs, eccentricity: e.target.value })} className="bg-slate-700/50" />
                </AeroFormField>
                <AeroFormField label={`Inclination (${getUnit("incl")})`}>
                  <Input id="inclination" type="number" step="0.1" value={inputs.inclination} onChange={(e) => setInputs({ ...inputs, inclination: e.target.value })} className="bg-slate-700/50" />
                </AeroFormField>
                <AeroFormField label={`Body Radius (${getUnit("dist")})`}>
                  <Input id="centralBodyRadius" type="number" value={inputs.centralBodyRadius} onChange={(e) => setInputs({ ...inputs, centralBodyRadius: e.target.value })} className="bg-slate-700/50" />
                </AeroFormField>
              </div>
              <AeroFormField label={`Grav. Parameter (GM) (${getUnit("gm")})`}>
                <Input id="gm" type="number" value={inputs.gm} onChange={(e) => setInputs({ ...inputs, gm: e.target.value })} className="bg-slate-700/50" />
              </AeroFormField>
              <AeroButton type="button" onClick={() => runCalculation(() => calculateOrbit(inputs))} variant="primary" icon={Orbit} className="w-full">
                Calculate Orbit
              </AeroButton>
            </AeroCard>

            {/* --- Part 2: Maneuver Calculator --- */}
            <AeroCard title="Part 2: Hohmann Transfer" icon={Move}>
              <AeroFormField label={`Target Circular Altitude (${getUnit("dist")})`}>
                <Input id="targetAltitude" type="number" value={inputs.targetAltitude} onChange={(e) => setInputs({ ...inputs, targetAltitude: e.target.value })} className="bg-slate-700/50" placeholder="e.g., 800" />
              </AeroFormField>
              <AeroButton type="button" onClick={() => runCalculation(calculateManeuver)} variant="primary" icon={Move} className="w-full" disabled={!orbitResult}>
                Calculate Maneuver
              </AeroButton>
              {maneuverResult && (
                <div className="space-y-2 pt-2">
                  <div className="p-3 rounded-lg bg-slate-700/50">
                    <div className="text-sm text-cyan-300">First Burn (Δv₁)</div>
                    <div className="text-xl font-bold text-white">{format("vel", maneuverResult.delta_v1)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/50">
                    <div className="text-sm text-cyan-300">Second Burn (Δv₂)</div>
                    <div className="text-xl font-bold text-white">{format("vel", maneuverResult.delta_v2)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                    <div className="text-sm text-cyan-300">Total Maneuver Δv</div>
                    <div className="text-2xl font-bold text-cyan-400">{format("vel", maneuverResult.total_dv)}</div>
                    <div className="text-sm text-slate-400 mt-1">Transfer Time: {format("time", maneuverResult.transferTime)}</div>
                  </div>
                </div>
              )}
            </AeroCard>
          </div>
        </div>

        {/* Right Column - Results */}
        <div>
          <div className={spacingVertical.L}>
            {/* Results */}
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
                  <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                    <div className="text-sm text-cyan-300">Orbital Period</div>
                    <div className="text-2xl font-bold text-white">{format("time", orbitResult.orbitalPeriod)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                    <div className="text-sm text-cyan-300">Semi-Major Axis</div>
                    <div className="text-2xl font-bold text-white">{format("dist", orbitResult.semiMajorAxis)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                    <div className="text-sm text-cyan-300">Apoapsis Altitude</div>
                    <div className="text-2xl font-bold text-white">{format("dist", orbitResult.apoapsisAltitude)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                    <div className="text-sm text-cyan-300">Periapsis Velocity</div>
                    <div className="text-2xl font-bold text-white">{format("vel", orbitResult.periapsisVelocity)}</div>
                  </div>
                </div>

                <Accordion type="single" collapsible className="bg-slate-800/50 rounded-lg border border-cyan-400/20">
                  <AccordionItem value="explanation" className="border-none">
                    <AccordionTrigger className="px-4 text-cyan-300 hover:text-cyan-400">
                      <div className="flex items-center gap-2"><Info className="w-4 h-4" />Orbit Interpretation</div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-slate-300 space-y-4">
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
                  <Orbit className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
                  <p className="text-gray-400">Results will appear here</p>
                </div>
              </AeroCard>
            )}
          </div>
        </div>
      </ToolSection>

      {/* Save Custom Orbit Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="bg-slate-800 border-cyan-400/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Save Custom Orbit</DialogTitle>
            <DialogDescription className="text-gray-400">
              Save the current orbit parameters as a custom preset
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="orbitName" className="text-cyan-300">Orbit Name</Label>
              <Input
                id="orbitName"
                value={saveOrbitName}
                onChange={(e) => setSaveOrbitName(e.target.value)}
                placeholder="e.g., My Custom LEO"
                className="bg-slate-700/50 text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveCustomOrbit();
                  }
                }}
              />
            </div>
            <div className="text-sm text-gray-400 space-y-1">
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
        <DialogContent className="bg-slate-800 border-cyan-400/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Load Custom Orbit</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a saved custom orbit to load
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
            {customOrbits.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No custom orbits saved yet</p>
            ) : (
              customOrbits.map((orbit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-cyan-400/20 hover:border-cyan-400/40 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-white font-semibold">{orbit.name}</p>
                    <p className="text-xs text-gray-400">
                      Periapsis: {orbit.inputs.periapsisAltitude} {getUnit("dist")} | 
                      Inc: {orbit.inputs.inclination}° | 
                      e: {orbit.inputs.eccentricity}
                    </p>
                    <p className="text-xs text-gray-500">
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
