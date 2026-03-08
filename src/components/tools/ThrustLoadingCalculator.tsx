"use client";

/**
 * Thrust Loading Calculator - Engineering-Grade
 * 
 * Calculates thrust-to-weight ratio (T/W) with mission-specific classification
 * and engineering interpretations.
 * 
 * Features:
 * - Aircraft presets (reusing Wing Loading presets)
 * - Mission type selection (UAV, Trainer, STOL, Glider, Jet, None)
 * - Mass/Weight input toggle
 * - Thrust input (Total or Per-engine × # engines)
 * - Thrust units (N, kgf, lbf)
 * - Compute T/W from thrust OR compute required thrust from target T/W
 * - Climb performance (Expert mode: V_climb, L/D_climb)
 * - Engine type selection (Prop / Turbofan / Turbojet) - Expert mode
 * - Mission-specific T/W envelopes
 * - Engineering-grade interpretations
 * - Step-by-step solution display
 */

import { useState, useEffect, useMemo } from "react";
import { useCalculationAnimation } from "@/hooks/useCalculationAnimation";
import { CalculationOverlay } from "@/components/common/CalculationOverlay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge, Plane, Info, TrendingUp, AlertTriangle, CheckCircle, Anchor, Settings2, Zap, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useToolContext } from "@/hooks/useToolContext";
import { useDesignSession } from "@/contexts/designSession";
import { Button } from "@/components/ui/button";
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
import { CalculationSteps } from "@/components/common/CalculationSteps";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { 
  UnitSystem,
  convertMassToSI,
  convertMassFromSI,
  convertWeightToSI,
  convertWeightFromSI,
  convertThrustToSI,
  convertThrustFromSI,
  getInputUnits,
  getOutputUnits
} from "./utils/unitConversions";
import { ThrustLoadingGraphs } from "./ThrustLoadingGraphs";
import { ThrustWingSizingDiagram } from "./ThrustWingSizingDiagram";
import { WingLoadingGraphs } from "./WingLoadingGraphs";
import { InlineInterlinkHint } from "@/components/common/InterlinkCTA";
import { FIELD_KEYS } from "./utils/interlinkConfig";
import { 
  getReusableDataForCalculator, 
  hasReusableData,
  findSourceList,
  getReusableDataWithSources,
  applyReusableDataToSetters,
  SourceInfo
} from "./utils/interlink";
import { useSearchParams, useNavigate } from "react-router-dom";

// ============================================================================
// TYPES & CONSTANTS - BATCH 1
// ============================================================================

type MissionType = 'None' | 'UAV' | 'Trainer' | 'STOL' | 'Glider' | 'Jet';
type CalculatorMode = 'Beginner' | 'University' | 'Expert';
type WeightMode = 'mass' | 'weight';
type ThrustMode = 'total' | 'perEngine';
type CalculationMode = 'computeTW' | 'computeThrust';
type ThrustUnit = 'N' | 'kgf' | 'lbf';
type EngineType = 'Prop' | 'Turbofan' | 'Turbojet';
type ThrustLoadingClass = 'Very Low' | 'Low' | 'Within' | 'High' | 'Very High';
type AircraftPreset = 'none' | 'smallRCUAV' | 'cessna172' | 'ask21' | 'stolBush' | 'maleUAV' | 'narrowbodyAirliner' | 'highPerfJet';

interface AircraftPresetData {
  name: string;
  missionType: MissionType;
  mtowKg: number; // MTOW in kg (SI)
  totalThrustN: number; // Total installed thrust in N (SI) - estimated
  numEngines: number;
  description: string;
}

interface MissionThrustParams {
  twMin: number; // Minimum typical T/W
  twMax: number; // Maximum typical T/W
}

const GRAVITY = 9.81; // m/s²

// Mission-specific T/W ranges (typical values)
const missionThrustData: Record<MissionType, MissionThrustParams> = {
  None:    { twMin: 0.15, twMax: 0.35 }, // Default to Trainer range
  UAV:     { twMin: 0.10, twMax: 0.30 },
  Trainer: { twMin: 0.15, twMax: 0.35 },
  STOL:    { twMin: 0.20, twMax: 0.45 },
  Glider:  { twMin: 0.00, twMax: 0.05 }, // Gliders have minimal/no thrust
  Jet:     { twMin: 0.25, twMax: 0.80 }
};

// Mission-based default runway lengths (meters)
const defaultRunwayByMission: Partial<Record<MissionType, number>> = {
  None: 800,
  UAV: 250,
  Trainer: 800,
  STOL: 300,
  Glider: 400,
  Jet: 2200,
};

// Mission-specific W/S ranges for WingLoadingGraphs (kg/m²)
const missionWingLoadingData: Record<MissionType, { wsMinKg: number; wsMaxKg: number }> = {
  None:    { wsMinKg: 30,  wsMaxKg: 100 },
  UAV:     { wsMinKg: 10,  wsMaxKg: 60 },
  Trainer: { wsMinKg: 40,  wsMaxKg: 80 },
  STOL:    { wsMinKg: 20,  wsMaxKg: 60 },
  Glider:  { wsMinKg: 25,  wsMaxKg: 55 },
  Jet:     { wsMinKg: 200, wsMaxKg: 800 }
};

// Aircraft presets with realistic MTOW and thrust values
const AIRCRAFT_PRESETS: Record<Exclude<AircraftPreset, 'none'>, AircraftPresetData> = {
  smallRCUAV: {
    name: 'Small RC / Edu UAV',
    missionType: 'UAV',
    mtowKg: 2.5,
    totalThrustN: 12.3, // ~1.25 kgf, T/W ~0.5
    numEngines: 1,
    description: 'Small educational/RC UAV, T/W ~0.5'
  },
  cessna172: {
    name: 'Cessna 172 Skyhawk',
    missionType: 'Trainer',
    mtowKg: 1157,
    totalThrustN: 16000, // ~1600 kgf, T/W ~0.14
    numEngines: 1,
    description: 'Popular trainer aircraft, T/W ~0.14'
  },
  ask21: {
    name: 'ASK 21',
    missionType: 'Glider',
    mtowKg: 600,
    totalThrustN: 0, // Glider - no engine
    numEngines: 0,
    description: 'Two-seat training glider, no engine'
  },
  stolBush: {
    name: 'Generic STOL Bush Plane',
    missionType: 'STOL',
    mtowKg: 680,
    totalThrustN: 12000, // ~1200 kgf, T/W ~0.18
    numEngines: 1,
    description: 'Short takeoff/landing utility aircraft, T/W ~0.18'
  },
  maleUAV: {
    name: 'MALE UAV Design Reference',
    missionType: 'UAV',
    mtowKg: 1020,
    totalThrustN: 2000, // ~200 kgf, T/W ~0.20
    numEngines: 1,
    description: 'Typical design study, T/W ~0.20'
  },
  narrowbodyAirliner: {
    name: 'Narrowbody Airliner Reference',
    missionType: 'Jet',
    mtowKg: 78000,
    totalThrustN: 240000, // ~24000 kgf per engine × 2, T/W ~0.31
    numEngines: 2,
    description: 'Typical airliner, T/W ~0.31'
  },
  highPerfJet: {
    name: 'High-Performance Jet Reference',
    missionType: 'Jet',
    mtowKg: 18000,
    totalThrustN: 160000, // ~16000 kgf, T/W ~0.91
    numEngines: 2,
    description: 'High-performance jet, T/W ~0.91'
  }
};

interface CalculationResult {
  weightN: number;
  totalThrustN: number;
  perEngineThrustN: number;
  thrustToWeight: number;
  twClass: ThrustLoadingClass;
  interpretation: string;
  steps: string[];
  climbGradient?: number; // Expert mode: climb gradient (rad)
  rateOfClimb?: number; // Expert mode: ROC (m/s)
  climbWarning?: string; // Expert mode: warning if climb performance insufficient
  jetLowBandLabel?: string; // Jet low-band sub-label
}

// ============================================================================
// PHYSICS FUNCTIONS - BATCH 2
// ============================================================================

/**
 * Convert mass to weight
 */
function massToWeight(massKg: number): number {
  return massKg * GRAVITY;
}

/**
 * Calculate thrust-to-weight ratio
 */
function calculateThrustToWeight(totalThrustN: number, weightN: number): number {
  if (weightN <= 0) throw new Error("Weight must be positive");
  return totalThrustN / weightN;
}

/**
 * Calculate required thrust for a target T/W
 */
function calculateRequiredThrust(targetTW: number, weightN: number): number {
  if (weightN <= 0) throw new Error("Weight must be positive");
  if (targetTW < 0) throw new Error("Target T/W must be non-negative");
  return targetTW * weightN;
}

/**
 * Calculate climb gradient (Expert mode)
 * gamma = arcsin((T - D) / W) ≈ (T - D) / W for small angles
 * Simplified: gamma ≈ (T/W) - (1 / (L/D))
 */
function calculateClimbGradient(thrustToWeight: number, ldClimb: number): number {
  if (ldClimb <= 0) throw new Error("L/D must be positive");
  // Simplified: gamma ≈ T/W - 1/(L/D) (assuming small angle approximation)
  const gamma = thrustToWeight - (1 / ldClimb);
  return Math.max(0, gamma); // Clamp to non-negative
}

/**
 * Calculate rate of climb (Expert mode)
 * ROC = V_climb * sin(gamma)
 */
function calculateRateOfClimb(vClimbMs: number, climbGradient: number): number {
  if (vClimbMs <= 0) throw new Error("Climb velocity must be positive");
  return vClimbMs * Math.sin(climbGradient);
}

// ============================================================================
// CLASSIFICATION FUNCTIONS - BATCH 3
// ============================================================================

// Helper to get mission thrust data
function getMissionThrustData(missionType: MissionType): MissionThrustParams {
  if (missionType === 'None') {
    return missionThrustData['Trainer']; // Use Trainer as default
  }
  return missionThrustData[missionType];
}

/**
 * Classify thrust loading based on mission type
 * Returns classification and low-band hint for Jet missions
 */
function classifyThrustLoading(tw: number, missionType: MissionType): { 
  twClass: ThrustLoadingClass; 
  isJetLowBand: boolean;
} {
  const params = getMissionThrustData(missionType);
  const lowLimit = 0.8 * params.twMin;
  const highLimit = 1.2 * params.twMax;
  
  let twClass: ThrustLoadingClass;
  if (tw < lowLimit) twClass = 'Very Low';
  else if (tw < params.twMin) twClass = 'Low';
  else if (tw <= params.twMax) twClass = 'Within';
  else if (tw <= highLimit) twClass = 'High';
  else twClass = 'Very High';
  
  // Detect Jet low band (bottom 35% of typical range)
  let isJetLowBand = false;
  if (missionType === 'Jet' && twClass === 'Within') {
    const span = params.twMax - params.twMin;
    const lowBandUpper = params.twMin + 0.35 * span;
    isJetLowBand = tw >= params.twMin && tw < lowBandUpper;
  }
  
  return { twClass, isJetLowBand };
}

// ============================================================================
// INTERPRETATION FUNCTION - BATCH 4
// ============================================================================

/**
 * Generate engineering interpretation based on mission type and T/W classification
 */
function generateInterpretation(
  missionType: MissionType,
  twClass: ThrustLoadingClass,
  tw: number,
  climbGradient?: number,
  rateOfClimb?: number,
  isJetLowBand?: boolean
): { interpretation: string; climbWarning?: string; jetLowBandLabel?: string } {
  const params = getMissionThrustData(missionType);
  let interpretation = "";
  let climbWarning: string | undefined;
  
  // Climb performance check (Expert mode)
  if (climbGradient !== undefined && rateOfClimb !== undefined) {
    if (climbGradient < 0.02) { // Less than ~1.15° climb gradient
      climbWarning = `⚠️ Climb gradient (${(climbGradient * 180 / Math.PI).toFixed(2)}°) is very low. The aircraft may struggle to climb, especially in hot/high conditions.`;
      interpretation += climbWarning + "\n\n";
    } else if (climbGradient >= 0.02 && climbGradient < 0.05) {
      interpretation += `✓ Climb gradient: ${(climbGradient * 180 / Math.PI).toFixed(2)}° (ROC: ${rateOfClimb.toFixed(1)} m/s). Adequate for normal operations. `;
    } else {
      interpretation += `✓ Excellent climb performance: ${(climbGradient * 180 / Math.PI).toFixed(2)}° gradient (ROC: ${rateOfClimb.toFixed(1)} m/s). `;
    }
  }
  
  // Base interpretation by mission type
  switch (missionType) {
    case 'UAV':
      if (twClass === 'Very Low' || twClass === 'Low') {
        interpretation += "This T/W is low for a UAV, suitable for loiter and surveillance missions. ";
        interpretation += "Takeoff and climb performance will be limited. ";
        interpretation += "Consider this for long-endurance, low-speed operations. ";
      } else if (twClass === 'Within') {
        interpretation += "This T/W falls within typical UAV ranges. ";
        interpretation += "It offers balanced performance for both takeoff/climb and cruise efficiency. ";
        interpretation += "The aircraft should have adequate climb capability for typical mission profiles. ";
      } else if (twClass === 'High' || twClass === 'Very High') {
        interpretation += "This T/W is high for a UAV, more suitable for fast dash or aggressive mission profiles. ";
        interpretation += "Excellent climb and acceleration, but fuel consumption will be higher. ";
        interpretation += "Consider this for missions requiring rapid transit or high-altitude operations. ";
      }
      break;
      
    case 'Trainer':
      if (twClass === 'Within') {
        interpretation += "This T/W is ideal for primary training aircraft. ";
        interpretation += "It provides adequate climb performance for training scenarios while maintaining reasonable fuel efficiency. ";
        interpretation += "Takeoff distances will be moderate, and the aircraft will have good go-around capability. ";
      } else if (twClass === 'Very Low' || twClass === 'Low') {
        interpretation += "This T/W is lower than typical for trainers. ";
        interpretation += "While still flyable, takeoff distances will be longer and climb performance will be limited. ";
        interpretation += "Go-around capability may be marginal, especially at high density altitude. ";
      } else if (twClass === 'High' || twClass === 'Very High') {
        interpretation += "This T/W is higher than typical for primary trainers. ";
        interpretation += "The aircraft will have excellent climb and acceleration, but may be less forgiving for student pilots. ";
        interpretation += "Fuel consumption will be higher, reducing training endurance. ";
      }
      break;
      
    case 'STOL':
      if (twClass === 'High' || twClass === 'Very High') {
        interpretation += "This T/W is excellent for STOL operations. ";
        interpretation += "Combined with appropriate wing loading and high-lift devices, very short takeoff distances are achievable. ";
        interpretation += "The aircraft will have strong climb-out capability even from short, unimproved strips. ";
      } else if (twClass === 'Within' || twClass === 'Low') {
        interpretation += "This T/W is adequate for STOL operations when combined with low wing loading. ";
        interpretation += "Takeoff distances will be reasonable, but may not achieve minimal STOL performance. ";
        interpretation += "Consider optimizing wing loading and high-lift devices to compensate. ";
      } else {
        interpretation += "⚠️ This T/W is very low for STOL operations. ";
        interpretation += "Even with low wing loading, takeoff distances may be longer than desired for true STOL capability. ";
        interpretation += "Consider increasing installed thrust or reducing weight. ";
      }
      break;
      
    case 'Glider':
      if (tw > 0.01) {
        interpretation += "Note: Gliders typically have minimal or no engine. ";
        interpretation += "If this is a motor glider, the T/W is appropriate for sustainer/self-launch capability. ";
      } else {
        interpretation += "Pure glider configuration (no engine). ";
        interpretation += "Launch via aerotow, winch, or ground-based systems. ";
      }
      break;
      
    case 'Jet':
      if (isJetLowBand) {
        // Low band: bottom 35% of typical Jet T/W range
        interpretation += "For jet transports, this T/W is at the lower edge of the typical range. ";
        interpretation += "Expect longer takeoff distances, especially at high weight and hot/high airports. ";
        interpretation += "Climb gradients will be modest, and go-around margin will be reduced at heavy weights. ";
        interpretation += "The aircraft may require longer runways and careful weight management for operations in challenging conditions. ";
      } else if (twClass === 'Within' && !isJetLowBand) {
        // Upper half of typical range
        interpretation += "This T/W is typical for jet transports and fighters. ";
        interpretation += "The aircraft will have good takeoff performance and healthy climb capability. ";
        interpretation += "Go-around margin should be adequate even at heavy weights. ";
        interpretation += "Approach speeds will be higher than lighter aircraft, which is normal for this class. ";
      } else if (twClass === 'High') {
        interpretation += "This T/W is above typical for most jet transports, providing excellent performance. ";
        interpretation += "The aircraft will have strong takeoff and climb capability. ";
        interpretation += "Go-around margin will be generous even at maximum weight. ";
      } else if (twClass === 'Very High') {
        interpretation += "Very high T/W is characteristic of high-performance military jets. ";
        interpretation += "This configuration prioritizes acceleration, climb rate, and maneuverability. ";
        interpretation += "Fuel consumption will be high, limiting endurance. ";
      } else if (twClass === 'Low' || twClass === 'Very Low') {
        interpretation += "⚠️ This T/W is lower than typical for jet aircraft. ";
        interpretation += "Takeoff distances will be longer, and climb performance may be marginal. ";
        interpretation += "The aircraft may struggle at high altitude or in hot conditions. ";
      }
      break;
  }
  
  // Add takeoff/field length interpretation
  if (twClass === 'Very Low' || twClass === 'Low') {
    interpretation += "\n\nTakeoff Performance: Longer takeoff distances expected. ";
    interpretation += "Field length requirements will be higher, especially at high density altitude or with obstacles. ";
  } else if (twClass === 'High' || twClass === 'Very High') {
    interpretation += "\n\nTakeoff Performance: Short takeoff distances achievable. ";
    interpretation += "The aircraft will have good obstacle clearance capability and shorter field length requirements. ";
  } else {
    interpretation += "\n\nTakeoff Performance: Moderate takeoff distances. ";
    interpretation += "Field length requirements should be reasonable for the mission type. ";
  }
  
  // Add climb/go-around margin
  if (twClass === 'Within' || twClass === 'High' || twClass === 'Very High') {
    interpretation += "\n\nClimb/Go-Around Margin: Adequate margin for climb-out and go-around maneuvers. ";
    interpretation += "The aircraft should handle typical climb gradients and missed approach scenarios. ";
  } else {
    interpretation += "\n\nClimb/Go-Around Margin: Limited margin for climb and go-around. ";
    interpretation += "Exercise caution in high density altitude conditions or with obstacles. ";
  }
  
  // Add mission suitability
  const twWithinRange = tw >= params.twMin && tw <= params.twMax;
  if (twWithinRange) {
    interpretation += `\n\nMission Suitability: T/W (${tw.toFixed(3)}) aligns well with ${missionType} mission requirements. `;
  } else {
    interpretation += `\n\nMission Suitability: T/W (${tw.toFixed(3)}) is outside typical ${missionType} range (${params.twMin.toFixed(2)}–${params.twMax.toFixed(2)}). `;
    interpretation += "Consider adjusting installed thrust or weight to better match mission needs. ";
  }
  
  // Generate Jet low-band label if applicable
  let jetLowBandLabel: string | undefined;
  if (missionType === 'Jet' && isJetLowBand) {
    jetLowBandLabel = "Near lower edge of jet envelope";
  }
  
  return { interpretation, climbWarning, jetLowBandLabel };
}

// ============================================================================
// MAIN COMPONENT - BATCH 5: State & Handlers
// ============================================================================

const ThrustLoadingCalculator = () => {
  const { toast } = useToast();
  const { isCalculating, runCalculation } = useCalculationAnimation();
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const { data: designSession, updateDesignSession } = useDesignSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  
  // Required fields for this calculator
  const requiredFields = [FIELD_KEYS.massKg, FIELD_KEYS.weightN, FIELD_KEYS.wingLoadingKgm2, FIELD_KEYS.wingAreaM2, 'missionType', FIELD_KEYS.ldClimb, FIELD_KEYS.densityKgM3];
  
  // Get reusable data with source tracking
  const { data: reusableData, sources: fieldSources } = getReusableDataWithSources(designSession, requiredFields);
  const hasReusable = hasReusableData(reusableData);
  
  // State
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('SI');
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>('University');
  const [aircraftPreset, setAircraftPreset] = useState<AircraftPreset>('none');
  const [missionType, setMissionType] = useState<MissionType>('Trainer');
  const [weightMode, setWeightMode] = useState<WeightMode>('mass');
  const [massKg, setMassKg] = useState<string>("");
  const [weightN, setWeightN] = useState<string>("");
  const [thrustMode, setThrustMode] = useState<ThrustMode>('total');
  const [totalThrust, setTotalThrust] = useState<string>("");
  const [perEngineThrust, setPerEngineThrust] = useState<string>("");
  const [numEngines, setNumEngines] = useState<string>("1");
  const [thrustUnit, setThrustUnit] = useState<ThrustUnit>('N');
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('computeTW');
  const [targetTW, setTargetTW] = useState<string>("");
  const [engineType, setEngineType] = useState<EngineType>('Prop');
  const [vClimb, setVClimb] = useState<string>("");
  const [ldClimb, setLdClimb] = useState<string>("");
  const [gammaReqPercent, setGammaReqPercent] = useState<string>("3"); // Default 3%
  const [cd0Input, setCd0Input] = useState<string>('0.025'); // Zero-lift drag coefficient
  const [kInput, setKInput] = useState<string>('0.045'); // Induced drag factor
  const [vCruiseInput, setVCruiseInput] = useState<string>('90'); // Cruise speed in knots
  const [runwayLengthInput, setRunwayLengthInput] = useState<string>(''); // meters
  const [clToInput, setClToInput] = useState<string>(''); // C_L_TO
  const [muRollInput, setMuRollInput] = useState<string>('0.03'); // μ_r, default paved
  const [hasTouchedRunway, setHasTouchedRunway] = useState<boolean>(false);
  const [showUniHelp, setShowUniHelp] = useState(false);
  const [showExpertHelp, setShowExpertHelp] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  interface PayloadData {
    tool: string;
    inputs: Record<string, unknown>;
    results: Record<string, unknown>;
  }
  const [lastPayload, setLastPayload] = useState<PayloadData | null>(null);
  
  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("thrustLoadingCalc_state");
    if (stored) {
      try {
        const state = JSON.parse(stored);
        setUnitSystem(state.unitSystem || 'SI');
        setCalculatorMode(state.calculatorMode || 'University');
        setAircraftPreset(state.aircraftPreset || 'none');
        setMissionType(state.missionType || 'Trainer');
        setWeightMode(state.weightMode || 'mass');
        setMassKg(state.massKg || "");
        setWeightN(state.weightN || "");
        setThrustMode(state.thrustMode || 'total');
        setTotalThrust(state.totalThrust || "");
        setPerEngineThrust(state.perEngineThrust || "");
        setNumEngines(state.numEngines || "1");
        setThrustUnit(state.thrustUnit || 'N');
        setCalculationMode(state.calculationMode || 'computeTW');
        setTargetTW(state.targetTW || "");
        setEngineType(state.engineType || 'Prop');
        setVClimb(state.vClimb || "");
        setLdClimb(state.ldClimb || "");
        setGammaReqPercent(state.gammaReqPercent || "3");
        setCd0Input(state.cd0Input || '0.025');
        setKInput(state.kInput || '0.045');
        setVCruiseInput(state.vCruiseInput || '90');
        setRunwayLengthInput(state.runwayLengthInput || '');
        setClToInput(state.clToInput || '');
        setMuRollInput(state.muRollInput || '0.03');
        setHasTouchedRunway(state.hasTouchedRunway || false);
      } catch (e) {
        console.warn("Failed to load state:", e);
      }
    }
  }, []);
  
  // Save to localStorage
  useEffect(() => {
    const state = {
      unitSystem,
      calculatorMode,
      aircraftPreset,
      missionType,
      weightMode,
      massKg,
      weightN,
      thrustMode,
      totalThrust,
      perEngineThrust,
      numEngines,
      thrustUnit,
      calculationMode,
      targetTW,
      engineType,
      vClimb,
      ldClimb,
      gammaReqPercent,
      cd0Input,
      kInput,
      vCruiseInput,
      runwayLengthInput,
      clToInput,
      muRollInput,
      hasTouchedRunway
    };
    localStorage.setItem("thrustLoadingCalc_state", JSON.stringify(state));
  }, [unitSystem, calculatorMode, aircraftPreset, missionType, weightMode, massKg, weightN, thrustMode, totalThrust, perEngineThrust, numEngines, thrustUnit, calculationMode, targetTW, engineType, vClimb, ldClimb, gammaReqPercent, cd0Input, kInput, vCruiseInput, runwayLengthInput, clToInput, muRollInput, hasTouchedRunway]);
  
  // Auto-fill runway length based on mission type
  useEffect(() => {
    if (!hasTouchedRunway) {
      const defaultRunway = defaultRunwayByMission[missionType];
      if (defaultRunway && !runwayLengthInput) {
        setRunwayLengthInput(defaultRunway.toString());
      }
    }
  }, [missionType, hasTouchedRunway, runwayLengthInput]);
  
  // Auto-fill CL_TO based on designSession.clMaxUsed
  useEffect(() => {
    if (!clToInput && designSession?.clMaxUsed && designSession.clMaxUsed > 0) {
      const suggestedClTo = 0.8 * designSession.clMaxUsed;
      setClToInput(suggestedClTo.toFixed(2));
    }
  }, [clToInput, designSession?.clMaxUsed]);
  
  // Handle aircraft preset selection
  const handleAircraftPresetChange = (preset: AircraftPreset) => {
    setAircraftPreset(preset);
    if (preset !== 'none') {
      const aircraft = AIRCRAFT_PRESETS[preset];
      if (missionType !== 'None') {
        setMissionType(aircraft.missionType);
      }
      
      const massDisplay = convertMassFromSI(aircraft.mtowKg, unitSystem);
      setMassKg(massDisplay.toFixed(2));
      setWeightN("");
      
      if (aircraft.totalThrustN > 0) {
        const thrustDisplay = convertThrustFromSI(aircraft.totalThrustN, thrustUnit);
        setTotalThrust(thrustDisplay.toFixed(0));
        setPerEngineThrust((thrustDisplay / aircraft.numEngines).toFixed(0));
        setNumEngines(aircraft.numEngines.toString());
        setThrustMode(aircraft.numEngines > 1 ? 'perEngine' : 'total');
      } else {
        setTotalThrust("");
        setPerEngineThrust("");
        setNumEngines("0");
      }
    }
  };
  
  // Get input/output units
  const inputUnits = useMemo(() => getInputUnits(unitSystem), [unitSystem]);
  const outputUnits = useMemo(() => getOutputUnits(unitSystem), [unitSystem]);
  
  // Calculate
  const handleCalculate = async () => {
    try {
      // Validate and convert inputs to SI
      const massInput = weightMode === 'mass' ? parseFloat(massKg) : null;
      const weightInput = weightMode === 'weight' ? parseFloat(weightN) : null;
      
      if (weightMode === 'mass' && (isNaN(massInput!) || massInput! <= 0)) {
        toast({ title: "Invalid Input", description: "Mass must be a positive number", variant: "destructive" });
        return;
      }
      if (weightMode === 'weight' && (isNaN(weightInput!) || weightInput! <= 0)) {
        toast({ title: "Invalid Input", description: "Weight must be a positive number", variant: "destructive" });
        return;
      }
      
      // Convert to SI
      const massKgSI = weightMode === 'mass' ? convertMassToSI(massInput!, unitSystem) : null;
      const weightNSI = weightMode === 'weight' ? convertWeightToSI(weightInput!, unitSystem) : null;
      const finalWeightN = weightMode === 'mass' ? massToWeight(massKgSI!) : weightNSI!;
      
      // Validate converted SI values
      if (weightMode === 'mass' && (!isFinite(massKgSI!) || massKgSI! <= 0)) {
        toast({ title: "Invalid Input", description: "Mass conversion resulted in invalid value", variant: "destructive" });
        return;
      }
      if (weightMode === 'weight' && (!isFinite(weightNSI!) || weightNSI! <= 0)) {
        toast({ title: "Invalid Input", description: "Weight conversion resulted in invalid value", variant: "destructive" });
        return;
      }
      if (!isFinite(finalWeightN) || finalWeightN <= 0 || finalWeightN > 1e12) {
        toast({ title: "Invalid Input", description: "Weight value is invalid or unrealistically large", variant: "destructive" });
        return;
      }
      
      let totalThrustNSI: number;
      let perEngineThrustNSI: number;
      
      if (calculationMode === 'computeTW') {
        // Compute T/W from thrust
        if (thrustMode === 'total') {
          const thrustInput = parseFloat(totalThrust);
          if (isNaN(thrustInput) || thrustInput <= 0) {
            toast({ title: "Invalid Input", description: "Total thrust must be a positive number", variant: "destructive" });
            return;
          }
          totalThrustNSI = convertThrustToSI(thrustInput, thrustUnit);
          if (!isFinite(totalThrustNSI) || totalThrustNSI <= 0 || totalThrustNSI > 1e12) {
            toast({ title: "Invalid Input", description: "Thrust conversion resulted in invalid or unrealistically large value", variant: "destructive" });
            return;
          }
          // Calculate per-engine thrust from total (assume 1 engine if not specified)
          const numEnginesInput = parseInt(numEngines) || 1;
          if (numEnginesInput <= 0 || numEnginesInput !== Math.floor(numEnginesInput) || numEnginesInput > 100) {
            toast({ title: "Invalid Input", description: "Number of engines must be a positive integer (1-100)", variant: "destructive" });
            return;
          }
          perEngineThrustNSI = totalThrustNSI / numEnginesInput;
          if (!isFinite(perEngineThrustNSI) || perEngineThrustNSI <= 0) {
            toast({ title: "Invalid Input", description: "Per-engine thrust calculation resulted in invalid value", variant: "destructive" });
            return;
          }
        } else {
          const perEngineInput = parseFloat(perEngineThrust);
          const numEnginesInput = parseInt(numEngines);
          if (isNaN(perEngineInput) || perEngineInput <= 0) {
            toast({ title: "Invalid Input", description: "Per-engine thrust must be a positive number", variant: "destructive" });
            return;
          }
          if (isNaN(numEnginesInput) || numEnginesInput <= 0 || numEnginesInput !== Math.floor(numEnginesInput) || numEnginesInput > 100) {
            toast({ title: "Invalid Input", description: "Number of engines must be a positive integer (1-100)", variant: "destructive" });
            return;
          }
          perEngineThrustNSI = convertThrustToSI(perEngineInput, thrustUnit);
          if (!isFinite(perEngineThrustNSI) || perEngineThrustNSI <= 0 || perEngineThrustNSI > 1e12) {
            toast({ title: "Invalid Input", description: "Per-engine thrust conversion resulted in invalid or unrealistically large value", variant: "destructive" });
            return;
          }
          totalThrustNSI = perEngineThrustNSI * numEnginesInput;
          if (!isFinite(totalThrustNSI) || totalThrustNSI <= 0 || totalThrustNSI > 1e12) {
            toast({ title: "Invalid Input", description: "Total thrust calculation resulted in invalid or unrealistically large value", variant: "destructive" });
            return;
          }
        }
      } else {
        // Compute required thrust from target T/W
        const targetTWInput = parseFloat(targetTW);
        if (isNaN(targetTWInput) || targetTWInput <= 0 || targetTWInput > 10) {
          toast({ title: "Invalid Input", description: "Target T/W must be a positive number (typically 0.1-2.0)", variant: "destructive" });
          return;
        }
        totalThrustNSI = calculateRequiredThrust(targetTWInput, finalWeightN);
        if (!isFinite(totalThrustNSI) || totalThrustNSI <= 0 || totalThrustNSI > 1e12) {
          toast({ title: "Invalid Input", description: "Required thrust calculation resulted in invalid or unrealistically large value", variant: "destructive" });
          return;
        }
        const numEnginesInput = parseInt(numEngines) || 1;
        if (numEnginesInput <= 0 || numEnginesInput !== Math.floor(numEnginesInput) || numEnginesInput > 100) {
          toast({ title: "Invalid Input", description: "Number of engines must be a positive integer (1-100)", variant: "destructive" });
          return;
        }
        perEngineThrustNSI = totalThrustNSI / numEnginesInput;
        if (!isFinite(perEngineThrustNSI) || perEngineThrustNSI <= 0) {
          toast({ title: "Invalid Input", description: "Per-engine thrust calculation resulted in invalid value", variant: "destructive" });
          return;
        }
      }
      
      // Calculate T/W
      const tw = calculateThrustToWeight(totalThrustNSI, finalWeightN);
      if (!isFinite(tw) || tw <= 0 || tw > 10) {
        toast({ title: "Calculation Error", description: "T/W calculation resulted in invalid or unrealistic value", variant: "destructive" });
        return;
      }
      
      // Classify (returns both class and Jet low-band hint)
      const { twClass, isJetLowBand } = classifyThrustLoading(tw, missionType);
      
      // Climb performance (Expert mode only)
      let climbGradient: number | undefined;
      let rateOfClimb: number | undefined;
      
      if (calculatorMode === 'Expert' && vClimb && ldClimb) {
        const vClimbInput = parseFloat(vClimb);
        const ldClimbInput = parseFloat(ldClimb);
        if (!isNaN(vClimbInput) && vClimbInput > 0 && !isNaN(ldClimbInput) && ldClimbInput > 0) {
          if (vClimbInput > 1000) {
            toast({ title: "Invalid Input", description: "Climb velocity is unrealistically large (typical: 20-100 m/s)", variant: "destructive" });
            return;
          }
          if (ldClimbInput > 100) {
            toast({ title: "Invalid Input", description: "L/D ratio is unrealistically large (typical: 8-20)", variant: "destructive" });
            return;
          }
          climbGradient = calculateClimbGradient(tw, ldClimbInput);
          if (!isFinite(climbGradient) || climbGradient < 0) {
            toast({ title: "Calculation Error", description: "Climb gradient calculation resulted in invalid value", variant: "destructive" });
            return;
          }
          rateOfClimb = calculateRateOfClimb(vClimbInput, climbGradient);
          if (!isFinite(rateOfClimb) || rateOfClimb < 0 || rateOfClimb > 1000) {
            toast({ title: "Calculation Error", description: "Rate of climb calculation resulted in invalid or unrealistic value", variant: "destructive" });
            return;
          }
        }
      }
      
      // Generate interpretation
      const { interpretation, climbWarning, jetLowBandLabel } = generateInterpretation(
        missionType,
        twClass,
        tw,
        climbGradient,
        rateOfClimb,
        isJetLowBand
      );
      
      // Generate step-by-step solution
      const steps: string[] = [];
      let stepNum = 1;
      
      if (weightMode === 'mass') {
        steps.push(`**Step ${stepNum}: Convert mass to weight**`);
        const massDisplay = unitSystem === 'SI' ? massKgSI!.toFixed(2) : massInput!.toFixed(2);
        steps.push(`W = m × g = ${massDisplay} ${inputUnits.mass} × ${GRAVITY} m/s² = ${finalWeightN.toFixed(2)} N`);
        stepNum++;
      } else {
        const weightDisplay = unitSystem === 'SI' ? weightNSI!.toFixed(2) : weightInput!.toFixed(2);
        steps.push(`**Step ${stepNum}: Weight**`);
        steps.push(`W = ${weightDisplay} ${inputUnits.weight} = ${finalWeightN.toFixed(2)} N (converted to SI)`);
        stepNum++;
      }
      
      if (calculationMode === 'computeTW') {
        steps.push(`**Step ${stepNum}: Compute total thrust**`);
        if (thrustMode === 'total') {
          const thrustDisplay = unitSystem === 'SI' && thrustUnit === 'N' ? totalThrustNSI.toFixed(2) : parseFloat(totalThrust).toFixed(2);
          steps.push(`T_total = ${thrustDisplay} ${thrustUnit} = ${totalThrustNSI.toFixed(2)} N (converted to SI)`);
        } else {
          const perEngineDisplay = unitSystem === 'SI' && thrustUnit === 'N' ? perEngineThrustNSI.toFixed(2) : parseFloat(perEngineThrust).toFixed(2);
          steps.push(`T_per_engine = ${perEngineDisplay} ${thrustUnit}`);
          steps.push(`T_total = T_per_engine × N_engines = ${perEngineThrustNSI.toFixed(2)} N × ${parseInt(numEngines)} = ${totalThrustNSI.toFixed(2)} N`);
        }
        stepNum++;
        
        steps.push(`**Step ${stepNum}: Compute T/W**`);
        steps.push(`T/W = T_total / W = ${totalThrustNSI.toFixed(2)} N / ${finalWeightN.toFixed(2)} N = ${tw.toFixed(3)}`);
      } else {
        steps.push(`**Step ${stepNum}: Compute required thrust**`);
        steps.push(`T_required = (T/W)_target × W = ${parseFloat(targetTW).toFixed(3)} × ${finalWeightN.toFixed(2)} N = ${totalThrustNSI.toFixed(2)} N`);
        stepNum++;
        
        steps.push(`**Step ${stepNum}: Per-engine thrust**`);
        steps.push(`T_per_engine = T_total / N_engines = ${totalThrustNSI.toFixed(2)} N / ${parseInt(numEngines)} = ${perEngineThrustNSI.toFixed(2)} N`);
        stepNum++;
        
        steps.push(`**Step ${stepNum}: Verify T/W**`);
        steps.push(`T/W = T_total / W = ${totalThrustNSI.toFixed(2)} N / ${finalWeightN.toFixed(2)} N = ${tw.toFixed(3)}`);
      }
      
      stepNum++;
      steps.push(`**Step ${stepNum}: Compare against mission envelope**`);
      if (missionType !== 'None') {
        const params = getMissionThrustData(missionType);
        steps.push(`Typical ${missionType} T/W: ${params.twMin.toFixed(2)}–${params.twMax.toFixed(2)}`);
      } else {
        steps.push(`Manual mode: No mission-specific ranges applied`);
      }
      steps.push(`Current T/W: ${tw.toFixed(3)} → Classification: ${twClass}`);
      
      if (climbGradient !== undefined && rateOfClimb !== undefined) {
        stepNum++;
        steps.push(`**Step ${stepNum}: Climb Performance**`);
        steps.push(`Climb gradient: γ = arcsin((T/W) - 1/(L/D)) ≈ ${climbGradient.toFixed(4)} rad = ${(climbGradient * 180 / Math.PI).toFixed(2)}°`);
        steps.push(`Rate of Climb: ROC = V_climb × sin(γ) = ${parseFloat(vClimb).toFixed(1)} m/s × sin(${(climbGradient * 180 / Math.PI).toFixed(2)}°) = ${rateOfClimb.toFixed(2)} m/s`);
      }
      
      const calculationResult: CalculationResult = {
        weightN: finalWeightN,
        totalThrustN: totalThrustNSI,
        perEngineThrustN: perEngineThrustNSI,
        thrustToWeight: tw,
        twClass,
        interpretation,
        steps,
        climbGradient,
        rateOfClimb,
        climbWarning
      };
      
      setResult(calculationResult);
      
      // Publish calculated data to designSession immediately - only if all values are valid and finite
      const numEnginesFinal = parseInt(numEngines) || 1;
      if (Number.isFinite(totalThrustNSI) && Number.isFinite(finalWeightN) && Number.isFinite(perEngineThrustNSI) && 
          totalThrustNSI > 0 && finalWeightN > 0 && perEngineThrustNSI > 0 &&
          numEnginesFinal > 0 && numEnginesFinal <= 100 && numEnginesFinal === Math.floor(numEnginesFinal)) {
        updateDesignSession({
          totalThrustN: totalThrustNSI,
          perEngineThrustN: perEngineThrustNSI,
          numEngines: numEnginesFinal,
        });
      }
      
      // Send calculation event
      const toolInputs = {
        unitSystem,
        missionType,
        weightMode,
        massKg: weightMode === 'mass' ? massInput : null,
        weightN: weightMode === 'weight' ? weightInput : null,
        thrustMode,
        totalThrust: calculationMode === 'computeTW' ? (thrustMode === 'total' ? parseFloat(totalThrust) : null) : null,
        perEngineThrust: calculationMode === 'computeTW' ? (thrustMode === 'perEngine' ? parseFloat(perEngineThrust) : null) : null,
        numEngines: parseInt(numEngines),
        thrustUnit,
        calculationMode,
        targetTW: calculationMode === 'computeThrust' ? parseFloat(targetTW) : null,
        engineType: calculatorMode === 'Expert' ? engineType : null,
        vClimb: calculatorMode === 'Expert' ? (vClimb ? parseFloat(vClimb) : null) : null,
        ldClimb: calculatorMode === 'Expert' ? (ldClimb ? parseFloat(ldClimb) : null) : null
      };
      
      const toolResults = {
        totalThrustN: totalThrustNSI,
        perEngineThrustN: perEngineThrustNSI,
        thrustToWeight: tw,
        twClass
      };
      
      const eventResponse = await sendCalculationEvent({
        toolId: "thrust-loading-calculator",
        toolName: "Thrust Loading Calculator",
        inputs: toolInputs,
        results: toolResults,
        steps: steps,
        metadata: {
          approxLevel: "exact",
          confidence: "high"
        }
      });

      if (eventResponse?.requestId) {
        setLastRequestId(eventResponse.requestId);
      }
      
      setLastPayload({
        tool: "Thrust Loading Calculator",
        inputs: toolInputs,
        results: toolResults
      });

      updateToolContext({
        tool: "Thrust Loading Calculator",
        inputs: toolInputs,
        results: toolResults
      });

    } catch (error) {
      toast({ 
        title: "Calculation Error", 
        description: (error as Error).message, 
        variant: "destructive" 
      });
    }
  };
  
  const handleReset = () => {
    setAircraftPreset('none');
    setMassKg("");
    setWeightN("");
    setTotalThrust("");
    setPerEngineThrust("");
    setNumEngines("1");
    setResult(null);
    setTargetTW("");
    setVClimb("");
    setLdClimb("");
  };
  
  // Get classification color
  const getClassificationColor = (twClass: ThrustLoadingClass): string => {
    switch (twClass) {
      case 'Very Low': return 'text-red-400';
      case 'Low': return 'text-orange-400';
      case 'Within': return 'text-green-400';
      case 'High': return 'text-cyan-400';
      case 'Very High': return 'text-purple-400';
    }
  };
  
  // Calculate position on mission envelope bar
  const getEnvelopePosition = (): number => {
    if (!result) return 0;
    if (missionType === 'None') return 50;
    const params = getMissionThrustData(missionType);
    const extendedMin = 0.8 * params.twMin;
    const extendedMax = 1.2 * params.twMax;
    const extendedRange = extendedMax - extendedMin;
    
    if (extendedRange <= 0) return 50;
    
    const clamped = Math.max(extendedMin, Math.min(extendedMax, result.thrustToWeight));
    const position = ((clamped - extendedMin) / extendedRange) * 100;
    return Math.max(0, Math.min(100, position));
  };
  
  // Calculate range bar position
  const getRangeBarPosition = (): { left: number; width: number } => {
    if (missionType === 'None') return { left: 0, width: 100 };
    const params = getMissionThrustData(missionType);
    const extendedMin = 0.8 * params.twMin;
    const extendedMax = 1.2 * params.twMax;
    const extendedRange = extendedMax - extendedMin;
    
    if (extendedRange <= 0) return { left: 0, width: 100 };
    
    const rangeMin = params.twMin;
    const rangeMax = params.twMax;
    const left = ((rangeMin - extendedMin) / extendedRange) * 100;
    const width = ((rangeMax - rangeMin) / extendedRange) * 100;
    
    return { left: Math.max(0, left), width: Math.max(0, Math.min(100, width)) };
  };

  
  return (
    <ToolWrapper>
      <ToolHeader
        title="Thrust Loading Calculator"
        description="Calculate thrust-to-weight ratio (T/W) with mission-specific classification and engineering interpretations"
        icon={Zap}
        actions={
          <ToolActions>
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-cyan-400/30 text-cyan-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI</SelectItem>
                <SelectItem value="Imperial">Imperial</SelectItem>
              </SelectContent>
            </Select>
            <AeroButton type="button" onClick={handleReset} variant="outline">
              Reset
            </AeroButton>
            {lastRequestId && lastPayload && (
              <>
                <AskAIButton
                  requestId={lastRequestId}
                  payload={buildAeroversePayload({
                    toolName: lastPayload.tool,
                    requestId: lastRequestId || undefined,
                    inputs: lastPayload.inputs,
                    results: lastPayload.results,
                  })}
                  disabled={!lastPayload}
                />
                <PDFExportButton
                  requestId={lastRequestId}
                  toolName="Thrust Loading Calculator"
                  disabled={!lastRequestId}
                />
              </>
            )}
          </ToolActions>
        }
      />

      <ToolSection gridCols={2}>
        {/* LEFT COLUMN: INPUTS */}
        <div>
          <div className={spacingVertical.L}>
            {/* Row 1: Calculator Mode and Mission Type */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <AeroCard
                title="Calculator Mode"
                description="Select complexity level (calculations remain identical)"
                icon={Settings2}
              >
                <AeroFormField label="Mode">
                  <Select value={calculatorMode} onValueChange={(v) => setCalculatorMode(v as CalculatorMode)}>
                    <SelectTrigger className="w-full bg-slate-900/50 border-cyan-400/30 text-cyan-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="University">University</SelectItem>
                      <SelectItem value="Expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </AeroFormField>
                <div className="mt-2 p-2 bg-slate-900/50 rounded border border-cyan-400/20">
                  <p className="text-xs text-gray-300">
                    {calculatorMode === 'Beginner' && 'Simplified interface with essential features only.'}
                    {calculatorMode === 'University' && 'Standard features with full functionality.'}
                    {calculatorMode === 'Expert' && 'All features including climb performance and engine type.'}
                  </p>
                </div>
              </AeroCard>
              
              <AeroCard
                title="Mission Type"
                description="Select aircraft mission type to auto-adapt T/W classification ranges"
                icon={Plane}
              >
                <AeroFormField label="Mission Type">
                  <Select value={missionType} onValueChange={(v) => setMissionType(v as MissionType)}>
                    <SelectTrigger className="w-full bg-slate-900/50 border-cyan-400/30 text-cyan-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None (Manual)</SelectItem>
                      <SelectItem value="UAV">UAV</SelectItem>
                      <SelectItem value="Trainer">Trainer</SelectItem>
                      <SelectItem value="STOL">STOL</SelectItem>
                      <SelectItem value="Glider">Glider</SelectItem>
                      <SelectItem value="Jet">Jet</SelectItem>
                    </SelectContent>
                  </Select>
                </AeroFormField>
                {missionType !== 'None' && (
                  <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                    <p className="text-sm text-gray-300">
                      <span className="text-cyan-400 font-semibold">Typical T/W:</span> {getMissionThrustData(missionType).twMin.toFixed(2)}–{getMissionThrustData(missionType).twMax.toFixed(2)}
                    </p>
                  </div>
                )}
                {missionType === 'None' && (
                  <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                    <p className="text-sm text-gray-300">
                      Mission-specific parameters will not auto-change.
                    </p>
                  </div>
                )}
              </AeroCard>
            </div>
            
            {/* Row 2: Aircraft Preset */}
            <AeroCard
              title="Aircraft Preset"
              description="Select a real-world aircraft to auto-fill mission type, mass, and thrust"
              icon={Plane}
            >
              <AeroFormField label="Aircraft Preset">
                <Select value={aircraftPreset} onValueChange={(v) => handleAircraftPresetChange(v as AircraftPreset)}>
                  <SelectTrigger className="w-full bg-slate-900/50 border-cyan-400/30 text-cyan-400">
                    <SelectValue placeholder="Select aircraft preset (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Manual Entry)</SelectItem>
                    <SelectItem value="smallRCUAV">{AIRCRAFT_PRESETS.smallRCUAV.name}</SelectItem>
                    <SelectItem value="cessna172">{AIRCRAFT_PRESETS.cessna172.name}</SelectItem>
                    <SelectItem value="ask21">{AIRCRAFT_PRESETS.ask21.name}</SelectItem>
                    <SelectItem value="stolBush">{AIRCRAFT_PRESETS.stolBush.name}</SelectItem>
                    <SelectItem value="maleUAV">{AIRCRAFT_PRESETS.maleUAV.name}</SelectItem>
                    <SelectItem value="narrowbodyAirliner">{AIRCRAFT_PRESETS.narrowbodyAirliner.name}</SelectItem>
                    <SelectItem value="highPerfJet">{AIRCRAFT_PRESETS.highPerfJet.name}</SelectItem>
                  </SelectContent>
                </Select>
              </AeroFormField>
              {aircraftPreset !== 'none' && (
                <div className="mt-2 p-2 bg-slate-900/50 rounded border border-cyan-400/20">
                  <p className="text-xs text-gray-300">
                    {AIRCRAFT_PRESETS[aircraftPreset].description}
                  </p>
                </div>
              )}
            </AeroCard>

            {/* Weight/Mass Input */}
            <AeroCard
              title="Aircraft Weight/Mass"
              description="Enter either mass (kg) or weight (N) for the flight condition of interest"
              icon={Anchor}
            >
              <div className="flex items-center gap-3 mb-4">
                <Label className="text-sm text-gray-300">Input Mode:</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${weightMode === 'mass' ? 'text-cyan-400' : 'text-gray-500'}`}>Mass ({inputUnits.mass})</span>
                  <Switch
                    checked={weightMode === 'weight'}
                    onCheckedChange={(checked) => setWeightMode(checked ? 'weight' : 'mass')}
                  />
                  <span className={`text-sm ${weightMode === 'weight' ? 'text-cyan-400' : 'text-gray-500'}`}>Weight ({inputUnits.weight})</span>
                </div>
              </div>
              {weightMode === 'mass' ? (
                <AeroFormField 
                  label={`Aircraft Mass (${inputUnits.mass})`} 
                  helperText={`Aircraft mass for the flight condition (typically MTOW or operating weight). Mass is converted to weight using g = ${GRAVITY} m/s².`}
                >
                  <Input
                    type="number"
                    name="massKg"
                    step="0.01"
                    value={massKg}
                    onChange={(e) => setMassKg(e.target.value)}
                    className="bg-slate-900/50 border-cyan-400/30"
                    placeholder={`e.g., ${unitSystem === 'SI' ? '10000' : '22046'}`}
                    min="0"
                  />
                  <InlineInterlinkHint 
                    fieldKey={FIELD_KEYS.massKg} 
                    className="mt-1" 
                    currentValue={massKg}
                    onImport={(value) => setMassKg(String(value))}
                    onUndo={(prevValue) => setMassKg(prevValue === null ? '' : String(prevValue))}
                  />
              </AeroFormField>
              ) : (
                <AeroFormField 
                  label={`Aircraft Weight (${inputUnits.weight})`} 
                  helperText={`Aircraft weight for the flight condition (typically MTOW or operating weight). Weight = mass × g, where g = ${GRAVITY} m/s² (standard gravity).`}
                >
                  <Input
                    type="number"
                    name="weightN"
                    step="0.01"
                    value={weightN}
                    onChange={(e) => setWeightN(e.target.value)}
                    className="bg-slate-900/50 border-cyan-400/30"
                    placeholder={`e.g., ${unitSystem === 'SI' ? '98100' : '22046'}`}
                    min="0"
                  />
                  {weightN && (() => {
                    const val = parseFloat(weightN);
                    if (isNaN(val)) {
                      return <p className="text-xs text-yellow-400 mt-1">Warning: Invalid number</p>;
                    }
                    if (val <= 0) {
                      return <p className="text-xs text-yellow-400 mt-1">Warning: Weight must be positive</p>;
                    }
                    const maxWeight = unitSystem === 'SI' ? 1e9 : 2.25e8; // N vs lbf (1e9 N ≈ 2.25e8 lbf)
                    if (val > maxWeight) {
                      return <p className="text-xs text-yellow-400 mt-1">Warning: Weight value is unrealistically large</p>;
                    }
                    return null;
                  })()}
                  <InlineInterlinkHint 
                    fieldKey={FIELD_KEYS.weightN} 
                    className="mt-1" 
                    currentValue={weightN}
                    onImport={(value) => setWeightN(String(value))}
                    onUndo={(prevValue) => setWeightN(prevValue === null ? '' : String(prevValue))}
                  />
              </AeroFormField>
              )}
            </AeroCard>

            {/* Calculation Mode Toggle (University/Expert) */}
            {(calculatorMode === 'University' || calculatorMode === 'Expert') && (
              <AeroCard
                title="Calculation Mode"
                description="Compute T/W from thrust OR compute required thrust from target T/W"
                icon={Gauge}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Label className="text-sm text-gray-300">Mode:</Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${calculationMode === 'computeTW' ? 'text-cyan-400' : 'text-gray-500'}`}>Compute T/W</span>
                    <Switch
                      checked={calculationMode === 'computeThrust'}
                      onCheckedChange={(checked) => setCalculationMode(checked ? 'computeThrust' : 'computeTW')}
                    />
                    <span className={`text-sm ${calculationMode === 'computeThrust' ? 'text-cyan-400' : 'text-gray-500'}`}>Required Thrust</span>
                  </div>
                </div>
                {calculationMode === 'computeThrust' && (
                  <AeroFormField 
                    label="Target T/W" 
                    helperText={`Desired thrust-to-weight ratio (T/W). Dimensionless ratio of total thrust to aircraft weight. Typical ranges: Trainer 0.15-0.35, Jet 0.25-0.80, STOL 0.20-0.45. Used to size required installed thrust.`}
                  >
                    <Input
                      type="number"
                      step="0.001"
                      value={targetTW}
                      onChange={(e) => setTargetTW(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder="e.g., 0.25"
                      min="0"
                    />
                  </AeroFormField>
                )}
              </AeroCard>
            )}

            {/* Thrust Input */}
            {calculationMode === 'computeTW' && (
              <AeroCard
                title="Thrust"
                description="Enter total installed thrust or per-engine thrust × number of engines"
                icon={Zap}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Label className="text-sm text-gray-300">Input Mode:</Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${thrustMode === 'total' ? 'text-cyan-400' : 'text-gray-500'}`}>Total Thrust</span>
                    <Switch
                      checked={thrustMode === 'perEngine'}
                      onCheckedChange={(checked) => setThrustMode(checked ? 'perEngine' : 'total')}
                    />
                    <span className={`text-sm ${thrustMode === 'perEngine' ? 'text-cyan-400' : 'text-gray-500'}`}>Per-Engine</span>
                  </div>
                </div>
                
                <AeroFormField label="Thrust Unit">
                  <Select value={thrustUnit} onValueChange={(v) => setThrustUnit(v as ThrustUnit)}>
                    <SelectTrigger className="w-full bg-slate-900/50 border-cyan-400/30 text-cyan-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N">N (Newtons)</SelectItem>
                      <SelectItem value="kgf">kgf (Kilogram-force)</SelectItem>
                      <SelectItem value="lbf">lbf (Pound-force)</SelectItem>
                    </SelectContent>
                  </Select>
                </AeroFormField>
                
                {thrustMode === 'total' ? (
                  <AeroFormField 
                    label={`Total Installed Thrust (${thrustUnit})`} 
                    helperText={`Total installed thrust available from all engines combined. Reference condition: ISA sea level static (SLS) unless otherwise specified. Used for T/W calculation: T/W = T_total / W.`}
                  >
                    <Input
                      type="number"
                      step="0.01"
                      value={totalThrust}
                      onChange={(e) => setTotalThrust(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder={`e.g., ${thrustUnit === 'N' ? '16000' : thrustUnit === 'kgf' ? '1600' : '3600'}`}
                      min="0"
                    />
                    {totalThrust && (() => {
                      const val = parseFloat(totalThrust);
                      if (isNaN(val)) {
                        return <p className="text-xs text-yellow-400 mt-1">Warning: Invalid number</p>;
                      }
                      if (val <= 0) {
                        return <p className="text-xs text-yellow-400 mt-1">Warning: Thrust must be positive</p>;
                      }
                      const maxThrust = thrustUnit === 'N' ? 1e9 : thrustUnit === 'kgf' ? 1e8 : 2e8;
                      if (val > maxThrust) {
                        return <p className="text-xs text-yellow-400 mt-1">Warning: Thrust value is unrealistically large</p>;
                      }
                      return null;
                    })()}
                  </AeroFormField>
                ) : (
                  <>
                    <AeroFormField 
                      label={`Per-Engine Thrust (${thrustUnit})`} 
                      helperText={`Thrust produced by a single engine. Reference condition: ISA sea level static (SLS) unless otherwise specified. Total thrust = per-engine thrust × number of engines.`}
                    >
                      <Input
                        type="number"
                        step="0.01"
                        value={perEngineThrust}
                        onChange={(e) => setPerEngineThrust(e.target.value)}
                        className="bg-slate-900/50 border-cyan-400/30"
                        placeholder={`e.g., ${thrustUnit === 'N' ? '8000' : thrustUnit === 'kgf' ? '800' : '1800'}`}
                        min="0"
                      />
                    </AeroFormField>
                    <AeroFormField 
                      label="Number of Engines" 
                      helperText={`Total number of engines installed on the aircraft. Used to calculate total thrust: T_total = T_per_engine × N_engines.`}
                    >
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={numEngines}
                        onChange={(e) => setNumEngines(e.target.value)}
                        className="bg-slate-900/50 border-cyan-400/30"
                        placeholder="e.g., 2"
                      />
                    </AeroFormField>
                  </>
                )}
              </AeroCard>
            )}

            {/* Expert Panel: Engine Type and Climb Performance */}
            {calculatorMode === 'Expert' && (
              <AeroCard
                title="Expert Settings"
                description="Engine type and climb performance parameters"
                icon={Info}
              >
                <AeroFormField 
                  label="Engine Type" 
                  helperText={`Propulsion system type. Used for reference in performance analysis. Prop: propeller-driven (piston/turboprop). Turbofan: high-bypass turbofan. Turbojet: low-bypass or pure jet.`}
                >
                  <Select value={engineType} onValueChange={(v) => setEngineType(v as EngineType)}>
                    <SelectTrigger className="w-full bg-slate-900/50 border-cyan-400/30 text-cyan-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Prop">Prop (Propeller)</SelectItem>
                      <SelectItem value="Turbofan">Turbofan</SelectItem>
                      <SelectItem value="Turbojet">Turbojet</SelectItem>
                    </SelectContent>
                  </Select>
                </AeroFormField>
                
                <AeroFormField 
                  label="Climb Velocity (V_climb, m/s)" 
                  helperText={`True airspeed (TAS) during the climb phase. Used to calculate rate of climb: ROC = V_climb × sin(γ). Typical values: 20-30 m/s for light aircraft, 50-100 m/s for jets.`}
                >
                  <Input
                    type="number"
                    step="0.1"
                    value={vClimb}
                    onChange={(e) => setVClimb(e.target.value)}
                    className="bg-slate-900/50 border-cyan-400/30"
                    placeholder="e.g., 25.0"
                    min="0"
                  />
                  {vClimb && (() => {
                    const val = parseFloat(vClimb);
                    if (isNaN(val)) {
                      return <p className="text-xs text-yellow-400 mt-1">Warning: Invalid number</p>;
                    }
                    if (val <= 0) {
                      return <p className="text-xs text-yellow-400 mt-1">Warning: Climb velocity must be positive</p>;
                    }
                    if (val > 1000) {
                      return <p className="text-xs text-yellow-400 mt-1">Warning: Climb velocity is unrealistically large (typical: 20-100 m/s)</p>;
                    }
                    return null;
                  })()}
                </AeroFormField>
                
                <AeroFormField 
                  label="Lift-to-Drag Ratio (L/D_climb)" 
                  helperText={`Aerodynamic efficiency during climb phase. Ratio of lift to drag at climb speed and configuration. Used to calculate climb gradient: γ ≈ (T/W) - (1/(L/D)). Typical values: 8-15 for light aircraft, 10-20 for jets.`}
                >
                  <Input
                    type="number"
                    name="ldClimb"
                    step="0.1"
                    value={ldClimb}
                    onChange={(e) => setLdClimb(e.target.value)}
                    className="bg-slate-900/50 border-cyan-400/30"
                    placeholder="e.g., 12.0"
                    min="0"
                  />
                  {ldClimb && (() => {
                    const val = parseFloat(ldClimb);
                    if (isNaN(val)) {
                      return <p className="text-xs text-yellow-400 mt-1">Warning: Invalid number</p>;
                    }
                    if (val <= 0) {
                      return <p className="text-xs text-yellow-400 mt-1">Warning: L/D ratio must be positive</p>;
                    }
                    if (val > 100) {
                      return <p className="text-xs text-yellow-400 mt-1">Warning: L/D ratio is unrealistically large (typical: 8-20)</p>;
                    }
                    return null;
                  })()}
                  <InlineInterlinkHint 
                    fieldKey={FIELD_KEYS.ldClimb} 
                    className="mt-1" 
                    currentValue={ldClimb}
                    onImport={(value) => setLdClimb(String(value))}
                    onUndo={(prevValue) => setLdClimb(prevValue === null ? '' : String(prevValue))}
                  />
                </AeroFormField>
                
                <AeroFormField 
                  label="Required Climb Gradient (γ_req)" 
                  helperText={`Minimum climb gradient required for certification or operational requirements, expressed as percentage. Typical: 3% (0.03) for normal category, 4% for utility, 6% for acrobatic. Used to verify T/W adequacy: γ = arcsin((T/W) - 1/(L/D)).`}
                >
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={gammaReqPercent}
                      onChange={(e) => setGammaReqPercent(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder="e.g., 3.0"
                      min="0"
                    />
                    <span className="text-sm text-gray-400 whitespace-nowrap">%</span>
                  </div>
                  {gammaReqPercent && !isNaN(parseFloat(gammaReqPercent)) && (
                    <p className="text-xs text-gray-400 mt-1">
                      γ = {parseFloat(gammaReqPercent) / 100} ({parseFloat(gammaReqPercent)}%)
                    </p>
                  )}
                </AeroFormField>
              </AeroCard>
            )}

            {/* Expert Panel: Cruise Constraint Inputs */}
            {calculatorMode === 'Expert' && (
              <AeroCard
                title="Cruise Constraint Inputs"
                description="Drag polar and cruise speed for T/W–W/S sizing diagram"
                icon={Plane}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <AeroFormField 
                    label="Zero-lift drag coefficient (C_D0)" 
                    helperText={`Parasite drag coefficient at zero lift. Represents form drag, skin friction, and interference drag. Typical values: 0.015-0.030 (clean), 0.025-0.040 (with landing gear/extended flaps). Used in drag polar: C_D = C_D0 + kC_L².`}
                  >
                    <Input
                      type="number"
                      step="0.001"
                      value={cd0Input}
                      onChange={(e) => setCd0Input(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder="e.g., 0.025"
                      min="0"
                    />
                  </AeroFormField>

                  <AeroFormField 
                    label="Induced drag factor (k)" 
                    helperText={`Induced drag factor in drag polar: C_D = C_D0 + kC_L². Related to aspect ratio: k ≈ 1/(πeAR), where e is Oswald efficiency (typically 0.7-0.9). Typical values: 0.03-0.06 for low AR, 0.02-0.04 for high AR.`}
                  >
                    <Input
                      type="number"
                      step="0.001"
                      value={kInput}
                      onChange={(e) => setKInput(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder="e.g., 0.045"
                      min="0"
                    />
                  </AeroFormField>

                  <AeroFormField 
                    label="Cruise speed (V_cruise, kt)" 
                    helperText={`True airspeed (TAS) during cruise phase, in knots. Used to calculate cruise drag constraint in T/W–W/S sizing diagram. Typical values: 80-120 kt (light aircraft), 200-500 kt (jets).`}
                  >
                    <Input
                      type="number"
                      step="1"
                      value={vCruiseInput}
                      onChange={(e) => setVCruiseInput(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder="e.g., 90"
                      min="0"
                    />
                    <p className="mt-1 text-[0.65rem] text-slate-400">
                      Interpreted as knots (kt) for sizing diagram.
                    </p>
                  </AeroFormField>
                </div>
              </AeroCard>
            )}

            {/* Expert Panel: Takeoff Constraint Inputs */}
            {calculatorMode === 'Expert' && (
              <AeroCard
                title="Takeoff Constraint Inputs"
                description="Runway length and takeoff lift for T/W–W/S sizing."
                icon={Plane}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <AeroFormField
                    label="Runway length (S_TO, m)"
                    helperText={`Required takeoff distance in meters. Includes ground roll and obstacle clearance distance. Typical values: 300-500 m (STOL), 800-1200 m (trainer), 2000-3000 m (jet transport). Used to calculate takeoff constraint in T/W–W/S sizing.`}
                  >
                    <Input
                      type="number"
                      step="1"
                      value={runwayLengthInput}
                      onChange={(e) => {
                        setRunwayLengthInput(e.target.value);
                        if (!hasTouchedRunway) setHasTouchedRunway(true);
                      }}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder="e.g. 800"
                      min="0"
                    />
                  </AeroFormField>

                  <AeroFormField
                    label="Takeoff lift coefficient (C_L_TO)"
                    helperText={`Effective lift coefficient during takeoff rotation. Includes ground effect and configuration (flaps, landing gear). Typical values: 0.8-1.2 (clean), 1.4-2.0 (with flaps). Used in takeoff distance calculation.`}
                  >
                    <Input
                      type="number"
                      step="0.01"
                      value={clToInput}
                      onChange={(e) => setClToInput(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder="e.g. 1.6"
                      min="0"
                    />
                  </AeroFormField>

                  <AeroFormField
                    label="Rolling friction coefficient (μ_r)"
                    helperText={`Coefficient of rolling friction between tires and runway surface. Typical values: 0.02-0.04 (paved/concrete), 0.05-0.08 (grass), 0.10-0.15 (soft/rough). Used in takeoff ground roll calculation.`}
                  >
                    <Input
                      type="number"
                      step="0.001"
                      value={muRollInput}
                      onChange={(e) => setMuRollInput(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder="0.03"
                      min="0"
                    />
                  </AeroFormField>
                </div>
              </AeroCard>
            )}
            
            {/* Calculate Button */}
            <AeroButton
              type="button"
              onClick={handleCalculate}
              variant="primary"
              icon={Gauge}
              className="w-full"
            >
              Calculate Thrust Loading
            </AeroButton>
          </div>
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="space-y-6">
          <div className={spacingVertical.L}>
            {result ? (
              <>
                {/* Primary Results Card */}
                <AeroCard
                  title="Primary Results"
                  icon={CheckCircle}
                >
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-lg border border-cyan-400/30">
                      <p className="text-sm text-gray-400 mb-1">Thrust-to-Weight Ratio (T/W)</p>
                      <p className="text-xs text-gray-500 mb-1">(Dimensionless ratio: T_total / W)</p>
                      <p className="text-3xl font-bold text-cyan-400">
                        {result.thrustToWeight.toFixed(3)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Ratio of total installed thrust to aircraft weight. Used for: takeoff performance, climb capability, go-around margin. Higher T/W improves acceleration and climb but increases fuel consumption.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-lg border border-green-400/30">
                      <p className="text-sm text-gray-400 mb-1">Total Installed Thrust</p>
                      <p className="text-xs text-gray-500 mb-1">(T_total, sum of all engines)</p>
                      <p className="text-2xl font-bold text-green-400">
                        {(() => {
                          if (!result || result.totalThrustN === undefined || isNaN(result.totalThrustN)) return '0';
                          const thrustUnit: ThrustUnit = outputUnits?.thrust === 'lbf' ? 'lbf' : outputUnits?.thrust === 'kgf' ? 'kgf' : 'N';
                          const converted = convertThrustFromSI(result.totalThrustN, thrustUnit);
                          if (isNaN(converted)) return result.totalThrustN.toFixed(0);
                          return converted.toFixed(0);
                        })()} {outputUnits?.thrust || 'N'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        ({result?.totalThrustN?.toFixed(0) || '0'} N)
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Reference condition: ISA sea level static (SLS) unless otherwise specified. Used for: T/W calculation, takeoff distance, climb performance analysis.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <p className="text-sm text-gray-400 mb-1">Per-Engine Thrust</p>
                      <p className="text-xs text-gray-500 mb-1">(T_per_engine = T_total / N_engines)</p>
                      <p className="text-xl font-bold text-cyan-300">
                        {(() => {
                          if (!result || result.perEngineThrustN === undefined || isNaN(result.perEngineThrustN)) return '0';
                          const thrustUnit: ThrustUnit = outputUnits?.thrust === 'lbf' ? 'lbf' : outputUnits?.thrust === 'kgf' ? 'kgf' : 'N';
                          const converted = convertThrustFromSI(result.perEngineThrustN, thrustUnit);
                          if (isNaN(converted)) return result.perEngineThrustN.toFixed(0);
                          return converted.toFixed(0);
                        })()} {outputUnits?.thrust || 'N'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        ({result?.perEngineThrustN?.toFixed(0) || '0'} N)
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Thrust produced by a single engine. Reference condition: ISA sea level static (SLS). Used for: engine sizing, redundancy analysis, multi-engine aircraft design.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <p className="text-sm text-gray-400 mb-1">T/W Classification</p>
                      <p className="text-xs text-gray-500 mb-1">(Relative to {missionType !== 'None' ? `${missionType} mission` : 'generic'} envelope)</p>
                      <p className={`text-xl font-bold ${getClassificationColor(result.twClass)}`}>
                        {result.twClass}
                      </p>
                      {result.jetLowBandLabel && (
                        <p className="text-xs text-yellow-400 mt-1 italic">
                          {result.jetLowBandLabel}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Classification based on comparison with typical {missionType !== 'None' ? `${missionType} mission` : 'generic aircraft'} T/W ranges. "Within" indicates typical performance, "Low"/"High" indicate deviations from typical.
                      </p>
                    </div>
                  </div>
                </AeroCard>
                
                {/* Mission Thrust Envelope Card */}
                <AeroCard
                  title="Mission Thrust Envelope"
                  description={`T/W comparison against ${missionType !== 'None' ? `${missionType} mission` : 'generic'} typical ranges`}
                  icon={TrendingUp}
                >
                  <div className="space-y-3">
                    <p className="text-sm text-gray-300">
                      Typical <span className="text-cyan-400 font-semibold">{missionType !== 'None' ? missionType : 'generic aircraft'}</span> T/W range:{" "}
                      <span className="text-cyan-400">
                        {missionType !== 'None' ? `${getMissionThrustData(missionType).twMin.toFixed(2)}–${getMissionThrustData(missionType).twMax.toFixed(2)}` : 'N/A (Manual mode)'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Typical T/W ranges for {missionType !== 'None' ? `${missionType} mission` : 'generic aircraft'} based on historical data and design practice. Used as reference for preliminary sizing and performance assessment.
                    </p>
                    <div className="relative h-12 bg-slate-700/50 rounded border border-cyan-400/30">
                      {/* Range indicator */}
                      {(() => {
                        const rangePos = getRangeBarPosition();
                        return (
                          <div
                            className="absolute h-full bg-cyan-400/30 border-l border-r border-cyan-400/50"
                            style={{
                              left: `${rangePos.left}%`,
                              width: `${rangePos.width}%`
                            }}
                          />
                        );
                      })()}
                      
                      {/* Current position marker */}
                      <div
                        className="absolute top-0 h-full w-1 bg-cyan-400 z-10"
                        style={{ left: `${getEnvelopePosition()}%` }}
                      />
                      
                      {/* Labels */}
                      <div className="absolute -top-6 left-0 right-0 flex justify-between text-xs text-gray-400">
                        {missionType !== 'None' && (
                          <>
                            <span>{(0.8 * getMissionThrustData(missionType).twMin).toFixed(2)}</span>
                            <span>{(1.2 * getMissionThrustData(missionType).twMax).toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-cyan-400 text-center">
                      Current T/W: {result.thrustToWeight.toFixed(3)}
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      Position relative to typical {missionType !== 'None' ? `${missionType} mission` : 'generic'} envelope. Shaded region indicates typical range.
                    </p>
                  </div>
                </AeroCard>
                
                {/* Climb Performance Card (Expert only) */}
                {calculatorMode === 'Expert' && result.climbGradient !== undefined && result.rateOfClimb !== undefined && (
                  <AeroCard
                    title="Climb Performance"
                    description="Climb gradient and rate of climb at specified climb velocity"
                    icon={TrendingUp}
                  >
                    <div className="space-y-3">
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-sm text-gray-400 mb-1">Climb Gradient</p>
                        <p className="text-xs text-gray-500 mb-1">(γ = arcsin((T/W) - 1/(L/D)), climb angle)</p>
                        <p className="text-xl font-bold text-cyan-300">
                          {(result.climbGradient * 180 / Math.PI).toFixed(2)}°
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          ({result.climbGradient.toFixed(4)} rad)
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Steady-state climb angle. Used for: obstacle clearance, certification requirements, operational climb performance. Typical: 3-6° for normal category, higher for utility/acrobatic.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-sm text-gray-400 mb-1">Rate of Climb (ROC)</p>
                        <p className="text-xs text-gray-500 mb-1">(ROC = V_climb × sin(γ), vertical velocity)</p>
                        <p className="text-xl font-bold text-cyan-300">
                          {result.rateOfClimb.toFixed(2)} m/s
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          ({((result.rateOfClimb * 60) / 0.3048).toFixed(0)} ft/min)
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Vertical component of climb velocity. Reference condition: specified climb velocity (V_climb) and climb configuration. Used for: time-to-altitude, service ceiling estimation, operational planning.
                        </p>
                      </div>
                      
                      {result.climbWarning && (
                        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-400/30">
                          <p className="text-sm text-yellow-200 whitespace-pre-wrap leading-relaxed">
                            {result.climbWarning}
                          </p>
                        </div>
                      )}
                    </div>
                  </AeroCard>
                )}
                
                {/* Interpretation Card */}
                {calculatorMode !== 'Beginner' && (
                  <AeroCard
                    title="Engineering Interpretation"
                    icon={Info}
                  >
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {result.interpretation}
                      </p>
                    </div>
                  </AeroCard>
                )}
                
                {/* Step-by-Step Solution */}
                <AeroCard
                  title="Step-by-Step Solution"
                  icon={Info}
                >
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="steps" className="border-cyan-400/20">
                      <AccordionTrigger className="text-white hover:text-cyan-400">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-cyan-400" />
                          Show step-by-step solution
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <CalculationSteps steps={result.steps} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </AeroCard>
              </>
            ) : (
              <AeroCard title="Results" icon={Gauge}>
                <div className="text-center py-12">
                  <Gauge className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
                  <p className="text-gray-400">Enter values and click Calculate to see results</p>
                </div>
              </AeroCard>
            )}
          </div>
        </div>
      </ToolSection>

      {/* Wing Area Hint - Required for Graphs */}
      {!designSession?.wingAreaM2 && (
        <ToolSection>
          <div className="px-4 py-2">
            <InlineInterlinkHint requiredFields={[FIELD_KEYS.wingAreaM2]} sourceTool="wingloading" />
          </div>
        </ToolSection>
      )}

      {/* Engineering Graphs - Full Width Section Below */}
      {(() => {
        const hasWingData = designSession?.wingAreaM2 && designSession?.weightN;
        const showBasicGraphs = result && hasWingData;
        const showAdvancedGraphs = hasWingData && (calculatorMode === 'University' || calculatorMode === 'Expert');
        
        if (!showBasicGraphs) return null;
        
        return (
          <div className="mt-8 px-4 space-y-8">
            <ThrustLoadingGraphs
              currentTW={result.thrustToWeight}
              currentROC={result.rateOfClimb}
              vClimb={calculatorMode === 'Expert' && vClimb ? parseFloat(vClimb) : undefined}
              ldClimb={calculatorMode === 'Expert' && ldClimb ? parseFloat(ldClimb) : undefined}
              missionThrustData={missionThrustData}
              missionType={missionType}
              calculatorMode={calculatorMode}
            />
            
            {/* Wing Loading Graphs (University and Expert modes) */}
            {showAdvancedGraphs && (
            <WingLoadingGraphs
              currentWsKgm2={designSession?.wingLoadingKgm2 ?? 0}
              currentVsMs={designSession?.stallSpeedMs ?? 0}
              currentVsKts={designSession?.stallSpeedKts ?? 0}
              weightN={designSession?.weightN ?? 0}
              wingAreaM2={designSession?.wingAreaM2 ?? 0}
              airDensity={designSession?.densityKgM3 ?? 1.225}
              clMax={designSession?.clMaxUsed ?? 1.8}
              missionType={designSession?.missionType ?? missionType}
              missionData={missionWingLoadingData}
              airDensityMode="preset"
              airDensityPreset="ISA Sea Level"
              airDensityAltitude={undefined}
            />
          )}
          
          {/* T/W vs W/S Sizing Diagram (Expert mode only) */}
          {calculatorMode === 'Expert' && (() => {
            // Parse cruise inputs
            const cd0 = parseFloat(cd0Input);
            const k = parseFloat(kInput);
            const vCruiseKt = parseFloat(vCruiseInput);
            const vCruiseMs = Number.isFinite(vCruiseKt) ? vCruiseKt * 0.514444 : NaN;
            
            // Parse takeoff inputs
            const runwayLengthMeters = parseFloat(runwayLengthInput);
            const clTo = parseFloat(clToInput);
            const muRoll = parseFloat(muRollInput);
            
            const runwayLengthValid =
              Number.isFinite(runwayLengthMeters) && runwayLengthMeters > 0;
            const clToValid =
              Number.isFinite(clTo) && clTo > 0;
            const muRollValid =
              Number.isFinite(muRoll) && muRoll >= 0 && muRoll < 0.3; // simple sanity bound
            
            // Get density: prefer designSession, fallback to ISA sea level
            const rho = designSession?.densityKgM3 && designSession.densityKgM3 > 0
              ? designSession.densityKgM3
              : 1.225;
            
            return (
              <div className="w-full pb-12 mb-6 overflow-x-auto">
                <div className="min-w-[640px]">
                  <ThrustWingSizingDiagram
                    wingLoadingKgm2={designSession.wingLoadingKgm2}
                    thrustToWeight={result.thrustToWeight}
                    ldClimb={ldClimb ? parseFloat(ldClimb) : designSession.ldClimb}
                    gammaReq={gammaReqPercent ? parseFloat(gammaReqPercent) / 100 : 0.03}
                    calculatorMode={calculatorMode}
                    cd0={Number.isFinite(cd0) && cd0 > 0 ? cd0 : undefined}
                    k={Number.isFinite(k) && k > 0 ? k : undefined}
                    vCruiseMs={Number.isFinite(vCruiseMs) && vCruiseMs > 0 ? vCruiseMs : undefined}
                    densityKgM3={rho}
                    stallSpeedMs={designSession.stallSpeedMs}
                    clMaxUsed={designSession.clMaxUsed}
                    takeoffRunwayMeters={
                      runwayLengthValid ? runwayLengthMeters : undefined
                    }
                    clTo={clToValid ? clTo : undefined}
                    muRoll={muRollValid ? muRoll : undefined}
                  />
                </div>
              </div>
            );
          })()}

          {/* University-level help – only rendered in University mode */}
          {calculatorMode === 'University' && (
            <AeroCard
              title="How to use the T/W–W/S diagram"
              description="University-level guidance for reading the sizing plot."
              icon={Info}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-300">
                  Need a quick refresher on how to interpret this diagram?
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUniHelp((prev) => !prev)}
                >
                  {showUniHelp ? 'Hide help' : 'Show help'}
                </Button>
              </div>

              {showUniHelp && (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs text-slate-200">
                  <div>
                    <p className="font-semibold text-slate-100">
                      What this diagram shows
                    </p>
                    <p className="mt-1 text-slate-300">
                      This plot compares wing loading (W/S) and thrust loading (T/W) for your aircraft
                      against basic performance constraints: stall, climb, cruise and takeoff.
                      It helps you see whether your current design point is realistic.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-100">
                      Axes
                    </p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-slate-300">
                      <li>
                        <span className="font-medium text-slate-100">X-axis (W/S, kg/m²):</span>{' '}
                        Wing loading. Higher W/S means a smaller wing, higher stall speed, and usually
                        better cruise. Lower W/S means a larger wing, safer stall/takeoff, but more drag.
                      </li>
                      <li>
                        <span className="font-medium text-slate-100">Y-axis (T/W):</span>{' '}
                        Thrust loading. Higher T/W helps climb and takeoff, but costs mass and fuel.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-100">
                      Main curves
                    </p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-slate-300">
                      <li>
                        <span className="font-medium text-slate-100">Climb line:</span>{' '}
                        Minimum T/W required to meet the chosen climb gradient.
                      </li>
                      <li>
                        <span className="font-medium text-slate-100">Cruise curve:</span>{' '}
                        T/W required at each W/S to balance drag at the selected cruise speed.
                      </li>
                      <li>
                        <span className="font-medium text-slate-100">Takeoff curve:</span>{' '}
                        T/W required to meet the runway length with the given C<sub>L,TO</sub> and rolling friction.
                      </li>
                      <li>
                        <span className="font-medium text-slate-100">Stall limit line:</span>{' '}
                        Maximum wing loading allowed from stall/landing constraints.
                      </li>
                      <li>
                        <span className="font-medium text-slate-100">Dashed envelope:</span>{' '}
                        The combined minimum T/W from all active constraints.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-100">
                      Your design point
                    </p>
                    <p className="mt-1 text-slate-300">
                      The colored point on the diagram is your aircraft design (current W/S and T/W).
                      The summary text below the plot reports how much T/W margin you have above the
                      combined requirement and which constraint is most limiting.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-100">
                      How to use this in a report
                    </p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-slate-300">
                      <li>
                        Show that your design point lies in the feasible region (above the dashed line and left of the stall limit).
                      </li>
                      <li>
                        Identify which constraint is driving T/W (climb, cruise, or takeoff).
                      </li>
                      <li>
                        Justify any design changes (wing area, thrust, runway requirement) using movement on this plot.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </AeroCard>
          )}

          {/* Expert-level help – only rendered in Expert mode */}
          {calculatorMode === 'Expert' && (
            <AeroCard
              title="Expert Guide: T/W–W/S Sizing Diagram"
              description="Interpret constraints and margins like a sizing engineer."
              icon={Info}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-300">
                  Need a deeper explanation of what this sizing plot is telling you?
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowExpertHelp((prev) => !prev)}
                >
                  {showExpertHelp ? 'Hide help' : 'Show help'}
                </Button>
              </div>

              {showExpertHelp && (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 text-xs text-slate-200">
                  <div>
                    <p className="font-semibold text-slate-100">
                      Purpose
                    </p>
                    <p className="mt-1 text-slate-300">
                      This diagram shows which combinations of thrust loading (T/W) and wing loading (W/S)
                      allow the aircraft to meet the selected performance requirements. Your current design
                      is evaluated against these constraints.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-100">
                      Axes
                    </p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-slate-300">
                      <li>
                        <span className="font-medium text-slate-100">X-axis (W/S, kg/m²):</span>{' '}
                        Wing loading. Higher W/S → smaller wing, higher stall and takeoff speed,
                        but faster cruise. Lower W/S → larger wing, safer stall/takeoff, but more drag at cruise.
                      </li>
                      <li>
                        <span className="font-medium text-slate-100">Y-axis (T/W):</span>{' '}
                        Thrust loading. Higher T/W → stronger climb and takeoff but higher fuel burn and weight.
                        Lower T/W → efficient but may violate climb or takeoff constraints.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-100">
                      Curves and Lines
                    </p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-slate-300">
                      <li>
                        <span className="font-medium text-slate-100">Climb line:</span>{' '}
                        Horizontal line showing minimum T/W needed to achieve the specified climb gradient.
                      </li>
                      <li>
                        <span className="font-medium text-slate-100">Cruise curve:</span>{' '}
                        U-shaped line showing T/W required to balance drag at the chosen cruise speed and drag polar.
                      </li>
                      <li>
                        <span className="font-medium text-slate-100">Takeoff curve:</span>{' '}
                        Rising line showing T/W required to meet the selected runway length, C<sub>L,TO</sub>
                        and rolling friction.
                      </li>
                      <li>
                        <span className="font-medium text-slate-100">Stall limit:</span>{' '}
                        Vertical line marking the maximum allowable wing loading from stall/landing constraints.
                        The shaded region to the right is not permitted with the current C<sub>L,max</sub>, density
                        and stall speed.
                      </li>
                      <li>
                        <span className="font-medium text-slate-100">Dashed envelope line:</span>{' '}
                        Combined required T/W. At each W/S it represents the maximum of all active constraints
                        (climb, cruise, takeoff).
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-100">
                      Design Point and Margin
                    </p>
                    <p className="mt-1 text-slate-300">
                      The colored point shows your current design (W/S, T/W). The text below the diagram reports:
                    </p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-slate-300">
                      <li>
                        Whether your T/W is above or below the combined requirement at the current W/S.
                      </li>
                      <li>
                        The margin or deficit in T/W (how much thrust loading you have above or below the minimum).
                      </li>
                      <li>
                        Which constraint is most limiting at that W/S (climb, cruise, or takeoff).
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-100">
                      Practical Design Insight
                    </p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-slate-300">
                      <li>
                        Moving the point <span className="font-medium">right</span> (higher W/S) tends to improve cruise
                        but makes stall and takeoff more demanding.
                      </li>
                      <li>
                        Moving the point <span className="font-medium">left</span> (lower W/S) makes stall and takeoff easier,
                        but increases drag and required T/W in cruise.
                      </li>
                      <li>
                        Increasing <span className="font-medium">T/W</span> helps climb and takeoff but usually costs mass
                        and efficiency.
                      </li>
                      <li>
                        Increasing <span className="font-medium">C<sub>L,max</sub></span> or C<sub>L,TO</sub> relaxes stall/takeoff
                        limits, at the cost of more high-lift complexity.
                      </li>
                    </ul>
                    <p className="mt-1 text-slate-300">
                      A good conceptual design usually sits just above the combined envelope with balanced margins,
                      rather than oversizing thrust or wing area.
                    </p>
                  </div>
                </div>
              )}
            </AeroCard>
          )}
          </div>
        );
      })()}
    </ToolWrapper>
  );
};

export default ThrustLoadingCalculator;