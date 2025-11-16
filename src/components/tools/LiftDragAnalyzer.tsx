// LiftDragAnalyzer.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plane, TrendingUp, Info, Pencil, BarChartHorizontal } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

/**
 * Advanced Lift-to-Drag Analyzer
 * - useMemo for heavy computations (comparison curves)
 * - safer validation & stall warnings
 * - chart mode toggle (compare all / compare one)
 *
 * Notes:
 * - Airfoil CL_alpha is per degree here (common in simple engineering tools)
 * - All dynamic units converted internally to SI when required
 */

/* ------------------------- Types & Data ------------------------- */
type UnitSystem = "SI" | "Imperial";
type AirfoilKey = keyof typeof AIRFOILS | "custom";

interface AirfoilDatabaseEntry {
  name: string;
  description: string;
  CL_alpha: number; // per degree
  CL_0: number;
  CD_0: number;
  alpha_stall: number;
}

const AIRFOILS: Record<string, AirfoilDatabaseEntry> = {
  NACA0012: { name: "NACA 0012", description: "Symmetric, tail/control use", CL_alpha: 0.105, CL_0: 0.0, CD_0: 0.006, alpha_stall: 15 },
  NACA2412: { name: "NACA 2412", description: "Cambered GA airfoil", CL_alpha: 0.11, CL_0: 0.25, CD_0: 0.007, alpha_stall: 16 },
  NACA4415: { name: "NACA 4415", description: "High-lift", CL_alpha: 0.108, CL_0: 0.55, CD_0: 0.008, alpha_stall: 14 },
  ClarkY: { name: "Clark Y", description: "Classic sport/vintage", CL_alpha: 0.103, CL_0: 0.30, CD_0: 0.0065, alpha_stall: 15.5 },
  Supercritical: { name: "Supercritical", description: "High-speed transport", CL_alpha: 0.095, CL_0: 0.15, CD_0: 0.0055, alpha_stall: 17 },
};

interface Inputs {
  airfoil: AirfoilKey;
  angleOfAttack: string;
  airspeed: string;
  airDensity: string;
  wingArea: string;
  wingSpan: string;
  oswaldEfficiency: string;
}

interface CustomAirfoilInputs {
  name: string;
  description: string;
  CL_alpha: string;
  CL_0: string;
  CD_0: string;
  alpha_stall: string;
}

interface Result {
  CL: number;
  CD: number;
  L_D_ratio: number;
  liftForce: number;
  dragForce: number;
  aspectRatio: number;
  k_factor: number;
  steps: string[];
  airfoilName: string;
}

/* ------------------------- Unit helpers ------------------------- */
// kept self-contained to avoid external dependency when copying file
const unitHelpers = {
  getUnit(param: "speed" | "density" | "area" | "force" | "span", system: UnitSystem) {
    if (system === "SI") {
      return { speed: "m/s", density: "kg/m³", area: "m²", force: "N", span: "m" }[param];
    } else {
      return { speed: "ft/s", density: "slug/ft³", area: "ft²", force: "lbf", span: "ft" }[param];
    }
  },
  toSI(value: number, param: "speed" | "density" | "area" | "span", system: UnitSystem) {
    if (system === "SI") return value;
    if (system === "Imperial") {
      if (param === "speed") return value * 0.3048;
      if (param === "density") return value * 515.379;
      if (param === "area") return value * 0.092903;
      if (param === "span") return value * 0.3048;
    }
    return value;
  },
  fromSI(value: number, param: "force", system: UnitSystem) {
    if (system === "SI") return value;
    if (system === "Imperial") return value * 0.224809;
    return value;
  }
};

/* ------------------------- Component ------------------------- */
export default function LiftDragAnalyzer() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => (localStorage.getItem("lift_unit") as UnitSystem) || "SI");
  const [inputs, setInputs] = useState<Inputs>(() => {
    const saved = localStorage.getItem("lift_inputs");
    return saved ? JSON.parse(saved) : {
      airfoil: "NACA2412" as AirfoilKey,
      angleOfAttack: "5",
      airspeed: "50",
      airDensity: "1.225",
      wingArea: "16",
      wingSpan: "10",
      oswaldEfficiency: "0.85",
    };
  });
  const [customAirfoil, setCustomAirfoil] = useState<CustomAirfoilInputs>(() => {
    const saved = localStorage.getItem("lift_custom");
    return saved ? JSON.parse(saved) : {
      name: "Custom Airfoil",
      description: "User defined",
      CL_alpha: "0.10",
      CL_0: "0.2",
      CD_0: "0.007",
      alpha_stall: "15",
    };
  });

  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string>("");
  const [chartMode, setChartMode] = useState<"compareOne" | "compareAll">("compareOne");
  const [comparisonAirfoil, setComparisonAirfoil] = useState<keyof typeof AIRFOILS>("NACA0012");

  useEffect(() => localStorage.setItem("lift_unit", unitSystem), [unitSystem]);
  useEffect(() => localStorage.setItem("lift_inputs", JSON.stringify(inputs)), [inputs]);
  useEffect(() => localStorage.setItem("lift_custom", JSON.stringify(customAirfoil)), [customAirfoil]);

  const activeAirfoil = useMemo(() => {
    if (inputs.airfoil === "custom") {
      return {
        name: customAirfoil.name || "Custom",
        description: customAirfoil.description || "",
        CL_alpha: parseFloat(customAirfoil.CL_alpha) || 0.1,
        CL_0: parseFloat(customAirfoil.CL_0) || 0,
        CD_0: parseFloat(customAirfoil.CD_0) || 0.007,
        alpha_stall: parseFloat(customAirfoil.alpha_stall) || 15,
      } as AirfoilDatabaseEntry;
    }
    return AIRFOILS[inputs.airfoil];
  }, [inputs.airfoil, customAirfoil]);

  const validateAndParse = useCallback(() => {
    setError("");
    const parseFloatSafe = (s: string) => {
      const v = parseFloat(s);
      return Number.isFinite(v) ? v : NaN;
    };

    const alpha = parseFloatSafe(inputs.angleOfAttack);
    const V = unitHelpers.toSI(parseFloatSafe(inputs.airspeed), "speed", unitSystem);
    const rho = unitHelpers.toSI(parseFloatSafe(inputs.airDensity), "density", unitSystem);
    const S = unitHelpers.toSI(parseFloatSafe(inputs.wingArea), "area", unitSystem);
    const b = unitHelpers.toSI(parseFloatSafe(inputs.wingSpan), "span", unitSystem);
    const e = parseFloatSafe(inputs.oswaldEfficiency);

    if ([alpha, V, rho, S, b, e].some((v) => !Number.isFinite(v))) {
      throw new Error("All fields must be valid numbers.");
    }
    if (V <= 0 || rho <= 0 || S <= 0 || b <= 0) {
      throw new Error("Airspeed, density, wing area and span must be positive.");
    }
    if (!(e > 0 && e <= 1.0)) {
      throw new Error("Oswald efficiency must be between 0 and 1.");
    }
    return { alpha, V, rho, S, b, e };
  }, [inputs, unitSystem]);

  const compute = useCallback(() => {
    try {
      const { alpha, V, rho, S, b, e } = validateAndParse();
      const AR = (b * b) / S;
      const k = 1 / (Math.PI * AR * e);

      // CL linear with alpha (simple model used across codebase)
      const CL = activeAirfoil.CL_0 + activeAirfoil.CL_alpha * alpha;
      const CD = activeAirfoil.CD_0 + k * CL * CL;
      const q = 0.5 * rho * V * V;
      const L = CL * q * S;
      const D = CD * q * S;
      const L_D = CD > 0 ? CL / CD : 0;

      const steps = [
        `Airfoil: ${activeAirfoil.name}`,
        `Given: α=${alpha}°, V=${V.toFixed(2)} m/s, ρ=${rho.toFixed(3)} kg/m³, S=${S.toFixed(3)} m², b=${b.toFixed(3)} m, e=${e.toFixed(3)}`,
        `AR = b² / S = ${AR.toFixed(2)}`,
        `k = 1 / (π × AR × e) = ${k.toFixed(4)}`,
        `CL = CL₀ + CL_α × α = ${activeAirfoil.CL_0.toFixed(3)} + ${activeAirfoil.CL_alpha.toFixed(3)} × ${alpha} = ${CL.toFixed(4)}`,
        `CD = CD₀ + k × CL² = ${activeAirfoil.CD_0.toFixed(4)} + ${k.toFixed(4)} × ${CL.toFixed(4)}² = ${CD.toFixed(4)}`,
        `q = 0.5 × ρ × V² = ${q.toFixed(2)} Pa`,
        `Lift = CL × q × S = ${L.toFixed(2)} N`,
        `Drag = CD × q × S = ${D.toFixed(2)} N`,
        `L/D = CL / CD = ${L_D.toFixed(2)}`,
      ];

      setResult({
        CL, CD, L_D_ratio: L_D, liftForce: L, dragForce: D, aspectRatio: AR, k_factor: k,
        steps, airfoilName: activeAirfoil.name
      });

      // Clear error if any
      setError("");
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    }
  }, [activeAirfoil, validateAndParse]);

  // comparison dataset generation memoized for performance
  const comparisonData = useMemo(() => {
    if (!result) return [];
    // produce L/D vs alpha for -5..20 deg
    const k = result.k_factor;
    const arr: any[] = [];
    for (let alpha = -5; alpha <= 20; alpha += 1) {
      const row: any = { alpha };
      Object.keys(AIRFOILS).forEach((key) => {
        const af = AIRFOILS[key];
        if (alpha <= af.alpha_stall) {
          const CL = af.CL_0 + af.CL_alpha * alpha;
          const CD = af.CD_0 + k * CL * CL;
          row[key] = CD !== 0 ? CL / CD : null;
        } else {
          row[key] = null;
        }
      });
      // custom
      if (inputs.airfoil === "custom") {
        const af = activeAirfoil;
        row.custom = alpha <= af.alpha_stall ? (() => {
          const CL = af.CL_0 + af.CL_alpha * alpha;
          const CD = af.CD_0 + k * CL * CL;
          return CD !== 0 ? CL / CD : null;
        })() : null;
      }
      arr.push(row);
    }
    return arr;
  }, [result, inputs.airfoil, activeAirfoil]);

  // small helpers to update input fields
  const onChange = useCallback(<K extends keyof Inputs>(key: K, value: string) => {
    setInputs((p) => ({ ...p, [key]: value }));
  }, []);

  const onCustomChange = useCallback(<K extends keyof CustomAirfoilInputs>(key: K, value: string) => {
    setCustomAirfoil((p) => ({ ...p, [key]: value }));
  }, []);

  // initial compute if saved params exist
  useEffect(() => {
    // only auto-calc when mounted and default-looking inputs exist
    try { compute(); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-6xl mx-auto p-4">
      <Card className="bg-slate-900/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-cyan-300 text-2xl">Advanced Lift-to-Drag Analyzer</CardTitle>
              <CardDescription className="text-slate-300">Estimate lift, drag, and L/D and compare airfoils across AoA sweep.</CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
                <SelectTrigger className="w-40 bg-slate-800 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SI">SI (m, kg)</SelectItem>
                  <SelectItem value="Imperial">Imperial (ft, slug)</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={compute} className="bg-cyan-500 text-white">Analyze</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Airfoil</Label>
                <Select value={inputs.airfoil} onValueChange={(v) => onChange("airfoil", v as AirfoilKey)}>
                  <SelectTrigger className="bg-slate-800 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(AIRFOILS).map((k) => <SelectItem key={k} value={k}>{AIRFOILS[k].name}</SelectItem>)}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-slate-400 mt-1">{inputs.airfoil === "custom" ? customAirfoil.description : AIRFOILS[inputs.airfoil].description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Angle of Attack (°)</Label>
                  <Input value={inputs.angleOfAttack} onChange={(e) => onChange("angleOfAttack", e.target.value)} />
                </div>
                <div>
                  <Label>Airspeed ({unitHelpers.getUnit("speed", unitSystem)})</Label>
                  <Input value={inputs.airspeed} onChange={(e) => onChange("airspeed", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Air Density ({unitHelpers.getUnit("density", unitSystem)})</Label>
                  <Input value={inputs.airDensity} onChange={(e) => onChange("airDensity", e.target.value)} />
                </div>
                <div>
                  <Label>Wing Area ({unitHelpers.getUnit("area", unitSystem)})</Label>
                  <Input value={inputs.wingArea} onChange={(e) => onChange("wingArea", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Wing Span ({unitHelpers.getUnit("span", unitSystem)})</Label>
                  <Input value={inputs.wingSpan} onChange={(e) => onChange("wingSpan", e.target.value)} />
                </div>
                <div>
                  <Label>Oswald Efficiency (e)</Label>
                  <Input value={inputs.oswaldEfficiency} onChange={(e) => onChange("oswaldEfficiency", e.target.value)} />
                </div>
              </div>

              <AnimatePresence>
                {inputs.airfoil === "custom" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="p-3 bg-slate-800 rounded-md">
                      <Label>Custom Airfoil</Label>
                      <Input value={customAirfoil.name} onChange={(e) => onCustomChange("name", e.target.value)} placeholder="Name" />
                      <Input value={customAirfoil.CL_0} onChange={(e) => onCustomChange("CL_0", e.target.value)} placeholder="CL_0" />
                      <Input value={customAirfoil.CL_alpha} onChange={(e) => onCustomChange("CL_alpha", e.target.value)} placeholder="CL_alpha (per deg)" />
                      <Input value={customAirfoil.CD_0} onChange={(e) => onCustomChange("CD_0", e.target.value)} placeholder="CD_0" />
                      <Input value={customAirfoil.alpha_stall} onChange={(e) => onCustomChange("alpha_stall", e.target.value)} placeholder="Stall angle (deg)" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              {result ? (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-800 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-slate-400">Airfoil</div>
                        <div className="text-xl text-cyan-300 font-bold">{result.airfoilName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-400">L/D</div>
                        <div className="text-2xl text-green-400 font-semibold">{result.L_D_ratio.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <div className="text-sm text-slate-400">Lift</div>
                        <div className="text-lg text-white">{unitHelpers.fromSI(result.liftForce, "force", unitSystem).toFixed(2)} {unitHelpers.getUnit("force", unitSystem)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Drag</div>
                        <div className="text-lg text-white">{unitHelpers.fromSI(result.dragForce, "force", unitSystem).toFixed(2)} {unitHelpers.getUnit("force", unitSystem)}</div>
                      </div>
                    </div>
                  </div>

                  <Accordion type="single" collapsible>
                    <AccordionItem value="steps">
                      <AccordionTrigger><div className="flex items-center gap-2"><Info/>Steps</div></AccordionTrigger>
                      <AccordionContent>
                        <div className="text-xs font-mono text-slate-300 space-y-1">
                          {result.steps.map((s, i) => <div key={i}>{s}</div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : (
                <div className="text-center p-8 bg-slate-800 rounded-md">
                  <Plane className="mx-auto text-cyan-400" />
                  <div className="text-slate-400">Results will appear here</div>
                </div>
              )}
            </div>
          </div>

          {/* Comparison chart */}
          {comparisonData.length > 0 && (
            <div className="mt-6 p-3 bg-slate-800 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <div className="text-cyan-300 font-semibold">Performance Comparison (L/D vs AoA)</div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setChartMode((m) => m === "compareOne" ? "compareAll" : "compareOne")}>
                    {chartMode === "compareOne" ? "Compare All" : "Compare One"}
                  </Button>
                  {chartMode === "compareOne" && (
                    <Select value={comparisonAirfoil} onValueChange={(v) => setComparisonAirfoil(v as keyof typeof AIRFOILS)}>
                      <SelectTrigger className="w-44 bg-slate-700 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(AIRFOILS).map((k) => <SelectItem value={k} key={k}>{AIRFOILS[k].name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="alpha" label={{ value: "AoA (°)", position: "insideBottom", fill: "#94a3b8" }} />
                  <YAxis label={{ value: "L/D", angle: -90, position: "insideLeft", fill: "#94a3b8" }} />
                  <Tooltip />
                  <Legend />
                  {chartMode === "compareAll" ? (
                    <>
                      <Line type="monotone" dataKey="NACA0012" name="NACA 0012" stroke="#22d3ee" dot={false} />
                      <Line type="monotone" dataKey="NACA2412" name="NACA 2412" stroke="#3b82f6" dot={false} />
                      <Line type="monotone" dataKey="NACA4415" name="NACA 4415" stroke="#10b981" dot={false} />
                      <Line type="monotone" dataKey="ClarkY" name="Clark Y" stroke="#f59e0b" dot={false} />
                      <Line type="monotone" dataKey="Supercritical" name="Supercritical" stroke="#ef4444" dot={false} />
                      {inputs.airfoil === "custom" && <Line type="monotone" dataKey="custom" name={activeAirfoil.name} stroke="#e879f9" dot={false} />}
                    </>
                  ) : (
                    <>
                      <Line type="monotone" dataKey={inputs.airfoil === "custom" ? "custom" : inputs.airfoil} name={activeAirfoil.name} stroke="#22d3ee" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey={comparisonAirfoil} name={AIRFOILS[comparisonAirfoil].name} stroke="#f59e0b" dot={false} strokeDasharray="5 5" />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
export default LiftDragAnalyzer;
