import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Gauge, Plane, Info, TrendingUp } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const wingLoadingSchema = z.object({
  weight: z.number().positive("Aircraft weight must be positive"),
  wingArea: z.number().positive("Wing area must be positive"),
});

const WingLoadingCalculator = () => {
  const { toast } = useToast();
  const [inputs, setInputs] = useState({
    weight: "",
    wingArea: "",
  });
  const [result, setResult] = useState<{
    wingLoading: number;
    interpretation: string;
    category: string;
    characteristics: string[];
  } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const interpretWingLoading = (wl: number) => {
    if (wl < 100) {
      return {
        interpretation: "Very Low Wing Loading",
        category: "Ultralight / Glider",
        characteristics: [
          "Excellent low-speed performance",
          "High maneuverability at low speeds",
          "Long takeoff and landing distances unnecessary",
          "Susceptible to turbulence and gusts",
          "Ideal for soaring and efficiency"
        ]
      };
    } else if (wl < 300) {
      return {
        interpretation: "Low Wing Loading",
        category: "General Aviation",
        characteristics: [
          "Good low-speed handling",
          "Reasonable stall speed",
          "Suitable for short field operations",
          "Comfortable in light turbulence",
          "Typical of training and light aircraft"
        ]
      };
    } else if (wl < 500) {
      return {
        interpretation: "Medium Wing Loading",
        category: "Light Transport / Business Jet",
        characteristics: [
          "Balanced performance envelope",
          "Better high-speed cruise efficiency",
          "Moderate runway requirements",
          "Smoother ride in turbulence",
          "Typical of regional and business aircraft"
        ]
      };
    } else if (wl < 700) {
      return {
        interpretation: "High Wing Loading",
        category: "Commercial Transport",
        characteristics: [
          "Higher cruise speeds possible",
          "Longer takeoff and landing distances",
          "Stable in rough air",
          "Requires sophisticated high-lift devices",
          "Typical of large commercial airliners"
        ]
      };
    } else {
      return {
        interpretation: "Very High Wing Loading",
        category: "Military Fighter / Heavy Transport",
        characteristics: [
          "Optimized for high-speed flight",
          "Requires high approach speeds",
          "Long runway requirements",
          "Excellent ride quality in turbulence",
          "Advanced aerodynamic features essential"
        ]
      };
    }
  };

  const calculateWingLoading = () => {
    try {
      const values = {
        weight: parseFloat(inputs.weight),
        wingArea: parseFloat(inputs.wingArea),
      };

      const validated = wingLoadingSchema.parse(values);

      // Calculate wing loading: W/S (N/m²)
      const wingLoading = validated.weight / validated.wingArea;
      const interpretation = interpretWingLoading(wingLoading);

      setResult({
        wingLoading,
        ...interpretation,
      });

      toast({
        title: "Calculation Complete",
        description: `Wing loading: ${wingLoading.toFixed(2)} N/m²`,
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
      weight: "",
      wingArea: "",
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
          <Plane className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Wing Loading Calculator
          </h2>
        </div>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Calculate wing loading to understand aircraft performance characteristics and handling qualities
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
                <Gauge className="w-5 h-5 text-cyan-400" />
                Input Parameters
              </CardTitle>
              <CardDescription className="text-gray-400">
                Enter the aircraft specifications below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-gray-300">
                  Aircraft Weight (W) <span className="text-gray-500">N</span>
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={inputs.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  className="bg-slate-900/50 border-cyan-400/30 text-white focus:border-cyan-400 focus:ring-cyan-400/50"
                  placeholder="e.g., 45000"
                />
                <p className="text-xs text-gray-500">
                  Total weight of aircraft in Newtons (mass × 9.81)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wingArea" className="text-gray-300">
                  Wing Area (S) <span className="text-gray-500">m²</span>
                </Label>
                <Input
                  id="wingArea"
                  type="number"
                  step="0.01"
                  value={inputs.wingArea}
                  onChange={(e) => handleInputChange("wingArea", e.target.value)}
                  className="bg-slate-900/50 border-cyan-400/30 text-white focus:border-cyan-400 focus:ring-cyan-400/50"
                  placeholder="e.g., 25"
                />
                <p className="text-xs text-gray-500">
                  Total planform area of both wings
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={calculateWingLoading}
                  className="flex-1 bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300"
                >
                  Calculate
                </Button>
                <Button
                  onClick={resetCalculator}
                  variant="outline"
                  className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/60"
                >
                  Reset
                </Button>
              </div>

              {/* Example Values */}
              <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                <h4 className="text-white text-sm font-semibold mb-2">Example Aircraft:</h4>
                <div className="space-y-2 text-xs text-gray-400">
                  <p>• Cessna 172: ~490 N/m² (1,000 lb/ft²)</p>
                  <p>• Boeing 737: ~5,900 N/m² (123 lb/ft²)</p>
                  <p>• F-16 Fighter: ~4,300 N/m² (88 lb/ft²)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results & Analysis Section */}
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
                      <p className="text-gray-400 text-sm mb-1">Wing Loading (W/S)</p>
                      <p className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                        {result.wingLoading.toFixed(2)} N/m²
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        ({(result.wingLoading * 0.020885).toFixed(2)} lb/ft²)
                      </p>
                    </div>

                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-white font-semibold">{result.interpretation}</h4>
                      </div>
                      <p className="text-blue-400 text-sm font-medium mb-3">{result.category}</p>
                      <ul className="space-y-2">
                        {result.characteristics.map((char, idx) => (
                          <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-cyan-400 mt-1">•</span>
                            <span>{char}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/20">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-cyan-400" />
                        Performance Impact
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        Wing loading directly affects stall speed, takeoff/landing distances, maneuverability, 
                        and ride quality. Lower wing loading provides better low-speed handling but increases 
                        drag at high speeds. Higher wing loading enables faster cruise speeds and smoother 
                        flight in turbulence but requires higher approach speeds and longer runways.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Gauge className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
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
                <CardTitle className="text-white">Wing Loading Formula</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/30">
                  <p className="text-center text-2xl font-mono text-cyan-400 mb-2">
                    W/S = W ÷ S
                  </p>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p><span className="text-cyan-400">W/S</span> = Wing Loading (N/m²)</p>
                    <p><span className="text-cyan-400">W</span> = Aircraft Weight (N)</p>
                    <p><span className="text-cyan-400">S</span> = Wing Area (m²)</p>
                  </div>
                </div>

                <div className="text-gray-300 text-sm space-y-2">
                  <p className="font-semibold text-white">Related Concepts:</p>
                  <div className="space-y-3 text-gray-400">
                    <div>
                      <p className="text-cyan-400 font-medium">Stall Speed:</p>
                      <p className="text-xs">Vs ∝ √(W/S) - Higher wing loading = higher stall speed</p>
                    </div>
                    <div>
                      <p className="text-cyan-400 font-medium">Turn Rate:</p>
                      <p className="text-xs">Lower wing loading = tighter turns at low speeds</p>
                    </div>
                    <div>
                      <p className="text-cyan-400 font-medium">Takeoff Distance:</p>
                      <p className="text-xs">Increases with wing loading due to higher rotation speed</p>
                    </div>
                    <div>
                      <p className="text-cyan-400 font-medium">Gust Sensitivity:</p>
                      <p className="text-xs">Higher wing loading = less affected by vertical gusts</p>
                    </div>
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

export default WingLoadingCalculator;
