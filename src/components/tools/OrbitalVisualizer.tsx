"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Rocket, Info, Orbit, Move } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type UnitSystem = "SI" | "Imperial";

// --- Constants ---
const GM_EARTH = 398600.4418; // Earth's gravitational parameter (km³/s²)
const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

interface OrbitalInputs {
  periapsisAltitude: string;
  inclination: string;
  eccentricity: string;
  centralBodyRadius: string;
  gm: string;
  targetAltitude: string;
}

const OrbitalVisualizer = () => {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    return (localStorage.getItem("orbitalUnitSystem") as UnitSystem) || "SI";
  });

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

  const [orbitResult, setOrbitResult] = useState<any>(null);
  const [maneuverResult, setManeuverResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Store all Three.js objects in a ref to persist them
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
    angle: number;
    orbitPoints: THREE.Vector3[];
  } | null>(null);

  // --- LocalStorage Effects ---
  useEffect(() => {
    localStorage.setItem("orbitalUnitSystem", unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    localStorage.setItem("orbitalInputs", JSON.stringify(inputs));
  }, [inputs]);

  // --- Three.js Initialization ---
  useEffect(() => {
    if (!canvasRef.current || threeRef.current) return; // Only init once

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Dark blue space

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
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64); // Start with radius 1
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
    const satelliteGeometry = new THREE.SphereGeometry(1, 16, 16); // Start small
    const satelliteMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444, emissive: 0xff0000 });
    const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
    scene.add(satellite);

    // Orbit Lines
    const orbitLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }));
    scene.add(orbitLine);
    const transferOrbitLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffaa00, dashSize: 200, gapSize: 100, linewidth: 2 }));
    scene.add(transferOrbitLine);

    // Animation Loop
    let angle = 0;
    let orbitPoints: THREE.Vector3[] = [];

    const animate = () => {
      const animationId = requestAnimationFrame(animate);
      
      earth.rotation.y += 0.0005;
      controls.update();

      // Animate satellite along the calculated path
      if (orbitPoints.length > 1) {
        angle = (angle + 0.002) % (2 * Math.PI); // Note: This is still constant speed, not Kepler's 2nd Law
        const index = Math.floor((angle / (2 * Math.PI)) * orbitPoints.length);
        if (orbitPoints[index]) {
          satellite.position.copy(orbitPoints[index]);
        }
      }

      renderer.render(scene, camera);

      // Store mutable values back into ref
      if (threeRef.current) {
        threeRef.current.animationId = animationId;
        threeRef.current.angle = angle;
      }
    };
    
    // Store all objects in the ref
    threeRef.current = { 
      scene, camera, renderer, controls, 
      earth, atmosphere, 
      orbitLine, transferOrbitLine, 
      satellite, 
      animationId: 0, angle, orbitPoints
    };
    
    animate();

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
    calculateOrbit(inputs); // Pass initial inputs

    return () => {
      window.removeEventListener('resize', handleResize);
      if (threeRef.current) {
        cancelAnimationFrame(threeRef.current.animationId);
        threeRef.current.renderer.dispose();
        threeRef.current.controls.dispose();
      }
      threeRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once

  // --- Unit Conversion ---
  const convert = (value: number, param: string, to: "SI" | "Imperial") => {
    if (unitSystem === to) return value;
    const key = (param === "periapsisAltitude" || param === "centralBodyRadius" || param === "targetAltitude") ? "dist" : "other";
    if (key !== "dist") return value;

    if (to === "SI") return value * MI_TO_KM; // Imperial to SI
    return value * KM_TO_MI; // SI to Imperial
  };

  const getUnit = (param: "dist" | "incl" | "ecc" | "gm" | "vel" | "time"): string => {
    const units = {
      SI: { dist: "km", incl: "°", ecc: "", gm: "km³/s²", vel: "km/s", time: "min" },
      Imperial: { dist: "mi", incl: "°", ecc: "", gm: "km³/s²", vel: "mi/s", time: "min" }
    };
    return units[unitSystem][param];
  };

  // --- Calculation Functions ---
  const calculateOrbit = (currentInputs: OrbitalInputs) => {
    setError("");
    setManeuverResult(null);
    if (threeRef.current) threeRef.current.transferOrbitLine.geometry = new THREE.BufferGeometry(); // Clear transfer orbit

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

      // --- 1. CONVERT TO SI (km) ---
      const periapsisAlt_SI = (unitSystem === 'Imperial') ? convert(periapsisAltitude, "periapsisAltitude", "SI") : periapsisAltitude;
      const radius_SI = (unitSystem === 'Imperial') ? convert(centralBodyRadius, "centralBodyRadius", "SI") : centralBodyRadius;
      const inclinationRad = (inclination * Math.PI) / 180;

      // --- 2. CORE CALCULATIONS (FIXED) ---
      // This is the correct, universal physics
      const periapsisRadius = radius_SI + periapsisAlt_SI;
      const semiMajorAxis = periapsisRadius / (1 - eccentricity);
      const apoapsisRadius = semiMajorAxis * (1 + eccentricity);
      const apoapsisAltitude = apoapsisRadius - radius_SI;
      const periapsisVelocity = Math.sqrt(GM * ((2 / periapsisRadius) - (1 / semiMajorAxis)));
      const apoapsisVelocity = Math.sqrt(GM * ((2 / apoapsisRadius) - (1 / semiMajorAxis)));
      const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / GM);
      const orbitalPeriodMinutes = orbitalPeriod / 60;

      // --- 3. 3D VISUALIZATION (FIXED) ---
      if (threeRef.current) {
        const t = threeRef.current;
        
        t.earth.scale.set(radius_SI, radius_SI, radius_SI);
        const atmosScale = radius_SI + (radius_SI * 0.02);
        t.atmosphere.scale.set(atmosScale, atmosScale, atmosScale);
        
        const satScale = radius_SI * 0.015;
        t.satellite.scale.set(satScale, satScale, satScale);
        
        const orbitPoints: THREE.Vector3[] = [];
        const segments = 200;
        
        // This is Kepler's 1st Law: shift orbit by focal distance 'c'
        const focalDistance = semiMajorAxis * eccentricity;
        
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * 2 * Math.PI;
          const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(theta));
          
          // 1. Create orbit in X-Y plane, shifted by focal distance
          const x = (r * Math.cos(theta)) - focalDistance;
          const y = r * Math.sin(theta);
          
          // 2. Rotate around X-axis for inclination
          const x_final = x;
          const y_final = y * Math.cos(inclinationRad);
          const z_final = y * Math.sin(inclinationRad);
          
          orbitPoints.push(new THREE.Vector3(x_final, y_final, z_final));
        }

        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        t.orbitLine.geometry.dispose();
        t.orbitLine.geometry = orbitGeometry;
        t.orbitPoints = orbitPoints; // Save for animation
      }

      // --- 4. SET RESULTS ---
      setOrbitResult({
        semiMajorAxis: semiMajorAxis,
        orbitalPeriod: orbitalPeriodMinutes,
        periapsisRadius: periapsisRadius,
        apoapsisRadius: apoapsisRadius,
        apoapsisAltitude: apoapsisAltitude,
        periapsisVelocity: periapsisVelocity,
        apoapsisVelocity: apoapsisVelocity,
        inclination: inclination,
        eccentricity: eccentricity,
      });

    } catch (err) {
      setError((err as Error).message);
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
      
      const r1 = orbitResult.periapsisRadius; // Use periapsis of initial orbit as start
      const v1 = orbitResult.periapsisVelocity; // Velocity at r1 in initial orbit
      
      const eccentricity = parseFloat(inputs.eccentricity);
      if (eccentricity > 0.001) {
         setError("Hohmann transfer calculation assumes a circular starting orbit (or burn at periapsis). Results are approximate.");
      }

      const r2 = radius_SI + targetAlt_SI;
      if (r2 <= r1) {
        throw new Error("Target altitude must be higher than current periapsis.");
      }

      // 1. Final circular orbit velocity
      const v2 = Math.sqrt(GM / r2);

      // 2. Transfer orbit parameters
      const a_transfer = (r1 + r2) / 2;
      
      // 3. Velocities *in the transfer orbit*
      const v_transfer_1 = Math.sqrt(GM * (2/r1 - 1/a_transfer)); // Vel at transfer periapsis
      const v_transfer_2 = Math.sqrt(GM * (2/r2 - 1/a_transfer)); // Vel at transfer apoapsis

      // 4. Calculate burns
      const delta_v1 = v_transfer_1 - v1;
      const delta_v2 = v2 - v_transfer_2;
      const total_dv = delta_v1 + delta_v2;
      const transferTime = Math.PI * Math.sqrt(Math.pow(a_transfer, 3) / GM) / 60; // in minutes

      // --- Draw Transfer Orbit ---
      if (threeRef.current) {
        const t = threeRef.current;
        const e_transfer = (r2 - r1) / (r2 + r1);
        const focalDistance = a_transfer * e_transfer;
        const inclinationRad = (parseFloat(inputs.inclination) * Math.PI) / 180;
        
        const transferPoints: THREE.Vector3[] = [];
        const segments = 100; // Half an ellipse
        
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI; // Only 0 to Pi
          const r = (a_transfer * (1 - e_transfer * e_transfer)) / (1 + e_transfer * Math.cos(theta));
          
          const x = (r * Math.cos(theta)) - focalDistance;
          const y = r * Math.sin(theta);
          
          transferPoints.push(new THREE.Vector3(
            x,
            y * Math.cos(inclinationRad),
            y * Math.sin(inclinationRad)
          ));
        }
        
        const transferGeometry = new THREE.BufferGeometry().setFromPoints(transferPoints);
        t.transferOrbitLine.geometry.dispose();
        t.transferOrbitLine.geometry = transferGeometry;
        t.transferOrbitLine.computeLineDistances(); // Compute distances *after* setting points
      }
      
      setManeuverResult({ delta_v1, delta_v2, total_dv, transferTime });

    } catch (err) {
      setError((err as Error).message);
    }
  };

  // --- Helper to format for results display ---
  const format = (param: string, value: number) => {
    if (param === "dist") return `${value.toFixed(2)} ${getUnit("dist")}`;
    if (param === "vel") return `${convert(value, "vel", unitSystem).toFixed(3)} ${getUnit("vel")}`;
    if (param === "time") return `${value.toFixed(2)} ${getUnit("time")}`;
    return "";
  };

  // FIX 3: This function now updates state AND calls the calculation
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
    setInputs(newInputs); // Update the input fields
    calculateOrbit(newInputs); // Instantly calculate the new orbit
    setError("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-7xl mx-auto"
    >
      <Card className="bg-slate-900/80 backdrop-blur-lg border-cyan-400/20 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                <Orbit className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-3xl text-cyan-400 font-bold">
                  Advanced Orbital Visualizer
                </CardTitle>
                <CardDescription className="text-slate-300 text-base">
                  Calculate and visualize orbital mechanics and maneuvers.
                </CardDescription>
              </div>
            </div>
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-slate-700/50 border-cyan-400/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI (km, s)</SelectItem>
                <SelectItem value="Imperial">Imperial (mi, s)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 3D Visualization */}
          <div className="rounded-xl overflow-hidden border border-cyan-400/30 bg-black h-[450px]">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ display: "block" }}
            />
          </div>
          
          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Preset Configurations */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-cyan-400/20">
            <h3 className="text-xl font-semibold text-cyan-400 mb-3">Quick Load Preset Orbits</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(Object.keys(presets) as Array<keyof typeof presets>).map((presetKey) => (
                <Button
                  key={presetKey}
                  type="button"
                  onClick={() => loadPreset(presetKey)}
                  variant="outline"
                  className="bg-slate-700/50 border-cyan-400/30 hover:bg-cyan-400/20 hover:border-cyan-400 transition-all text-white"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  {presetKey}
                </Button>
              ))}
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Click any preset to instantly load real-world satellite parameters
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* --- Part 1: Orbit Definition --- */}
            <div className="space-y-4 p-4 rounded-lg bg-slate-800/50 border border-cyan-400/20">
              <h3 className="text-xl font-semibold text-cyan-400">Part 1: Define Initial Orbit</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periapsisAltitude" className="text-cyan-300">Periapsis Altitude ({getUnit("dist")})</Label>
                  <Input id="periapsisAltitude" type="number" value={inputs.periapsisAltitude} onChange={(e) => setInputs({ ...inputs, periapsisAltitude: e.target.value })} className="bg-slate-700/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eccentricity" className="text-cyan-300">Eccentricity (0-1)</Label>
                  <Input id="eccentricity" type="number" step="0.01" value={inputs.eccentricity} onChange={(e) => setInputs({ ...inputs, eccentricity: e.target.value })} className="bg-slate-700/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inclination" className="text-cyan-300">Inclination ({getUnit("incl")})</Label>
                  <Input id="inclination" type="number" step="0.1" value={inputs.inclination} onChange={(e) => setInputs({ ...inputs, inclination: e.target.value })} className="bg-slate-700/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="centralBodyRadius" className="text-cyan-300">Body Radius ({getUnit("dist")})</Label>
                  <Input id="centralBodyRadius" type="number" value={inputs.centralBodyRadius} onChange={(e) => setInputs({ ...inputs, centralBodyRadius: e.target.value })} className="bg-slate-700/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gm" className="text-cyan-300">Grav. Parameter (GM) ({getUnit("gm")})</Label>
                <Input id="gm" type="number" value={inputs.gm} onChange={(e) => setInputs({ ...inputs, gm: e.target.value })} className="bg-slate-700/50" />
              </div>
              <Button type="button" onClick={() => calculateOrbit(inputs)} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold">
                <Orbit className="w-4 h-4 mr-2" />Calculate Orbit
              </Button>
            </div>
            
            {/* --- Part 2: Maneuver Calculator --- */}
            <div className="space-y-4 p-4 rounded-lg bg-slate-800/50 border border-cyan-400/20">
              <h3 className="text-xl font-semibold text-cyan-400">Part 2: Hohmann Transfer</h3>
              <div className="space-y-2">
                <Label htmlFor="targetAltitude" className="text-cyan-300">Target Circular Altitude ({getUnit("dist")})</Label>
                <Input id="targetAltitude" type="number" value={inputs.targetAltitude} onChange={(e) => setInputs({ ...inputs, targetAltitude: e.target.value })} className="bg-slate-700/50" placeholder="e.g., 800" />
              </div>
              <Button type="button" onClick={calculateManeuver} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold" disabled={!orbitResult}>
                <Move className="w-4 h-4 mr-2" />Calculate Maneuver
              </Button>
              {maneuverResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-2">
                  <div className="p-3 rounded-lg bg-slate-700/50">
                    <div className="text-sm text-cyan-300">First Burn ($\Delta v_1$)</div>
                    <div className="text-xl font-bold text-white">{format("vel", maneuverResult.delta_v1)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/50">
                    <div className="text-sm text-cyan-300">Second Burn ($\Delta v_2$)</div>
                    <div className="text-xl font-bold text-white">{format("vel", maneuverResult.delta_v2)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                    <div className="text-sm text-cyan-300">Total Maneuver $\Delta v$</div>
                    <div className="text-2xl font-bold text-cyan-400">{format("vel", maneuverResult.total_dv)}</div>
                    <div className="text-sm text-slate-400 mt-1">Transfer Time: {format("time", maneuverResult.transferTime)}</div>
                  </div>
                </motion.div>
              )}
            </div>
            
          </div>

          {/* Results */}
          {orbitResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      This orbit has an eccentricity of {orbitResult.eccentricity}, making it {orbitResult.eccentricity < 0.01 ? 'nearly circular' : 'noticeably elliptical'}. 
                      It completes one orbit every {format("time", orbitResult.orbitalPeriod)}.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <p><strong>Periapsis (Lowest Point):</strong><br /> {format("dist", orbitResult.periapsisRadius)} from center<br /> {format("vel", orbitResult.periapsisVelocity)} (Fastest)</p>
                      <p><strong>Apoapsis (Highest Point):</strong><br /> {format("dist", orbitResult.apoapsisRadius)} from center<br /> {format("vel", orbitResult.apoapsisVelocity)} (Slowest)</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default OrbitalVisualizer;
