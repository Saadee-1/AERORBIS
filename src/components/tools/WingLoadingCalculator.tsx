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
import { Gauge, Plane, Info, TrendingUp, Settings2, AlertTriangle, CheckCircle } from "lucide-react";
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
type FlightCondition = "Takeoff" | "Cruise" | "Landing";

interface CalculationStep {
  equation: string;
  description: string;
}

// Schema: Allows any number, but rejects NaN/Infinity
const wingLoadingSchema = z.object({
  weight: z.number().finite("Weight must be a valid number").optional(),
  wingArea: z.number().finite("Wing Area must be a valid number").optional(),
  wingLoading: z.number().finite("Wing Loading must be a valid number").optional(),
});

const WingLoadingCalculator = () => {
  const { toast } = useToast();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [flightCondition, setFlightCondition] = useState<FlightCondition>("Cruise");
  
  const [inputs, setInputs] = useState({
    weight: "",
    wingArea: "",
    wingLoading: "",
  });

  const [customUnitNames, setCustomUnitNames] = useState({
    weight: "Unit-W",
    wingArea: "Unit-S",
    wingLoading: "Unit-W/S",
  });

  const [customFactors, setCustomFactors] = useState({
    weight: "1.0",
    wingArea: "1.0",
    wingLoading: "1.0",
  });

  const [result, setResult] = useState<{
    wingLoading?: number;
    weight?: number;
    wingArea?: number;
    interpretation: string;
    category: string;
    characteristics: string[];
    feasibility: { feasible: boolean; message: string; };
    steps: CalculationStep[];
    solvedFor: string;
  } | null>(null);

  const [chartData, setChartData] = useState<any[]>([]);

  // --- Effects ---

  useEffect(() => {
    const savedUnit = localStorage.getItem("wingLoadingCalc_unitSystem");
    const savedInputs = localStorage.getItem("wingLoadingCalc_inputs");
    const savedCondition = localStorage.getItem("wingLoadingCalc_condition");
    const savedNames = localStorage.getItem("wingLoadingCalc_customNames");
    const savedFactors = localStorage.getItem("wingLoadingCalc_customFactors");

    if (savedUnit) setUnitSystem(savedUnit as UnitSystem);
    if (savedInputs) setInputs(JSON.parse(savedInputs));
    if (savedCondition) setFlightCondition(savedCondition as FlightCondition);
    if (savedNames) setCustomUnitNames(JSON.parse(savedNames));
    if (savedFactors) setCustomFactors(JSON.parse(savedFactors));
  }, []);

  useEffect(() => {
    localStorage.setItem("wingLoadingCalc_unitSystem", unitSystem);
    localStorage.setItem("wingLoadingCalc_inputs", JSON.stringify(inputs));
    localStorage.setItem("wingLoadingCalc_condition", flightCondition);
    localStorage.setItem("wingLoadingCalc_customNames", JSON.stringify(customUnitNames));
    localStorage.setItem("wingLoadingCalc_customFactors", JSON.stringify(customFactors));
  }, [unitSystem, inputs, flightCondition, customUnitNames, customFactors]);

  // --- Unit Conversion Logic ---

  const getUnit = (field: string): string => {
    const units: Record<string, Record<UnitSystem, string>> = {
      weight: { SI: "N", Imperial: "lbf", Custom: customUnitNames.weight },
      wingArea: { SI: "m²", Imperial: "ft²", Custom: customUnitNames.wingArea },
      wingLoading: { SI: "N/m²", Imperial: "lb/ft²", Custom: customUnitNames.wingLoading },
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
        default: return value;
      }
    }

    if (unitSystem === "Custom") {
      const factor = parseFloat(customFactors[field as keyof typeof customFactors]);
      const safeFactor = (isNaN(factor) || factor === 0) ? 1.0 : factor;
      return value * safeFactor;
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
        default: return value;
      }
    }

    if (unitSystem === "Custom") {
      const factor = parseFloat(customFactors[field as keyof typeof customFactors]);
      const safeFactor = (isNaN(factor) || factor === 0) ? 1.0 : factor;
      return value / safeFactor;
    }

    return value;
  };

  // --- Interpretation ---

  const interpretWingLoading = (wl_si: number) => { // Expects SI units (N/m²)
    if (wl_si <= 0) {
      return { interpretation: "Non-Physical", category: "Invalid State", characteristics: ["Wing loading must be positive for lift.", "This calculation is not physically feasible."] };
    } else if (wl_si < 100) {
      return { interpretation: "Very Low", category: "Ultralight / Glider", characteristics: ["Excellent low-speed performance", "High maneuverability at low speeds", "Short takeoff/landing", "Susceptible to turbulence"] };
    } else if (wl_si < 300) {
      return { interpretation: "Low", category: "General Aviation", characteristics: ["Good low-speed handling", "Reasonable stall speed", "Suitable for short fields", "Comfortable in light turbulence"] };
    } else if (wl_si < 500) {
      return { interpretation: "Medium", category: "Light Transport / Business Jet", characteristics: ["Balanced performance", "Better high-speed cruise", "Moderate runway requirements", "Smoother ride in turbulence"] };
    } else if (wl_si < 700) {
      return { interpretation: "High", category: "Commercial Transport", characteristics: ["Higher cruise speeds", "Longer takeoff/landing", "Stable in rough air", "Requires high-lift devices (flaps, slats)"] };
    } else {
      return { interpretation: "Very High", category: "Military Fighter / Heavy Transport", characteristics: ["Optimized for high-speed flight", "High approach speeds", "Long runway requirements", "Excellent ride in turbulence"] };
    }
  };

  // --- Calculation ---

  const calculateWingLoading = () => {
    try {
      const weightInput = inputs.weight.trim();
      const areaInput = inputs.wingArea.trim();
      const loadingInput = inputs.wingLoading.trim();

      const rawValues: Record<string, number | undefined> = {
        weight: weightInput ? convertToSI(parseFloat(weightInput), "weight") : undefined,
        wingArea: areaInput ? convertToSI(parseFloat(areaInput), "wingArea") : undefined,
        wingLoading: loadingInput ? convertToSI(parseFloat(loadingInput), "wingLoading") : undefined,
      };

      const emptyFields = Object.entries(rawValues).filter(([_, v]) => v === undefined);
      
      if (emptyFields.length === 0) {
        toast({ title: "Too Many Inputs", description: "Leave one field blank to solve for it", variant: "destructive" });
        return;
      }
      if (emptyFields.length > 1) {
        toast({ title: "Insufficient Data", description: "Please fill in all but one field", variant: "destructive" });
        return;
      }

      const validated = wingLoadingSchema.parse(rawValues);
      const solveFor = emptyFields[0][0];
      const steps: CalculationStep[] = [];
      let resultValues: any = {};
      let calculatedWingLoading_SI: number;

      steps.push({ equation: "W/S = W ÷ S", description: "Wing loading equals weight divided by wing area" });

      if (solveFor === "wingLoading") {
        const w = validated.weight!;
        const s = validated.wingArea!;
        if (s === 0) {
          toast({ title: "Calculation Error", description: "Wing Area cannot be zero when solving for Wing Loading.", variant: "destructive" });
          return;
        }
        const wl = w / s;
        steps.push({ equation: `W/S = ${w.toFixed(2)} ÷ ${s.toFixed(2)}`, description: "Substitute known values" });
        steps.push({ equation: `W/S = ${wl.toFixed(2)} N/m²`, description: "Calculate wing loading" });
        const interpretation = interpretWingLoading(wl);
        resultValues = { wingLoading: wl, ...interpretation };
        calculatedWingLoading_SI = wl;

        if (wl > 0 && w > 0 && s > 0) {
          const data = [];
          const baseArea = s > 0 ? s : 1; 
          for (let area = baseArea * 0.5; area <= baseArea * 1.5; area += baseArea * 0.1) {
            if (area === 0) continue;
            data.push({ 
              wingArea: convertFromSI(area, "wingArea"), 
              wingLoading: convertFromSI(w / area, "wingLoading") 
            });
          }
          setChartData(data);
        } else {
          setChartData([]);
        }

      } else if (solveFor === "weight") {
        const wl = validated.wingLoading!;
        const s = validated.wingArea!;
        const w = wl * s;
        steps.push({ equation: "W = (W/S) × S", description: "Rearrange to solve for weight" });
        steps.push({ equation: `W = ${wl.toFixed(2)} × ${s.toFixed(2)}`, description: "Substitute known values" });
        steps.push({ equation: `W = ${w.toFixed(2)} N`, description: "Calculate aircraft weight" });
        const interpretation = interpretWingLoading(wl);
        resultValues = { weight: w, ...interpretation };
        calculatedWingLoading_SI = wl;
        setChartData([]);

      } else { // solveFor === "wingArea"
        const wl = validated.wingLoading!;
        const w = validated.weight!;
        if (wl === 0) {
          toast({ title: "Calculation Error", description: "Wing Loading cannot be zero when solving for Wing Area.", variant: "destructive" });
          return;
        }
        const s = w / wl;
        steps.push({ equation: "S = W ÷ (W/S)", description: "Rearrange to solve for wing area" });
        steps.push({ equation: `S = ${w.toFixed(2)} ÷ ${wl.toFixed(2)}`, description: "Substitute known values" });
        steps.push({ equation: `S = ${s.toFixed(2)} m²`, description: "Calculate wing area" });
        const interpretation = interpretWingLoading(wl);
        resultValues = { wingArea: s, ...interpretation };
        calculatedWingLoading_SI = wl;
        setChartData([]);
      }

      // --- Feasibility Check ---
      const final_wl = resultValues.wingLoading ?? validated.wingLoading!;
      const final_w = resultValues.weight ?? validated.weight!;
      const final_s = resultValues.wingArea ?? validated.wingArea!;

      let feasibilityMessages = [];
      if (final_wl <= 0) feasibilityMessages.push("Wing Loading is non-positive.");
      if (final_w <= 0) feasibilityMessages.push("Aircraft Weight is non-positive.");
      if (final_s <= 0) feasibilityMessages.push("Wing Area is non-positive.");
      
      const feasibility = {
        feasible: feasibilityMessages.length === 0,
        message: feasibilityMessages.length > 0 
          ? `Not physically feasible: ${feasibilityMessages.join(" ")}`
          : "The calculated values are physically plausible."
      };
      // --- End Feasibility Check ---

      setResult({ ...resultValues, steps, solvedFor:solveFor, feasibility });
      
      const displayValue = convertFromSI(resultValues[solveFor] || resultValues.wingLoading, solveFor);
      
      // --- FIX: use 'solveFor' (local variable), NOT 'solvedFor' (state variable) ---
      const solveForCapitalized = solveFor.charAt(0).toUpperCase() + solveFor.slice(1);

      toast({ 
        title: "Calculation Complete", 
        description: `${solveForCapitalized}: ${displayValue.toFixed(2)} ${getUnit(solveFor)}` 
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid Input", description: error.errors[0]?.message || "Please ensure all fields contain valid numbers.", variant: "destructive" });
      } else {
        console.error("Calculation Error:", error);
        toast({ title: "Error", description: "An unexpected error occurred. Check console.", variant: "destructive" });
      }
    }
  };

  const resetCalculator = () => {
    setInputs({ weight: "", wingArea: "", wingLoading: "" });
    setResult(null);
    setChartData([]);
  };

  // --- Render ---

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Plane className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
            <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">Wing Loading Calculator</h2>
          </div>
          <div className="flex-1 flex justify-end gap-2">
            <Select value={flightCondition} onValueChange={(v) => setFlightCondition(v as FlightCondition)}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-cyan-400/30 text-cyan-400"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Takeoff">Takeoff</SelectItem>
                <SelectItem value="Cruise">Cruise</SelectItem>
                <SelectItem value="Landing">Landing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-cyan-400/30 text-cyan-400"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI (Metric)</SelectItem>
                <SelectItem value="Imperial">Imperial</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">Advanced multi-variable solver - Leave any field blank to solve for it</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 hover:border-cyan-400/40 transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Gauge className="w-5 h-5 text-cyan-400" />Input Parameters</CardTitle>
              <CardDescription className="text-gray-400">Flight Condition: {flightCondition} • {unitSystem} units</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["wingLoading", "weight", "wingArea"].map(field => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field} className="text-gray-300">
                    {field === "wingLoading" ? "Wing Loading (W/S)" : field === "weight" ? "Aircraft Weight (W)" : "Wing Area (S)"} <span className="text-gray-500">{getUnit(field)}</span>
                  </Label>
                  <Input id={field} type="number" step="0.01" value={inputs[field as keyof typeof inputs]} onChange={(e) => setInputs(p => ({ ...p, [field]: e.target.value }))} className="bg-slate-900/50 border-cyan-400/30 text-white focus:border-cyan-400 focus:ring-cyan-400/50 transition-all" placeholder="Leave blank to solve" />
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    type="button" 
                    onClick={calculateWingLoading} 
                    className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300"
                  >
                    <Gauge className="w-4 h-4 mr-2" />Calculate
                  </Button>
                </motion.div>
                <Button 
                  type="button"
                  onClick={resetCalculator} 
                  variant="outline" 
                  className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {unitSystem === "Custom" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2"><Settings2 className="w-5 h-5 text-cyan-400" />Custom Unit Definitions</CardTitle>
                  <CardDescription className="text-gray-400">Define your custom units and their conversion factor to SI (N, m²)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                    <Label className="text-white font-semibold">Weight (W)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input 
                        placeholder="Unit Name (e.g., kgf)" 
                        value={customUnitNames.weight}
                        onChange={(e) => setCustomUnitNames(p => ({...p, weight: e.target.value}))}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                      <Input 
                        type="number"
                        placeholder="Factor"
                        value={customFactors.weight}
                        onChange={(e) => setCustomFactors(p => ({...p, weight: e.target.value}))}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">1 {customUnitNames.weight || "Unit"} = {customFactors.weight || "..."} N</p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                    <Label className="text-white font-semibold">Wing Area (S)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input 
                        placeholder="Unit Name (e.g., cm²)" 
                        value={customUnitNames.wingArea}
                        onChange={(e) => setCustomUnitNames(p => ({...p, wingArea: e.target.value}))}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                      <Input 
                        type="number"
                        placeholder="Factor"
                        value={customFactors.wingArea}
                        onChange={(e) => setCustomFactors(p => ({...p, wingArea: e.target.value}))}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">1 {customUnitNames.wingArea || "Unit"} = {customFactors.wingArea || "..."} m²</p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                    <Label className="text-white font-semibold">Wing Loading (W/S)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input 
                        placeholder="Unit Name (e.g., kgf/m²)" 
                        value={customUnitNames.wingLoading}
                        onChange={(e) => setCustomUnitNames(p => ({...p, wingLoading: e.target.value}))}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                      <Input 
                        type="number"
                        placeholder="Factor"
                        value={customFactors.wingLoading}
                        onChange={(e) => setCustomFactors(p => ({...p, wingLoading: e.target.value}))}
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">1 {customUnitNames.wingLoading || "Unit"} = {customFactors.wingLoading || "..."} N/m²</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader><CardTitle className="text-white">Results</CardTitle></CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-lg border border-cyan-400/30">
                      <p className="text-gray-400 text-sm mb-1">
                        {result.solvedFor === "wingLoading" ? "Calculated Wing Loading" : `Solved: ${result.solvedFor}`}
                      </p>
                      <p className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                        {result.wingLoading !== undefined && result.solvedFor === "wingLoading" 
                          ? `${convertFromSI(result.wingLoading, "wingLoading").toFixed(2)} ${getUnit("wingLoading")}` 
                          : result.weight !== undefined 
                          ? `${convertFromSI(result.weight, "weight").toFixed(2)} ${getUnit("weight")}` 
                          : `${convertFromSI(result.wingArea!, "wingArea").toFixed(2)} ${getUnit("wingArea")}`}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 ${result.feasibility.feasible ? 'bg-green-900/50 border border-green-400/30' : 'bg-red-900/50 border border-red-400/30'}`}>
                        {result.feasibility.feasible ? (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        <div>
                          <p className={`font-semibold ${result.feasibility.feasible ? 'text-green-300' : 'text-red-300'}`}>
                            {result.feasibility.feasible ? "Feasibility Check: OK" : "Feasibility Check: Warning"}
                          </p>
                          <p className="text-gray-300 text-sm">{result.feasibility.message}</p>
                        </div>
                      </div>
                      
                      <p className="text-cyan-400 font-semibold mb-1">{result.interpretation} Wing Loading</p>
                      <p className="text-blue-400 text-sm mb-2">{result.category}</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">{result.characteristics.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                    
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="steps" className="border-cyan-400/20">
                        <AccordionTrigger className="text-white hover:text-cyan-400"><div className="flex items-center gap-2"><Info className="w-4 h-4 text-cyan-400" />Step-by-Step Solution</div></AccordionTrigger>
                        <AccordionContent className="text-gray-300 space-y-3 pt-2">
                          {result.steps.map((s, i) => (
                            <div key={i} className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                              <p className="text-xs text-gray-400 mb-1">Step {i + 1}</p>
                              <code className="text-cyan-400 font-mono text-sm block mb-1">{s.equation}</code>
                              <p className="text-gray-300 text-xs">{s.description}</p>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    
                    {chartData.length > 0 && (
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" />Wing Loading vs. Wing Area</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis 
                              dataKey="wingArea" 
                              stroke="#94a3b8"
                              tickFormatter={(val) => val.toFixed(1)}
                              label={{ 
                                value: `Wing Area (${getUnit("wingArea")})`, 
                                position: 'insideBottom', 
                                offset: -5, 
                                fill: '#94a3b8' 
                              }}
                            />
                            <YAxis 
                              stroke="#94a3b8" 
                              tickFormatter={(val) => val.toFixed(1)}
                              label={{ 
                                value: `Wing Loading (${getUnit("wingLoading")})`, 
                                angle: -90, 
                                position: 'insideLeft', 
                                fill: '#94a3b8' 
                              }}
                            />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee40', borderRadius: '8px' }} 
                              labelStyle={{ color: '#22d3ee' }}
                              formatter={(value: number) => value.toFixed(2)}
                            />
                            <Line type="monotone" dataKey="wingLoading" stroke="#22d3ee" strokeWidth={2} dot={false} name="Wing Loading" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Gauge className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
                    <p className="text-gray-400">Fill in all but one field and click Calculate</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WingLoadingCalculator;
