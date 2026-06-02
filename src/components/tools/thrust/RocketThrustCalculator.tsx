"use client";

/**
 * Unified Rocket Thrust Calculator
 * 
 * MERGED single-panel design:
 * - Input mode toggle: "Direct Values" (enter Ve) or "From Isp" (enter Isp, auto-compute Ve)
 * - Single "Calculate" button solves the thrust equation F = ṁVe + (Pe-Pa)Ae
 * - Supports solving for ANY variable (leave one blank)
 * - Added Nozzle Metrics: Chamber Pressure (Pc), Throat Area (At) -> Thrust Coefficient (Cf)
 * - Added Performance Sweep: Toggle between Ambient Pressure and Altitude (ISA model)
 */

import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Rocket, Info, TrendingUp, Settings2, Beaker, ExternalLink, Save, FolderOpen, Trash2, Wind } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useToolContext } from "@/hooks/useToolContext";
import { useDesignSession } from "@/contexts/designSession";
import { FIELD_KEYS } from "@/components/tools/utils/interlinkConfig";
import { InlineInterlinkHint } from "@/components/common/InterlinkCTA";
import { PDFExportButton } from "@/components/tools/PDFExportButton";
import { AskAIButton } from "@/components/tools/AskAIButton";
import { buildAeroversePayload } from "@/ai/buildPayload";
import { buildCalculationEvent } from "@/lib/events/payloadBuilder";
import type { AeroverseAIPayload } from "@/ai/schema/AerorbisPayload";
import { ToolWrapper } from "@/components/layout/ToolWrapper";
import { ToolHeader } from "@/components/layout/ToolHeader";
import { ToolSection } from "@/components/layout/ToolSection";
import { ToolActions } from "@/components/layout/ToolActions";
import { CalculationSteps } from "@/components/common/CalculationSteps";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroFormField } from "@/components/forms/AeroFormField";
import { AeroButton } from "@/components/common/AeroButton";
import { ChartCard } from "@/components/charts/ChartCard";
import { AeroverseLegend, type LegendItem } from "@/components/charts/AerorbisLegend";
import { spacingVertical } from "@/styles/spacing";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Legend
} from "recharts";
import { calculateAtmosphere } from "@/tools/atmosphere/utils/calcAtmosphere";
import { solveForMe } from "@/tools/rocketEngine/utils/numeric";
import {
  pressureRatioFromMach,
  temperatureRatioFromMach,
} from "@/tools/rocketEngine/utils/isentropic";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type UnitSystem = "SI" | "Imperial" | "Custom";
type VelocityInputMode = "direct" | "fromIsp";
type RocketTier = "Beginner" | "University" | "Expert";
type ChartMode = "altitude" | "pressure" | "nozzle" | "ispAlt" | "machNozzle" | "cfEpsilon" | "mdotPc";

interface CalculationStep {
  equation: string;
  description: string;
}

interface ChartPoint {
  altitude?: number;
  thrust?: number;
  pressure?: number;
  momentumThrust?: number;
  pressureThrust?: number;
  ambientPressure?: number;
  exitPressure?: number;
  ratio?: number;
  isp?: number;
  // Mach-along-nozzle
  areaRatio?: number;
  mach?: number;
  pRatio?: number;
  tRatio?: number;
  // Cf vs epsilon
  epsilon?: number;
  cf?: number;
  // mdot vs Pc
  pc?: number;
  mdot?: number;
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
    chamberPressure: string;
    throatArea: string;
  };
  unitSystem: UnitSystem;
  timestamp: number;
}

interface ThrustResult {
  thrust: number;
  massFlowRate: number;
  exhaustVelocity: number;
  exitArea: number;
  exitPressure: number;
  ambientPressure: number;
  momentumThrust: number;
  pressureThrust: number;
  isp: number;
  ispVacuum: number;
  cf?: number;
  chamberPressure?: number;
  throatArea?: number;
  solvedFor: string;
  steps: CalculationStep[];
}

const PROPELLANT_PRESETS = [
  { id: "lox-rp1", name: "LOX / RP-1", isp: 311, ve: 3050, description: "Kerolox (Merlin-class)" },
  { id: "lox-lh2", name: "LOX / LH₂", isp: 452, ve: 4432, description: "Hydrolox (RS-25-class)" },
  { id: "lox-ch4", name: "LOX / CH₄", isp: 363, ve: 3560, description: "Methalox (Raptor-class)" },
  { id: "n2o4-udmh", name: "N₂O₄ / UDMH", isp: 320, ve: 3138, description: "Hypergolic storable" },
  { id: "solid-apcp", name: "Solid (APCP)", isp: 268, ve: 2628, description: "Composite solid propellant" },
  { id: "hydrazine", name: "Hydrazine (Mono)", isp: 230, ve: 2255, description: "Monopropellant" },
] as const;

const G0_SI = 9.80665;
const thrustSchema = z.object({
  massFlowRate: z.number().finite().optional(),
  exhaustVelocity: z.number().finite().optional(),
  exitArea: z.number().finite().optional(),
  exitPressure: z.number().finite().optional(),
  ambientPressure: z.number().finite().optional(),
  thrust: z.number().finite().optional(),
  chamberPressure: z.number().finite().optional(),
  throatArea: z.number().finite().optional(),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const RocketThrustCalculator = () => {
  const { toast } = useToast();
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const { data: designSession } = useDesignSession();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<AeroverseAIPayload | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [veMode, setVeMode] = useState<VelocityInputMode>("direct");

  const [inputs, setInputs] = useState({
    massFlowRate: "",
    exhaustVelocity: "",
    exitArea: "",
    exitPressure: "",
    ambientPressure: "",
    thrust: "",
    isp: "",
    chamberPressure: "",
    throatArea: "",
  });

  const [customUnitNames, setCustomUnitNames] = useState({
    thrust: "Units", massFlowRate: "Units", exhaustVelocity: "Units", exitArea: "Units", pressure: "Units"
  });
  const [customFactors, setCustomFactors] = useState({
    thrust: "1.0", massFlowRate: "1.0", exhaustVelocity: "1.0", exitArea: "1.0", pressure: "1.0"
  });

  const [result, setResult] = useState<ThrustResult | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartMode, setChartMode] = useState<ChartMode>("altitude");
  const [tier, setTier] = useState<RocketTier>("University");
  const [gamma, setGamma] = useState<string>("1.2");
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");

  const getUnit = (field: string) => {
    if (unitSystem === "SI") {
      if (field === "massFlowRate") return "kg/s";
      if (field === "exhaustVelocity") return "m/s";
      if (field === "exitArea") return "m²";
      if (field === "exitPressure" || field === "ambientPressure" || field === "chamberPressure") return "Pa";
      if (field === "thrust") return "N";
      if (field === "isp") return "s";
    }
    if (unitSystem === "Imperial") {
      if (field === "massFlowRate") return "lb/s";
      if (field === "exhaustVelocity") return "ft/s";
      if (field === "exitArea") return "ft²";
      if (field === "exitPressure" || field === "ambientPressure" || field === "chamberPressure") return "psi";
      if (field === "thrust") return "lbf";
      if (field === "isp") return "s";
    }
    if (unitSystem === "Custom") {
      let key = field;
      if (field === "exitPressure" || field === "ambientPressure" || field === "chamberPressure") key = "pressure";
      return customUnitNames[key as keyof typeof customUnitNames] || "Units";
    }
    return "";
  };

  const convertToSI = (value: number, field: string) => {
    if (unitSystem === "SI") return value;
    if (unitSystem === "Imperial") {
      switch (field) {
        case "massFlowRate": return value * 0.453592;
        case "exhaustVelocity": return value * 0.3048;
        case "exitArea": return value * 0.092903;
        case "exitPressure":
        case "ambientPressure":
        case "chamberPressure": return value * 6894.76;
        case "thrust": return value * 4.44822;
        default: return value;
      }
    }
    if (unitSystem === "Custom") {
      let key = field;
      if (field === "exitPressure" || field === "ambientPressure" || field === "chamberPressure") key = "pressure";
      return value * parseFloat(customFactors[key as keyof typeof customFactors] || "1.0");
    }
    return value;
  };

  const convertFromSI = (value: number, field: string) => {
    if (unitSystem === "SI") return value;
    if (unitSystem === "Imperial") {
      switch (field) {
        case "massFlowRate": return value / 0.453592;
        case "exhaustVelocity": return value / 0.3048;
        case "exitArea": return value / 0.092903;
        case "exitPressure":
        case "ambientPressure":
        case "chamberPressure": return value / 6894.76;
        case "thrust": return value / 4.44822;
        default: return value;
      }
    }
    if (unitSystem === "Custom") {
      let key = field;
      if (field === "exitPressure" || field === "ambientPressure" || field === "chamberPressure") key = "pressure";
      const factor = parseFloat(customFactors[key as keyof typeof customFactors]);
      return value / (factor || 1.0);
    }
    return value;
  };

  const syncChartData = useCallback((f: number, mdot: number, ve: number, ae: number, pe: number, pa: number, mode: "pressure" | "altitude" | "nozzle") => {
    if (mdot > 0 && ve > 0 && ae > 0 && pe > 0) {
      const data = [];
      if (mode === "pressure") {
        const pa_base = pa || 101325;
        const maxPa = Math.max(pa_base * 2, 202650);
        const stepSize = maxPa / 20;
        for (let pa_current = 0; pa_current <= maxPa; pa_current += stepSize) {
          const momentumThrust = mdot * ve;
          const pressureThrust = (pe - pa_current) * ae;
          const force = momentumThrust + pressureThrust;
          data.push({
            ambientPressure: convertFromSI(pa_current, "ambientPressure"),
            thrust: convertFromSI(force, "thrust"),
            momentumThrust: convertFromSI(momentumThrust, "thrust"),
            pressureThrust: convertFromSI(pressureThrust, "thrust")
          });
        }
      } else if (mode === "altitude") {
        // Altitude Sweep (ISA Atmosphere)
        for (let h = 0; h <= 150000; h += 5000) {
          const atm = calculateAtmosphere(h);
          const momentumThrust = mdot * ve;
          const pressureThrust = (pe - atm.pressure) * ae;
          const force = momentumThrust + pressureThrust;
          data.push({
            altitude: unitSystem === "Imperial" ? h / 0.3048 : h / 1000,
            thrust: convertFromSI(force, "thrust"),
            pressure: convertFromSI(atm.pressure, "ambientPressure"),
            momentumThrust: convertFromSI(momentumThrust, "thrust"),
            pressureThrust: convertFromSI(pressureThrust, "thrust")
          });
        }
      } else if (mode === "nozzle") {
        // Nozzle Exit Pressure vs Ambient Pressure
        const pa_base = 101325; // SL
        for (let h = 0; h <= 150000; h += 5000) {
          const atm = calculateAtmosphere(h);
          data.push({
            altitude: unitSystem === "Imperial" ? h / 0.3048 : h / 1000,
            exitPressure: convertFromSI(pe, "exitPressure"),
            ambientPressure: convertFromSI(atm.pressure, "ambientPressure"),
            ratio: pe / (atm.pressure || 0.0001)
          });
        }
      }
      setChartData(data);
    } else {
      setChartData([]);
    }
  }, [unitSystem, customFactors, customUnitNames, convertFromSI]);

  useEffect(() => {
    if (result) {
      syncChartData(result.thrust, result.massFlowRate, result.exhaustVelocity, result.exitArea, result.exitPressure, result.ambientPressure, chartMode);
    }
  }, [chartMode, unitSystem, result, syncChartData]);

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handlePropellantPreset = (presetId: string) => {
    const preset = PROPELLANT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const veDisplay = convertFromSI(preset.ve, "exhaustVelocity");
    setInputs(prev => ({
      ...prev,
      isp: preset.isp.toString(),
      exhaustVelocity: veDisplay.toFixed(2),
    }));
    toast({ title: "Preset Loaded", description: `${preset.name} — Isp: ${preset.isp}s` });
  };

  const handleSaveCustomPreset = () => {
    if (!savePresetName.trim()) return;
    const newPreset: SavedPreset = {
      name: savePresetName.trim(),
      inputs: { ...inputs },
      unitSystem,
      timestamp: Date.now(),
    };
    setCustomPresets([...customPresets, newPreset]);
    setSavePresetName("");
    setIsSaveDialogOpen(false);
    toast({ title: "Success", description: `Preset "${newPreset.name}" saved!` });
  };

  const handleLoadCustomPreset = (preset: SavedPreset) => {
    setInputs(preset.inputs);
    setUnitSystem(preset.unitSystem);
    setIsLoadDialogOpen(false);
  };

  const handleDeleteCustomPreset = (index: number) => {
    setCustomPresets(customPresets.filter((_, i) => i !== index));
  };

  const calculateThrust = async () => {
    try {
      let effectiveVeStr = inputs.exhaustVelocity;
      if (veMode === "fromIsp" && inputs.isp.trim()) {
        const ispVal = parseFloat(inputs.isp);
        if (isNaN(ispVal) || ispVal <= 0) throw new Error("Isp must be positive");
        const veSI = ispVal * G0_SI;
        effectiveVeStr = convertFromSI(veSI, "exhaustVelocity").toFixed(2);
        setInputs(prev => ({ ...prev, exhaustVelocity: effectiveVeStr }));
      }

      const rawValues = {
        massFlowRate: inputs.massFlowRate.trim() ? convertToSI(parseFloat(inputs.massFlowRate), "massFlowRate") : undefined,
        exhaustVelocity: effectiveVeStr.trim() ? convertToSI(parseFloat(effectiveVeStr), "exhaustVelocity") : undefined,
        exitArea: inputs.exitArea.trim() ? convertToSI(parseFloat(inputs.exitArea), "exitArea") : undefined,
        exitPressure: inputs.exitPressure.trim() ? convertToSI(parseFloat(inputs.exitPressure), "exitPressure") : undefined,
        ambientPressure: inputs.ambientPressure.trim() ? convertToSI(parseFloat(inputs.ambientPressure), "ambientPressure") : undefined,
        thrust: inputs.thrust.trim() ? convertToSI(parseFloat(inputs.thrust), "thrust") : undefined,
        chamberPressure: inputs.chamberPressure.trim() ? convertToSI(parseFloat(inputs.chamberPressure), "chamberPressure") : undefined,
        throatArea: inputs.throatArea.trim() ? convertToSI(parseFloat(inputs.throatArea), "throatArea") : undefined,
      };

      const emptyFields = Object.entries(rawValues).filter(([k, v]) => v === undefined && !["chamberPressure", "throatArea"].includes(k));
      if (emptyFields.length !== 1) throw new Error("Leave exactly ONE field blank to solve (excluding optional Pc/At)");

      const validated = thrustSchema.parse(rawValues);
      const solveFor = emptyFields[0][0];
      const steps: CalculationStep[] = [{ equation: "F = ṁVe + (Pe - Pa)Ae", description: "Thrust equation" }];

      let resultThrust = 0, resultMdot = 0, resultVe = 0, resultAe = 0, resultPe = 0, resultPa = 0;
      let momentumThrust = 0, pressureThrust = 0;

      const m = validated.massFlowRate || 0, v = validated.exhaustVelocity || 0, a = validated.exitArea || 0, pe = validated.exitPressure || 0, pa = validated.ambientPressure || 0, f = validated.thrust || 0;

      if (solveFor === "thrust") {
        momentumThrust = m * v; pressureThrust = (pe - pa) * a; resultThrust = momentumThrust + pressureThrust;
        resultMdot = m; resultVe = v; resultAe = a; resultPe = pe; resultPa = pa;
      } else if (solveFor === "massFlowRate") {
        pressureThrust = (pe - pa) * a; resultMdot = (f - pressureThrust) / v; momentumThrust = resultMdot * v;
        resultThrust = f; resultVe = v; resultAe = a; resultPe = pe; resultPa = pa;
      } else if (solveFor === "exhaustVelocity") {
        pressureThrust = (pe - pa) * a; resultVe = (f - pressureThrust) / m; momentumThrust = m * resultVe;
        resultThrust = f; resultMdot = m; resultAe = a; resultPe = pe; resultPa = pa;
      } else if (solveFor === "exitArea") {
        momentumThrust = m * v; resultAe = (f - momentumThrust) / (pe - pa); pressureThrust = (pe - pa) * resultAe;
        resultThrust = f; resultMdot = m; resultVe = v; resultPe = pe; resultPa = pa;
      } else if (solveFor === "exitPressure") {
        momentumThrust = m * v; resultPe = pa + (f - momentumThrust) / a; pressureThrust = (resultPe - pa) * a;
        resultThrust = f; resultMdot = m; resultVe = v; resultAe = a; resultPa = pa;
      } else if (solveFor === "ambientPressure") {
        momentumThrust = m * v; resultPa = pe - (f - momentumThrust) / a; pressureThrust = (pe - resultPa) * a;
        resultThrust = f; resultMdot = m; resultVe = v; resultAe = a; resultPe = pe;
      }

      const resultPc = validated.chamberPressure || 0;
      const resultAt = validated.throatArea || 0;
      let cf: number | undefined;
      if (resultPc > 0 && resultAt > 0) {
        cf = resultThrust / (resultPc * resultAt);
        steps.push({ equation: `Cf = F / (Pc * At) = ${cf.toFixed(4)}`, description: "Thrust Coefficient" });
      }

      const isp = resultVe / G0_SI;
      const ispVacuum = (resultMdot > 0) ? (resultVe + (resultPe * resultAe / resultMdot)) / G0_SI : isp;

      const calcResult: ThrustResult = {
        thrust: resultThrust, massFlowRate: resultMdot, exhaustVelocity: resultVe, exitArea: resultAe, exitPressure: resultPe, ambientPressure: resultPa,
        momentumThrust, pressureThrust, isp, ispVacuum, cf, chamberPressure: resultPc || undefined, throatArea: resultAt || undefined,
        solvedFor: solveFor, steps
      };

      setResult(calcResult);

      const payload = buildAeroversePayload({
        toolName: "Thrust Calculator",
        inputs: { m_dot: resultMdot, ve: resultVe, ae: resultAe, pe: resultPe, pa: resultPa, solvedFor: solveFor },
        results: { thrust: resultThrust, isp, isp_vac: ispVacuum, cf },
        units: { thrust: "N", isp: "s" },
      });

      await updateToolContext(payload);
      syncChartData(resultThrust, resultMdot, resultVe, resultAe, resultPe, resultPa, chartMode);
      sendCalculationEvent(buildCalculationEvent({
        toolId: "rocket_thrust",
        toolName: "Rocket Thrust Calculator",
        inputs: { m_dot: resultMdot, ve: resultVe, ae: resultAe, pe: resultPe, pa: resultPa, solvedFor: solveFor },
        results: { thrust: resultThrust, isp, isp_vac: ispVacuum, cf },
      }));

    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const resetCalculator = () => {
    setInputs({ massFlowRate: "", exhaustVelocity: "", exitArea: "", exitPressure: "", ambientPressure: "", thrust: "", isp: "", chamberPressure: "", throatArea: "" });
    setResult(null);
    setChartData([]);
  };

  return (
    <ToolWrapper>
      <ToolHeader
        title="Rocket Thrust Calculator"
        description="Solve F = ṁVe + (Pe − Pa)Ae"
        icon={Rocket}
        actions={
          <ToolActions>
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-muted/50 border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI (Metric)</SelectItem>
                <SelectItem value="Imperial">Imperial</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <AeroButton type="button" onClick={resetCalculator} variant="outline">Reset</AeroButton>
            <AeroButton type="button" onClick={() => setIsSaveDialogOpen(true)} variant="outline" icon={Save}>Save</AeroButton>
            <AeroButton type="button" onClick={() => setIsLoadDialogOpen(true)} variant="outline" icon={FolderOpen}>Load</AeroButton>
          </ToolActions>
        }
      />

      <ToolSection gridCols={2}>
        <div>
          <div className={spacingVertical.L}>
            <AeroCard title="Propellant Presets" icon={Beaker}>
              <div className="grid grid-cols-2 gap-2">
                {PROPELLANT_PRESETS.map(p => (
                  <button key={p.id} onClick={() => handlePropellantPreset(p.id)} className="text-left p-2 rounded bg-muted/30 border border-border/50 hover:border-primary/40 transition-all">
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">Isp: {p.isp}s</p>
                  </button>
                ))}
              </div>
            </AeroCard>

            <AeroCard title="Input Parameters" icon={Calculator}>
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground mb-2 block">Input Mode</Label>
                <div className="flex gap-2">
                  <button onClick={() => setVeMode("direct")} className={`flex-1 py-1 rounded text-xs ${veMode === "direct" ? "bg-primary/20 text-primary border-primary/40" : "bg-muted/50 text-muted-foreground"}`}>Direct Ve</button>
                  <button onClick={() => setVeMode("fromIsp")} className={`flex-1 py-1 rounded text-xs ${veMode === "fromIsp" ? "bg-primary/20 text-primary border-primary/40" : "bg-muted/50 text-muted-foreground"}`}>From Isp</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {veMode === "fromIsp" ? (
                  <AeroFormField label={`Specific Impulse (Isp, ${getUnit("isp")})`}>
                    <Input value={inputs.isp} onChange={(e) => handleInputChange("isp", e.target.value)} type="number" placeholder="e.g. 311" />
                  </AeroFormField>
                ) : (
                  <AeroFormField label={`Exhaust Velocity (Ve, ${getUnit("exhaustVelocity")})`}>
                    <Input value={inputs.exhaustVelocity} onChange={(e) => handleInputChange("exhaustVelocity", e.target.value)} type="number" placeholder="Blank to solve" />
                  </AeroFormField>
                )}
                <AeroFormField label={`Mass Flow Rate (ṁ, ${getUnit("massFlowRate")})`}>
                  <Input value={inputs.massFlowRate} onChange={(e) => handleInputChange("massFlowRate", e.target.value)} type="number" />
                </AeroFormField>
                <AeroFormField label={`Total Thrust (${getUnit("thrust")})`}>
                  <Input value={inputs.thrust} onChange={(e) => handleInputChange("thrust", e.target.value)} type="number" />
                </AeroFormField>
                <AeroFormField label={`Exit Area (Ae, ${getUnit("exitArea")})`}>
                  <Input value={inputs.exitArea} onChange={(e) => handleInputChange("exitArea", e.target.value)} type="number" />
                </AeroFormField>
                <AeroFormField label={`Exit Pressure (Pe, ${getUnit("exitPressure")})`}>
                  <Input value={inputs.exitPressure} onChange={(e) => handleInputChange("exitPressure", e.target.value)} type="number" />
                </AeroFormField>
                <AeroFormField label={`Ambient Pressure (Pa, ${getUnit("ambientPressure")})`}>
                  <Input value={inputs.ambientPressure} onChange={(e) => handleInputChange("ambientPressure", e.target.value)} type="number" />
                  {unitSystem === "SI" && <InlineInterlinkHint fieldKey={FIELD_KEYS.pressurePa} currentValue={inputs.ambientPressure} onImport={(v) => handleInputChange("ambientPressure", String(v))} />}
                </AeroFormField>
              </div>

              <Accordion type="single" collapsible className="mt-4">
                <AccordionItem value="advanced" className="border-border">
                  <AccordionTrigger className="text-xs">Advanced (Cf calculation)</AccordionTrigger>
                  <AccordionContent className="grid grid-cols-2 gap-4">
                    <AeroFormField label={`Chamber Pressure (Pc, ${getUnit("exitPressure")})`}><Input value={inputs.chamberPressure} onChange={(e) => handleInputChange("chamberPressure", e.target.value)} type="number" /></AeroFormField>
                    <AeroFormField label={`Throat Area (At, ${getUnit("exitArea")})`}><Input value={inputs.throatArea} onChange={(e) => handleInputChange("throatArea", e.target.value)} type="number" /></AeroFormField>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <AeroButton onClick={calculateThrust} variant="primary" className="w-full mt-6">Calculate</AeroButton>
            </AeroCard>
          </div>
        </div>

        <div>
          <div className={spacingVertical.L}>
            <AeroCard title="Results">
              {result ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                    <p className="text-xs text-primary mb-1 uppercase font-bold">Solved: {result.solvedFor}</p>
                    <p className="text-2xl font-bold text-primary">{convertFromSI(result[result.solvedFor as keyof ThrustResult] as number, result.solvedFor).toFixed(4)} {getUnit(result.solvedFor)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/50 rounded border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase">Isp (SL)</p>
                      <p className="text-sm font-semibold">{result.isp.toFixed(1)} s</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase">Isp (VAC)</p>
                      <p className="text-sm font-semibold text-emerald-400">{result.ispVacuum.toFixed(1)} s</p>
                    </div>
                    {result.cf && (
                      <div className="p-2 bg-muted/50 rounded border border-emerald-400/30 col-span-2">
                        <p className="text-[10px] text-muted-foreground uppercase">Thrust Coefficient (Cf)</p>
                        <p className="text-sm font-semibold text-emerald-400">{result.cf.toFixed(4)}</p>
                      </div>
                    )}
                  </div>
                  <CalculationSteps steps={result.steps} />
                </div>
              ) : (
                <div className="py-20 text-center text-muted-foreground">Perform a calculation to see results</div>
              )}
            </AeroCard>

            {chartData.length > 0 ? (
              <ChartCard title={chartMode === "nozzle" ? "Nozzle Expansion" : "Performance Sweep"} headerActions={
                <div className="flex bg-muted/50 rounded p-1 gap-1">
                  <button onClick={() => setChartMode("altitude")} className={`px-2 py-0.5 text-[10px] rounded transition-colors ${chartMode === "altitude" ? "bg-primary text-white" : "hover:bg-muted"}`}>Altitude</button>
                  <button onClick={() => setChartMode("nozzle")} className={`px-2 py-0.5 text-[10px] rounded transition-colors ${chartMode === "nozzle" ? "bg-primary text-white" : "hover:bg-muted"}`}>Nozzle</button>
                  <button onClick={() => setChartMode("pressure")} className={`px-2 py-0.5 text-[10px] rounded transition-colors ${chartMode === "pressure" ? "bg-primary text-white" : "hover:bg-muted"}`}>Ambient</button>
                </div>
              }>
                <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    {chartMode === "nozzle" ? (
                      <>
                        <XAxis dataKey="altitude" tick={{fontSize: 10}} label={{ value: unitSystem === "Imperial" ? "ft" : "km", position: "insideBottomRight", offset: -5, fontSize: 10 }} />
                        <YAxis tick={{fontSize: 10}} scale="log" domain={['auto', 'auto']} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: '10px' }} />
                        <Line type="monotone" name="Exit Pressure" dataKey="exitPressure" stroke="#10b981" dot={false} strokeWidth={2} />
                        <Line type="monotone" name="Ambient Pressure" dataKey="ambientPressure" stroke="#94a3b8" dot={false} strokeDasharray="5 5" />
                        <ReferenceLine y={convertFromSI(101325, "ambientPressure")} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "SL", fontSize: 8, fill: "#ef4444" }} />
                      </>
                    ) : (
                      <>
                        <XAxis dataKey={chartMode === "pressure" ? "ambientPressure" : "altitude"} tick={{fontSize: 10}} label={{ value: chartMode === "pressure" ? "Pa" : (unitSystem === "Imperial" ? "ft" : "km"), position: "insideBottomRight", offset: -5, fontSize: 10 }} />
                        <YAxis tick={{fontSize: 10}} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: '10px' }} />
                        <Line type="monotone" name="Total Thrust" dataKey="thrust" stroke="hsl(var(--primary))" dot={false} strokeWidth={3} />
                        <Line type="monotone" name="Momentum Thrust" dataKey="momentumThrust" stroke="#3b82f6" dot={false} strokeOpacity={0.5} />
                        <Line type="monotone" name="Pressure Thrust" dataKey="pressureThrust" stroke="#f59e0b" dot={false} strokeOpacity={0.5} />
                      </>
                    )}
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  </LineChart>
                </ResponsiveContainer>
                </div>
              </ChartCard>
            ) : (
              <ChartCard title="Performance Sweep">
                <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/50 transition-all">
                  <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">Enter mass flow, velocity, area, and pressure</p>
                  <p className="text-[10px] opacity-50 mt-1">Graph will generate automatically</p>
                </div>
              </ChartCard>
            )}
          </div>
        </div>
      </ToolSection>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save Preset</DialogTitle></DialogHeader>
          <Input value={savePresetName} onChange={e => setSavePresetName(e.target.value)} placeholder="Preset Name" />
          <DialogFooter><Button onClick={handleSaveCustomPreset}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Load Preset</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {customPresets.map((p, i) => (
              <div key={i} className="flex justify-between items-center p-2 border rounded">
                <span>{p.name}</span>
                <div className="space-x-2">
                  <Button size="sm" onClick={() => handleLoadCustomPreset(p)}>Load</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteCustomPreset(i)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </ToolWrapper>
  );
};

export default RocketThrustCalculator;
