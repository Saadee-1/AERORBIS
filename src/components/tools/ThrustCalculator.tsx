import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Rocket, Info } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const thrustSchema = z.object({
  massFlowRate: z.number().positive("Mass flow rate must be positive"),
  exhaustVelocity: z.number().positive("Exhaust velocity must be positive"),
  exitArea: z.number().positive("Exit area must be positive"),
  exitPressure: z.number().nonnegative("Exit pressure cannot be negative"),
  ambientPressure: z.number().nonnegative("Ambient pressure cannot be negative"),
});

const ThrustCalculator = () => {
  const { toast } = useToast();
  const [inputs, setInputs] = useState({
    massFlowRate: "",
    exhaustVelocity: "",
    exitArea: "",
    exitPressure: "",
    ambientPressure: "",
  });
  const [result, setResult] = useState<{
    thrust: number;
    momentumThrust: number;
    pressureThrust: number;
  } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const calculateThrust = () => {
    try {
      const values = {
        massFlowRate: parseFloat(inputs.massFlowRate),
        exhaustVelocity: parseFloat(inputs.exhaustVelocity),
        exitArea: parseFloat(inputs.exitArea),
        exitPressure: parseFloat(inputs.exitPressure),
        ambientPressure: parseFloat(inputs.ambientPressure),
      };

      const validated = thrustSchema.parse(values);

      // Calculate thrust components
      // F = ṁVe + (Pe - Pa)Ae
      const momentumThrust = validated.massFlowRate * validated.exhaustVelocity;
      const pressureThrust = (validated.exitPressure - validated.ambientPressure) * validated.exitArea;
      const totalThrust = momentumThrust + pressureThrust;

      setResult({
        thrust: totalThrust,
        momentumThrust,
        pressureThrust,
      });

      toast({
        title: "Calculation Complete",
        description: `Total thrust: ${totalThrust.toFixed(2)} N`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Please enter valid numbers for all fields",
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
    });
    setResult(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Rocket className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Rocket Thrust Calculator
          </h2>
        </div>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Calculate rocket thrust using the fundamental thrust equation with momentum and pressure components
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
              <div className="space-y-2">
                <Label htmlFor="massFlowRate" className="text-gray-300">
                  Mass Flow Rate (ṁ) <span className="text-gray-500">kg/s</span>
                </Label>
                <Input
                  id="massFlowRate"
                  type="number"
                  step="0.01"
                  value={inputs.massFlowRate}
                  onChange={(e) => handleInputChange("massFlowRate", e.target.value)}
                  className="bg-slate-900/50 border-cyan-400/30 text-white focus:border-cyan-400 focus:ring-cyan-400/50"
                  placeholder="e.g., 250"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exhaustVelocity" className="text-gray-300">
                  Exhaust Velocity (Ve) <span className="text-gray-500">m/s</span>
                </Label>
                <Input
                  id="exhaustVelocity"
                  type="number"
                  step="0.01"
                  value={inputs.exhaustVelocity}
                  onChange={(e) => handleInputChange("exhaustVelocity", e.target.value)}
                  className="bg-slate-900/50 border-cyan-400/30 text-white focus:border-cyan-400 focus:ring-cyan-400/50"
                  placeholder="e.g., 3500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exitArea" className="text-gray-300">
                  Exit Area (Ae) <span className="text-gray-500">m²</span>
                </Label>
                <Input
                  id="exitArea"
                  type="number"
                  step="0.001"
                  value={inputs.exitArea}
                  onChange={(e) => handleInputChange("exitArea", e.target.value)}
                  className="bg-slate-900/50 border-cyan-400/30 text-white focus:border-cyan-400 focus:ring-cyan-400/50"
                  placeholder="e.g., 1.2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exitPressure" className="text-gray-300">
                  Exit Pressure (Pe) <span className="text-gray-500">Pa</span>
                </Label>
                <Input
                  id="exitPressure"
                  type="number"
                  step="1"
                  value={inputs.exitPressure}
                  onChange={(e) => handleInputChange("exitPressure", e.target.value)}
                  className="bg-slate-900/50 border-cyan-400/30 text-white focus:border-cyan-400 focus:ring-cyan-400/50"
                  placeholder="e.g., 101325"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ambientPressure" className="text-gray-300">
                  Ambient Pressure (Pa) <span className="text-gray-500">Pa</span>
                </Label>
                <Input
                  id="ambientPressure"
                  type="number"
                  step="1"
                  value={inputs.ambientPressure}
                  onChange={(e) => handleInputChange("ambientPressure", e.target.value)}
                  className="bg-slate-900/50 border-cyan-400/30 text-white focus:border-cyan-400 focus:ring-cyan-400/50"
                  placeholder="e.g., 101325"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={calculateThrust}
                  className="flex-1 bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300"
                >
                  Calculate Thrust
                </Button>
                <Button
                  onClick={resetCalculator}
                  variant="outline"
                  className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/60"
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
                      <p className="text-gray-400 text-sm mb-1">Total Thrust</p>
                      <p className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                        {result.thrust.toFixed(2)} N
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-gray-400 text-xs mb-1">Momentum Thrust</p>
                        <p className="text-xl font-semibold text-blue-400">
                          {result.momentumThrust.toFixed(2)} N
                        </p>
                      </div>
                      <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                        <p className="text-gray-400 text-xs mb-1">Pressure Thrust</p>
                        <p className="text-xl font-semibold text-blue-400">
                          {result.pressureThrust.toFixed(2)} N
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-cyan-400" />
                        Explanation
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        The total thrust is the sum of momentum thrust (ṁVe) and pressure thrust ((Pe - Pa)Ae). 
                        Momentum thrust results from the change in momentum of the exhaust gases, while pressure 
                        thrust comes from the pressure difference between the nozzle exit and ambient conditions.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calculator className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
                    <p className="text-gray-400">
                      Enter parameters and click Calculate to see results
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

                <div className="text-gray-300 text-sm space-y-2">
                  <p className="font-semibold text-white">Key Concepts:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-400">
                    <li>Momentum thrust dominates at high altitudes</li>
                    <li>Pressure thrust depends on altitude and nozzle design</li>
                    <li>Optimal nozzle has Pe = Pa for maximum efficiency</li>
                    <li>Underexpanded nozzle: Pe &gt; Pa (loses potential thrust)</li>
                    <li>Overexpanded nozzle: Pe &lt; Pa (can cause flow separation)</li>
                  </ul>
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
