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
import { TrendingUp, Info, Plane, Pencil, Settings2, Download, X, Plus, ChevronDown, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Legend, type LegendProps } from "recharts";
import { globalAxisTickStyle, globalAxisCommonProps, makeXAxisLabel, makeYAxisLabel } from "@/lib/chartAxisTheme";
import { useToolContext } from "@/hooks/useToolContext";
import { PDFExportButton } from "@/components/tools/PDFExportButton";
import { AskAIButton } from "@/components/tools/AskAIButton";
import { useDesignSession } from "@/contexts/designSession";
import { LdPdfButton } from "@/components/tools/LdPdfButton";
import { buildAeroversePayload } from "@/ai/buildPayload";
import { buildCalculationEvent } from "@/lib/events/payloadBuilder";
import type { AeroverseAIPayload } from "@/ai/schema/AerorbisPayload";
import { ToolWrapper } from "@/components/layout/ToolWrapper";
import { ToolHeader } from "@/components/layout/ToolHeader";
import { ToolSection } from "@/components/layout/ToolSection";
import { ToolActions } from "@/components/layout/ToolActions";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroFormField } from "@/components/forms/AeroFormField";
import { AeroButton } from "@/components/common/AeroButton";
import { InlineInterlinkHint } from "@/components/common/InterlinkCTA";
import { FIELD_KEYS } from "./utils/interlinkConfig";
// useDesignSession imported above
import { ChartCard } from "@/components/charts/ChartCard";
import { spacingVertical } from "@/styles/spacing";
import { AIRFOILS, AIRFOIL_GROUPS, AIRFOIL_DATA, type AirfoilData } from "@/data/airfoils";
import { getAerodynamicsDisplayStatus } from "@/utils/aeroDisplayValidity"; // Display-only physics gating (UI integrity)
import { getCLValidity, getCDValidity, getLDValidity } from "@/utils/ldValidityEnvelope"; // Display-only validity zones
import { CalculationSteps } from "@/components/common/CalculationSteps";
import { AIRFOIL_DESCRIPTIONS } from "@/data/airfoilDescriptions";
import { loadPolarForComparison, loadEnhancedPolarForComparison, AIRFOIL_COLORS, detectStallIndex, getPolarDataQuality, getDataQualityBadge } from "@/lib/polarChartUtils";
import type { EnhancedPolar } from "@/core/stallModel";
import { useGraphSetups } from "@/hooks/useGraphSetups";
import type { GraphMode } from "@/types/graphSetup";
import { useChartExport } from "@/hooks/useChartExport";
import { ChartExportButtons } from "@/components/charts/ChartExportButtons";
import { isaAtAltitudeMeters } from "./utils/isaAtmosphere";

interface LiftDragAnalyzerProps {
  onSelectionChange?: (baseAirfoilId: string, comparedAirfoilIds: string[]) => void;
  onRegisterUpdateSelection?: (updateFn: (baseAirfoilId: string, comparedAirfoilIds: string[]) => void) => void;
}

const safeToFixed = (value: number | null | undefined, digits = 2) =>
  Number.isFinite(value as number) ? (value as number).toFixed(digits) : "N/A";

/**
 * Compute a stable L/D value with guards against numerical noise
 * Removes spikes at negative alpha and near CL ≈ 0
 */
function safeLiftToDrag(cl: number, cd: number): number | null {
  // Guard against nonsense
  if (!Number.isFinite(cl) || !Number.isFinite(cd)) return null;
  if (Math.abs(cd) < 1e-5) return null;

  const raw = cl / cd;

  // Kill crazy ratios (numerical noise near CL~0)
  if (!Number.isFinite(raw) || Math.abs(raw) > 50) return null;

  // Smooth in near CL ≈ 0 so the graph doesn't spike
  const weight = Math.min(1, Math.abs(cl) / 0.2); // fade-in for |CL| < 0.2

  const ld = raw * weight;

  return ld;
}

// Chart styling constants
const stallLineColor = "#f97316"; // amber/orange
const stallFillColor = "rgba(249, 115, 22, 0.08)"; // subtle shading

/**
 * Custom legend renderer that includes stall line entry
 */
const renderCustomLegend = (props: LegendProps) => {
  const { payload = [] } = props;

  const items = payload.map((item) => ({
    ...item,
  }));

  return (
    <ul className="flex flex-wrap gap-3 text-xs text-slate-300">
      {items.map((entry) => (
        <li key={entry.id || entry.value} className="flex items-center gap-1">
          <span
            className="inline-block"
            style={{
              width: 18,
              height: 2,
              backgroundColor: entry.color,
              borderRadius: 999,
            }}
          />
          <span>{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

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

// Interface for the airfoil database
interface Airfoil {
  name: string;
  description: string;
  CL_alpha: number;
  CL_0: number;
  CD_0: number;
  alpha_stall: number;
  CL_max?: number;
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

type InducedDragModel = 'legacy' | 'geometric';

interface LiftDragInputs {
  airfoil: AirfoilKey;
  angleOfAttack: string;
  airspeed: string;
  airDensity: string;
  wingArea: string;
  wingSpan: string;
  oswaldEfficiency: string;
  k?: string; // Optional user-defined k (for legacy mode)
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
  warnings?: string[]; // Validity envelope warnings
  kModelSource?: 'user-defined' | 'geometry-derived'; // Induced drag model source
}

/**
 * Evaluate validity envelope for L/D Analyzer results
 * Returns array of warning strings for non-physical or unreliable conditions
 */
function evaluateLDValidityEnvelope(params: {
  CL: number;
  CD: number;
  L_D_ratio: number;
  q: number;
  CL_max?: number;
  velocity: number;
  density: number;
  wingArea: number;
  wingSpan: number;
}): string[] {
  const warnings: string[] = [];
  const { CL, CD, L_D_ratio, q, CL_max, velocity, density, wingArea, wingSpan } = params;

  // Lift Coefficient checks
  if (CL_max !== undefined) {
    if (Math.abs(CL) > CL_max) {
      warnings.push(`Lift coefficient exceeds maximum (|CL| = ${Math.abs(CL).toFixed(3)} > CL_max = ${CL_max.toFixed(3)}) — post-stall region`);
    } else if (CL > 0.9 * CL_max) {
      warnings.push(`Lift coefficient near stall (CL = ${CL.toFixed(3)} > 0.9 × CL_max = ${(0.9 * CL_max).toFixed(3)})`);
    }
  }
  if (Math.abs(CL) > 5) {
    warnings.push(`Non-physical lift coefficient (|CL| = ${Math.abs(CL).toFixed(3)} > 5)`);
  }

  // Drag Coefficient checks
  if (CD <= 0) {
    warnings.push(`Non-physical drag coefficient (CD = ${CD.toFixed(4)} ≤ 0)`);
  }
  if (CD > 1.0) {
    warnings.push(`Extreme drag coefficient (CD = ${CD.toFixed(4)} > 1.0) — likely post-stall or unrealistic condition`);
  }

  // Lift-to-Drag Ratio checks
  if (L_D_ratio <= 0) {
    warnings.push(`Non-physical L/D ratio (L/D = ${L_D_ratio.toFixed(2)} ≤ 0)`);
  }
  if (L_D_ratio > 100) {
    warnings.push(`Non-physical L/D ratio (L/D = ${L_D_ratio.toFixed(2)} > 100) — unrealistic for aircraft`);
  }

  // Dynamic Pressure checks
  if (q <= 0) {
    warnings.push(`Non-physical dynamic pressure (q = ${q.toFixed(2)} Pa ≤ 0)`);
  }
  if (q > 1e6) {
    warnings.push(`Extreme dynamic pressure (q = ${q.toFixed(0)} Pa > 1e6 Pa) — high-speed regime, compressibility effects not modeled`);
  }

  // Mach Number awareness
  const gamma_air = 1.4;
  const R = 287; // J/(kg·K)
  const T_ISA_SL = 288.15; // K (ISA sea-level temperature)
  const a = Math.sqrt(gamma_air * R * T_ISA_SL); // Speed of sound at sea level
  const M = velocity / a;
  if (M > 0.6) {
    warnings.push(`Compressibility effects significant (M = ${M.toFixed(3)} > 0.6) — drag rise not modeled; L/D unreliable`);
  } else if (M > 0.3) {
    warnings.push(`Compressibility effects not modeled (M = ${M.toFixed(3)} > 0.3)`);
  }

  // Reynolds Number awareness
  const mu = 1.81e-5; // kg/(m·s) — dynamic viscosity at sea level
  const c = wingArea / wingSpan; // Mean aerodynamic chord estimate
  const Re = (density * velocity * c) / mu;
  if (Re > 5e7) {
    warnings.push(`High Reynolds number (Re = ${Re.toFixed(0)} > 5e7) — empirical drag model uncertain`);
  } else if (Re < 2e5) {
    warnings.push(`Low Reynolds number (Re = ${Re.toFixed(0)} < 2e5) — airfoil data unreliable`);
  }

  return warnings;
}

/**
 * Check if a polar file appears to be placeholder/dummy data
 */
function isPlaceholderPolar(polar: unknown): boolean {
  const polarObj = polar as { meta?: { source?: string; notes?: string }; alpha?: unknown[]; cl?: unknown[]; cd?: unknown[] } | null;
  // Check meta.source or meta.notes for placeholder indicators
  if (polarObj?.meta) {
    const source = (polarObj.meta.source || '').toLowerCase();
    const notes = (polarObj.meta.notes || '').toLowerCase();
    
    if (source.includes('todo') || source.includes('placeholder') || source.includes('stub') ||
        notes.includes('todo') || notes.includes('placeholder') || notes.includes('stub')) {
      return true;
    }
  }
  
  // Check if arrays have < 15 data points
  const alphaCount = polarObj?.alpha?.length || 0;
  const clCount = polarObj?.cl?.length || 0;
  const cdCount = polarObj?.cd?.length || 0;
  
  if (alphaCount < 15 || clCount < 15 || cdCount < 15) {
    return true;
  }
  
  return false;
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
  const { updateDesignSession } = useDesignSession();
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

  const [inducedDragModel, setInducedDragModel] = useState<InducedDragModel>('legacy');

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
    mode: graphMode,
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
  // ComparisonPolar uses EnhancedPolar directly (which includes proper meta types)
  type ComparisonPolar = { id: string; name: string; data: EnhancedPolar };
  const [comparisonPolars, setComparisonPolars] = useState<ComparisonPolar[]>([]);
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

      // Load enhanced polar data for each airfoil (with stall model)
      const loaded: Array<{ id: string; name: string; data: EnhancedPolar }> = [];
      for (const airfoilId of airfoilIdsToLoad) {
        const enhancedPolar = await loadEnhancedPolarForComparison(airfoilId, 1000000); // Fixed at Re = 1M
        if (enhancedPolar) {
          const airfoilName = AIRFOIL_DATA[airfoilId]?.name || airfoilId;
          loaded.push({ id: airfoilId, name: airfoilName, data: enhancedPolar });
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
      if (!activeAirfoil) {
        setError("Invalid airfoil selection. Please select a valid airfoil.");
        setResult(null);
        return;
      }

      // FIXED: Guard against zero aspect ratio
      const aspectRatio = Math.pow(b, 2) / S;
      if (aspectRatio <= 0 || !isFinite(aspectRatio)) {
        setError("Invalid aspect ratio. Check wing area and span values.");
        setResult(null);
        return;
      }

      // Determine induced drag factor k based on selected model
      let k_factor: number;
      const kModelWarnings: string[] = [];
      let kModelSource: 'user-defined' | 'geometry-derived' = 'geometry-derived';

      if (inducedDragModel === 'legacy') {
        // Legacy mode: use user-defined k if provided, otherwise compute from geometry
        const userK = inputs.k ? parseFloat(inputs.k) : undefined;
        if (userK !== undefined && Number.isFinite(userK) && userK > 0) {
          k_factor = userK;
          kModelSource = 'user-defined';
        } else {
          // Fallback to geometric if k not provided
          k_factor = 1 / (Math.PI * aspectRatio * e);
          kModelSource = 'geometry-derived';
        }
      } else {
        // Geometric mode: compute k from geometry
        k_factor = 1 / (Math.PI * aspectRatio * e);
        kModelSource = 'geometry-derived';

        // Add warnings for geometric mode
        if (aspectRatio < 4) {
          kModelWarnings.push("Low aspect ratio (AR < 4) — induced drag model less reliable");
        }
        if (aspectRatio > 50) {
          kModelWarnings.push("Unrealistic aspect ratio (AR > 50)");
        }
        if (e < 0.6 || e > 0.95) {
          kModelWarnings.push("Oswald efficiency outside typical range (0.6-0.95)");
        }
      }
      
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
        kModelSource === 'user-defined' 
          ? `k = ${k_factor.toFixed(4)} (user-defined)`
          : `k = 1 / (π × AR × e) = 1 / (π × ${aspectRatio.toFixed(2)} × ${e.toFixed(2)}) = ${k_factor.toFixed(4)}`,
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

      // Evaluate validity envelope
      const warnings = evaluateLDValidityEnvelope({
        CL,
        CD,
        L_D_ratio,
        q,
        CL_max: activeAirfoil.CL_max,
        velocity: V,
        density: rho,
        wingArea: S,
        wingSpan: b,
      });

      // Check for post-stall condition
      const isPostStall = activeAirfoil.CL_max !== undefined && Math.abs(CL) > activeAirfoil.CL_max;

      const resultData: LiftDragResult = {
        CL, CD, L_D_ratio, liftForce, dragForce,
        aspectRatio, k_factor, steps,
        airfoilName: activeAirfoil.name,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
      setResult(resultData);
      
      // Publish calculated data to designSession immediately (only if not post-stall)
      if (!isPostStall) {
        const cd0 = activeAirfoil.CD_0 || 0;
        const k = k_factor;
        const ldClimbValue = L_D_ratio;
        if (Number.isFinite(cd0) && Number.isFinite(k)) {
          updateDesignSession({
            cd0: cd0,
            k: k,
            clMax: activeAirfoil.CL_max || undefined,
            ldClimb: Number.isFinite(ldClimbValue) && ldClimbValue > 0 ? ldClimbValue : undefined,
          });
        }
      } else {
        // Post-stall: do not publish to designSession
        // Results are displayed locally with warnings
      }
      
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
     // TODO: refine type for `point` — changed any -> unknown automatically by chore/typed-cleanup
const point: Record<string, unknown> = { alpha };

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
  // Custom tooltip with data quality badge
  // Recharts tooltip entry type
  interface TooltipEntry {
    color?: string;
    name?: string;
    value?: number | string;
    dataKey?: string;
  }

  const CustomTooltipWithBadge = ({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string | number }) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    // Check if we're in post-stall region for any polar
    const alpha = graphMode !== "dragPolar" ? parseFloat(String(label)) : null;
    const isPostStall = alpha !== null && comparisonPolars.some((p) => {
      const stallAlpha = p.data.meta.alphaStallDeg;
      return stallAlpha && Number.isFinite(stallAlpha) && alpha > stallAlpha;
    });

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-primary font-semibold mb-2">
          {graphMode === "dragPolar" ? `CL = ${label}` : `α = ${label}°`}
        </p>
        {isPostStall && (
          <p className="text-xs text-amber-400 italic mb-2">
            Post-stall region (modeled)
          </p>
        )}
        {payload.map((entry: TooltipEntry, index: number) => {
          // For drag polar, dataKey is "cd", so we need to find by name
          // For other modes, dataKey is the airfoilId
          let polar;
          if (graphMode === "dragPolar") {
            const series = dragPolarSeries.find((s) => s.name === entry.name);
            polar = series ? comparisonPolars.find((p) => p.id === series.airfoilId) : null;
          } else {
            const airfoilId = entry.dataKey;
            polar = comparisonPolars.find((p) => p.id === airfoilId);
          }
          
          const dataQuality = polar?.data ? getPolarDataQuality(polar.data, false) : 'estimated';
          const badge = getDataQualityBadge(dataQuality);
          
          const entryValue = entry.value;
          const formattedValue = typeof entryValue === 'number' 
            ? (graphMode === "cd" || graphMode === "dragPolar" ? entryValue.toFixed(4) : graphMode === "cm" ? entryValue.toFixed(3) : entryValue.toFixed(2))
            : entryValue;
          
          return (
            <div key={index} className="mb-2 last:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="text-foreground font-semibold">
                  {formattedValue}
                </span>
              </div>
              {polar?.data && (
                <div className={`${badge.className} text-xs mt-1 inline-block`}>
                  {badge.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const comparisonData = useMemo(() => {
    if (!result) return [];
    const activeAirfoil = getActiveAirfoil();
    return generateComparisonData(activeAirfoil, result.k_factor, inputs.airfoil);
  }, [result, inputs.airfoil, customAirfoil, comparedAirfoilIds, generateComparisonData, getActiveAirfoil]);
  
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
    if (!referencePolar || !referencePolar.alpha_deg) return [];

    // TODO: refine type for `chartData` — changed any -> unknown automatically by chore/typed-cleanup
    const chartData: unknown[] = [];
    const alphaGrid = referencePolar.alpha_deg;

    for (let i = 0; i < alphaGrid.length; i++) {
      const alpha = alphaGrid[i];
      // TODO: refine type for `point` — changed any -> unknown automatically by chore/typed-cleanup
      const point: Record<string, unknown> = { alpha };

      comparisonPolars.forEach((polar) => {
        if (polar.data && polar.data.alpha_deg && polar.data.cl && polar.data.cd) {
          const alphaIdx = polar.data.alpha_deg.findIndex(a => Math.abs(a - alpha) < 0.1);
          if (alphaIdx >= 0) {
            const cl = polar.data.cl[alphaIdx];
            const cd = polar.data.cd[alphaIdx];
            const cm = polar.data.cm?.[alphaIdx];
            
            switch (mode) {
              case "ld":
                point[polar.id] = safeLiftToDrag(cl, cd);
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

    // Build separate series for each airfoil
    const seriesList: DragPolarSeries[] = [];

    comparisonPolars.forEach((polar) => {
      if (!polar.data || !polar.data.alpha_deg || !polar.data.cl || !polar.data.cd) return;

      // Get stall angle for this polar (limit to pre-stall region only)
      const stallAlpha = polar.data.meta.alphaStallDeg ?? 999;

      const points: Array<{ cl: number; cd: number }> = [];

      // Only use points up to the stall angle
      for (let i = 0; i < polar.data.alpha_deg.length; i++) {
        const alpha = polar.data.alpha_deg[i];
        
        // Stop at stall angle - ignore post-stall in drag polar
        if (alpha > stallAlpha) break;

        const cl = polar.data.cl[i];
        const cd = polar.data.cd[i];
        
        // Filter out invalid values
        if (Number.isFinite(cl) && Number.isFinite(cd)) {
          points.push({ cl, cd });
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

  // Get Y-axis label and formatter for current mode
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

  // Compute auto-scaled Y-axis domain for alpha-based charts
  const getAutoScaledYDomain = useCallback((mode: GraphMode, chartData: Array<Record<string, unknown>>): [number, number | string] => {
    if (mode === "dragPolar") {
      // For drag polar, use a more conservative approach
      return [0, "auto"];
    }

    // Extract valid values from chart data
    const dataKey = mode === "ld" ? "ld" : mode === "cl" ? "cl" : mode === "cd" ? "cd" : "cm";
    const values = chartData
      .flatMap((d) => {
        // For multi-airfoil charts, collect values from all airfoil keys
        if (mode === "ld" && comparisonPolars.length > 0) {
          return comparisonPolars.map((p) => d[p.id] as number | null | undefined);
        }
        return [d[dataKey] as number | null | undefined];
      })
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && Number.isFinite(v));

    if (values.length === 0) {
      // Fallback ranges
      switch (mode) {
        case "ld":
          return [0, 50];
        case "cl":
          return [-0.5, 2.0];
        case "cd":
          return [0, 0.2];
        case "cm":
          return [-0.1, 0.1];
        default:
          return [0, 1];
      }
    }

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    // Add safety margin (15% padding)
    const padding = (rawMax - rawMin) * 0.15 || 0.5;

    // For L/D specifically, allow asymmetric domain
    const isLD = mode === "ld";
    let yMin = rawMin - padding;
    let yMax = rawMax + padding;

    // Ensure minimum span to avoid ridiculous zoom
    const minSpan = isLD ? 2.0 : mode === "cd" ? 0.02 : mode === "cm" ? 0.1 : 0.5;
    if (yMax - yMin < minSpan) {
      const mid = (yMax + yMin) / 2;
      yMin = mid - minSpan / 2;
      yMax = mid + minSpan / 2;
    }

    // For L/D, ensure minimum is not too negative
    if (isLD && yMin < 0) {
      yMin = 0;
    }

    return [yMin, yMax];
  }, [comparisonPolars]);

  return (
    <ToolWrapper>
      <ToolHeader
        title="Advanced Lift-to-Drag Analyzer"
        description="Analyze wing design and compare airfoil efficiency"
        icon={TrendingUp}
        actions={
          <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
            <SelectTrigger className="w-32 bg-input border-border text-foreground">
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
              <AeroFormField 
                label="Airfoil Type" 
                helperText="Select the airfoil section used for the wing. Each airfoil provides lift curve slope (CL_α), zero-lift coefficient (CL₀), and zero-lift drag coefficient (CD₀) used in the drag polar analysis. Select 'Custom' to define your own coefficients."
              >
                <Select value={inputs.airfoil} onValueChange={(v) => setInputs({ ...inputs, airfoil: v as AirfoilKey })}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {AIRFOIL_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-primary font-semibold px-2 py-1.5 text-xs uppercase tracking-wider">
                          {group.label}
                        </SelectLabel>
                        {group.airfoils.map((airfoil) => (
                          <SelectItem 
                            key={airfoil.id} 
                            value={airfoil.id}
                            className={airfoil.custom ? "text-primary" : ""}
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
                <AeroFormField 
                  label={`Gross Wing Area (${getUnit("area")})`}
                  helperText="Total wing reference area (planform area). Used to compute lift and drag forces via L = CL × q × S and D = CD × q × S, where q is dynamic pressure. Can be imported from Wing Loading calculator."
                >
                  <Input id="wingArea" name="wingAreaM2" type="number" value={inputs.wingArea} onChange={(e) => setInputs({ ...inputs, wingArea: e.target.value })} min="0.001" step="0.1" />
                  <InlineInterlinkHint 
                    requiredFields={[FIELD_KEYS.wingAreaM2]} 
                    sourceTool="wingloading" 
                    className="mt-1" 
                    currentValue={inputs.wingArea}
                    onImport={(value) => setInputs({ ...inputs, wingArea: String(value) })}
                    onUndo={(prevValue) => setInputs({ ...inputs, wingArea: prevValue === null ? '' : String(prevValue) })}
                  />
                </AeroFormField>
                <AeroFormField 
                  label={`Wing Span (${getUnit("span")})`}
                  helperText="Total wing span (tip-to-tip distance). Used with wing area to compute aspect ratio: AR = b²/S. Aspect ratio affects induced drag factor k = 1/(π × AR × e), where e is Oswald efficiency."
                >
                  <Input id="wingSpan" type="number" value={inputs.wingSpan} onChange={(e) => setInputs({ ...inputs, wingSpan: e.target.value })} min="0" step="0.1" />
                </AeroFormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AeroFormField 
                  label="Geometric Angle of Attack (°)"
                  helperText="Geometric angle of attack (α): angle between the wing chord line and the freestream velocity vector. Assumes steady, level flight (or steady climb). Used to compute lift coefficient: CL = CL₀ + CL_α × α. Results are invalid beyond stall angle."
                >
                  <Input id="angleOfAttack" type="number" value={inputs.angleOfAttack} onChange={(e) => setInputs({ ...inputs, angleOfAttack: e.target.value })} step="0.1" />
                </AeroFormField>
                <AeroFormField 
                  label="Oswald Efficiency Factor (e)"
                  helperText="Oswald efficiency factor: accounts for non-elliptical lift distribution and planform effects. Related to induced drag factor: k = 1/(π × AR × e). Typical range: 0.70-0.90 for most aircraft. Higher values indicate more efficient lift generation (closer to elliptical distribution)."
                >
                  <Input id="oswaldEfficiency" type="number" step="0.01" value={inputs.oswaldEfficiency} onChange={(e) => setInputs({ ...inputs, oswaldEfficiency: e.target.value })} min="0.001" max="1" />
                </AeroFormField>
              </div>

              <AeroFormField 
                label="Induced Drag Model"
                helperText="Select how the induced drag factor k is determined. Legacy mode uses a user-defined k value. Geometric mode computes k from wing geometry: k = 1/(π × AR × e)."
              >
                <Select value={inducedDragModel} onValueChange={(v) => setInducedDragModel(v as InducedDragModel)}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legacy">Legacy (User k)</SelectItem>
                    <SelectItem value="geometric">Geometric (k = 1 / πeAR)</SelectItem>
                  </SelectContent>
                </Select>
              </AeroFormField>

              {inducedDragModel === 'legacy' && (
                <AeroFormField 
                  label="Induced Drag Factor (k)"
                  helperText="User-defined induced drag factor. Used in drag polar: CD = CD₀ + k × CL². If left empty, k will be computed from geometry as fallback."
                >
                  <Input 
                    id="k" 
                    type="number" 
                    step="0.0001" 
                    value={inputs.k || ''} 
                    onChange={(e) => setInputs({ ...inputs, k: e.target.value })} 
                    
                    min="0.0001" 
                    placeholder="Auto-compute from geometry"
                  />
                </AeroFormField>
              )}

              <div className="grid grid-cols-2 gap-4">
                <AeroFormField 
                  label={`True Airspeed (${getUnit("speed")})`}
                  helperText="True airspeed (TAS): actual velocity relative to the air mass. Assumes steady flight (no acceleration). Used to compute dynamic pressure q = 0.5 × ρ × V², which determines lift and drag forces."
                >
                  <Input id="airspeed" type="number" value={inputs.airspeed} onChange={(e) => setInputs({ ...inputs, airspeed: e.target.value })} min="0.001" step="0.1" />
                </AeroFormField>
                <AeroFormField 
                  label={`Air Density (${getUnit("density")})`}
                  helperText="Air density (ρ) at the flight condition. Assumes incompressible flow (valid for Mach < 0.3). Used in dynamic pressure and force calculations. Can be imported from Standard Atmosphere calculator or entered manually. ISA sea-level: 1.225 kg/m³."
                >
                  <Input id="airDensity" type="number" value={inputs.airDensity} onChange={(e) => setInputs({ ...inputs, airDensity: e.target.value })} min="0.001" step="0.001" />
                  <InlineInterlinkHint 
                    fieldKey={FIELD_KEYS.densityKgM3} 
                    className="mt-1" 
                    currentValue={inputs.airDensity}
                    onImport={(value) => setInputs({ ...inputs, airDensity: String(value) })}
                    onUndo={(prevValue) => setInputs({ ...inputs, airDensity: prevValue === null ? '' : String(prevValue) })}
                  />
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
                      <Input id="customName" type="text" value={customAirfoil.name} onChange={(e) => handleCustomAirfoilChange("name", e.target.value)} />
                    </AeroFormField>
                    <div className="grid grid-cols-2 gap-4">
                      <AeroFormField 
                        label="Zero-Lift Coefficient (CL₀)"
                        helperText="Lift coefficient at zero geometric angle of attack (α = 0°). Accounts for camber effects. Typical range: -0.1 to 0.3 for cambered airfoils. Used in linear lift model: CL = CL₀ + CL_α × α."
                      >
                        <Input id="cl0" type="number" value={customAirfoil.CL_0} onChange={(e) => handleCustomAirfoilChange("CL_0", e.target.value)} step="0.001" />
                      </AeroFormField>
                      <AeroFormField 
                        label="Lift Curve Slope (CL_α)"
                        helperText="Lift curve slope: change in lift coefficient per degree of angle of attack. Typical range: 0.08-0.12 per degree (≈ 2π per radian for thin airfoils). Used in linear lift model: CL = CL₀ + CL_α × α. Valid only in pre-stall region."
                      >
                        <Input id="clAlpha" type="number" value={customAirfoil.CL_alpha} onChange={(e) => handleCustomAirfoilChange("CL_alpha", e.target.value)} className="bg-slate-700/50 border-cyan-400/30 text-white" step="0.001" min="0" />
                      </AeroFormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <AeroFormField 
                        label="Zero-Lift Drag Coefficient (CD₀)"
                        helperText="Parasitic drag coefficient at zero lift: represents form drag, skin friction, and interference drag. This is NOT the total drag coefficient. Total drag: CD = CD₀ + k × CL², where k is the induced drag factor. Typical range: 0.005-0.040 for clean airfoils."
                      >
                        <Input id="cd0" type="number" value={customAirfoil.CD_0} onChange={(e) => handleCustomAirfoilChange("CD_0", e.target.value)} className="bg-slate-700/50 border-cyan-400/30 text-white" step="0.0001" min="0" />
                      </AeroFormField>
                      <AeroFormField 
                        label="Stall Angle of Attack (°)"
                        helperText="Angle of attack at which the airfoil stalls (maximum lift coefficient). Beyond this angle, the linear lift model is invalid. Typical range: 10-20° for most airfoils. Used to limit calculations to the pre-stall region."
                      >
                        <Input id="alphaStall" type="number" value={customAirfoil.alpha_stall} onChange={(e) => handleCustomAirfoilChange("alpha_stall", e.target.value)} className="bg-slate-700/50 border-cyan-400/30 text-white" step="0.1" min="0" />
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
          {result ? (() => {
              // === DISPLAY-LAYER PHYSICS GATING: UI-ONLY ENVELOPE ===
              const CL_max = getActiveAirfoil()?.CL_max;
              const displayCheck = getAerodynamicsDisplayStatus({
                CL: result.CL,
                CD: result.CD,
                LD: result.L_D_ratio,
                Lift: result.liftForce,
                Drag: result.dragForce,
                Density: parseFloat(inputs.airDensity),
                CL_max
              });
            return (
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
              <div className="mb-4 text-sm text-gray-400">
                <p>Results computed for steady, level flight at the specified operating point (angle of attack, airspeed, density). Assumes incompressible flow (Mach &lt; 0.3).</p>
                {result.kModelSource && (
                  <p className="mt-2 text-xs text-cyan-400">
                    Induced drag: {result.kModelSource === 'user-defined' ? 'user-defined k' : 'geometry-derived'}
                  </p>
                )}
              </div>

              {/* Warnings Display (UI) */}
              {displayCheck.warnings.length > 0 && (
                <div className="mb-4 space-y-2">
                  {displayCheck.warnings.map((warning, idx) => {
                    const isPostStallWarning = warning.includes('post-stall');
                    return (
                      <Alert key={idx} variant={isPostStallWarning ? 'destructive' : 'default'} className={isPostStallWarning ? "bg-red-500/10 border-red-500/30" : "bg-yellow-500/10 border-yellow-500/30"}>
                        <AlertTriangle className={`h-4 w-4 ${isPostStallWarning ? 'text-red-400' : 'text-yellow-400'}`} />
                        <AlertDescription className={`text-sm ${isPostStallWarning ? 'text-red-200' : 'text-yellow-200'}`}>
                          {warning}
                          {isPostStallWarning && " Data not published to design session."}
                        </AlertDescription>
                      </Alert>
                    );
                  })}
                </div>
              )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded bg-slate-700/50 border border-cyan-400/20 text-center">
                    <p className="text-sm text-slate-400 mb-1">Lift-to-Drag Ratio (L/D)</p>
                    <p className="text-xs text-gray-500 mb-2">At operating point (α = {inputs.angleOfAttack}°)</p>
                    {displayCheck.display.LD !== "—" ? (
                      <>
                    <span className={(() => {
  const env = getLDValidity(result.L_D_ratio);
  return env.color === 'green' ? 'bg-green-700/20 px-2 rounded' : env.color === 'amber' ? 'bg-yellow-600/20 px-2 rounded' : 'bg-red-700/20 px-2 rounded';
})()} title={(() => getLDValidity(result.L_D_ratio).label)()}>
  <p className="text-3xl font-bold text-green-400 inline">{typeof displayCheck.display.LD === "number" ? displayCheck.display.LD.toFixed(2) : displayCheck.display.LD}</p>
</span>
<span className={`ml-2 text-xs font-semibold`}
  style={{ color: getLDValidity(result.L_D_ratio).color === 'green' ? '#22c55e' : getLDValidity(result.L_D_ratio).color === 'amber' ? '#eab308' : '#ef4444' }}>
  {getLDValidity(result.L_D_ratio).label}
</span>
                        <p className="text-xs text-gray-500 mt-1">Dimensionless</p>
                        <p className="text-xs text-gray-500 mt-1 italic">Note: This is L/D at the specified α, not maximum L/D</p>
                      </>
                    ) : (
                      <p className="text-sm text-yellow-400">{displayCheck.postStall ? "Post-stall: L/D not displayable" : "Invalid or unrealistic L/D value"}</p>
                    )}
                  </div>
                  <div className="p-3 rounded bg-slate-700/50 border border-cyan-400/20 text-center">
                    <p className="text-sm text-slate-400 mb-1">Aspect Ratio (AR)</p>
                    <p className="text-xs text-gray-500 mb-2">AR = b²/S</p>
                    {Number.isFinite(result.aspectRatio) && result.aspectRatio > 0 ? (
                      <>
                    <p className="text-3xl font-bold text-white">{result.aspectRatio.toFixed(1)}</p>
                        <p className="text-xs text-gray-500 mt-1">Dimensionless</p>
                      </>
                    ) : (
                      <p className="text-sm text-yellow-400">Invalid aspect ratio</p>
                    )}
                  </div>
                   <div className="p-3 rounded bg-slate-700/50 border border-cyan-400/20 text-center">
                    <p className="text-sm text-slate-400 mb-1">Performance Rating</p>
                    <p className="text-xs text-gray-500 mb-2">Based on L/D at operating point</p>
                    {Number.isFinite(result.L_D_ratio) && result.L_D_ratio > 0 ? (
                      <>
                    <p className="text-2xl font-bold text-green-400 pt-1">
                      {result.L_D_ratio > 25 ? "Excellent" : result.L_D_ratio > 15 ? "Good" : result.L_D_ratio > 8 ? "Moderate" : "Poor"}
                    </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {result.L_D_ratio > 25 ? "(Glider-like)" : result.L_D_ratio > 15 ? "(Airliner)" : result.L_D_ratio > 8 ? "(Prop plane)" : "(High drag)"}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-yellow-400">Invalid L/D</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-3 rounded bg-blue-500/10 border border-blue-400/30">
                    <p className="text-sm text-slate-400 mb-1">Lift Force (L)</p>
                    <p className="text-xs text-gray-500 mb-2">L = CL × q × S, where q = 0.5 × ρ × V²</p>
                    {displayCheck.display.Lift !== "—" ? (
                      <>
                    <p className="text-xl font-bold text-blue-400">
                      {typeof displayCheck.display.Lift === "number" ? convertFromSI(displayCheck.display.Lift, "force").toFixed(2) : displayCheck.display.Lift} {getUnit("force")}
                    </p>
                        <p className="text-xs text-gray-500 mt-1">Vertical component balances weight in steady flight</p>
                      </>
                    ) : (
                      <p className="text-sm text-yellow-400">{displayCheck.postStall ? "Post-stall: Lift not displayable" : "Invalid lift force"}</p>
                    )}
                  </div>
                  <div className="p-3 rounded bg-red-500/10 border border-red-400/30">
                    <p className="text-sm text-slate-400 mb-1">Drag Force (D)</p>
                    <p className="text-xs text-gray-500 mb-2">D = CD × q × S, where CD = CD₀ + k × CL²</p>
                    {displayCheck.display.Drag !== "—" ? (
                      <>
                    <p className="text-xl font-bold text-red-400">
                      {typeof displayCheck.display.Drag === "number" ? convertFromSI(displayCheck.display.Drag, "force").toFixed(2) : displayCheck.display.Drag} {getUnit("force")}
                    </p>
                        <p className="text-xs text-gray-500 mt-1">Opposes motion; must be overcome by thrust</p>
                      </>
                    ) : (
                      <p className="text-sm text-yellow-400">{displayCheck.postStall ? "Post-stall: Drag not displayable" : "Invalid drag force"}</p>
                    )}
                  </div>
                  <div className="p-3 rounded bg-slate-700/50">
                    <p className="text-sm text-slate-400 mb-1">Lift Coefficient (CL)</p>
                    <p className="text-xs text-gray-500 mb-2">At α = {inputs.angleOfAttack}°: CL = CL₀ + CL_α × α</p>
                    {Number.isFinite(result.CL) && Math.abs(result.CL) <= 5 ? (
                      <>
                    <span className={(() => {
  const env = getCLValidity(result.CL, CL_max);
  return env.color === 'green' ? 'bg-green-700/20 px-2 rounded' : env.color === 'amber' ? 'bg-yellow-600/20 px-2 rounded' : 'bg-red-700/20 px-2 rounded';
})()} title={(() => getCLValidity(result.CL, CL_max).label)()}>
  <p className="text-xl font-bold text-white inline">{result.CL.toFixed(4)}</p>
</span>
<span className={`ml-2 text-xs font-semibold`}
  style={{ color: getCLValidity(result.CL, CL_max).color === 'green' ? '#22c55e' : getCLValidity(result.CL, CL_max).color === 'amber' ? '#eab308' : '#ef4444' }}>
  {getCLValidity(result.CL, CL_max).label}
</span>
                        <p className="text-xs text-gray-500 mt-1">Dimensionless; normalized by dynamic pressure and wing area</p>
                      </>
                    ) : (
                      <p className="text-sm text-yellow-400">Invalid or unrealistic CL value</p>
                    )}
                  </div>
                  <div className="p-3 rounded bg-slate-700/50">
                    <p className="text-sm text-slate-400 mb-1">Total Drag Coefficient (CD)</p>
                    <p className="text-xs text-gray-500 mb-2">CD = CD₀ + k × CL² (parasitic + induced)</p>
                    {(() => {
                      const activeAirfoil = getActiveAirfoil();
                      if (!activeAirfoil) {
                        // Fallback: if airfoil is undefined, use standard validation (CD <= 1)
                        const isValidCD = Number.isFinite(result.CD) && result.CD > 0 && result.CD <= 1;
                        return isValidCD ? (
                          <>
                    <span className={(() => {
  const env = getCDValidity(result.CD);
  return env.color === 'green' ? 'bg-green-700/20 px-2 rounded' : env.color === 'amber' ? 'bg-yellow-600/20 px-2 rounded' : 'bg-red-700/20 px-2 rounded';
})()} title={(() => getCDValidity(result.CD).label)()}>
  <p className="text-xl font-bold text-white inline">{result.CD.toFixed(4)}</p>
</span>
<span className={`ml-2 text-xs font-semibold`}
  style={{ color: getCDValidity(result.CD).color === 'green' ? '#22c55e' : getCDValidity(result.CD).color === 'amber' ? '#eab308' : '#ef4444' }}>
  {getCDValidity(result.CD).label}
</span>
                            <p className="text-xs text-gray-500 mt-1">Dimensionless; includes both CD₀ and induced drag</p>
                          </>
                        ) : (
                          <p className="text-sm text-yellow-400">Invalid or unrealistic CD value</p>
                        );
                      }
                      const alpha = parseFloat(inputs.angleOfAttack);
                      const isPostStall = !isNaN(alpha) && Math.abs(alpha) > activeAirfoil.alpha_stall;
                      const isValidCD = Number.isFinite(result.CD) && result.CD > 0 && (isPostStall || result.CD <= 1);
                      return isValidCD ? (
                        <>
                          <span className={(() => {
  const env = getCDValidity(result.CD);
  return env.color === 'green' ? 'bg-green-700/20 px-2 rounded' : env.color === 'amber' ? 'bg-yellow-600/20 px-2 rounded' : 'bg-red-700/20 px-2 rounded';
})()} title={(() => getCDValidity(result.CD).label)()}>
  <p className="text-xl font-bold text-white inline">{result.CD.toFixed(4)}</p>
</span>
<span className={`ml-2 text-xs font-semibold`}
  style={{ color: getCDValidity(result.CD).color === 'green' ? '#22c55e' : getCDValidity(result.CD).color === 'amber' ? '#eab308' : '#ef4444' }}>
  {getCDValidity(result.CD).label}
</span>
                          <p className="text-xs text-gray-500 mt-1">Dimensionless; includes both CD₀ and induced drag</p>
                          {isPostStall && result.CD > 1 && (
                            <p className="text-xs text-yellow-400 mt-1">Note: CD &gt; 1 is expected in post-stall conditions</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-yellow-400">Invalid or unrealistic CD value</p>
                      );
                    })()}
                  </div>
                </div>

                {/* Button to publish L/D to design session */}
                {Number.isFinite(result.L_D_ratio) && result.L_D_ratio > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const alpha = parseFloat(inputs.angleOfAttack);
                        if (Number.isFinite(alpha) && Number.isFinite(result.CL) && Number.isFinite(result.L_D_ratio)) {
                          updateDesignSession({
                            ldClimb: result.L_D_ratio,
                            clClimb: result.CL,
                            alphaClimbDeg: alpha,
                          });
                        }
                      }}
                      className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
                    >
                      Use as climb L/D in Thrust Calculator
                    </Button>
                  </div>
                )}

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
          ) ; })() : (
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
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-cyan-300">
                        Polar Data (Re = 1,000,000)
                      </span>
                      {(() => {
                        const dataQuality = getPolarDataQuality(polarData, false);
                        const badge = getDataQualityBadge(dataQuality);
                        return (
                          <div 
                            className={badge.className}
                            title={badge.label}
                          >
                            {badge.label}
                          </div>
                        );
                      })()}
                    </div>
                    <span className="text-xs text-slate-400">
                      {polarData.airfoil} · L/D ratios from {(() => {
                        const quality = getPolarDataQuality(polarData, false);
                        return quality === 'experimental' ? 'experimental' : quality === 'extrapolated' ? 'mixed/extrapolated' : 'estimated/model-based';
                      })()} data
                    </span>
                  </div>
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

          {polarError && !polarData && (
            <AeroCard title="Polar Data">
              <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-300">
                <AlertDescription>
                  No experimental or estimated polars available. Try another airfoil.
                </AlertDescription>
              </Alert>
            </AeroCard>
          )}
        </div>
      <div className="mt-8 flex items-start gap-4">
  {/* Validity Envelope Legend */}
  <div className="p-3 rounded-lg bg-slate-800 border border-cyan-700/30 text-xs max-w-xs" style={{minWidth:'220px'}}>
    <b className="text-white">Validity Envelope</b> <span className="ml-2 align-middle">ℹ️</span>
    <ul className="mt-2 ml-1">
      <li><span className="inline-block w-3 h-3 rounded-full align-middle bg-green-600 mr-1" /> <span className="text-green-400">Green:</span> Physically valid (linear aerodynamics)</li>
      <li><span className="inline-block w-3 h-3 rounded-full align-middle bg-yellow-400 mr-1" /> <span className="text-yellow-300">Amber:</span> Near limits — results sensitive</li>
      <li><span className="inline-block w-3 h-3 rounded-full align-middle bg-red-600 mr-1" /> <span className="text-red-300">Red:</span> Outside validity — values hidden (see warnings)</li>
    </ul>
    <div className="mt-2 text-slate-400">
      CL valid: |CL| ≤ 0.9×CL<sub>max</sub><br />
      L/D valid: 1 ≤ L/D ≤ 50<br />
      CD valid: CD &gt; 0
    </div>
  </div>
</div>
</ToolSection>

      {/* Comparison Chart */}
      {(comparisonData.length > 0 || comparisonPolars.length > 0) && (
        <div className="flex flex-col gap-4 bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-cyan-400/30 p-6 shadow-lg backdrop-blur-sm">
          {/* Graph Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-cyan-300">
                  {graphMode === "ld" && "Performance Comparison (L/D Ratio)"}
                  {graphMode === "cl" && "Lift Coefficient (CL) vs Angle of Attack"}
                  {graphMode === "cd" && "Drag Coefficient (CD) vs Angle of Attack"}
                  {graphMode === "cm" && "Pitching Moment Coefficient (CM) vs Angle of Attack"}
                  {graphMode === "dragPolar" && "Drag Polar (CD vs CL)"}
                </h3>
                {/* TODO: When real polars are added, change to: comparisonPolars.some(p => isPlaceholderPolar(p.data)) || (polarData && isPlaceholderPolar(polarData)) */}
                <div 
                  className="bg-amber-600/20 text-amber-300 border border-amber-500/50 text-xs px-2 py-0.5 rounded-md"
                  title="Placeholder data – real experimental/XFOIL polars coming soon."
                >
                  ⚠ Placeholder
                </div>
              </div>
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

            {/* CM comparison warning */}
            {graphMode === "cm" && comparisonPolars.length > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                CM comparison limited – placeholder polars use nearly constant Cm.
              </p>
            )}

            {/* Export Target - Chart + Legend Only */}
            <div ref={exportRef} className="graph-export-target pt-2">
              {/* Graph Body - Chart Area */}
              <div className="relative min-h-[400px]">
              {graphMode === "dragPolar" ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart margin={{ top: 8, right: 12, bottom: 12, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      type="number"
                      dataKey="cl"
                      {...globalAxisCommonProps}
                      tick={globalAxisTickStyle}
                      tickFormatter={(val) => val.toFixed(2)}
                      height={34}
                      label={makeXAxisLabel("Lift Coefficient, CL")}
                    />
                    <YAxis
                      type="number"
                      {...globalAxisCommonProps}
                      tick={globalAxisTickStyle}
                      tickFormatter={yAxisConfig.formatter}
                      width={62}
                      label={makeYAxisLabel("Drag Coefficient, CD")}
                    />
                    <Tooltip
                      content={<CustomTooltipWithBadge />}
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
                  <LineChart 
                    data={graphMode === "ld" ? comparisonData : currentChartData}
                    margin={{ top: 8, right: 12, bottom: 12, left: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="alpha"
                      type="number"
                      {...globalAxisCommonProps}
                      tick={globalAxisTickStyle}
                      height={34}
                      label={makeXAxisLabel("Angle of Attack (degrees)")}
                    />
                    <YAxis
                      domain={getAutoScaledYDomain(graphMode, graphMode === "ld" ? comparisonData : currentChartData)}
                      {...globalAxisCommonProps}
                      tick={globalAxisTickStyle}
                      tickFormatter={yAxisConfig.formatter}
                      width={62}
                      label={makeYAxisLabel(yAxisConfig.label)}
                    />
                    <Tooltip
                      content={<CustomTooltipWithBadge />}
                    />
                    <Legend
                      verticalAlign="top"
                      align="left"
                      content={renderCustomLegend}
                    />
                    
                    {/* Stall line and post-stall shading for alpha-based charts */}
                    {comparisonPolars.length > 0 && (
                      <>
                        {comparisonPolars.map((polar) => {
                          const stallAlpha = polar.data.meta.alphaStallDeg;
                          if (!stallAlpha || !Number.isFinite(stallAlpha)) return null;
                          
                          // Get max alpha from enhanced polar data for shading
                          const maxAlpha = polar.data.alpha_deg.length > 0
                            ? Math.max(...polar.data.alpha_deg)
                            : currentChartData.length > 0
                            ? Math.max(...currentChartData.map(d => (d as { alpha: number }).alpha))
                            : 20;
                          
                          return (
                            <g key={`stall-${polar.id}`}>
                              <ReferenceLine
                                x={stallAlpha}
                                stroke={stallLineColor}
                                strokeWidth={1.5}
                                strokeDasharray="3 3"
                                opacity={0.6}
                                ifOverflow="extendDomain"
                              />
                              {stallAlpha < maxAlpha && (
                                <ReferenceArea
                                  x1={stallAlpha}
                                  x2={maxAlpha}
                                  fill={stallFillColor}
                                  strokeOpacity={0}
                                />
                              )}
                            </g>
                          );
                        })}
                      </>
                    )}
                    
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
                              name={getAirfoilLegendLabel(polar.id, polar.name)}
                              stroke={color}
                              strokeWidth={isActive ? 3 : 2}
                              strokeDasharray={isActive ? undefined : "5 5"}
                              dot={false}
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
                            name={getAirfoilLegendLabel(polar.id, polar.name)}
                            stroke={color}
                            strokeWidth={isActive ? 3 : 2}
                            dot={false}
                            connectNulls={false}
                          />
                        );
                      })
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
              </div>
              
              {/* Stall line note */}
              {graphMode !== "dragPolar" && comparisonPolars.some(p => p.data.meta.alphaStallDeg && Number.isFinite(p.data.meta.alphaStallDeg)) && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500">
                    Dotted line marks modeled stall onset.
                  </p>
                </div>
              )}
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