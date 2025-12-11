"use client";

/**
 * Wing Loading Calculator - Engineering-Grade
 * 
 * Calculates wing loading (W/S) and stall speed with mission-specific classification
 * and engineering interpretations.
 * 
 * Features:
 * - Aircraft presets (Cessna 172, ASK 21, STOL bush plane, light jet trainer, MALE UAV)
 * - Mission type selection (UAV, Trainer, STOL, Glider, Jet)
 * - Mass/Weight input toggle
 * - Air density presets (ISA Sea Level, 2000ft, 5000ft, 8000ft, 10000ft, 15000ft, Custom)
 * - Wing loading classification (Very Low, Low, Within, High, Very High)
 * - Stall speed classification (Low, Nominal, High)
 * - Engineering-grade interpretations with trade-offs
 * - Step-by-step solution display
 */

import { useState, useEffect, useMemo } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Gauge, Plane, Info, TrendingUp, AlertTriangle, CheckCircle, Wind, Anchor, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useToolContext } from "@/hooks/useToolContext";
import { useDesignSession } from "@/contexts/designSession";
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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { calculateISADensity, getPresetAltitude, feetToMeters, metersToFeet } from "./utils/isaAtmosphere";
import { 
  UnitSystem,
  convertMassToSI,
  convertMassFromSI,
  convertWeightToSI,
  convertWeightFromSI,
  convertAreaToSI,
  convertAreaFromSI,
  convertAltitudeToSI,
  convertAltitudeFromSI,
  convertWingLoadingNm2FromSI,
  convertWingLoadingKgm2FromSI,
  convertVelocityFromSI,
  getInputUnits,
  getOutputUnits
} from "./utils/unitConversions";
import { WingLoadingGraphs } from "./WingLoadingGraphs";
import { InterlinkCard } from "./InterlinkCard";
import { InterlinkSourcesRow } from "./InterlinkSourcesRow";
import { InlineInterlinkHint } from "@/components/common/InterlinkCTA";
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
// TYPES & CONSTANTS
// ============================================================================

type MissionType = 'None' | 'UAV' | 'Trainer' | 'STOL' | 'Glider' | 'Jet';
type CalculatorMode = 'Beginner' | 'University' | 'Expert';
type WeightMode = 'mass' | 'weight';
type WingLoadingClass = 'Very Low' | 'Low' | 'Within' | 'High' | 'Very High';
type StallSpeedClass = 'Low' | 'Nominal' | 'High';
type AirDensityMode = 'preset' | 'altitude' | 'custom';
type AirDensityPreset = 'ISA Sea Level' | '2000 ft' | '5000 ft' | '8000 ft' | '10000 ft' | '15000 ft';
type AircraftPreset = 'none' | 'smallRCUAV' | 'cessna172' | 'ask21' | 'stolBush' | 'maleUAV' | 'narrowbodyAirliner' | 'highPerfJet';

interface AircraftPresetData {
  name: string;
  missionType: MissionType;
  mtowKg: number; // MTOW in kg (SI)
  wingAreaM2: number; // Wing area in m² (SI)
  description: string;
}

interface MissionParams {
  wsMinKg: number;
  wsMaxKg: number;
  clMax: number;
  vsMin: number; // m/s
  vsMax: number; // m/s
}

const missionData: Record<MissionType, MissionParams> = {
  None:    { wsMinKg: 30,  wsMaxKg: 100, clMax: 1.8, vsMin: 18, vsMax: 35 }, // Generic defaults
  UAV:     { wsMinKg: 10,  wsMaxKg: 60,  clMax: 1.6, vsMin: 12, vsMax: 25 },
  Trainer: { wsMinKg: 40,  wsMaxKg: 80,  clMax: 2.2, vsMin: 20, vsMax: 30 },
  STOL:    { wsMinKg: 20,  wsMaxKg: 60,  clMax: 3.0, vsMin: 15, vsMax: 25 },
  Glider:  { wsMinKg: 25,  wsMaxKg: 55,  clMax: 1.6, vsMin: 18, vsMax: 30 },
  Jet:     { wsMinKg: 200, wsMaxKg: 800, clMax: 2.0, vsMin: 40, vsMax: 70 }
};

const GRAVITY = 9.81; // m/s²
const KNOTS_TO_MS = 1.94384; // Conversion factor: 1 m/s = 1.94384 knots
const TRAINER_STALL_LIMIT_KTS = 61; // Typical limit for normal category trainer certification

// Aircraft presets with realistic MTOW and wing area values
const AIRCRAFT_PRESETS: Record<Exclude<AircraftPreset, 'none'>, AircraftPresetData> = {
  smallRCUAV: {
    name: 'Small RC / Edu UAV',
    missionType: 'UAV',
    mtowKg: 2.5, // kg (5.5 lb) - very small educational UAV
    wingAreaM2: 0.5, // m² (5.4 ft²)
    description: 'Small educational/RC UAV, W/S ~5 kg/m² (very low)'
  },
  cessna172: {
    name: 'Cessna 172 Skyhawk',
    missionType: 'Trainer',
    mtowKg: 1157, // kg (2550 lb)
    wingAreaM2: 16.2, // m² (174.5 ft²)
    description: 'Popular trainer aircraft, W/S ~71 kg/m²'
  },
  ask21: {
    name: 'ASK 21',
    missionType: 'Glider',
    mtowKg: 600, // kg (1323 lb)
    wingAreaM2: 17.95, // m² (193.2 ft²) - per Wikipedia
    description: 'Two-seat training glider, W/S ~33 kg/m²'
  },
  stolBush: {
    name: 'Generic STOL Bush Plane',
    missionType: 'STOL',
    mtowKg: 680, // kg (1500 lb)
    wingAreaM2: 15.0, // m² (161.5 ft²) - adjusted for W/S ~45 kg/m²
    description: 'Short takeoff/landing utility aircraft, W/S ~45 kg/m²'
  },
  maleUAV: {
    name: 'MALE UAV Design Reference',
    missionType: 'UAV',
    mtowKg: 1020, // kg (2250 lb)
    wingAreaM2: 20.4, // m² (219.6 ft²) - adjusted for W/S ~50 kg/m²
    description: 'Typical design study, W/S ~50 kg/m²'
  },
  narrowbodyAirliner: {
    name: 'Narrowbody Airliner Reference',
    missionType: 'Jet',
    mtowKg: 78000, // kg (171,960 lb) - typical 737/A320 class
    wingAreaM2: 130.0, // m² (1399.3 ft²)
    description: 'Typical airliner wing loading, W/S ~600 kg/m²'
  },
  highPerfJet: {
    name: 'High-Performance Jet Reference',
    missionType: 'Jet',
    mtowKg: 18000, // kg (39,683 lb) - fighter/advanced trainer
    wingAreaM2: 20.0, // m² (215.3 ft²)
    description: 'High-performance jet, W/S ~900 kg/m²'
  }
};

// Example aircraft reference zones (approximate, for visual reference only)
const EXAMPLE_AIRCRAFT = {
  Trainer: { label: 'C172-type trainer', range: [60, 70] },
  Glider: { label: 'Club glider', range: [35, 50] },
  Jet: { label: 'Transport / regional jet', range: [300, 500] }
};

interface CalculationResult {
  weightN: number;
  wingLoadingNm2: number;
  wingLoadingKgm2: number;
  wingAreaM2: number;
  stallSpeedMs: number;
  stallSpeedKts: number;
  wsClass: WingLoadingClass;
  vsClass: StallSpeedClass;
  interpretation: string;
  steps: string[];
  regulatoryWarning?: string;
  mtowWingLoadingKgm2?: number;
  landingWingLoadingKgm2?: number;
}

// ============================================================================
// PHYSICS FUNCTIONS
// ============================================================================

/**
 * Convert mass to weight
 */
function massToWeight(massKg: number): number {
  return massKg * GRAVITY;
}

/**
 * Calculate wing loading in N/m²
 */
function calculateWingLoadingNm2(weightN: number, wingAreaM2: number): number {
  if (wingAreaM2 <= 0) throw new Error("Wing area must be positive");
  return weightN / wingAreaM2;
}

/**
 * Calculate wing loading in kg/m²
 */
function calculateWingLoadingKgm2(weightN: number, wingAreaM2: number): number {
  if (wingAreaM2 <= 0) throw new Error("Wing area must be positive");
  return weightN / (GRAVITY * wingAreaM2);
}

/**
 * Calculate stall speed
 */
function calculateStallSpeed(weightN: number, wingAreaM2: number, airDensity: number, clMax: number): number {
  if (wingAreaM2 <= 0) throw new Error("Wing area must be positive");
  if (airDensity <= 0) throw new Error("Air density must be positive");
  if (clMax <= 0) throw new Error("CL,max must be positive");
  
  const term = (2 * weightN) / (airDensity * wingAreaM2 * clMax);
  if (term < 0) throw new Error("Cannot calculate stall speed: negative value under square root");
  
  return Math.sqrt(term);
}

/**
 * Convert m/s to knots
 */
function msToKnots(ms: number): number {
  return ms * KNOTS_TO_MS;
}

// ============================================================================
// CLASSIFICATION FUNCTIONS
// ============================================================================

// Helper to get mission data, using Trainer as default for 'None'
function getMissionData(missionType: MissionType): MissionParams {
  if (missionType === 'None') {
    return missionData['Trainer']; // Use Trainer as default for calculations
  }
  return missionData[missionType];
}

/**
 * Classify wing loading based on mission type
 */
function classifyWingLoading(wsKgm2: number, missionType: MissionType): WingLoadingClass {
  const params = getMissionData(missionType);
  const lowLimit = 0.8 * params.wsMinKg;
  const highLimit = 1.2 * params.wsMaxKg;
  
  if (wsKgm2 < lowLimit) return 'Very Low';
  if (wsKgm2 < params.wsMinKg) return 'Low';
  if (wsKgm2 <= params.wsMaxKg) return 'Within';
  if (wsKgm2 <= highLimit) return 'High';
  return 'Very High';
}

/**
 * Classify stall speed based on mission type
 */
function classifyStallSpeed(vsMs: number, missionType: MissionType): StallSpeedClass {
  const params = getMissionData(missionType);
  
  if (vsMs < params.vsMin) return 'Low';
  if (vsMs <= params.vsMax) return 'Nominal';
  return 'High';
}

// ============================================================================
// INTERPRETATION FUNCTION
// ============================================================================

/**
 * Generate engineering interpretation based on mission type and classifications
 */
function generateInterpretation(
  missionType: MissionType,
  wsClass: WingLoadingClass,
  vsClass: StallSpeedClass,
  wsKgm2: number,
  vsMs: number,
  vsKts: number,
  clMax: number,
  clMaxIsOverridden: boolean = false
): { interpretation: string; regulatoryWarning?: string } {
  const params = getMissionData(missionType);
  let interpretation = "";
  let regulatoryWarning: string | undefined;
  
  // Regulatory check for Trainer mission
  if (missionType === 'Trainer' && vsKts > TRAINER_STALL_LIMIT_KTS) {
    regulatoryWarning = `⚠️ Stall speed (${vsKts.toFixed(1)} kts) exceeds typical ${TRAINER_STALL_LIMIT_KTS} kt limit used for normal category trainer certification. This may be unsuitable for a basic trainer role.`;
    interpretation += regulatoryWarning + "\n\n";
  } else if (missionType === 'Trainer' && vsKts < TRAINER_STALL_LIMIT_KTS - 5) {
    interpretation += "✓ Stall speed is compatible with typical trainer certification limits. ";
  }
  
  // Check for unrealistic CLmax
  if (clMaxIsOverridden && clMax > 3.5) {
    interpretation += "⚠️ Note: The specified CL,max is very high and may be unrealistic without exceptional high-lift devices. ";
  }
  
  // Base interpretation by mission type
  switch (missionType) {
    case 'UAV':
      if (wsClass === 'Very Low' || wsClass === 'Low') {
        interpretation += "This wing loading is well-suited for surveillance and loiter operations. ";
        interpretation += "The low wing loading provides excellent low-speed maneuverability and extended endurance. ";
        interpretation += "However, cruise speeds will be limited, and the aircraft will be more sensitive to turbulence. ";
      } else if (wsClass === 'Within') {
        interpretation += "This wing loading falls within typical UAV ranges. ";
        interpretation += "It offers a balanced compromise between low-speed performance and cruise efficiency. ";
        interpretation += "Stall behavior should be manageable with appropriate control systems. ";
      } else if (wsClass === 'High' || wsClass === 'Very High') {
        interpretation += "This wing loading is more suitable for fast dash missions rather than loiter. ";
        interpretation += "Higher cruise speeds are achievable, but low-speed handling and endurance will be reduced. ";
        interpretation += "Consider this configuration for aggressive mission profiles requiring rapid transit. ";
      }
      break;
      
    case 'Trainer':
      if (wsClass === 'Within') {
        interpretation += "This wing loading is ideal for primary training aircraft. ";
        interpretation += "It provides balanced handling characteristics with forgiving stall behavior. ";
        interpretation += "Takeoff and landing distances will be reasonable, and the aircraft will be stable for student pilots. ";
      } else if (wsClass === 'Very High' || wsClass === 'High') {
        interpretation += "This wing loading is higher than typical for primary trainers. ";
        interpretation += "The aircraft will behave more like a fast tourer or light GA aircraft. ";
        interpretation += "While still flyable, it may be less forgiving for primary training, with higher approach speeds and longer landing distances. ";
      } else if (wsClass === 'Very Low' || wsClass === 'Low') {
        interpretation += "This wing loading is very forgiving but comes with reduced cruise performance. ";
        interpretation += "Excellent for initial training, but students may not experience realistic cruise flight characteristics. ";
        interpretation += "Takeoff and landing will be very short, which is beneficial for training. ";
      }
      break;
      
    case 'STOL':
      if (wsClass === 'High' || wsClass === 'Very High') {
        interpretation += "⚠️ This wing loading is much higher than typical for STOL aircraft and defeats the STOL intent unless very high CL,max and higher stall speeds are acceptable. ";
        interpretation += "STOL aircraft typically require low wing loading for short takeoff and landing distances. ";
        interpretation += "With this configuration, you'll need exceptional high-lift devices (flaps, slats) to maintain STOL performance. ";
        if (clMaxIsOverridden && clMax < 2.5) {
          interpretation += "The current CL,max may be insufficient to compensate for the high wing loading. ";
        }
      } else if (wsClass === 'Within' || wsClass === 'Low') {
        interpretation += "This wing loading is appropriate for STOL operations. ";
        interpretation += "Short takeoff and landing distances are achievable with the specified CL,max. ";
        interpretation += "The aircraft will have good low-speed handling and maneuverability. ";
      } else {
        interpretation += "Very low wing loading provides exceptional STOL performance. ";
        interpretation += "Takeoff and landing distances will be minimal, but cruise performance will be limited. ";
      }
      break;
      
    case 'Glider':
      if (wsClass === 'Within') {
        interpretation += "This wing loading is typical for club gliders. ";
        interpretation += "It provides a good balance between thermal performance and cruise efficiency. ";
        interpretation += "Sink rate will be moderate, allowing for effective thermal climbing. ";
      } else if (wsClass === 'High' && wsKgm2 <= params.wsMaxKg * 1.2) {
        interpretation += "Higher wing loading within the glider range improves cruise speed between thermals. ";
        interpretation += "However, sink rate will be higher, requiring stronger thermals for sustained flight. ";
        interpretation += "This configuration is better suited for cross-country gliding. ";
      } else if (wsClass === 'Very Low') {
        interpretation += "Very low wing loading is overly draggy and not realistic for performance gliders. ";
        interpretation += "While sink rate will be low, cruise performance will be poor. ";
        interpretation += "This configuration is more typical of training gliders. ";
      }
      break;
      
    case 'Jet':
      if (wsClass === 'Very Low') {
        interpretation += "This wing loading is unusually low for a jet aircraft. ";
        interpretation += "It's closer to turboprop or trainer regimes. ";
        interpretation += "While it provides excellent low-speed handling, it may not be optimal for typical jet mission profiles. ";
      } else if (wsClass === 'Within' || wsClass === 'High') {
        interpretation += "This wing loading is typical for jet transports and fighters. ";
        interpretation += "Higher approach speeds are normal for this class of aircraft. ";
        interpretation += "The configuration provides good cruise efficiency and smooth ride in turbulence. ";
        interpretation += "Takeoff and landing distances will be longer than lighter aircraft, which is expected. ";
      } else if (wsClass === 'Very High') {
        interpretation += "Very high wing loading is characteristic of high-performance military jets. ";
        interpretation += "This configuration prioritizes high-speed cruise and maneuverability. ";
        interpretation += "Approach speeds will be high, and the aircraft will be demanding near stall. ";
      }
      break;
  }
  
  // Add stall speed interpretation
  if (vsClass === 'Low') {
    interpretation += "\n\nStall Speed: The calculated stall speed is below typical for this mission type. ";
    interpretation += "This indicates very forgiving stall characteristics, which is beneficial for safety. ";
  } else if (vsClass === 'Nominal') {
    interpretation += "\n\nStall Speed: The calculated stall speed falls within the expected range for this mission type. ";
    interpretation += "This is appropriate for the specified wing loading and CL,max. ";
  } else if (vsClass === 'High') {
    interpretation += "\n\nStall Speed: The calculated stall speed is above typical for this mission type. ";
    interpretation += "This will result in higher approach speeds and longer landing distances. ";
    interpretation += "Pilot workload will be higher, especially during approach and landing phases. ";
  }
  
  // Add runway/field suitability
  if ((wsClass === 'Very Low' || wsClass === 'Low') && vsClass === 'Low') {
    interpretation += "\n\nRunway Suitability: This configuration suggests operations from relatively short or unprepared airstrips may be feasible (subject to detailed performance analysis). ";
  } else if ((wsClass === 'High' || wsClass === 'Very High') && vsClass === 'High') {
    interpretation += "\n\nRunway Suitability: This configuration is more suited to paved or longer runways typical of larger aerodromes. ";
  }
  
  // Add trade-offs summary
  interpretation += "\n\nTrade-offs Summary:\n";
  if (wsClass === 'Very Low' || wsClass === 'Low') {
    interpretation += "✓ Short takeoff/landing distances\n";
    interpretation += "✓ Good low-speed maneuverability\n";
    interpretation += "✓ Softer stall behavior\n";
    interpretation += "✗ Larger wing area → higher drag\n";
    interpretation += "✗ Lower cruise speed\n";
    interpretation += "✗ More sensitive to turbulence\n";
  } else if (wsClass === 'High' || wsClass === 'Very High') {
    interpretation += "✓ Smoother ride in turbulence\n";
    interpretation += "✓ Higher cruise speed for same CL\n";
    interpretation += "✗ Higher stall speed\n";
    interpretation += "✗ Longer takeoff/landing distances\n";
    interpretation += "✗ More demanding near stall\n";
  } else {
    interpretation += "✓ Balanced performance characteristics\n";
    interpretation += "✓ Reasonable takeoff/landing distances\n";
    interpretation += "✓ Moderate cruise performance\n";
  }
  
  return { interpretation, regulatoryWarning };
}

/**
 * Generate Best Use Case / Mission Fit recommendation
 */
function generateBestUseCase(
  missionType: MissionType,
  wsClass: WingLoadingClass,
  vsClass: StallSpeedClass,
  wsKgm2: number,
  vsMs: number,
  vsKts: number
): string {
  // If mission is None, provide general suggestions
  if (missionType === 'None') {
    if (wsClass === 'Very Low' || wsClass === 'Low') {
      if (vsClass === 'Low' || vsClass === 'Nominal') {
        return "This configuration is similar to STOL or slow UAV designs. Good for short takeoff/landing operations, training approach speeds, and low-speed surveillance missions.";
      } else {
        return "This configuration shows low wing loading but higher stall speed, suggesting a design optimized for low-speed operations with moderate approach speeds.";
      }
    } else if (wsClass === 'High' || wsClass === 'Very High') {
      if (vsClass === 'High') {
        return "This configuration is more suitable for Jet or high-speed cruise aircraft. Longer runway needed, typical of transport or regional jet designs.";
      } else {
        return "This configuration shows high wing loading with moderate stall speed, suggesting efficient cruise performance with reasonable approach characteristics.";
      }
    } else {
      // Within range
      if (vsClass === 'Low' || vsClass === 'Nominal') {
        return "This configuration is similar to Trainer or STOL aircraft. Balanced design suitable for training, utility, or general aviation applications.";
      } else {
        return "This configuration shows moderate wing loading with higher stall speed, typical of advanced trainers or light utility aircraft.";
      }
    }
  }
  
  // Mission-specific recommendations
  const params = getMissionData(missionType);
  const wsWithinRange = wsKgm2 >= params.wsMinKg && wsKgm2 <= params.wsMaxKg;
  const vsWithinRange = vsMs >= params.vsMin && vsMs <= params.vsMax;
  
  if (wsWithinRange && vsWithinRange) {
    return `Configuration aligns with ${missionType} standards. Wing loading and stall speed are within typical ranges for this mission type.`;
  }
  
  // Mismatch cases
  let mismatchReasons: string[] = [];
  if (!wsWithinRange) {
    if (wsKgm2 < params.wsMinKg) {
      mismatchReasons.push("wing loading is below typical range");
    } else {
      mismatchReasons.push("wing loading exceeds typical range");
    }
  }
  if (!vsWithinRange) {
    if (vsMs < params.vsMin) {
      mismatchReasons.push("stall speed is below typical range");
    } else {
      mismatchReasons.push("stall speed exceeds typical range");
    }
  }
  
  return `Not ideal for ${missionType} mission, due to ${mismatchReasons.join(' and ')}. Consider adjusting wing area, weight, or CL,max to better match ${missionType} requirements.`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const WingLoadingCalculator = () => {
  const { toast } = useToast();
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const { data: designSession, updateDesignSession } = useDesignSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [usedFromSession, setUsedFromSession] = useState(false);
  
  // Required fields for this calculator
  const requiredFields = ['massKg', 'weightN', 'missionType'];
  
  // Find available sources
  const sources = findSourceList(designSession, requiredFields);
  
  // Get reusable data with source tracking
  const { data: reusableData, sources: fieldSources } = getReusableDataWithSources(designSession, requiredFields);
  const hasReusable = hasReusableData(reusableData);
  
  // Track imported data
  const [importedFrom, setImportedFrom] = useState<{ sourceId: string; keys: string[] } | null>(null);
  const [previousValues, setPreviousValues] = useState<Record<string, unknown>>({});
  
  // State
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('SI');
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>('University');
  const [aircraftPreset, setAircraftPreset] = useState<AircraftPreset>('none');
  const [missionType, setMissionType] = useState<MissionType>('Trainer');
  const [weightMode, setWeightMode] = useState<WeightMode>('mass');
  const [massKg, setMassKg] = useState<string>("");
  const [weightN, setWeightN] = useState<string>("");
  const [wingAreaM2, setWingAreaM2] = useState<string>("");
  const [airDensityMode, setAirDensityMode] = useState<AirDensityMode>('preset');
  const [airDensityPreset, setAirDensityPreset] = useState<AirDensityPreset>('ISA Sea Level');
  const [airDensityAltitude, setAirDensityAltitude] = useState<string>("0");
  const [airDensityDeltaT, setAirDensityDeltaT] = useState<string>("0");
  const [airDensityCustom, setAirDensityCustom] = useState<string>("1.225");
  const [clMaxOverride, setClMaxOverride] = useState<string>("");
  const [useClMaxOverride, setUseClMaxOverride] = useState(false);
  const [mtow, setMtow] = useState<string>("");
  const [landingWeightFraction, setLandingWeightFraction] = useState<string>("0.7");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [lastPayload, setLastPayload] = useState<any | null>(null);
  
  // Handle return flow - redirect back after calculation if returnTo is present
  useEffect(() => {
    const returnTo = searchParams.get('returnTo');
    const referrer = searchParams.get('referrer');
    
    // Only redirect if we have a result AND returnTo param (user came from another calculator)
    if (returnTo && result && referrer && result.wingLoadingKgm2) {
      // After calculation completes and designSession is updated, redirect back
      const returnPath = `${returnTo}${returnTo.includes('?') ? '&' : '?'}importFrom=${referrer}`;
      // Small delay to ensure designSession is updated
      const timeoutId = setTimeout(() => {
        navigate(returnPath, { replace: true });
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [result, searchParams, navigate]);
  
  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("wingLoadingCalc_state");
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
        setWingAreaM2(state.wingAreaM2 || "");
        setAirDensityMode(state.airDensityMode || 'preset');
        setAirDensityPreset(state.airDensityPreset || 'ISA Sea Level');
        setAirDensityAltitude(state.airDensityAltitude || "0");
        setAirDensityDeltaT(state.airDensityDeltaT || "0");
        setAirDensityCustom(state.airDensityCustom || "1.225");
        setClMaxOverride(state.clMaxOverride || "");
        setUseClMaxOverride(state.useClMaxOverride || false);
        setMtow(state.mtow || "");
        setLandingWeightFraction(state.landingWeightFraction || "0.7");
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
      wingAreaM2,
      airDensityMode,
      airDensityPreset,
      airDensityAltitude,
      airDensityDeltaT,
      airDensityCustom,
      clMaxOverride,
      useClMaxOverride,
      mtow,
      landingWeightFraction
    };
    localStorage.setItem("wingLoadingCalc_state", JSON.stringify(state));
  }, [unitSystem, calculatorMode, aircraftPreset, missionType, weightMode, massKg, weightN, wingAreaM2, airDensityMode, airDensityPreset, airDensityAltitude, airDensityDeltaT, airDensityCustom, clMaxOverride, useClMaxOverride, mtow, landingWeightFraction]);
  
  // Handle aircraft preset selection
  const handleAircraftPresetChange = (preset: AircraftPreset) => {
    setAircraftPreset(preset);
    if (preset !== 'none') {
      const aircraft = AIRCRAFT_PRESETS[preset];
      // Only auto-change mission type if it's not set to 'None (Manual)'
      if (missionType !== 'None') {
        setMissionType(aircraft.missionType);
      }
      
      // Convert to display units
      const massDisplay = convertMassFromSI(aircraft.mtowKg, unitSystem);
      const areaDisplay = convertAreaFromSI(aircraft.wingAreaM2, unitSystem);
      
      setMassKg(massDisplay.toFixed(2));
      setWeightN(""); // Clear weight if in mass mode
      setWingAreaM2(areaDisplay.toFixed(2));
    }
  };
  
  // Get current air density
  const currentAirDensity = useMemo(() => {
    if (airDensityMode === 'custom') {
      const custom = parseFloat(airDensityCustom);
      return isNaN(custom) || custom <= 0 ? 1.225 : custom;
    } else if (airDensityMode === 'altitude') {
      const altitudeM = convertAltitudeToSI(parseFloat(airDensityAltitude) || 0, unitSystem);
      const deltaT = parseFloat(airDensityDeltaT) || 0;
      try {
        return calculateISADensity(altitudeM, deltaT);
      } catch (e) {
        return 1.225; // Fallback
      }
    } else {
      // Preset mode - map to altitude
      const preset = airDensityPreset;
      const altitudeM = getPresetAltitude(preset);
      return calculateISADensity(altitudeM, 0);
    }
  }, [airDensityMode, airDensityPreset, airDensityAltitude, airDensityDeltaT, airDensityCustom, unitSystem]);
  
  // Get CL,max for current mission type
  const currentClMax = useMemo(() => {
    const missionParams = getMissionData(missionType);
    if (useClMaxOverride && clMaxOverride) {
      const override = parseFloat(clMaxOverride);
      return isNaN(override) || override <= 0 ? missionParams.clMax : override;
    }
    return missionParams.clMax;
  }, [missionType, useClMaxOverride, clMaxOverride]);
  
  const clMaxIsOverridden = useClMaxOverride && clMaxOverride && parseFloat(clMaxOverride) > 0;
  
  // Get input/output units
  const inputUnits = useMemo(() => getInputUnits(unitSystem), [unitSystem]);
  const outputUnits = useMemo(() => getOutputUnits(unitSystem), [unitSystem]);
  
  // Calculate
  const handleCalculate = async () => {
    try {
      // Validate and convert inputs to SI
      const massInput = weightMode === 'mass' ? parseFloat(massKg) : null;
      const weightInput = weightMode === 'weight' ? parseFloat(weightN) : null;
      const areaInput = parseFloat(wingAreaM2);
      
      if (weightMode === 'mass' && (isNaN(massInput!) || massInput! <= 0)) {
        toast({ title: "Invalid Input", description: "Mass must be a positive number", variant: "destructive" });
        return;
      }
      if (weightMode === 'weight' && (isNaN(weightInput!) || weightInput! <= 0)) {
        toast({ title: "Invalid Input", description: "Weight must be a positive number", variant: "destructive" });
        return;
      }
      if (isNaN(areaInput) || areaInput <= 0) {
        toast({ title: "Invalid Input", description: "Wing area must be a positive number", variant: "destructive" });
        return;
      }

      // Convert to SI
      const massKgSI = weightMode === 'mass' ? convertMassToSI(massInput!, unitSystem) : null;
      const weightNSI = weightMode === 'weight' ? convertWeightToSI(weightInput!, unitSystem) : null;
      const areaM2SI = convertAreaToSI(areaInput, unitSystem);
      
      // Calculate weight in SI
      const finalWeightN = weightMode === 'mass' ? massToWeight(massKgSI!) : weightNSI!;
      
      // Calculate wing loading (always in SI internally)
      const wsNm2 = calculateWingLoadingNm2(finalWeightN, areaM2SI);
      const wsKgm2 = calculateWingLoadingKgm2(finalWeightN, areaM2SI);
      
      // Calculate stall speed
      const vsMs = calculateStallSpeed(finalWeightN, areaM2SI, currentAirDensity, currentClMax);
      const vsKts = msToKnots(vsMs);
      
      // Calculate MTOW and landing weight wing loadings if provided
      let mtowWingLoadingKgm2: number | undefined;
      let landingWingLoadingKgm2: number | undefined;
      if (mtow) {
        const mtowSI = weightMode === 'mass' 
          ? convertMassToSI(parseFloat(mtow), unitSystem)
          : convertWeightToSI(parseFloat(mtow), unitSystem);
        const mtowWeightN = weightMode === 'mass' ? massToWeight(mtowSI) : mtowSI;
        mtowWingLoadingKgm2 = calculateWingLoadingKgm2(mtowWeightN, areaM2SI);
        
        const landingFraction = parseFloat(landingWeightFraction) || 0.7;
        const landingWeightN = mtowWeightN * landingFraction;
        landingWingLoadingKgm2 = calculateWingLoadingKgm2(landingWeightN, areaM2SI);
      }
      
      // Classify
      const wsClass = classifyWingLoading(wsKgm2, missionType);
      const vsClass = classifyStallSpeed(vsMs, missionType);
      
      // Generate interpretation
      const { interpretation, regulatoryWarning } = generateInterpretation(
        missionType, 
        wsClass, 
        vsClass, 
        wsKgm2, 
        vsMs, 
        vsKts,
        currentClMax,
        clMaxIsOverridden
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
      
      steps.push(`**Step ${stepNum}: Compute W/S in N/m²**`);
      const areaDisplay = unitSystem === 'SI' ? areaM2SI.toFixed(2) : areaInput.toFixed(2);
      steps.push(`(W/S)_N = W / S = ${finalWeightN.toFixed(2)} N / ${areaDisplay} ${inputUnits.area} = ${wsNm2.toFixed(2)} N/m²`);
      stepNum++;
      
      steps.push(`**Step ${stepNum}: Convert to kg/m²**`);
      steps.push(`(W/S)_kg = W / (g × S) = ${finalWeightN.toFixed(2)} N / (${GRAVITY} m/s² × ${areaM2SI.toFixed(2)} m²) = ${wsKgm2.toFixed(2)} kg/m²`);
      stepNum++;
      
      steps.push(`**Step ${stepNum}: Compute stall speed**`);
      const clMaxLabel = clMaxIsOverridden ? "User-specified CL,max" : "Mission CL,max";
      steps.push(`Using ${clMaxLabel}: ${currentClMax.toFixed(2)}`);
      steps.push(`Air density: ${currentAirDensity.toFixed(3)} kg/m³${airDensityMode === 'altitude' ? ` (from altitude ${airDensityAltitude} ${inputUnits.altitude})` : ''}`);
      steps.push(`V_s = √[2W / (ρ × S × CL,max)] = √[2 × ${finalWeightN.toFixed(2)} N / (${currentAirDensity.toFixed(3)} kg/m³ × ${areaM2SI.toFixed(2)} m² × ${currentClMax.toFixed(2)})]`);
      steps.push(`V_s = ${vsMs.toFixed(2)} m/s = ${vsKts.toFixed(2)} knots`);
      stepNum++;
      
      steps.push(`**Step ${stepNum}: Compare against mission envelope**`);
      if (missionType !== 'None') {
        const params = getMissionData(missionType);
        steps.push(`Typical ${missionType} wing loading: ${params.wsMinKg}–${params.wsMaxKg} kg/m²`);
      } else {
        steps.push(`Manual mode: No mission-specific ranges applied`);
      }
      steps.push(`Current W/S: ${wsKgm2.toFixed(2)} kg/m² → Classification: ${wsClass}`);
      if (missionType !== 'None') {
        const params = getMissionData(missionType);
        steps.push(`Typical ${missionType} stall speed: ${params.vsMin}–${params.vsMax} m/s`);
      }
      steps.push(`Current V_s: ${vsMs.toFixed(2)} m/s → Classification: ${vsClass}`);
      
      const calculationResult: CalculationResult = {
        weightN: finalWeightN,
        wingLoadingNm2: wsNm2,
        wingLoadingKgm2: wsKgm2,
        wingAreaM2: areaM2SI,
        stallSpeedMs: vsMs,
        stallSpeedKts: vsKts,
        wsClass,
        vsClass,
        interpretation,
        steps,
        regulatoryWarning,
        mtowWingLoadingKgm2,
        landingWingLoadingKgm2
      };
      
      setResult(calculationResult);
      
      // Update design session after successful calculation
      if (Number.isFinite(finalWeightN) && Number.isFinite(areaM2SI) && Number.isFinite(wsKgm2) && Number.isFinite(vsMs)) {
        const massKgValue = weightMode === 'mass' ? massKgSI! : undefined;
        updateDesignSession({
          massKg: massKgValue,
          weightN: finalWeightN,
          wingAreaM2: areaM2SI,
          wingLoadingKgm2: wsKgm2,
          missionType: missionType !== 'None' ? missionType : undefined,
          densityKgM3: currentAirDensity,
          clMaxUsed: currentClMax,
          stallSpeedMs: vsMs,
          stallSpeedKts: vsKts,
        });
      }
      
      // Send calculation event
        const toolInputs = {
          unitSystem,
        missionType,
        weightMode,
        massKg: weightMode === 'mass' ? massInput : null,
        weightN: weightMode === 'weight' ? weightInput : null,
        wingAreaM2: areaInput,
        airDensityMode,
        airDensity: currentAirDensity,
        airDensityAltitude: airDensityMode === 'altitude' ? parseFloat(airDensityAltitude) : null,
        airDensityDeltaT: airDensityMode === 'altitude' ? parseFloat(airDensityDeltaT) : null,
        clMax: currentClMax,
        clMaxOverridden: clMaxIsOverridden,
        mtow: mtow ? parseFloat(mtow) : null,
        landingWeightFraction: mtow ? parseFloat(landingWeightFraction) : null
      };
      
        const toolResults = {
        wingLoadingNm2: wsNm2,
        wingLoadingKgm2: wsKgm2,
        stallSpeedMs: vsMs,
        stallSpeedKts: vsKts,
        wsClass,
        vsClass
      };
      
        const eventResponse = await sendCalculationEvent({
          toolId: "wing-loading-calculator",
          toolName: "Wing Loading Calculator",
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
          tool: "Wing Loading Calculator",
          inputs: toolInputs,
        results: toolResults
        });

        updateToolContext({
          tool: "Wing Loading Calculator",
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
    setWingAreaM2("");
    setResult(null);
    setAirDensityMode('preset');
    setAirDensityPreset('ISA Sea Level');
    setAirDensityAltitude("0");
    setAirDensityDeltaT("0");
    setAirDensityCustom("1.225");
    setClMaxOverride("");
    setUseClMaxOverride(false);
    setMtow("");
    setLandingWeightFraction("0.7");
  };
  
  // Get classification color
  const getClassificationColor = (wsClass: WingLoadingClass): string => {
    switch (wsClass) {
      case 'Very Low': return 'text-blue-400';
      case 'Low': return 'text-cyan-400';
      case 'Within': return 'text-green-400';
      case 'High': return 'text-yellow-400';
      case 'Very High': return 'text-orange-400';
    }
  };
  
  // Calculate position on mission envelope bar
  const getEnvelopePosition = (): number => {
    if (!result) return 0;
    if (missionType === 'None') return 50; // Fallback for None
    const params = getMissionData(missionType);
    const extendedMin = 0.8 * params.wsMinKg;
    const extendedMax = 1.2 * params.wsMaxKg;
    const extendedRange = extendedMax - extendedMin;
    
    if (extendedRange <= 0) return 50; // Fallback
    
    // Clamp to extended range
    const clamped = Math.max(extendedMin, Math.min(extendedMax, result.wingLoadingKgm2));
    const position = ((clamped - extendedMin) / extendedRange) * 100;
    return Math.max(0, Math.min(100, position));
  };
  
  // Calculate range bar position
  const getRangeBarPosition = (): { left: number; width: number } => {
    if (missionType === 'None') return { left: 40, width: 20 }; // Fallback for None
    const params = getMissionData(missionType);
    const extendedMin = 0.8 * params.wsMinKg;
    const extendedMax = 1.2 * params.wsMaxKg;
    const extendedRange = extendedMax - extendedMin;
    
    if (extendedRange <= 0) return { left: 0, width: 100 };
    
    const rangeMin = params.wsMinKg;
    const rangeMax = params.wsMaxKg;
    const left = ((rangeMin - extendedMin) / extendedRange) * 100;
    const width = ((rangeMax - rangeMin) / extendedRange) * 100;
    
    return { left: Math.max(0, left), width: Math.max(0, Math.min(100, width)) };
  };
  
  return (
    <ToolWrapper>
      <ToolHeader
        title="Wing Loading Calculator"
        description="Calculate wing loading and stall speed with mission-specific classification and engineering interpretations"
        icon={Plane}
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
                  toolName="Wing Loading Calculator"
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
            {/* Row 1: Calculator Mode and Mission Type side-by-side */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Mode Selector */}
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
                    {calculatorMode === 'Expert' && 'All features including advanced settings and ISA deviation.'}
                  </p>
                </div>
              </AeroCard>
              
              {/* Mission Type Selection */}
              <AeroCard
                title="Mission Type"
                description="Select aircraft mission type to auto-adapt CL,max and classification ranges"
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
                      <span className="text-cyan-400 font-semibold">CL,max:</span> {currentClMax.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      <span className="text-cyan-400 font-semibold">Typical W/S:</span> {getMissionData(missionType).wsMinKg}–{getMissionData(missionType).wsMaxKg} kg/m²
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      <span className="text-cyan-400 font-semibold">Typical V_s:</span> {getMissionData(missionType).vsMin}–{getMissionData(missionType).vsMax} m/s
                    </p>
                  </div>
                )}
                {missionType === 'None' && (
                  <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                    <p className="text-sm text-gray-300">
                      Mission-specific parameters will not auto-change. Use manual CL,max override if needed.
                    </p>
                  </div>
                )}
              </AeroCard>
            </div>
            
            {/* Interlink Sources Row */}
            {sources.length > 0 && (
              <InterlinkSourcesRow
                sources={sources}
                onSelectSource={(sourceId) => {
                  console.info('[Interlink] Selected source:', sourceId);
                }}
                compact={false}
              />
            )}

            {/* Interlink Card for reusable data - Show in all modes when data available */}
            {hasReusable && !usedFromSession && sources.length > 0 && (
              <InterlinkCard
                reusableData={reusableData}
                setters={{
                  setMassKg: (v) => setMassKg(String(v)),
                  setWeightN: (v) => setWeightN(String(v)),
                  setMissionType,
                  setUsedFromSession,
                }}
                sourceInfo={sources[0]}
                currentToolId="wing"
                getCurrentValues={() => ({
                  massKg,
                  weightN,
                  missionType,
                })}
                options={{
                  weightMode,
                  unitSystem,
                  onApplied: (keys, prevVals) => {
                    setImportedFrom({ sourceId: sources[0]?.id || 'unknown', keys });
                    setPreviousValues(prevVals);
                    setUsedFromSession(true);
                    
                    // Persist to localStorage
                    const state = {
                      unitSystem,
                      calculatorMode,
                      aircraftPreset,
                      missionType: reusableData.missionType || missionType,
                      weightMode,
                      massKg: reusableData.massKg?.toString() || massKg,
                      weightN: reusableData.weightN?.toString() || weightN,
                      wingAreaM2,
                      airDensityMode,
                      airDensityPreset,
                      airDensityAltitude,
                      airDensityDeltaT,
                      airDensityCustom,
                      clMaxOverride,
                      useClMaxOverride,
                      mtow,
                      landingWeightFraction,
                    };
                    localStorage.setItem("wingLoadingCalc_state", JSON.stringify(state));
                    console.info('[Interlink] Applied reused data to Wing Loading Calculator:', keys);
                  },
                  onUndo: (prevVals) => {
                    // Restore previous values
                    if (prevVals.massKg !== undefined) setMassKg(String(prevVals.massKg || ''));
                    if (prevVals.weightN !== undefined) setWeightN(String(prevVals.weightN || ''));
                    if (prevVals.missionType !== undefined) setMissionType(prevVals.missionType as MissionType);
                    setImportedFrom(null);
                    setPreviousValues({});
                    setUsedFromSession(false);
                    console.info('[Interlink] Undid imported data');
                  },
                }}
                showDismiss={true}
                imported={!!importedFrom}
                previousValues={previousValues}
              />
            )}


            {/* Imported badge */}
            {importedFrom && (
              <div className="mb-3 px-3 py-2 bg-emerald-400/10 border border-emerald-400/30 rounded-lg flex items-center justify-between">
                <span className="text-xs text-emerald-400">
                  ✓ Imported {importedFrom.keys.length} fields from {sources.find(s => s.id === importedFrom.sourceId)?.name || 'source'}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    // Restore previous values
                    if (previousValues.massKg !== undefined) setMassKg(String(previousValues.massKg || ''));
                    if (previousValues.weightN !== undefined) setWeightN(String(previousValues.weightN || ''));
                    if (previousValues.missionType !== undefined) setMissionType(previousValues.missionType as MissionType);
                    setImportedFrom(null);
                    setPreviousValues({});
                    setUsedFromSession(false);
                    console.info('[Interlink] Undid imported data');
                  }}
                  className="h-6 px-2 text-xs text-yellow-400 hover:bg-yellow-400/10"
                >
                  Undo
                </Button>
              </div>
            )}
            
            {/* Row 2: Aircraft Preset full-width */}
            <AeroCard
              title="Aircraft Preset"
              description="Select a real-world aircraft to auto-fill mission type, mass, and wing area"
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
                  <span className={`text-sm ${weightMode === 'mass' ? 'text-cyan-400' : 'text-gray-500'}`}>Mass (kg)</span>
                  <Switch
                    checked={weightMode === 'weight'}
                    onCheckedChange={(checked) => setWeightMode(checked ? 'weight' : 'mass')}
                  />
                  <span className={`text-sm ${weightMode === 'weight' ? 'text-cyan-400' : 'text-gray-500'}`}>Weight (N)</span>
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

            {/* Wing Area */}
            <AeroCard
              title="Wing Geometry"
              description="Enter wing area"
              icon={Gauge}
            >
              <AeroFormField label={`Wing Area (${inputUnits.area})`} helperText={`Enter wing area in ${inputUnits.area}`}>
                      <Input 
                  type="number"
                  step="0.01"
                  value={wingAreaM2}
                  onChange={(e) => setWingAreaM2(e.target.value)}
                  className="bg-slate-900/50 border-cyan-400/30"
                  placeholder={`e.g., ${unitSystem === 'SI' ? '30' : '323'}`}
                />
              </AeroFormField>
            </AeroCard>
            
            {/* Air Density */}
            <AeroCard
              title="Air Density"
              description="Select mode: preset, altitude-based (ISA), or custom"
              icon={Wind}
            >
              <AeroFormField label="Air Density Mode">
                <Select value={airDensityMode} onValueChange={(v) => setAirDensityMode(v as AirDensityMode)}>
                  <SelectTrigger className="w-full bg-slate-900/50 border-cyan-400/30 text-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preset">Preset (ISA altitudes)</SelectItem>
                    <SelectItem value="altitude">Altitude-based (ISA model)</SelectItem>
                    <SelectItem value="custom">Custom density</SelectItem>
                  </SelectContent>
                </Select>
              </AeroFormField>
              
              {airDensityMode === 'preset' && (
                <AeroFormField label="Altitude Preset">
                  <Select value={airDensityPreset} onValueChange={(v) => setAirDensityPreset(v as AirDensityPreset)}>
                    <SelectTrigger className="w-full bg-slate-900/50 border-cyan-400/30 text-cyan-400">
                      <SelectValue />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ISA Sea Level">ISA Sea Level (0 ft)</SelectItem>
                    <SelectItem value="2000 ft">2000 ft</SelectItem>
                    <SelectItem value="5000 ft">5000 ft</SelectItem>
                    <SelectItem value="8000 ft">8000 ft</SelectItem>
                    <SelectItem value="10000 ft">10000 ft</SelectItem>
                    <SelectItem value="15000 ft">15000 ft</SelectItem>
                  </SelectContent>
                  </Select>
              </AeroFormField>
              )}
              
              {airDensityMode === 'altitude' && (
                <>
                  <AeroFormField label={`Flight Altitude (${inputUnits.altitude})`} helperText="Enter altitude for ISA calculation">
                    <Input
                      type="number"
                      step="0.01"
                      value={airDensityAltitude}
                      onChange={(e) => setAirDensityAltitude(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder={`e.g., ${unitSystem === 'SI' ? '0' : '0'}`}
                    />
              </AeroFormField>
                  <AeroFormField label="Temperature Deviation (ΔT, K)" helperText="Optional: deviation from ISA temperature">
                    <Input
                      type="number"
                      step="0.1"
                      value={airDensityDeltaT}
                      onChange={(e) => setAirDensityDeltaT(e.target.value)}
                      className="bg-slate-900/50 border-cyan-400/30"
                      placeholder="e.g., 0"
                    />
              </AeroFormField>
                </>
              )}
              
              {airDensityMode === 'custom' && (
                <AeroFormField label="Custom Air Density (kg/m³)">
                      <Input 
                        type="number"
                    step="0.001"
                    value={airDensityCustom}
                    onChange={(e) => setAirDensityCustom(e.target.value)}
                    className="bg-slate-900/50 border-cyan-400/30"
                    placeholder="e.g., 1.225"
                  />
                  <InlineInterlinkHint requiredFields={['densityKgM3']} sourceTool="atmosphere" className="mt-1" />
              </AeroFormField>
              )}
              
              <div className="mt-2 p-2 bg-slate-900/50 rounded border border-cyan-400/20">
                <p className="text-sm text-gray-300">
                  <span className="text-cyan-400">Current density:</span> {currentAirDensity.toFixed(3)} kg/m³
                </p>
                {airDensityMode === 'altitude' && (
                  <p className="text-xs text-gray-400 mt-1">
                    Calculated from ISA model at {parseFloat(airDensityAltitude) || 0} {inputUnits.altitude}
                    {parseFloat(airDensityDeltaT) !== 0 && ` (ΔT = ${airDensityDeltaT} K)`}
                  </p>
                )}
                    </div>
            </AeroCard>

            {/* Advanced Settings - Hidden in Beginner mode */}
            {(calculatorMode === 'University' || calculatorMode === 'Expert') && (
              <AeroCard
              title="Advanced Settings"
              description="Optional: CL,max override, MTOW, and landing weight analysis"
              icon={Info}
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced" className="border-cyan-400/20">
                  <AccordionTrigger className="text-white hover:text-cyan-400 text-sm">
                    Show Advanced Settings
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    {/* CLmax Override */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={useClMaxOverride}
                        onCheckedChange={setUseClMaxOverride}
                      />
                      <Label className="text-sm text-gray-300">Override CL,max</Label>
                    </div>
                    {useClMaxOverride && (
                      <AeroFormField label="User-specified CL,max" helperText={`Default: ${getMissionData(missionType).clMax.toFixed(2)}${missionType !== 'None' ? ` (${missionType})` : ''}`}>
                      <Input 
                          type="number"
                          step="0.01"
                          value={clMaxOverride}
                          onChange={(e) => setClMaxOverride(e.target.value)}
                          className="bg-slate-900/50 border-cyan-400/30"
                          placeholder={`e.g., ${getMissionData(missionType).clMax.toFixed(2)}`}
                        />
                      </AeroFormField>
                    )}
                    
                    {/* MTOW and Landing Weight */}
                    <div className="pt-2 border-t border-cyan-400/20">
                      <Label className="text-sm text-gray-300 mb-2 block">Weight Analysis (Optional)</Label>
                      <AeroFormField label={`MTOW (${weightMode === 'mass' ? inputUnits.mass : inputUnits.weight})`} helperText="Maximum Takeoff Weight">
                      <Input 
                        type="number"
                          step="0.01"
                          value={mtow}
                          onChange={(e) => setMtow(e.target.value)}
                          className="bg-slate-900/50 border-cyan-400/30"
                          placeholder="Leave empty to skip"
                        />
                      </AeroFormField>
                      {mtow && calculatorMode === 'Expert' && (
                        <AeroFormField label="Landing Weight Fraction" helperText="Fraction of MTOW (typical: 0.7)">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={landingWeightFraction}
                            onChange={(e) => setLandingWeightFraction(e.target.value)}
                            className="bg-slate-900/50 border-cyan-400/30"
                            placeholder="0.7"
                          />
                        </AeroFormField>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
              Calculate Wing Loading
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
                      <p className="text-sm text-gray-400 mb-1">Wing Loading ({outputUnits.wingLoadingNm2})</p>
                      <p className="text-3xl font-bold text-cyan-400">
                        {convertWingLoadingNm2FromSI(result.wingLoadingNm2, unitSystem).toFixed(2)} {outputUnits.wingLoadingNm2}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        ({result.wingLoadingNm2.toFixed(2)} N/m²)
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-lg border border-cyan-400/30">
                      <p className="text-sm text-gray-400 mb-1">Wing Loading ({outputUnits.wingLoadingKgm2})</p>
                      <p className="text-3xl font-bold text-cyan-400">
                        {convertWingLoadingKgm2FromSI(result.wingLoadingKgm2, unitSystem).toFixed(2)} {outputUnits.wingLoadingKgm2}
                    </p>
                      <p className="text-sm text-gray-400 mt-1">
                        ({result.wingLoadingKgm2.toFixed(2)} kg/m²)
                    </p>
                  </div>
                    
                    <div className="p-4 bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-lg border border-green-400/30">
                      <p className="text-sm text-gray-400 mb-1">Stall Speed</p>
                      {(() => {
                        const velocity = convertVelocityFromSI(result.stallSpeedMs, unitSystem);
                        return (
                          <>
                            <p className="text-2xl font-bold text-green-400">
                              {velocity.value.toFixed(2)} {velocity.unit}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              ({result.stallSpeedMs.toFixed(2)} m/s, {result.stallSpeedKts.toFixed(2)} kts)
                            </p>
                          </>
                        );
                      })()}
                        </div>
                    
                    {result.mtowWingLoadingKgm2 !== undefined && (
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-sm text-gray-400 mb-1">W/S at Takeoff (MTOW)</p>
                        <p className="text-xl font-bold text-cyan-300">
                          {convertWingLoadingKgm2FromSI(result.mtowWingLoadingKgm2, unitSystem).toFixed(2)} {outputUnits.wingLoadingKgm2}
                        </p>
                        {result.landingWingLoadingKgm2 !== undefined && (
                          <>
                            <p className="text-sm text-gray-400 mb-1 mt-2">W/S at Landing</p>
                            <p className="text-xl font-bold text-cyan-300">
                              {convertWingLoadingKgm2FromSI(result.landingWingLoadingKgm2, unitSystem).toFixed(2)} {outputUnits.wingLoadingKgm2}
                            </p>
                          </>
                        )}
                </div>
              )}
                    
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <p className="text-sm text-gray-400 mb-1">Wing Loading Classification</p>
                      <p className={`text-xl font-bold ${getClassificationColor(result.wsClass)}`}>
                        {result.wsClass}
                      </p>
                </div>
              </div>
            </AeroCard>
                
                {/* Mission Envelope Card */}
                <AeroCard
                  title="Mission Envelope"
                  icon={TrendingUp}
                >
                  <div className="space-y-3">
                    <p className="text-sm text-gray-300">
                      Typical <span className="text-cyan-400 font-semibold">{missionType}</span> wing loading:{" "}
                      <span className="text-cyan-400">
                        {missionType !== 'None' ? `${getMissionData(missionType).wsMinKg}–${getMissionData(missionType).wsMaxKg} kg/m²` : 'N/A (Manual mode)'}
                      </span>
                    </p>
                    <div className="relative h-12 bg-slate-700/50 rounded border border-cyan-400/30">
                      {/* Range indicator (typical range) */}
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
                      
                      {/* Example aircraft reference zones */}
                      {(() => {
                        const example = EXAMPLE_AIRCRAFT[missionType as keyof typeof EXAMPLE_AIRCRAFT];
                        if (!example) return null;
                        const params = missionData[missionType];
                        const extendedMin = 0.8 * params.wsMinKg;
                        const extendedMax = 1.2 * params.wsMaxKg;
                        const extendedRange = extendedMax - extendedMin;
                        if (extendedRange <= 0) return null;
                        
                        const left = ((example.range[0] - extendedMin) / extendedRange) * 100;
                        const width = ((example.range[1] - example.range[0]) / extendedRange) * 100;
                        
                        return (
                          <div
                            className="absolute top-0 h-full bg-blue-400/20 border-l border-r border-blue-400/40"
                            style={{
                              left: `${Math.max(0, left)}%`,
                              width: `${Math.max(0, Math.min(100, width))}%`
                            }}
                            title={example.label}
                          />
                        );
                      })()}
                      
                      {/* Current position marker */}
                      <div
                        className="absolute top-0 h-full w-1 bg-cyan-400 z-10"
                        style={{ left: `${getEnvelopePosition()}%` }}
                      />
                      
                      {/* Labels */}
                      <div
                        className="absolute -top-6 left-0 right-0 flex justify-between text-xs text-gray-400"
                      >
                        {missionType !== 'None' && (
                          <>
                            <span>{(0.8 * getMissionData(missionType).wsMinKg).toFixed(0)}</span>
                            <span>{(1.2 * getMissionData(missionType).wsMaxKg).toFixed(0)}</span>
                          </>
                        )}
            </div>
                      
                      {/* Example aircraft label */}
                      {(() => {
                        const example = EXAMPLE_AIRCRAFT[missionType as keyof typeof EXAMPLE_AIRCRAFT];
                        if (!example) return null;
                        const params = missionData[missionType];
                        const extendedMin = 0.8 * params.wsMinKg;
                        const extendedMax = 1.2 * params.wsMaxKg;
                        const extendedRange = extendedMax - extendedMin;
                        if (extendedRange <= 0) return null;
                        
                        const center = ((example.range[0] + example.range[1]) / 2 - extendedMin) / extendedRange * 100;
                        
                        return (
                          <div
                            className="absolute -bottom-5 text-xs text-blue-300/70"
                            style={{ left: `${Math.max(5, Math.min(95, center))}%`, transform: 'translateX(-50%)' }}
                          >
                            {example.label}
            </div>
                        );
                      })()}
          </div>
                    <p className="text-sm text-cyan-400 text-center">
                      Current: {result.wingLoadingKgm2.toFixed(2)} kg/m²
                    </p>
          </div>
                </AeroCard>
                
                {/* Regulatory Warning */}
                {result.regulatoryWarning && (
                  <AeroCard
                    title="Regulatory Check"
                    icon={AlertTriangle}
                  >
                    <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-400/30">
                      <p className="text-sm text-yellow-200 whitespace-pre-wrap leading-relaxed">
                        {result.regulatoryWarning}
                      </p>
                    </div>
                  </AeroCard>
                )}
                
                {/* Best Use Case / Mission Fit Card */}
                <AeroCard
                  title="Best Use Case / Mission Fit"
                  icon={TrendingUp}
                >
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                    <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {generateBestUseCase(
                        missionType,
                        result.wsClass,
                        result.vsClass,
                        result.wingLoadingKgm2,
                        result.stallSpeedMs,
                        result.stallSpeedKts
                      )}
                    </p>
                  </div>
                </AeroCard>
                
                {/* Interpretation Card - Hidden in Beginner mode */}
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

      {/* Engineering Graphs - Full Width Section Below */}
      {result && (
        <div className="mt-8 px-4">
          <WingLoadingGraphs
            currentWsKgm2={result.wingLoadingKgm2}
            currentVsMs={result.stallSpeedMs}
            currentVsKts={result.stallSpeedKts}
            weightN={result.weightN}
            wingAreaM2={result.wingAreaM2}
            airDensity={currentAirDensity}
            clMax={currentClMax}
            missionType={missionType}
            missionData={missionData}
            airDensityMode={airDensityMode}
            airDensityPreset={airDensityPreset}
            airDensityAltitude={parseFloat(airDensityAltitude) || undefined}
          />
        </div>
      )}
    </ToolWrapper>
  );
};

export default WingLoadingCalculator;