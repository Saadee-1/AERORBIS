"use client";

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
import { Gauge, Plane, Info, TrendingUp, Settings2, AlertTriangle, CheckCircle, Wind, Anchor } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
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
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from "recharts";

type UnitSystem = "SI" | "Imperial" | "Custom";
type PresetCondition = "Takeoff" | "Cruise" | "Landing" | "Custom";

interface CalculationStep {
  equation: string;
  description: string;
}

// --- Zod Schemas ---
const basicSchema = z.object({
  weight: z.number().finite("Weight must be a valid number").optional(),
  wingArea: z.number().finite("Wing Area must be a valid number").optional(),
  wingLoading: z.number().finite("Wing Loading must be a valid number").optional(),
});

const advancedSchema = z.object({
  wingLoading: z.number().finite("Wing Loading must be a valid number").optional(),
  airDensity: z.number().finite("Air Density must be a valid number").optional(),
  clMax: z.number().finite("CL,max must be a valid number").optional(),
  stallSpeed: z.number().finite("Stall Speed must be a valid number").optional(),
});

// --- Main Component ---
const AdvancedWingLoadingCalculator = () => {
  const { toast } = useToast();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");

  // --- State ---
  const [basicInputs, setBasicInputs] = useState({ weight: "", wingArea: "" });
  const [advInputs, setAdvInputs] = useState({ wingLoading: "", airDensity: "", clMax: "", stallSpeed: "" });
  
  const [customUnitNames, setCustomUnitNames] = useState({
    weight: "Unit-W", wingArea: "Unit-S", wingLoading: "Unit-W/S",
    airDensity: "Unit-rho", stallSpeed: "Unit-V"
  });
  const [customFactors, setCustomFactors] = useState({
    weight: "1.0", wingArea: "1.0", wingLoading: "1.0",
    airDensity: "1.0", stallSpeed: "1.0"
  });

  const [basicResult, setBasicResult] = useState<any | null>(null);
  const [advancedResult, setAdvancedResult] = useState<any | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  // --- Effects for LocalStorage ---
  useEffect(() => {
    // A helper function to safely load and parse JSON from localStorage
    const loadFromStorage = (key: string, setter: Function, defaultValue: any) => {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        try {
          // Check if the value is a plain string (like 'SI') or JSON
          if (storedValue.startsWith("{") || storedValue.startsWith("[")) {
            setter(JSON.parse(storedValue));
          } else {
            setter(JSON.parse(storedValue)); // Handles simple strings like "SI"
          }
        } catch (e) {
          // If JSON.parse fails, it might be a simple string that doesn't need parsing
          if (key === "advWingCalc_unitSystem") {
             setter(storedValue); // Handle "SI", "Imperial", etc.
          } else {
            console.warn(`Failed to parse ${key} from storage, resetting to default:`, e);
            setter(defaultValue);
          }
        }
      } else {
        setter(defaultValue);
      }
    };
  
    loadFromStorage("advWingCalc_unitSystem", setUnitSystem, "SI");
    loadFromStorage("advWingCalc_basicInputs", setBasicInputs, { weight: "", wingArea: "" });
    loadFromStorage("advWingCalc_advInputs", setAdvInputs, { wingLoading: "", airDensity: "", clMax: "", stallSpeed: "" });
    loadFromStorage("advWingCalc_customNames", setCustomUnitNames, { weight: "Unit-W", wingArea: "Unit-S", wingLoading: "Unit-W/S", airDensity: "Unit-rho", stallSpeed: "Unit-V" });
    loadFromStorage("advWingCalc_customFactors", setCustomFactors, { weight: "1.0", wingArea: "1.0", wingLoading: "1.0", airDensity: "1.0", stallSpeed: "1.0" });
  }, []);
  
  // FIX 1: Merged the two useEffects into one to prevent overwriting keys.
  useEffect(() => {
    localStorage.setItem("advWingCalc_unitSystem", unitSystem);
    localStorage.setItem("advWingCalc_basicInputs", JSON.stringify(basicInputs));
    localStorage.setItem("advWingCalc_advInputs", JSON.stringify(advInputs));
    localStorage.setItem("advWingCalc_customNames", JSON.stringify(customUnitNames));
    localStorage.setItem("advWingCalc_customFactors", JSON.stringify(customFactors));
  }, [unitSystem, basicInputs, advInputs, customUnitNames, customFactors]);

  // --- Unit Conversion ---
  const getUnit = (field: string): string => {
    const units: Record<string, Record<UnitSystem, string>> = {
      weight: { SI: "N", Imperial: "lbf", Custom: customUnitNames.weight },
      wingArea: { SI: "m²", Imperial: "ft²", Custom: customUnitNames.wingArea },
      wingLoading: { SI: "N/m²", Imperial: "lb/ft²", Custom: customUnitNames.wingLoading },
      airDensity: { SI: "kg/m³", Imperial: "slug/ft³", Custom: customUnitNames.airDensity },
      stallSpeed: { SI: "m/s", Imperial: "ft/s", Custom: customUnitNames.stallSpeed },
      clMax: { SI: "", Imperial: "", Custom: "" },
    };
    return units[field]?.[unitSystem] || "";
  };

  const convertToSI = (value: number, field: string): number => {
    if (unitSystem === "SI") return value;
    if (unitSystem === "Imperial") {
      switch (field) {
        case "weight": return value * 4.44822; // lbf to N
        case "wingArea": return value * 0.092903; // ft² to m²
        case "wingLoading": return value * 47.8803; // lb/ft² to N/m²
        case "airDensity": return value * 515.379; // slug/ft³ to kg/m³
        case "stallSpeed": return value * 0.3048; // ft/s to m/s
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
        case "weight": return value / 4.44822;
        case "wingArea": return value / 0.092903;
        case "wingLoading": return value / 47.8803;
        case "airDensity": return value / 515.379;
        case "stallSpeed": return value / 0.3048;
        default: return value;
      }
    }
    if (unitSystem === "Custom") {
      const factor = parseFloat(customFactors[field as keyof typeof customFactors]);
      return value / ((isNaN(factor) || factor === 0) ? 1.0 : factor);
    }
    return value;
  };

  // --- Interpretation ---
  const interpretWingLoading = (wl_si: number) => {
    if (wl_si <= 0) return { interpretation: "Non-Physical", category: "Invalid State", characteristics: ["Wing loading must be positive."] };
    if (wl_si < 100) return { interpretation: "Very Low", category: "Ultralight / Glider", characteristics: ["Excellent low-speed performance", "Susceptible to turbulence"] };
    if (wl_si < 300) return { interpretation: "Low", category: "General Aviation", characteristics: ["Good low-speed handling", "Reasonable stall speed"] };
    if (wl_si < 500) return { interpretation: "Medium", category: "Business Jet", characteristics: ["Balanced performance", "Smoother ride in turbulence"] };
    if (wl_si < 700) return { interpretation: "High", category: "Commercial Transport", characteristics: ["Higher cruise speeds", "Longer takeoff/landing", "Stable in rough air"] };
    return { interpretation: "Very High", category: "Military Fighter", characteristics: ["Optimized for high-speed flight", "High approach speeds"] };
  };

  // --- Preset Handler ---
  const handlePresetLoad = (condition: PresetCondition) => {
    if (condition === "Custom") return;

    let rho_si = 1.225; // Default Sea Level
    let clMax = 1.0;
    
    switch (condition) {
      case "Takeoff":
        rho_si = 1.225; // Sea Level
        clMax = 2.2; // High-lift devices (flaps, slats)
        break;
      case "Cruise":
        rho_si = 0.458; // ~30,000 ft
        clMax = 0.5; // Clean wing configuration
        break;
      case "Landing":
        rho_si = 1.225; // Sea Level
        clMax = 2.8; // Full flaps, gear down
        break;
    }
    
    setAdvInputs(prev => ({
      ...prev,
      airDensity: convertFromSI(rho_si, "airDensity").toFixed(3),
      clMax: clMax.toFixed(2)
    }));
    
    toast({ title: "Presets Loaded", description: `${condition} values for Air Density and CL,max have been set.` });
  };
  
  // --- Feasibility Check ---
  const checkFeasibility = (values: Record<string, number | undefined>) => {
    let messages = [];
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value <= 0) {
        messages.push(`${key} is non-positive.`);
      }
    }
    return {
      feasible: messages.length === 0,
      message: messages.length > 0 ? `Not physically feasible: ${messages.join(" ")}` : "Values are physically plausible."
    };
  };

  // --- Calculation Functions ---

  const calculateBasic = () => {
    try {
      const rawValues = {
        weight: basicInputs.weight.trim() ? convertToSI(parseFloat(basicInputs.weight), "weight") : undefined,
        wingArea: basicInputs.wingArea.trim() ? convertToSI(parseFloat(basicInputs.wingArea), "wingArea") : undefined,
        wingLoading: advInputs.wingLoading.trim() ? convertToSI(parseFloat(advInputs.wingLoading), "wingLoading") : undefined,
      };

      const emptyFields = Object.entries(rawValues).filter(([_, v]) => v === undefined);
      if (emptyFields.length !== 1) {
        toast({ title: "Invalid Inputs", description: "Fill in exactly 2 of the 3 fields in Part 1 to solve.", variant: "destructive" });
        return;
      }

      const validated = basicSchema.parse(rawValues);
      const solveFor = emptyFields[0][0];
      let resultData: any = {};
      let steps: CalculationStep[] = [{ equation: "W/S = W ÷ S", description: "Basic wing loading definition" }];

      if (solveFor === "wingLoading") {
        const { weight, wingArea } = validated;
        if (wingArea === 0) throw new Error("Wing Area cannot be zero.");
        const wl = weight! / wingArea!;
        steps.push({ equation: `W/S = ${weight!.toFixed(2)} ÷ ${wingArea!.toFixed(2)}`, description: "Substitute values" });
        resultData = { wingLoading: wl };
        // Auto-populate the advanced calculator
        setAdvInputs(prev => ({ ...prev, wingLoading: convertFromSI(wl, "wingLoading").toFixed(2) }));
        toast({ title: "Calculation Complete", description: "W/S populated in Part 2." });
      
        // FIX 3: Only generate chart if inputs are physical
        if (weight! > 0 && wingArea! > 0) {
          const w = validated.weight!;
          const s_base = validated.wingArea!;
          const data = [];
          for (let s_current = s_base * 0.5; s_current <= s_base * 1.5; s_current += s_base * 0.1) {
            if(s_current <= 0) continue; // Prevent division by zero
            data.push({
              wingArea: convertFromSI(s_current, "wingArea"),
              wingLoading: convertFromSI(w / s_current, "wingLoading")
            });
          }
          setChartData(data);
        } else {
          setChartData([]);
        }

      } else if (solveFor === "weight") {
        const { wingLoading, wingArea } = validated;
        const w = wingLoading! * wingArea!;
        steps.push({ equation: "W = (W/S) × S", description: "Rearrange for Weight" });
        resultData = { weight: w };
        setBasicInputs(prev => ({ ...prev, weight: convertFromSI(w, "weight").toFixed(2) }));
        setChartData([]); // FIX 2: Clear chart data
      } else { // solveFor === "wingArea"
        const { wingLoading, weight } = validated;
        if (wingLoading === 0) throw new Error("Wing Loading cannot be zero.");
        const s = weight! / wingLoading!;
        steps.push({ equation: "S = W ÷ (W/S)", description: "Rearrange for Wing Area" });
        resultData = { wingArea: s };
        setBasicInputs(prev => ({ ...prev, wingArea: convertFromSI(s, "wingArea").toFixed(2) }));
        setChartData([]); // FIX 2: Clear chart data
      }
      
      const final_wl = resultData.wingLoading ?? validated.wingLoading!;
      const interpretation = interpretWingLoading(final_wl);
      const feasibility = checkFeasibility({ ...validated, ...resultData });
      
      setBasicResult({ ...resultData, steps, solveFor, ...interpretation, feasibility });
      setAdvancedResult(null); // Clear advanced results as basic inputs changed

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid Input", description: error.errors[0]?.message, variant: "destructive" });
      } else {
        toast({ title: "Calculation Error", description: (error as Error).message, variant: "destructive" });
      }
    }
  };

  const calculateAdvanced = () => {
    try {
      const rawValues = {
        wingLoading: advInputs.wingLoading.trim() ? convertToSI(parseFloat(advInputs.wingLoading), "wingLoading") : undefined,
        airDensity: advInputs.airDensity.trim() ? convertToSI(parseFloat(advInputs.airDensity), "airDensity") : undefined,
        clMax: advInputs.clMax.trim() ? parseFloat(advInputs.clMax) : undefined, // CLmax is unitless
        stallSpeed: advInputs.stallSpeed.trim() ? convertToSI(parseFloat(advInputs.stallSpeed), "stallSpeed") : undefined,
      };
      
      const emptyFields = Object.entries(rawValues).filter(([_, v]) => v === undefined);
      if (emptyFields.length !== 1) {
        toast({ title: "Invalid Inputs", description: "Fill in exactly 3 of the 4 fields in Part 2 to solve.", variant: "destructive" });
        return;
      }
      
      const validated = advancedSchema.parse(rawValues);
      const solveFor = emptyFields[0][0];
      let resultData: any = {};
      let steps: CalculationStep[] = [{ equation: "W/S = 0.5 × ρ × V² × CL,max", description: "Lift equation at stall" }];
      
      const { wingLoading, airDensity, clMax, stallSpeed } = validated;

      if (solveFor === "stallSpeed") {
        const term = wingLoading! / (0.5 * airDensity! * clMax!);
        if (term < 0) throw new Error("Cannot square root negative. Check inputs.");
        const v = Math.sqrt(term);
        steps.push({ equation: "V = sqrt[ (W/S) / (0.5 × ρ × CL,max) ]", description: "Rearrange for Stall Speed" });
        resultData = { stallSpeed: v };
        setAdvInputs(prev => ({ ...prev, stallSpeed: convertFromSI(v, "stallSpeed").toFixed(2) }));
      } else if (solveFor === "wingLoading") {
        const wl = 0.5 * airDensity! * Math.pow(stallSpeed!, 2) * clMax!;
        steps.push({ equation: `W/S = 0.5 × ${airDensity!} × ${stallSpeed!}² × ${clMax!}`, description: "Substitute values" });
        resultData = { wingLoading: wl };
        setAdvInputs(prev => ({ ...prev, wingLoading: convertFromSI(wl, "wingLoading").toFixed(2) }));
      } else if (solveFor === "clMax") {
        const denom = (0.5 * airDensity! * Math.pow(stallSpeed!, 2));
        if (denom === 0) throw new Error("Division by zero. Stall Speed or Density cannot be zero.");
        const cl = wingLoading! / denom;
        steps.push({ equation: "CL,max = (W/S) / (0.5 × ρ × V²)", description: "Rearrange for CL,max" });
        resultData = { clMax: cl };
        setAdvInputs(prev => ({ ...prev, clMax: cl.toFixed(3) }));
      } else { // solveFor === "airDensity"
        const denom = (0.5 * clMax! * Math.pow(stallSpeed!, 2));
        if (denom === 0) throw new Error("Division by zero. Stall Speed or CL,max cannot be zero.");
        const rho = wingLoading! / denom;
        steps.push({ equation: "ρ = (W/S) / (0.5 × CL,max × V²)", description: "Rearrange for Air Density" });
        resultData = { airDensity: rho };
        setAdvInputs(prev => ({ ...prev, airDensity: convertFromSI(rho, "airDensity").toFixed(3) }));
      }
      
      const feasibility = checkFeasibility({ ...validated, ...resultData });
      setAdvancedResult({ ...resultData, steps, solveFor, feasibility });
      setBasicResult(null); // Clear basic results
      setChartData([]); // Clear chart

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid Input", description: error.errors[0]?.message, variant: "destructive" });
      } else {
        toast({ title: "Calculation Error", description: (error as Error).message, variant: "destructive" });
      }
    }
  };

  const resetCalculators = () => {
    setBasicInputs({ weight: "", wingArea: "" });
    setAdvInputs({ wingLoading: "", airDensity: "", clMax: "", stallSpeed: "" });
    setBasicResult(null);
    setAdvancedResult(null);
    setChartData([]);
  };

  // --- Render ---
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Plane className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">Advanced Wing Performance Calculator</h2>
        </div>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">Calculate wing loading and use it to solve for stall speed, required CL,max, and more.</p>
        <div className="flex justify-center gap-2 mt-4">
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-cyan-400/30 text-cyan-400"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI (Metric)</SelectItem>
                <SelectItem value="Imperial">Imperial</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={resetCalculators} variant="outline" className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10">Reset All</Button>
          </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* --- LEFT COLUMN (INPUTS) --- */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
          
          {/* --- Part 1: Basic Wing Loading --- */}
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Gauge className="w-5 h-5 text-cyan-400" />Part 1: Basic Wing Loading</CardTitle>
              <CardDescription className="text-gray-400">Solve for W, S, or W/S. Fill 2 of 3 fields. W/S auto-populates in Part 2.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-gray-300">Aircraft Weight (W) <span className="text-gray-500">{getUnit("weight")}</span></Label>
                <Input id="weight" type="number" step="0.01" value={basicInputs.weight} onChange={(e) => setBasicInputs(p => ({ ...p, weight: e.target.value }))} className="bg-slate-900/50 border-cyan-400/30" placeholder="e.g., 98100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wingArea" className="text-gray-300">Wing Area (S) <span className="text-gray-500">{getUnit("wingArea")}</span></Label>
                <Input id="wingArea" type="number" step="0.01" value={basicInputs.wingArea} onChange={(e) => setBasicInputs(p => ({ ...p, wingArea: e.target.value }))} className="bg-slate-900/50 border-cyan-400/30" placeholder="e.g., 30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wl_basic" className="text-gray-300">Wing Loading (W/S) <span className="text-gray-500">{getUnit("wingLoading")}</span></Label>
                <Input id="wl_basic" type="number" step="0.01" value={advInputs.wingLoading} onChange={(e) => setAdvInputs(p => ({ ...p, wingLoading: e.target.value }))} className="bg-slate-900/50 border-cyan-400/30" placeholder="Solves or enter manually" />
              </div>
              <Button type="button" onClick={calculateBasic} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 font-semibold"><Gauge className="w-4 h-4 mr-2" />Calculate Part 1</Button>
            </CardContent>
          </Card>

          {/* --- Part 2: Performance Calculator --- */}
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Wind className="w-5 h-5 text-cyan-400" />Part 2: Performance Calculator</CardTitle>
              <CardDescription className="text-gray-400">Solve for V_stall, C_L_max, ρ, or W/S. Fill 3 of 4 fields.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select onValueChange={(v) => handlePresetLoad(v as PresetCondition)}>
                <SelectTrigger className="w-full bg-slate-900/50 border-cyan-400/30 text-cyan-400"><SelectValue placeholder="Load Presets (Optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Takeoff">Preset: Takeoff (Sea Level, Flaps)</SelectItem>
                  <SelectItem value="Landing">Preset: Landing (Sea Level, Full Flaps)</SelectItem>
                  <SelectItem value="Cruise">Preset: Cruise (30,000 ft, Clean)</SelectItem>
                  <SelectItem value="Custom">Custom (No values set)</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <Label htmlFor="wl_adv" className="text-gray-300">Wing Loading (W/S) <span className="text-gray-500">{getUnit("wingLoading")}</span></Label>
                <Input id="wl_adv" type="number" step="0.01" value={advInputs.wingLoading} onChange={(e) => setAdvInputs(p => ({ ...p, wingLoading: e.target.value }))} className="bg-slate-900/50 border-cyan-400/30" placeholder="From Part 1 or enter" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="airDensity" className="text-gray-300">Air Density (ρ) <span className="text-gray-500">{getUnit("airDensity")}</span></Label>
                <Input id="airDensity" type="number" step="0.001" value={advInputs.airDensity} onChange={(e) => setAdvInputs(p => ({ ...p, airDensity: e.target.value }))} className="bg-slate-900/50 border-cyan-400/30" placeholder="e.g., 1.225" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clMax" className="text-gray-300">Max Lift Coefficient (C_L_max) <span className="text-gray-500">(Unitless)</span></Label>
                <Input id="clMax" type="number" step="0.01" value={advInputs.clMax} onChange={(e) => setAdvInputs(p => ({ ...p, clMax: e.target.value }))} className="bg-slate-900/50 border-cyan-400/30" placeholder="e.g., 2.2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stallSpeed" className="text-gray-300">Stall Speed (V_stall) <span className="text-gray-500">{getUnit("stallSpeed")}</span></Label>
                <Input id="stallSpeed" type="number" step="0.01" value={advInputs.stallSpeed} onChange={(e) => setAdvInputs(p => ({ ...p, stallSpeed: e.target.value }))} className="bg-slate-900/50 border-cyan-400/30" placeholder="Leave blank to solve" />
              </div>
              <Button type="button" onClick={calculateAdvanced} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 font-semibold"><Wind className="w-4 h-4 mr-2" />Calculate Performance</Button>
            </CardContent>
          </Card>

          {/* --- Custom Units --- */}
          {unitSystem === "Custom" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2"><Settings2 className="w-5 h-5 text-cyan-400" />Custom Unit Definitions</CardTitle>
                  {/* FIX 4: Corrected description */}
                  <CardDescription className="text-gray-400">Define conversion factors to SI (N, m, kg, s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {id: 'weight', label: 'Weight (W)'},
                    {id: 'wingArea', label: 'Wing Area (S)'},
                    {id: 'wingLoading', label: 'Wing Loading (W/S)'},
                    {id: 'airDensity', label: 'Air Density (ρ)'},
                    {id: 'stallSpeed', label: 'Stall Speed (V)'}
                  ].map(field => (
                    <div key={field.id} className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
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
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

        </motion.div>

        {/* --- RIGHT COLUMN (RESULTS & THEORY) --- */}
        <div className="space-y-6">
          
          {/* --- Results Card --- */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader><CardTitle className="text-white">Results</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                
                {/* Basic Result */}
                {basicResult && (
                  <div className="p-4 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-lg border border-cyan-400/30">
                    <p className="text-sm font-semibold text-cyan-400 mb-2">Part 1 Result (Basic)</p>
                    <p className="text-gray-400 text-sm mb-1">Solved: {basicResult.solvedFor}</p>
                    <p className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                      {/* Display solved value */}
                      {basicResult.wingLoading ? `${convertFromSI(basicResult.wingLoading, "wingLoading").toFixed(2)} ${getUnit("wingLoading")}`
                      : basicResult.weight ? `${convertFromSI(basicResult.weight, "weight").toFixed(2)} ${getUnit("weight")}`
                      : `${convertFromSI(basicResult.wingArea, "wingArea").toFixed(2)} ${getUnit("wingArea")}`
                      }
                    </p>
                    <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <p className="text-cyan-400 font-semibold mb-1">{basicResult.interpretation}</p>
                      <p className="text-blue-400 text-sm mb-2">{basicResult.category}</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">{basicResult.characteristics.map((c:string, i:number) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  </div>
                )}
                
                {/* Advanced Result */}
                {advancedResult && (
                  <div className="p-4 bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-lg border border-green-400/30">
                    <p className="text-sm font-semibold text-green-400 mb-2">Part 2 Result (Performance)</p>
                    <p className="text-gray-400 text-sm mb-1">Solved: {advancedResult.solvedFor}</p>
                    <p className="text-3xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]">
                      {/* Display solved value */}
                      {advancedResult.stallSpeed ? `${convertFromSI(advancedResult.stallSpeed, "stallSpeed").toFixed(2)} ${getUnit("stallSpeed")}`
                      : advancedResult.wingLoading ? `${convertFromSI(advancedResult.wingLoading, "wingLoading").toFixed(2)} ${getUnit("wingLoading")}`
                      : advancedResult.clMax ? `${advancedResult.clMax.toFixed(3)} ${getUnit("clMax")}`
                      : `${convertFromSI(advancedResult.airDensity, "airDensity").toFixed(3)} ${getUnit("airDensity")}`
                      }
                    </p>
                  </div>
                )}
                
                {/* Feasibility & Steps (if any result exists) */}
                {(basicResult || advancedResult) && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="feasibility" className="border-cyan-400/20">
                      <AccordionTrigger className="text-white hover:text-cyan-400">
                        <div className="flex items-center gap-2">
                          {(basicResult?.feasibility.feasible ?? advancedResult?.feasibility.feasible) ? <CheckCircle className="w-4 h-4 text-green-400"/> : <AlertTriangle className="w-4 h-4 text-red-400"/>}
                          Feasibility Check
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <div className={`flex items-start gap-2 p-3 rounded-lg ${
                          (basicResult?.feasibility.feasible ?? advancedResult?.feasibility.feasible)
                          ? 'bg-green-900/50 border border-green-400/30' 
                          : 'bg-red-900/50 border border-red-400/30'
                        }`}>
                          <p className="text-gray-300 text-sm">
                            {basicResult?.feasibility.message || advancedResult?.feasibility.message}
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="steps" className="border-cyan-400/20">
                      <AccordionTrigger className="text-white hover:text-cyan-400"><div className="flex items-center gap-2"><Info className="w-4 h-4 text-cyan-400" />Step-by-Step Solution</div></AccordionTrigger>
                      <AccordionContent className="text-gray-300 space-y-3 pt-2">
                        {(basicResult?.steps || advancedResult?.steps).map((s: CalculationStep, i: number) => (
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

                {/* Chart (if basic result exists) */}
                {chartData.length > 0 && (
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" />Wing Loading vs. Wing Area (Constant Weight)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="wingArea" stroke="#94a3b8" tickFormatter={(val) => val.toFixed(1)}
                          label={{ value: `Wing Area (${getUnit("wingArea")})`, position: 'insideBottom', offset: -5, fill: '#94a3b8' }}/>
                        <YAxis stroke="#94a3b8" tickFormatter={(val) => val.toFixed(1)}
                          label={{ value: `Wing Loading (${getUnit("wingLoading")})`, angle: -90, position: 'insideLeft', fill: '#94a3b8' }}/>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee40' }} formatter={(value: number) => value.toFixed(2)}/>
                        <Line type="monotone" dataKey="wingLoading" stroke="#22d3ee" strokeWidth={2} dot={false} name="W/S" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* Placeholder */}
                {!basicResult && !advancedResult && (
                  <div className="text-center py-12">
                    <Gauge className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
                    <p className="text-gray-400">Results will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* --- Theory Card --- */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader><CardTitle className="text-white">Equations</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/30">
                  <p className="text-center text-lg font-mono text-cyan-400 mb-2">W/S = W ÷ S</p>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p><span className="text-cyan-400">W/S</span> = Wing Loading</p>
                    <p><span className="text-cyan-400">W</span> = Aircraft Weight</p>
                    <p><span className="text-cyan-400">S</span> = Wing Area</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/30">
                  <p className="text-center text-lg font-mono text-cyan-400 mb-2">W/S = ½ · ρ · V² · C_L_max</p>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p><span className="text-cyan-400">ρ</span> = Air Density</p>
                    <p><span className="text-cyan-400">V</span> = Stall Speed</p>
                    <p><span className="text-cyan-400">C_L_max</span> = Max Lift Coefficient</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default AdvancedWingLoadingCalculator;
