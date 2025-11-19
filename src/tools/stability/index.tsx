/**
 * Aircraft Stability & Control Derivatives Calculator
 * 
 * High-fidelity stability analysis using Raymer, Roskam, Anderson, and USAF DATCOM formulations
 */

"use client";

import { useState, useCallback } from 'react';
import { Plane, Calculator, TrendingUp } from 'lucide-react';
import { ToolWrapper } from '@/components/layout/ToolWrapper';
import { ToolHeader } from '@/components/layout/ToolHeader';
import { ToolSection } from '@/components/layout/ToolSection';
import { ToolActions } from '@/components/layout/ToolActions';
import { AeroButton } from '@/components/common/AeroButton';
import { useToolContext } from '@/hooks/useToolContext';
import { PDFExportButton } from '@/components/tools/PDFExportButton';
import { AskAIButton } from '@/components/tools/AskAIButton';
import { buildStabilityPayload } from './utils/payloadBuilder';
import { calculateStability, StabilityInputs, StabilityResults, sweepCGPosition, sweepAngleOfAttack, sweepTailVolume } from './utils/calcStability';
import { validateStabilityInputs } from './validation/schema';
import { AIRCRAFT_PRESETS, AircraftPreset } from './data/presets';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { TailSizingPanel } from './components/TailSizingPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { PresetsPanel } from './components/PresetsPanel';
import { useToast } from '@/hooks/use-toast';

export default function StabilityCalculator() {
  const { sendCalculationEvent, updateToolContext } = useToolContext();
  const { toast } = useToast();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  // Input state - Geometry
  const [S_w, setS_w] = useState('15');
  const [AR, setAR] = useState('7');
  const [c_bar, setC_bar] = useState('1.5');
  const [x_cg, setX_cg] = useState('28');
  const [x_ac_w, setX_ac_w] = useState('25');
  
  // Tail
  const [S_t, setS_t] = useState('4');
  const [AR_t, setAR_t] = useState('4.5');
  const [l_t, setL_t] = useState('4.5');
  
  // Vertical tail
  const [S_v, setS_v] = useState('2.5');
  const [l_v, setL_v] = useState('4.5');
  const [b_w, setB_w] = useState('10');
  
  // Aerodynamics
  const [a0, setA0] = useState((2 * Math.PI).toFixed(2));
  const [e, setE] = useState('0.90');
  const [e_t, setE_t] = useState('0.85');
  const [eta_t, setEta_t] = useState('0.90');
  const [downwashModel, setDownwashModel] = useState<'DATCOM' | 'Roskam'>('DATCOM');
  
  // Control
  const [S_e, setS_e] = useState('1.2');
  const [tau_e, setTau_e] = useState('0.45');
  const [S_a, setS_a] = useState('2.0');
  const [K_a, setK_a] = useState('0.40');
  const [S_r, setS_r] = useState('0.8');
  const [K_r, setK_r] = useState('0.30');
  
  // Lateral
  const [dihedralAngle, setDihedralAngle] = useState('5');

  // Preset state
  const [selectedPresetId, setSelectedPresetId] = useState('trainer');

  // Results state
  const [results, setResults] = useState<StabilityResults | null>(null);
  const [cmAlphaData, setCmAlphaData] = useState<Array<{ alpha: number; Cm: number }> | undefined>();
  const [stabilityMarginData, setStabilityMarginData] = useState<Array<{ x_cg: number; SM: number; C_m_alpha: number }> | undefined>();
  const [tailVolumeData, setTailVolumeData] = useState<Array<{ V_H: number; SM: number; C_m_alpha: number }> | undefined>();

  // Load preset
  const handleLoadPreset = useCallback((preset: AircraftPreset) => {
    setS_w(preset.S_w.toString());
    setAR(preset.AR.toString());
    setC_bar(preset.c_bar.toString());
    setX_cg((preset.x_cg * 100).toString());
    setX_ac_w((preset.x_ac_w * 100).toString());
    setS_t(preset.S_t.toString());
    setAR_t(preset.AR_t.toString());
    setL_t(preset.l_t.toString());
    if (preset.S_v) setS_v(preset.S_v.toString());
    if (preset.l_v) setL_v(preset.l_v.toString());
    if (preset.b_w) setB_w(preset.b_w.toString());
    setA0(preset.a0.toString());
    setE(preset.e.toString());
    setE_t(preset.e_t.toString());
    setEta_t(preset.eta_t.toString());
    if (preset.S_e) setS_e(preset.S_e.toString());
    if (preset.tau_e) setTau_e(preset.tau_e.toString());
    if (preset.S_a) setS_a(preset.S_a.toString());
    if (preset.K_a) setK_a(preset.K_a.toString());
    if (preset.S_r) setS_r(preset.S_r.toString());
    if (preset.K_r) setK_r(preset.K_r.toString());
    if (preset.dihedralAngle !== undefined) setDihedralAngle(preset.dihedralAngle.toString());
    
    toast({
      title: 'Preset Loaded',
      description: `Loaded ${preset.name} configuration`,
    });
  }, [toast]);

  // Convert inputs to SI and build stability inputs
  const buildStabilityInputs = useCallback((): StabilityInputs | null => {
    try {
      const inputs: StabilityInputs = {
        S_w: parseFloat(S_w),
        AR: parseFloat(AR),
        c_bar: parseFloat(c_bar),
        x_cg: parseFloat(x_cg) / 100, // Convert % to fraction
        x_ac_w: parseFloat(x_ac_w) / 100,
        S_t: parseFloat(S_t),
        AR_t: parseFloat(AR_t),
        l_t: parseFloat(l_t),
        a0: parseFloat(a0),
        e: parseFloat(e),
        e_t: parseFloat(e_t),
        eta_t: parseFloat(eta_t),
        downwashModel,
      };

      // Optional vertical tail
      if (S_v && parseFloat(S_v) > 0) {
        inputs.S_v = parseFloat(S_v);
      }
      if (l_v && parseFloat(l_v) > 0) {
        inputs.l_v = parseFloat(l_v);
      }
      if (b_w && parseFloat(b_w) > 0) {
        inputs.b_w = parseFloat(b_w);
      }

      // Optional control surfaces
      if (S_e && parseFloat(S_e) > 0) {
        inputs.S_e = parseFloat(S_e);
      }
      if (tau_e && parseFloat(tau_e) > 0) {
        inputs.tau_e = parseFloat(tau_e);
      }
      if (S_a && parseFloat(S_a) > 0) {
        inputs.S_a = parseFloat(S_a);
      }
      if (K_a && parseFloat(K_a) > 0) {
        inputs.K_a = parseFloat(K_a);
      }
      if (S_r && parseFloat(S_r) > 0) {
        inputs.S_r = parseFloat(S_r);
      }
      if (K_r && parseFloat(K_r) > 0) {
        inputs.K_r = parseFloat(K_r);
      }

      // Optional lateral
      if (dihedralAngle) {
        inputs.dihedralAngle = parseFloat(dihedralAngle);
      }

      return inputs;
    } catch (error) {
      return null;
    }
  }, [S_w, AR, c_bar, x_cg, x_ac_w, S_t, AR_t, l_t, S_v, l_v, b_w, a0, e, e_t, eta_t, downwashModel, S_e, tau_e, S_a, K_a, S_r, K_r, dihedralAngle]);

  // Calculate stability
  const handleCalculate = useCallback(async () => {
    const inputs = buildStabilityInputs();
    if (!inputs) {
      toast({
        title: 'Invalid Inputs',
        description: 'Please check all input values',
        variant: 'destructive',
      });
      return;
    }

    // Validate
    const validation = validateStabilityInputs(inputs);

    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.errors.join('; '),
        variant: 'destructive',
      });
      return;
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => {
        toast({
          title: 'Warning',
          description: w,
          variant: 'default',
        });
      });
    }

    try {
      const result = calculateStability(inputs);
      setResults(result);

      // Build AI payload
      const payload = buildStabilityPayload(inputs, result);
      setLastRequestId(payload.requestId || null);

      // Send calculation event
      const eventResponse = await sendCalculationEvent({
        toolId: 'stability-control',
        toolName: 'Stability & Control Derivatives',
        inputs: {
          S_w: `${inputs.S_w.toFixed(2)} m²`,
          AR: inputs.AR.toFixed(2),
          'Static Margin': result.SM.toFixed(3),
        },
        results: {
          'C_mα': `${result.C_m_alpha.toFixed(4)} rad⁻¹`,
          'Static Margin': result.SM.toFixed(3),
          'Neutral Point': `${(result.x_np * 100).toFixed(1)}% MAC`,
        },
        steps: payload.metadata.steps,
        metadata: {
          units: 'SI',
          approxLevel: 'analytic',
          confidence: result.warnings.length === 0 ? 'high' : 'medium',
          warnings: result.warnings,
        },
      });

      if (eventResponse) {
        setLastRequestId(eventResponse.requestId);
      }

      // Update tool context
      updateToolContext({
        tool: 'Stability',
        inputs: {
          'Wing Area': `${inputs.S_w.toFixed(2)} m²`,
          'Aspect Ratio': inputs.AR.toFixed(2),
        },
        results: {
          'Static Margin': result.SM.toFixed(3),
          'C_mα': `${result.C_m_alpha.toFixed(4)} rad⁻¹`,
        },
      });
    } catch (error) {
      toast({
        title: 'Calculation Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [buildStabilityInputs, sendCalculationEvent, updateToolContext, toast]);

  // Sweep functions
  const handleSweepCG = useCallback(() => {
    const inputs = buildStabilityInputs();
    if (!inputs) return;

    try {
      const x_cg_current = inputs.x_cg;
      const data = sweepCGPosition(inputs, x_cg_current - 0.1, x_cg_current + 0.1, 50);
      setStabilityMarginData(data);
      toast({
        title: 'CG Sweep Complete',
        description: `Generated ${data.length} data points`,
      });
    } catch (error) {
      toast({
        title: 'Sweep Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [buildStabilityInputs, toast]);

  const handleSweepAlpha = useCallback(() => {
    const inputs = buildStabilityInputs();
    if (!inputs) return;

    try {
      const data = sweepAngleOfAttack(inputs, -0.2, 0.2, 50);
      setCmAlphaData(data);
      toast({
        title: 'Angle of Attack Sweep Complete',
        description: `Generated ${data.length} data points`,
      });
    } catch (error) {
      toast({
        title: 'Sweep Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [buildStabilityInputs, toast]);

  const handleSweepTailVolume = useCallback(() => {
    const inputs = buildStabilityInputs();
    if (!inputs) return;

    try {
      const data = sweepTailVolume(inputs, 0.3, 1.5, 50);
      setTailVolumeData(data);
      toast({
        title: 'Tail Volume Sweep Complete',
        description: `Generated ${data.length} data points`,
      });
    } catch (error) {
      toast({
        title: 'Sweep Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [buildStabilityInputs, toast]);

  return (
    <ToolWrapper>
      <ToolHeader
        title="Stability & Control Derivatives"
        description="High-fidelity stability analysis using Raymer, Roskam, Anderson, and USAF DATCOM formulations"
        icon={Plane}
        actions={
          <ToolActions>
            <AeroButton onClick={handleCalculate} icon={Calculator}>
              Calculate
            </AeroButton>
            {lastRequestId && (
              <>
                <AskAIButton requestId={lastRequestId} />
                <PDFExportButton requestId={lastRequestId} toolName="Stability & Control Derivatives" />
              </>
            )}
          </ToolActions>
        }
      />

      <ToolSection gridCols={2}>
        {/* Left Column: Presets and Inputs */}
        <div className="space-y-6">
          <PresetsPanel
            selectedPresetId={selectedPresetId}
            onPresetChange={setSelectedPresetId}
            onLoadPreset={handleLoadPreset}
          />

          <InputPanel
            S_w={S_w}
            onS_wChange={setS_w}
            AR={AR}
            onARChange={setAR}
            c_bar={c_bar}
            onC_barChange={setC_bar}
            x_cg={x_cg}
            onX_cgChange={setX_cg}
            x_ac_w={x_ac_w}
            onX_ac_wChange={setX_ac_w}
            S_t={S_t}
            onS_tChange={setS_t}
            AR_t={AR_t}
            onAR_tChange={setAR_t}
            l_t={l_t}
            onL_tChange={setL_t}
            S_v={S_v}
            onS_vChange={setS_v}
            l_v={l_v}
            onL_vChange={setL_v}
            b_w={b_w}
            onB_wChange={setB_w}
            a0={a0}
            onA0Change={setA0}
            e={e}
            onEChange={setE}
            e_t={e_t}
            onE_tChange={setE_t}
            eta_t={eta_t}
            onEta_tChange={setEta_t}
            downwashModel={downwashModel}
            onDownwashModelChange={setDownwashModel}
            S_e={S_e}
            onS_eChange={setS_e}
            tau_e={tau_e}
            onTau_eChange={setTau_e}
            S_a={S_a}
            onS_aChange={setS_a}
            K_a={K_a}
            onK_aChange={setK_a}
            S_r={S_r}
            onS_rChange={setS_r}
            K_r={K_r}
            onK_rChange={setK_r}
            dihedralAngle={dihedralAngle}
            onDihedralAngleChange={setDihedralAngle}
          />

          {/* Sweep Controls */}
          <div className="flex gap-2">
            <AeroButton onClick={handleSweepAlpha} icon={TrendingUp} variant="outline" className="flex-1">
              Sweep α
            </AeroButton>
            <AeroButton onClick={handleSweepCG} icon={TrendingUp} variant="outline" className="flex-1">
              Sweep CG
            </AeroButton>
            <AeroButton onClick={handleSweepTailVolume} icon={TrendingUp} variant="outline" className="flex-1">
              Sweep V_H
            </AeroButton>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          <ResultsPanel results={results} />
          {results && (
            <TailSizingPanel
              results={results}
              S_t={parseFloat(S_t)}
              S_w={parseFloat(S_w)}
              l_t={parseFloat(l_t)}
              c_bar={parseFloat(c_bar)}
            />
          )}
        </div>
      </ToolSection>

      {/* Charts Section */}
      <ToolSection>
        <ChartsPanel
          cmAlphaData={cmAlphaData}
          stabilityMarginData={stabilityMarginData}
          tailVolumeData={tailVolumeData}
        />
      </ToolSection>
    </ToolWrapper>
  );
}
