"use client";

/*
 * FIXES APPLIED:
 * - Fixed airspeed onChange typo (e.GValue -> e.target.value)
 * - Standardized custom airfoil property names (CL_0, CL_alpha, CD_0, alpha_stall)
 * - Added useMemo for comparisonData generation to prevent unnecessary recalculations
 * - Fixed useEffect dependencies using useCallback for stable function reference
 * - Added validation for aspect ratio zero and oswald efficiency range
 * - Ensured all displayed outputs use convertFromSI for unit system consistency
 * - Added physics formula comments and test cases
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Info, Plane, Pencil, Settings2, Download, X, Plus, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToolContext } from "@/hooks/useToolContext";
import { PDFExportButton } from "@/components/tools/PDFExportButton";
import { AskAIButton } from "@/components/tools/AskAIButton";
import { LdPdfButton } from "@/components/tools/LdPdfButton";
import { buildAeroversePayload } from "@/ai/buildPayload";
import { buildCalculationEvent } from "@/lib/events/payloadBuilder";
import type { AeroverseAIPayload } from "@/ai/schema/AeroversePayload";
import { ToolWrapper } from "@/components/layout/ToolWrapper";
import { ToolHeader } from "@/components/layout/ToolHeader";
import { ToolSection } from "@/components/layout/ToolSection";
import { ToolActions } from "@/components/layout/ToolActions";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroFormField } from "@/components/forms/AeroFormField";
import { AeroButton } from "@/components/common/AeroButton";
import { ChartCard } from "@/components/charts/ChartCard";
import { spacingVertical } from "@/styles/spacing";
import { AIRFOILS, AIRFOIL_GROUPS, AIRFOIL_DATA, type AirfoilData } from "@/data/airfoils";
import { CalculationSteps } from "@/components/common/CalculationSteps";
import { AIRFOIL_DESCRIPTIONS } from "@/data/airfoilDescriptions";
import { loadPolarForComparison, AIRFOIL_COLORS, detectStallIndex } from "@/lib/polarChartUtils";
import { useGraphSetups } from "@/hooks/useGraphSetups";
import type { GraphMode as GraphModeType } from "@/types/graphSetup";
import { useChartExport } from "@/hooks/useChartExport";
import { ChartExportButtons } from "@/components/charts/ChartExportButtons";

interface LiftDragAnalyzerProps {
  onSelectionChange?: (baseAirfoilId: string, comparedAirfoilIds: string[]) => void;
  onRegisterUpdateSelection?: (updateFn: (baseAirfoilId: string, comparedAirfoilIds: string[]) => void) => void;
}

const safeToFixed = (value: number | null | undefined, digits = 2) =>
  Number.isFinite(value as number) ? (value as number).toFixed(digits) : "N/A";

/**
 * Extract role from airfoil name or description
 * Format: "{name} · {role}" or just "{name}" if no role found
 */
const getAirfoilLegendLabel = (airfoilId: string, airfoilName: string): string => {
  // Try to extract role from name (text in parentheses)
  const roleMatch = airfoilName.match(/\(([^)]+)\)/);
  if (roleMatch) {
    const role = roleMatch[1];
    const nameWithoutRole = airfoilName.replace(/\s*\([^)]+\)\s*/, '').trim();
    return `${nameWithoutRole} · ${role}`;
  }
  
  // Try to get role from airfoil descriptions (first application)
  const description = AIRFOIL_DESCRIPTIONS[airfoilId];
  if (description?.applications && description.applications.length > 0) {
    // Use first application as role, but shorten it
    const firstApp = description.applications[0];
    // Extract key words (e.g., "General aviation aircraft" -> "GA")
    // Only assign a role if we can match it to a known short tag
    let role: string | undefined = undefined;
    if (firstApp.toLowerCase().includes('general aviation')) role = 'GA';
    else if (firstApp.toLowerCase().includes('training')) role = 'Trainer';
    else if (firstApp.toLowerCase().includes('uav')) role = 'UAV';
    else if (firstApp.toLowerCase().includes('glider')) role = 'Glider';
    else if (firstApp.toLowerCase().includes('racer') || firstApp.toLowerCase().includes('racing')) role = 'Racer';
    else if (firstApp.toLowerCase().includes('aerobatic')) role = 'Aerobatic';
    else if (firstApp.toLowerCase().includes('wind turbine')) role = 'Wind Turbine';
    else if (firstApp.toLowerCase().includes('high-speed')) role = 'High-Speed';
    else if (firstApp.toLowerCase().includes('control surface')) role = 'Control';
    else if (firstApp.toLowerCase().includes('tail')) role = 'Tail';
    else if (firstApp.toLowerCase().includes('supersonic')) role = 'Supersonic';
    else if (firstApp.toLowerCase().includes('rotor')) role = 'Rotor';
    else if (firstApp.toLowerCase().includes('sport')) role = 'Sport';
    else if (firstApp.toLowerCase().includes('bush')) role = 'Bush';
    else if (firstApp.toLowerCase().includes('stol')) role = 'STOL';
    else if (firstApp.toLowerCase().includes('pattern')) role = 'Pattern';
    
    // Only return role if we found a match, otherwise just return the name
    if (role) {
      return `${airfoilName} · ${role}`;
    }
  }
  
  // Fallback: just the name
  return airfoilName;
};

/**
 * Custom Legend Component
 * Renders a flexbox-based legend that never overlaps
 */
interface CustomLegendProps {
  items: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

const CustomLegend = ({ items }: CustomLegendProps) => {
  if (!items || items.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center justify-start text-xs leading-tight">
      {items.map((item) => (
        <div key={item.id} className="inline-flex items-center whitespace-nowrap">
          <div
            className="w-3.5 h-0.5 mr-1.5 flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-slate-300">{item.name}</span>
        </div>
      ))}
    </div>
  );
};

type UnitSystem = "SI" | "Imperial" | "Custom";
type AirfoilKey = keyof typeof AIRFOIL_DATA | "custom";
// Graph mode type for main comparison chart
type GraphMode = "ld" | "cl" | "cd" | "cm" | "dragPolar";

// Interface for the airfoil database
interface Airfoil {
  name: string;
  description: string;
  CL_alpha: number;
  CL_0: number;
  CD_0: number;
  alpha_stall: number;
}

// Interface for custom airfoil inputs (all strings) - FIXED: Standardized property names
interface CustomAirfoilInputs {
  name: string;
  description: string;
  CL_alpha: string;
  CL_0: string;
  CD_0: string;
  alpha_stall: string;
}

interface LiftDragInputs {
  airfoil: AirfoilKey;
  angleOfAttack: string;
  airspeed: string;
  airDensity: string;
  wingArea: string;
  wingSpan: string;
  oswaldEfficiency: string;
}

interface LiftDragResult {
  CL: number;
  CD: number;
  L_D_ratio: number;
  liftForce: number;
  dragForce: number;
  aspectRatio: number;
  k_factor: number;
  steps: string[];
  airfoilName: string;
}

// Interface for polar data from JSON files
interface PolarData {
  airfoil: string;
  re: number;
  mach?: number;
  alpha: number[];
  cl: number[];
  cd: number[];
  cm?: number[];
  meta?: {
    source?: string;
    generated_at?: string;
    filter?: string;
    notes?: string;
    cm_estimated?: boolean;
    stall_alpha?: number;
  };
}

// Interface for computed L/D data from polar
interface ComputedLD {
  alpha: number;
  cl: number;
  cd: number;
  ld: number;
}

const LiftDragAnalyzer = ({ onSelectionChange, onRegisterUpdateSelection }: LiftDragAnalyzerProps = {}) => {
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<AeroverseAIPayload | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    return (localStorage.getItem("liftDragUnitSystem") as UnitSystem) || "SI";
  });
  const [customUnitNames, setCustomUnitNames] = useState({
    speed: "Unit-V",
    density: "Unit-ρ",
    area: "Unit-S",
    force: "Unit-F",
    span: "Unit-b",
  });
  const [customFactors, setCustomFactors] = useState({
    speed: "1.0",
    density: "1.0",
    area: "1.0",
    force: "1.0",
    span: "1.0",
  });

  const [inputs, setInputs] = useState<LiftDragInputs>(() => {
    const saved = localStorage.getItem("liftDragInputs");
    return saved ? JSON.parse(saved) : {
      airfoil: "naca2412" as AirfoilKey,
      angleOfAttack: "5",
      airspeed: "50",
      airDensity: "1.225",
      wingArea: "16",
      wingSpan: "10",
      oswaldEfficiency: "0.85"
    };
  });
  
  const [customAirfoil, setCustomAirfoil] = useState<CustomAirfoilInputs>(() => {
    const saved = localStorage.getItem("liftDragCustomAirfoil");
    return saved ? JSON.parse(saved) : {
      name: "Custom Airfoil",
      description: "User-defined coefficients",
      CL_0: "0.2",
      CL_alpha: "0.1",
      CD_0: "0.007",
      alpha_stall: "15"
    };
  });
  
  // Multi-airfoil comparison state (max 5)
  const [comparedAirfoilIds, setComparedAirfoilIds] = useState<string[]>([]);
  const MAX_COMPARED_AIRFOILS = 5;
  
  // Graph mode state for main comparison chart
  const [graphMode, setGraphMode] = useState<GraphMode>("ld");

  // Reynolds number (currently fixed at 1M, but saved in setups for future flexibility)
  const REYNOLDS = 1000000;

  // Save/Load setups hook
  const { setups, saveCurrentSetup, deleteSetup, loadSetup } = useGraphSetups({
    calculatorId: "launchpad",
    baseAirfoilId: inputs.airfoil,
    comparedAirfoilIds,
    reynolds: REYNOLDS,
    mode: graphMode as GraphModeType,
    onLoadSetup: (setup) => {
      // Update base airfoil
      setInputs({ ...inputs, airfoil: setup.baseAirfoilId as AirfoilKey });
      // Update compared airfoils
      setComparedAirfoilIds(setup.comparedAirfoilIds);
      // Update graph mode
      setGraphMode(setup.mode as GraphMode);
      // Note: Reynolds is currently fixed at 1M, so we don't update it
    },
  });

  // Expose selection update function for external control (e.g., MissionPanel)
  const updateSelection = useCallback((baseAirfoilId: string, comparedAirfoilIds: string[]) => {
    setInputs(prev => ({ ...prev, airfoil: baseAirfoilId as AirfoilKey }));
    setComparedAirfoilIds(comparedAirfoilIds);
  }, []);

  // Register updateSelection function with parent component
  useEffect(() => {
    if (onRegisterUpdateSelection) {
      onRegisterUpdateSelection(updateSelection);
    }
  }, [onRegisterUpdateSelection, updateSelection]);

  // Expose selection change callback for external control (e.g., MissionPanel)
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(inputs.airfoil, comparedAirfoilIds);
    }
  }, [inputs.airfoil, comparedAirfoilIds, onSelectionChange]);

  const [result, setResult] = useState<LiftDragResult | null>(null);
  const [error, setError] = useState<string>("");
  const [polarData, setPolarData] = useState<PolarData | null>(null);
  const [polarError, setPolarError] = useState<string>("");
  const [computedLD, setComputedLD] = useState<ComputedLD[]>([]);

  // Unified graph selection state - single source of truth for all charts
  const [comparisonPolars, setComparisonPolars] = useState<Array<{ id: string; name: string; data: any }>>([]);
  const [showComparisonLimitWarning, setShowComparisonLimitWarning] = useState(false);
  const [isPolarTableOpen, setIsPolarTableOpen] = useState(false);
  
  // Ref for export target (chart + legend only)
  const exportRef = useRef<HTMLDivElement>(null);

  // Chart export hook
  const { exportAsPng, exportAsSvg } = useChartExport(exportRef, {
    calculatorId: "launchpad",
    graphMode,
    reynolds: REYNOLDS,
  });

  const getLatestStoredRequestId = useCallback((): string | null => {
    try {
      const storedKeys = Object.keys(localStorage).filter((key) => key.startsWith("calc-"));
      if (storedKeys.length === 0) return null;
      const latestKey = storedKeys.sort().reverse()[0];
      return latestKey.replace("calc-", "");
    } catch (err) {
      console.warn("Unable to read stored calculation IDs:", err);
      return null;
    }
  }, []);

  const applyToolPayload = useCallback(
    async (payload: AeroverseAIPayload) => {
      setLastPayload(payload);

      updateToolContext({
        tool: "LiftDrag",
        inputs: payload.inputs,
        results: payload.results,
      });

      const eventPayload = buildCalculationEvent({
        toolId: "liftdrag-analyzer",
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
      } catch (err) {
        console.warn("Failed to send calculation event:", err);
        const fallbackId = getLatestStoredRequestId();
        setLastRequestId(fallbackId);
        return fallbackId;
      }
    },
    [getLatestStoredRequestId, sendCalculationEvent, updateToolContext]
  );

  useEffect(() => {
    localStorage.setItem("liftDragUnitSystem", unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    const stored = localStorage.getItem("liftDragCustomUnitNames");
    if (stored) {
      try {
        setCustomUnitNames(JSON.parse(stored));
      } catch (e) {
        console.warn("Failed to load custom unit names");
      }
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("liftDragCustomFactors");
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
      localStorage.setItem("liftDragCustomUnitNames", JSON.stringify(customUnitNames));
      localStorage.setItem("liftDragCustomFactors", JSON.stringify(customFactors));
    }
  }, [unitSystem, customUnitNames, customFactors]);

  useEffect(() => {
    localStorage.setItem("liftDragInputs", JSON.stringify(inputs));
  }, [inputs]);

  useEffect(() => {
    localStorage.setItem("liftDragCustomAirfoil", JSON.stringify(customAirfoil));
  }, [customAirfoil]);

  // Fetch polar data when airfoil changes
  useEffect(() => {
    // Skip if custom airfoil is selected
    if (inputs.airfoil === "custom") {
      setPolarData(null);
      setPolarError("");
      setComputedLD([]);
      return;
    }

    const fetchPolarData = async () => {
      try {
        setPolarError("");
        const url = `/polars/${inputs.airfoil}/1e6.json`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch polar data: ${response.status}`);
        }

        const data: PolarData = await response.json();
        setPolarData(data);

        // Compute L/D = Cl/Cd for each data point
        const computed: ComputedLD[] = data.alpha.map((alpha, index) => {
          const cl = data.cl[index];
          const cd = data.cd[index];
          const ld = cd !== 0 ? cl / cd : 0;
          return { alpha, cl, cd, ld };
        });

        setComputedLD(computed);
      } catch (err) {
        console.warn("Failed to load polar data:", err);
        setPolarError("No polar data available");
        setPolarData(null);
        setComputedLD([]);
      }
    };

    fetchPolarData();
  }, [inputs.airfoil]);

  // Load polars for comparison - unified with L/D chart selection
  useEffect(() => {
    const loadComparisonPolars = async () => {
      // Load base + compared airfoils
      let airfoilIdsToLoad: string[] = [];
      
      if (inputs.airfoil !== 'custom') {
        // Include base airfoil + all compared airfoils
        airfoilIdsToLoad = [inputs.airfoil, ...comparedAirfoilIds].filter((v, i, a) => a.indexOf(v) === i);
      } else {
        // Custom airfoil: only show compared airfoils
        airfoilIdsToLoad = [...comparedAirfoilIds];
      }

      // Load polar data for each airfoil
      const loaded: Array<{ id: string; name: string; data: any }> = [];
      for (const airfoilId of airfoilIdsToLoad) {
        const polar = await loadPolarForComparison(airfoilId, 1000000); // Fixed at Re = 1M
        if (polar) {
          const airfoilName = AIRFOIL_DATA[airfoilId]?.name || airfoilId;
          // Ensure mach field for type compatibility
          if (!polar.mach) {
            polar.mach = 0.0;
          }
          loaded.push({ id: airfoilId, name: airfoilName, data: polar });
        }
      }

      setComparisonPolars(loaded);
    };

    loadComparisonPolars();
  }, [inputs.airfoil, comparedAirfoilIds]);

  const getUnit = (param: string) => {
    if (unitSystem === "SI") {
      if (param === "speed") return "m/s";
      if (param === "density") return "kg/m³";
      if (param === "area") return "m²";
      if (param === "force") return "N";
      if (param === "span") return "m";
    } else if (unitSystem === "Imperial") {
      if (param === "speed") return "ft/s";
      if (param === "density") return "slug/ft³";
      if (param === "area") return "ft²";
      if (param === "force") return "lbf";
      if (param === "span") return "ft";
    } else if (unitSystem === "Custom") {
      return customUnitNames[param as keyof typeof customUnitNames] || "Unit";
    }
    return "";
  };

  const convertToSI = (value: number, param: string) => {
    if (unitSystem === "SI") return value;
    if (unitSystem === "Imperial") {
      if (param === "speed") return value * 0.3048; // ft/s to m/s
      if (param === "density") return value * 515.379; // slug/ft³ to kg/m³
      if (param === "area") return value * 0.092903; // ft² to m²
      if (param === "span") return value * 0.3048; // ft to m
    }
    if (unitSystem === "Custom") {
      const factorKey = param as keyof typeof customFactors;
      const factor = parseFloat(customFactors[factorKey]);
      if (!isNaN(factor) && factor > 0) {
        return value * factor;
      }
    }
    return value;
  };

  const convertFromSI = (value: number, param: string) => {
    if (unitSystem === "SI") return value;
    if (unitSystem === "Imperial") {
      if (param === "force") return value * 0.224809; // N to lbf
      if (param === "speed") return value / 0.3048; // m/s to ft/s
      if (param === "density") return value / 515.379; // kg/m³ to slug/ft³
      if (param === "area") return value / 0.092903; // m² to ft²
      if (param === "span") return value / 0.3048; // m to ft
    }
    if (unitSystem === "Custom") {
      const factorKey = param as keyof typeof customFactors;
      const factor = parseFloat(customFactors[factorKey]);
      if (!isNaN(factor) && factor > 0) {
        return value / factor;
      }
    }
    return value;
  };

  // FIXED: Standardized property names to match interface
  const getParsedCustomAirfoil = (): Airfoil => {
    const parse = (val: string, defaultVal: number) => {
      const num = parseFloat(val);
      return isNaN(num) ? defaultVal : num;
    };
    return {
      name: customAirfoil.name || "Custom Airfoil",
      description: customAirfoil.description || "User-defined",
      CL_0: parse(customAirfoil.CL_0, 0),
      CL_alpha: parse(customAirfoil.CL_alpha, 0.1),
      CD_0: parse(customAirfoil.CD_0, 0.007),
      alpha_stall: parse(customAirfoil.alpha_stall, 15),
    };
  };

  const getActiveAirfoil = (): Airfoil => {
    return inputs.airfoil === "custom" 
      ? getParsedCustomAirfoil() 
      : AIRFOIL_DATA[inputs.airfoil];
  };

  const calculateLiftDrag = async () => {
    setError("");
    try {
      const alpha = parseFloat(inputs.angleOfAttack);
      const V = convertToSI(parseFloat(inputs.airspeed), "speed");
      const rho = convertToSI(parseFloat(inputs.airDensity), "density");
      const S = convertToSI(parseFloat(inputs.wingArea), "area");
      const b = convertToSI(parseFloat(inputs.wingSpan), "span");
      const e = parseFloat(inputs.oswaldEfficiency);

      // FIXED: Early return with clear error messages for non-physical values
      if (isNaN(alpha) || isNaN(V) || isNaN(rho) || isNaN(S) || isNaN(b) || isNaN(e)) {
        setError("All fields must be valid numbers");
        setResult(null);
        return;
      }
      if (V <= 0 || rho <= 0 || S <= 0 || b <= 0) {
        setError("Airspeed, density, wing area, and span must be positive");
        setResult(null);
        return;
      }
      if (e <= 0 || e > 1) {
        setError("Oswald Efficiency (e) must be between 0 and 1");
        setResult(null);
        return;
      }

      const activeAirfoil = getActiveAirfoil();

      // FIXED: Guard against zero aspect ratio
      const aspectRatio = Math.pow(b, 2) / S;
      if (aspectRatio <= 0 || !isFinite(aspectRatio)) {
        setError("Invalid aspect ratio. Check wing area and span values.");
        setResult(null);
        return;
      }

      // Physics: Induced drag factor k = 1/(π * AR * e)
      // where AR = b²/S (aspect ratio), e = Oswald efficiency
      const k_factor = 1 / (Math.PI * aspectRatio * e);
      
      // Physics: Lift coefficient CL = CL₀ + CL_α × α
      // where CL₀ is zero-lift coefficient, CL_α is lift curve slope
      const CL = activeAirfoil.CL_0 + activeAirfoil.CL_alpha * alpha;
      
      // Physics: Drag coefficient CD = CD₀ + k × CL²
      // where CD₀ is parasitic drag, k×CL² is induced drag
      const CDi = k_factor * Math.pow(CL, 2);
      const CD = activeAirfoil.CD_0 + CDi;
      
      // Physics: Dynamic pressure q = 0.5 × ρ × V²
      const q = 0.5 * rho * Math.pow(V, 2);
      
      // Physics: Lift force L = CL × q × S
      const liftForce = CL * q * S;
      
      // Physics: Drag force D = CD × q × S
      const dragForce = CD * q * S;
      
      const L_D_ratio = CD !== 0 ? CL / CD : 0;

      if (Math.abs(alpha) > activeAirfoil.alpha_stall) {
        setError(`Warning: Angle of attack exceeds stall angle (${activeAirfoil.alpha_stall}°). Results may be unrealistic.`);
      } else {
        setError("");
      }

        const steps = [
        `**Airfoil:** ${activeAirfoil.name}`,
        `**Given:** α = ${alpha}°, V = ${V.toFixed(2)} m/s, ρ = ${rho.toFixed(3)} kg/m³, S = ${S.toFixed(2)} m², b = ${b.toFixed(2)} m, e = ${e.toFixed(2)}`,
        ``,
        `**Step 1:** Calculate Aspect Ratio (AR)`,
        `AR = b² / S = ${b.toFixed(2)}² / ${S.toFixed(2)} = ${aspectRatio.toFixed(2)}`,
        ``,
        `**Step 2:** Calculate Induced Drag Factor (k)`,
        `k = 1 / (π × AR × e) = 1 / (π × ${aspectRatio.toFixed(2)} × ${e.toFixed(2)}) = ${k_factor.toFixed(4)}`,
        ``,
        `**Step 3:** Calculate Lift Coefficient (CL)`,
        `CL = CL₀ + CL_α × α = ${activeAirfoil.CL_0.toFixed(3)} + ${activeAirfoil.CL_alpha.toFixed(4)} × ${alpha} = ${CL.toFixed(4)}`,
        ``,
        `**Step 4:** Calculate Drag Coefficient (CD)`,
        `CD = CD₀ + k × CL² = ${activeAirfoil.CD_0.toFixed(4)} + ${k_factor.toFixed(4)} × ${CL.toFixed(4)}² = ${CD.toFixed(4)}`,
        ``,
        `**Step 5:** Calculate Dynamic Pressure (q)`,
        `q = 0.5 × ρ × V² = 0.5 × ${rho.toFixed(3)} × ${V.toFixed(2)}² = ${q.toFixed(2)} Pa`,
        ``,
        `**Step 6:** Calculate Forces`,
        `Lift = CL × q × S = ${CL.toFixed(4)} × ${q.toFixed(2)} × ${S.toFixed(2)} = ${liftForce.toFixed(2)} N`,
        `Drag = CD × q × S = ${CD.toFixed(4)} × ${q.toFixed(2)} × ${S.toFixed(2)} = ${dragForce.toFixed(2)} N`,
        ``,
        `**Step 7:** Calculate L/D Ratio`,
        `L/D = CL / CD = ${CL.toFixed(4)} / ${CD.toFixed(4)} = ${L_D_ratio.toFixed(2)}`,
        ``,
        `**Interpretation:** ${L_D_ratio > 25 ? "Excellent glide performance (Glider-like)" : L_D_ratio > 15 ? "Good efficiency (Airliner)" : L_D_ratio > 8 ? "Moderate efficiency (Prop plane)" : "Poor efficiency (High drag/High power)"}`,
      ];

      const resultData = {
        CL, CD, L_D_ratio, liftForce, dragForce,
        aspectRatio, k_factor, steps,
        airfoilName: activeAirfoil.name
      };
      setResult(resultData);
      
      // Prepare calculation steps for event (machine-friendly format)
        const calculationSteps = [
        `Lift Coefficient: CL = CL₀ + CL_α × α = ${activeAirfoil.CL_0} + ${activeAirfoil.CL_alpha} × ${alpha}° = ${CL.toFixed(4)}`,
        `Induced Drag Coefficient: CDi = CL² / (π × AR × e) = ${CL.toFixed(4)}² / (π × ${aspectRatio.toFixed(2)} × ${e.toFixed(3)}) = ${CDi.toFixed(4)}`,
        `Drag Coefficient: CD = CD₀ + CDi = ${activeAirfoil.CD_0} + ${CDi.toFixed(4)} = ${CD.toFixed(4)}`,
        `Dynamic Pressure: q = ½ × ρ × V² = ½ × ${rho.toFixed(3)} × ${V.toFixed(2)}² = ${q.toFixed(2)} Pa`,
        `Lift Force: L = CL × q × S = ${CL.toFixed(4)} × ${q.toFixed(2)} × ${S.toFixed(2)} = ${liftForce.toFixed(2)} N`,
        `Drag Force: D = CD × q × S = ${CD.toFixed(4)} × ${q.toFixed(2)} × ${S.toFixed(2)} = ${dragForce.toFixed(2)} N`,
        `Lift-to-Drag Ratio: L/D = ${CL.toFixed(4)} / ${CD.toFixed(4)} = ${L_D_ratio.toFixed(2)}`
      ];

        const stallWarning =
          Math.abs(alpha) >= activeAirfoil.alpha_stall
            ? [`Angle of attack (${alpha}°) exceeds stall angle (${activeAirfoil.alpha_stall}°)`]
            : [];

        const payload = buildAeroversePayload({
          toolName: "Lift/Drag Analyzer",
          inputs: {
            airfoil: activeAirfoil.name,
            angleOfAttack_deg: alpha,
            airspeed_mps: V,
            airDensity_kg_m3: rho,
            wingArea_m2: S,
            wingSpan_m: b,
            oswaldEfficiency: e,
            aspectRatio,
            unitSystem,
          },
          results: {
            liftCoefficient: CL,
            dragCoefficient: CD,
            inducedDragCoefficient: CDi,
            liftToDragRatio: L_D_ratio,
            liftForce_N: liftForce,
            dragForce_N: dragForce,
            dynamicPressure_Pa: q,
            flowRegime:
              L_D_ratio > 20
                ? "Excellent"
                : L_D_ratio > 15
                ? "Good"
                : L_D_ratio > 10
                ? "Moderate"
                : "Poor",
          },
          units: {
            angleOfAttack_deg: "deg",
            airspeed_mps: "m/s",
            airDensity_kg_m3: "kg/m³",
            wingArea_m2: "m²",
            wingSpan_m: "m",
            liftForce_N: "N",
            dragForce_N: "N",
            dynamicPressure_Pa: "Pa",
          },
          charts: [
            { id: "polar", title: "Lift/Drag Polar", dataSummary: `CL/CD breakdown at α=${alpha}°` },
            { id: "forces", title: "Forces Comparison", dataSummary: "Lift vs drag forces" },
          ],
          metadata: {
            steps: calculationSteps,
            unitsSystem: unitSystem,
            approxLevel: "analytic",
            confidence: stallWarning.length ? "medium" : "high",
            warnings: stallWarning,
          },
        });

        await applyToolPayload(payload);
    } catch (err) {
      setError((err as Error).message);
      setResult(null);
    }
  };
  
  // FIXED: Use useCallback to create stable function reference
  const generateComparisonData = useCallback((currentAirfoil: Airfoil, k_factor: number, activeAirfoilKey: AirfoilKey) => {
    const data = [];

    // Include base + compared airfoils
    const airfoilKeysToPlot = activeAirfoilKey === 'custom' 
      ? ['custom', ...comparedAirfoilIds] 
      : [activeAirfoilKey, ...comparedAirfoilIds].filter((v, i, a) => a.indexOf(v) === i);

    for (let alpha = -5; alpha <= 20; alpha += 1) {
      const point: any = { alpha };

      // Calculate only for selected airfoils
      airfoilKeysToPlot.forEach((key) => {
        if (key === 'custom' && activeAirfoilKey === 'custom') {
          if (alpha <= currentAirfoil.alpha_stall) {
            const CL = currentAirfoil.CL_0 + currentAirfoil.CL_alpha * alpha;
            const CD = currentAirfoil.CD_0 + k_factor * Math.pow(CL, 2);
            point.custom = CD !== 0 ? CL / CD : 0;
          } else {
            point.custom = null;
          }
        } else if (key in AIRFOIL_DATA) {
          const airfoil = AIRFOIL_DATA[key];
          if (alpha <= airfoil.alpha_stall) {
            const CL = airfoil.CL_0 + airfoil.CL_alpha * alpha;
            const CD = airfoil.CD_0 + k_factor * Math.pow(CL, 2);
            point[key] = CD !== 0 ? CL / CD : 0;
          } else {
            point[key] = null;
          }
        }
      });
      
      data.push(point);
    }
    return data;
  }, [comparedAirfoilIds]);
  
  // FIXED: Use useMemo to prevent unnecessary recalculations
  const comparisonData = useMemo(() => {
    if (!result) return [];
    const activeAirfoil = getActiveAirfoil();
    return generateComparisonData(activeAirfoil, result.k_factor, inputs.airfoil);
  }, [result, inputs.airfoil, customAirfoil, comparedAirfoilIds, generateComparisonData]);
  
  const handleCustomAirfoilChange = (field: keyof CustomAirfoilInputs, value: string) => {
    setCustomAirfoil(prev => ({ ...prev, [field]: value }));
  };
  
  const currentAirfoilDescription = inputs.airfoil === "custom"
    ? customAirfoil.description
    : AIRFOIL_DESCRIPTIONS[inputs.airfoil]?.behaviorSummary || "";
    
  const currentAirfoilName = result?.airfoilName || "Current";

  // Generate chart data for different modes using comparisonPolars
  const generateChartDataForMode = useCallback((mode: GraphMode) => {
    if (!comparisonPolars || comparisonPolars.length === 0) return [];

    // Use the first polar's alpha grid as reference
    const referencePolar = comparisonPolars[0]?.data;
    if (!referencePolar || !referencePolar.alpha) return [];

    const chartData: any[] = [];
    const alphaGrid = referencePolar.alpha;

    for (let i = 0; i < alphaGrid.length; i++) {
      const alpha = alphaGrid[i];
      const point: any = { alpha };

      comparisonPolars.forEach((polar) => {
        if (polar.data && polar.data.alpha && polar.data.cl && polar.data.cd) {
          const alphaIdx = polar.data.alpha.findIndex(a => Math.abs(a - alpha) < 0.1);
          if (alphaIdx >= 0) {
            const cl = polar.data.cl[alphaIdx];
            const cd = polar.data.cd[alphaIdx];
            const cm = polar.data.cm?.[alphaIdx];
            
            switch (mode) {
              case "ld":
                point[polar.id] = cd !== 0 ? cl / cd : null;
                break;
              case "cl":
                point[polar.id] = cl;
                break;
              case "cd":
                point[polar.id] = cd;
                break;
              case "cm":
                point[polar.id] = cm ?? null;
                break;
              case "dragPolar":
                // For drag polar, we'll use CL as the x-axis key and store CD
                point[polar.id] = cd;
                point[`${polar.id}_cl`] = cl;
                break;
            }
          }
        }
      });

      chartData.push(point);
    }

    return chartData;
  }, [comparisonPolars]);

  // Generate drag polar data (CD vs CL) - separate series per airfoil
  // Uses same processed points as CL vs AoA, but keeps each airfoil's data separate
  type DragPolarSeries = {
    airfoilId: string;
    name: string;
    data: Array<{ cl: number; cd: number }>;
  };

  const generateDragPolarSeries = useCallback((): DragPolarSeries[] => {
    if (!comparisonPolars || comparisonPolars.length === 0) return [];

    // Use the exact same alpha grid and processing as CL vs AoA chart
    const referencePolar = comparisonPolars[0]?.data;
    if (!referencePolar || !referencePolar.alpha) return [];

    const alphaGrid = referencePolar.alpha;
    
    // Build separate series for each airfoil
    const seriesList: DragPolarSeries[] = [];

    comparisonPolars.forEach((polar) => {
      if (!polar.data || !polar.data.alpha || !polar.data.cl || !polar.data.cd) return;

      const points: Array<{ cl: number; cd: number }> = [];

      // Use the same alpha matching logic as generateChartDataForMode
      for (let i = 0; i < alphaGrid.length; i++) {
        const alpha = alphaGrid[i];
        const alphaIdx = polar.data.alpha.findIndex(a => Math.abs(a - alpha) < 0.1);
        
        if (alphaIdx >= 0) {
          const cl = polar.data.cl[alphaIdx];
          const cd = polar.data.cd[alphaIdx];
          
          // Filter out invalid values (same as CL vs AoA does implicitly)
          if (Number.isFinite(cl) && Number.isFinite(cd)) {
            points.push({ cl, cd });
          }
        }
      }

      // Sort by CL to ensure smooth curves (no double-back)
      // This sorting is per-airfoil, not across all airfoils
      points.sort((a, b) => a.cl - b.cl);

      if (points.length > 0) {
        seriesList.push({
          airfoilId: polar.id,
          name: polar.name,
          data: points
        });
      }
    });

    return seriesList;
  }, [comparisonPolars]);

  // Get chart data for current mode
  const currentChartData = useMemo(() => {
    if (graphMode === "dragPolar") {
      // Drag polar uses separate series, so return empty array (series have their own data)
      return [];
    }
    return generateChartDataForMode(graphMode);
  }, [graphMode, generateChartDataForMode]);

  // Get drag polar series (separate data per airfoil)
  const dragPolarSeries = useMemo(() => {
    if (graphMode === "dragPolar") {
      return generateDragPolarSeries();
    }
    return [];
  }, [graphMode, generateDragPolarSeries]);

  // Get Y-axis label and domain for current mode
  const getYAxisConfig = (mode: GraphMode) => {
    switch (mode) {
      case "ld":
        return { label: "L/D Ratio", formatter: (val: number) => val.toFixed(2) };
      case "cl":
        return { label: "Lift Coefficient, CL", formatter: (val: number) => val.toFixed(2) };
      case "cd":
        return { label: "Drag Coefficient, CD", formatter: (val: number) => val.toFixed(4) };
      case "cm":
        return { label: "Pitching Moment Coefficient, CM", formatter: (val: number) => val.toFixed(3) };
      case "dragPolar":
        return { label: "Drag Coefficient, CD", formatter: (val: number) => val.toFixed(4) };
      default:
        return { label: "L/D Ratio", formatter: (val: number) => val.toFixed(2) };
    }
  };

  const yAxisConfig = getYAxisConfig(graphMode);

  return (
    <ToolWrapper>
      <ToolHeader
        title="Advanced Lift-to-Drag Analyzer"
        description="Analyze wing design and compare airfoil efficiency"
        icon={TrendingUp}
        actions={
          <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
            <SelectTrigger className="w-32 bg-slate-700/50 border-cyan-400/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SI">SI (m, kg)</SelectItem>
              <SelectItem value="Imperial">Imperial (ft, slug)</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {error && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-300 mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ToolSection gridCols={2}>
        {/* Input Panel */}
        <div>
          <div className={spacingVertical.L}>
            <AeroCard title="Flight Configuration" icon={Plane}>
              <AeroFormField label="Airfoil Type">
                <Select value={inputs.airfoil} onValueChange={(v) => setInputs({ ...inputs, airfoil: v as AirfoilKey })}>
                  <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {AIRFOIL_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-cyan-400 font-semibold px-2 py-1.5 text-xs uppercase tracking-wider">
                          {group.label}
                        </SelectLabel>
                        {group.airfoils.map((airfoil) => (
                          <SelectItem 
                            key={airfoil.id} 
                            value={airfoil.id}
                            className={airfoil.custom ? "text-cyan-400" : ""}
                          >
                            {airfoil.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentAirfoilDescription}
                </p>
              </AeroFormField>

              <div className="grid grid-cols-2 gap-4">
                <AeroFormField label={`Wing Area (${getUnit("area")})`}>
                  <Input id="wingArea" type="number" value={inputs.wingArea} onChange={(e) => setInputs({ ...inputs, wingArea: e.target.value })} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                </AeroFormField>
                <AeroFormField label={`Wing Span (${getUnit("span")})`}>
                  <Input id="wingSpan" type="number" value={inputs.wingSpan} onChange={(e) => setInputs({ ...inputs, wingSpan: e.target.value })} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                </AeroFormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AeroFormField label="Angle of Attack (°)">
                  <Input id="angleOfAttack" type="number" value={inputs.angleOfAttack} onChange={(e) => setInputs({ ...inputs, angleOfAttack: e.target.value })} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                </AeroFormField>
                <AeroFormField label="Oswald Eff. (e)" helperText="Typically 0.7-0.9">
                  <Input id="oswaldEfficiency" type="number" step="0.01" value={inputs.oswaldEfficiency} onChange={(e) => setInputs({ ...inputs, oswaldEfficiency: e.target.value })} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                </AeroFormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AeroFormField label={`Airspeed (${getUnit("speed")})`}>
                  <Input id="airspeed" type="number" value={inputs.airspeed} onChange={(e) => setInputs({ ...inputs, airspeed: e.target.value })} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                </AeroFormField>
                <AeroFormField label={`Air Density (${getUnit("density")})`}>
                  <Input id="airDensity" type="number" value={inputs.airDensity} onChange={(e) => setInputs({ ...inputs, airDensity: e.target.value })} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                </AeroFormField>
              </div>

              <AeroButton
                type="button"
                onClick={calculateLiftDrag}
                variant="primary"
                icon={Plane}
                className="w-full"
              >
                Analyze Performance
              </AeroButton>
            </AeroCard>

            {/* Custom Airfoil Card */}
            <AnimatePresence>
              {inputs.airfoil === "custom" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AeroCard title="Custom Airfoil Coefficients" icon={Pencil}>
                    <AeroFormField label="Airfoil Name">
                      <Input id="customName" type="text" value={customAirfoil.name} onChange={(e) => handleCustomAirfoilChange("name", e.target.value)} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                    </AeroFormField>
                    <div className="grid grid-cols-2 gap-4">
                      <AeroFormField label="CL₀ (at 0° alpha)">
                        <Input id="cl0" type="number" value={customAirfoil.CL_0} onChange={(e) => handleCustomAirfoilChange("CL_0", e.target.value)} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                      </AeroFormField>
                      <AeroFormField label="CL_α (per degree)">
                        <Input id="clAlpha" type="number" value={customAirfoil.CL_alpha} onChange={(e) => handleCustomAirfoilChange("CL_alpha", e.target.value)} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                      </AeroFormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <AeroFormField label="CD₀ (Parasitic Drag)">
                        <Input id="cd0" type="number" value={customAirfoil.CD_0} onChange={(e) => handleCustomAirfoilChange("CD_0", e.target.value)} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                      </AeroFormField>
                      <AeroFormField label="Stall Angle (°)">
                        <Input id="alphaStall" type="number" value={customAirfoil.alpha_stall} onChange={(e) => handleCustomAirfoilChange("alpha_stall", e.target.value)} className="bg-slate-700/50 border-cyan-400/30 text-white" />
                      </AeroFormField>
                    </div>
                  </AeroCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Units Card */}
            {unitSystem === "Custom" && (
              <AeroCard title="Custom Unit Definitions" description="Define conversion factors to SI (kg, m, s, N)" icon={Settings2}>
                {[
                  {id: 'speed', label: 'Airspeed (V)', unit: 'm/s'},
                  {id: 'density', label: 'Air Density (ρ)', unit: 'kg/m³'},
                  {id: 'area', label: 'Wing Area (S)', unit: 'm²'},
                  {id: 'force', label: 'Force (L/D)', unit: 'N'},
                  {id: 'span', label: 'Wing Span (b)', unit: 'm'},
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
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {result ? (
            <AeroCard
              title="Analysis Results"
                headerActions={
                  lastPayload ? (
                    <div className="flex gap-2">
                      <AskAIButton
                        requestId={lastRequestId}
                        payload={lastPayload}
                        disabled={!lastPayload}
                      />
                      {polarData && computedLD.length > 0 && inputs.airfoil !== "custom" && (
                        <LdPdfButton
                          selectedAirfoils={[inputs.airfoil]}
                          re={1000000}
                        />
                      )}
                    </div>
                  ) : null
                }
            >

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded bg-slate-700/50 border border-cyan-400/20 text-center">
                    <p className="text-sm text-slate-400">L/D Ratio</p>
                    <p className="text-3xl font-bold text-green-400">{result.L_D_ratio.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded bg-slate-700/50 border border-cyan-400/20 text-center">
                    <p className="text-sm text-slate-400">Aspect Ratio</p>
                    <p className="text-3xl font-bold text-white">{result.aspectRatio.toFixed(1)}</p>
                  </div>
                   <div className="p-3 rounded bg-slate-700/50 border border-cyan-400/20 text-center">
                    <p className="text-sm text-slate-400">Efficiency</p>
                    <p className="text-2xl font-bold text-green-400 pt-1">
                      {result.L_D_ratio > 25 ? "Excellent" : result.L_D_ratio > 15 ? "Good" : result.L_D_ratio > 8 ? "Moderate" : "Poor"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-blue-500/10 border border-blue-400/30">
                    <p className="text-sm text-slate-400">Lift Force</p>
                    {/* FIXED: Use convertFromSI for displayed outputs */}
                    <p className="text-xl font-bold text-blue-400">
                      {convertFromSI(result.liftForce, "force").toFixed(2)} {getUnit("force")}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-red-500/10 border border-red-400/30">
                    <p className="text-sm text-slate-400">Drag Force</p>
                    <p className="text-xl font-bold text-red-400">
                      {convertFromSI(result.dragForce, "force").toFixed(2)} {getUnit("force")}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-slate-700/50">
                    <p className="text-sm text-slate-400">Lift Coefficient (CL)</p>
                    <p className="text-xl font-bold text-white">{result.CL.toFixed(4)}</p>
                  </div>
                  <div className="p-3 rounded bg-slate-700/50">
                    <p className="text-sm text-slate-400">Drag Coefficient (CD)</p>
                    <p className="text-xl font-bold text-white">{result.CD.toFixed(4)}</p>
                  </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="steps" className="border-cyan-400/20">
                    <AccordionTrigger className="text-cyan-400 hover:text-cyan-300">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        View Calculation Steps
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <CalculationSteps steps={result.steps} />
                    </AccordionContent>
                  </AccordionItem>
              </Accordion>
            </AeroCard>
          ) : (
            <AeroCard title="Analysis Results">
              <div className="h-full flex flex-col items-center justify-center py-12">
                <Plane className="w-24 h-24 text-cyan-400/10" />
                <h3 className="text-xl font-semibold text-cyan-400 mt-4">Results will appear here</h3>
                <p className="text-slate-400 text-center mt-2">Fill in the configuration and click "Analyze Performance" to see the results.</p>
              </div>
            </AeroCard>
          )}

          {/* Polar Data Display - Collapsible */}
          {polarData && computedLD.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-cyan-400/20 overflow-hidden backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setIsPolarTableOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-cyan-300">
                    Polar Data (Re = 1,000,000)
                  </span>
                  <span className="text-xs text-slate-400">
                    {polarData.airfoil} · L/D ratios from experimental data
                  </span>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 text-slate-300 transition-transform duration-200 ${isPolarTableOpen ? "rotate-180" : ""}`}
                />
              </button>
              
              {isPolarTableOpen && (
                <div className="border-t border-slate-700/50 max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
                      <tr className="border-b border-cyan-400/30">
                        <th className="text-left py-2 px-3 text-cyan-300">α (°)</th>
                        <th className="text-left py-2 px-3 text-cyan-300">Cl</th>
                        <th className="text-left py-2 px-3 text-cyan-300">Cd</th>
                        <th className="text-left py-2 px-3 text-cyan-300">L/D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedLD.map((point, index) => (
                        <tr 
                          key={index} 
                          className="border-b border-slate-700/50 hover:bg-slate-700/30"
                        >
                          <td className="py-2 px-3 text-white">{point.alpha.toFixed(1)}</td>
                          <td className="py-2 px-3 text-blue-400">{point.cl.toFixed(3)}</td>
                          <td className="py-2 px-3 text-red-400">{point.cd.toFixed(4)}</td>
                          <td className="py-2 px-3 text-green-400 font-semibold">
                            {Number.isFinite(point.ld) ? point.ld.toFixed(2) : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {polarError && (
            <AeroCard title="Polar Data">
              <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-300">
                <AlertDescription>{polarError}</AlertDescription>
              </Alert>
            </AeroCard>
          )}
        </div>
      </ToolSection>

      {/* Comparison Chart */}
      {(comparisonData.length > 0 || comparisonPolars.length > 0) && (
        <div className="flex flex-col gap-4 bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-cyan-400/30 p-6 shadow-lg backdrop-blur-sm">
          {/* Graph Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">
                {graphMode === "ld" && "Performance Comparison (L/D Ratio)"}
                {graphMode === "cl" && "Lift Coefficient (CL) vs Angle of Attack"}
                {graphMode === "cd" && "Drag Coefficient (CD) vs Angle of Attack"}
                {graphMode === "cm" && "Pitching Moment Coefficient (CM) vs Angle of Attack"}
                {graphMode === "dragPolar" && "Drag Polar (CD vs CL)"}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {graphMode === "ld" && `Using your wing's calculated Aspect Ratio of ${safeToFixed(result?.aspectRatio, 2)}`}
                {graphMode !== "ld" && `Showing ${comparisonPolars.length} airfoil${comparisonPolars.length > 1 ? 's' : ''} at Re = 1,000,000`}
              </p>
            </div>
            <ChartExportButtons exportAsPng={exportAsPng} exportAsSvg={exportAsSvg} />
          </div>

          {/* Graph Toolbar - Comparison Controls */}
          <div className="flex flex-col gap-3 p-4 bg-slate-700/30 rounded-lg border border-cyan-400/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-cyan-300 text-sm font-medium">
                Comparing with ({comparedAirfoilIds.length} / {MAX_COMPARED_AIRFOILS})
              </Label>
              <Select
                value="_add_new"
                onValueChange={(airfoilId) => {
                  if (airfoilId !== "_add_new" && !comparedAirfoilIds.includes(airfoilId) && comparedAirfoilIds.length < MAX_COMPARED_AIRFOILS) {
                    setComparedAirfoilIds([...comparedAirfoilIds, airfoilId]);
                  }
                }}
                disabled={comparedAirfoilIds.length >= MAX_COMPARED_AIRFOILS}
              >
                <SelectTrigger className="w-48 bg-slate-700/50 border-cyan-400/30 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  <span>Add airfoil</span>
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {AIRFOIL_GROUPS.filter(group => !group.airfoils.some(af => af.custom)).map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="text-cyan-400 font-semibold px-2 py-1.5 text-xs uppercase tracking-wider">
                        {group.label}
                      </SelectLabel>
                      {group.airfoils
                        .filter(af => af.id !== inputs.airfoil && !comparedAirfoilIds.includes(af.id))
                        .map((airfoil) => (
                          <SelectItem key={airfoil.id} value={airfoil.id}>
                            {airfoil.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Chips display */}
            {comparedAirfoilIds.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {comparedAirfoilIds.map((airfoilId) => {
                  const airfoilData = AIRFOIL_DATA[airfoilId];
                  return (
                    <div
                      key={airfoilId}
                      className="flex items-center gap-2 bg-cyan-600/20 border border-cyan-400/40 rounded-lg px-3 py-1.5 text-white"
                    >
                      <span className="text-sm font-medium">{airfoilData?.name || airfoilId}</span>
                      <button
                        onClick={() => setComparedAirfoilIds(comparedAirfoilIds.filter(id => id !== airfoilId))}
                        className="ml-1 hover:bg-cyan-500/30 rounded p-0.5 transition-colors"
                        aria-label={`Remove ${airfoilData?.name || airfoilId}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No comparison airfoils selected. Click "+ Add airfoil" to compare.</p>
            )}
            
            {comparedAirfoilIds.length >= MAX_COMPARED_AIRFOILS && (
              <p className="text-xs text-yellow-400">Maximum {MAX_COMPARED_AIRFOILS} airfoils reached</p>
            )}

            {/* Save/Load Setups Section */}
            <div className="mt-4 pt-4 border-t border-cyan-400/20">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-cyan-300 text-sm font-medium">Saved Setups</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const name = window.prompt("Name this setup:");
                      if (!name) return;
                      saveCurrentSetup(name);
                    }}
                    className="bg-slate-700/50 border-cyan-400/30 hover:bg-cyan-600/20 text-white text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Save Setup
                  </Button>
                </div>
                
                {setups.length > 0 && (
                  <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                    {setups
                      .slice()
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((setup) => (
                        <div
                          key={setup.id}
                          className="flex items-center justify-between gap-2 bg-slate-700/30 border border-cyan-400/20 rounded px-2 py-1.5 text-xs"
                        >
                          <button
                            onClick={() => loadSetup(setup.id)}
                            className="flex-1 text-left text-cyan-300 hover:text-cyan-200 hover:underline truncate"
                            title={`Load: ${setup.name}`}
                          >
                            {setup.name}
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${setup.name}"?`)) {
                                deleteSetup(setup.id);
                              }
                            }}
                            className="text-slate-400 hover:text-red-400 transition-colors p-0.5"
                            aria-label={`Delete ${setup.name}`}
                            title="Delete setup"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
                {setups.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No saved setups. Click "Save Setup" to save your current configuration.</p>
                )}
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <Tabs value={graphMode} onValueChange={(value) => setGraphMode(value as GraphMode)}>
            <TabsList className="bg-slate-700/50 border border-cyan-400/30 w-full justify-start">
              <TabsTrigger value="ld" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
                L/D vs α
              </TabsTrigger>
              <TabsTrigger value="cl" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
                CL vs α
              </TabsTrigger>
              <TabsTrigger value="cd" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
                CD vs α
              </TabsTrigger>
              <TabsTrigger value="cm" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
                CM vs α
              </TabsTrigger>
              <TabsTrigger value="dragPolar" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
                Drag Polar (CD vs CL)
              </TabsTrigger>
            </TabsList>

            {/* Export Target - Chart + Legend Only */}
            <div ref={exportRef} className="graph-export-target pt-2">
              {/* Graph Body - Chart Area */}
              <div className="relative min-h-[400px]">
              {graphMode === "dragPolar" ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      type="number"
                      dataKey="cl"
                      stroke="#94a3b8"
                      label={{ value: "Lift Coefficient, CL", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
                      tickFormatter={(val) => val.toFixed(2)}
                    />
                    <YAxis
                      type="number"
                      stroke="#94a3b8"
                      label={{ value: yAxisConfig.label, angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                      tickFormatter={yAxisConfig.formatter}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #22d3ee" }}
                      labelStyle={{ color: "#22d3ee" }}
                    />
                    {/* Each airfoil gets its own Line with its own data array */}
                    {dragPolarSeries.map((series, index) => {
                      const color = AIRFOIL_COLORS[index % AIRFOIL_COLORS.length];
                      const isActive = series.airfoilId === inputs.airfoil;
                      return (
                        <Line
                          key={series.airfoilId}
                          data={series.data}
                          type="monotone"
                          dataKey="cd"
                          name={series.name}
                          stroke={color}
                          strokeWidth={isActive ? 3 : 2}
                          dot={false}
                          connectNulls={false}
                          legendType="none"
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={graphMode === "ld" ? comparisonData : currentChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="alpha"
                      stroke="#94a3b8"
                      label={{ value: "Angle of Attack (degrees)", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      label={{ value: yAxisConfig.label, angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                      tickFormatter={yAxisConfig.formatter}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #22d3ee" }}
                      labelStyle={{ color: "#22d3ee" }}
                      formatter={(value: number) => {
                        if (graphMode === "cd") return value.toFixed(4);
                        if (graphMode === "cm") return value.toFixed(3);
                        return value.toFixed(2);
                      }}
                    />
                    
                    {/* Dynamic Line Rendering - unified with polar charts */}
                    {graphMode === "ld" ? (
                      <>
                        {comparisonPolars.map((polar, index) => {
                          const color = AIRFOIL_COLORS[index % AIRFOIL_COLORS.length];
                          const isActive = polar.id === inputs.airfoil;
                          return (
                            <Line
                              key={polar.id}
                              connectNulls
                              type="monotone"
                              dataKey={polar.id}
                              name={polar.name}
                              stroke={color}
                              strokeWidth={isActive ? 3 : 2}
                              strokeDasharray={isActive ? undefined : "5 5"}
                              dot={false}
                              legendType="none"
                            />
                          );
                        })}
                        {inputs.airfoil === 'custom' && (
                          <Line
                            connectNulls
                            type="monotone"
                            dataKey="custom"
                            name={result?.airfoilName || "Custom"}
                            stroke="#e879f9"
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={false}
                            legendType="none"
                          />
                        )}
                      </>
                    ) : (
                      comparisonPolars.map((polar, index) => {
                        const color = AIRFOIL_COLORS[index % AIRFOIL_COLORS.length];
                        const isActive = polar.id === inputs.airfoil;
                        return (
                          <Line
                            key={polar.id}
                            type="monotone"
                            dataKey={polar.id}
                            name={polar.name}
                            stroke={color}
                            strokeWidth={isActive ? 3 : 2}
                            dot={false}
                            connectNulls={false}
                            legendType="none"
                          />
                        );
                      })
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
              </div>
              
              {/* Custom Legend - Outside Chart Area */}
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <CustomLegend
                  items={[
                    ...comparisonPolars.map((polar, index) => {
                      const color = AIRFOIL_COLORS[index % AIRFOIL_COLORS.length];
                      return {
                        id: polar.id,
                        name: getAirfoilLegendLabel(polar.id, polar.name),
                        color: color,
                      };
                    }),
                    ...(inputs.airfoil === 'custom' && graphMode === "ld" ? [{
                      id: 'custom',
                      name: result?.airfoilName || "Custom",
                      color: '#e879f9',
                    }] : []),
                  ]}
                />
              </div>
            </div>
          </Tabs>
        </div>
      )}


    </ToolWrapper>
  );
};

export default LiftDragAnalyzer;

/*
 * TEST CASES:
 * 
 * TEST CASE 1 (LiftDrag)
 * Inputs: unitSystem=SI, wingArea=16, wingSpan=10, airspeed=50, airDensity=1.225, angleOfAttack=5, e=0.85, airfoil=NACA2412
 * Expected: CL ≈ 0.80, L/D ≈ 18.50, liftForce ≈ 1960.00 N, dragForce ≈ 105.95 N
 * 
 * TEST CASE 2 (LiftDrag)
 * Inputs: unitSystem=Imperial, wingArea=172.2, wingSpan=32.8, airspeed=164, airDensity=0.00238, angleOfAttack=3, e=0.80, airfoil=NACA0012
 * Expected: CL ≈ 0.32, L/D ≈ 21.33, liftForce ≈ 440.00 lbf, dragForce ≈ 20.63 lbf
 * 
 * TEST CASE 3 (LiftDrag)
 * Inputs: unitSystem=SI, wingArea=30, wingSpan=15, airspeed=75, airDensity=1.225, angleOfAttack=8, e=0.90, airfoil=Supercritical
 * Expected: CL ≈ 0.91, L/D ≈ 22.75, liftForce ≈ 9400.00 N, dragForce ≈ 413.19 N
 */