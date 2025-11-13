import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Gauge, Plane, Info, TrendingUp } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

type UnitSystem = "SI" | "Imperial" | "Custom";
type FlightCondition = "Takeoff" | "Cruise" | "Landing";

interface CalculationStep {
  equation: string;
  description: string;
}

const wingLoadingSchema = z.object({
  weight: z.number().positive("Aircraft weight must be positive").optional(),
  wingArea: z.number().positive("Wing area must be positive").optional(),
  wingLoading: z.number().positive("Wing loading must be positive").optional(),
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
  const [result, setResult] = useState<{
    wingLoading?: number;
    weight?: number;
    wingArea?: number;
    interpretation: string;
    category: string;
    characteristics: string[];
    steps: CalculationStep[];
    solvedFor: string;
  } | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const savedUnit = localStorage.getItem("wingLoadingCalc_unitSystem");
    const savedInputs = localStorage.getItem("wingLoadingCalc_inputs");
    const savedCondition = localStorage.getItem("wingLoadingCalc_condition");
    if (savedUnit) setUnitSystem(savedUnit as UnitSystem);
    if (savedInputs) setInputs(JSON.parse(savedInputs));
    if (savedCondition) setFlightCondition(savedCondition as FlightCondition);
  }, []);

  useEffect(() => {
    localStorage.setItem("wingLoadingCalc_unitSystem", unitSystem);
    localStorage.setItem("wingLoadingCalc_inputs", JSON.stringify(inputs));
    localStorage.setItem("wingLoadingCalc_condition", flightCondition);
  }, [unitSystem, inputs, flightCondition]);

  const convertToSI = (value: number, field: string): number => {
    if (unitSystem === "SI") return value;
    switch (field) {
      case "weight": return unitSystem === "Imperial" ? value * 4.44822 : value;
      case "wingArea": return unitSystem === "Imperial" ? value * 0.092903 : value;
      case "wingLoading": return unitSystem === "Imperial" ? value * 47.8803 : value;
      default: return value;
    }
  };

  const convertFromSI = (value: number, field: string): number => {
    if (unitSystem === "SI") return value;
    switch (field) {
      case "weight": return unitSystem === "Imperial" ? value / 4.44822 : value;
      case "wingArea": return unitSystem === "Imperial" ? value / 0.092903 : value;
      case "wingLoading": return unitSystem === "Imperial" ? value / 47.8803 : value;
      default: return value;
    }
  };

  const getUnit = (field: string): string => {
    const units: Record<string, Record<UnitSystem, string>> = {
      weight: { SI: "N", Imperial: "lbf", Custom: "N" },
      wingArea: { SI: "m²", Imperial: "ft²", Custom: "m²" },
      wingLoading: { SI: "N/m²", Imperial: "lb/ft²", Custom: "N/m²" },
    };
    return units[field]?.[unitSystem] || "";
  };

  const interpretWingLoading = (wl: number) => {
    if (wl < 100) {
      return {
        interpretation: "Very Low Wing Loading",
        category: "Ultralight / Glider",
        characteristics: ["Excellent low-speed performance", "High maneuverability at low speeds", "Short takeoff and landing distances", "Susceptible to turbulence and gusts", "Ideal for soaring and efficiency"]
      };
    } else if (wl < 300) {
      return {
        interpretation: "Low Wing Loading",
        category: "General Aviation",
        characteristics: ["Good low-speed handling", "Reasonable stall speed", "Suitable for short field operations", "Comfortable in light turbulence", "Typical of training and light aircraft"]
      };
    } else if (wl < 500) {
      return {
        interpretation: "Medium Wing Loading",
        category: "Light Transport / Business Jet",
        characteristics: ["Balanced performance envelope", "Better high-speed cruise efficiency", "Moderate runway requirements", "Smoother ride in turbulence", "Typical of regional and business aircraft"]
      };
    } else if (wl < 700) {
      return {
        interpretation: "High Wing Loading",
        category: "Commercial Transport",
        characteristics: ["Higher cruise speeds possible", "Longer takeoff and landing distances", "Stable in rough air", "Requires sophisticated high-lift devices", "Typical of large commercial airliners"]
      };
    } else {
      return {
        interpretation: "Very High Wing Loading",
        category: "Military Fighter / Heavy Transport",
        characteristics: ["Optimized for high-speed flight", "Requires high approach speeds", "Long runway requirements", "Excellent ride quality in turbulence", "Advanced aerodynamic features essential"]
      };
    }
  };

  const calculateWingLoading = () => {
    try {
      const rawValues: Record<string, number | undefined> = {
        weight: inputs.weight ? convertToSI(parseFloat(inputs.weight), "weight") : undefined,
        wingArea: inputs.wingArea ? convertToSI(parseFloat(inputs.wingArea), "wingArea") : undefined,
        wingLoading: inputs.wingLoading ? convertToSI(parseFloat(inputs.wingLoading), "wingLoading") : undefined,
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

      steps.push({ equation: "W/S = W ÷ S", description: "Wing loading equals weight divided by wing area" });

      if (solveFor === "wingLoading") {
        const w = validated.weight!, s = validated.wingArea!, wl = w / s;
        steps.push({ equation: `W/S = ${w.toFixed(2)} ÷ ${s.toFixed(2)}`, description: "Substitute known values" });
        steps.push({ equation: `W/S = ${wl.toFixed(2)} N/m²`, description: "Calculate wing loading" });
        const interpretation = interpretWingLoading(wl);
        resultValues = { wingLoading: wl, ...interpretation };
        const data = [];
        for (let area = s * 0.5; area <= s * 1.5; area += s * 0.1) {
          data.push({ wingArea: convertFromSI(area, "wingArea"), wingLoading: convertFromSI(w / area, "wingLoading") });
        }
        setChartData(data);
      } else if (solveFor === "weight") {
        const wl = validated.wingLoading!, s = validated.wingArea!, w = wl * s;
        steps.push({ equation: "W = (W/S) × S", description: "Rearrange to solve for weight" });
        steps.push({ equation: `W = ${wl.toFixed(2)} × ${s.toFixed(2)}`, description: "Substitute known values" });
        steps.push({ equation: `W = ${w.toFixed(2)} N`, description: "Calculate aircraft weight" });
        const interpretation = interpretWingLoading(wl);
        resultValues = { weight: w, ...interpretation };
      } else {
        const wl = validated.wingLoading!, w = validated.weight!, s = w / wl;
        steps.push({ equation: "S = W ÷ (W/S)", description: "Rearrange to solve for wing area" });
        steps.push({ equation: `S = ${w.toFixed(2)} ÷ ${wl.toFixed(2)}`, description: "Substitute known values" });
        steps.push({ equation: `S = ${s.toFixed(2)} m²`, description: "Calculate wing area" });
        const interpretation = interpretWingLoading(wl);
        resultValues = { wingArea: s, ...interpretation };
      }

      setResult({ ...resultValues, steps, solvedFor });
      const displayValue = convertFromSI(resultValues[solveFor] || resultValues.wingLoading, solveFor);
      toast({ title: "Calculation Complete", description: `${solveFor}: ${displayValue.toFixed(2)} ${getUnit(solveFor)}` });
    } catch (error) {
      toast({ title: error instanceof z.ZodError ? "Invalid Input" : "Error", description: error instanceof z.ZodError ? error.errors[0]?.message : "Please enter valid numbers", variant: "destructive" });
    }
  };

  const resetCalculator = () => {
    setInputs({ weight: "", wingArea: "", wingLoading: "" });
    setResult(null);
    setChartData([]);
  };

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
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">Advanced multi-variable solver - Leave any field blank to solve for it</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
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
                  <Button onClick={calculateWingLoading} className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300"><Gauge className="w-4 h-4 mr-2" />Calculate</Button>
                </motion.div>
                <Button onClick={resetCalculator} variant="outline" className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10">Reset</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader><CardTitle className="text-white">Results</CardTitle></CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-lg border border-cyan-400/30">
                      <p className="text-gray-400 text-sm mb-1">Solved: {result.solvedFor}</p>
                      <p className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                        {result.wingLoading !== undefined ? `${convertFromSI(result.wingLoading, "wingLoading").toFixed(2)} ${getUnit("wingLoading")}` : result.weight !== undefined ? `${convertFromSI(result.weight, "weight").toFixed(2)} ${getUnit("weight")}` : `${convertFromSI(result.wingArea!, "wingArea").toFixed(2)} ${getUnit("wingArea")}`}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <p className="text-cyan-400 font-semibold mb-1">{result.interpretation}</p>
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
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" />Wing Loading vs Area</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="wingArea" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee40' }} />
                            <Line type="monotone" dataKey="wingLoading" stroke="#22d3ee" strokeWidth={2} />
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
