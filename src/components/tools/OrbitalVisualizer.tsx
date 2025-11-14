import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Rocket, Info } from "lucide-react";
import * as THREE from "three";
import { evaluate } from "mathjs";

type UnitSystem = "SI" | "Imperial" | "Custom";

interface OrbitalInputs {
  altitude: string;
  inclination: string;
  eccentricity: string;
  centralBodyRadius: string;
}

const OrbitalVisualizer = () => {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    return (localStorage.getItem("orbitalUnitSystem") as UnitSystem) || "SI";
  });

  const [inputs, setInputs] = useState<OrbitalInputs>(() => {
    const saved = localStorage.getItem("orbitalInputs");
    return saved ? JSON.parse(saved) : {
      altitude: "400",
      inclination: "51.6",
      eccentricity: "0.0005",
      centralBodyRadius: "6371"
    };
  });

  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    orbit: THREE.Line;
    satellite: THREE.Mesh;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem("orbitalUnitSystem", unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    localStorage.setItem("orbitalInputs", JSON.stringify(inputs));
  }, [inputs]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      50,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      100000
    );
    camera.position.set(0, 15000, 20000);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Add stars
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
    const starsVertices = [];
    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 100000;
      const y = (Math.random() - 0.5) * 100000;
      const z = (Math.random() - 0.5) * 100000;
      starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Add Earth
    const earthGeometry = new THREE.SphereGeometry(6371, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x2233ff,
      emissive: 0x112244,
      shininess: 25
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Add atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(6500, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3);
    sunLight.position.set(50000, 0, 0);
    scene.add(sunLight);

    // Create satellite
    const satelliteGeometry = new THREE.SphereGeometry(100, 16, 16);
    const satelliteMaterial = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });
    const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
    scene.add(satellite);

    // Create orbit line placeholder
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const orbitGeometry = new THREE.BufferGeometry();
    const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    scene.add(orbit);

    let animationId: number;
    let angle = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Rotate Earth
      earth.rotation.y += 0.001;
      atmosphere.rotation.y += 0.001;
      
      // Animate satellite along orbit
      if (sceneRef.current?.orbit) {
        angle += 0.005;
        const positions = sceneRef.current.orbit.geometry.attributes.position.array;
        if (positions.length > 0) {
          const index = Math.floor((angle % (2 * Math.PI)) / (2 * Math.PI) * (positions.length / 3)) * 3;
          satellite.position.set(
            positions[index] || 0,
            positions[index + 1] || 0,
            positions[index + 2] || 0
          );
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { scene, camera, renderer, orbit, satellite, animationId };

    // Handle resize
    const handleResize = () => {
      if (!canvasRef.current) return;
      camera.aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
    };
  }, []);

  const convertToSI = (value: number, param: keyof OrbitalInputs): number => {
    if (unitSystem === "SI") return value;
    if (param === "altitude" || param === "centralBodyRadius") {
      return unitSystem === "Imperial" ? value * 1.60934 : value;
    }
    return value;
  };

  const getUnit = (param: keyof OrbitalInputs): string => {
    const units = {
      SI: { altitude: "km", inclination: "°", eccentricity: "", centralBodyRadius: "km" },
      Imperial: { altitude: "mi", inclination: "°", eccentricity: "", centralBodyRadius: "mi" },
      Custom: { altitude: "km", inclination: "°", eccentricity: "", centralBodyRadius: "km" }
    };
    return units[unitSystem][param];
  };

  const calculateOrbit = () => {
    setError("");
    try {
      const altitude = parseFloat(inputs.altitude);
      const inclination = parseFloat(inputs.inclination);
      const eccentricity = parseFloat(inputs.eccentricity);
      const centralBodyRadius = parseFloat(inputs.centralBodyRadius);

      if (isNaN(altitude) || isNaN(inclination) || isNaN(eccentricity) || isNaN(centralBodyRadius)) {
        setError("Please fill in all fields with valid numbers");
        return;
      }

      if (altitude < 0 || centralBodyRadius < 0) {
        setError("Altitude and radius must be positive");
        return;
      }

      if (eccentricity < 0 || eccentricity >= 1) {
        setError("Eccentricity must be between 0 and 1 for elliptical orbits");
        return;
      }

      if (inclination < 0 || inclination > 180) {
        setError("Inclination must be between 0° and 180°");
        return;
      }

      const altitudeSI = convertToSI(altitude, "altitude");
      const radiusSI = convertToSI(centralBodyRadius, "centralBodyRadius");
      const inclinationRad = (inclination * Math.PI) / 180;

      // Orbital calculations
      const semiMajorAxis = radiusSI + altitudeSI;
      const GM = 398600.4418; // Earth's gravitational parameter (km³/s²)
      
      // Kepler's Third Law: T² = (4π²/GM) * a³
      const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / GM);
      const orbitalPeriodMinutes = orbitalPeriod / 60;

      // Orbital velocity: v = sqrt(GM/r)
      const orbitalVelocity = Math.sqrt(GM / semiMajorAxis);

      // Periapsis and Apoapsis
      const periapsis = semiMajorAxis * (1 - eccentricity);
      const apoapsis = semiMajorAxis * (1 + eccentricity);

      // Generate orbit points for 3D visualization
      if (sceneRef.current) {
        const orbitPoints = [];
        const segments = 200;
        
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * 2 * Math.PI;
          const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(theta));
          
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta) * Math.sin(inclinationRad);
          const z = r * Math.sin(theta) * Math.cos(inclinationRad);
          
          orbitPoints.push(x, y, z);
        }

        const orbitGeometry = new THREE.BufferGeometry();
        orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitPoints, 3));
        sceneRef.current.orbit.geometry.dispose();
        sceneRef.current.orbit.geometry = orbitGeometry;
      }

      const calculationSteps = [
        `**Step 1:** Convert inputs to SI units`,
        `- Altitude: ${altitudeSI.toFixed(2)} km`,
        `- Central body radius: ${radiusSI.toFixed(2)} km`,
        `- Inclination: ${inclination}° = ${inclinationRad.toFixed(4)} radians`,
        ``,
        `**Step 2:** Calculate semi-major axis`,
        `- a = R + h = ${radiusSI.toFixed(2)} + ${altitudeSI.toFixed(2)} = ${semiMajorAxis.toFixed(2)} km`,
        ``,
        `**Step 3:** Apply Kepler's Third Law to find orbital period`,
        `- T = 2π√(a³/GM)`,
        `- T = 2π√(${semiMajorAxis.toFixed(2)}³ / 398600.4418)`,
        `- T = ${orbitalPeriod.toFixed(2)} seconds = ${orbitalPeriodMinutes.toFixed(2)} minutes`,
        ``,
        `**Step 4:** Calculate orbital velocity`,
        `- v = √(GM/a) = √(398600.4418 / ${semiMajorAxis.toFixed(2)})`,
        `- v = ${orbitalVelocity.toFixed(3)} km/s`,
        ``,
        `**Step 5:** Determine periapsis and apoapsis`,
        `- Periapsis = a(1-e) = ${semiMajorAxis.toFixed(2)}(1-${eccentricity}) = ${periapsis.toFixed(2)} km`,
        `- Apoapsis = a(1+e) = ${semiMajorAxis.toFixed(2)}(1+${eccentricity}) = ${apoapsis.toFixed(2)} km`
      ];

      setResults({
        semiMajorAxis: semiMajorAxis.toFixed(2),
        orbitalPeriod: orbitalPeriodMinutes.toFixed(2),
        orbitalVelocity: orbitalVelocity.toFixed(3),
        periapsis: periapsis.toFixed(2),
        apoapsis: apoapsis.toFixed(2),
        inclination: inclination.toFixed(2),
        eccentricity: eccentricity,
        steps: calculationSteps
      });

    } catch (err) {
      setError("Calculation error: " + String(err));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-7xl mx-auto"
    >
      <Card className="bg-slate-800/50 backdrop-blur-lg border-cyan-400/20 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                <Rocket className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-2xl text-cyan-400 font-bold">
                  Orbital Path Visualizer
                </CardTitle>
                <CardDescription className="text-slate-300">
                  3D orbital mechanics with Kepler's laws
                </CardDescription>
              </div>
            </div>
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-slate-700/50 border-cyan-400/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI (km)</SelectItem>
                <SelectItem value="Imperial">Imperial (mi)</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 3D Visualization */}
          <div className="rounded-xl overflow-hidden border border-cyan-400/30 bg-black">
            <canvas
              ref={canvasRef}
              className="w-full h-[400px]"
              style={{ display: "block" }}
            />
          </div>

          {/* Input Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="altitude" className="text-cyan-300">
                Altitude ({getUnit("altitude")})
              </Label>
              <Input
                id="altitude"
                type="number"
                step="0.1"
                value={inputs.altitude}
                onChange={(e) => setInputs({ ...inputs, altitude: e.target.value })}
                className="bg-slate-700/50 border-cyan-400/30 text-white focus:border-cyan-400"
                placeholder="e.g., 400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="centralBodyRadius" className="text-cyan-300">
                Central Body Radius ({getUnit("centralBodyRadius")})
              </Label>
              <Input
                id="centralBodyRadius"
                type="number"
                step="0.1"
                value={inputs.centralBodyRadius}
                onChange={(e) => setInputs({ ...inputs, centralBodyRadius: e.target.value })}
                className="bg-slate-700/50 border-cyan-400/30 text-white focus:border-cyan-400"
                placeholder="e.g., 6371 (Earth)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inclination" className="text-cyan-300">
                Inclination ({getUnit("inclination")})
              </Label>
              <Input
                id="inclination"
                type="number"
                step="0.1"
                value={inputs.inclination}
                onChange={(e) => setInputs({ ...inputs, inclination: e.target.value })}
                className="bg-slate-700/50 border-cyan-400/30 text-white focus:border-cyan-400"
                placeholder="e.g., 51.6 (ISS)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eccentricity" className="text-cyan-300">
                Eccentricity (0-1)
              </Label>
              <Input
                id="eccentricity"
                type="number"
                step="0.0001"
                value={inputs.eccentricity}
                onChange={(e) => setInputs({ ...inputs, eccentricity: e.target.value })}
                className="bg-slate-700/50 border-cyan-400/30 text-white focus:border-cyan-400"
                placeholder="e.g., 0.0005"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={calculateOrbit}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:shadow-[0_0_40px_rgba(34,211,238,0.8)] transition-all duration-300"
          >
            <Rocket className="w-4 h-4 mr-2" />
            Calculate Orbit
          </Button>

          {/* Results */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                  <div className="text-sm text-cyan-300">Semi-Major Axis</div>
                  <div className="text-2xl font-bold text-white">{results.semiMajorAxis} km</div>
                </div>
                <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                  <div className="text-sm text-cyan-300">Orbital Period</div>
                  <div className="text-2xl font-bold text-white">{results.orbitalPeriod} min</div>
                </div>
                <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                  <div className="text-sm text-cyan-300">Velocity</div>
                  <div className="text-2xl font-bold text-white">{results.orbitalVelocity} km/s</div>
                </div>
                <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                  <div className="text-sm text-cyan-300">Periapsis</div>
                  <div className="text-2xl font-bold text-white">{results.periapsis} km</div>
                </div>
                <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                  <div className="text-sm text-cyan-300">Apoapsis</div>
                  <div className="text-2xl font-bold text-white">{results.apoapsis} km</div>
                </div>
                <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                  <div className="text-sm text-cyan-300">Inclination</div>
                  <div className="text-2xl font-bold text-white">{results.inclination}°</div>
                </div>
              </div>

              {/* Kepler's Laws Explanation */}
              <Accordion type="single" collapsible className="bg-slate-700/30 rounded-lg border border-cyan-400/20">
                <AccordionItem value="explanation" className="border-none">
                  <AccordionTrigger className="px-4 text-cyan-300 hover:text-cyan-400">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Kepler's Laws & Step-by-Step Calculation
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-slate-300 space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-bold text-cyan-400">Kepler's Three Laws:</h4>
                      <div className="pl-4 space-y-2">
                        <p><strong>1. Law of Orbits:</strong> All planets move in elliptical orbits with the Sun at one focus.</p>
                        <p><strong>2. Law of Areas:</strong> A line joining a planet and the Sun sweeps out equal areas in equal time intervals.</p>
                        <p><strong>3. Law of Periods:</strong> The square of the orbital period is proportional to the cube of the semi-major axis (T² ∝ a³).</p>
                      </div>
                    </div>

                    <div className="border-t border-cyan-400/20 pt-4">
                      <h4 className="font-bold text-cyan-400 mb-2">Calculation Steps:</h4>
                      <div className="space-y-1 text-sm font-mono">
                        {results.steps.map((step: string, i: number) => (
                          <p key={i} className="leading-relaxed">{step}</p>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-cyan-400/20 pt-4">
                      <h4 className="font-bold text-cyan-400">Interpretation:</h4>
                      <p className="text-sm">
                        This orbit has an eccentricity of {results.eccentricity}, making it {results.eccentricity < 0.01 ? 'nearly circular' : 'elliptical'}. 
                        The satellite completes one full orbit every {results.orbitalPeriod} minutes at an average velocity of {results.orbitalVelocity} km/s. 
                        The inclination of {results.inclination}° determines the orbital plane's tilt relative to the equator.
                      </p>
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