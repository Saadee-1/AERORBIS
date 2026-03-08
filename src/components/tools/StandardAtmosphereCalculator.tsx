/**
 * Standard Atmosphere (1976) Calculator
 * 
 * Implements the U.S. Standard Atmosphere 1976 with high fidelity
 * Supports altitudes from 0 to 86 km (geopotential)
 * 
 * Features:
 * - All 7 atmospheric layers (Troposphere through Mesosphere 2)
 * - Exact 1976 standard equations
 * - Temperature, pressure, density, speed of sound, viscosity
 * - Gravity variation with altitude
 * - Dynamic pressure calculation (optional)
 * - Geopotential to geometric altitude conversion
 * - SI and Imperial unit support
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Cloud, Calculator } from "lucide-react";
import { useCalculationAnimation } from "@/hooks/useCalculationAnimation";
import { CalculationOverlay } from "@/components/common/CalculationOverlay";
import { useToast } from "@/hooks/use-toast";
import { useToolContext } from "@/hooks/useToolContext";
import { useDesignSession } from "@/contexts/designSession";
import { PDFExportButton } from "@/components/tools/PDFExportButton";
import { AskAIButton } from "@/components/tools/AskAIButton";
import { buildAeroversePayload } from "@/ai/buildPayload";
import { ToolWrapper } from "@/components/layout/ToolWrapper";
import { ToolHeader } from "@/components/layout/ToolHeader";
import { ToolSection } from "@/components/layout/ToolSection";
import { ToolActions } from "@/components/layout/ToolActions";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroFormField } from "@/components/forms/AeroFormField";
import { AeroButton } from "@/components/common/AeroButton";
import { ChartCard } from "@/components/charts/ChartCard";
import { spacingVertical } from "@/styles/spacing";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { globalAxisTickStyle, globalAxisCommonProps } from "@/lib/chartAxisTheme";
import { AeroverseLegend, type LegendItem } from "@/components/charts/AerorbisLegend";
import {
  calculateAtmosphere,
  type AtmosphereResult,
} from "@/tools/atmosphere/utils/calcAtmosphere";
import {
  convertAltitudeToSI,
  convertAltitudeFromSI,
  convertVelocityToSI,
  convertVelocityFromSI,
  getUnitLabels,
} from "@/tools/atmosphere/utils/units";
import { atmosphereInputSchema } from "@/tools/atmosphere/validation/schema";

type UnitSystem = "SI" | "Imperial";

type ToolPayload = {
  tool: string;
  // TODO: refine type for `inputs` — changed any -> unknown automatically by chore/typed-cleanup
  inputs: Record<string, unknown>;
  // TODO: refine type for `results` — changed any -> unknown automatically by chore/typed-cleanup
  results: Record<string, unknown>;
};

export default function StandardAtmosphereCalculator() {
  const { toast } = useToast();
  const { isCalculating, runCalculation } = useCalculationAnimation();
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const { updateDesignSession } = useDesignSession();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<ToolPayload | null>(null);

  // State
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [altitude, setAltitude] = useState("");
  const [velocity, setVelocity] = useState("");
  const [result, setResult] = useState<AtmosphereResult | null>(null);
  const [error, setError] = useState<string>("");

  // Load unit system from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("standardAtmosphere_unitSystem");
    if (stored === "SI" || stored === "Imperial") {
      setUnitSystem(stored);
    }
  }, []);

  // Save unit system to localStorage
  useEffect(() => {
    localStorage.setItem("standardAtmosphere_unitSystem", unitSystem);
  }, [unitSystem]);

  // Load inputs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("standardAtmosphere_inputs");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.altitude) setAltitude(parsed.altitude);
        if (parsed.velocity) setVelocity(parsed.velocity);
      } catch (e) {
        console.warn("Failed to load stored inputs");
      }
    }
  }, []);

  // Save inputs to localStorage
  useEffect(() => {
    if (altitude || velocity) {
      localStorage.setItem(
        "standardAtmosphere_inputs",
        JSON.stringify({ altitude, velocity })
      );
    }
  }, [altitude, velocity]);

  const units = getUnitLabels(unitSystem);
  const altitudeUnit = unitSystem === "Imperial" ? "ft" : "m";
  const velocityUnit = unitSystem === "Imperial" ? "ft/s" : "m/s";

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

  // Calculate atmosphere properties
  const calculate = async () => {
    setError("");
    setResult(null);

    try {
      // Validate altitude input
      if (!altitude.trim()) {
        throw new Error("Altitude is required");
      }

      const altitudeValue = parseFloat(altitude);
      if (isNaN(altitudeValue) || !isFinite(altitudeValue)) {
        throw new Error("Altitude must be a valid finite number");
      }

      // Check for extremely large values that could cause numerical issues
      if (Math.abs(altitudeValue) > 1e10) {
        throw new Error("Altitude value is too large (maximum: 1×10¹⁰)");
      }

      // Convert to SI (meters)
      const altitudeSI = convertAltitudeToSI(altitudeValue, altitudeUnit);
      
      // Validate converted value is finite
      if (!isFinite(altitudeSI)) {
        throw new Error("Altitude conversion produced invalid value");
      }

      // Validate altitude range (ISA 1976 limits)
      if (altitudeSI < 0) {
        throw new Error("Altitude must be non-negative (MSL reference)");
      }
      if (altitudeSI > 86000) {
        throw new Error("Altitude exceeds ISA 1976 maximum (86,000 m). Standard Atmosphere is valid only up to 86 km.");
      }

      // Parse velocity if provided (treat empty string as undefined)
      let velocitySI: number | undefined;
      const velocityTrimmed = velocity.trim();
      if (velocityTrimmed) {
        const velocityValue = parseFloat(velocityTrimmed);
        if (isNaN(velocityValue) || !isFinite(velocityValue)) {
          throw new Error("Velocity must be a valid finite number");
        }
        
        // Check for extremely large values that could cause overflow
        if (Math.abs(velocityValue) > 1e6) {
          throw new Error("Velocity value is too large (maximum: 1×10⁶)");
        }
        
        if (velocityValue < 0) {
          throw new Error("Velocity must be non-negative");
        }
        
        // Convert to SI
        velocitySI = convertVelocityToSI(velocityValue, velocityUnit);
        
        // Validate converted value is finite
        if (!isFinite(velocitySI)) {
          throw new Error("Velocity conversion produced invalid value");
        }
        
        // Check for potential overflow in dynamic pressure calculation
        // q = 0.5 * ρ * V², so we need to ensure V² doesn't overflow
        // At sea level, ρ ≈ 1.225 kg/m³, so max safe V ≈ sqrt(Number.MAX_VALUE / (0.5 * 1.225))
        // This is ~1.7e154, but we'll use a more conservative limit
        if (velocitySI > 1e5) {
          throw new Error("Velocity too large for dynamic pressure calculation (maximum: 100,000 m/s)");
        }
      }

      // Perform calculation
      const atmosphereResult = calculateAtmosphere(altitudeSI, velocitySI);
      
      // Validate all outputs are finite
      const requiredOutputs = [
        { value: atmosphereResult.temperature, name: "Temperature" },
        { value: atmosphereResult.pressure, name: "Pressure" },
        { value: atmosphereResult.density, name: "Density" },
        { value: atmosphereResult.speedOfSound, name: "Speed of sound" },
        { value: atmosphereResult.viscosity, name: "Viscosity" },
        { value: atmosphereResult.gravity, name: "Gravity" },
        { value: atmosphereResult.geopotentialAltitude, name: "Geopotential altitude" },
        { value: atmosphereResult.geometricAltitude, name: "Geometric altitude" },
        { value: atmosphereResult.pressureRatio, name: "Pressure ratio" },
        { value: atmosphereResult.densityRatio, name: "Density ratio" },
        { value: atmosphereResult.temperatureRatio, name: "Temperature ratio" },
      ];
      
      for (const output of requiredOutputs) {
        if (!isFinite(output.value)) {
          throw new Error(`Calculation produced invalid ${output.name} value. Please check inputs.`);
        }
      }
      
      // Validate dynamic pressure if present
      if (atmosphereResult.dynamicPressure !== undefined) {
        if (!isFinite(atmosphereResult.dynamicPressure)) {
          throw new Error("Dynamic pressure calculation produced invalid value");
        }
        if (atmosphereResult.dynamicPressure < 0) {
          throw new Error("Dynamic pressure cannot be negative");
        }
      }
      
      // Validate ratios are reasonable (should be between 0 and 1 for altitude > 0)
      if (altitudeSI > 0) {
        if (atmosphereResult.pressureRatio < 0 || atmosphereResult.pressureRatio > 1) {
          throw new Error("Invalid pressure ratio calculated");
        }
        if (atmosphereResult.densityRatio < 0 || atmosphereResult.densityRatio > 1) {
          throw new Error("Invalid density ratio calculated");
        }
        if (atmosphereResult.temperatureRatio < 0 || atmosphereResult.temperatureRatio > 1) {
          // Temperature ratio T/T₀ should never exceed 1.0 in ISA 1976 (max T = 270.65 K at stratopause < T₀ = 288.15 K)
          throw new Error("Invalid temperature ratio calculated");
        }
      }
      
      setResult(atmosphereResult);

      // Generate calculation steps
      const calculationSteps = [
        `Geopotential altitude: ${atmosphereResult.geopotentialAltitude.toFixed(2)} m`,
        `Geometric altitude: ${atmosphereResult.geometricAltitude.toFixed(2)} m`,
        `Layer: ${atmosphereResult.layerName}`,
        `Temperature: ${atmosphereResult.temperature.toFixed(2)} K (using lapse rate)`,
        `Pressure: ${atmosphereResult.pressure.toFixed(2)} Pa (using 1976 standard)`,
        `Density: ${atmosphereResult.density.toExponential(4)} kg/m³ (ideal gas law)`,
        `Speed of sound: ${atmosphereResult.speedOfSound.toFixed(2)} m/s (sqrt(γRT))`,
        `Viscosity: ${atmosphereResult.viscosity.toExponential(4)} Pa·s (Sutherland's law)`,
        `Gravity: ${atmosphereResult.gravity.toFixed(4)} m/s² (varies with altitude)`,
        ...(atmosphereResult.dynamicPressure !== undefined
          ? [`Dynamic pressure: ${atmosphereResult.dynamicPressure.toFixed(2)} Pa (0.5ρV²)`]
          : []),
      ];

      const eventResponse = await sendCalculationEvent({
        toolId: "standard-atmosphere",
        toolName: "Standard Atmosphere Calculator",
        inputs: {
          altitude: altitudeSI,
          altitudeDisplay: `${altitudeValue} ${altitudeUnit}`,
          velocity: velocitySI,
          velocityDisplay: velocitySI
            ? `${parseFloat(velocityTrimmed)} ${velocityUnit}`
            : undefined,
          unitSystem,
        },
        results: {
          geopotentialAltitude: atmosphereResult.geopotentialAltitude,
          geometricAltitude: atmosphereResult.geometricAltitude,
          temperature: atmosphereResult.temperature,
          pressure: atmosphereResult.pressure,
          density: atmosphereResult.density,
          speedOfSound: atmosphereResult.speedOfSound,
          viscosity: atmosphereResult.viscosity,
          gravity: atmosphereResult.gravity,
          dynamicPressure: atmosphereResult.dynamicPressure,
          pressureRatio: atmosphereResult.pressureRatio,
          densityRatio: atmosphereResult.densityRatio,
          temperatureRatio: atmosphereResult.temperatureRatio,
          layerName: atmosphereResult.layerName,
        },
        steps: calculationSteps,
        metadata: {
          units: unitSystem,
          approxLevel: "exact",
          confidence: "high",
          warnings: atmosphereResult.warnings,
        },
      });

      syncRequestId(eventResponse);
      
      // Publish density to designSession only if finite and positive
      if (Number.isFinite(atmosphereResult.density) && atmosphereResult.density > 0) {
        updateDesignSession({
          densityKgM3: atmosphereResult.density,
        });
      }
      
      applyToolPayload({
        tool: "Standard Atmosphere Calculator",
        inputs: {
          altitude: altitudeSI,
          altitudeDisplay: `${altitudeValue} ${altitudeUnit}`,
          velocity: velocitySI,
          velocityDisplay: velocitySI
            ? `${parseFloat(velocityTrimmed)} ${velocityUnit}`
            : undefined,
          unitSystem,
        },
        results: {
          geopotentialAltitude: atmosphereResult.geopotentialAltitude,
          geometricAltitude: atmosphereResult.geometricAltitude,
          temperature: atmosphereResult.temperature,
          pressure: atmosphereResult.pressure,
          density: atmosphereResult.density,
          speedOfSound: atmosphereResult.speedOfSound,
          viscosity: atmosphereResult.viscosity,
          gravity: atmosphereResult.gravity,
          dynamicPressure: atmosphereResult.dynamicPressure,
          pressureRatio: atmosphereResult.pressureRatio,
          densityRatio: atmosphereResult.densityRatio,
          temperatureRatio: atmosphereResult.temperatureRatio,
          layerName: atmosphereResult.layerName,
        },
      });

      toast({
        title: "Success",
        description: "Atmospheric properties calculated successfully.",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Calculation failed";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Generate chart data
  const chartData = useMemo(() => {
    if (!result) return [];

    const data = [];
    const baseAltitude = result.geopotentialAltitude;
    const range = 5000; // ±5 km range for chart

    for (let i = 0; i <= 20; i++) {
      const alt = Math.max(0, Math.min(86000, baseAltitude - range + (i * range * 2) / 20));
      try {
        const atm = calculateAtmosphere(alt);
        data.push({
          altitude: convertAltitudeFromSI(alt, unitSystem === "Imperial" ? "ft" : "km"),
          temperature: unitSystem === "Imperial"
            ? (atm.temperature * 9/5) - 459.67
            : atm.temperature - 273.15,
          pressure: unitSystem === "Imperial"
            ? atm.pressure / 6894.76
            : atm.pressure / 1000,
          density: atm.density * (unitSystem === "Imperial" ? 515.379 : 1),
        });
      } catch (e) {
        // Skip invalid altitudes
      }
    }

    return data;
  }, [result, unitSystem]);

  return (
    <>
    <CalculationOverlay isActive={isCalculating} label="Computing Atmosphere" />
    <ToolWrapper>
      <ToolHeader
        title="Standard Atmosphere (1976) Calculator"
        description="Compute atmospheric properties from 0–86 km (geopotential) using U.S. Standard Atmosphere 1976"
        icon={Cloud}
        actions={
          <ToolActions>
            <AeroButton
              variant="primary"
              icon={Calculator}
              onClick={calculate}
              disabled={!altitude.trim()}
            >
              Calculate
            </AeroButton>
          </ToolActions>
        }
      />

      <ToolSection gridCols={2}>
        {/* Left Panel - Inputs */}
        <div className="lg:col-span-1">
          <div className={spacingVertical.L}>
            <AeroCard
              title="Atmospheric Conditions"
              description="Enter geopotential altitude and optional velocity"
              icon={Cloud}
            >
              <div className="space-y-4">
                {/* Unit System Selector */}
                <AeroFormField label="Unit System">
                  <RadioGroup
                    value={unitSystem}
                    onValueChange={(value) =>
                      setUnitSystem(value as UnitSystem)
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SI" id="unit-si" />
                      <Label htmlFor="unit-si" className="cursor-pointer">
                        SI (metric)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Imperial" id="unit-imp" />
                      <Label htmlFor="unit-imp" className="cursor-pointer">
                        Imperial
                      </Label>
                    </div>
                  </RadioGroup>
                </AeroFormField>

                {/* Altitude Input */}
                <AeroFormField
                  label={`Geopotential Altitude (${
                    altitudeUnit === "m"
                      ? "meters"
                      : altitudeUnit === "ft"
                      ? "feet"
                      : "kilometers"
                  })`}
                  helperText={
                    unitSystem === "SI"
                      ? "Range: 0 to 86,000 m (0 to 86 km). Geopotential altitude (ISA 1976 standard). Reference: MSL (Mean Sea Level). Geometric altitude is calculated automatically."
                      : "Range: 0 to 282,152 ft (0 to 86 km). Geopotential altitude (ISA 1976 standard). Reference: MSL (Mean Sea Level). Geometric altitude is calculated automatically."
                  }
                  htmlFor="altitude"
                >
                  <Input
                    id="altitude"
                    type="number"
                    value={altitude}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow empty string, numbers, and decimal point
                      if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                        setAltitude(val);
                      }
                    }}
                    placeholder={
                      unitSystem === "SI" ? "0 - 86000" : "0 - 282152"
                    }
                    min="0"
                    max={unitSystem === "SI" ? "86000" : "282152"}
                    step={unitSystem === "SI" ? "1" : "1"}
                    className="bg-slate-700/50 border-cyan-400/30 text-white"
                  />
                  {altitude.trim() && (() => {
                    const val = parseFloat(altitude);
                    const altSI = convertAltitudeToSI(val, altitudeUnit);
                    if (!isNaN(val) && isFinite(val)) {
                      if (altSI < 0) {
                        return <p className="text-xs text-yellow-400 mt-1">Warning: Negative altitude (below MSL)</p>;
                      }
                      if (altSI > 86000) {
                        return <p className="text-xs text-yellow-400 mt-1">Warning: Exceeds ISA 1976 maximum (86 km)</p>;
                      }
                    }
                    return null;
                  })()}
                </AeroFormField>

                {/* Velocity Input (Optional) */}
                <AeroFormField
                  label={`True Airspeed (${velocityUnit}) - Optional`}
                  helperText="True airspeed (TAS) for dynamic pressure calculation (q = 0.5ρV²). Must be non-negative. Leave empty to skip dynamic pressure."
                  htmlFor="velocity"
                >
                  <Input
                    id="velocity"
                    type="number"
                    value={velocity}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow empty string, numbers, and decimal point
                      if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                        setVelocity(val);
                      }
                    }}
                    placeholder="0"
                    className="bg-slate-700/50 border-cyan-400/30 text-white"
                    min="0"
                    step="0.1"
                  />
                  {velocity.trim() && (() => {
                    const val = parseFloat(velocity);
                    if (!isNaN(val) && isFinite(val)) {
                      if (val < 0) {
                        return <p className="text-xs text-yellow-400 mt-1">Warning: Velocity must be non-negative</p>;
                      }
                      const velSI = convertVelocityToSI(val, velocityUnit);
                      if (velSI > 1e5) {
                        return <p className="text-xs text-yellow-400 mt-1">Warning: Velocity too large for dynamic pressure calculation</p>;
                      }
                    }
                    return null;
                  })()}
                </AeroFormField>
              </div>
            </AeroCard>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-1">
          <div className={spacingVertical.L}>
            {error && (
              <Alert className="bg-red-400/10 border-red-400/30">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <AeroCard
                title="Atmospheric Properties"
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
                        toolName="Standard Atmosphere Calculator"
                        disabled={!lastRequestId}
                      />
                    </div>
                  ) : null
                }
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Temperature */}
                  <div className="p-4 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-lg border border-cyan-400/20">
                    <p className="text-xs text-gray-400 mb-1">Static Temperature</p>
                    <p className="text-xs text-gray-500 mb-1">(T, ambient air temperature)</p>
                    <p className="text-cyan-400 font-bold text-xl">
                      {unitSystem === "Imperial"
                        ? `${((result.temperature * 9) / 5 - 459.67).toFixed(2)} °F`
                        : `${(result.temperature - 273.15).toFixed(2)} °C`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {result.temperature.toFixed(2)} K
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      θ = {result.temperatureRatio.toFixed(4)} (T/T₀)
                    </p>
                  </div>

                  {/* Pressure */}
                  <div className="p-4 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-lg border border-purple-400/20">
                    <p className="text-xs text-gray-400 mb-1">Static Pressure</p>
                    <p className="text-xs text-gray-500 mb-1">(P, ambient air pressure)</p>
                    <p className="text-purple-400 font-bold text-xl">
                      {unitSystem === "Imperial"
                        ? `${(result.pressure / 6894.76).toFixed(4)} psi`
                        : `${(result.pressure / 1000).toFixed(2)} kPa`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {result.pressure.toFixed(2)} Pa
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      δ = {result.pressureRatio.toExponential(4)} (P/P₀)
                    </p>
                  </div>

                  {/* Density */}
                  <div className="p-4 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-lg border border-green-400/20">
                    <p className="text-xs text-gray-400 mb-1">Air Density</p>
                    <p className="text-xs text-gray-500 mb-1">(ρ, used for q, Reynolds)</p>
                    <p className="text-green-400 font-bold text-xl">
                      {unitSystem === "Imperial"
                        ? `${(result.density * 515.379).toExponential(4)} slug/ft³`
                        : `${result.density.toExponential(4)} kg/m³`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      σ = {result.densityRatio.toExponential(4)} (ρ/ρ₀)
                    </p>
                  </div>

                  {/* Speed of Sound */}
                  <div className="p-4 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-lg border border-orange-400/20">
                    <p className="text-xs text-gray-400 mb-1">Speed of Sound</p>
                    <p className="text-xs text-gray-500 mb-1">(a = √(γRT), Mach reference)</p>
                    <p className="text-orange-400 font-bold text-xl">
                      {unitSystem === "Imperial"
                        ? `${(result.speedOfSound / 0.3048).toFixed(2)} ft/s`
                        : `${result.speedOfSound.toFixed(2)} m/s`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on static temperature
                    </p>
                  </div>

                  {/* Viscosity */}
                  <div className="p-4 bg-gradient-to-br from-indigo-400/10 to-blue-400/10 rounded-lg border border-indigo-400/20">
                    <p className="text-xs text-gray-400 mb-1">Dynamic Viscosity</p>
                    <p className="text-xs text-gray-500 mb-1">(μ, for Reynolds number)</p>
                    <p className="text-indigo-400 font-bold text-xl">
                      {unitSystem === "Imperial"
                        ? `${(result.viscosity * 0.020885434).toExponential(4)} lb·s/ft²`
                        : `${result.viscosity.toExponential(4)} Pa·s`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Sutherland's law
                    </p>
                  </div>

                  {/* Gravity */}
                  <div className="p-4 bg-gradient-to-br from-cyan-400/10 to-teal-400/10 rounded-lg border border-cyan-400/20">
                    <p className="text-xs text-gray-400 mb-1">Local Gravity</p>
                    <p className="text-xs text-gray-500 mb-1">(g, acceleration due to gravity)</p>
                    <p className="text-cyan-400 font-bold text-xl">
                      {unitSystem === "Imperial"
                        ? `${(result.gravity / 0.3048).toFixed(4)} ft/s²`
                        : `${result.gravity.toFixed(4)} m/s²`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      g/g₀ = {(result.gravity / 9.80665).toFixed(4)}
                    </p>
                  </div>

                  {/* Dynamic Pressure (if velocity provided) */}
                  {result.dynamicPressure !== undefined && (
                    <div className="p-4 bg-gradient-to-br from-yellow-400/10 to-amber-400/10 rounded-lg border border-yellow-400/20">
                      <p className="text-xs text-gray-400 mb-1">Dynamic Pressure</p>
                      <p className="text-xs text-gray-500 mb-1">(q = 0.5ρV², for lift/drag)</p>
                      <p className="text-yellow-400 font-bold text-xl">
                        {unitSystem === "Imperial"
                          ? `${(result.dynamicPressure * 0.020885434).toFixed(2)} psf`
                          : `${(result.dynamicPressure / 1000).toFixed(2)} kPa`}
                      </p>
                      {velocity.trim() && (
                        <p className="text-xs text-gray-500 mt-1">
                          V = {parseFloat(velocity).toFixed(2)} {velocityUnit} (TAS)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Layer */}
                  <div className="p-4 bg-gradient-to-br from-slate-400/10 to-gray-400/10 rounded-lg border border-slate-400/20">
                    <p className="text-xs text-gray-400 mb-1">Atmospheric Layer</p>
                    <p className="text-xs text-gray-500 mb-1">(ISA 1976 standard)</p>
                    <p className="text-slate-300 font-bold text-xl">{result.layerName}</p>
                  </div>

                  {/* Altitude Info */}
                  <div className="p-4 bg-gradient-to-br from-violet-400/10 to-purple-400/10 rounded-lg border border-violet-400/20">
                    <p className="text-xs text-gray-400 mb-1">Altitude</p>
                    <p className="text-xs text-gray-500 mb-1">(geopotential input, geometric computed)</p>
                    <p className="text-violet-400 font-bold text-xl">
                      {unitSystem === "Imperial"
                        ? `${(result.geopotentialAltitude / 0.3048).toFixed(0)} ft`
                        : `${(result.geopotentialAltitude / 1000).toFixed(2)} km`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      h = {result.geopotentialAltitude.toFixed(0)} m (geopotential)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      H = {result.geometricAltitude.toFixed(2)} m (geometric)
                    </p>
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <Alert className="mt-4 bg-yellow-400/10 border-yellow-400/30">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-400">
                      {result.warnings.join("; ")}
                    </AlertDescription>
                  </Alert>
                )}
              </AeroCard>
            )}

            {/* Charts */}
            {result && chartData.length > 0 && (
              <ChartCard
                title="Atmospheric Properties vs Altitude"
                description="Temperature, pressure, and density variation with altitude"
                height={400}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="altitude"
                      {...globalAxisCommonProps}
                      tick={globalAxisTickStyle}
                      label={{
                        value: `Altitude (${unitSystem === "Imperial" ? "ft" : "km"})`,
                        position: "insideBottom",
                        offset: -5,
                      }}
                    />
                    <YAxis yAxisId="left" {...globalAxisCommonProps} tick={globalAxisTickStyle} />
                    <YAxis yAxisId="right" orientation="right" {...globalAxisCommonProps} tick={globalAxisTickStyle} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name={`Temperature (${unitSystem === "Imperial" ? "°F" : "°C"})`}
                      dot={false}
                      legendType="none"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="pressure"
                      stroke="#10b981"
                      strokeWidth={2}
                      name={`Pressure (${unitSystem === "Imperial" ? "psi" : "kPa"})`}
                      dot={false}
                      legendType="none"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="density"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name={`Density (${unitSystem === "Imperial" ? "slug/ft³" : "kg/m³"})`}
                      dot={false}
                      legendType="none"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <AeroverseLegend
                    items={[
                      {
                        id: 'temperature',
                        name: 'Temperature',
                        role: unitSystem === "Imperial" ? "°F" : "°C",
                        color: '#3b82f6',
                      },
                      {
                        id: 'pressure',
                        name: 'Pressure',
                        role: unitSystem === "Imperial" ? "psi" : "kPa",
                        color: '#10b981',
                      },
                      {
                        id: 'density',
                        name: 'Density',
                        role: unitSystem === "Imperial" ? "slug/ft³" : "kg/m³",
                        color: '#f59e0b',
                      },
                    ]}
                  />
                </div>
              </ChartCard>
            )}
          </div>
        </div>
      </ToolSection>
    </ToolWrapper>
  );
}

