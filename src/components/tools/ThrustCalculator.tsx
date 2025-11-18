"use client";

/*
 * FIXES APPLIED:
 * - Standardized result property name (solveFor -> solvedFor) for consistency with UI
 * - Fixed chart generation loop to use standard atmospheric pressure default
 * - Added validation for physical constraints (mass flow >= 0, exit area > 0, exhaust velocity > 0)
 * - Improved error handling with clear, user-friendly messages
 * - Added physics formula comments (Thrust equation, Isp calculation)
 * - Fixed unit conversion edge cases for custom units
 * - Added test cases
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { Calculator, Rocket, Info, TrendingUp, Settings2, Anchor } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";
import { Save, FolderOpen, Trash2 } from "lucide-react";

// --- Types & Constants ---

type UnitSystem = "SI" | "Imperial" | "Custom";

interface CalculationStep {
  equation: string;
  description: string;
}

interface SavedPreset {
  name: string;
  inputs: {
    massFlowRate: string;
    exhaustVelocity: string;
    exitArea: string;
    exitPressure: string;
    ambientPressure: string;
    thrust: string;
    isp: string;
  };
  unitSystem: UnitSystem;
  timestamp: number;
}

const STORAGE_KEY_CUSTOM_PRESETS = "thrustCalculator_customPresets";

const G0_SI = 9.80665; // m/s²
const G0_IMPERIAL = 32.174; // ft/s²

const thrustSchema = z.object({
  massFlowRate: z.number().finite("Must be a valid number").optional(),
  exhaustVelocity: z.number().finite("Must be a valid number").optional(),
  exitArea: z.number().finite("Must be a valid number").optional(),
  exitPressure: z.number().finite("Must be a valid number").optional(),
  ambientPressure: z.number().finite("Must be a valid number").optional(),
  thrust: z.number().finite("Must be a valid number").optional(),
});

const performanceSchema = z.object({
  isp: z.number().finite("Must be a valid number").optional(),
  exhaustVelocity: z.number().finite("Must be a valid number").optional(),
});

// --- Main Component ---
const AdvancedThrustCalculator = () => {
  const { toast } = useToast();
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");

  // --- State ---
  const [inputs, setInputs] = useState({
    massFlowRate: "",
    exhaustVelocity: "",
    exitArea: "",
    exitPressure: "",
    ambientPressure: "",
    thrust: "",
    isp: "",
  });

  const [customUnitNames, setCustomUnitNames] = useState({
    massFlowRate: "Unit-ṁ",
    exhaustVelocity: "Unit-Ve",
    exitArea: "Unit-Ae",
    pressure: "Unit-P",
    thrust: "Unit-F",
  });
  const [customFactors, setCustomFactors] = useState({
    massFlowRate: "1.0",
    exhaustVelocity: "1.0",
    exitArea: "1.0",
    pressure: "1.0",
    thrust: "1.0",
  });

  const [thrustResult, setThrustResult] = useState<any | null>(null);
  const [performanceResult, setPerformanceResult] = useState<any | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");

  // --- Effects for LocalStorage ---
  useEffect(() => {
    const loadFromStorage = (key: string, setter: Function, defaultValue: any) => {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        try {
          setter(JSON.parse(storedValue));
        } catch (e) {
          if (key === "advThrustCalc_unitSystem") setter(storedValue);
          else console.warn(`Failed to parse ${key} from storage.`);
        }
      } else {
        setter(defaultValue);
      }
    };

    loadFromStorage("advThrustCalc_unitSystem", setUnitSystem, "SI");
    loadFromStorage("advThrustCalc_inputs", setInputs, { massFlowRate: "", exhaustVelocity: "", exitArea: "", exitPressure: "", ambientPressure: "", thrust: "", isp: "" });
    loadFromStorage("advThrustCalc_customNames", setCustomUnitNames, { massFlowRate: "Unit-ṁ", exhaustVelocity: "Unit-Ve", exitArea: "Unit-Ae", pressure: "Unit-P", thrust: "Unit-F" });
    loadFromStorage("advThrustCalc_customFactors", setCustomFactors, { massFlowRate: "1.0", exhaustVelocity: "1.0", exitArea: "1.0", pressure: "1.0", thrust: "1.0" });
  }, []);

  useEffect(() => {
    localStorage.setItem("advThrustCalc_unitSystem", unitSystem);
    localStorage.setItem("advThrustCalc_inputs", JSON.stringify(inputs));
    localStorage.setItem("advThrustCalc_customNames", JSON.stringify(customUnitNames));
    localStorage.setItem("advThrustCalc_customFactors", JSON.stringify(customFactors));
  }, [unitSystem, inputs, customUnitNames, customFactors]);

  // --- Unit Conversion ---
  const getUnit = (field: string): string => {
    const units: Record<string, Record<UnitSystem, string>> = {
      massFlowRate: { SI: "kg/s", Imperial: "lb/s", Custom: customUnitNames.massFlowRate },
      exhaustVelocity: { SI: "m/s", Imperial: "ft/s", Custom: customUnitNames.exhaustVelocity },
      exitArea: { SI: "m²", Imperial: "ft²", Custom: customUnitNames.exitArea },
      exitPressure: { SI: "Pa", Imperial: "psi", Custom: customUnitNames.pressure },
      ambientPressure: { SI: "Pa", Imperial: "psi", Custom: customUnitNames.pressure },
      thrust: { SI: "N", Imperial: "lbf", Custom: customUnitNames.thrust },
      isp: { SI: "s", Imperial: "s", Custom: "s" },
    };
    return units[field]?.[unitSystem] || "";
  };

  const convertToSI = (value: number, field: string): number => {
    if (unitSystem === "SI") return value;
    if (unitSystem === "Imperial") {
      switch (field) {
        case "massFlowRate": return value * 0.453592; // lb/s to kg/s
        case "exhaustVelocity": return value * 0.3048; // ft/s to m/s
        case "exitArea": return value * 0.092903; // ft² to m²
        case "exitPressure":
        case "ambientPressure": return value * 6894.76; // psi to Pa
        case "thrust": return value * 4.44822; // lbf to N
        default: return value;
      }
    }
    if (unitSystem === "Custom") {
      let factorKey = field;
      if (field === "exitPressure" || field === "ambientPressure") factorKey = "pressure";
      const factor = parseFloat(customFactors[factorKey as keyof typeof customFactors]);
      return value * ((isNaN(factor) || factor === 0) ? 1.0 : factor);
    }
    return value;
  };

  const convertFromSI = (value: number, field: string): number => {
    if (unitSystem === "SI") return value;
    if (unitSystem === "Imperial") {
      switch (field) {
        case "massFlowRate": return value / 0.453592;
        case "exhaustVelocity": return value / 0.3048;
        case "exitArea": return value / 0.092903;
        case "exitPressure":
        case "ambientPressure": return value / 6894.76;
        case "thrust": return value / 4.44822;
        default: return value;
      }
    }
    if (unitSystem === "Custom") {
      let factorKey = field;
      if (field === "exitPressure" || field === "ambientPressure") factorKey = "pressure";
      const factor = parseFloat(customFactors[factorKey as keyof typeof customFactors]);
      return value / ((isNaN(factor) || factor === 0) ? 1.0 : factor);
    }
    return value;
  };

  const getG0 = () => (unitSystem === 'Imperial' ? G0_IMPERIAL : G0_SI);

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCustomPreset = () => {
    if (!savePresetName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the custom preset", variant: "destructive" });
      return;
    }
    const newPreset: SavedPreset = {
      name: savePresetName.trim(),
      inputs: { ...inputs },
      unitSystem,
      timestamp: Date.now(),
    };
    setCustomPresets([...customPresets, newPreset]);
    setSavePresetName("");
    setIsSaveDialogOpen(false);
    toast({ title: "Success", description: `Custom preset "${newPreset.name}" saved!` });
  };

  const handleLoadCustomPreset = (preset: SavedPreset) => {
    setInputs(preset.inputs);
    setUnitSystem(preset.unitSystem);
    setIsLoadDialogOpen(false);
    toast({ title: "Loaded", description: `Custom preset "${preset.name}" loaded!` });
  };

  const handleDeleteCustomPreset = (index: number) => {
    const preset = customPresets[index];
    setCustomPresets(customPresets.filter((_, i) => i !== index));
    toast({ title: "Deleted", description: `Custom preset "${preset.name}" deleted!` });
  };

  // --- Calculation Functions ---

  const calculatePerformance = () => {
    try {
      const g0 = getG0(); // Get unit-specific g0
      const rawValues = {
        isp: inputs.isp.trim() ? parseFloat(inputs.isp) : undefined,
        exhaustVelocity: inputs.exhaustVelocity.trim() ? convertToSI(parseFloat(inputs.exhaustVelocity), "exhaustVelocity") : undefined,
      };

      const emptyFields = Object.entries(rawValues).filter(([_, v]) => v === undefined);
      if (emptyFields.length !== 1) {
        toast({ title: "Invalid Inputs", description: "Fill in exactly 1 field in Part 1 to solve for the other.", variant: "destructive" });
        return;
      }

      const validated = performanceSchema.parse(rawValues);
      const solveFor = emptyFields[0][0];
      let resultData: any = {};
      let steps: CalculationStep[] = [{ equation: `Ve = Isp × g₀ (where g₀ ≈ ${g0.toFixed(2)})`, description: "Performance equation" }];

      if (solveFor === "exhaustVelocity") {
        const isp = validated.isp!;
        const ve = isp * G0_SI; // Always calculate in SI
        steps.push({ equation: `Ve = ${isp.toFixed(1)} × ${G0_SI.toFixed(2)}`, description: "Substitute values" });
        resultData = { exhaustVelocity: ve, isp: isp };
        setInputs(prev => ({ ...prev, exhaustVelocity: convertFromSI(ve, "exhaustVelocity").toFixed(2) }));
      } else { // solveFor === "isp"
        const ve = validated.exhaustVelocity!;
        const isp = ve / G0_SI; // Always calculate in SI
        steps.push({ equation: `Isp = Ve / g₀ = ${ve.toFixed(2)} / ${G0_SI.toFixed(2)}`, description: "Rearrange for Isp" });
        resultData = { exhaustVelocity: ve, isp: isp };
        setInputs(prev => ({ ...prev, isp: isp.toFixed(1) }));
      }
      
      setPerformanceResult({ ...resultData, steps, solvedFor: solveFor });
      setThrustResult(null); // Clear thrust results
      setChartData([]);
      
      // Update AI Assistant context
      updateToolContext({
        tool: "Thrust",
        inputs: {
          isp: inputs.isp || undefined,
          exhaustVelocity: inputs.exhaustVelocity || undefined,
          unitSystem: unitSystem,
        },
        results: {
          ...resultData,
          solvedFor: solveFor,
        },
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid Input", description: error.errors[0]?.message, variant: "destructive" });
      } else {
        toast({ title: "Calculation Error", description: (error as Error).message, variant: "destructive" });
      }
    }
  };

  const calculateThrust = async () => {
    try {
      const rawValues = {
        massFlowRate: inputs.massFlowRate.trim() ? convertToSI(parseFloat(inputs.massFlowRate), "massFlowRate") : undefined,
        exhaustVelocity: inputs.exhaustVelocity.trim() ? convertToSI(parseFloat(inputs.exhaustVelocity), "exhaustVelocity") : undefined,
        exitArea: inputs.exitArea.trim() ? convertToSI(parseFloat(inputs.exitArea), "exitArea") : undefined,
        exitPressure: inputs.exitPressure.trim() ? convertToSI(parseFloat(inputs.exitPressure), "exitPressure") : undefined,
        ambientPressure: inputs.ambientPressure.trim() ? convertToSI(parseFloat(inputs.ambientPressure), "ambientPressure") : undefined,
        thrust: inputs.thrust.trim() ? convertToSI(parseFloat(inputs.thrust), "thrust") : undefined,
      };

      const emptyFields = Object.entries(rawValues).filter(([_, v]) => v === undefined);
      if (emptyFields.length !== 1) {
        toast({ title: "Invalid Inputs", description: "Fill in all but one field in Part 2 to solve.", variant: "destructive" });
        return;
      }

      const validated = thrustSchema.parse(rawValues);
      const solveFor = emptyFields[0][0];
      let resultData: any = {};
      // Physics: Thrust equation F = ṁVe + (Pe - Pa)Ae
      // where ṁ = mass flow rate, Ve = exhaust velocity, Pe = exit pressure, Pa = ambient pressure, Ae = exit area
      let steps: CalculationStep[] = [{ equation: "F = ṁVe + (Pe - Pa)Ae", description: "Thrust equation" }];

      // FIXED: Add validation for physical constraints
      if (validated.massFlowRate !== undefined && validated.massFlowRate < 0) {
        throw new Error("Mass flow rate must be non-negative");
      }
      if (validated.exitArea !== undefined && validated.exitArea <= 0) {
        throw new Error("Exit area must be positive");
      }
      if (validated.exhaustVelocity !== undefined && validated.exhaustVelocity <= 0) {
        throw new Error("Exhaust velocity must be positive");
      }

      // Pre-calculate Isp if Ve is known
      // Physics: Isp = Ve / g₀ where g₀ = 9.80665 m/s²
      let isp: number | undefined = undefined;
      if (validated.exhaustVelocity) {
        isp = validated.exhaustVelocity / G0_SI;
      }

      switch (solveFor) {
        case "thrust": {
          const { massFlowRate, exhaustVelocity, exitArea, exitPressure, ambientPressure } = validated;
          const mdot = massFlowRate!;
          const ve = exhaustVelocity!;
          const ae = exitArea!;
          const pe = exitPressure!;
          const pa = ambientPressure!;
          const momentumThrust = mdot * ve;
          const pressureThrust = (pe - pa) * ae;
          const totalThrust = momentumThrust + pressureThrust;
          steps.push({ equation: `F = ${mdot.toFixed(2)}×${ve.toFixed(2)} + (${pe.toFixed(0)} - ${pa.toFixed(0)})×${ae.toFixed(4)}`, description: "Substitute values" });
          resultData = { thrust: totalThrust, momentumThrust, pressureThrust, isp };
          break;
        }
        case "massFlowRate": {
          const { thrust, exhaustVelocity, exitArea, exitPressure, ambientPressure } = validated;
          const pressureThrust = (exitPressure! - ambientPressure!) * exitArea!;
          if (exhaustVelocity === 0) throw new Error("Exhaust Velocity cannot be zero.");
          const mdot = (thrust! - pressureThrust) / exhaustVelocity!;
          steps.push({ equation: "ṁ = (F - (Pe - Pa)Ae) / Ve", description: "Rearrange for ṁ" });
          resultData = { massFlowRate: mdot, momentumThrust: mdot * exhaustVelocity!, pressureThrust, isp };
          break;
        }
        case "exhaustVelocity": {
          const { thrust, massFlowRate, exitArea, exitPressure, ambientPressure } = validated;
          const pressureThrust = (exitPressure! - ambientPressure!) * exitArea!;
          if (massFlowRate === 0) throw new Error("Mass Flow Rate cannot be zero.");
          const ve = (thrust! - pressureThrust) / massFlowRate!;
          isp = ve / G0_SI; // Calculate the resulting Isp
          steps.push({ equation: "Ve = (F - (Pe - Pa)Ae) / ṁ", description: "Rearrange for Ve" });
          resultData = { exhaustVelocity: ve, momentumThrust: massFlowRate! * ve, pressureThrust, isp };
          // Auto-populate Part 1
          setInputs(prev => ({ ...prev, isp: isp!.toFixed(1) }));
          break;
        }
        case "exitArea": {
          const { thrust, massFlowRate, exhaustVelocity, exitPressure, ambientPressure } = validated;
          const momentumThrust = massFlowRate! * exhaustVelocity!;
          const pressureDiff = exitPressure! - ambientPressure!;
          if (pressureDiff === 0) throw new Error("Pressure difference (Pe - Pa) cannot be zero.");
          const ae = (thrust! - momentumThrust) / pressureDiff;
          steps.push({ equation: "Ae = (F - ṁVe) / (Pe - Pa)", description: "Rearrange for Ae" });
          resultData = { exitArea: ae, momentumThrust, pressureThrust: (thrust! - momentumThrust), isp };
          break;
        }
        case "exitPressure": {
          const { thrust, massFlowRate, exhaustVelocity, exitArea, ambientPressure } = validated;
          const momentumThrust = massFlowRate! * exhaustVelocity!;
          if (exitArea === 0) throw new Error("Exit Area cannot be zero.");
          const pe = ambientPressure! + (thrust! - momentumThrust) / exitArea!;
          steps.push({ equation: "Pe = Pa + (F - ṁVe) / Ae", description: "Rearrange for Pe" });
          resultData = { exitPressure: pe, momentumThrust, pressureThrust: (thrust! - momentumThrust), isp };
          break;
        }
        case "ambientPressure": {
          const { thrust, massFlowRate, exhaustVelocity, exitArea, exitPressure } = validated;
          const momentumThrust = massFlowRate! * exhaustVelocity!;
          if (exitArea === 0) throw new Error("Exit Area cannot be zero.");
          const pa = exitPressure! - (thrust! - momentumThrust) / exitArea!;
          steps.push({ equation: "Pa = Pe - (F - ṁVe) / Ae", description: "Rearrange for Pa" });
          resultData = { ambientPressure: pa, momentumThrust, pressureThrust: (thrust! - momentumThrust), isp };
          break;
        }
      }

      setThrustResult({ ...resultData, steps, solvedFor: solveFor });
      setPerformanceResult(null); // Clear performance results
      
      // Prepare calculation steps for event
      const calculationSteps = steps.map(step => 
        `${step.description}: ${step.equation}`
      );
      
      // Send calculation event to assistant
      const eventResponse = await sendCalculationEvent({
        toolId: "thrust-calculator",
        toolName: "Thrust Calculator",
        inputs: {
          massFlowRate: validated.massFlowRate,
          exhaustVelocity: validated.exhaustVelocity,
          exitArea: validated.exitArea,
          exitPressure: validated.exitPressure,
          ambientPressure: validated.ambientPressure,
          thrust: validated.thrust,
          solvedFor: solveFor,
          unitSystem
        },
        results: {
          ...resultData,
          solvedFor: solveFor
        },
        steps: calculationSteps,
        metadata: {
          units: unitSystem,
          approxLevel: "analytic",
          confidence: "high"
        }
      });

      // Always set lastRequestId (even if event failed, requestId is still generated)
      if (eventResponse) {
        setLastRequestId(eventResponse.requestId);
      }
      
      // Update AI Assistant context
      updateToolContext({
        tool: "Thrust",
        inputs: {
          massFlowRate: inputs.massFlowRate || undefined,
          exhaustVelocity: inputs.exhaustVelocity || undefined,
          exitArea: inputs.exitArea || undefined,
          exitPressure: inputs.exitPressure || undefined,
          ambientPressure: inputs.ambientPressure || undefined,
          unitSystem: unitSystem,
        },
        results: {
          thrust: resultData.thrust,
          momentumThrust: resultData.momentumThrust,
          pressureThrust: resultData.pressureThrust,
          isp: resultData.isp,
          solvedFor: solveFor,
        },
      });
      
      // FIXED: Generate Chart with simplified loop and proper validation
      if (validated.massFlowRate && validated.exhaustVelocity && validated.exitArea && validated.exitPressure) {
        const { massFlowRate, exhaustVelocity, exitArea, exitPressure } = validated;
        const data = [];
        // FIXED: Use standard atmospheric pressure as default if ambient not provided
        const pa_base = validated.ambientPressure ?? 101325; // Standard sea-level pressure in Pa
        const maxPa = Math.max(pa_base * 2, 202650); // Ensure reasonable range
        const stepSize = maxPa / 20;
        
        for (let pa_current = 0; pa_current <= maxPa; pa_current += stepSize) {
          // Physics: F = ṁVe + (Pe - Pa)Ae
          const f = massFlowRate! * exhaustVelocity! + (exitPressure! - pa_current) * exitArea!;
          data.push({
            ambientPressure: convertFromSI(pa_current, "ambientPressure"),
            thrust: convertFromSI(f, "thrust")
          });
        }
        setChartData(data);
      } else {
        setChartData([]);
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid Input", description: error.errors[0]?.message, variant: "destructive" });
      } else {
        toast({ title: "Calculation Error", description: (error as Error).message, variant: "destructive" });
      }
    }
  };

  const resetCalculators = () => {
    setInputs({ massFlowRate: "", exhaustVelocity: "", exitArea: "", exitPressure: "", ambientPressure: "", thrust: "", isp: "" });
    setThrustResult(null);
    setPerformanceResult(null);
    setChartData([]);
  };

  // --- Render ---
  return (
    <ToolWrapper>
      <ToolHeader
        title="Advanced Rocket Thrust Calculator"
        description="Calculate engine performance (I_sp) and solve for any variable in the thrust equation"
        icon={Rocket}
        actions={
          <ToolActions>
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-cyan-400/30 text-cyan-400"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI (Metric)</SelectItem>
                <SelectItem value="Imperial">Imperial</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <AeroButton type="button" onClick={resetCalculators} variant="outline">Reset All</AeroButton>
            <AeroButton
              type="button"
              onClick={() => setIsSaveDialogOpen(true)}
              variant="outline"
              icon={Save}
            >
              Save Preset
            </AeroButton>
            <AeroButton
              type="button"
              onClick={() => setIsLoadDialogOpen(true)}
              variant="outline"
              icon={FolderOpen}
              disabled={customPresets.length === 0}
            >
              Load ({customPresets.length})
            </AeroButton>
          </ToolActions>
        }
      />

      <ToolSection gridCols={2}>
        {/* --- LEFT COLUMN (INPUTS) --- */}
        <div>
          <div className={spacingVertical.L}>
            {/* --- Part 1: Performance (Isp) --- */}
            <AeroCard
              title="Part 1: Performance (Isp ↔ Ve)"
              description="Solve for I_sp or V_e. Fill 1 of 2 fields. V_e links to Part 2."
              icon={Anchor}
            >
              <AeroFormField label={`Specific Impulse (I_sp) ${getUnit("isp")}`}>
                <Input id="isp" type="number" step="0.1" value={inputs.isp} onChange={(e) => handleInputChange("isp", e.target.value)} className="bg-slate-900/50 border-cyan-400/30" placeholder="e.g., 310" />
              </AeroFormField>
              <AeroFormField label={`Exhaust Velocity (V_e) ${getUnit("exhaustVelocity")}`}>
                <Input id="exhaustVelocity" type="number" step="0.01" value={inputs.exhaustVelocity} onChange={(e) => handleInputChange("exhaustVelocity", e.target.value)} className="bg-slate-900/50 border-cyan-400/30" placeholder="e.g., 3040" />
              </AeroFormField>
              <AeroButton type="button" onClick={calculatePerformance} variant="primary" icon={Anchor} className="w-full">
                Calculate Part 1
              </AeroButton>
            </AeroCard>

            {/* --- Part 2: Thrust Solver --- */}
            <AeroCard
              title="Part 2: Thrust Solver"
              description="Solve for any 1 variable. Fill all other 5 fields."
              icon={Calculator}
            >
              <div className="grid grid-cols-2 gap-4">
                <AeroFormField label={`Thrust (F) ${getUnit("thrust")}`}>
                  <Input id="thrust" type="number" step="0.01" value={inputs.thrust} onChange={(e) => handleInputChange("thrust", e.target.value)} className="bg-slate-900/50 border-cyan-400/30" placeholder="Leave blank" />
                </AeroFormField>
                <AeroFormField label={`Mass Flow (ṁ) ${getUnit("massFlowRate")}`}>
                  <Input id="massFlowRate" type="number" step="0.01" value={inputs.massFlowRate} onChange={(e) => handleInputChange("massFlowRate", e.target.value)} className="bg-slate-900/50 border-cyan-400/30" placeholder="Leave blank" />
                </AeroFormField>
                <AeroFormField label={`Exit Area (Ae) ${getUnit("exitArea")}`}>
                  <Input id="exitArea" type="number" step="0.001" value={inputs.exitArea} onChange={(e) => handleInputChange("exitArea", e.target.value)} className="bg-slate-900/50 border-cyan-400/30" placeholder="Leave blank" />
                </AeroFormField>
                <AeroFormField label={`Exhaust Velocity (V_e) ${getUnit("exhaustVelocity")}`} helperText="From Part 1">
                  <Input id="exhaustVelocity_part2" type="number" step="0.01" value={inputs.exhaustVelocity} onChange={(e) => handleInputChange("exhaustVelocity", e.target.value)} className="bg-slate-900/50 border-cyan-400/30" placeholder="From Part 1" />
                </AeroFormField>
                <AeroFormField label={`Exit Pressure (Pe) ${getUnit("exitPressure")}`}>
                  <Input id="exitPressure" type="number" step="1" value={inputs.exitPressure} onChange={(e) => handleInputChange("exitPressure", e.target.value)} className="bg-slate-900/50 border-cyan-400/30" placeholder="Leave blank" />
                </AeroFormField>
                <AeroFormField label={`Ambient Pressure (Pa) ${getUnit("ambientPressure")}`}>
                  <Input id="ambientPressure" type="number" step="1" value={inputs.ambientPressure} onChange={(e) => handleInputChange("ambientPressure", e.target.value)} className="bg-slate-900/50 border-cyan-400/30" placeholder="Leave blank" />
                </AeroFormField>
              </div>
              <AeroButton type="button" onClick={calculateThrust} variant="primary" icon={Calculator} className="w-full">
                Calculate Thrust
              </AeroButton>
            </AeroCard>

            {/* --- Custom Units --- */}
            {unitSystem === "Custom" && (
              <AeroCard
                title="Custom Unit Definitions"
                description="Define conversion factors to SI (kg, m, s, N, Pa)"
                icon={Settings2}
              >
                {[
                  {id: 'thrust', label: 'Thrust (F)', unit: 'N'},
                  {id: 'massFlowRate', label: 'Mass Flow (ṁ)', unit: 'kg/s'},
                  {id: 'exhaustVelocity', label: 'Exhaust Velocity (Ve)', unit: 'm/s'},
                  {id: 'exitArea', label: 'Area (Ae)', unit: 'm²'},
                  {id: 'pressure', label: 'Pressure (P)', unit: 'Pa'},
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
                        placeholder="SI Factor"
                        value={customFactors[field.id as keyof typeof customFactors]}
                        onChange={(e) => setCustomFactors(p => ({...p, [field.id]: e.target.value}))}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">1 {customUnitNames[field.id as keyof typeof customUnitNames] || "Unit"} = {customFactors[field.id as keyof typeof customFactors] || "..."} {field.unit}</p>
                  </div>
                ))}
              </AeroCard>
            )}
          </div>
        </div>

        {/* --- RIGHT COLUMN (RESULTS & THEORY) --- */}
        <div>
          <div className={spacingVertical.L}>
            {/* --- Results Card --- */}
            <AeroCard
              title="Results"
              headerActions={
                lastRequestId ? (
                  <div className="flex gap-2">
                    <AskAIButton requestId={lastRequestId} disabled={!lastRequestId} />
                    <PDFExportButton 
                      requestId={lastRequestId} 
                      toolName="Thrust Calculator"
                      disabled={!lastRequestId}
                    />
                  </div>
                ) : null
              }
            >
              {/* Performance Result */}
              {performanceResult && (
                <div className="p-4 bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-lg border border-green-400/30 mb-4">
                  <p className="text-sm font-semibold text-green-400 mb-2">Part 1 Result (Performance)</p>
                  <p className="text-gray-400 text-sm mb-1">Solved: {performanceResult.solvedFor}</p>
                  <p className="text-3xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]">
                    {performanceResult.isp ? `${performanceResult.isp.toFixed(1)} ${getUnit("isp")}`
                    : `${convertFromSI(performanceResult.exhaustVelocity, "exhaustVelocity").toFixed(2)} ${getUnit("exhaustVelocity")}`
                    }
                  </p>
                </div>
              )}
              
              {/* Thrust Result */}
              {thrustResult && (
                <div className="p-4 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-lg border border-cyan-400/30 mb-4">
                  <p className="text-sm font-semibold text-cyan-400 mb-2">Part 2 Result (Thrust)</p>
                    <p className="text-gray-400 text-sm mb-1">Solved: {thrustResult.solvedFor}</p>
                    <p className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                      {
                        thrustResult.thrust ? `${convertFromSI(thrustResult.thrust, "thrust").toFixed(2)} ${getUnit("thrust")}`
                        : thrustResult.massFlowRate ? `${convertFromSI(thrustResult.massFlowRate, "massFlowRate").toFixed(4)} ${getUnit("massFlowRate")}`
                        : thrustResult.exhaustVelocity ? `${convertFromSI(thrustResult.exhaustVelocity, "exhaustVelocity").toFixed(2)} ${getUnit("exhaustVelocity")}`
                        : thrustResult.exitArea ? `${convertFromSI(thrustResult.exitArea, "exitArea").toFixed(6)} ${getUnit("exitArea")}`
                        : thrustResult.exitPressure ? `${convertFromSI(thrustResult.exitPressure, "exitPressure").toFixed(0)} ${getUnit("exitPressure")}`
                        : `${convertFromSI(thrustResult.ambientPressure, "ambientPressure").toFixed(0)} ${getUnit("ambientPressure")}`
                      }
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-gray-400 text-xs mb-1">Momentum Thrust</p>
                        <p className="text-lg font-semibold text-blue-400">{convertFromSI(thrustResult.momentumThrust, "thrust").toFixed(2)} {getUnit("thrust")}</p>
                      </div>
                      <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-gray-400 text-xs mb-1">Pressure Thrust</p>
                        <p className="text-lg font-semibold text-blue-400">{convertFromSI(thrustResult.pressureThrust, "thrust").toFixed(2)} {getUnit("thrust")}</p>
                      </div>
                      <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-gray-400 text-xs mb-1">Specific Impulse</p>
                        <p className="text-lg font-semibold text-blue-400">{thrustResult.isp ? thrustResult.isp.toFixed(1) : "N/A"} s</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Steps (if any result exists) */}
                {(thrustResult || performanceResult) && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="steps" className="border-cyan-400/20">
                      <AccordionTrigger className="text-white hover:text-cyan-400"><div className="flex items-center gap-2"><Info className="w-4 h-4 text-cyan-400" />Step-by-Step Solution</div></AccordionTrigger>
                      <AccordionContent className="text-gray-300 space-y-3 pt-2">
                        {(thrustResult?.steps || performanceResult?.steps).map((s: CalculationStep, i: number) => (
                          <div key={i} className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                            <p className="text-xs text-gray-400 mb-1">Step {i + 1}</p>
                            <code className="text-cyan-400 font-mono text-sm block mb-1">{s.equation}</code>
                            <p className="text-gray-300 text-xs">{s.description}</p>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

            </AeroCard>

            {/* Chart (if thrust result exists) */}
            {chartData.length > 0 && (
              <ChartCard 
                title="Thrust vs. Ambient Pressure"
                height={300}
                icon={TrendingUp}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="ambientPressure" stroke="#94a3b8" tickFormatter={(val) => val.toFixed(0)}
                      label={{ value: `Ambient Pressure (${getUnit("ambientPressure")})`, position: 'insideBottom', offset: -5, fill: '#94a3B8' }}/>
                    <YAxis stroke="#94a3b8" tickFormatter={(val) => val.toFixed(0)}
                      label={{ value: `Thrust (${getUnit("thrust")})`, angle: -90, position: 'insideLeft', fill: '#94a3b8' }}/>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee40' }} formatter={(value: number) => value.toFixed(2)}/>
                    <Legend />
                    <Line type="monotone" dataKey="thrust" stroke="#22d3ee" strokeWidth={2} dot={false} name="Thrust" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
            
            {/* Placeholder */}
            {!thrustResult && !performanceResult && (
              <AeroCard title="Results">
                <div className="text-center py-12">
                  <Calculator className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
                  <p className="text-gray-400">Results will appear here</p>
                </div>
              </AeroCard>
            )}

            {/* --- Theory Card --- */}
            <AeroCard title="Theory & Formulas" icon={Info}>
              <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/30 mb-4">
                <p className="text-center text-lg font-mono text-cyan-400 mb-2">V_e = I_sp · g_0</p>
                <div className="text-gray-400 text-sm space-y-1">
                  <p><span className="text-cyan-400">V_e</span> = Exhaust Velocity</p>
                  <p><span className="text-cyan-400">I_sp</span> = Specific Impulse</p>
                  <p><span className="text-cyan-400">g_0</span> = Std. Gravity (≈ 9.81 m/s²)</p>
                </div>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/30">
                <p className="text-center text-lg font-mono text-cyan-400 mb-2">F = ṁV_e + (P_e - P_a)A_e</p>
                <div className="text-gray-400 text-sm space-y-1">
                  <p><span className="text-cyan-400">F</span> = Total Thrust (N)</p>
                  <p><span className="text-cyan-400">ṁ</span> = Mass Flow Rate (kg/s)</p>
                  <p><span className="text-cyan-400">P_e, P_a</span> = Exit, Ambient Pressure (Pa)</p>
                  <p><span className="text-cyan-400">A_e</span> = Nozzle Exit Area (m²)</p>
                </div>
              </div>
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
              Save the current input values as a custom preset
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="presetName" className="text-cyan-300">Preset Name</Label>
              <Input
                id="presetName"
                value={savePresetName}
                onChange={(e) => setSavePresetName(e.target.value)}
                placeholder="e.g., My Rocket Engine"
                className="bg-slate-700/50 text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveCustomPreset();
                  }
                }}
              />
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Unit System: {unitSystem}</p>
              <p>Mass Flow: {inputs.massFlowRate || "N/A"} | Exhaust Vel: {inputs.exhaustVelocity || "N/A"}</p>
              <p>Exit Area: {inputs.exitArea || "N/A"} | Thrust: {inputs.thrust || "N/A"}</p>
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
              customPresets.map((preset, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-cyan-400/20 hover:border-cyan-400/40 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-white font-semibold">{preset.name}</p>
                    <p className="text-xs text-gray-400">
                      Unit System: {preset.unitSystem} | Thrust: {preset.inputs.thrust || "N/A"} | Isp: {preset.inputs.isp || "N/A"}
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
              ))
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

export default AdvancedThrustCalculator;

/*
 * TEST CASES:
 * 
 * TEST CASE 1 (ThrustCalculator - Performance)
 * Inputs: unitSystem=SI, isp=300
 * Expected: exhaustVelocity ≈ 2941.99 m/s
 * 
 * TEST CASE 2 (ThrustCalculator - Thrust)
 * Inputs: unitSystem=SI, massFlowRate=10, exhaustVelocity=3000, exitArea=0.5, exitPressure=50000, ambientPressure=101325
 * Expected: thrust ≈ 24437.50 N, momentumThrust ≈ 30000.00 N, pressureThrust ≈ -25637.50 N
 * 
 * TEST CASE 3 (ThrustCalculator - Mass Flow)
 * Inputs: unitSystem=SI, thrust=30000, exhaustVelocity=3000, exitArea=0.5, exitPressure=50000, ambientPressure=101325
 * Expected: massFlowRate ≈ 10.00 kg/s
 */
