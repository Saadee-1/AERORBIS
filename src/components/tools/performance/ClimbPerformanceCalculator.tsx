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
  const requiredFields = ['massKg', 'weightN', 'wingAreaM2', 'cd0', 'k', 'totalThrustN', 'densityKgM3'];

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
            <AeroFormField label="Weight Input Mode">
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
              <AeroFormField label="Mass (kg)" helperText="Aircraft total mass">
                <Input
                  type="number"
                  name="massKg"
                  value={massKg}
                  onChange={(e) => setMassKg(e.target.value)}
                  placeholder="250"
                />
                <InlineInterlinkHint 
                  fieldKey="massKg" 
                  className="mt-1" 
                  currentValue={massKg}
                  onImport={(value) => setMassKg(String(value))}
                  onUndo={(prevValue) => setMassKg(prevValue === null ? '' : String(prevValue))}
                />
              </AeroFormField>
            ) : (
              <AeroFormField label="Weight (N)" helperText="Aircraft total weight">
                <Input
                  type="number"
                  name="weightN"
                  value={weightN}
                  onChange={(e) => setWeightN(e.target.value)}
                  placeholder="2452.5"
                />
                <InlineInterlinkHint 
                  fieldKey="weightN" 
                  className="mt-1" 
                  currentValue={weightN}
                  onImport={(value) => setWeightN(String(value))}
                  onUndo={(prevValue) => setWeightN(prevValue === null ? '' : String(prevValue))}
                />
              </AeroFormField>
            )}

            <AeroFormField label="Wing Area (m²)" helperText="Total wing area">
              <Input
                type="number"
                name="wingAreaM2"
                value={wingAreaM2}
                onChange={(e) => setWingAreaM2(e.target.value)}
                placeholder="8.0"
              />
              <InlineInterlinkHint 
                fieldKey="wingAreaM2" 
                className="mt-1" 
                currentValue={wingAreaM2}
                onImport={(value) => setWingAreaM2(String(value))}
                onUndo={(prevValue) => setWingAreaM2(prevValue === null ? '' : String(prevValue))}
              />
            </AeroFormField>

            <AeroFormField label="Total Thrust (N)" helperText="Total installed thrust">
              <Input
                type="number"
                name="totalThrustN"
                value={totalThrustN}
                onChange={(e) => setTotalThrustN(e.target.value)}
                placeholder="3000"
              />
              <InlineInterlinkHint 
                fieldKey="totalThrustN" 
                className="mt-1" 
                currentValue={totalThrustN}
                onImport={(value) => setTotalThrustN(String(value))}
                onUndo={(prevValue) => setTotalThrustN(prevValue === null ? '' : String(prevValue))}
              />
            </AeroFormField>

            <AeroFormField label="CD0" helperText="Zero-lift drag coefficient">
              <Input
                type="number"
                name="cd0"
                value={cd0}
                onChange={(e) => setCd0(e.target.value)}
                placeholder="0.025"
                step="0.001"
              />
              <InlineInterlinkHint 
                fieldKey="cd0" 
                className="mt-1" 
                currentValue={cd0}
                onImport={(value) => setCd0(String(value))}
                onUndo={(prevValue) => setCd0(prevValue === null ? '' : String(prevValue))}
              />
            </AeroFormField>

            <AeroFormField label="k" helperText="Induced drag factor">
              <Input
                type="number"
                name="k"
                value={k}
                onChange={(e) => setK(e.target.value)}
                placeholder="0.045"
                step="0.001"
              />
              <InlineInterlinkHint 
                fieldKey="k" 
                className="mt-1" 
                currentValue={k}
                onImport={(value) => setK(String(value))}
                onUndo={(prevValue) => setK(prevValue === null ? '' : String(prevValue))}
              />
            </AeroFormField>

            <AeroFormField label="CL_max (optional)" helperText="Maximum lift coefficient">
              <Input
                type="number"
                value={clMax}
                onChange={(e) => setClMax(e.target.value)}
                placeholder="1.8"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Engine Type">
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
              <AeroFormField label="Propulsive Efficiency η_p" helperText="Default: 0.85">
                <Input
                  type="number"
                  value={propEfficiency}
                  onChange={(e) => setPropEfficiency(e.target.value)}
                  placeholder="0.85"
                  step="0.01"
                  min="0"
                  max="1"
                />
              </AeroFormField>
            )}

            <AeroFormField label="Air Density Mode">
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
              <AeroFormField label="Density Preset">
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
              <AeroFormField label="Altitude (m)" helperText="ISA density will be computed">
                <Input
                  type="number"
                  value={altitudeM}
                  onChange={(e) => setAltitudeM(e.target.value)}
                  placeholder="0"
                />
              </AeroFormField>
            )}

            {densityMode === 'custom' && (
              <AeroFormField label="Air Density (kg/m³)">
                <Input
                  type="number"
                  name="densityKgM3"
                  value={customDensity}
                  onChange={(e) => setCustomDensity(e.target.value)}
                  placeholder="1.225"
                  step="0.001"
                />
                <InlineInterlinkHint 
                  fieldKey="densityKgM3" 
                  className="mt-1" 
                  currentValue={customDensity}
                  onImport={(value) => setCustomDensity(String(value))}
                  onUndo={(prevValue) => setCustomDensity(prevValue === null ? '' : String(prevValue))}
                />
              </AeroFormField>
            )}

            <AeroFormField label="Grid Resolution" helperText="Number of speed points (default: 200)">
              <Input
                type="number"
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
            <AeroCard title="Results" icon={CheckCircle}>
              <div className="grid md:grid-cols-2 gap-6">
                {result.vY !== undefined && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold text-cyan-400 mb-2">V_y (Best Rate of Climb)</h4>
                      <p className="text-2xl font-bold text-white">{result.vY.toFixed(2)} m/s</p>
                      <p className="text-sm text-gray-400">{msToKts(result.vY).toFixed(2)} kts</p>
                      {result.rocVy !== undefined && (
                        <>
                          <p className="text-lg text-white mt-2">ROC: {result.rocVy.toFixed(2)} m/s</p>
                          <p className="text-sm text-gray-400">{msToFpm(result.rocVy).toFixed(0)} ft/min</p>
                        </>
                      )}
                      {result.gammaVy !== undefined && (
                        <p className="text-sm text-gray-400">Gradient: {(result.gammaVy * 100).toFixed(2)}%</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-cyan-400 mb-2">V_x (Best Angle of Climb)</h4>
                      {result.vX !== undefined ? (
                        <>
                          <p className="text-2xl font-bold text-white">{result.vX.toFixed(2)} m/s</p>
                          <p className="text-sm text-gray-400">{msToKts(result.vX).toFixed(2)} kts</p>
                          {result.rocVx !== undefined && (
                            <>
                              <p className="text-lg text-white mt-2">ROC: {result.rocVx.toFixed(2)} m/s</p>
                              <p className="text-sm text-gray-400">{msToFpm(result.rocVx).toFixed(0)} ft/min</p>
                            </>
                          )}
                          {result.gammaVx !== undefined && (
                            <p className="text-sm text-gray-400">Gradient: {(result.gammaVx * 100).toFixed(2)}%</p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-400">Not computed</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {result.vY !== undefined && (
                <div className="mt-6">
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

