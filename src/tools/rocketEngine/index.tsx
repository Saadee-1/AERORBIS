/**
 * Rocket Engine Performance & Nozzle Flow Calculator
 * 
 * High-fidelity isentropic flow analysis with practical corrections
 * Based on Sutton & Biblarz, Anderson, and standard compressible flow theory
 */

"use client";

import { useState, useCallback, useMemo } from 'react';
import { Rocket, Calculator } from 'lucide-react';
import { ToolWrapper } from '@/components/layout/ToolWrapper';
import { ToolHeader } from '@/components/layout/ToolHeader';
import { ToolSection } from '@/components/layout/ToolSection';
import { ToolActions } from '@/components/layout/ToolActions';
import { AeroButton } from '@/components/common/AeroButton';
import { useToolContext } from '@/hooks/useToolContext';
import { PDFExportButton } from '@/components/tools/PDFExportButton';
import { AskAIButton } from '@/components/tools/AskAIButton';
import { useToast } from '@/hooks/use-toast';
import { 
  calculateRocketEngine, 
  sweepAmbientPressure,
  sweepExpansionRatio,
  sweepChamberPressure,
  RocketEngineInputs, 
  RocketEngineResults 
} from './utils/calcEngine';
import { validateRocketEngineInputs } from './validation/schema';
import { buildRocketEnginePayload } from './utils/payloadBuilder';
import { buildCalculationEvent } from '@/lib/events/payloadBuilder';
import { PROPELLANT_PRESETS, ENGINE_PRESETS, PropellantPreset, EnginePreset } from './data/propellantPresets';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { PlotsPanel } from './components/PlotsPanel';
import { PresetsPanel } from './components/PresetsPanel';
import { DEFAULT_GAMMA, DEFAULT_NOZZLE_EFFICIENCY, DEFAULT_CSTAR_EFFICIENCY, DEFAULT_PRESSURE_LOSS, R_UNIVERSAL } from './utils/constants';
import { altitudeToPressure } from './utils/units';

export default function RocketEngineCalculator() {
  const { sendCalculationEvent, updateToolContext } = useToolContext();
  const { toast } = useToast();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  // Input state
  const [inputs, setInputs] = useState<RocketEngineInputs>({
    Pc: 9.7e6, // 97 bar
    Tc: 3500,
    At: 0.005, // 50 cm²
    epsilon: 16,
    Pa: 101325, // Sea level
    gamma: DEFAULT_GAMMA,
    M_molar: 22.0,
    nozzleEfficiency: DEFAULT_NOZZLE_EFFICIENCY,
    cStarEfficiency: DEFAULT_CSTAR_EFFICIENCY,
    pressureLossFraction: DEFAULT_PRESSURE_LOSS,
  });

  const [results, setResults] = useState<RocketEngineResults | null>(null);
  const [selectedPropellantId, setSelectedPropellantId] = useState<string>('lox-rp1');
  const [selectedEngineId, setSelectedEngineId] = useState<string>('merlin-like');
  
  // Sweep data
  const [altitudeSweep, setAltitudeSweep] = useState<Array<{ Pa: number; T: number; Isp: number; mdot: number; Pe: number }>>([]);
  const [expansionSweep, setExpansionSweep] = useState<Array<{ epsilon: number; Isp: number; T: number; Cf: number; Me: number }>>([]);
  const [pressureSweep, setPressureSweep] = useState<Array<{ Pc: number; mdot: number; T: number; Isp: number; cStar: number }>>([]);

  // Handle input changes
  const handleInputChange = useCallback((field: keyof RocketEngineInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  // Load propellant preset
  const handleLoadPropellant = useCallback((preset: PropellantPreset) => {
    setSelectedPropellantId(preset.id);
    setInputs(prev => ({
      ...prev,
      gamma: preset.gamma,
      M_molar: preset.M_molar,
      R: undefined, // Clear R if M_molar is set
      Pc: preset.Pc_typical,
      Tc: preset.Tc_typical,
      nozzleEfficiency: preset.nozzleEfficiency,
      cStarEfficiency: preset.cStarEfficiency,
    }));
    toast({
      title: 'Propellant loaded',
      description: `${preset.name} properties loaded`,
    });
  }, [toast]);

  // Load engine preset
  const handleLoadEngine = useCallback((preset: EnginePreset) => {
    setSelectedEngineId(preset.id);
    const propellant = PROPELLANT_PRESETS[preset.propellantId];
    setInputs(prev => ({
      ...prev,
      Pc: preset.Pc,
      Tc: preset.Tc,
      At: preset.At,
      epsilon: preset.epsilon,
      gamma: propellant.gamma,
      M_molar: propellant.M_molar,
      R: undefined,
      nozzleEfficiency: preset.nozzleEfficiency ?? propellant.nozzleEfficiency,
      cStarEfficiency: preset.cStarEfficiency ?? propellant.cStarEfficiency,
      pressureLossFraction: preset.pressureLossFraction ?? DEFAULT_PRESSURE_LOSS,
    }));
    toast({
      title: 'Engine loaded',
      description: `${preset.name} configuration loaded`,
    });
  }, [toast]);

  // Calculate engine performance
  const handleCalculate = useCallback(async () => {
    try {
      // Validate inputs
      const validation = validateRocketEngineInputs(inputs);
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

      // Perform calculation
      const engineResults = calculateRocketEngine(inputs);
      setResults(engineResults);

      // Clear sweep data
      setAltitudeSweep([]);
      setExpansionSweep([]);
      setPressureSweep([]);

      // Generate AI payload
      const requestId = `rocket-${Date.now()}`;
      setLastRequestId(requestId);
      const payload = buildRocketEnginePayload(inputs, engineResults, requestId);

        updateToolContext({
          tool: 'Rocket Engine Performance',
          inputs: payload.inputs,
          results: payload.results,
        });

        const eventPayload = buildCalculationEvent({
          toolId: 'rocket-engine',
          toolName: 'Rocket Engine Performance',
          inputs: payload.inputs,
          results: payload.results,
          steps: payload.metadata?.steps || [],
          metadata: payload.metadata,
        });

        const eventResponse = await sendCalculationEvent(eventPayload);

        if (eventResponse?.requestId) {
          setLastRequestId(eventResponse.requestId);
        }

      toast({
        title: 'Calculation complete',
        description: `Thrust: ${(engineResults.T / 1000).toFixed(1)} kN, Isp: ${engineResults.Isp.toFixed(1)} s`,
      });
    } catch (error) {
      toast({
        title: 'Calculation Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [inputs, toast, sendCalculationEvent, updateToolContext]);

  // Sweep altitude (ambient pressure)
  const handleSweepAltitude = useCallback((altitudeMin: number, altitudeMax: number, steps: number) => {
    try {
      const Pa_min = altitudeToPressure(altitudeMax); // Higher altitude = lower pressure
      const Pa_max = altitudeToPressure(altitudeMin);
      const sweepData = sweepAmbientPressure(inputs, Pa_min, Pa_max, steps);
      setAltitudeSweep(sweepData);
      toast({
        title: 'Altitude sweep complete',
        description: `Generated ${sweepData.length} data points`,
      });
    } catch (error) {
      toast({
        title: 'Sweep Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [inputs, toast]);

  // Sweep expansion ratio
  const handleSweepExpansion = useCallback((epsilonMin: number, epsilonMax: number, steps: number) => {
    try {
      const sweepData = sweepExpansionRatio(inputs, epsilonMin, epsilonMax, steps);
      setExpansionSweep(sweepData);
      toast({
        title: 'Expansion ratio sweep complete',
        description: `Generated ${sweepData.length} data points`,
      });
    } catch (error) {
      toast({
        title: 'Sweep Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [inputs, toast]);

  // Sweep chamber pressure
  const handleSweepPressure = useCallback((PcMin: number, PcMax: number, steps: number) => {
    try {
      const sweepData = sweepChamberPressure(inputs, PcMin, PcMax, steps);
      setPressureSweep(sweepData);
      toast({
        title: 'Chamber pressure sweep complete',
        description: `Generated ${sweepData.length} data points`,
      });
    } catch (error) {
      toast({
        title: 'Sweep Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [inputs, toast]);

  return (
    <ToolWrapper>
      <ToolHeader
        title="Rocket Engine Performance"
        description="Isentropic nozzle flow analysis with practical corrections"
        icon={Rocket}
      />

      <ToolSection title="Configuration">
        <PresetsPanel
          selectedPropellantId={selectedPropellantId}
          selectedEngineId={selectedEngineId}
          onPropellantChange={setSelectedPropellantId}
          onEngineChange={setSelectedEngineId}
          onLoadPropellant={handleLoadPropellant}
          onLoadEngine={handleLoadEngine}
        />
      </ToolSection>

      <ToolSection title="Inputs">
        <InputPanel inputs={inputs} onInputChange={handleInputChange} />
      </ToolSection>

      <ToolActions>
        <AeroButton onClick={handleCalculate} icon={Calculator}>
          Calculate Performance
        </AeroButton>
        {results && (
          <>
            <PDFExportButton
              toolName="Rocket Engine Performance"
              data={{
                inputs,
                results,
                timestamp: new Date().toISOString(),
              }}
            />
            <AskAIButton requestId={lastRequestId || undefined} />
          </>
        )}
      </ToolActions>

      {results && (
        <ToolSection title="Parameter Sweeps">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-700/30 rounded-lg border border-cyan-400/20">
              <h3 className="text-sm font-semibold text-cyan-400 mb-2">Altitude Sweep</h3>
              <p className="text-xs text-gray-400 mb-3">Sweep ambient pressure (altitude)</p>
              <AeroButton
                onClick={() => handleSweepAltitude(0, 50000, 50)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Sweep 0-50 km
              </AeroButton>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg border border-cyan-400/20">
              <h3 className="text-sm font-semibold text-cyan-400 mb-2">Expansion Ratio Sweep</h3>
              <p className="text-xs text-gray-400 mb-3">Sweep nozzle expansion ratio</p>
              <AeroButton
                onClick={() => handleSweepExpansion(5, 100, 50)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Sweep ε: 5-100
              </AeroButton>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg border border-cyan-400/20">
              <h3 className="text-sm font-semibold text-cyan-400 mb-2">Chamber Pressure Sweep</h3>
              <p className="text-xs text-gray-400 mb-3">Sweep chamber pressure</p>
              <AeroButton
                onClick={() => handleSweepPressure(1e6, 30e6, 50)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Sweep Pc: 10-300 bar
              </AeroButton>
            </div>
          </div>
        </ToolSection>
      )}

      {results && (
        <>
          <ToolSection title="Results">
            <ResultsPanel results={results} />
          </ToolSection>

          <ToolSection title="Performance Plots">
            <PlotsPanel
              altitudeSweep={altitudeSweep}
              expansionSweep={expansionSweep}
              pressureSweep={pressureSweep}
            />
          </ToolSection>
        </>
      )}
    </ToolWrapper>
  );
}

