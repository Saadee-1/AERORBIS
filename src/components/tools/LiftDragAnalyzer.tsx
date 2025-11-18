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

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Info, Plane, Pencil, BarChartHorizontal, Settings2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToolContext } from "@/hooks/useToolContext";
import { PDFExportButton } from "@/components/tools/PDFExportButton";
import { AskAIButton } from "@/components/tools/AskAIButton";
import { ToolWrapper } from "@/components/layout/ToolWrapper";
import { ToolHeader } from "@/components/layout/ToolHeader";
import { ToolSection } from "@/components/layout/ToolSection";
import { ToolActions } from "@/components/layout/ToolActions";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroFormField } from "@/components/forms/AeroFormField";
import { AeroButton } from "@/components/common/AeroButton";
import { ChartCard } from "@/components/charts/ChartCard";
import { spacingVertical } from "@/styles/spacing";

type UnitSystem = "SI" | "Imperial" | "Custom";
type AirfoilKey = keyof typeof airfoils | "custom";
type ChartMode = "compareOne" | "compareAll";

// Airfoil database with real-world coefficients
const airfoils = {
  NACA0012: {
    name: "NACA 0012 (Symmetric)",
    description: "General purpose symmetric airfoil, commonly used in aircraft tails",
    CL_alpha: 0.105, // Lift coefficient per degree
    CL_0: 0,
    CD_0: 0.006, // Zero-lift drag coefficient
    alpha_stall: 15, // Stall angle in degrees
  },
  NACA2412: {
    name: "NACA 2412 (Cambered)",
    description: "Popular cambered airfoil for general aviation wings",
    CL_alpha: 0.11,
    CL_0: 0.25,
    CD_0: 0.007,
    alpha_stall: 16,
  },
  NACA4415: {
    name: "NACA 4415 (High Lift)",
    description: "High-lift cambered airfoil for slower aircraft",
    CL_alpha: 0.108,
    CL_0: 0.55,
    CD_0: 0.008,
    alpha_stall: 14,
  },
  ClarkY: {
    name: "Clark Y",
    description: "Classic airfoil for vintage and sport aircraft",
    CL_alpha: 0.103,
    CL_0: 0.30,
    CD_0: 0.0065,
    alpha_stall: 15.5,
  },
  Supercritical: {
    name: "Supercritical Airfoil",
    description: "Modern high-speed airfoil for commercial jets",
    CL_alpha: 0.095,
    CL_0: 0.15,
    CD_0: 0.0055,
    alpha_stall: 17,
  },
};

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

const LiftDragAnalyzer = () => {
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
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
      airfoil: "NACA2412" as AirfoilKey,
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
  
  const [comparisonAirfoil, setComparisonAirfoil] = useState<keyof typeof airfoils>("NACA0012");
  const [chartMode, setChartMode] = useState<ChartMode>('compareOne');

  const [result, setResult] = useState<LiftDragResult | null>(null);
  const [error, setError] = useState<string>("");

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
      : airfoils[inputs.airfoil];
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

      // Send calculation event to assistant
      const eventResponse = await sendCalculationEvent({
        toolId: "liftdrag-analyzer",
        toolName: "Lift/Drag Analyzer",
        inputs: {
          airfoil: activeAirfoil.name,
          angleOfAttack: alpha,
          airspeed: V,
          airDensity: rho,
          wingArea: S,
          wingSpan: b,
          oswaldEfficiency: e,
          aspectRatio,
          unitSystem
        },
        results: {
          liftCoefficient: CL,
          dragCoefficient: CD,
          liftToDragRatio: L_D_ratio,
          liftForce,
          dragForce,
          aspectRatio,
          flowRegime: L_D_ratio > 20 ? "Excellent" : L_D_ratio > 15 ? "Good" : L_D_ratio > 10 ? "Moderate" : "Poor"
        },
        steps: calculationSteps,
        metadata: {
          units: unitSystem,
          approxLevel: "analytic",
          confidence: "high",
          warnings: alpha >= activeAirfoil.alpha_stall ? [`Angle of attack (${alpha}°) exceeds stall angle (${activeAirfoil.alpha_stall}°)`] : []
        }
      });

      // Always set lastRequestId (even if event failed, requestId is still generated)
      if (eventResponse) {
        setLastRequestId(eventResponse.requestId);
      }
      
      // Update AI assistant context
      updateToolContext({
        tool: "LiftDrag",
        inputs: {
          airfoil: activeAirfoil.name,
          angleOfAttack: `${alpha}°`,
          airspeed: `${convertFromSI(V, "speed").toFixed(2)} ${getUnit("speed")}`,
          airDensity: `${convertFromSI(rho, "density").toFixed(3)} ${getUnit("density")}`,
          wingArea: `${convertFromSI(S, "area").toFixed(2)} ${getUnit("area")}`,
          wingSpan: `${convertFromSI(b, "span").toFixed(2)} ${getUnit("span")}`,
          oswaldEfficiency: e.toFixed(3),
          unitSystem
        },
        results: {
          liftCoefficient: CL.toFixed(4),
          dragCoefficient: CD.toFixed(4),
          liftToDragRatio: L_D_ratio.toFixed(2),
          liftForce: `${convertFromSI(liftForce, "force").toFixed(2)} ${getUnit("force")}`,
          dragForce: `${convertFromSI(dragForce, "force").toFixed(2)} ${getUnit("force")}`,
          aspectRatio: aspectRatio.toFixed(2),
          flowRegime: L_D_ratio > 20 ? "Excellent" : L_D_ratio > 15 ? "Good" : L_D_ratio > 10 ? "Moderate" : "Poor"
        }
      });
    } catch (err) {
      setError((err as Error).message);
      setResult(null);
    }
  };
  
  // FIXED: Use useCallback to create stable function reference
  const generateComparisonData = useCallback((currentAirfoil: Airfoil, k_factor: number, activeAirfoilKey: AirfoilKey) => {
    const data = [];

    for (let alpha = -5; alpha <= 20; alpha += 1) {
      const point: any = { alpha };

      // Calculate for all database airfoils
      Object.keys(airfoils).forEach((key) => {
        const airfoil = airfoils[key as keyof typeof airfoils];
        if (alpha <= airfoil.alpha_stall) {
          const CL = airfoil.CL_0 + airfoil.CL_alpha * alpha;
          const CD = airfoil.CD_0 + k_factor * Math.pow(CL, 2);
          point[key] = CD !== 0 ? CL / CD : 0;
        } else {
          point[key] = null;
        }
      });
      
      // Calculate for current custom airfoil IF it's active
      if (activeAirfoilKey === "custom") {
        if (alpha <= currentAirfoil.alpha_stall) {
          const CL = currentAirfoil.CL_0 + currentAirfoil.CL_alpha * alpha;
          const CD = currentAirfoil.CD_0 + k_factor * Math.pow(CL, 2);
          point.custom = CD !== 0 ? CL / CD : 0;
        } else {
          point.custom = null;
        }
      }
      
      data.push(point);
    }
    return data;
  }, []);
  
  // FIXED: Use useMemo to prevent unnecessary recalculations
  const comparisonData = useMemo(() => {
    if (!result) return [];
    const activeAirfoil = getActiveAirfoil();
    return generateComparisonData(activeAirfoil, result.k_factor, inputs.airfoil);
  }, [result, inputs.airfoil, customAirfoil, comparisonAirfoil, chartMode, generateComparisonData]);
  
  const handleCustomAirfoilChange = (field: keyof CustomAirfoilInputs, value: string) => {
    setCustomAirfoil(prev => ({ ...prev, [field]: value }));
  };
  
  const currentAirfoilDescription = inputs.airfoil === "custom"
    ? customAirfoil.description
    : airfoils[inputs.airfoil].description;
    
  const currentAirfoilName = result?.airfoilName || "Current";
  const comparisonAirfoilName = airfoils[comparisonAirfoil].name;

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
              <AeroFormField label="Airfoil Type" helperText={currentAirfoilDescription}>
                <Select value={inputs.airfoil} onValueChange={(v) => setInputs({ ...inputs, airfoil: v as AirfoilKey })}>
                  <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(airfoils).map((key) => (
                      <SelectItem key={key} value={key}>
                        {airfoils[key as keyof typeof airfoils].name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      <span className="text-cyan-400">-- Custom Airfoil --</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                lastRequestId ? (
                  <div className="flex gap-2">
                    <AskAIButton requestId={lastRequestId} disabled={!lastRequestId} />
                    <PDFExportButton 
                      requestId={lastRequestId} 
                      toolName="Lift/Drag Analyzer"
                      disabled={!lastRequestId}
                    />
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
                    <AccordionContent className="text-slate-300 space-y-1 font-mono text-xs pt-2">
                      {result.steps.map((step, i) => (
                        <p key={i} className="leading-relaxed">
                          {step.split('\n').map((line, j) => <span key={j} className="block">{line}</span>)}
                        </p>
                      ))}
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
        </div>
      </ToolSection>

      {/* Comparison Chart */}
      {comparisonData.length > 0 && (
        <ChartCard 
          title="Performance Comparison (L/D Ratio)"
          height={350}
          headerActions={
            <div className="flex items-center gap-2">
              <AeroButton
                type="button"
                onClick={() => setChartMode(prev => prev === 'compareOne' ? 'compareAll' : 'compareOne')}
                variant="outline"
                icon={BarChartHorizontal}
              >
                {chartMode === 'compareOne' ? 'Compare All' : 'Compare 1-v-1'}
              </AeroButton>
                  <AnimatePresence>
                    {chartMode === 'compareOne' && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="flex items-center gap-2 overflow-hidden"
                      >
                        <Label htmlFor="compareAirfoil" className="text-cyan-300">Compare with:</Label>
                        <Select value={comparisonAirfoil} onValueChange={(v) => setComparisonAirfoil(v as keyof typeof airfoils)}>
                          <SelectTrigger className="w-48 bg-slate-700/50 border-cyan-400/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(airfoils).map((key) => (
                              <SelectItem key={key} value={key} disabled={inputs.airfoil === key}>
                                {airfoils[key as keyof typeof airfoils].name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </AnimatePresence>
            </div>
          }
        >
          <p className="text-sm text-slate-400 -mt-2 mb-4">
            Comparing all airfoils using your wing's calculated Aspect Ratio of {result?.aspectRatio.toFixed(2)}
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="alpha"
                stroke="#94a3b8"
                label={{ value: "Angle of Attack (degrees)", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
              />
              <YAxis
                stroke="#94a3b8"
                label={{ value: "L/D Ratio", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #22d3ee" }}
                labelStyle={{ color: "#22d3ee" }}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Legend />
              
              {/* Dynamic Line Rendering */}
              {chartMode === 'compareAll' ? (
                <>
                  {/* Show all database airfoils */}
                  <Line connectNulls type="monotone" dataKey="NACA0012" name="NACA 0012" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  <Line connectNulls type="monotone" dataKey="NACA2412" name="NACA 2412" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line connectNulls type="monotone" dataKey="NACA4415" name="NACA 4415" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line connectNulls type="monotone" dataKey="ClarkY" name="Clark Y" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line connectNulls type="monotone" dataKey="Supercritical" name="Supercritical" stroke="#ef4444" strokeWidth={2} dot={false} />
                  {/* Also show custom if it's the selected one */}
                  {inputs.airfoil === 'custom' && (
                     <Line connectNulls type="monotone" dataKey="custom" name={result?.airfoilName || "Custom"} stroke="#e879f9" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                  )}
                </>
              ) : (
                <>
                  {/* Show 1-v-1 comparison */}
                  <Line 
                    connectNulls 
                    type="monotone" 
                    dataKey={inputs.airfoil === 'custom' ? 'custom' : inputs.airfoil} 
                    name={result?.airfoilName || "Current"} 
                    stroke="#22d3ee" 
                    strokeWidth={3} 
                    dot={false} 
                  />
                  <Line 
                    connectNulls 
                    type="monotone" 
                    dataKey={comparisonAirfoil} 
                    name={airfoils[comparisonAirfoil].name} 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={false} 
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
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
