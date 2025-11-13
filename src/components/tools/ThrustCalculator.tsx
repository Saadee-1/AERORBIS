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
import { Calculator, Rocket, Info, TrendingUp } from "lucide-react";
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
  ResponsiveContainer, 
  Legend 
} from "recharts";

// --- Types & Schema ---

type UnitSystem = "SI" | "Imperial";

interface CalculationStep {
  equation: string;
  description: string;
}

const thrustSchema = z.object({
  massFlowRate: z.number().positive("Mass flow rate must be positive").optional(),
  exhaustVelocity: z.number().positive("Exhaust velocity must be positive").optional(),
  exitArea: z.number().positive("Exit area must be positive").optional(),
  exitPressure: z.number().nonnegative("Exit pressure cannot be negative").optional(),
  ambientPressure: z.number().nonnegative("Ambient pressure cannot be negative").optional(),
  thrust: z.number().positive("Thrust must be positive").optional(),
});

const ThrustCalculator = () => {
  const { toast } = useToast();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  
  // State for input fields (kept as strings to allow empty values)
  const [inputs, setInputs] = useState({
    massFlowRate: "",
    exhaustVelocity: "",
    exitArea: "",
    exitPressure: "",
    ambientPressure: "",
    thrust: "",
  });

  // State for results
  const [result, setResult] = useState<{
    thrust?: number;
    massFlowRate?: number;
    exhaustVelocity?: number;
    exitArea?: number;
    exitPressure?: number;
    ambientPressure?: number;
    momentumThrust: number;
    pressureThrust: number;
    steps: CalculationStep[];
    solvedFor: string;
  } | null>(null);

  const [chartData, setChartData] = useState<any[]>([]);

  // --- Effects ---

  // Load preferences from localStorage
  useEffect(() => {
    const savedUnit = localStorage.getItem("thrustCalc_unitSystem");
    const savedInputs = localStorage.getItem("thrustCalc_inputs");
    if (savedUnit) setUnitSystem(savedUnit as UnitSystem);
    if (savedInputs) setInputs(JSON.parse(savedInputs));
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("thrustCalc_unitSystem", unitSystem);
    localStorage.setItem("thrustCalc_inputs", JSON.stringify(inputs));
  }, [unitSystem, inputs]);

  // --- Unit Conversion Logic ---

  const convertToSI = (value: number, field: string): number => {
    if (unitSystem === "SI") return value;
    
    switch (field) {
      case "massFlowRate": return value * 0.453592; // lb/s to kg/s
      case "exhaustVelocity": return value * 0.3048; // ft/s to m/s
      case "exitArea": return value * 0.092903; // ft² to m²
      case "exitPressure":
      case "ambientPressure": return value * 6894.76; // psi to Pa
      case "thrust": return value * 4.44822; // lbf to N
      default: return value;
    }
  };

  const convertFromSI = (value: number, field: string): number => {
    if (unitSystem === "SI") return value;
    
    switch (field) {
      case "massFlowRate": return value / 0.453592;
      case "exhaustVelocity": return value / 0.3048;
      case "exitArea": return value / 0.092903;
      case "exitPressure":
      case "ambientPressure": return value / 6894.76;
      case "thrust": return value / 4.44822;
      default: return value;
    }
  };

  const getUnit = (field: string): string => {
    const units: Record<string, Record<UnitSystem, string>> = {
      massFlowRate: { SI: "kg/s", Imperial: "lb/s" },
      exhaustVelocity: { SI: "m/s", Imperial: "ft/s" },
      exitArea: { SI: "m²", Imperial: "ft²" },
      exitPressure: { SI: "Pa", Imperial: "psi" },
      ambientPressure: { SI: "Pa", Imperial: "psi" },
      thrust: { SI: "N", Imperial: "lbf" },
    };
    return units[field]?.[unitSystem] || "";
  };

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  // --- Main Calculation Logic ---

  const calculateThrust = () => {
    try {
      // 1. Prepare raw values (convert to SI)
      const rawValues: Record<string, number | undefined> = {
        massFlowRate: inputs.massFlowRate ? convertToSI(parseFloat(inputs.massFlowRate), "massFlowRate") : undefined,
        exhaustVelocity: inputs.exhaustVelocity ? convertToSI(parseFloat(inputs.exhaustVelocity), "exhaustVelocity") : undefined,
        exitArea: inputs.exitArea ? convertToSI(parseFloat(inputs.exitArea), "exitArea") : undefined,
        exitPressure: inputs.exitPressure ? convertToSI(parseFloat(inputs.exitPressure), "exitPressure") : undefined,
        ambientPressure: inputs.ambientPressure ? convertToSI(parseFloat(inputs.ambientPressure), "ambientPressure") : undefined,
        thrust: inputs.thrust ? convertToSI(parseFloat(inputs.thrust), "thrust") : undefined,
      };

      // 2. Determine what to solve for
      const emptyFields = Object.entries(rawValues).filter(([_, v]) => v === undefined);
      
      if (emptyFields.length === 0) {
        toast({ title: "Too Many Inputs", description: "Leave one field blank to solve for it", variant: "destructive" });
        return;
      }
      if (emptyFields.length > 1) {
        toast({ title: "Insufficient Data", description: "Please fill in all but one field", variant: "destructive" });
        return;
      }

      // 3. Validate inputs
      const validated = thrustSchema.parse(rawValues);
      const solveFor = emptyFields[0][0];
      const steps: CalculationStep[] = [];
      let resultValues: any = {};

      // F = ṁVe + (Pe - Pa)Ae
      steps.push({
        equation: "F = ṁVe + (Pe - Pa)Ae",
        description: "Thrust equals momentum thrust plus pressure thrust"
      });

      // 4. Solve
      switch (solveFor) {
        case "thrust": {
          const mdot = validated.massFlowRate!;
          const ve = validated.exhaustVelocity!;
          const pe = validated.exitPressure!;
          const pa = validated.ambientPressure!;
          const ae = validated.exitArea!;
          
          const momentumThrust = mdot * ve;
          const pressureThrust = (pe - pa) * ae;
          const totalThrust = momentumThrust + pressureThrust;

          steps.push({
            equation: `F = (${mdot.toFixed(2)})(${ve.toFixed(2)}) + (${pe.toFixed(0)} - ${pa.toFixed(0)})(${ae.toFixed(4)})`,
            description: "Substitute known values"
          });
          steps.push({
            equation: `F = ${totalThrust.toFixed(2)} N`,
            description: "Sum components"
          });

          resultValues = { thrust: totalThrust, momentumThrust, pressureThrust };
          break;
        }

        case "massFlowRate": {
          const f = validated.thrust!;
          const ve = validated.exhaustVelocity!;
          const pe = validated.exitPressure!;
          const pa = validated.ambientPressure!;
          const ae = validated.exitArea!;
          
          const pressureThrust = (pe - pa) * ae;
          const mdot = (f - pressureThrust) / ve;

          steps.push({ equation: "ṁ = (F - (Pe - Pa)Ae) / Ve", description: "Rearrange for mass flow" });
          steps.push({ equation: `ṁ = ${mdot.toFixed(4)} kg/s`, description: "Calculated result" });

          resultValues = { massFlowRate: mdot, momentumThrust: mdot * ve, pressureThrust };
          break;
        }

        case "exhaustVelocity": {
          const f = validated.thrust!;
          const mdot = validated.massFlowRate!;
          const pe = validated.exitPressure!;
          const pa = validated.ambientPressure!;
          const ae = validated.exitArea!;
          
          const pressureThrust = (pe - pa) * ae;
          const ve = (f - pressureThrust) / mdot;

          steps.push({ equation: "Ve = (F - (Pe - Pa)Ae) / ṁ", description: "Rearrange for velocity" });
          steps.push({ equation: `Ve = ${ve.toFixed(2)} m/s`, description: "Calculated result" });

          resultValues = { exhaustVelocity: ve, momentumThrust: mdot * ve, pressureThrust };
          break;
        }

        case "exitArea": {
          const f = validated.thrust!;
          const mdot = validated.massFlowRate!;
          const ve = validated.exhaustVelocity!;
          const pe = validated.exitPressure!;
          const pa = validated.ambientPressure!;
          
          const momentumThrust = mdot * ve;
          
          // Check for division by zero (pressure balanced)
          if (pe === pa) {
            toast({ 
              title: "Calculation Indeterminate", 
              description: "Pressure is balanced (Pe = Pa). Area cannot be derived from this equation.", 
              variant: "destructive" 
            });
            return;
          }

          const ae = (f - momentumThrust) / (pe - pa);

          steps.push({ equation: "Ae = (F - ṁVe) / (Pe - Pa)", description: "Rearrange for Area" });
          steps.push({ equation: `Ae = ${ae.toFixed(6)} m²`, description: "Calculated result" });

          resultValues = { exitArea: ae, momentumThrust, pressureThrust: (pe - pa) * ae };
          break;
        }

        case "exitPressure": {
          const f = validated.thrust!;
          const mdot = validated.massFlowRate!;
          const ve = validated.exhaustVelocity!;
          const pa = validated.ambientPressure!;
          const ae = validated.exitArea!;
          
          const momentumThrust = mdot * ve;
          const pe = pa + (f - momentumThrust) / ae;

          steps.push({ equation: "Pe = Pa + (F - ṁVe) / Ae", description: "Rearrange for Exit Pressure" });
          steps.push({ equation: `Pe = ${pe.toFixed(0)} Pa`, description: "Calculated result" });

          resultValues = { exitPressure: pe, momentumThrust, pressureThrust: (pe - pa) * ae };
          break;
        }

        case "ambientPressure": {
          const f = validated.thrust!;
          const mdot = validated.massFlowRate!;
          const ve = validated.exhaustVelocity!;
          const pe = validated.exitPressure!;
          const ae = validated.exitArea!;
          
          const momentumThrust = mdot * ve;
          const pa = pe - (f - momentumThrust) / ae;

          steps.push({ equation: "Pa = Pe - (F - ṁVe) / Ae", description: "Rearrange for Ambient Pressure" });
          steps.push({ equation: `Pa = ${pa.toFixed(0)} Pa`, description: "Calculated result" });

          resultValues = { ambientPressure: pa, momentumThrust, pressureThrust: (pe - pa) * ae };
          break;
        }
      }

      // 5. Physics Sanity Check
      if (resultValues.thrust && resultValues.thrust < 0) {
        toast({
          title: "Non-Physical Result",
          description: "Negative thrust is not physically possible with these inputs.",
          variant: "destructive",
        });
        return;
      }

      // 6. Generate Chart Data (Sensitivity Analysis)
      // Only generate if we have enough info to vary Ve or ṁ
      if (solveFor === "thrust" && validated.massFlowRate && validated.exhaustVelocity) {
        const baseVe = validated.exhaustVelocity;
        const data = [];
        for (let i = 0.5; i <= 1.5; i += 0.1) {
          const ve = baseVe * i;
          const f = validated.massFlowRate * ve + (validated.exitPressure! - validated.ambientPressure!) * validated.exitArea!;
          data.push({
            exhaustVelocity: convertFromSI(ve, "exhaustVelocity"),
            thrust: convertFromSI(f, "thrust")
          });
        }
        setChartData(data);
      } else {
        setChartData([]);
      }

      setResult({
        ...resultValues,
        steps,
        solvedFor: solveFor,
      });

      const displayValue = convertFromSI(resultValues[solveFor] || resultValues.thrust, solveFor === "thrust" ? "thrust" : solveFor);
      toast({
        title: "Calculation Complete",
        description: `${solveFor}: ${displayValue.toFixed(2)} ${getUnit(solveFor)}`,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Input",
          description: error.errors[0]?.message || "Please check your inputs",
          variant: "destructive",
        });
      } else {
        console.error(error);
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    }
  };

  const resetCalculator = () => {
    setInputs({
      massFlowRate: "",
      exhaustVelocity: "",
      exitArea: "",
      exitPressure: "",
      ambientPressure: "",
      thrust: "",
    });
    setResult(null);
    setChartData([]);
  };

  // --- Render ---

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Rocket className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
            <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Rocket Thrust Calculator
            </h2>
          </div>
          <div className="flex-1 flex justify-end">
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-cyan-400/30 text-cyan-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI (Metric)</SelectItem>
                <SelectItem value="Imperial">Imperial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Advanced multi-variable solver - Leave any field blank to solve for it
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 hover:border-cyan-400/40 transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-cyan-400" />
                Input Parameters
              </CardTitle>
              <CardDescription className="text-gray-400">
                Enter the rocket engine parameters below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: "thrust", label: "Thrust (F)" },
                { id: "massFlowRate", label: "Mass Flow Rate (ṁ)" },
                { id: "exhaustVelocity", label: "Exhaust Velocity (Ve)" },
                { id: "exitArea", label: "Exit Area (Ae)" },
                { id: "exitPressure", label: "Exit Pressure (Pe)" },
                { id: "ambientPressure", label: "Ambient Pressure (Pa)" },
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-gray-300">
                    {field.label} <span className="text-gray-500">{getUnit(field.id)}</span>
                  </Label>
                  <Input
                    id={field.id}
                    type="number"
                    value={inputs[field.id as keyof typeof inputs]}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="bg-slate-900/50 border-cyan-400/30 text-white focus:border-cyan-400 focus:ring-cyan-400/50 transition-all"
                    placeholder="Leave blank to solve"
                  />
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={calculateThrust}
                    className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate
                  </Button>
                </motion.div>
                <Button
                  onClick={resetCalculator}
                  variant="outline"
                  className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/60 transition-all"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results & Theory Section */}
        <div className="space-y-6">
          {/* Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white">Results</CardTitle>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-lg border border-cyan-400/30">
                      <p className="text-gray-400 text-sm mb-1">
                        {result.solvedFor === "thrust" ? "Total Thrust" : `Solved: ${result.solvedFor}`}
                      </p>
                      <p className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                        {/* Result Display Logic */}
                         {result.thrust !== undefined && result.solvedFor === "thrust"
                          ? `${convertFromSI(result.thrust, "thrust").toFixed(2)} ${getUnit("thrust")}`
                          : result.massFlowRate !== undefined && result.solvedFor === "massFlowRate"
                          ? `${convertFromSI(result.massFlowRate, "massFlowRate").toFixed(4)} ${getUnit("massFlowRate")}`
                          : result.exhaustVelocity !== undefined && result.solvedFor === "exhaustVelocity"
                          ? `${convertFromSI(result.exhaustVelocity, "exhaustVelocity").toFixed(2)} ${getUnit("exhaustVelocity")}`
                          : result.exitArea !== undefined && result.solvedFor === "exitArea"
                          ? `${convertFromSI(result.exitArea, "exitArea").toFixed(6)} ${getUnit("exitArea")}`
                          : result.exitPressure !== undefined && result.solvedFor === "exitPressure"
                          ? `${convertFromSI(result.exitPressure, "exitPressure").toFixed(0)} ${getUnit("exitPressure")}`
                          : result.ambientPressure !== undefined
                          ? `${convertFromSI(result.ambientPressure, "ambientPressure").toFixed(0)} ${getUnit("ambientPressure")}`
                          : "Error"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-gray-400 text-xs mb-1">Momentum Thrust</p>
                        <p className="text-xl font-semibold text-blue-400">
                          {convertFromSI(result.momentumThrust, "thrust").toFixed(2)} {getUnit("thrust")}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-gray-400 text-xs mb-1">Pressure Thrust</p>
                        <p className="text-xl font-semibold text-blue-400">
                          {convertFromSI(result.pressureThrust, "thrust").toFixed(2)} {getUnit("thrust")}
                        </p>
                      </div>
                    </div>

                    {/* Step-by-step explanation */}
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="steps" className="border-cyan-400/20">
                        <AccordionTrigger className="text-white hover:text-cyan-400">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-cyan-400" />
                            Step-by-Step Solution
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-300 space-y-3 pt-2">
                          {result.steps.map((step, idx) => (
                            <div key={idx} className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                              <p className="text-xs text-gray-400 mb-1">Step {idx + 1}</p>
                              <code className="text-cyan-400 font-mono text-sm block mb-1">
                                {step.equation}
                              </code>
                              <p className="text-gray-300 text-xs">{step.description}</p>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Graphical insights */}
                    {chartData.length > 0 && (
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-cyan-400" />
                          Thrust vs Exhaust Velocity
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis 
                              dataKey="exhaustVelocity" 
                              stroke="#94a3b8" 
                              label={{ value: `Ve (${getUnit("exhaustVelocity")})`, position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                            />
                            <YAxis 
                              stroke="#94a3b8" 
                              label={{ value: `F (${getUnit("thrust")})`, angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                            />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee40', borderRadius: '8px' }}
                              labelStyle={{ color: '#22d3ee' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="thrust" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee' }} name="Thrust" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calculator className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
                    <p className="text-gray-400">
                      Fill in all but one field and click Calculate
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Theory */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white">Thrust Equation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/30">
                  <p className="text-center text-2xl font-mono text-cyan-400 mb-2">
                    F = ṁVe + (Pe - Pa)Ae
                  </p>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p><span className="text-cyan-400">F</span> = Total Thrust (N)</p>
                    <p><span className="text-cyan-400">ṁ</span> = Mass Flow Rate (kg/s)</p>
                    <p><span className="text-cyan-400">Ve</span> = Exhaust Velocity (m/s)</p>
                    <p><span className="text-cyan-400">Pe</span> = Exit Pressure (Pa)</p>
                    <p><span className="text-cyan-400">Pa</span> = Ambient Pressure (Pa)</p>
                    <p><span className="text-cyan-400">Ae</span> = Exit Area (m²)</p>
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

export default ThrustCalculator;
