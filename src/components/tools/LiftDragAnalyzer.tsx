"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Info, Plane } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type UnitSystem = "SI" | "Imperial";

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

interface LiftDragInputs {
  airfoil: keyof typeof airfoils;
  angleOfAttack: string;
  airspeed: string;
  airDensity: string;
  wingArea: string;
}

interface LiftDragResult {
  CL: number;
  CD: number;
  L_D_ratio: number;
  liftForce: number;
  dragForce: number;
  steps: string[];
}

const LiftDragAnalyzer = () => {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    return (localStorage.getItem("liftDragUnitSystem") as UnitSystem) || "SI";
  });

  const [inputs, setInputs] = useState<LiftDragInputs>(() => {
    const saved = localStorage.getItem("liftDragInputs");
    return saved ? JSON.parse(saved) : {
      airfoil: "NACA2412" as keyof typeof airfoils,
      angleOfAttack: "5",
      airspeed: "50",
      airDensity: "1.225",
      wingArea: "16",
    };
  });

  const [result, setResult] = useState<LiftDragResult | null>(null);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    localStorage.setItem("liftDragUnitSystem", unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    localStorage.setItem("liftDragInputs", JSON.stringify(inputs));
  }, [inputs]);

  const getUnit = (param: string) => {
    if (unitSystem === "SI") {
      if (param === "speed") return "m/s";
      if (param === "density") return "kg/m³";
      if (param === "area") return "m²";
      if (param === "force") return "N";
    } else {
      if (param === "speed") return "ft/s";
      if (param === "density") return "slug/ft³";
      if (param === "area") return "ft²";
      if (param === "force") return "lbf";
    }
    return "";
  };

  const convertToSI = (value: number, param: string) => {
    if (unitSystem === "SI") return value;
    if (param === "speed") return value * 0.3048; // ft/s to m/s
    if (param === "density") return value * 515.379; // slug/ft³ to kg/m³
    if (param === "area") return value * 0.092903; // ft² to m²
    return value;
  };

  const convertFromSI = (value: number, param: string) => {
    if (unitSystem === "SI") return value;
    if (param === "force") return value * 0.224809; // N to lbf
    return value;
  };

  const calculateLiftDrag = () => {
    setError("");
    try {
      const alpha = parseFloat(inputs.angleOfAttack);
      const V = convertToSI(parseFloat(inputs.airspeed), "speed");
      const rho = convertToSI(parseFloat(inputs.airDensity), "density");
      const S = convertToSI(parseFloat(inputs.wingArea), "area");

      if (isNaN(alpha) || isNaN(V) || isNaN(rho) || isNaN(S)) {
        throw new Error("All fields must be valid numbers");
      }

      if (V <= 0 || rho <= 0 || S <= 0) {
        throw new Error("Airspeed, density, and wing area must be positive");
      }

      const airfoil = airfoils[inputs.airfoil];

      // Check for stall
      if (Math.abs(alpha) > airfoil.alpha_stall) {
        setError(`Warning: Angle of attack exceeds stall angle (${airfoil.alpha_stall}°). Results may be unrealistic.`);
      }

      // Calculate lift coefficient: CL = CL_0 + CL_alpha * alpha
      const CL = airfoil.CL_0 + airfoil.CL_alpha * alpha;

      // Drag coefficient (simplified polar): CD = CD_0 + k * CL^2
      const k = 0.05; // Induced drag factor
      const CD = airfoil.CD_0 + k * Math.pow(CL, 2);

      // Dynamic pressure: q = 0.5 * rho * V^2
      const q = 0.5 * rho * Math.pow(V, 2);

      // Lift and drag forces
      const liftForce = CL * q * S;
      const dragForce = CD * q * S;

      // L/D ratio
      const L_D_ratio = CD !== 0 ? CL / CD : 0;

      const steps = [
        `**Airfoil:** ${airfoil.name}`,
        `**Given:** α = ${alpha}°, V = ${V.toFixed(2)} m/s, ρ = ${rho.toFixed(3)} kg/m³, S = ${S.toFixed(2)} m²`,
        ``,
        `**Step 1:** Calculate lift coefficient`,
        `CL = CL₀ + CL_α × α = ${airfoil.CL_0.toFixed(3)} + ${airfoil.CL_alpha.toFixed(4)} × ${alpha} = ${CL.toFixed(4)}`,
        ``,
        `**Step 2:** Calculate drag coefficient`,
        `CD = CD₀ + k × CL² = ${airfoil.CD_0.toFixed(4)} + ${k} × ${CL.toFixed(4)}² = ${CD.toFixed(4)}`,
        ``,
        `**Step 3:** Calculate dynamic pressure`,
        `q = 0.5 × ρ × V² = 0.5 × ${rho.toFixed(3)} × ${V.toFixed(2)}² = ${q.toFixed(2)} Pa`,
        ``,
        `**Step 4:** Calculate forces`,
        `Lift = CL × q × S = ${CL.toFixed(4)} × ${q.toFixed(2)} × ${S.toFixed(2)} = ${liftForce.toFixed(2)} N`,
        `Drag = CD × q × S = ${CD.toFixed(4)} × ${q.toFixed(2)} × ${S.toFixed(2)} = ${dragForce.toFixed(2)} N`,
        ``,
        `**Step 5:** Calculate L/D ratio`,
        `L/D = CL / CD = ${CL.toFixed(4)} / ${CD.toFixed(4)} = ${L_D_ratio.toFixed(2)}`,
        ``,
        `**Interpretation:** ${L_D_ratio > 20 ? "Excellent glide performance" : L_D_ratio > 15 ? "Good efficiency" : L_D_ratio > 10 ? "Moderate efficiency" : "Poor efficiency, high drag"}`,
      ];

      setResult({
        CL,
        CD,
        L_D_ratio,
        liftForce,
        dragForce,
        steps,
      });

      // Generate comparison data across angle of attack range
      generateComparisonData();
    } catch (err) {
      setError((err as Error).message);
      setResult(null);
    }
  };

  const generateComparisonData = () => {
    const data = [];
    const V = convertToSI(parseFloat(inputs.airspeed), "speed");
    const rho = convertToSI(parseFloat(inputs.airDensity), "density");
    const S = convertToSI(parseFloat(inputs.wingArea), "area");
    const q = 0.5 * rho * Math.pow(V, 2);

    for (let alpha = -5; alpha <= 20; alpha += 1) {
      const point: any = { alpha };

      Object.keys(airfoils).forEach((key) => {
        const airfoil = airfoils[key as keyof typeof airfoils];
        if (alpha <= airfoil.alpha_stall) {
          const CL = airfoil.CL_0 + airfoil.CL_alpha * alpha;
          const CD = airfoil.CD_0 + 0.05 * Math.pow(CL, 2);
          point[key] = CD !== 0 ? CL / CD : 0;
        }
      });

      data.push(point);
    }

    setComparisonData(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-7xl mx-auto"
    >
      <Card className="bg-slate-900/80 backdrop-blur-lg border-cyan-400/20 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                <TrendingUp className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-3xl text-cyan-400 font-bold">
                  Lift-to-Drag Ratio Analyzer
                </CardTitle>
                <CardDescription className="text-slate-300 text-base">
                  Calculate aerodynamic performance and compare airfoil efficiency.
                </CardDescription>
              </div>
            </div>
            <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
              <SelectTrigger className="w-32 bg-slate-700/50 border-cyan-400/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SI (m, kg)</SelectItem>
                <SelectItem value="Imperial">Imperial (ft, slug)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Panel */}
            <div className="space-y-4 p-4 rounded-lg bg-slate-800/50 border border-cyan-400/20">
              <h3 className="text-xl font-semibold text-cyan-400">Flight Configuration</h3>

              <div className="space-y-2">
                <Label htmlFor="airfoil" className="text-cyan-300">Airfoil Type</Label>
                <Select value={inputs.airfoil} onValueChange={(v) => setInputs({ ...inputs, airfoil: v as keyof typeof airfoils })}>
                  <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(airfoils).map((key) => (
                      <SelectItem key={key} value={key}>
                        {airfoils[key as keyof typeof airfoils].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">{airfoils[inputs.airfoil].description}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="angleOfAttack" className="text-cyan-300">Angle of Attack (degrees)</Label>
                <Input
                  id="angleOfAttack"
                  type="number"
                  value={inputs.angleOfAttack}
                  onChange={(e) => setInputs({ ...inputs, angleOfAttack: e.target.value })}
                  className="bg-slate-700/50 border-cyan-400/30 text-white"
                />
                <p className="text-xs text-slate-400">Typical range: -5° to 15°</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="airspeed" className="text-cyan-300">Airspeed ({getUnit("speed")})</Label>
                <Input
                  id="airspeed"
                  type="number"
                  value={inputs.airspeed}
                  onChange={(e) => setInputs({ ...inputs, airspeed: e.target.value })}
                  className="bg-slate-700/50 border-cyan-400/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="airDensity" className="text-cyan-300">Air Density ({getUnit("density")})</Label>
                <Input
                  id="airDensity"
                  type="number"
                  value={inputs.airDensity}
                  onChange={(e) => setInputs({ ...inputs, airDensity: e.target.value })}
                  className="bg-slate-700/50 border-cyan-400/30 text-white"
                />
                <p className="text-xs text-slate-400">Sea level: 1.225 kg/m³</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wingArea" className="text-cyan-300">Wing Area ({getUnit("area")})</Label>
                <Input
                  id="wingArea"
                  type="number"
                  value={inputs.wingArea}
                  onChange={(e) => setInputs({ ...inputs, wingArea: e.target.value })}
                  className="bg-slate-700/50 border-cyan-400/30 text-white"
                />
              </div>

              <Button
                type="button"
                onClick={calculateLiftDrag}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold"
              >
                <Plane className="w-4 h-4 mr-2" />
                Calculate Performance
              </Button>
            </div>

            {/* Results Panel */}
            {result && (
              <div className="space-y-4 p-4 rounded-lg bg-slate-800/50 border border-cyan-400/20">
                <h3 className="text-xl font-semibold text-cyan-400">Results</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-slate-700/50 border border-cyan-400/20">
                    <p className="text-sm text-slate-400">Lift Coefficient</p>
                    <p className="text-2xl font-bold text-cyan-400">{result.CL.toFixed(4)}</p>
                  </div>
                  <div className="p-3 rounded bg-slate-700/50 border border-cyan-400/20">
                    <p className="text-sm text-slate-400">Drag Coefficient</p>
                    <p className="text-2xl font-bold text-cyan-400">{result.CD.toFixed(4)}</p>
                  </div>
                  <div className="p-3 rounded bg-slate-700/50 border border-cyan-400/20">
                    <p className="text-sm text-slate-400">L/D Ratio</p>
                    <p className="text-2xl font-bold text-green-400">{result.L_D_ratio.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded bg-slate-700/50 border border-cyan-400/20">
                    <p className="text-sm text-slate-400">Efficiency</p>
                    <p className="text-xl font-bold text-green-400">
                      {result.L_D_ratio > 20 ? "Excellent" : result.L_D_ratio > 15 ? "Good" : result.L_D_ratio > 10 ? "Moderate" : "Poor"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded bg-blue-500/10 border border-blue-400/30">
                    <p className="text-sm text-slate-400">Lift Force</p>
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
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="steps" className="border-cyan-400/20">
                    <AccordionTrigger className="text-cyan-400 hover:text-cyan-300">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        View Calculation Steps
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-300 space-y-1">
                      {result.steps.map((step, i) => (
                        <p key={i} className="text-sm">
                          {step}
                        </p>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>

          {/* Comparison Chart */}
          {comparisonData.length > 0 && (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-cyan-400/20">
              <h3 className="text-xl font-semibold text-cyan-400 mb-4">Airfoil Performance Comparison</h3>
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
                  />
                  <Legend />
                  <Line type="monotone" dataKey="NACA0012" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="NACA2412" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="NACA4415" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ClarkY" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Supercritical" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LiftDragAnalyzer;
