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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge, Plane, Info, TrendingUp, AlertTriangle, CheckCircle, Anchor, Settings2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
 */
function classifyThrustLoading(tw: number, missionType: MissionType): ThrustLoadingClass {
  const params = getMissionThrustData(missionType);
  const lowLimit = 0.8 * params.twMin;
  const highLimit = 1.2 * params.twMax;
  
  if (tw < lowLimit) return 'Very Low';
  if (tw < params.twMin) return 'Low';
  if (tw <= params.twMax) return 'Within';
  if (tw <= highLimit) return 'High';
  return 'Very High';
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
  rateOfClimb?: number
): { interpretation: string; climbWarning?: string } {
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
      if (twClass === 'Within' || twClass === 'High') {
        interpretation += "This T/W is typical for jet transports and fighters. ";
        interpretation += "The aircraft will have good takeoff performance and climb capability. ";
        interpretation += "Approach speeds will be higher than lighter aircraft, which is normal for this class. ";
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
  
  return { interpretation, climbWarning };
}

// ============================================================================
// MAIN COMPONENT - BATCH 5: State & Handlers
// ============================================================================

const ThrustLoadingCalculator = () => {
  const { toast } = useToast();
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  
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
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [lastPayload, setLastPayload] = useState<any | null>(null);
  
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
      ldClimb
    };
    localStorage.setItem("thrustLoadingCalc_state", JSON.stringify(state));
  }, [unitSystem, calculatorMode, aircraftPreset, missionType, weightMode, massKg, weightN, thrustMode, totalThrust, perEngineThrust, numEngines, thrustUnit, calculationMode, targetTW, engineType, vClimb, ldClimb]);
  
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
        } else {
          const perEngineInput = parseFloat(perEngineThrust);
          const numEnginesInput = parseInt(numEngines);
          if (isNaN(perEngineInput) || perEngineInput <= 0) {
            toast({ title: "Invalid Input", description: "Per-engine thrust must be a positive number", variant: "destructive" });
            return;
          }
          if (isNaN(numEnginesInput) || numEnginesInput <= 0) {
            toast({ title: "Invalid Input", description: "Number of engines must be a positive integer", variant: "destructive" });
            return;
          }
          perEngineThrustNSI = convertThrustToSI(perEngineInput, thrustUnit);
          totalThrustNSI = perEngineThrustNSI * numEnginesInput;
        }
      } else {
        // Compute required thrust from target T/W
        const targetTWInput = parseFloat(targetTW);
        if (isNaN(targetTWInput) || targetTWInput <= 0) {
          toast({ title: "Invalid Input", description: "Target T/W must be a positive number", variant: "destructive" });
          return;
        }
        totalThrustNSI = calculateRequiredThrust(targetTWInput, finalWeightN);
        const numEnginesInput = parseInt(numEngines) || 1;
        perEngineThrustNSI = totalThrustNSI / numEnginesInput;
      }
      
      // Calculate T/W
      const tw = calculateThrustToWeight(totalThrustNSI, finalWeightN);
      
      // Classify
      const twClass = classifyThrustLoading(tw, missionType);
      
      // Climb performance (Expert mode only)
      let climbGradient: number | undefined;
      let rateOfClimb: number | undefined;
      let climbWarning: string | undefined;
      
      if (calculatorMode === 'Expert' && vClimb && ldClimb) {
        const vClimbInput = parseFloat(vClimb);
        const ldClimbInput = parseFloat(ldClimb);
        if (!isNaN(vClimbInput) && vClimbInput > 0 && !isNaN(ldClimbInput) && ldClimbInput > 0) {
          climbGradient = calculateClimbGradient(tw, ldClimbInput);
          rateOfClimb = calculateRateOfClimb(vClimbInput, climbGradient);
        }
      }
      
      // Generate interpretation
      const { interpretation, climbWarning: cw } = generateInterpretation(
        missionType,
        twClass,
        tw,
        climbGradient,
        rateOfClimb
      );
      climbWarning = cw;
      
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
              description="Enter either mass (kg) or weight (N)"
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
                <AeroFormField label={`Aircraft Mass (${inputUnits.mass})`} helperText={`Enter mass in ${inputUnits.mass}`}>
                  <Input
                    type="number"
                    step="0.01"
                    value={massKg}
                    onChange={(e) => setMassKg(e.target.value)}
                    className="bg-slate-900/50 border-cyan-400/30"
                    placeholder={`e.g., ${unitSystem === 'SI' ? '10000' : '22046'}`}
                  />
                </AeroFormField>
              ) : (
                <AeroFormField label={`Aircraft Weight (${inputUnits.weight})`} helperText={`Enter weight in ${inputUnits.weight}`}>
                  <Input
                    type="number"
                    step="0.01"
                    value={weightN}
                    onChange={(e) => setWeightN(e.target.value)}
                    className="bg-slate-900/50 border-cyan-400/30"
                    placeholder={`e.g., ${unitSystem === 'SI' ? '98100' : '22046'}`}
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
                  <AeroFormField label="Target T/W" helperText="Desired thrust-to-weight ratio">
                    <Input
                      type="number"
                      step="0.001"
                      value={targetTW}
                      onChange={(e) => setTargetTW(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder="e.g., 0.25"
                    />
                  </AeroFormField>
                )}
              </AeroCard>
            )}

            {/* Thrust Input */}
            {calculationMode === 'computeTW' && (
              <AeroCard
                title="Thrust"
                description="Enter total thrust or per-engine thrust × number of engines"
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
                  <AeroFormField label={`Total Thrust (${thrustUnit})`} helperText={`Enter total installed thrust in ${thrustUnit}`}>
                    <Input
                      type="number"
                      step="0.01"
                      value={totalThrust}
                      onChange={(e) => setTotalThrust(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder={`e.g., ${thrustUnit === 'N' ? '16000' : thrustUnit === 'kgf' ? '1600' : '3600'}`}
                    />
                  </AeroFormField>
                ) : (
                  <>
                    <AeroFormField label={`Per-Engine Thrust (${thrustUnit})`} helperText={`Enter thrust per engine in ${thrustUnit}`}>
                      <Input
                        type="number"
                        step="0.01"
                        value={perEngineThrust}
                        onChange={(e) => setPerEngineThrust(e.target.value)}
                        className="bg-slate-900/50 border-cyan-400/30"
                        placeholder={`e.g., ${thrustUnit === 'N' ? '8000' : thrustUnit === 'kgf' ? '800' : '1800'}`}
                      />
                    </AeroFormField>
                    <AeroFormField label="Number of Engines" helperText="Enter number of engines">
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
                <AeroFormField label="Engine Type">
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
                
                <AeroFormField label="Climb Velocity (V_climb, m/s)" helperText="Velocity during climb phase">
                  <Input
                    type="number"
                    step="0.1"
                    value={vClimb}
                    onChange={(e) => setVClimb(e.target.value)}
                    className="bg-slate-900/50 border-cyan-400/30"
                    placeholder="e.g., 25.0"
                  />
                </AeroFormField>
                
                <AeroFormField label="Lift-to-Drag Ratio (L/D_climb)" helperText="L/D during climb phase">
                  <Input
                    type="number"
                    step="0.1"
                    value={ldClimb}
                    onChange={(e) => setLdClimb(e.target.value)}
                    className="bg-slate-900/50 border-cyan-400/30"
                    placeholder="e.g., 12.0"
                  />
                </AeroFormField>
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
                      <p className="text-3xl font-bold text-cyan-400">
                        {result.thrustToWeight.toFixed(3)}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-lg border border-green-400/30">
                      <p className="text-sm text-gray-400 mb-1">Total Thrust</p>
                      <p className="text-2xl font-bold text-green-400">
                        {convertThrustFromSI(result.totalThrustN, outputUnits.thrust === 'lbf' ? 'lbf' : outputUnits.thrust === 'kgf' ? 'kgf' : 'N').toFixed(0)} {outputUnits.thrust}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        ({result.totalThrustN.toFixed(0)} N)
                      </p>
                    </div>
                    
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <p className="text-sm text-gray-400 mb-1">Per-Engine Thrust</p>
                      <p className="text-xl font-bold text-cyan-300">
                        {convertThrustFromSI(result.perEngineThrustN, outputUnits.thrust === 'lbf' ? 'lbf' : outputUnits.thrust === 'kgf' ? 'kgf' : 'N').toFixed(0)} {outputUnits.thrust}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        ({result.perEngineThrustN.toFixed(0)} N)
                      </p>
                    </div>
                    
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <p className="text-sm text-gray-400 mb-1">T/W Classification</p>
                      <p className={`text-xl font-bold ${getClassificationColor(result.twClass)}`}>
                        {result.twClass}
                      </p>
                    </div>
                  </div>
                </AeroCard>
                
                {/* Mission Thrust Envelope Card */}
                <AeroCard
                  title="Mission Thrust Envelope"
                  icon={TrendingUp}
                >
                  <div className="space-y-3">
                    <p className="text-sm text-gray-300">
                      Typical <span className="text-cyan-400 font-semibold">{missionType}</span> T/W:{" "}
                      <span className="text-cyan-400">
                        {missionType !== 'None' ? `${getMissionThrustData(missionType).twMin.toFixed(2)}–${getMissionThrustData(missionType).twMax.toFixed(2)}` : 'N/A (Manual mode)'}
                      </span>
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
                      Current: {result.thrustToWeight.toFixed(3)}
                    </p>
                  </div>
                </AeroCard>
                
                {/* Climb Performance Card (Expert only) */}
                {calculatorMode === 'Expert' && result.climbGradient !== undefined && result.rateOfClimb !== undefined && (
                  <AeroCard
                    title="Climb Performance"
                    icon={TrendingUp}
                  >
                    <div className="space-y-3">
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-sm text-gray-400 mb-1">Climb Gradient</p>
                        <p className="text-xl font-bold text-cyan-300">
                          {(result.climbGradient * 180 / Math.PI).toFixed(2)}°
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          ({result.climbGradient.toFixed(4)} rad)
                        </p>
                      </div>
                      
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-sm text-gray-400 mb-1">Rate of Climb (ROC)</p>
                        <p className="text-xl font-bold text-cyan-300">
                          {result.rateOfClimb.toFixed(2)} m/s
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          ({((result.rateOfClimb * 60) / 0.3048).toFixed(0)} ft/min)
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
    </ToolWrapper>
  );
};

export default ThrustLoadingCalculator;
