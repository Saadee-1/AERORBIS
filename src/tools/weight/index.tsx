/**
 * Structural Weight Estimator Tool
 * 
 * Combines Raymer, Torenbeek, and Nicolai weight estimation models
 * with mission fuel calculation, W_TO iteration, CG estimation, and aircraft classification
 */

"use client";

import { useState, useCallback, useMemo } from 'react';
import { Scale, Calculator } from 'lucide-react';
import { ToolWrapper } from '@/components/layout/ToolWrapper';
import { ToolHeader } from '@/components/layout/ToolHeader';
import { ToolSection } from '@/components/layout/ToolSection';
import { ToolActions } from '@/components/layout/ToolActions';
import { AeroButton } from '@/components/common/AeroButton';
import { useToolContext } from '@/hooks/useToolContext';
import { PDFExportButton } from '@/components/tools/PDFExportButton';
import { AskAIButton } from '@/components/tools/AskAIButton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeightEstimationInputs, calculateComponentWeights, updateFuelSystemWeight } from './utils/weightEngine';
import { validateWeightEstimationInputs } from './validation/schema';
import type { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { buildWeightEstimatorPayload } from './utils/payloadBuilder';
import { buildCalculationEvent } from '@/lib/events/payloadBuilder';
import { AIRCRAFT_PRESETS, AircraftPreset } from './data/presets';
import { classifyAircraft } from './utils/classification';
import { iterateTakeoffWeight, createStandardMissionProfile, calculateMissionFuelFraction, calculateFuelWeight } from './utils/iteration';
import { GeometryPanel } from './components/GeometryPanel';
import { PropulsionPanel } from './components/PropulsionPanel';
import { FlightConditionsPanel } from './components/FlightConditionsPanel';
import { SystemsPanel } from './components/SystemsPanel';
import { PayloadPanel } from './components/PayloadPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { PresetsPanel } from './components/PresetsPanel';
import { MissionFuelPanel } from './components/MissionFuelPanel';
import { MaterialsPanel } from './components/MaterialsPanel';
import { CGInertiaPanel } from './components/CGInertiaPanel';
import { MissionProfile } from './utils/iteration';
import { ComponentLocation, calculateCG, calculateMAC, calculateCGonMAC, calculateMomentOfInertia } from './utils/cg';

// Default inputs
const DEFAULT_INPUTS: WeightEstimationInputs = {
  geometry: {
    S_w: 16.2,
    AR: 7.5,
    lambda: 0.6,
    t_c: 0.15,
    b: 11.0,
    S_ht: 3.5,
    AR_ht: 4.0,
    S_vt: 1.8,
    S_fuse: 25.0,
    L_fuse: 8.0,
  },
  flight: {
    q: 8000,
    N_ult: 4.4,
    hasThrustRelief: false,
  },
  propulsion: {
    type: 'piston',
    power: 120000,
    n_engines: 1,
    includeNacelle: true,
    includePylon: true,
    includeMounts: true,
  },
  systems: {
    W_crew: 800 * 9.81,
    avionics: {
      autopilot: false,
      uavMissionComputer: false,
      sensors: false,
      cameras: false,
      adsb: true,
      ifr: true,
    },
    controls: {
      isFBW: false,
    },
    fixedEquipment: {
      n_seats: 4,
      isPressurized: false,
      hasOxygen: false,
      hasHVAC: true,
      telemetry: false,
      antennaPackage: false,
    },
  },
  W_payload: 400 * 9.81,
  method: {
    wing: 'raymer',
    fuselage: 'raymer',
  },
  W_to: 1100 * 9.81, // Initial guess
};

export default function StructuralWeightEstimator() {
  const { sendCalculationEvent, updateToolContext } = useToolContext();
  const { toast } = useToast();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<AeroverseAIPayload | null>(null);

  // Input state
  const [inputs, setInputs] = useState<WeightEstimationInputs>(DEFAULT_INPUTS);
  
  // Mission fuel profile
  const [missionProfile, setMissionProfile] = useState<MissionProfile>(
    createStandardMissionProfile({ range: 1000, includeAlternate: true, reserve: 0.05 })
  );

  // Component locations for CG calculation
  const [componentLocations, setComponentLocations] = useState<ComponentLocation[]>([]);

  // Results state
  const [results, setResults] = useState<{
    components: ReturnType<typeof calculateComponentWeights>;
    W_empty: number;
    W_fuel: number;
    W_to: number;
    iteration: ReturnType<typeof iterateTakeoffWeight>;
    classification: ReturnType<typeof classifyAircraft>;
    cg?: {
      x_cg: number;
      x_cg_MAC: number;
      MAC: number;
    };
    inertia?: {
      Ixx: number;
      Iyy: number;
      Izz: number;
    };
  } | null>(null);

  // Handle input changes (nested path support)
  const handleInputChange = useCallback((path: string[], value: any) => {
    setInputs(prev => {
      const newInputs = { ...prev };
      let current: any = newInputs;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]] = { ...current[path[i]] };
      }
      
      current[path[path.length - 1]] = value;
      return newInputs;
    });
  }, []);

  const getLatestStoredRequestId = useCallback((): string | null => {
    try {
      const storedKeys = Object.keys(localStorage).filter((key) => key.startsWith('calc-'));
      if (storedKeys.length === 0) return null;
      const latestKey = storedKeys.sort().reverse()[0];
      return latestKey.replace('calc-', '');
    } catch (error) {
      console.warn('Unable to read stored calculation IDs:', error);
      return null;
    }
  }, []);

  const applyToolPayload = useCallback(
    async (payload: AeroverseAIPayload) => {
      setLastPayload(payload);

      updateToolContext({
        tool: 'Structural Weight Estimator',
        inputs: payload.inputs,
        results: payload.results,
      });

      const eventPayload = buildCalculationEvent({
        toolId: 'structural-weight',
        toolName: payload.toolName,
        inputs: payload.inputs,
        results: payload.results,
        steps: payload.metadata.steps,
        metadata: {
          units: payload.metadata.unitsSystem,
          approxLevel: payload.metadata.approxLevel,
          confidence: payload.metadata.confidence,
          warnings: payload.metadata.warnings,
        },
      });

      try {
        const eventResponse = await sendCalculationEvent(eventPayload);
        const requestId = eventResponse?.requestId ?? getLatestStoredRequestId();
        setLastRequestId(requestId);
        return requestId;
      } catch (error) {
        console.warn('Failed to send calculation event:', error);
        const fallbackId = getLatestStoredRequestId();
        setLastRequestId(fallbackId);
        return fallbackId;
      }
    },
    [getLatestStoredRequestId, sendCalculationEvent, updateToolContext]
  );

  // Load preset
  const handleLoadPreset = useCallback((preset: AircraftPreset) => {
    if (preset.inputs) {
      setInputs(prev => ({
        ...prev,
        ...preset.inputs,
        geometry: { ...prev.geometry, ...preset.inputs.geometry },
        flight: { ...prev.flight, ...preset.inputs.flight },
        propulsion: { ...prev.propulsion, ...preset.inputs.propulsion },
        systems: {
          ...prev.systems,
          ...preset.inputs.systems,
          avionics: { ...prev.systems.avionics, ...preset.inputs.systems?.avionics },
          controls: { ...prev.systems.controls, ...preset.inputs.systems?.controls },
          fixedEquipment: { ...prev.systems.fixedEquipment, ...preset.inputs.systems?.fixedEquipment },
        },
        materials: preset.inputs.materials || prev.materials,
      }));
      
      toast({
        title: 'Preset loaded',
        description: `${preset.name} configuration loaded`,
      });
    }
  }, [toast]);

    // Calculate weights
    const handleCalculate = useCallback(async () => {
    try {
      // Validate inputs
      const validation = validateWeightEstimationInputs(inputs);
      if (!validation.valid) {
        toast({
          title: 'Validation Error',
          description: validation.errors.join(', '),
          variant: 'destructive',
        });
        return;
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          console.warn(warning);
        });
      }

      // Calculate mission fuel fraction
      const fuelFraction = calculateMissionFuelFraction(missionProfile);

      // Iterate to find W_TO
      const iteration = iterateTakeoffWeight(
        (W_to_guess) => {
          const testInputs = { ...inputs, W_to: W_to_guess };
          const testComponents = calculateComponentWeights(testInputs);
          return testComponents.empty;
        },
        inputs.W_payload,
        fuelFraction,
        inputs.W_to
      );

      // Calculate final component weights with converged W_TO
      const finalInputs = { ...inputs, W_to: iteration.W_to };
      let components = calculateComponentWeights(finalInputs);
      
      // Calculate fuel weight
      const W_fuel = calculateFuelWeight(iteration.W_to, fuelFraction);
      
      // Update fuel system weight
      components = updateFuelSystemWeight(components, W_fuel);

      // Classify aircraft
      const classification = classifyAircraft({
        MTOW: iteration.W_to,
        wingspan: inputs.geometry.b,
        wingArea: inputs.geometry.S_w,
        propulsionType: inputs.propulsion.type,
        power: inputs.propulsion.power,
        n_engines: inputs.propulsion.n_engines,
        aspectRatio: inputs.geometry.AR,
        isPressurized: inputs.systems.fixedEquipment.isPressurized,
      });

      // Calculate CG (if component locations are provided, otherwise estimate)
      let cg;
      if (componentLocations.length > 0) {
        const W_total = iteration.W_to;
        const x_cg = calculateCG(componentLocations, W_total);
        const macResult = calculateMAC(inputs.geometry.S_w, inputs.geometry.b, inputs.geometry.lambda, inputs.geometry.L_fuse * 0.4);
        const x_cg_MAC = calculateCGonMAC(x_cg, macResult.x_MAC, macResult.MAC);
        cg = {
          x_cg,
          x_cg_MAC,
          MAC: macResult.MAC,
        };
      } else {
        // Estimate based on typical positions
        const macResult = calculateMAC(inputs.geometry.S_w, inputs.geometry.b, inputs.geometry.lambda, inputs.geometry.L_fuse * 0.4);
        const x_cg_estimate = inputs.geometry.L_fuse * 0.4; // Typical 40% of fuselage length
        const x_cg_MAC = calculateCGonMAC(x_cg_estimate, macResult.x_MAC, macResult.MAC);
        cg = {
          x_cg: x_cg_estimate,
          x_cg_MAC,
          MAC: macResult.MAC,
        };
      }

      // Calculate moment of inertia if component locations are available
      let inertia;
      if (componentLocations.length > 0 && cg) {
        inertia = calculateMomentOfInertia(
          {
            components: componentLocations,
            geometry: {
              S_w: inputs.geometry.S_w,
              b: inputs.geometry.b,
              L_fuse: inputs.geometry.L_fuse,
              S_fuse: inputs.geometry.S_fuse,
            },
          },
          cg.x_cg
        );
      }

      // Set results
      const finalResults = {
        components,
        W_empty: components.empty,
        W_fuel,
        W_to: iteration.W_to,
        iteration,
        classification,
        cg,
        inertia,
      };
      
      setResults(finalResults);

        // Generate AI payload
        const payload = buildWeightEstimatorPayload({
          inputs: finalInputs,
          ...finalResults,
        });

        await applyToolPayload(payload);

      toast({
        title: 'Calculation complete',
        description: `W_TO: ${(iteration.W_to / 9.81).toFixed(1)} kg, Class: ${classification.aircraftClass}`,
      });
    } catch (error) {
      toast({
        title: 'Calculation Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
      }, [applyToolPayload, inputs, missionProfile, toast]);

  return (
    <ToolWrapper>
      <ToolHeader
        title="Structural Weight Estimator"
        description="Raymer + Torenbeek + Nicolai weight estimation with mission fuel, iteration, CG, and classification"
        icon={Scale}
      />

      <ToolSection>
        <PresetsPanel inputs={inputs} onLoadPreset={handleLoadPreset} />
      </ToolSection>

      <Tabs defaultValue="geometry" className="w-full">
        <TabsList className="grid w-full grid-cols-8 bg-slate-800/50 mb-6">
          <TabsTrigger value="geometry">Geometry</TabsTrigger>
          <TabsTrigger value="propulsion">Propulsion</TabsTrigger>
          <TabsTrigger value="flight">Flight</TabsTrigger>
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="payload">Payload</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="mission">Mission</TabsTrigger>
          <TabsTrigger value="cg-inertia">CG & Inertia</TabsTrigger>
        </TabsList>

        <TabsContent value="geometry">
          <ToolSection>
            <GeometryPanel inputs={inputs} onInputChange={handleInputChange} />
          </ToolSection>
        </TabsContent>

        <TabsContent value="propulsion">
          <ToolSection>
            <PropulsionPanel inputs={inputs} onInputChange={handleInputChange} />
          </ToolSection>
        </TabsContent>

        <TabsContent value="flight">
          <ToolSection>
            <FlightConditionsPanel inputs={inputs} onInputChange={handleInputChange} />
          </ToolSection>
        </TabsContent>

        <TabsContent value="systems">
          <ToolSection>
            <SystemsPanel inputs={inputs} onInputChange={handleInputChange} />
          </ToolSection>
        </TabsContent>

        <TabsContent value="payload">
          <ToolSection>
            <PayloadPanel inputs={inputs} onInputChange={handleInputChange} />
          </ToolSection>
        </TabsContent>

        <TabsContent value="materials">
          <ToolSection>
            <MaterialsPanel inputs={inputs} onInputChange={handleInputChange} />
          </ToolSection>
        </TabsContent>

        <TabsContent value="mission">
          <ToolSection>
            <MissionFuelPanel profile={missionProfile} onProfileChange={setMissionProfile} />
          </ToolSection>
        </TabsContent>

        <TabsContent value="cg-inertia">
          <ToolSection>
            <CGInertiaPanel
              componentWeights={results?.components || {
                wing: 0,
                fuselage: 0,
                horizontalTail: 0,
                verticalTail: 0,
                landingGear: { main: 0, nose: 0, total: 0 },
                engine: 0,
                fuelSystem: 0,
                controls: 0,
                avionics: 0,
                fixedEquipment: 0,
                payload: 0,
                empty: 0,
              }}
              componentLocations={componentLocations}
              onLocationsChange={setComponentLocations}
              onCalculateCG={() => {
                if (results && componentLocations.length > 0) {
                  const W_total = results.W_to;
                  const x_cg = calculateCG(componentLocations, W_total);
                  const macResult = calculateMAC(inputs.geometry.S_w, inputs.geometry.b, inputs.geometry.lambda, inputs.geometry.L_fuse * 0.4);
                  const x_cg_MAC = calculateCGonMAC(x_cg, macResult.x_MAC, macResult.MAC);
                  
                  const inertia = calculateMomentOfInertia(
                    {
                      components: componentLocations,
                      geometry: {
                        S_w: inputs.geometry.S_w,
                        b: inputs.geometry.b,
                        L_fuse: inputs.geometry.L_fuse,
                        S_fuse: inputs.geometry.S_fuse,
                      },
                    },
                    x_cg
                  );

                  setResults({
                    ...results,
                    cg: {
                      x_cg,
                      x_cg_MAC,
                      MAC: macResult.MAC,
                    },
                    inertia,
                  });

                  toast({
                    title: 'CG & Inertia Calculated',
                    description: `CG: ${x_cg.toFixed(2)} m (${(x_cg_MAC * 100).toFixed(1)}% MAC)`,
                  });
                } else {
                  toast({
                    title: 'Calculation Required',
                    description: 'Please calculate weights first, then enter component locations',
                    variant: 'destructive',
                  });
                }
              }}
              cg={results?.cg}
              inertia={results?.inertia}
            />
          </ToolSection>
        </TabsContent>
      </Tabs>

      <ToolActions>
        <AeroButton onClick={handleCalculate} icon={Calculator}>
          Calculate Weights
        </AeroButton>
          {results && (
          <>
              <AskAIButton
                requestId={lastRequestId}
                payload={lastPayload || undefined}
                disabled={!lastPayload}
              />
            <PDFExportButton
              requestId={lastRequestId}
              toolName="Structural Weight Estimator"
              disabled={!lastRequestId}
            />
          </>
        )}
      </ToolActions>

      {results && (
        <>
          <Tabs defaultValue="results" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 mb-6">
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="empty">Empty Weight</TabsTrigger>
              <TabsTrigger value="iteration">W_TO Iteration</TabsTrigger>
              <TabsTrigger value="classification">Classification</TabsTrigger>
            </TabsList>

            <TabsContent value="results">
              <ToolSection>
                <ResultsPanel
                  components={results.components}
                  W_empty={results.W_empty}
                  W_fuel={results.W_fuel}
                  W_to={results.W_to}
                  iteration={results.iteration}
                  classification={results.classification}
                  inputs={inputs}
                  cg={results.cg}
                  inertia={results.inertia}
                />
              </ToolSection>
            </TabsContent>

            <TabsContent value="empty">
              <ToolSection>
                <ResultsPanel
                  components={results.components}
                  W_empty={results.W_empty}
                  W_fuel={results.W_fuel}
                  W_to={results.W_to}
                  iteration={results.iteration}
                  classification={results.classification}
                  inputs={inputs}
                  cg={results.cg}
                  inertia={results.inertia}
                />
              </ToolSection>
            </TabsContent>

            <TabsContent value="iteration">
              <ToolSection>
                <div className="p-4 bg-slate-800/50 rounded-lg border border-cyan-400/20">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4">Iteration History</h3>
                  <div className="space-y-2">
                    {results.iteration.history.map((h, i) => (
                      <div key={i} className="p-2 bg-slate-700/30 rounded text-sm">
                        <span className="text-gray-400">Iteration {h.iteration}:</span>{' '}
                        <span className="text-cyan-400">W_TO = {(h.W_to / 9.81).toFixed(1)} kg</span>
                        {' '}(error: {(h.error * 100).toFixed(4)}%)
                      </div>
                    ))}
                  </div>
                </div>
              </ToolSection>
            </TabsContent>

            <TabsContent value="classification">
              <ToolSection>
                <div className="p-4 bg-slate-800/50 rounded-lg border border-cyan-400/20">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4">Aircraft Classification</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Class</p>
                      <p className="text-2xl font-bold text-cyan-400">{results.classification.aircraftClass}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Reason</p>
                      <p className="text-gray-300">{results.classification.classificationReason}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Recommended Guidelines</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-300">
                        {results.classification.recommendedDesignGuidelines.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </ToolSection>
            </TabsContent>
          </Tabs>

          <ToolSection>
            <ChartsPanel
              components={results.components}
              W_empty={results.W_empty}
              W_fuel={results.W_fuel}
              W_to={results.W_to}
              iteration={results.iteration}
              inputs={inputs}
              missionProfile={missionProfile}
              cg={results.cg}
            />
          </ToolSection>
        </>
      )}
    </ToolWrapper>
  );
}
