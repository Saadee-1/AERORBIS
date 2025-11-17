/**
 * Antenna Pattern Analyzer
 * 
 * A comprehensive tool for analyzing antenna radiation patterns, calculating
 * gain, directivity, HPBW, side-lobe levels, and EIRP for aerospace applications.
 * 
 * Features:
 * - 30+ antenna types with physics-based pattern models
 * - 2D polar plots (Recharts) and optional 3D visualization (Three.js)
 * - Array factor calculations for phased arrays
 * - Directivity, HPBW, side-lobe level calculations
 * - EIRP and link budget estimates
 * - Export patterns (JSON/CSV)
 * - Theory accordion with formulas
 * 
 * Dependencies:
 * - Recharts for 2D plots
 * - Three.js + @react-three/fiber for 3D visualization
 * - All shadcn/ui components
 * 
 * Performance:
 * - Heavy computations (directivity, pattern generation) use useMemo
 * - Consider moving to web worker for very high resolution (>1°)
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  Radio,
  Settings2,
  Download,
  Upload,
  Info,
  AlertTriangle,
  TrendingUp,
  Zap,
  Calculator,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useToolContext } from "@/hooks/useToolContext";
import { useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, FolderOpen, Trash2 } from "lucide-react";

// Import antenna models and math utilities
import { ANTENNA_TYPES, getAntennaById, AntennaParams } from "@/lib/antenna/models";
import { computePattern, AntennaPatternResult, AntennaGeometry, PatternOptions } from "@/lib/antenna/models-enhanced";
import {
  wavelength,
  frequencyToHz,
  linearToDbi,
  dbiToLinear,
  calculateEIRP,
} from "@/lib/antenna/math";

// ============================================================================
// Types
// ============================================================================

interface PatternPoint {
  theta: number;
  phi: number;
  gainLinear: number;
  gainDbi: number;
}

interface SavedAntennaPreset {
  name: string;
  antennaId: string;
  antennaParams: AntennaParams;
  frequency: number;
  frequencyUnit: "Hz" | "MHz" | "GHz" | "Custom";
  transmitPower: number;
  polarization: string;
  resolution: number;
  computeMode: "fast" | "accurate";
  timestamp: number;
}

const STORAGE_KEY_CUSTOM_PRESETS = "antennaPatternAnalyzer_customPresets";

interface AntennaResult {
  peakGainDbi: number;
  peakGainLinear: number;
  directivity: number;
  directivityDbi: number;
  hpbmE: number | null;
  hpbmH: number | null;
  sideLobeLevel: number;
  frontToBackRatio: number;
  eirp: {
    eirpWatts: number;
    eirpDbw: number;
    eirpDbm: number;
  };
  warnings: string[];
  metadata?: AntennaPatternResult['metadata'];
}

// ============================================================================
// Main Component
// ============================================================================

const AntennaPatternAnalyzer = () => {
  const { toast } = useToast();
  const { updateToolContext } = useToolContext();

  // State
  const [selectedAntennaId, setSelectedAntennaId] = useState("half-wave-dipole");
  const [antennaParams, setAntennaParams] = useState<AntennaParams>({});
  const [frequency, setFrequency] = useState(1000); // MHz
  const [frequencyUnit, setFrequencyUnit] = useState<"Hz" | "MHz" | "GHz" | "Custom">("MHz");
  const [customFrequencyUnitName, setCustomFrequencyUnitName] = useState("Unit-f");
  const [customFrequencyFactor, setCustomFrequencyFactor] = useState("1.0");
  const [transmitPower, setTransmitPower] = useState(1); // W
  const [polarization, setPolarization] = useState("linear-vertical");
  const [resolution, setResolution] = useState(1); // degrees
  const [computeMode, setComputeMode] = useState<"fast" | "accurate">("fast");
  const [show3D, setShow3D] = useState(false);
  const [result, setResult] = useState<AntennaResult | null>(null);
  const [patternData, setPatternData] = useState<PatternPoint[]>([]);
  const canvas3DRef = useRef<HTMLCanvasElement>(null);
  const three3DRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    patternMesh: THREE.Mesh | null;
    animationId: number | null;
  } | null>(null);
  const [customPresets, setCustomPresets] = useState<SavedAntennaPreset[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");

  // Load custom frequency unit settings
  useEffect(() => {
    const storedCustomUnitName = localStorage.getItem("antennaPattern_customFrequencyUnitName");
    if (storedCustomUnitName) {
      setCustomFrequencyUnitName(storedCustomUnitName);
    }
    const storedCustomFactor = localStorage.getItem("antennaPattern_customFrequencyFactor");
    if (storedCustomFactor) {
      setCustomFrequencyFactor(storedCustomFactor);
    }
  }, []);

  // Save custom frequency unit settings
  useEffect(() => {
    if (frequencyUnit === "Custom") {
      localStorage.setItem("antennaPattern_customFrequencyUnitName", customFrequencyUnitName);
      localStorage.setItem("antennaPattern_customFrequencyFactor", customFrequencyFactor);
    }
  }, [frequencyUnit, customFrequencyUnitName, customFrequencyFactor]);

  // Get selected antenna
  const selectedAntenna = useMemo(() => {
    return getAntennaById(selectedAntennaId);
  }, [selectedAntennaId]);

  // Calculate wavelength
  const lambda = useMemo(() => {
    const customFactor = frequencyUnit === "Custom" ? parseFloat(customFrequencyFactor) : undefined;
    const freqHz = frequencyToHz(frequency, frequencyUnit, customFactor);
    return wavelength(freqHz);
  }, [frequency, frequencyUnit, customFrequencyFactor]);

  // Calculate frequency in Hz
  const frequencyHz = useMemo(() => {
    const customFactor = frequencyUnit === "Custom" ? parseFloat(customFrequencyFactor) : undefined;
    return frequencyToHz(frequency, frequencyUnit, customFactor);
  }, [frequency, frequencyUnit, customFrequencyFactor]);

  // Map old antenna IDs to new type names
  const mapAntennaIdToType = (id: string): string => {
    const mapping: Record<string, string> = {
      "isotropic": "isotropic",
      "short-dipole": "shortdipole",
      "half-wave-dipole": "halfwavedipole",
      "folded-dipole": "foldeddipole",
      "quarter-wave-monopole": "quarterwavemonopole",
      "ground-plane-monopole": "monopoleground",
      "rectangular-patch": "rectangularpatch",
      "circular-patch": "circularpatch",
      "slotted-patch": "rectangularpatch", // Similar
      "stacked-patch": "rectangularpatch", // Similar
      "horn": "horn",
      "parabolic-dish": "parabolicdish",
      "cassegrain": "cassegrain",
      "helical-axial": "helix",
      "helical-normal": "helix",
      "yagi": "yagi",
      "lpda": "lpda",
      "spiral": "spiral",
      "vivaldi": "vivaldi",
      "biconical": "biconical",
      "waveguide-slot": "waveguideslot",
      "patch-array": "patcharray",
      "linear-phased-array": "phasedarray",
      "planar-phased-array": "phasedarray",
      "circular-phased-array": "phasedarray",
      "conformal-array": "conformal",
      "quadrifilar-helix": "helix",
      "gnss-patch": "rectangularpatch",
      "dra": "dra",
    };
    return mapping[id] || id.replace(/-/g, '');
  };

  // Compute pattern using enhanced models
  const patternResult = useMemo(() => {
    if (!selectedAntenna) return null;

    try {
      // Convert antenna ID to type name for computePattern
      const antennaTypeName = mapAntennaIdToType(selectedAntenna.id);
      
      // Prepare geometry from antennaParams
      const geometry: AntennaGeometry = { ...antennaParams };
      
      // Determine sampling based on resolution and compute mode
      // Use suggested sampling from metadata if available, otherwise compute
      const numTheta = computeMode === "fast" ? Math.max(37, Math.floor(180 / resolution)) : Math.max(91, Math.floor(180 / resolution));
      const numPhi = computeMode === "fast" ? Math.max(73, Math.floor(360 / resolution)) : Math.max(181, Math.floor(360 / resolution));
      
      const options: PatternOptions = {
        numTheta: Math.min(numTheta, 361), // Cap at reasonable max
        numPhi: Math.min(numPhi, 721), // Cap at reasonable max
        efficiency: 1.0, // Can be made configurable
        dBFloor: -80,
        normalize: true,
        fastPreview: computeMode === "fast"
      };

      const result = computePattern(antennaTypeName, frequencyHz, geometry, options);
      
      // Override sampling with suggested if available
      if (result.metadata.suggestedSampling) {
        const suggested = result.metadata.suggestedSampling;
        const adjustedOptions: PatternOptions = {
          ...options,
          numTheta: computeMode === "fast" ? Math.min(suggested.numTheta, 181) : suggested.numTheta,
          numPhi: computeMode === "fast" ? Math.min(suggested.numPhi, 361) : suggested.numPhi,
        };
        return computePattern(antennaTypeName, frequencyHz, geometry, adjustedOptions);
      }
      
      return result;
    } catch (error) {
      console.error("Error computing pattern:", error);
      // Fallback: try to use old pattern function if available
      return null;
    }
  }, [selectedAntenna, antennaParams, frequencyHz, resolution, computeMode]);

  // Generate pattern data for 2D charts from slices
  const generatedPattern = useMemo(() => {
    if (!patternResult) return [];

    const data: PatternPoint[] = [];
    
    // Use E-plane and H-plane slices from patternResult
    const ePlane = patternResult.slices.E_plane;
    const hPlane = patternResult.slices.H_plane;
    
    // Combine E-plane and H-plane data
    ePlane.angleDeg.forEach((angle, i) => {
      data.push({
        theta: angle,
        phi: 0,
        gainLinear: ePlane.power[i],
        gainDbi: ePlane.power_db[i],
      });
    });
    
    hPlane.angleDeg.forEach((angle, i) => {
      data.push({
        theta: angle,
        phi: 90,
        gainLinear: hPlane.power[i],
        gainDbi: hPlane.power_db[i],
      });
    });

    return data;
  }, [patternResult]);

  // Calculate results from patternResult
  const calculatedResults = useMemo(() => {
    if (!patternResult) return null;

    const scalars = patternResult.scalars;
    const metadata = patternResult.metadata;

    // Calculate EIRP
    const eirp = calculateEIRP(transmitPower, scalars.D_max_linear);

    // Combine warnings from metadata and validation
    const warnings: string[] = [...(metadata.warnings || [])];
    
    if (scalars.G_dBi > 60) {
      warnings.push("Very high gain (>60 dBi) - verify antenna parameters");
    }
    if (scalars.HPBW_major_deg < 0.1) {
      warnings.push("Very narrow beamwidth (<0.1°) - verify parameters");
    }

    return {
      peakGainDbi: scalars.G_dBi,
      peakGainLinear: scalars.D_max_linear,
      directivity: scalars.D_max_linear,
      directivityDbi: scalars.D_max_dBi,
      hpbmE: scalars.HPBW_major_deg,
      hpbmH: scalars.HPBW_minor_deg,
      sideLobeLevel: scalars.SLL_dB,
      frontToBackRatio: scalars.FBR_dB,
      eirp,
      warnings,
      metadata,
    };
  }, [patternResult, transmitPower]);

  // Update results when calculations change
  useEffect(() => {
    setResult(calculatedResults);
    setPatternData(generatedPattern);
    
    // Update AI assistant context when results are calculated
    if (calculatedResults && selectedAntenna) {
      updateToolContext({
        tool: "Antenna Pattern Analyzer",
        inputs: {
          antennaType: selectedAntenna.name,
          frequency: `${frequency} ${frequencyUnit}`,
          transmitPower: `${transmitPower} W`,
          polarization,
          resolution: `${resolution}°`,
          computeMode
        },
        results: {
          peakGain: `${calculatedResults.peakGainDbi.toFixed(2)} dBi`,
          directivity: `${calculatedResults.directivityDbi.toFixed(2)} dBi`,
          eirp: `${calculatedResults.eirp.eirpDbw.toFixed(2)} dBW`,
          hpbmE: calculatedResults.hpbmE ? `${calculatedResults.hpbmE.toFixed(2)}°` : "N/A",
          hpbmH: calculatedResults.hpbmH ? `${calculatedResults.hpbmH.toFixed(2)}°` : "N/A",
          sideLobeLevel: `${calculatedResults.sideLobeLevel.toFixed(2)} dB`,
          frontToBackRatio: `${calculatedResults.frontToBackRatio.toFixed(2)} dB`,
          wavelength: `${(lambda * 1000).toFixed(2)} mm`
        }
      });
    }
  }, [calculatedResults, generatedPattern, selectedAntenna, frequency, frequencyUnit, transmitPower, polarization, resolution, computeMode, lambda, updateToolContext]);

  // Initialize and update 3D visualization
  useEffect(() => {
    if (!show3D || !canvas3DRef.current || !patternResult) {
      // Cleanup if 3D is disabled
      if (three3DRef.current) {
        if (three3DRef.current.animationId) {
          cancelAnimationFrame(three3DRef.current.animationId);
        }
        if (three3DRef.current.patternMesh) {
          three3DRef.current.scene.remove(three3DRef.current.patternMesh);
          three3DRef.current.patternMesh.geometry.dispose();
          if (Array.isArray(three3DRef.current.patternMesh.material)) {
            three3DRef.current.patternMesh.material.forEach((m) => m.dispose());
          } else {
            three3DRef.current.patternMesh.material.dispose();
          }
        }
        three3DRef.current.renderer.dispose();
        three3DRef.current = null;
      }
      return;
    }

    // Initialize Three.js scene
    if (!three3DRef.current) {
      const canvas = canvas3DRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020617);

      const camera = new THREE.PerspectiveCamera(
        50,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 5);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      three3DRef.current = {
        scene,
        camera,
        renderer,
        controls,
        patternMesh: null,
        animationId: null,
      };
    }

    const { scene, camera, renderer, controls } = three3DRef.current;

    // Remove old pattern mesh if exists
    if (three3DRef.current.patternMesh) {
      scene.remove(three3DRef.current.patternMesh);
      three3DRef.current.patternMesh.geometry.dispose();
      if (Array.isArray(three3DRef.current.patternMesh.material)) {
        three3DRef.current.patternMesh.material.forEach((m) => m.dispose());
      } else {
        three3DRef.current.patternMesh.material.dispose();
      }
    }

    // Use cartesianMesh from patternResult for 3D visualization
    const cartesianMesh = patternResult.cartesianMesh;
    const pattern = patternResult.pattern;
    const numTheta = pattern.length;
    const numPhi = pattern[0]?.length || 1;

    // Create geometry from pattern matrix
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Find max value for normalization
    let maxValue = 0;
    for (let i = 0; i < numTheta; i++) {
      for (let j = 0; j < numPhi; j++) {
        maxValue = Math.max(maxValue, pattern[i][j]);
      }
    }

    // Create vertices from cartesian mesh or compute from pattern
    for (let i = 0; i < numTheta; i++) {
      for (let j = 0; j < numPhi; j++) {
        const power = pattern[i][j];
        const normalizedPower = maxValue > 0 ? power / maxValue : 0;
        
        // Use cartesian mesh if available, otherwise compute from spherical
        let x: number, y: number, z: number;
        if (cartesianMesh && cartesianMesh.x[i] && cartesianMesh.y[i] && cartesianMesh.z[i]) {
          x = cartesianMesh.x[i][j];
          y = cartesianMesh.y[i][j];
          z = cartesianMesh.z[i][j];
        } else {
          // Fallback: compute from spherical coordinates
          const theta = (i / (numTheta - 1)) * Math.PI;
          const phi = (j / numPhi) * 2 * Math.PI;
          const r = 1 + normalizedPower * 0.5; // Scale by pattern
          x = r * Math.sin(theta) * Math.cos(phi);
          y = r * Math.sin(theta) * Math.sin(phi);
          z = r * Math.cos(theta);
        }

        vertices.push(x, y, z);

        // Color based on power (cyan for high, dark blue for low)
        const gainDbi = 10 * Math.log10(Math.max(1e-10, normalizedPower));
        const normalizedGain = Math.min(1, Math.max(0, (gainDbi + 30) / 60));
        const color = new THREE.Color();
        color.setHSL(0.5 - normalizedGain * 0.3, 1, 0.3 + normalizedGain * 0.5);
        colors.push(color.r, color.g, color.b);
      }
    }

    // Create indices for triangular faces
    for (let i = 0; i < numTheta - 1; i++) {
      for (let j = 0; j < numPhi - 1; j++) {
        const a = i * numPhi + j;
        const b = i * numPhi + (j + 1);
        const c = (i + 1) * numPhi + j;
        const d = (i + 1) * numPhi + (j + 1);

        // Two triangles per quad
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    const patternMesh = new THREE.Mesh(geometry, material);
    scene.add(patternMesh);
    three3DRef.current.patternMesh = patternMesh;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0x22d3ee, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Animation loop
    const animate = () => {
      if (!three3DRef.current) return;
      three3DRef.current.animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (three3DRef.current?.animationId) {
        cancelAnimationFrame(three3DRef.current.animationId);
      }
      if (three3DRef.current?.patternMesh) {
        three3DRef.current.scene.remove(three3DRef.current.patternMesh);
        three3DRef.current.patternMesh.geometry.dispose();
        if (Array.isArray(three3DRef.current.patternMesh.material)) {
          three3DRef.current.patternMesh.material.forEach((m) => m.dispose());
        } else {
          three3DRef.current.patternMesh.material.dispose();
        }
      }
      if (three3DRef.current) {
        three3DRef.current.renderer.dispose();
        three3DRef.current = null;
      }
    };
  }, [show3D, patternResult]);

  // Load custom presets on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS);
    if (stored) {
      try {
        setCustomPresets(JSON.parse(stored));
      } catch (e) {
        console.warn("Failed to load custom presets:", e);
      }
    }
  }, []);

  // Save custom presets when they change
  useEffect(() => {
    if (customPresets.length > 0) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(customPresets));
    }
  }, [customPresets]);

  // Handle antenna selection
  const handleAntennaChange = (id: string) => {
    setSelectedAntennaId(id);
    const antenna = getAntennaById(id);
    if (antenna) {
      setAntennaParams({ ...antenna.defaultParams });
    }
  };

  const handleSaveCustomPreset = () => {
    if (!savePresetName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the custom preset", variant: "destructive" });
      return;
    }
    const newPreset: SavedAntennaPreset = {
      name: savePresetName.trim(),
      antennaId: selectedAntennaId,
      antennaParams: { ...antennaParams },
      frequency,
      frequencyUnit,
      transmitPower,
      polarization,
      resolution,
      computeMode,
      timestamp: Date.now(),
    };
    setCustomPresets([...customPresets, newPreset]);
    setSavePresetName("");
    setIsSaveDialogOpen(false);
    toast({ title: "Success", description: `Custom preset "${newPreset.name}" saved!` });
  };

  const handleLoadCustomPreset = (preset: SavedAntennaPreset) => {
    setSelectedAntennaId(preset.antennaId);
    setAntennaParams(preset.antennaParams);
    setFrequency(preset.frequency);
    setFrequencyUnit(preset.frequencyUnit);
    setTransmitPower(preset.transmitPower);
    setPolarization(preset.polarization);
    setResolution(preset.resolution);
    setComputeMode(preset.computeMode);
    setIsLoadDialogOpen(false);
    toast({ title: "Loaded", description: `Custom preset "${preset.name}" loaded!` });
  };

  const handleDeleteCustomPreset = (index: number) => {
    const preset = customPresets[index];
    setCustomPresets(customPresets.filter((_, i) => i !== index));
    toast({ title: "Deleted", description: `Custom preset "${preset.name}" deleted!` });
  };

  // Handle parameter change
  const handleParamChange = (key: string, value: number | string) => {
    setAntennaParams((prev) => ({ ...prev, [key]: value }));
  };

  // Export pattern to JSON
  const exportJSON = useCallback(() => {
    const exportData = {
      antenna: selectedAntenna?.name,
      frequency: frequency,
      frequencyUnit: frequencyUnit,
      parameters: antennaParams,
      pattern: patternData,
      results: result,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `antenna-pattern-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Pattern exported to JSON" });
  }, [patternData, result, selectedAntenna, frequency, frequencyUnit, antennaParams, toast]);

  // Export pattern to CSV
  const exportCSV = useCallback(() => {
    const headers = "Theta (deg),Phi (deg),Gain (linear),Gain (dBi)\n";
    const rows = patternData
      .map((p) => `${p.theta},${p.phi},${p.gainLinear},${p.gainDbi}`)
      .join("\n");
    const csv = headers + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `antenna-pattern-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Pattern exported to CSV" });
  }, [patternData, toast]);

  // Prepare chart data for polar plot
  const chartData = useMemo(() => {
    // Separate E-plane and H-plane data
    const ePlane = generatedPattern.filter((p) => p.phi === 0);
    const hPlane = generatedPattern.filter((p) => p.phi === 90);

    return {
      ePlane: ePlane.map((p) => ({
        angle: p.theta,
        gain: p.gainDbi,
        gainLinear: p.gainLinear,
      })),
      hPlane: hPlane.map((p) => ({
        angle: p.theta,
        gain: p.gainDbi,
        gainLinear: p.gainLinear,
      })),
    };
  }, [generatedPattern]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Radio className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Antenna Pattern Analyzer
          </h2>
        </div>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Analyze antenna radiation patterns, calculate gain, directivity, HPBW, and EIRP for aerospace applications
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setIsSaveDialogOpen(true)}
            className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Preset
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsLoadDialogOpen(true)}
            className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
            disabled={customPresets.length === 0}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Load ({customPresets.length})
          </Button>
          <Button
            variant="outline"
            onClick={exportJSON}
            className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            onClick={exportCSV}
            className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel - Inputs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 space-y-6"
        >
          {/* Antenna Selection */}
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400" />
                Antenna Type
              </CardTitle>
              <CardDescription className="text-gray-400">
                Select antenna type and configure parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="antenna-type" className="text-gray-300">
                  Antenna Type
                </Label>
                <Select value={selectedAntennaId} onValueChange={handleAntennaChange}>
                  <SelectTrigger className="bg-slate-900/50 border-cyan-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANTENNA_TYPES.map((ant) => (
                      <SelectItem key={ant.id} value={ant.id}>
                        {ant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAntenna && (
                  <p className="text-xs text-gray-400 mt-1">{selectedAntenna.description}</p>
                )}
              </div>

              {/* Dynamic Parameters */}
              {selectedAntenna &&
                Object.keys(selectedAntenna.defaultParams).length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-cyan-400/10">
                    <Label className="text-gray-300">Antenna Parameters</Label>
                    {Object.entries(selectedAntenna.defaultParams).map(([key, defaultValue]) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`param-${key}`} className="text-gray-300 text-sm">
                          {selectedAntenna.paramLabels[key] || key}
                        </Label>
                        <Input
                          id={`param-${key}`}
                          type="number"
                          step="0.001"
                          value={antennaParams[key] || defaultValue}
                          onChange={(e) =>
                            handleParamChange(key, parseFloat(e.target.value) || defaultValue)
                          }
                          className="bg-slate-900/50 border-cyan-400/30 text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Frequency & Power */}
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Frequency & Power
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-gray-300">
                    Frequency
                  </Label>
                  <Input
                    id="frequency"
                    type="number"
                    step="0.1"
                    value={frequency}
                    onChange={(e) => setFrequency(parseFloat(e.target.value) || 0)}
                    className="bg-slate-900/50 border-cyan-400/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freq-unit" className="text-gray-300">
                    Unit
                  </Label>
                  <Select value={frequencyUnit} onValueChange={(v: "Hz" | "MHz" | "GHz" | "Custom") => setFrequencyUnit(v)}>
                    <SelectTrigger className="bg-slate-900/50 border-cyan-400/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hz">Hz</SelectItem>
                      <SelectItem value="MHz">MHz</SelectItem>
                      <SelectItem value="GHz">GHz</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Frequency Unit Card */}
                {frequencyUnit === "Custom" && (
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/10 mt-4">
                    <Label className="text-white font-semibold">Custom Frequency Unit</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input 
                        placeholder="Unit Name" 
                        value={customFrequencyUnitName}
                        onChange={(e) => setCustomFrequencyUnitName(e.target.value)}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                      <Input 
                        type="number"
                        step="0.0001"
                        placeholder="Hz Factor"
                        value={customFrequencyFactor}
                        onChange={(e) => setCustomFrequencyFactor(e.target.value)}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      1 {customFrequencyUnitName || "Unit"} = {customFrequencyFactor || "..."} Hz
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="power" className="text-gray-300">
                  Transmit Power (W)
                </Label>
                <Input
                  id="power"
                  type="number"
                  step="0.1"
                  value={transmitPower}
                  onChange={(e) => setTransmitPower(parseFloat(e.target.value) || 0)}
                  className="bg-slate-900/50 border-cyan-400/30 text-white"
                />
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                <p className="text-xs text-gray-400">Wavelength</p>
                <p className="text-cyan-400 font-semibold">
                  λ = {(lambda * 1000).toFixed(3)} mm
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-cyan-400" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resolution" className="text-gray-300">
                  Angular Resolution: {resolution}°
                </Label>
                <Slider
                  id="resolution"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={[resolution]}
                  onValueChange={(vals) => setResolution(vals[0])}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="polarization" className="text-gray-300">
                  Polarization
                </Label>
                <Select value={polarization} onValueChange={setPolarization}>
                  <SelectTrigger className="bg-slate-900/50 border-cyan-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear-vertical">Linear Vertical</SelectItem>
                    <SelectItem value="linear-horizontal">Linear Horizontal</SelectItem>
                    <SelectItem value="rhcp">RHCP</SelectItem>
                    <SelectItem value="lhcp">LHCP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={show3D}
                  onCheckedChange={setShow3D}
                />
                <Label className="text-gray-300">Show 3D Visualization</Label>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Panel - Results & Visualizations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Results Summary */}
          {result && (
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white">Results Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                    <p className="text-xs text-gray-400 mb-1">Peak Gain</p>
                    <p className="text-cyan-400 font-bold text-lg">
                      {result.peakGainDbi.toFixed(2)} dBi
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                    <p className="text-xs text-gray-400 mb-1">Directivity</p>
                    <p className="text-blue-400 font-bold text-lg">
                      {result.directivityDbi.toFixed(2)} dBi
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                    <p className="text-xs text-gray-400 mb-1">EIRP</p>
                    <p className="text-purple-400 font-bold text-lg">
                      {result.eirp.eirpDbw.toFixed(2)} dBW
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                    <p className="text-xs text-gray-400 mb-1">HPBW (E-plane)</p>
                    <p className="text-green-400 font-bold text-lg">
                      {result.hpbmE ? `${result.hpbmE.toFixed(2)}°` : "N/A"}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                    <p className="text-xs text-gray-400 mb-1">Side-Lobe Level</p>
                    <p className="text-yellow-400 font-bold text-lg">
                      {result.sideLobeLevel.toFixed(2)} dB
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                    <p className="text-xs text-gray-400 mb-1">F/B Ratio</p>
                    <p className="text-orange-400 font-bold text-lg">
                      {result.frontToBackRatio.toFixed(2)} dB
                    </p>
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {result.warnings.map((warning, i) => (
                      <Alert key={i} variant="default" className="bg-yellow-400/10 border-yellow-400/30">
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        <AlertTitle className="text-yellow-400">Warning</AlertTitle>
                        <AlertDescription className="text-gray-300">{warning}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Metadata: Notes, Assumptions, Recommendations */}
                {result.metadata && (
                  <div className="mt-6 space-y-4">
                    {/* Approximation Level & Confidence */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Approximation:</span>
                        <span className={`font-semibold ${
                          result.metadata.approxLevel === "analytic" ? "text-green-400" :
                          result.metadata.approxLevel === "array-analytic" ? "text-blue-400" :
                          result.metadata.approxLevel === "hybrid" ? "text-yellow-400" :
                          "text-orange-400"
                        }`}>
                          {result.metadata.approxLevel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Confidence:</span>
                        <span className={`font-semibold ${
                          result.metadata.confidence === "high" ? "text-green-400" :
                          result.metadata.confidence === "medium" ? "text-yellow-400" :
                          "text-orange-400"
                        }`}>
                          {result.metadata.confidence}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {result.metadata.notes && result.metadata.notes.length > 0 && (
                      <div className="p-3 bg-cyan-400/10 rounded-lg border border-cyan-400/20">
                        <p className="text-cyan-400 font-semibold text-sm mb-2">Formulas & Notes</p>
                        <ul className="space-y-1 text-xs text-gray-300">
                          {result.metadata.notes.map((note, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-1">•</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Assumptions */}
                    {result.metadata.assumptions && result.metadata.assumptions.length > 0 && (
                      <div className="p-3 bg-blue-400/10 rounded-lg border border-blue-400/20">
                        <p className="text-blue-400 font-semibold text-sm mb-2">Assumptions</p>
                        <ul className="space-y-1 text-xs text-gray-300">
                          {result.metadata.assumptions.map((assumption, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-400 mt-1">•</span>
                              <span>{assumption}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Next Steps */}
                    {result.metadata.recommended_next_steps && result.metadata.recommended_next_steps.length > 0 && (
                      <div className="p-3 bg-purple-400/10 rounded-lg border border-purple-400/20">
                        <p className="text-purple-400 font-semibold text-sm mb-2">Recommended Next Steps</p>
                        <ul className="space-y-1 text-xs text-gray-300">
                          {result.metadata.recommended_next_steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-purple-400 mt-1">→</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 2D Pattern Plot */}
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Radiation Pattern
              </CardTitle>
              <CardDescription className="text-gray-400">
                E-plane (φ=0°) and H-plane (φ=90°) cuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData.ePlane}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="angle"
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    label={{
                      value: "Angle (degrees)",
                      position: "insideBottom",
                      offset: -5,
                      fill: "#94a3b8",
                    }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8" }}
                    label={{
                      value: "Gain (dBi)",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#94a3b8",
                    }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #22d3ee40",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} dBi`, "Gain"]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="gain"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    name="E-plane"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 3D Pattern Visualization */}
          {show3D && (
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  3D Radiation Pattern
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Interactive 3D visualization of antenna radiation pattern
                </CardDescription>
              </CardHeader>
              <CardContent>
                <canvas
                  ref={canvas3DRef}
                  className="w-full h-[500px] rounded-lg bg-slate-900"
                />
              </CardContent>
            </Card>
          )}


          {/* Theory Accordion */}
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                Theory & Formulas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="formulas" className="border-cyan-400/20">
                  <AccordionTrigger className="text-white hover:text-cyan-400">
                    Antenna Theory Formulas
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-4 pt-2">
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                      <p className="text-cyan-400 font-semibold mb-2">Wavelength</p>
                      <code className="text-sm block mb-2">λ = c / f</code>
                      <p className="text-xs text-gray-400">
                        where c = 299,792,458 m/s (speed of light), f = frequency
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                      <p className="text-cyan-400 font-semibold mb-2">Directivity</p>
                      <code className="text-sm block mb-2">D = 4π * U_max / P_rad</code>
                      <p className="text-xs text-gray-400">
                        where U_max is peak radiation intensity, P_rad is total radiated power
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                      <p className="text-cyan-400 font-semibold mb-2">Parabolic Dish Gain</p>
                      <code className="text-sm block mb-2">G = η * (4πA / λ²)</code>
                      <p className="text-xs text-gray-400">
                        where η is efficiency, A = πD²/4 is aperture area, D is diameter
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                      <p className="text-cyan-400 font-semibold mb-2">EIRP</p>
                      <code className="text-sm block mb-2">EIRP = Pt * Gt</code>
                      <p className="text-xs text-gray-400">
                        where Pt is transmit power, Gt is transmit antenna gain (linear)
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                      <p className="text-cyan-400 font-semibold mb-2">Array Factor (Linear)</p>
                      <code className="text-sm block mb-2">
                        AF(θ) = (1/N) * sin(N*ψ/2) / sin(ψ/2)
                      </code>
                      <p className="text-xs text-gray-400">
                        where ψ = k*d*cos(θ) + β, k = 2π/λ, d = spacing, β = phase
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Save Custom Preset Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="bg-slate-800 border-cyan-400/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Save Custom Preset</DialogTitle>
            <DialogDescription className="text-gray-400">
              Save the current antenna configuration as a custom preset
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="presetName" className="text-cyan-300">Preset Name</Label>
              <Input
                id="presetName"
                value={savePresetName}
                onChange={(e) => setSavePresetName(e.target.value)}
                placeholder="e.g., My Custom Antenna"
                className="bg-slate-700/50 text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveCustomPreset();
                  }
                }}
              />
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Antenna: {selectedAntenna?.name || "N/A"}</p>
              <p>Frequency: {frequency} {frequencyUnit}</p>
              <p>Power: {transmitPower} W | Polarization: {polarization}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustomPreset}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Custom Preset Dialog */}
      <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
        <DialogContent className="bg-slate-800 border-cyan-400/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Load Custom Preset</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a saved custom preset to load
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
            {customPresets.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No custom presets saved yet</p>
            ) : (
              customPresets.map((preset, index) => {
                const presetAntenna = getAntennaById(preset.antennaId);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-cyan-400/20 hover:border-cyan-400/40 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold">{preset.name}</p>
                      <p className="text-xs text-gray-400">
                        Antenna: {presetAntenna?.name || preset.antennaId} | Frequency: {preset.frequency} {preset.frequencyUnit}
                      </p>
                      <p className="text-xs text-gray-500">
                        Saved: {new Date(preset.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleLoadCustomPreset(preset)}
                        className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-400/30"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeleteCustomPreset(index)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-400/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLoadDialogOpen(false)}
              className="border-gray-600 text-gray-300"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AntennaPatternAnalyzer;

