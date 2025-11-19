/**
 * Stability & Control Derivatives Calculator
 * 
 * High-fidelity aircraft stability analysis based on Raymer, Roskam, Anderson, and USAF DATCOM
 */

"use client";

import { useState, useCallback, useMemo } from 'react';
import { Plane, Calculator } from 'lucide-react';
import { ToolWrapper } from '@/components/layout/ToolWrapper';
import { ToolHeader } from '@/components/layout/ToolHeader';
import { ToolSection } from '@/components/layout/ToolSection';
import { ToolActions } from '@/components/layout/ToolActions';
import { AeroButton } from '@/components/common/AeroButton';
import { useToolContext } from '@/hooks/useToolContext';
import { PDFExportButton } from '@/components/tools/PDFExportButton';
import { AskAIButton } from '@/components/tools/AskAIButton';
import { useToast } from '@/hooks/use-toast';
import { calculateStability, sweepCGPosition, StabilityInputs, StabilityResults } from './utils/calcStability';
import { validateStabilityInputs } from './validation/schema';
import { buildStabilityPayload } from './utils/payloadBuilder';
import { DEFAULT_AIRFOIL_LIFT_SLOPE, DEFAULT_WING_EFFICIENCY, DEFAULT_TAIL_EFFICIENCY, DEFAULT_ELEVATOR_EFFECTIVENESS } from './utils/constants';
import { AIRCRAFT_PRESETS, AircraftPreset } from './data/presets';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { TailSizingPanel } from './components/TailSizingPanel';
import { PresetsPanel } from './components/PresetsPanel';

export default function StabilityCalculator() {
  const { sendCalculationEvent, updateToolContext } = useToolContext();
  const { toast } = useToast();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  // Input state
  const [inputs, setInputs] = useState<StabilityInputs>({
    S_w: 15.0,
    AR: 7.0,
    c_bar: 1.5,
    x_ac_w: 0.25,
    x_cg: 0.25,
    S_t: 3.0,
    AR_t: 4.5,
    l_t: 4.0,
    a0: DEFAULT_AIRFOIL_LIFT_SLOPE,
    e: DEFAULT_WING_EFFICIENCY,
    e_t: DEFAULT_WING_EFFICIENCY,
    eta: DEFAULT_TAIL_EFFICIENCY,
    useRoskamDownwash: false,
    S_e: 0.6,
    tau_e: DEFAULT_ELEVATOR_EFFECTIVENESS,
    S_a: 0.8,
    S_r: 0.5,
    S_v: 2.5,
  });

  const [results, setResults] = useState<StabilityResults | null>(null);
  const [cgSweepData, setCgSweepData] = useState<Array<{ x_cg: number; SM: number; C_m_alpha: number }>>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('trainer');

  // Handle input changes
  const handleInputChange = useCallback((field: keyof StabilityInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  // Load preset
  const handleLoadPreset = useCallback((preset: AircraftPreset) => {
    setInputs({
      S_w: preset.S_w,
      AR: preset.AR,
      c_bar: preset.c_bar,
      x_ac_w: preset.x_ac_w,
      x_cg: (preset.x_cg_min + preset.x_cg_max) / 2, // Use midpoint
      S_t: preset.S_t,
      AR_t: preset.AR_t,
      l_t: preset.l_t,
      a0: preset.a0,
      e: preset.e,
      e_t: preset.e_t,
      eta: preset.eta,
      useRoskamDownwash: false,
      S_e: preset.S_e,
      tau_e: preset.tau_e,
      S_a: preset.S_a,
      S_r: preset.S_r,
      S_v: preset.S_v,
    });
    toast({
      title: 'Preset loaded',
      description: `${preset.name} configuration loaded`,
    });
  }, [toast]);

  // Calculate stability
  const handleCalculate = useCallback(() => {
    try {
      // Validate inputs
      const validation = validateStabilityInputs(inputs);
      if (!validation.valid) {
        toast({
          title: 'Validation Error',
          description: validation.errors.join(', '),
          variant: 'destructive',
        });
        return;
      }

      // Perform calculation
      const stabilityResults = calculateStability(inputs);
      setResults(stabilityResults);

      // Generate CG sweep data
      const sweepData = sweepCGPosition(inputs, 0.15, 0.40, 50);
      setCgSweepData(sweepData);

      // Generate AI payload
      const requestId = `stability-${Date.now()}`;
      setLastRequestId(requestId);
      const payload = buildStabilityPayload(inputs, stabilityResults, requestId);

      // Update tool context
      updateToolContext({
        toolName: 'Stability & Control Derivatives',
        lastCalculation: payload,
      });

      // Send calculation event
      sendCalculationEvent({
        type: 'calculation',
        toolName: 'Stability & Control Derivatives',
        requestId,
        payload,
      });

      toast({
        title: 'Calculation complete',
        description: stabilityResults.isStable ? 'Aircraft is stable' : 'Aircraft is unstable',
      });
    } catch (error) {
      toast({
        title: 'Calculation Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [inputs, toast, sendCalculationEvent, updateToolContext]);

  // Generate downwash vs AR data
  const downwashData = useMemo(() => {
    if (!results) return undefined;
    const data = [];
    const a_w = results.a_w; // Use calculated wing lift curve slope
    for (let AR = 3; AR <= 20; AR += 0.5) {
      try {
        // Calculate downwash for different AR values using current wing lift curve slope
        const epsilon_datcom = (2 * a_w) / (Math.PI * AR);
        const epsilon_roskam = (a_w / (Math.PI * AR)) * (1.1 + AR / (AR + 4));
        data.push({ 
          AR, 
          epsilon_alpha: inputs.useRoskamDownwash ? epsilon_roskam : epsilon_datcom 
        });
      } catch (e) {
        // Skip invalid points
      }
    }
    return data;
  }, [inputs.useRoskamDownwash, results]);

  // Generate tail sizing sweep data
  const tailSizingData = useMemo(() => {
    if (!results) return undefined;
    const data = [];
    const S_t_min = inputs.S_t * 0.5;
    const S_t_max = inputs.S_t * 2.0;
    for (let S_t = S_t_min; S_t <= S_t_max; S_t += (S_t_max - S_t_min) / 30) {
      try {
        const testInputs = { ...inputs, S_t };
        const testResults = calculateStability(testInputs);
        data.push({ S_t, V_H: testResults.V_H, SM: testResults.SM });
      } catch (e) {
        // Skip invalid points
      }
    }
    return data;
  }, [inputs, results]);

  return (
    <ToolWrapper>
      <ToolHeader
        title="Stability & Control Derivatives"
        description="Comprehensive aircraft stability analysis based on Raymer, Roskam, Anderson, and DATCOM"
        icon={Plane}
      />

      <ToolSection title="Configuration">
        <div className="grid lg:grid-cols-2 gap-6">
          <PresetsPanel
            selectedPresetId={selectedPresetId}
            onPresetChange={setSelectedPresetId}
            onLoadPreset={handleLoadPreset}
          />
          <InputPanel inputs={inputs} onInputChange={handleInputChange} />
        </div>
      </ToolSection>

      <ToolActions>
        <AeroButton onClick={handleCalculate} icon={Calculator}>
          Calculate Stability
        </AeroButton>
        {results && (
          <>
            <AskAIButton requestId={lastRequestId} />
            <PDFExportButton toolName="Stability & Control Derivatives" />
          </>
        )}
      </ToolActions>

      {results && (
        <>
          <ToolSection title="Stability Results">
            <ResultsPanel results={results} />
          </ToolSection>

          <ToolSection title="Tail Sizing Analysis">
            <TailSizingPanel 
              results={results} 
              inputs={{ S_t: inputs.S_t, l_t: inputs.l_t }}
              tailSizingData={tailSizingData}
            />
          </ToolSection>

          <ToolSection title="Charts">
            <ChartsPanel
              results={results}
              cgSweepData={cgSweepData}
              downwashData={downwashData}
            />
          </ToolSection>
        </>
      )}
    </ToolWrapper>
  );
}
