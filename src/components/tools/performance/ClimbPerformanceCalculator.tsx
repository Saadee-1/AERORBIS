/**
 * Climb Performance Calculator
 * 
 * Computes climb speeds (V_y — best rate, V_x — best angle), climb ROC and climb gradient,
 * and provides interactive plots. Integrates with existing calculators so Thrust Loading,
 * Wing Loading, and L/D Analyzer can import V_climb automatically.
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Info, AlertTriangle, CheckCircle, Calculator, Link2, Plane } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useToolContext } from "@/hooks/useToolContext";
import { useDesignSession } from "@/contexts/designSession";
import { Button } from "@/components/ui/button";
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
import { spacingVertical } from "@/styles/spacing";
import { CalculationSteps } from "@/components/common/CalculationSteps";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  getReusableDataForCalculator, 
  hasReusableData,
} from "../utils/interlink";
import { useSearchParams, useNavigate } from "react-router-dom";
import { InlineInterlinkHint } from "@/components/common/InterlinkCTA";
import { FIELD_KEYS } from "../utils/interlinkConfig";
import { computeClimbPerformance, msToKts, msToFpm, ClimbResult } from "./utils/climb";
import { ClimbPlots } from "./ClimbPlots";
import { isaAtAltitudeMeters, calculateISADensity } from "../utils/isaAtmosphere";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type WeightMode = 'mass' | 'weight';
type EngineType = 'jet' | 'turbofan' | 'prop';
type AirDensityMode = 'preset' | 'altitude' | 'custom';
type AirDensityPreset = 'ISA Sea Level' | '2000 ft' | '5000 ft' | '8000 ft' | '10000 ft' | '15000 ft';

const GRAVITY = 9.81; // m/s²

const DENSITY_PRESETS: Record<AirDensityPreset, number> = {
  'ISA Sea Level': 1.225,
  '2000 ft': calculateISADensity(2000 * 0.3048),
  '5000 ft': calculateISADensity(5000 * 0.3048),
  '8000 ft': calculateISADensity(8000 * 0.3048),
  '10000 ft': calculateISADensity(10000 * 0.3048),
  '15000 ft': calculateISADensity(15000 * 0.3048),
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ClimbPerformanceCalculator() {
  const { toast } = useToast();
  const { sendCalculationEvent, updateToolContext } = useToolContext();
  const { data: designSession, updateDesignSession } = useDesignSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [weightMode, setWeightMode] = useState<WeightMode>('mass');
  const [massKg, setMassKg] = useState<string>('');
  const [weightN, setWeightN] = useState<string>('');
  const [wingAreaM2, setWingAreaM2] = useState<string>('');
  const [totalThrustN, setTotalThrustN] = useState<string>('');
  const [cd0, setCd0] = useState<string>('0.025');
  const [k, setK] = useState<string>('0.045');
  const [clMax, setClMax] = useState<string>('');
  const [engineType, setEngineType] = useState<EngineType>('jet');
  const [propEfficiency, setPropEfficiency] = useState<string>('0.85');
  const [densityMode, setDensityMode] = useState<AirDensityMode>('preset');
  const [densityPreset, setDensityPreset] = useState<AirDensityPreset>('ISA Sea Level');
  const [altitudeM, setAltitudeM] = useState<string>('');
  const [customDensity, setCustomDensity] = useState<string>('1.225');
  const [nPoints, setNPoints] = useState<string>('200');
  const [result, setResult] = useState<ClimbResult | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  // Get reusable data
  const requiredFields = [FIELD_KEYS.massKg, FIELD_KEYS.weightN, FIELD_KEYS.wingAreaM2, FIELD_KEYS.cd0, FIELD_KEYS.k, FIELD_KEYS.totalThrustN, FIELD_KEYS.densityKgM3];

  // Compute current density
  const currentDensity = useMemo(() => {
    if (densityMode === 'preset') {
      return DENSITY_PRESETS[densityPreset];
    } else if (densityMode === 'altitude') {
      const alt = parseFloat(altitudeM);
      if (Number.isFinite(alt) && alt >= 0) {
        return calculateISADensity(alt);
      }
      return 1.225; // Default
    } else {
      const custom = parseFloat(customDensity);
      return Number.isFinite(custom) && custom > 0 ? custom : 1.225;
    }
  }, [densityMode, densityPreset, altitudeM, customDensity]);

  // Handle calculate
  const handleCalculate = () => {
    try {
      // Get weight
      let weight: number;
      if (weightMode === 'mass') {
        const mass = parseFloat(massKg);
        if (!Number.isFinite(mass) || mass <= 0) {
          toast({
            title: 'Invalid input',
            description: 'Mass must be a positive number.',
            variant: 'destructive',
          });
          return;
        }
        weight = mass * GRAVITY;
      } else {
        weight = parseFloat(weightN);
        if (!Number.isFinite(weight) || weight <= 0) {
          toast({
            title: 'Invalid input',
            description: 'Weight must be a positive number.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Get wing area
      const area = parseFloat(wingAreaM2);
      if (!Number.isFinite(area) || area <= 0) {
        toast({
          title: 'Invalid input',
          description: 'Wing area must be a positive number.',
          variant: 'destructive',
        });
        return;
      }

      // Get drag polar
      const cd0Val = parseFloat(cd0);
      const kVal = parseFloat(k);
      if (!Number.isFinite(cd0Val) || cd0Val < 0 || !Number.isFinite(kVal) || kVal < 0) {
        toast({
          title: 'Invalid input',
          description: 'CD0 and k must be non-negative numbers.',
          variant: 'destructive',
        });
        return;
      }

      // Get thrust (optional but recommended)
      const thrust = totalThrustN ? parseFloat(totalThrustN) : undefined;
      if (thrust !== undefined && (!Number.isFinite(thrust) || thrust <= 0)) {
        toast({
          title: 'Invalid input',
          description: 'Thrust must be a positive number.',
          variant: 'destructive',
        });
        return;
      }

      if (thrust === undefined) {
        toast({
          title: 'No thrust data',
          description: 'Thrust is required for climb calculations. Go to Thrust Calculator to compute it.',
          variant: 'destructive',
        });
        return;
      }

      // Get CL_max (optional)
      const clMaxVal = clMax ? parseFloat(clMax) : undefined;
      if (clMaxVal !== undefined && (!Number.isFinite(clMaxVal) || clMaxVal <= 0)) {
        toast({
          title: 'Invalid input',
          description: 'CL_max must be a positive number.',
          variant: 'destructive',
        });
        return;
      }

      // Get prop efficiency
      const eta = engineType === 'prop' ? parseFloat(propEfficiency) : undefined;
      if (eta !== undefined && (!Number.isFinite(eta) || eta <= 0 || eta > 1)) {
        toast({
          title: 'Invalid input',
          description: 'Propulsive efficiency must be between 0 and 1.',
          variant: 'destructive',
        });
        return;
      }

      // Get grid resolution
      const n = parseInt(nPoints);
      const gridPoints = Number.isFinite(n) && n > 0 ? n : 200;

      // Compute climb performance
      const climbResult = computeClimbPerformance({
        weightN: weight,
        wingAreaM2: area,
        cd0: cd0Val,
        k: kVal,
        totalThrustN: thrust,
        engineType,
        propEfficiency: eta,
        densityKgM3: currentDensity,
        clMax: clMaxVal,
        nPoints: gridPoints,
      });

      setResult(climbResult);

      // Save to designSession
      if (climbResult.vY !== undefined) {
        updateDesignSession({
          vClimbVyMs: climbResult.vY,
          vClimbVxMs: climbResult.vX,
          rocVyMs: climbResult.rocVy,
          gammaVy: climbResult.gammaVy,
        });
      }

      // Generate request ID
      const requestId = `climb-${Date.now()}`;
      setLastRequestId(requestId);

      // Build payload for AI
      const payload = buildAeroversePayload({
        toolName: 'Climb Performance Calculator',
        inputs: {
          weightN: weight,
          wingAreaM2: area,
          cd0: cd0Val,
          k: kVal,
          totalThrustN: thrust,
          engineType,
          densityKgM3: currentDensity,
          clMax: clMaxVal,
        },
        results: {
          vY: climbResult.vY,
          vX: climbResult.vX,
          rocVy: climbResult.rocVy,
          gammaVy: climbResult.gammaVy,
        },
      });

      updateToolContext(payload);
      sendCalculationEvent({
        toolId: 'climb-performance-calculator',
        toolName: 'Climb Performance Calculator',
        inputs: payload.inputs,
        results: payload.results,
      });

      toast({
        title: 'Calculation complete',
        description: 'Climb performance computed successfully.',
      });
    } catch (error) {
      console.error('Climb calculation error:', error);
      toast({
        title: 'Calculation error',
        description: error instanceof Error ? error.message : 'An error occurred during calculation.',
        variant: 'destructive',
      });
    }
  };

  // Handle export to other calculators
  const handleExportVy = () => {
    if (!result || result.vY === undefined) {
      toast({
        title: 'No data to export',
        description: 'Calculate climb performance first.',
        variant: 'destructive',
      });
      return;
    }

    updateDesignSession({
      vClimbVyMs: result.vY,
      vClimbVxMs: result.vX,
      rocVyMs: result.rocVy,
      gammaVy: result.gammaVy,
    });

    toast({
      title: 'Data exported',
      description: 'V_y and climb data saved to design session.',
    });
  };

  return (
    <ToolWrapper>
      <ToolHeader
        title="Climb Performance Calculator"
        description="Compute climb speeds (V_y, V_x), rate of climb, and climb gradient"
        icon={TrendingUp}
      />

      {/* Inputs */}
      <ToolSection>
        <AeroCard title="Inputs" icon={Calculator}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Weight/Mass */}
            <AeroFormField label="Weight Input Mode" helperText="Select whether to input mass or weight for the climb condition">
              <div className="flex items-center gap-4">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={weightMode === 'mass'}
                    onCheckedChange={(checked) => setWeightMode(checked ? 'mass' : 'weight')}
                  />
                  <span>Mass (kg)</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={weightMode === 'weight'}
                    onCheckedChange={(checked) => setWeightMode(checked ? 'weight' : 'mass')}
                  />
                  <span>Weight (N)</span>
                </Label>
              </div>
            </AeroFormField>

            {weightMode === 'mass' ? (
              <AeroFormField 
                label="Aircraft Mass (kg)" 
                helperText={`Aircraft total mass for the climb condition (typically MTOW or operating weight). Mass is converted to weight using g = ${GRAVITY} m/s². Used in climb performance calculations.`}
              >
                <Input
                  type="number"
                  name="massKg"
                  value={massKg}
                  onChange={(e) => setMassKg(e.target.value)}
                  placeholder="250"
                  min="0"
                />
                <InlineInterlinkHint 
                  fieldKey={FIELD_KEYS.massKg} 
                  className="mt-1" 
                  currentValue={massKg}
                  onImport={(value) => setMassKg(String(value))}
                  onUndo={(prevValue) => setMassKg(prevValue === null ? '' : String(prevValue))}
                />
              </AeroFormField>
            ) : (
              <AeroFormField 
                label="Aircraft Weight (N)" 
                helperText={`Aircraft total weight for the climb condition (typically MTOW or operating weight). Weight = mass × g, where g = ${GRAVITY} m/s² (standard gravity). Used directly in climb performance calculations.`}
              >
                <Input
                  type="number"
                  name="weightN"
                  value={weightN}
                  onChange={(e) => setWeightN(e.target.value)}
                  placeholder="2452.5"
                  min="0"
                />
                <InlineInterlinkHint 
                  fieldKey={FIELD_KEYS.weightN} 
                  className="mt-1" 
                  currentValue={weightN}
                  onImport={(value) => setWeightN(String(value))}
                  onUndo={(prevValue) => setWeightN(prevValue === null ? '' : String(prevValue))}
                />
              </AeroFormField>
            )}

            <AeroFormField 
              label="Gross Wing Area (m²)" 
              helperText="Total wing reference area (planform area). Used to compute wing loading (W/S) and lift coefficient. Typically includes the full wing planform area."
            >
              <Input
                type="number"
                name="wingAreaM2"
                value={wingAreaM2}
                onChange={(e) => setWingAreaM2(e.target.value)}
                placeholder="8.0"
                min="0"
                step="0.1"
              />
              <InlineInterlinkHint 
                fieldKey={FIELD_KEYS.wingAreaM2} 
                className="mt-1" 
                currentValue={wingAreaM2}
                onImport={(value) => setWingAreaM2(String(value))}
                onUndo={(prevValue) => setWingAreaM2(prevValue === null ? '' : String(prevValue))}
              />
            </AeroFormField>

            <AeroFormField 
              label="Total Installed Thrust (N)" 
              helperText="Total installed thrust available for climb at the specified condition. For jets/turbofans, this is typically sea-level static (SLS) thrust. For propellers, this represents available shaft power converted to thrust. Required for climb performance calculations."
            >
              <Input
                type="number"
                name="totalThrustN"
                value={totalThrustN}
                onChange={(e) => setTotalThrustN(e.target.value)}
                placeholder="3000"
                min="0"
              />
              <InlineInterlinkHint 
                fieldKey={FIELD_KEYS.totalThrustN} 
                className="mt-1" 
                currentValue={totalThrustN}
                onImport={(value) => setTotalThrustN(String(value))}
                onUndo={(prevValue) => setTotalThrustN(prevValue === null ? '' : String(prevValue))}
              />
            </AeroFormField>

            <AeroFormField 
              label="Zero-lift Drag Coefficient (C_D0)" 
              helperText="Parasite drag coefficient at zero lift. Represents form drag, skin friction, and interference drag. Typical range: 0.015-0.040 for clean aircraft. Used in the drag polar: C_D = C_D0 + k·C_L²."
            >
              <Input
                type="number"
                name="cd0"
                value={cd0}
                onChange={(e) => setCd0(e.target.value)}
                placeholder="0.025"
                step="0.001"
                min="0"
              />
              <InlineInterlinkHint 
                fieldKey={FIELD_KEYS.cd0} 
                className="mt-1" 
                currentValue={cd0}
                onImport={(value) => setCd0(String(value))}
                onUndo={(prevValue) => setCd0(prevValue === null ? '' : String(prevValue))}
              />
            </AeroFormField>

            <AeroFormField 
              label="Induced Drag Factor (k)" 
              helperText="Induced drag factor in the drag polar: C_D = C_D0 + k·C_L². Related to Oswald efficiency factor e: k = 1/(π·AR·e), where AR is aspect ratio. Typical range: 0.02-0.10. Higher values indicate less efficient lift generation."
            >
              <Input
                type="number"
                name="k"
                value={k}
                onChange={(e) => setK(e.target.value)}
                placeholder="0.045"
                step="0.001"
                min="0"
              />
              <InlineInterlinkHint 
                fieldKey={FIELD_KEYS.k} 
                className="mt-1" 
                currentValue={k}
                onImport={(value) => setK(String(value))}
                onUndo={(prevValue) => setK(prevValue === null ? '' : String(prevValue))}
              />
            </AeroFormField>

            <AeroFormField 
              label="Maximum Lift Coefficient (C_L,max) [Optional]" 
              helperText="Maximum lift coefficient at the climb condition. Used to determine stall-limited climb speeds. If not specified, calculations proceed without stall constraints. Typical range: 1.2-2.5 depending on configuration."
            >
              <Input
                type="number"
                name="clMax"
                value={clMax}
                onChange={(e) => setClMax(e.target.value)}
                placeholder="1.8"
                step="0.1"
                min="0"
              />
            </AeroFormField>

            <AeroFormField 
              label="Engine Type" 
              helperText="Select the propulsion system type. Jet/Turbofan: thrust is directly specified. Propeller: requires propulsive efficiency to convert shaft power to thrust."
            >
              <Select value={engineType} onValueChange={(v) => setEngineType(v as EngineType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jet">Jet / Turbofan</SelectItem>
                  <SelectItem value="turbofan">Turbofan</SelectItem>
                  <SelectItem value="prop">Propeller</SelectItem>
                </SelectContent>
              </Select>
            </AeroFormField>

            {engineType === 'prop' && (
              <AeroFormField 
                label="Propulsive Efficiency (η_p)" 
                helperText="Propeller efficiency: ratio of propulsive power to shaft power. Typical range: 0.75-0.90. Used to convert available shaft power to thrust: T = (η_p · P_shaft) / V. Default: 0.85."
              >
                <Input
                  type="number"
                  name="propEfficiency"
                  value={propEfficiency}
                  onChange={(e) => setPropEfficiency(e.target.value)}
                  placeholder="0.85"
                  step="0.01"
                  min="0"
                  max="1"
                />
              </AeroFormField>
            )}

            <AeroFormField 
              label="Air Density Mode" 
              helperText="Select how air density is determined. ISA Preset: use standard atmosphere density at common altitudes. Altitude (ISA): compute ISA density from geopotential altitude. Custom: specify density directly (e.g., from Standard Atmosphere calculator)."
            >
              <Select value={densityMode} onValueChange={(v) => setDensityMode(v as AirDensityMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preset">ISA Preset</SelectItem>
                  <SelectItem value="altitude">Altitude (ISA)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </AeroFormField>

            {densityMode === 'preset' && (
              <AeroFormField 
                label="Density Preset" 
                helperText="Select a standard ISA density preset at common altitudes. Density values are computed using the International Standard Atmosphere (ISA) model."
              >
                <Select value={densityPreset} onValueChange={(v) => setDensityPreset(v as AirDensityPreset)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(DENSITY_PRESETS).map((preset) => (
                      <SelectItem key={preset} value={preset}>
                        {preset} ({DENSITY_PRESETS[preset as AirDensityPreset].toFixed(4)} kg/m³)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AeroFormField>
            )}

            {densityMode === 'altitude' && (
              <AeroFormField 
                label="Geopotential Altitude (m)" 
                helperText="Geopotential altitude above sea level. Air density will be computed using the International Standard Atmosphere (ISA) model. Typical range: 0-15,000 m for ISA validity."
              >
                <Input
                  type="number"
                  name="altitudeM"
                  value={altitudeM}
                  onChange={(e) => setAltitudeM(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="15000"
                />
                {altitudeM && (() => {
                  const alt = parseFloat(altitudeM);
                  if (isNaN(alt) || alt < 0) {
                    return <p className="text-xs text-yellow-400 mt-1">Warning: Altitude must be non-negative.</p>;
                  }
                  if (alt > 15000) {
                    return <p className="text-xs text-yellow-400 mt-1">Warning: Altitude exceeds 15,000 m. ISA model validity may be limited.</p>;
                  }
                  const density = calculateISADensity(alt);
                  if (!Number.isFinite(density) || density <= 0) {
                    return <p className="text-xs text-yellow-400 mt-1">Warning: Computed density is invalid. Check altitude input.</p>;
                  }
                  return null;
                })()}
              </AeroFormField>
            )}

            {densityMode === 'custom' && (
              <AeroFormField 
                label="Air Density (kg/m³)" 
                helperText="Air density at the climb condition. Can be imported from the Standard Atmosphere calculator or entered manually. ISA sea-level density: 1.225 kg/m³. Density decreases with altitude and temperature."
              >
                <Input
                  type="number"
                  name="densityKgM3"
                  value={customDensity}
                  onChange={(e) => setCustomDensity(e.target.value)}
                  placeholder="1.225"
                  step="0.001"
                  min="0"
                />
                {customDensity && (() => {
                  const density = parseFloat(customDensity);
                  if (isNaN(density) || density <= 0) {
                    return <p className="text-xs text-yellow-400 mt-1">Warning: Air density must be a positive number.</p>;
                  }
                  if (density > 2) {
                    return <p className="text-xs text-yellow-400 mt-1">Warning: Density exceeds 2 kg/m³. Please verify input (ISA sea-level: 1.225 kg/m³).</p>;
                  }
                  return null;
                })()}
                <InlineInterlinkHint 
                  fieldKey={FIELD_KEYS.densityKgM3} 
                  className="mt-1" 
                  currentValue={customDensity}
                  onImport={(value) => setCustomDensity(String(value))}
                  onUndo={(prevValue) => setCustomDensity(prevValue === null ? '' : String(prevValue))}
                />
              </AeroFormField>
            )}

            <AeroFormField 
              label="Grid Resolution" 
              helperText="Number of speed points used to compute the climb performance curve. Higher values provide smoother curves but increase computation time. Recommended range: 50-1000 points. Default: 200."
            >
              <Input
                type="number"
                name="nPoints"
                value={nPoints}
                onChange={(e) => setNPoints(e.target.value)}
                placeholder="200"
                min="50"
                max="1000"
              />
            </AeroFormField>
          </div>

          {densityMode !== 'preset' && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Current density: {currentDensity.toFixed(4)} kg/m³
              </AlertDescription>
            </Alert>
          )}
        </AeroCard>
      </ToolSection>

      {/* Actions */}
      <ToolActions>
        <AeroButton onClick={handleCalculate} icon={Calculator}>
          Calculate Climb Performance
        </AeroButton>
        {result && lastRequestId && (
          <>
            <AskAIButton requestId={lastRequestId} payload={buildAeroversePayload({
              toolName: 'Climb Performance Calculator',
              inputs: {},
              results: result,
            })} />
            <PDFExportButton toolName="Climb Performance Calculator" requestId={lastRequestId} />
          </>
        )}
      </ToolActions>

      {/* Results */}
      {result && (
        <>
          <ToolSection>
            <AeroCard title="Climb Performance Results" icon={CheckCircle}>
              <div className="mb-4 text-sm text-gray-400">
                <p>Results computed for steady climb at specified air density. Assumes small-angle approximation (sin γ ≈ γ) for climb angle.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {result.vY !== undefined && (
                  <>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-400 mb-1">V_y — Best Rate of Climb Speed</h4>
                        <p className="text-xs text-gray-500 mb-2">True airspeed that maximizes vertical velocity (rate of climb). Used for time-to-climb optimization.</p>
                        <p className="text-2xl font-bold text-white">{result.vY.toFixed(2)} m/s</p>
                        <p className="text-sm text-gray-400">{msToKts(result.vY).toFixed(2)} kts (TAS)</p>
                      </div>
                      {result.rocVy !== undefined && (
                        <div className="mt-4 pt-3 border-t border-gray-700">
                          <h5 className="text-xs font-semibold text-gray-300 mb-1">Rate of Climb (ROC) at V_y</h5>
                          <p className="text-xs text-gray-500 mb-1">Vertical velocity component: rate of altitude gain per unit time.</p>
                          {Number.isFinite(result.rocVy) && result.rocVy >= 0 && result.rocVy <= 1000 ? (
                            <>
                              <p className="text-lg text-white">{result.rocVy.toFixed(2)} m/s</p>
                              <p className="text-sm text-gray-400">{msToFpm(result.rocVy).toFixed(0)} ft/min</p>
                            </>
                          ) : (
                            <p className="text-sm text-yellow-400">Invalid or unrealistic ROC value</p>
                          )}
                        </div>
                      )}
                      {result.gammaVy !== undefined && (
                        <div className="mt-2">
                          <h5 className="text-xs font-semibold text-gray-300 mb-1">Climb Gradient at V_y</h5>
                          <p className="text-xs text-gray-500 mb-1">Climb angle (γ): ratio of vertical to horizontal velocity. Used for obstacle clearance analysis.</p>
                          {Number.isFinite(result.gammaVy) && result.gammaVy >= 0 && result.gammaVy <= 1 ? (
                            <p className="text-sm text-gray-400">{(result.gammaVy * 100).toFixed(2)}% (γ = {Math.asin(result.gammaVy) * 180 / Math.PI}°)</p>
                          ) : (
                            <p className="text-sm text-yellow-400">Invalid or unrealistic gradient value</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-400 mb-1">V_x — Best Angle of Climb Speed</h4>
                        <p className="text-xs text-gray-500 mb-2">True airspeed that maximizes climb angle (steepest climb). Used for obstacle clearance and short-field takeoff performance.</p>
                        {result.vX !== undefined ? (
                          <>
                            <p className="text-2xl font-bold text-white">{result.vX.toFixed(2)} m/s</p>
                            <p className="text-sm text-gray-400">{msToKts(result.vX).toFixed(2)} kts (TAS)</p>
                            {result.rocVx !== undefined && (
                              <div className="mt-4 pt-3 border-t border-gray-700">
                                <h5 className="text-xs font-semibold text-gray-300 mb-1">Rate of Climb (ROC) at V_x</h5>
                                <p className="text-xs text-gray-500 mb-1">Vertical velocity component at best angle speed. Typically lower than ROC at V_y.</p>
                                <p className="text-lg text-white">{result.rocVx.toFixed(2)} m/s</p>
                                <p className="text-sm text-gray-400">{msToFpm(result.rocVx).toFixed(0)} ft/min</p>
                              </div>
                            )}
                            {result.gammaVx !== undefined && (
                              <div className="mt-2">
                                <h5 className="text-xs font-semibold text-gray-300 mb-1">Climb Gradient at V_x</h5>
                                <p className="text-xs text-gray-500 mb-1">Maximum climb angle (γ_max): steepest climb gradient achievable. Maximum obstacle clearance capability.</p>
                                <p className="text-sm text-gray-400">{(result.gammaVx * 100).toFixed(2)}% (γ = {Math.asin(result.gammaVx) * 180 / Math.PI}°)</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-400 text-sm">Not computed (insufficient excess thrust or constraint violation)</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {result.vY !== undefined && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <Button
                    variant="outline"
                    onClick={handleExportVy}
                    className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Export V_y to Other Calculators
                  </Button>
                </div>
              )}
            </AeroCard>
          </ToolSection>

          {/* Plots */}
          <ToolSection>
            <ClimbPlots result={result} />
          </ToolSection>
        </>
      )}
    </ToolWrapper>
  );
}

