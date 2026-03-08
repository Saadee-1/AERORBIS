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

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useCalculationAnimation } from "@/hooks/useCalculationAnimation";
import { CalculationOverlay } from "@/components/common/CalculationOverlay";
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
} from "recharts";
import { globalAxisTickStyle, globalAxisCommonProps } from "@/lib/chartAxisTheme";
import {
  Radio,
  Settings2,
  Info,
  AlertTriangle,
  TrendingUp,
  Zap,
  Calculator,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useToolContext } from "@/hooks/useToolContext";
import { PDFExportButton } from "@/components/tools/PDFExportButton";
import { AskAIButton } from "@/components/tools/AskAIButton";
import type { AeroverseAIPayload } from "@/ai/schema/AerorbisPayload";
import { buildCalculationEvent } from "@/lib/events/payloadBuilder";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, FolderOpen, Trash2 } from "lucide-react";
import { ToolWrapper } from "@/components/layout/ToolWrapper";
import { ToolHeader } from "@/components/layout/ToolHeader";
import { ToolSection } from "@/components/layout/ToolSection";
import { ToolActions } from "@/components/layout/ToolActions";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroFormField } from "@/components/forms/AeroFormField";
import { AeroButton } from "@/components/common/AeroButton";
import { ChartCard } from "@/components/charts/ChartCard";
import { AeroverseLegend, type LegendItem } from "@/components/charts/AerorbisLegend";
import { spacingVertical } from "@/styles/spacing";
import { buildAntennaPayload } from "./antenna/payloadBuilder";
import { AntennaResult } from "./antenna/types";

const MIN_FREQUENCY_HZ = 1;

const parsePositiveNumber = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

// Import antenna models and math utilities
import { ANTENNA_TYPES, getAntennaById, AntennaParams } from "@/lib/antenna/models";
import { computePattern, AntennaPatternResult, AntennaGeometry, PatternOptions } from "@/lib/antenna/models-enhanced";
import { getAntennaRegistryEntry, computePatternFromRegistry, validatePatternResult, getAllAntennaRegistryEntries } from "@/lib/antenna/data/antennaRegistry";
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

// ============================================================================
// Main Component
// ============================================================================

const AntennaPatternAnalyzer = () => {
  const { toast } = useToast();
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const { isCalculating, runCalculation } = useCalculationAnimation({ minDuration: 900 });
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<AeroverseAIPayload | null>(null);

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
  const [threeError, setThreeError] = useState<string | null>(null);
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

  const getLatestStoredRequestId = useCallback((): string | null => {
    try {
      const storedKeys = Object.keys(localStorage).filter((key) => key.startsWith("calc-"));
      if (storedKeys.length === 0) return null;
      const latestKey = storedKeys.sort().reverse()[0];
      return latestKey.replace("calc-", "");
    } catch (error) {
      console.warn("Unable to read stored calculation IDs:", error);
      return null;
    }
  }, []);

  const applyToolPayload = useCallback(
    async (payload: AeroverseAIPayload) => {
      setLastPayload(payload);

      updateToolContext({
        tool: "Antenna Pattern Analyzer",
        inputs: payload.inputs,
        results: payload.results,
      });

      const eventPayload = buildCalculationEvent({
        toolId: "antenna-pattern-analyzer",
        toolName: payload.toolName,
        inputs: payload.inputs,
        results: payload.results,
        steps: payload.metadata.steps,
        metadata: {
          units: payload.metadata.unitsSystem,
          approxLevel: payload.metadata.approxLevel,
          confidence: payload.metadata.confidence,
          warnings: payload.metadata.warnings,
        },
      });

      try {
        const eventResponse = await sendCalculationEvent(eventPayload);
        const requestId = eventResponse?.requestId ?? getLatestStoredRequestId();
        setLastRequestId(requestId);
        return requestId;
      } catch (error) {
        console.warn("Failed to send calculation event:", error);
        const fallbackId = getLatestStoredRequestId();
        setLastRequestId(fallbackId);
        return fallbackId;
      }
    },
    [getLatestStoredRequestId, sendCalculationEvent, updateToolContext]
  );

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

  // Get selected antenna (prefer registry, fallback to old system)
  const selectedAntenna = useMemo(() => {
    // Try registry first
    const registryEntry = getAntennaRegistryEntry(selectedAntennaId);
    if (registryEntry) {
      // Convert registry entry to AntennaType format for compatibility
      return {
        id: registryEntry.id,
        name: registryEntry.name,
        description: registryEntry.description,
        pattern: () => 1.0, // Placeholder - actual pattern computation uses computePattern
        defaultParams: registryEntry.defaultParams,
        paramLabels: registryEntry.paramLabels,
      };
    }
    // Fallback to old system
    return getAntennaById(selectedAntennaId);
  }, [selectedAntennaId]);

  const getCustomFrequencyFactor = useCallback(() => {
    if (frequencyUnit !== "Custom") return undefined;
    return parsePositiveNumber(customFrequencyFactor);
  }, [frequencyUnit, customFrequencyFactor]);

  // Calculate frequency in Hz (sanitized)
  const frequencyHz = useMemo(() => {
    const customFactor = getCustomFrequencyFactor();
    const rawHz = frequencyToHz(
      Number.isFinite(frequency) ? frequency : 0,
      frequencyUnit,
      customFactor
    );
    return Math.max(MIN_FREQUENCY_HZ, Math.abs(rawHz || 0));
  }, [frequency, frequencyUnit, getCustomFrequencyFactor]);

  // Calculate wavelength
  const lambda = useMemo(() => wavelength(frequencyHz), [frequencyHz]);

  // Use registry for antenna type mapping
  const getComputeTypeFromId = (id: string): string => {
    const entry = getAntennaRegistryEntry(id);
    if (entry) {
      return entry.computeType;
    }
    // Fallback for IDs not in registry (backward compatibility)
    const fallback = id.toLowerCase().replace(/[^a-z0-9]/g, '');
    return fallback || "isotropic";
  };

  // Compute pattern using enhanced models with registry
  const patternResult = useMemo(() => {
    if (!selectedAntenna || !frequencyHz || frequencyHz <= 0) return null;

    try {
      // Prepare geometry from antennaParams
      const geometry: AntennaGeometry = { ...antennaParams };
      
      // Ensure minimum 720 points for smooth 2D plots (0.5° resolution)
      // For 3D, use resolution setting but cap appropriately
      const baseResolution = Math.max(0.5, resolution); // Minimum 0.5° for smoothness
      const numTheta = computeMode === "fast" 
        ? Math.max(91, Math.floor(180 / baseResolution)) 
        : Math.max(181, Math.floor(180 / baseResolution));
      const numPhi = computeMode === "fast" 
        ? Math.max(181, Math.floor(360 / baseResolution))
        : Math.max(721, Math.floor(360 / baseResolution)); // 720+ points for smooth 2D
      
      const options: PatternOptions = {
        numTheta: Math.min(numTheta, 361), // Cap at reasonable max
        numPhi: Math.min(numPhi, 721), // Cap at reasonable max but ensure 720+ for 2D
        efficiency: 1.0,
        dBFloor: -80,
        normalize: true,
        fastPreview: computeMode === "fast"
      };

      // Use registry-based computation
      const result = computePatternFromRegistry(selectedAntenna.id, frequencyHz, geometry, options);
      
      // Validate result
      if (!validatePatternResult(result)) {
        console.error("Invalid pattern result from computePatternFromRegistry");
        return null;
      }
      
      // Override sampling with suggested if available and better
      if (result.metadata.suggestedSampling) {
        const suggested = result.metadata.suggestedSampling;
        // Only use suggested if it's better (more points or more appropriate)
        if (suggested.numPhi >= numPhi && suggested.numTheta >= numTheta) {
          const adjustedOptions: PatternOptions = {
            ...options,
            numTheta: computeMode === "fast" ? Math.min(suggested.numTheta, 181) : Math.min(suggested.numTheta, 361),
            numPhi: computeMode === "fast" ? Math.min(suggested.numPhi, 361) : Math.min(suggested.numPhi, 721),
          };
          const adjustedResult = computePatternFromRegistry(selectedAntenna.id, frequencyHz, geometry, adjustedOptions);
          if (validatePatternResult(adjustedResult)) {
            return adjustedResult;
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error computing pattern:", error);
      toast({
        title: "Pattern Calculation Error",
        description: error instanceof Error ? error.message : "Failed to compute antenna pattern",
        variant: "destructive",
      });
      return null;
    }
  }, [selectedAntenna, antennaParams, frequencyHz, resolution, computeMode, toast]);

  // Generate pattern data for 2D charts from slices with validation
  const generatedPattern = useMemo(() => {
    if (!patternResult || !validatePatternResult(patternResult)) return [];

    const data: PatternPoint[] = [];
    
    // Use E-plane and H-plane slices from patternResult
    const ePlane = patternResult.slices.E_plane;
    const hPlane = patternResult.slices.H_plane;
    
    // Validate slices have matching lengths
    if (ePlane.angleDeg.length !== ePlane.power.length || 
        ePlane.angleDeg.length !== ePlane.power_db.length ||
        hPlane.angleDeg.length !== hPlane.power.length ||
        hPlane.angleDeg.length !== hPlane.power_db.length) {
      console.warn("Pattern slices have mismatched lengths");
      return [];
    }
    
    // Combine E-plane and H-plane data with validation
    ePlane.angleDeg.forEach((angle, i) => {
      const gainLinear = ePlane.power[i];
      const gainDbi = ePlane.power_db[i];
      
      // Validate values are finite
      if (isFinite(angle) && isFinite(gainLinear) && isFinite(gainDbi)) {
        data.push({
          theta: angle,
          phi: 0,
          gainLinear: Math.max(0, gainLinear), // Ensure non-negative
          gainDbi: Math.max(-80, gainDbi), // Clamp to dB floor
        });
      }
    });
    
    hPlane.angleDeg.forEach((angle, i) => {
      const gainLinear = hPlane.power[i];
      const gainDbi = hPlane.power_db[i];
      
      // Validate values are finite
      if (isFinite(angle) && isFinite(gainLinear) && isFinite(gainDbi)) {
        data.push({
          theta: angle,
          phi: 90,
          gainLinear: Math.max(0, gainLinear), // Ensure non-negative
          gainDbi: Math.max(-80, gainDbi), // Clamp to dB floor
        });
      }
    });

    return data;
  }, [patternResult]);

  const chartData = useMemo(() => {
    const ePlane = generatedPattern.filter((p) => Math.abs(p.phi - 0) < 1);
    const hPlane = generatedPattern.filter((p) => Math.abs(p.phi - 90) < 1);

    const sortedEPlane = [...ePlane].sort((a, b) => a.theta - b.theta);
    const sortedHPlane = [...hPlane].sort((a, b) => a.theta - b.theta);

    const interpolateData = (data: PatternPoint[], targetPoints: number = 361) => {
      if (data.length === 0) return [];
      if (data.length >= targetPoints) return data;

      const interpolated: Array<{ angle: number; gain: number; gainLinear: number }> = [];
      const step = 180 / (targetPoints - 1);

      for (let i = 0; i < targetPoints; i++) {
        const angle = i * step;
        let lowerIdx = 0;
        let upperIdx = data.length - 1;

        for (let j = 0; j < data.length - 1; j++) {
          if (data[j].theta <= angle && data[j + 1].theta >= angle) {
            lowerIdx = j;
            upperIdx = j + 1;
            break;
          }
        }

        const lower = data[lowerIdx];
        const upper = data[upperIdx];
        const ratio =
          upperIdx > lowerIdx ? (angle - lower.theta) / (upper.theta - lower.theta) : 0;

        const gainDbi = lower.gainDbi + (upper.gainDbi - lower.gainDbi) * ratio;
        const gainLinear = lower.gainLinear + (upper.gainLinear - lower.gainLinear) * ratio;

        interpolated.push({
          angle,
          gain: isFinite(gainDbi) ? gainDbi : -80,
          gainLinear: Math.max(0, isFinite(gainLinear) ? gainLinear : 0),
        });
      }

      return interpolated;
    };

    return {
      ePlane: interpolateData(sortedEPlane, 361).map((p) => ({
        angle: p.angle,
        gain: p.gain,
        gainLinear: p.gainLinear,
      })),
      hPlane: interpolateData(sortedHPlane, 361).map((p) => ({
        angle: p.angle,
        gain: p.gain,
        gainLinear: p.gainLinear,
      })),
    };
  }, [generatedPattern]);

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

    if (calculatedResults && selectedAntenna) {
      const payload = buildAntennaPayload({
        antennaId: selectedAntenna.id,
        antennaName: selectedAntenna.name,
        antennaParams,
        frequency,
        frequencyUnit,
        customFrequencyUnitName,
        customFrequencyFactor,
        frequencyHz,
        wavelengthMeters: lambda,
        transmitPower,
        polarization,
        resolution,
        computeMode,
        result: calculatedResults,
        chartData,
      });

      void applyToolPayload(payload);
    } else {
      setLastPayload(null);
      setLastRequestId(null);
    }
  }, [
    antennaParams,
    applyToolPayload,
    calculatedResults,
    chartData,
    customFrequencyFactor,
    customFrequencyUnitName,
    frequency,
    frequencyHz,
    frequencyUnit,
    lambda,
    polarization,
    resolution,
    selectedAntenna,
    transmitPower,
    computeMode,
  ]);

  // Memoize 3D geometry to avoid rebuilding on every render
  const three3DGeometry = useMemo(() => {
    if (!patternResult || !validatePatternResult(patternResult)) return null;

    try {
      const cartesianMesh = patternResult.cartesianMesh;
      const pattern = patternResult.pattern;
      const numTheta = pattern.length;
      const numPhi = pattern[0]?.length || 1;

      if (numTheta === 0 || numPhi === 0) return null;

      // Create geometry from pattern matrix
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];

      // Find max value for normalization
      let maxValue = 0;
      for (let i = 0; i < numTheta; i++) {
        for (let j = 0; j < numPhi; j++) {
          const val = pattern[i]?.[j];
          if (isFinite(val) && val > 0) {
            maxValue = Math.max(maxValue, val);
          }
        }
      }

      if (maxValue === 0) return null;

      // Create vertices from cartesian mesh or compute from pattern
      for (let i = 0; i < numTheta; i++) {
        for (let j = 0; j < numPhi; j++) {
          const power = pattern[i]?.[j] || 0;
          const normalizedPower = Math.max(0, Math.min(1, power / maxValue));
          
          // Use cartesian mesh if available, otherwise compute from spherical
          let x: number, y: number, z: number;
          if (cartesianMesh && cartesianMesh.x[i] && cartesianMesh.y[i] && cartesianMesh.z[i] && 
              cartesianMesh.x[i][j] !== undefined && cartesianMesh.y[i][j] !== undefined && cartesianMesh.z[i][j] !== undefined) {
            x = cartesianMesh.x[i][j];
            y = cartesianMesh.y[i][j];
            z = cartesianMesh.z[i][j];
          } else {
            // Fallback: compute from spherical coordinates
            const theta = (i / Math.max(1, numTheta - 1)) * Math.PI;
            const phi = (j / numPhi) * 2 * Math.PI;
            const r = 1 + normalizedPower * 0.5; // Scale by pattern
            x = r * Math.sin(theta) * Math.cos(phi);
            y = r * Math.sin(theta) * Math.sin(phi);
            z = r * Math.cos(theta);
          }

          if (isFinite(x) && isFinite(y) && isFinite(z)) {
            vertices.push(x, y, z);

            // Color based on power (cyan for high, dark blue for low)
            const gainDbi = normalizedPower > 1e-10 ? 10 * Math.log10(normalizedPower) : -80;
            const normalizedGain = Math.min(1, Math.max(0, (gainDbi + 30) / 60));
            const color = new THREE.Color();
            color.setHSL(0.5 - normalizedGain * 0.3, 1, 0.3 + normalizedGain * 0.5);
            colors.push(color.r, color.g, color.b);
          }
        }
      }

      if (vertices.length === 0) return null;

      // Create indices for triangular faces
      for (let i = 0; i < numTheta - 1; i++) {
        for (let j = 0; j < numPhi - 1; j++) {
          const a = i * numPhi + j;
          const b = i * numPhi + (j + 1);
          const c = (i + 1) * numPhi + j;
          const d = (i + 1) * numPhi + (j + 1);

          // Validate indices
          const maxIdx = vertices.length / 3 - 1;
          if (a <= maxIdx && b <= maxIdx && c <= maxIdx && d <= maxIdx) {
            // Two triangles per quad
            indices.push(a, b, c);
            indices.push(b, d, c);
          }
        }
      }

      if (indices.length === 0) return null;

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      return geometry;
    } catch (error) {
      console.error("Error creating 3D geometry:", error);
      return null;
    }
  }, [patternResult]);

  // Initialize Three.js scene (only once)
  useEffect(() => {
    if (!show3D) {
      // Cleanup if 3D is disabled
      if (three3DRef.current) {
        if (three3DRef.current.animationId) {
          cancelAnimationFrame(three3DRef.current.animationId);
          three3DRef.current.animationId = null;
        }
        if (three3DRef.current.patternMesh) {
          three3DRef.current.scene.remove(three3DRef.current.patternMesh);
          three3DRef.current.patternMesh.geometry.dispose();
          if (Array.isArray(three3DRef.current.patternMesh.material)) {
            three3DRef.current.patternMesh.material.forEach((m) => m.dispose());
          } else {
            three3DRef.current.patternMesh.material.dispose();
          }
          three3DRef.current.patternMesh = null;
        }
        // Clean up lights
        const lightsToRemove: THREE.Light[] = [];
        three3DRef.current.scene.traverse((child) => {
          if (child instanceof THREE.Light) {
            lightsToRemove.push(child);
          }
        });
        lightsToRemove.forEach(light => three3DRef.current!.scene.remove(light));
        
        three3DRef.current.renderer.dispose();
        three3DRef.current.controls.dispose();
        three3DRef.current = null;
      }
      setThreeError(null);
      return;
    }

    if (!canvas3DRef.current) {
      setThreeError('Canvas unavailable for 3D visualization.');
      return;
    }

    try {
      // Initialize Three.js scene (only if not already initialized)
      if (!three3DRef.current && canvas3DRef.current) {
        const canvas = canvas3DRef.current;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020617);

        const camera = new THREE.PerspectiveCamera(
          50,
          canvas.clientWidth / canvas.clientHeight || 1,
          0.1,
          1000
        );
        camera.position.set(0, 0, 5);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Add lights (only once)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0x22d3ee, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        three3DRef.current = {
          scene,
          camera,
          renderer,
          controls,
          patternMesh: null,
          animationId: null,
        };

        // Start animation loop (only once)
        const animate = () => {
          if (!three3DRef.current) return;
          three3DRef.current.animationId = requestAnimationFrame(animate);
          three3DRef.current.controls.update();
          three3DRef.current.renderer.render(three3DRef.current.scene, three3DRef.current.camera);
        };
        animate();
      }

      setThreeError(null);
    } catch (error) {
      console.error('Failed to initialize antenna 3D visualization:', error);
      setThreeError(error instanceof Error ? error.message : 'Unknown WebGL error');
      if (three3DRef.current) {
        three3DRef.current.renderer?.dispose();
        three3DRef.current.controls?.dispose();
        three3DRef.current = null;
      }
      return;
    }

    // Cleanup on unmount or when 3D is disabled
    return () => {
      if (three3DRef.current?.animationId) {
        cancelAnimationFrame(three3DRef.current.animationId);
        three3DRef.current.animationId = null;
      }
    };
  }, [show3D]);

  // Update 3D mesh when geometry changes (decoupled from scene initialization)
  useEffect(() => {
    if (!show3D || !three3DRef.current || !three3DGeometry) return;

    const { scene } = three3DRef.current;

    // Remove old pattern mesh if exists
    if (three3DRef.current.patternMesh) {
      scene.remove(three3DRef.current.patternMesh);
      three3DRef.current.patternMesh.geometry.dispose();
      if (Array.isArray(three3DRef.current.patternMesh.material)) {
        three3DRef.current.patternMesh.material.forEach((m) => m.dispose());
      } else {
        three3DRef.current.patternMesh.material.dispose();
      }
      three3DRef.current.patternMesh = null;
    }

    // Create new mesh with memoized geometry
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    const patternMesh = new THREE.Mesh(three3DGeometry, material);
    scene.add(patternMesh);
    three3DRef.current.patternMesh = patternMesh;

    // Cleanup on geometry change
    return () => {
      if (three3DRef.current?.patternMesh) {
        three3DRef.current.scene.remove(three3DRef.current.patternMesh);
        three3DRef.current.patternMesh.geometry.dispose();
        if (Array.isArray(three3DRef.current.patternMesh.material)) {
          three3DRef.current.patternMesh.material.forEach((m) => m.dispose());
        } else {
          three3DRef.current.patternMesh.material.dispose();
        }
        three3DRef.current.patternMesh = null;
      }
    };
  }, [show3D, three3DGeometry]);

  // Handle window resize
  useEffect(() => {
    if (!show3D || !three3DRef.current || !canvas3DRef.current) return;

    const handleResize = () => {
      if (!three3DRef.current || !canvas3DRef.current) return;
      const canvas = canvas3DRef.current;
      const { camera, renderer } = three3DRef.current;

      camera.aspect = canvas.clientWidth / canvas.clientHeight || 1;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [show3D]);

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

  // Handle antenna selection with registry support
  const handleAntennaChange = (id: string) => {
    runCalculation(() => {
      setSelectedAntennaId(id);
      const registryEntry = getAntennaRegistryEntry(id);
      if (registryEntry) {
        setAntennaParams({ ...registryEntry.defaultParams });
      } else {
        const antenna = getAntennaById(id);
        if (antenna) {
          setAntennaParams({ ...antenna.defaultParams });
        } else {
          setAntennaParams({});
        }
      }
    });
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

  return (
    <>
    <CalculationOverlay isActive={isCalculating} label="Analyzing Radiation Pattern" />
    <ToolWrapper>
      <ToolHeader
        title="Antenna Pattern Analyzer"
        description="Analyze antenna radiation patterns, calculate gain, directivity, HPBW, and EIRP for aerospace applications"
        icon={Radio}
        actions={
          <ToolActions>
            <AeroButton
              variant="outline"
              icon={Save}
              onClick={() => setIsSaveDialogOpen(true)}
            >
              Save Preset
            </AeroButton>
            <AeroButton
              variant="outline"
              icon={FolderOpen}
              onClick={() => setIsLoadDialogOpen(true)}
              disabled={customPresets.length === 0}
            >
              Load ({customPresets.length})
            </AeroButton>
          </ToolActions>
        }
      />

      <ToolSection gridCols={3}>
        {/* Left Panel - Inputs */}
        <div className="lg:col-span-1">
          <div className={spacingVertical.L}>
            {/* Antenna Selection */}
            <AeroCard
              title="Antenna Type"
              description="Select antenna type and configure parameters"
              icon={Radio}
            >
              <AeroFormField label="Antenna Type">
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
              </AeroFormField>

              {/* Dynamic Parameters */}
              {selectedAntenna &&
                Object.keys(selectedAntenna.defaultParams).length > 0 && (
                  <div className={`${spacingVertical.M} pt-2 border-t border-cyan-400/10`}>
                    <Label className="text-gray-300">Antenna Parameters</Label>
                    {Object.entries(selectedAntenna.defaultParams).map(([key, defaultValue]) => (
                      <AeroFormField 
                        key={key} 
                        label={selectedAntenna.paramLabels[key] || key}
                      >
                        <Input
                          id={`param-${key}`}
                          type="number"
                          step="0.001"
                          value={String(antennaParams[key] ?? defaultValue)}
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            if (!isNaN(parsed)) {
                              handleParamChange(key, parsed);
                            }
                          }}
                          className="bg-slate-900/50 border-cyan-400/30 text-white"
                        />
                      </AeroFormField>
                    ))}
                  </div>
                )}
            </AeroCard>

            {/* Frequency & Power */}
            <AeroCard
              title="Frequency & Power"
              icon={Zap}
            >
              <div className="grid grid-cols-2 gap-4">
                <AeroFormField label="Frequency">
                  <Input
                    id="frequency"
                    type="number"
                    step="0.1"
                    value={frequency}
                    onChange={(e) => setFrequency(parseFloat(e.target.value) || 0)}
                    className="bg-slate-900/50 border-cyan-400/30 text-white"
                  />
                </AeroFormField>
                <AeroFormField label="Unit">
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
                </AeroFormField>

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
              <AeroFormField label="Transmit Power (W)">
                <Input
                  id="power"
                  type="number"
                  step="0.1"
                  value={transmitPower}
                  onChange={(e) => setTransmitPower(parseFloat(e.target.value) || 0)}
                  className="bg-slate-900/50 border-cyan-400/30 text-white"
                />
              </AeroFormField>
              <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                <p className="text-xs text-gray-400">Wavelength</p>
                <p className="text-cyan-400 font-semibold">
                  λ = {(lambda * 1000).toFixed(3)} mm
                </p>
              </div>
            </AeroCard>

            {/* Settings */}
            <AeroCard
              title="Settings"
              icon={Settings2}
            >
              <AeroFormField label={`Angular Resolution: ${resolution}°`}>
                <Slider
                  id="resolution"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={[resolution]}
                  onValueChange={(vals) => setResolution(vals[0])}
                  className="w-full"
                />
              </AeroFormField>
              <AeroFormField label="Polarization">
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
              </AeroFormField>
              <div className="flex items-center gap-2">
                <Switch
                  checked={show3D}
                  onCheckedChange={setShow3D}
                />
                <Label className="text-gray-300">Show 3D Visualization</Label>
              </div>
            </AeroCard>
          </div>
        </div>

        {/* Right Panel - Results & Visualizations */}
        <div className="lg:col-span-2">
          <div className={spacingVertical.L}>
            {/* Results Summary */}
            {result && (
              <AeroCard
                title="Results Summary"
                  headerActions={
                    <div className="flex gap-2">
                      <AskAIButton
                        requestId={lastRequestId}
                        payload={lastPayload || undefined}
                        disabled={!lastPayload}
                      />
                      <PDFExportButton
                        requestId={lastRequestId}
                        toolName="Antenna Pattern Analyzer"
                        disabled={!lastRequestId}
                      />
                    </div>
                  }
              >
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
              </AeroCard>
            )}

            {/* 2D Pattern Plot */}
            <ChartCard 
              title="Radiation Pattern"
              description="E-plane (φ=0°) and H-plane (φ=90°) cuts"
              height={400}
            >
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData.ePlane}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="angle"
                    {...globalAxisCommonProps}
                    tick={globalAxisTickStyle}
                    label={{
                      value: "Angle (degrees)",
                      position: "insideBottom",
                      offset: -5,
                      fill: "#94a3b8",
                    }}
                  />
                  <YAxis
                    {...globalAxisCommonProps}
                    tick={globalAxisTickStyle}
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
                  <Line
                    type="monotone"
                    dataKey="gain"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    name="E-plane"
                    dot={false}
                    legendType="none"
                  />
                  <Line
                    type="monotone"
                    data={chartData.hPlane}
                    dataKey="gain"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="H-plane"
                    dot={false}
                    legendType="none"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <AeroverseLegend
                  items={[
                    { id: 'e-plane', name: 'E-plane', color: '#22d3ee' },
                    { id: 'h-plane', name: 'H-plane', color: '#3b82f6' },
                  ]}
                />
              </div>
            </ChartCard>

            {/* 3D Pattern Visualization */}
              {show3D && (
              <AeroCard
                title="3D Radiation Pattern"
                description="Interactive 3D visualization of antenna radiation pattern"
                icon={Zap}
              >
                  <div className="relative w-full h-[500px] rounded-lg bg-slate-900 border border-cyan-400/20">
                    {threeError && (
                      <div className="absolute inset-0 flex items-center justify-center text-red-300 text-sm p-4 text-center">
                        Unable to initialize 3D visualization: {threeError}
                      </div>
                    )}
                    <canvas
                      ref={canvas3DRef}
                      className="w-full h-full rounded-lg"
                      aria-hidden={!!threeError}
                    />
                  </div>
              </AeroCard>
            )}

            {/* Theory Accordion */}
            <AeroCard
              title="Theory & Formulas"
              icon={Info}
            >
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
            </AeroCard>
          </div>
        </div>
      </ToolSection>

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
    </ToolWrapper>
  );
};

export default AntennaPatternAnalyzer;

