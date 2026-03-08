"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useCalculationAnimation } from "@/hooks/useCalculationAnimation";
import { CalculationOverlay } from "@/components/common/CalculationOverlay";
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
import { Wind, Info, TrendingUp, Settings2, AlertTriangle, CheckCircle, Calculator } from "lucide-react";
import { z } from "zod";
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
import { CalculationSteps } from "@/components/common/CalculationSteps";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

type FlowRegime = "Laminar" | "Transitional" | "Turbulent";

type ToolPayload = {
  tool: string;
  // TODO: refine type for `inputs` — changed any -> unknown automatically by chore/typed-cleanup
  inputs: Record<string, unknown>;
  // TODO: refine type for `results` — changed any -> unknown automatically by chore/typed-cleanup
  results: Record<string, unknown>;
};

interface PresetScenario {
  name: string;
  density: number; // in SI (kg/m³)
  velocity: number; // in SI (m/s)
  length: number; // in SI (m)
  viscosity: number; // in SI (Pa·s)
  description: string;
}

interface CalculationStep {
  equation: string;
  description: string;
}

interface SavedPreset {
  name: string;
  inputs: {
    density: string;
    velocity: string;
    length: string;
    viscosity: string;
  };
  unitSystem: UnitSystem;
  timestamp: number;
}

const STORAGE_KEY_CUSTOM_PRESETS = "reynoldsCalculator_customPresets";

const PRESETS: Record<string, PresetScenario> = {
  "sea-level-air": {
    name: "Sea Level Air",
    density: 1.225, // kg/m³
    velocity: 50, // m/s
    length: 1.0, // m
    viscosity: 1.81e-5, // Pa·s
    description: "Standard sea level conditions (15°C, 101.325 kPa)"
  },
  "10km-altitude": {
    name: "10 km Altitude",
    density: 0.4135, // kg/m³
    velocity: 200, // m/s
    length: 1.0, // m
    viscosity: 1.46e-5, // Pa·s
    description: "High altitude flight conditions"
  },
  "water-20c": {
    name: "Water at 20°C",
    density: 998.2, // kg/m³
    velocity: 1.0, // m/s
    length: 0.1, // m
    viscosity: 1.002e-3, // Pa·s
    description: "Fresh water at standard temperature"
  },
  "jet-wing-chord": {
    name: "Jet Wing Chord",
    density: 1.225, // kg/m³
    velocity: 250, // m/s
    length: 3.0, // m
    viscosity: 1.81e-5, // Pa·s
    description: "Commercial jet aircraft wing chord"
  },
  "micro-drone-chord": {
    name: "Micro-drone Wing Chord",
    density: 1.225, // kg/m³
    velocity: 10, // m/s
    length: 0.05, // m (5 cm)
    viscosity: 1.81e-5, // Pa·s
    description: "Small UAV wing characteristic length"
  }
};

const RE_LAMINAR_THRESHOLD = 2300;
const RE_TURBULENT_THRESHOLD = 40000;

const reynoldsSchema = z.object({
  density: z.number().positive("Density must be positive"),
  velocity: z.number().nonnegative("Velocity cannot be negative"),
  length: z.number().positive("Length must be positive"),
  viscosity: z.number().positive("Viscosity must be positive"),
});

// --- Main Component ---
const ReynoldsNumberCalculator = () => {
  const { toast } = useToast();
  const { isCalculating, runCalculation } = useCalculationAnimation();
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [lastPayload, setLastPayload] = useState<ToolPayload | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");

  // --- State ---
  const [inputs, setInputs] = useState({
    density: "",
    velocity: "",
    length: "",
    viscosity: "",
  });

  const [customUnitNames, setCustomUnitNames] = useState({
    density: "Unit-ρ",
    velocity: "Unit-V",
    length: "Unit-L",
    viscosity: "Unit-μ",
  });

  const [customFactors, setCustomFactors] = useState({
    density: "1.0",
    velocity: "1.0",
    length: "1.0",
    viscosity: "1.0",
  });

  const [result, setResult] = useState<{
    reynoldsNumber: number;
    flowRegime: FlowRegime;
    steps: CalculationStep[];
    warnings: string[];
  } | null>(null);

  const applyToolPayload = (payload: ToolPayload) => {
    setLastPayload(payload);
    updateToolContext(payload);
  };

  const syncRequestId = (response?: { requestId?: string } | null) => {
    if (response?.requestId) {
      setLastRequestId(response.requestId);
    } else {
      const storedKeys = Object.keys(localStorage).filter((key) => key.startsWith("calc-"));
      if (storedKeys.length > 0) {
        const latestKey = storedKeys.sort().reverse()[0];
        setLastRequestId(latestKey.replace("calc-", ""));
      }
    }
  };

  // --- Effects for LocalStorage ---
  useEffect(() => {
    // TODO: refine type for `setter` and `defaultValue` — changed Function/any -> unknown automatically by chore/typed-cleanup
    const loadFromStorage = (key: string, setter: (...args: unknown[]) => unknown, defaultValue: unknown) => {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        try {
          setter(JSON.parse(storedValue));
        } catch (e) {
          if (key === "reynoldsCalc_unitSystem") setter(storedValue);
          else console.warn(`Failed to parse ${key} from storage.`);
        }
      } else {
        setter(defaultValue);
      }
    };

    loadFromStorage("reynoldsCalc_unitSystem", setUnitSystem, "SI");
    loadFromStorage("reynoldsCalc_inputs", setInputs, { density: "", velocity: "", length: "", viscosity: "" });
    loadFromStorage("reynoldsCalc_customNames", setCustomUnitNames, { density: "Unit-ρ", velocity: "Unit-V", length: "Unit-L", viscosity: "Unit-μ" });
    loadFromStorage("reynoldsCalc_customFactors", setCustomFactors, { density: "1.0", velocity: "1.0", length: "1.0", viscosity: "1.0" });
  }, []);

  useEffect(() => {
    localStorage.setItem("reynoldsCalc_unitSystem", unitSystem);
    localStorage.setItem("reynoldsCalc_inputs", JSON.stringify(inputs));
    localStorage.setItem("reynoldsCalc_customNames", JSON.stringify(customUnitNames));
    localStorage.setItem("reynoldsCalc_customFactors", JSON.stringify(customFactors));
  }, [unitSystem, inputs, customUnitNames, customFactors]);

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

  // --- Unit Conversion ---
  const getUnit = (field: string): string => {
    const units: Record<string, Record<UnitSystem, string>> = {
      density: { SI: "kg/m³", Imperial: "slug/ft³", Custom: customUnitNames.density },
      velocity: { SI: "m/s", Imperial: "ft/s", Custom: customUnitNames.velocity },
      length: { SI: "m", Imperial: "ft", Custom: customUnitNames.length },
      viscosity: { SI: "Pa·s", Imperial: "lb·s/ft²", Custom: customUnitNames.viscosity },
    };
    return units[field]?.[unitSystem] || "";
  };

  const convertToSI = (value: number, field: string): number => {
    if (unitSystem === "SI") return value;
    if (unitSystem === "Imperial") {
      switch (field) {
        case "density": return value * 515.379; // slug/ft³ to kg/m³
        case "velocity": return value * 0.3048; // ft/s to m/s
        case "length": return value * 0.3048; // ft to m
        case "viscosity": return value * 47.880; // lb·s/ft² to Pa·s
        default: return value;
      }
    }
    if (unitSystem === "Custom") {
      const factor = parseFloat(customFactors[field as keyof typeof customFactors]);
      return value * ((isNaN(factor) || factor === 0) ? 1.0 : factor);
    }
    return value;
  };

  const convertFromSI = (value: number, field: string): number => {
    if (unitSystem === "SI") return value;
    if (unitSystem === "Imperial") {
      switch (field) {
        case "density": return value / 515.379;
        case "velocity": return value / 0.3048;
        case "length": return value / 0.3048;
        case "viscosity": return value / 47.880;
        default: return value;
      }
    }
    if (unitSystem === "Custom") {
      const factor = parseFloat(customFactors[field as keyof typeof customFactors]);
      return value / ((isNaN(factor) || factor === 0) ? 1.0 : factor);
    }
    return value;
  };

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setSelectedPreset(""); // Clear preset when user manually changes inputs
  };

  const handlePresetChange = (presetKey: string) => {
    if (!presetKey || presetKey === "none") {
      setSelectedPreset("");
      return;
    }

    const preset = PRESETS[presetKey];
    if (preset) {
      setSelectedPreset(presetKey);
      setInputs({
        density: convertFromSI(preset.density, "density").toFixed(6),
        velocity: convertFromSI(preset.velocity, "velocity").toFixed(2),
        length: convertFromSI(preset.length, "length").toFixed(4),
        viscosity: convertFromSI(preset.viscosity, "viscosity").toFixed(8),
      });
    }
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
    setSelectedPreset("");
    setIsLoadDialogOpen(false);
    toast({ title: "Loaded", description: `Custom preset "${preset.name}" loaded!` });
  };

  const handleDeleteCustomPreset = (index: number) => {
    const preset = customPresets[index];
    setCustomPresets(customPresets.filter((_, i) => i !== index));
    toast({ title: "Deleted", description: `Custom preset "${preset.name}" deleted!` });
  };

  // --- Validation & Warnings ---
  const validateInputs = (): { valid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    
    const density = parseFloat(inputs.density);
    const velocity = parseFloat(inputs.velocity);
    const length = parseFloat(inputs.length);
    const viscosity = parseFloat(inputs.viscosity);

    // Check for empty fields
    if (!inputs.density || !inputs.velocity || !inputs.length || !inputs.viscosity) {
      return { valid: false, warnings: ["All fields must be filled"] };
    }

    // Check for non-numeric values
    if (isNaN(density) || isNaN(velocity) || isNaN(length) || isNaN(viscosity)) {
      return { valid: false, warnings: ["All values must be valid numbers"] };
    }

    // Convert to SI for validation
    const densitySI = convertToSI(density, "density");
    const velocitySI = convertToSI(velocity, "velocity");
    const lengthSI = convertToSI(length, "length");
    const viscositySI = convertToSI(viscosity, "viscosity");

    // Check for negative or zero values
    if (densitySI <= 0) warnings.push("Density must be positive");
    if (velocitySI < 0) warnings.push("Velocity cannot be negative");
    if (lengthSI <= 0) warnings.push("Length must be positive");
    if (viscositySI <= 0) warnings.push("Viscosity must be positive");

    if (warnings.length > 0) {
      return { valid: false, warnings };
    }

    // Warnings (non-blocking)
    if (viscositySI < 1e-6) warnings.push("Very low viscosity detected (< 1e-6 Pa·s)");
    if (viscositySI > 10) warnings.push("Unusually high viscosity detected (> 10 Pa·s)");

    return { valid: true, warnings };
  };

  // --- Calculation Function ---
  const calculateReynolds = async () => {
    const validation = validateInputs();
    if (!validation.valid) {
      toast({ 
        title: "Validation Error", 
        description: validation.warnings.join(", "), 
        variant: "destructive" 
      });
      return;
    }

    try {
      // Convert all inputs to SI
      const densitySI = convertToSI(parseFloat(inputs.density), "density");
      const velocitySI = convertToSI(parseFloat(inputs.velocity), "velocity");
      const lengthSI = convertToSI(parseFloat(inputs.length), "length");
      const viscositySI = convertToSI(parseFloat(inputs.viscosity), "viscosity");

      // Calculate Reynolds Number: Re = ρVL/μ
      const reynoldsNumber = (densitySI * velocitySI * lengthSI) / viscositySI;

      // Determine flow regime
      let flowRegime: FlowRegime;
      if (reynoldsNumber < RE_LAMINAR_THRESHOLD) {
        flowRegime = "Laminar";
      } else if (reynoldsNumber >= RE_LAMINAR_THRESHOLD && reynoldsNumber < RE_TURBULENT_THRESHOLD) {
        flowRegime = "Transitional";
      } else {
        flowRegime = "Turbulent";
      }

      // Generate step-by-step calculation
      const calculationSteps = [
        "Re = (ρ × V × L) / μ",
        `ρ = ${densitySI.toFixed(6)} kg/m³ (converted to SI)`,
        `V = ${velocitySI.toFixed(2)} m/s (converted to SI)`,
        `L = ${lengthSI.toFixed(4)} m (converted to SI)`,
        `μ = ${viscositySI.toExponential(3)} Pa·s (converted to SI)`,
        `Numerator = ρ × V × L = ${(densitySI * velocitySI * lengthSI).toExponential(3)}`,
        `Re = ${(densitySI * velocitySI * lengthSI).toExponential(3)} / ${viscositySI.toExponential(3)}`,
        `Re = ${reynoldsNumber.toExponential(3)}`,
        `Flow Regime: ${flowRegime} (Re ${flowRegime === "Laminar" ? "<" : flowRegime === "Transitional" ? "≥" : "≥"} ${flowRegime === "Laminar" ? "2,300" : flowRegime === "Transitional" ? "2,300 and < 40,000" : "40,000"})`
      ];

      const steps: CalculationStep[] = [
        {
          equation: "Re = (ρ × V × L) / μ",
          description: "Reynolds Number formula"
        },
        {
          equation: `ρ = ${densitySI.toFixed(6)} kg/m³`,
          description: "Fluid density (converted to SI)"
        },
        {
          equation: `V = ${velocitySI.toFixed(2)} m/s`,
          description: "Flow velocity (converted to SI)"
        },
        {
          equation: `L = ${lengthSI.toFixed(4)} m`,
          description: "Characteristic length (converted to SI)"
        },
        {
          equation: `μ = ${viscositySI.toExponential(3)} Pa·s`,
          description: "Dynamic viscosity (converted to SI)"
        },
        {
          equation: `Numerator = ρ × V × L = ${densitySI.toFixed(6)} × ${velocitySI.toFixed(2)} × ${lengthSI.toFixed(4)}`,
          description: "Calculate numerator"
        },
        {
          equation: `Numerator = ${(densitySI * velocitySI * lengthSI).toExponential(3)}`,
          description: "Numerator result"
        },
        {
          equation: `Re = ${(densitySI * velocitySI * lengthSI).toExponential(3)} / ${viscositySI.toExponential(3)}`,
          description: "Divide by viscosity"
        },
        {
          equation: `Re = ${reynoldsNumber.toExponential(3)}`,
          description: "Final Reynolds Number"
        },
        {
          equation: `Re ≈ ${reynoldsNumber.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
          description: "Rounded result"
        }
      ];

      // Additional warnings
      const warnings = [...validation.warnings];
      if (reynoldsNumber > 1e8) {
        warnings.push("Extreme flow regime detected (Re > 10⁸)");
      }

      const toolInputs = {
        densityInput: parseFloat(inputs.density),
        velocityInput: parseFloat(inputs.velocity),
        lengthInput: parseFloat(inputs.length),
        viscosityInput: parseFloat(inputs.viscosity),
        densitySI,
        velocitySI,
        lengthSI,
        viscositySI,
        unitSystem,
      };
      const toolResults = {
        reynoldsNumber,
        flowRegime,
        warnings,
      };

      const eventResponse = await sendCalculationEvent({
        toolId: "reynolds-calculator",
        toolName: "Reynolds Number Calculator",
        inputs: toolInputs,
        results: toolResults,
        steps: calculationSteps,
        metadata: {
          units: unitSystem,
          approxLevel: "exact",
          confidence: "high",
          warnings,
        },
      });

      syncRequestId(eventResponse);
      applyToolPayload({
        tool: "Reynolds Number Calculator",
        inputs: toolInputs,
        results: toolResults,
      });

      applyToolPayload({
        tool: "Reynolds Number Calculator",
        inputs: toolInputs,
        results: toolResults,
      });

      setResult({
        reynoldsNumber,
        flowRegime,
        steps,
        warnings
      });


    } catch (error) {
      toast({ 
        title: "Calculation Error", 
        description: (error as Error).message, 
        variant: "destructive" 
      });
    }
  };

  // --- Chart Data ---
  const chartData = useMemo(() => {
    if (!result) return [];

    const density = parseFloat(inputs.density);
    const velocity = parseFloat(inputs.velocity);
    const viscosity = parseFloat(inputs.viscosity);

    if (isNaN(density) || isNaN(velocity) || isNaN(viscosity)) return [];

    const densitySI = convertToSI(density, "density");
    const velocitySI = convertToSI(velocity, "velocity");
    const viscositySI = convertToSI(viscosity, "viscosity");

    const currentLength = parseFloat(inputs.length);
    const currentLengthSI = convertToSI(currentLength, "length");

    const data = [];
    const minLength = Math.max(0.01, currentLengthSI * 0.1);
    const maxLength = currentLengthSI * 10;

    for (let i = 0; i <= 50; i++) {
      const lengthSI = minLength + (maxLength - minLength) * (i / 50);
      const re = (densitySI * velocitySI * lengthSI) / viscositySI;
      data.push({
        length: convertFromSI(lengthSI, "length"),
        reynoldsNumber: re
      });
    }

    return data;
  }, [result, inputs, unitSystem, customFactors]);

  const resetCalculator = () => {
    setInputs({ density: "", velocity: "", length: "", viscosity: "" });
    setResult(null);
    setSelectedPreset("");
  };

  // --- Flow Regime Colors ---
  const getRegimeColor = (regime: FlowRegime): string => {
    switch (regime) {
      case "Laminar": return "from-green-400/10 to-emerald-400/10 border-green-400/30 text-green-400";
      case "Transitional": return "from-yellow-400/10 to-orange-400/10 border-yellow-400/30 text-yellow-400";
      case "Turbulent": return "from-red-400/10 to-pink-400/10 border-red-400/30 text-red-400";
    }
  };

  // --- Render ---
  return (
    <>
    <CalculationOverlay isActive={isCalculating} label="Analyzing Flow Regime" />
    <ToolWrapper>
      <ToolHeader
        title="Advanced Reynolds Number Calculator"
        description="Calculate Reynolds Number for fluid flow analysis. Determine flow regime (laminar, transitional, or turbulent)"
        icon={Wind}
        actions={
          <ToolActions>
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-muted/50 border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI (Metric)</SelectItem>
                <SelectItem value="Imperial">Imperial</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <AeroButton type="button" onClick={resetCalculator} variant="outline">Reset All</AeroButton>
          </ToolActions>
        }
      />

      <ToolSection gridCols={2}>
        {/* --- LEFT COLUMN (INPUTS) --- */}
        <div>
          <div className={spacingVertical.L}>
            {/* --- Preset Selector --- */}
            <AeroCard
              title="Preset Scenarios"
              description="Quick-select common aerospace and fluid flow conditions"
              icon={Settings2}
            >
              <AeroFormField label="Select a preset scenario">
                <Select value={selectedPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger className="bg-muted/50 border-border text-foreground">
                    <SelectValue placeholder="Select a preset scenario..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Custom Input)</SelectItem>
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>
                        {preset.name} - {preset.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPreset && PRESETS[selectedPreset] && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {PRESETS[selectedPreset].description}
                  </p>
                )}
              </AeroFormField>
              <div className="flex gap-2">
                <AeroButton
                  type="button"
                  onClick={() => setIsSaveDialogOpen(true)}
                  variant="outline"
                  icon={Save}
                >
                  Save Custom Preset
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
              </div>
            </AeroCard>

            {/* --- Input Fields --- */}
            <AeroCard
              title="Input Parameters"
              description="Enter fluid properties and flow conditions"
              icon={Calculator}
            >
              <AeroFormField label={`Fluid Density (ρ) ${getUnit("density")}`}>
                <Input 
                  id="density" 
                  type="number" 
                  step="0.000001" 
                  value={inputs.density} 
                  onChange={(e) => handleInputChange("density", e.target.value)} 
                  className="bg-muted/50" 
                  placeholder="e.g., 1.225" 
                />
              </AeroFormField>
              <AeroFormField label={`Velocity (V) ${getUnit("velocity")}`}>
                <Input 
                  id="velocity" 
                  type="number" 
                  step="0.01" 
                  value={inputs.velocity} 
                  onChange={(e) => handleInputChange("velocity", e.target.value)} 
                  className="bg-muted/50" 
                  placeholder="e.g., 50" 
                />
              </AeroFormField>
              <AeroFormField label={`Characteristic Length (L) ${getUnit("length")}`}>
                <Input 
                  id="length" 
                  type="number" 
                  step="0.001" 
                  value={inputs.length} 
                  onChange={(e) => handleInputChange("length", e.target.value)} 
                  className="bg-muted/50" 
                  placeholder="e.g., 1.0" 
                />
              </AeroFormField>
              <AeroFormField label={`Dynamic Viscosity (μ) ${getUnit("viscosity")}`}>
                <Input 
                  id="viscosity" 
                  type="number" 
                  step="0.00000001" 
                  value={inputs.viscosity} 
                  onChange={(e) => handleInputChange("viscosity", e.target.value)} 
                  className="bg-slate-900/50 border-cyan-400/30 text-white" 
                  placeholder="e.g., 1.81e-5" 
                />
              </AeroFormField>
              <AeroButton 
                type="button" 
                onClick={() => runCalculation(calculateReynolds)} 
                variant="primary"
                icon={Calculator}
                className="w-full"
              >
                Calculate Reynolds Number
              </AeroButton>
            </AeroCard>

            {/* --- Custom Units --- */}
            {unitSystem === "Custom" && (
              <AeroCard
                title="Custom Unit Definitions"
                description="Define conversion factors to SI (kg, m, s, Pa·s)"
                icon={Settings2}
              >
                {[
                  {id: 'density', label: 'Density (ρ)', unit: 'kg/m³'},
                  {id: 'velocity', label: 'Velocity (V)', unit: 'm/s'},
                  {id: 'length', label: 'Length (L)', unit: 'm'},
                  {id: 'viscosity', label: 'Viscosity (μ)', unit: 'Pa·s'},
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

        {/* --- RIGHT COLUMN (RESULTS) --- */}
        <div>
          <div className={spacingVertical.L}>
            {/* --- Results Card --- */}
            {result ? (
              <AeroCard
                title="Results"
                headerActions={
                  lastRequestId && lastPayload ? (
                    <div className="flex gap-2">
                      <AskAIButton 
                        requestId={lastRequestId} 
                        payload={buildAeroversePayload({
                          toolName: lastPayload.tool,
                          requestId: lastRequestId || undefined,
                          inputs: lastPayload.inputs,
                          results: lastPayload.results,
                        })}
                        disabled={!result}
                      />
                      <PDFExportButton 
                        requestId={lastRequestId} 
                        toolName="Reynolds Number Calculator"
                        disabled={!lastRequestId}
                      />
                    </div>
                  ) : null
                }
              >
                {/* Reynolds Number Result */}
                <div className="p-4 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-lg border border-cyan-400/30 mb-4">
                  <p className="text-sm font-semibold text-cyan-400 mb-2">Reynolds Number</p>
                      <p className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                        Re = {result.reynoldsNumber.toExponential(3)}
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        Re ≈ {result.reynoldsNumber.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                    </div>

                    {/* Flow Regime */}
                    <div className={`p-4 bg-gradient-to-r ${getRegimeColor(result.flowRegime)} rounded-lg border`}>
                      <p className="text-sm font-semibold mb-2">Flow Regime</p>
                      <p className="text-2xl font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                        {result.flowRegime}
                      </p>
                      <p className="text-sm mt-2 opacity-90">
                        {result.flowRegime === "Laminar" && "Re < 2,300 - Smooth, ordered flow"}
                        {result.flowRegime === "Transitional" && "2,300 ≤ Re < 40,000 - Mixed flow characteristics"}
                        {result.flowRegime === "Turbulent" && "Re ≥ 40,000 - Chaotic, mixed flow"}
                      </p>
                    </div>

                    {/* Warnings */}
                    {result.warnings.length > 0 && (
                      <div className="space-y-2">
                        {result.warnings.map((warning, idx) => (
                          <Alert key={idx} variant="default" className="bg-yellow-400/10 border-yellow-400/30">
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                            <AlertTitle className="text-yellow-400">Warning</AlertTitle>
                            <AlertDescription className="text-gray-300">{warning}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}

                    {/* Step-by-Step Calculation */}
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="steps" className="border-cyan-400/20">
                        <AccordionTrigger className="text-white hover:text-cyan-400">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-cyan-400" />
                            Step-by-Step Calculation
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <CalculationSteps steps={result.steps} />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
              </AeroCard>
            ) : (
              <AeroCard title="Results">
                <div className="text-center py-12">
                  <Calculator className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
                  <p className="text-gray-400">Results will appear here</p>
                </div>
              </AeroCard>
            )}

            {/* --- Physics Insights --- */}
            <AeroCard title="Physics Insights" icon={Info}>
              <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10 mb-4">
                <p className="text-cyan-400 font-semibold text-sm mb-1">Increasing Velocity</p>
                <p className="text-gray-300 text-xs">Higher flow speed increases Re, promoting turbulent flow</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10 mb-4">
                <p className="text-cyan-400 font-semibold text-sm mb-1">Increasing Viscosity</p>
                <p className="text-gray-300 text-xs">Higher viscosity decreases Re, stabilizing laminar flow</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10 mb-4">
                <p className="text-cyan-400 font-semibold text-sm mb-1">Longer Characteristic Length</p>
                <p className="text-gray-300 text-xs">Larger dimensions increase Re, making flow more turbulent</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                <p className="text-cyan-400 font-semibold text-sm mb-1">Higher Altitude</p>
                <p className="text-gray-300 text-xs">Lower air density at altitude reduces Re for the same velocity</p>
              </div>
            </AeroCard>

            {/* --- Formula Card --- */}
            <AeroCard title="Formula" icon={Info}>
              <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/30">
                <p className="text-center text-lg font-mono text-cyan-400 mb-2">Re = (ρ × V × L) / μ</p>
                <div className="text-gray-400 text-sm space-y-1">
                  <p><span className="text-cyan-400">Re</span> = Reynolds Number (dimensionless)</p>
                  <p><span className="text-cyan-400">ρ</span> = Fluid Density (kg/m³)</p>
                  <p><span className="text-cyan-400">V</span> = Flow Velocity (m/s)</p>
                  <p><span className="text-cyan-400">L</span> = Characteristic Length (m)</p>
                  <p><span className="text-cyan-400">μ</span> = Dynamic Viscosity (Pa·s)</p>
                </div>
              </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/30">
                  <p className="text-cyan-400 font-semibold text-sm mb-2">Flow Regime Thresholds</p>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>• <span className="text-green-400">Laminar:</span> Re &lt; 2,300</p>
                    <p>• <span className="text-yellow-400">Transitional:</span> 2,300 ≤ Re &lt; 40,000</p>
                    <p>• <span className="text-red-400">Turbulent:</span> Re ≥ 40,000</p>
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
                placeholder="e.g., My Custom Flow"
                className="bg-slate-700/50 text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveCustomPreset();
                  }
                }}
              />
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Density: {inputs.density || "N/A"} {getUnit("density")}</p>
              <p>Velocity: {inputs.velocity || "N/A"} {getUnit("velocity")}</p>
              <p>Length: {inputs.length || "N/A"} {getUnit("length")}</p>
              <p>Viscosity: {inputs.viscosity || "N/A"} {getUnit("viscosity")}</p>
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
                      ρ: {preset.inputs.density} | V: {preset.inputs.velocity} | L: {preset.inputs.length} | μ: {preset.inputs.viscosity}
                    </p>
                    <p className="text-xs text-gray-500">
                      Unit System: {preset.unitSystem} | Saved: {new Date(preset.timestamp).toLocaleDateString()}
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
    </ToolWrapper>
    </>
  );
};

export default ReynoldsNumberCalculator;

