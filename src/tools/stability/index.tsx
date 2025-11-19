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
import { buildStabilityPayload, ExtendedStabilityResults } from './utils/payloadBuilder';
import { A0_THEORETICAL, DEFAULT_AIRFOIL_LIFT_SLOPE, DEFAULT_WING_EFFICIENCY, DEFAULT_TAIL_EFFICIENCY, DEFAULT_ELEVATOR_EFFECTIVENESS } from './utils/constants';
import { AIRCRAFT_PRESETS, AircraftPreset } from './data/presets';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { TailSizingPanel } from './components/TailSizingPanel';
import { PresetsPanel } from './components/PresetsPanel';
import { ControlGeometryPanel } from './components/ControlGeometry';
import { DynamicDerivativesPanel } from './components/DynamicDerivatives';
import { ControlMixingPanel } from './components/ControlMixing';
import { HingeMomentsPanel } from './components/HingeMoments';
import { HighLiftDevicesPanel } from './components/HighLiftDevices';
import { RollRatePanel } from './components/RollRatePanel';
import { StabilityCriteriaPanel } from './components/StabilityCriteria';
import { calculateDynamicDerivatives, DynamicDerivativesInputs } from './utils/calcDynamicDerivatives';
import { calculateControlDerivatives, ControlDerivativesInputs, ControlGeometry } from './utils/calcControlDerivatives';
import { calculateHingeMoments, HingeMomentInputs } from './utils/calcHingeMoments';
import { calculateControlMixing, ControlMixingInputs } from './utils/controlMixing';
import { calculateHighLiftEffects, HighLiftDevice } from './utils/highLiftEffects';
import { calculateRollRate, RollRateInputs } from './utils/rollRateEstimator';
import { evaluateStabilityCriteria, StabilityCriteriaInputs } from './utils/criteria';
import { calculateNonlinearControl, NonlinearControlInputs } from './utils/nonlinearControl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MIXING_PRESETS } from './data/mixingMatrices';

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
  const [extendedResults, setExtendedResults] = useState<ExtendedStabilityResults | null>(null);
  const [cgSweepData, setCgSweepData] = useState<Array<{ x_cg: number; SM: number; C_m_alpha: number }>>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('custom');
  
  // Feature toggles
  const [enableDynamicDerivatives, setEnableDynamicDerivatives] = useState(false);
  const [enableControlGeometry, setEnableControlGeometry] = useState(false);
  const [enableHingeMoments, setEnableHingeMoments] = useState(false);
  const [enableControlMixing, setEnableControlMixing] = useState(false);
  const [enableHighLift, setEnableHighLift] = useState(false);
  const [enableRollRate, setEnableRollRate] = useState(false);
  const [enableStabilityCriteria, setEnableStabilityCriteria] = useState(false);
  const [enableNonlinear, setEnableNonlinear] = useState(false);
  
  // Control geometry
  const [elevatorGeometry, setElevatorGeometry] = useState<Partial<ControlGeometry>>();
  const [aileronGeometry, setAileronGeometry] = useState<Partial<ControlGeometry>>();
  const [rudderGeometry, setRudderGeometry] = useState<Partial<ControlGeometry>>();
  
  // Control mixing
  const [mixingType, setMixingType] = useState<'none' | 'aileron-differential' | 'flaperons' | 'spoilerons' | 'elevator-aileron' | 'rudder-aileron' | 'quadcopter'>('none');
  const [aileronDifferentialRatio, setAileronDifferentialRatio] = useState(0.6);
  const [flaperonMix, setFlaperonMix] = useState(0.5);
  const [spoileronMix, setSpoileronMix] = useState(0.5);
  const [motorMixingPreset, setMotorMixingPreset] = useState('quadcopter-x');
  
  // High-lift devices
  const [highLiftDevices, setHighLiftDevices] = useState<HighLiftDevice[]>([]);
  
  // Roll rate inputs
  const [deltaA, setDeltaA] = useState(15);
  const [velocity, setVelocity] = useState(50);
  const [I_x, setI_x] = useState(100);
  
  // Stability criteria
  const [aircraftCategory, setAircraftCategory] = useState<'A' | 'B' | 'C'>('B');
  const [flightPhase, setFlightPhase] = useState<'cruise' | 'approach' | 'landing' | 'takeoff'>('cruise');
  
  // Nonlinear control
  const [deltaE, setDeltaE] = useState(10);
  const [deltaR, setDeltaR] = useState(5);
  const [alpha, setAlpha] = useState(5);

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

      // Perform base stability calculation
      const stabilityResults = calculateStability(inputs);
      setResults(stabilityResults);

      // Generate CG sweep data
      const sweepData = sweepCGPosition(inputs, 0.15, 0.40, 50);
      setCgSweepData(sweepData);

      // Build extended results
      const extended: ExtendedStabilityResults = {
        stability: stabilityResults,
      };

      // Calculate dynamic derivatives if enabled
      if (enableDynamicDerivatives) {
        const dynamicInputs: DynamicDerivativesInputs = {
          S_w: inputs.S_w,
          AR: inputs.AR,
          b: Math.sqrt(inputs.S_w * inputs.AR), // Estimate span
          c_bar: inputs.c_bar,
          l_t: inputs.l_t,
          a0: inputs.a0,
          e: inputs.e,
          S_t: inputs.S_t,
          AR_t: inputs.AR_t,
          e_t: inputs.e_t,
          eta: inputs.eta,
        };
        extended.dynamic = calculateDynamicDerivatives(dynamicInputs);
      }

      // Calculate enhanced control derivatives if geometry enabled
      if (enableControlGeometry) {
        const controlInputs: ControlDerivativesInputs = {
          S_t: inputs.S_t,
          AR_t: inputs.AR_t,
          l_t: inputs.l_t,
          c_bar: inputs.c_bar,
          S_w: inputs.S_w,
          a0: inputs.a0,
          e_t: inputs.e_t,
          eta: inputs.eta,
          AR: inputs.AR,
          e: inputs.e,
          b: Math.sqrt(inputs.S_w * inputs.AR),
          S_v: inputs.S_v,
          elevator_geometry: elevatorGeometry as ControlGeometry | undefined,
          aileron_geometry: aileronGeometry as ControlGeometry | undefined,
          rudder_geometry: rudderGeometry as ControlGeometry | undefined,
        };
        extended.control = calculateControlDerivatives(controlInputs);
      }

      // Calculate hinge moments if enabled
      if (enableHingeMoments && elevatorGeometry) {
        const hingeInputs: HingeMomentInputs = {
          chord_fraction: elevatorGeometry.chord_fraction || 0.3,
          hinge_line_position: elevatorGeometry.hinge_line_position || 0.7,
          balance_type: elevatorGeometry.balance_type || 'horn',
          a0: inputs.a0,
          alpha_0: 0,
          S_control: inputs.S_e || 0.1,
          c_control: inputs.c_bar * (elevatorGeometry.chord_fraction || 0.3),
        };
        extended.hingeMoments = calculateHingeMoments(hingeInputs);
      }

      // Calculate control mixing if enabled
      if (enableControlMixing) {
        const mixingInputs: ControlMixingInputs = {
          mixing_type: mixingType,
          aileron_differential_ratio: aileronDifferentialRatio,
          flaperon_mix: flaperonMix,
          spoileron_mix: spoileronMix,
          C_l_delta_a_base: stabilityResults.C_l_delta_a,
          C_m_delta_e_base: stabilityResults.C_m_delta_e,
          C_n_delta_r_base: stabilityResults.C_n_delta_r,
          motor_mixing_matrix: (MIXING_PRESETS as any)[motorMixingPreset]?.matrix,
          motor_gains: (MIXING_PRESETS as any)[motorMixingPreset]?.gains,
        };
        extended.mixing = calculateControlMixing(mixingInputs);
      }

      // Calculate high-lift effects if enabled
      if (enableHighLift && highLiftDevices.length > 0) {
        extended.highLift = calculateHighLiftEffects(highLiftDevices);
      }

      // Calculate roll rate if enabled
      if (enableRollRate) {
        const q = 0.5 * 1.225 * velocity * velocity; // Dynamic pressure at sea level
        const rollRateInputs: RollRateInputs = {
          delta_a: deltaA,
          C_l_delta_a: extended.mixing?.C_l_delta_a_effective || stabilityResults.C_l_delta_a || 0.1,
          q,
          S_w: inputs.S_w,
          b: Math.sqrt(inputs.S_w * inputs.AR),
          I_x,
          V: velocity,
        };
        extended.rollRate = calculateRollRate(rollRateInputs);
      }

      // Evaluate stability criteria if enabled
      if (enableStabilityCriteria && extended.dynamic) {
        const criteriaInputs: StabilityCriteriaInputs = {
          C_m_alpha: stabilityResults.C_m_alpha,
          C_m_q: extended.dynamic.C_m_q,
          C_l_beta: stabilityResults.C_l_beta || 0,
          C_n_beta: stabilityResults.C_n_beta || 0,
          C_l_p: extended.dynamic.C_l_p,
          C_l_r: extended.dynamic.C_l_r,
          C_n_r: extended.dynamic.C_n_r,
          C_n_p: extended.dynamic.C_n_p,
          V: velocity,
          category: aircraftCategory,
          phase: flightPhase,
        };
        extended.criteria = evaluateStabilityCriteria(criteriaInputs);
      }

      // Calculate nonlinear control if enabled
      if (enableNonlinear) {
        const nonlinearInputs: NonlinearControlInputs = {
          delta_e: deltaE,
          delta_a: deltaA,
          delta_r: deltaR,
          alpha,
          C_m_delta_e_base: extended.control?.C_m_delta_e || stabilityResults.C_m_delta_e || 0,
          C_l_delta_a_base: extended.control?.C_l_delta_a || extended.mixing?.C_l_delta_a_effective || stabilityResults.C_l_delta_a || 0,
          C_n_delta_r_base: extended.control?.C_n_delta_r || stabilityResults.C_n_delta_r || 0,
          enabled: true,
        };
        extended.nonlinear = calculateNonlinearControl(nonlinearInputs);
      }

      setExtendedResults(extended);

      // Generate AI payload
      const requestId = `stability-${Date.now()}`;
      setLastRequestId(requestId);
      const payload = buildStabilityPayload(inputs, extended, requestId);

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
  }, [
    inputs,
    toast,
    sendCalculationEvent,
    updateToolContext,
    enableDynamicDerivatives,
    enableControlGeometry,
    enableHingeMoments,
    enableControlMixing,
    enableHighLift,
    enableRollRate,
    enableStabilityCriteria,
    enableNonlinear,
    elevatorGeometry,
    aileronGeometry,
    rudderGeometry,
    mixingType,
    aileronDifferentialRatio,
    flaperonMix,
    spoileronMix,
    motorMixingPreset,
    highLiftDevices,
    deltaA,
    velocity,
    I_x,
    aircraftCategory,
    flightPhase,
    deltaE,
    deltaR,
    alpha,
  ]);

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

      {/* Advanced Features Toggles */}
      <ToolSection title="Advanced Features">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-800/30 rounded-lg border border-cyan-400/20">
          <div className="flex items-center space-x-2">
            <Switch
              id="dynamic"
              checked={enableDynamicDerivatives}
              onCheckedChange={setEnableDynamicDerivatives}
            />
            <Label htmlFor="dynamic" className="text-sm">Dynamic Derivatives</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="control-geo"
              checked={enableControlGeometry}
              onCheckedChange={setEnableControlGeometry}
            />
            <Label htmlFor="control-geo" className="text-sm">Control Geometry</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="hinge"
              checked={enableHingeMoments}
              onCheckedChange={setEnableHingeMoments}
            />
            <Label htmlFor="hinge" className="text-sm">Hinge Moments</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="mixing"
              checked={enableControlMixing}
              onCheckedChange={setEnableControlMixing}
            />
            <Label htmlFor="mixing" className="text-sm">Control Mixing</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="highlift"
              checked={enableHighLift}
              onCheckedChange={setEnableHighLift}
            />
            <Label htmlFor="highlift" className="text-sm">High-Lift Devices</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="rollrate"
              checked={enableRollRate}
              onCheckedChange={setEnableRollRate}
            />
            <Label htmlFor="rollrate" className="text-sm">Roll Rate</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="criteria"
              checked={enableStabilityCriteria}
              onCheckedChange={setEnableStabilityCriteria}
            />
            <Label htmlFor="criteria" className="text-sm">MIL-F-8785C</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="nonlinear"
              checked={enableNonlinear}
              onCheckedChange={setEnableNonlinear}
            />
            <Label htmlFor="nonlinear" className="text-sm">Nonlinear Control</Label>
          </div>
        </div>
      </ToolSection>

      {/* Advanced Feature Panels */}
      {(enableControlGeometry || enableControlMixing || enableHighLift) && (
        <ToolSection title="Advanced Configuration">
          <Tabs defaultValue={enableControlGeometry ? "control-geometry" : enableControlMixing ? "mixing" : "highlift"} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
              {enableControlGeometry && <TabsTrigger value="control-geometry">Control Geometry</TabsTrigger>}
              {enableControlMixing && <TabsTrigger value="mixing">Control Mixing</TabsTrigger>}
              {enableHighLift && <TabsTrigger value="highlift">High-Lift Devices</TabsTrigger>}
            </TabsList>
            {enableControlGeometry && (
              <TabsContent value="control-geometry" className="mt-4">
                <ControlGeometryPanel
                  elevatorGeometry={elevatorGeometry as ControlGeometry}
                  aileronGeometry={aileronGeometry as ControlGeometry}
                  rudderGeometry={rudderGeometry as ControlGeometry}
                  onGeometryChange={(surface, geometry) => {
                    if (surface === 'elevator') setElevatorGeometry({ ...elevatorGeometry, ...geometry });
                    if (surface === 'aileron') setAileronGeometry({ ...aileronGeometry, ...geometry });
                    if (surface === 'rudder') setRudderGeometry({ ...rudderGeometry, ...geometry });
                  }}
                />
              </TabsContent>
            )}
            {enableControlMixing && (
              <TabsContent value="mixing" className="mt-4">
                <ControlMixingPanel
                  mixingType={mixingType}
                  onMixingTypeChange={setMixingType}
                  aileronDifferentialRatio={aileronDifferentialRatio}
                  onAileronDifferentialChange={setAileronDifferentialRatio}
                  flaperonMix={flaperonMix}
                  onFlaperonMixChange={setFlaperonMix}
                  spoileronMix={spoileronMix}
                  onSpoileronMixChange={setSpoileronMix}
                  motorMixingPreset={motorMixingPreset}
                  onMotorMixingPresetChange={setMotorMixingPreset}
                  mixingResults={extendedResults?.mixing}
                />
              </TabsContent>
            )}
            {enableHighLift && (
              <TabsContent value="highlift" className="mt-4">
                <HighLiftDevicesPanel
                  devices={highLiftDevices}
                  onDevicesChange={setHighLiftDevices}
                  onPresetLoad={setHighLiftDevices}
                />
              </TabsContent>
            )}
          </Tabs>
        </ToolSection>
      )}

      {results && (
        <>
          <ToolSection title="Stability Results">
            <ResultsPanel results={results} />
          </ToolSection>

          {/* Advanced Results Panels */}
          {extendedResults && (
            <>
              {enableDynamicDerivatives && extendedResults.dynamic && (
                <ToolSection title="Dynamic Derivatives">
                  <DynamicDerivativesPanel
                    derivatives={extendedResults.dynamic}
                    enabled={enableDynamicDerivatives}
                  />
                </ToolSection>
              )}

              {enableControlGeometry && extendedResults.control && (
                <ToolSection title="Enhanced Control Derivatives">
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-sm text-gray-300 mb-2">Control Effectiveness Factors:</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">τ_e (Elevator)</p>
                        <p className="text-cyan-400 font-bold">
                          {extendedResults.control.tau_e != null ? extendedResults.control.tau_e.toFixed(3) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">τ_a (Aileron)</p>
                        <p className="text-cyan-400 font-bold">
                          {extendedResults.control.tau_a != null ? extendedResults.control.tau_a.toFixed(3) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">τ_r (Rudder)</p>
                        <p className="text-cyan-400 font-bold">
                          {extendedResults.control.tau_r != null ? extendedResults.control.tau_r.toFixed(3) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </ToolSection>
              )}

              {enableHingeMoments && extendedResults.hingeMoments && (
                <ToolSection title="Hinge Moments">
                  <HingeMomentsPanel
                    hingeMoments={extendedResults.hingeMoments}
                    enabled={enableHingeMoments}
                  />
                </ToolSection>
              )}

              {enableRollRate && extendedResults.rollRate && (
                <ToolSection title="Roll Rate Estimation">
                  <RollRatePanel
                    rollRateResult={extendedResults.rollRate}
                    enabled={enableRollRate}
                    deltaA={deltaA}
                    onDeltaAChange={setDeltaA}
                    velocity={velocity}
                    onVelocityChange={setVelocity}
                    I_x={I_x}
                    onIxChange={setI_x}
                  />
                </ToolSection>
              )}

              {enableStabilityCriteria && extendedResults.criteria && (
                <ToolSection title="Stability Criteria (MIL-F-8785C)">
                  <StabilityCriteriaPanel
                    criteria={extendedResults.criteria}
                    enabled={enableStabilityCriteria}
                    category={aircraftCategory}
                    onCategoryChange={setAircraftCategory}
                    phase={flightPhase}
                    onPhaseChange={setFlightPhase}
                  />
                </ToolSection>
              )}

              {enableNonlinear && extendedResults.nonlinear && (
                <ToolSection title="Nonlinear Control Behavior">
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-sm text-gray-300 mb-4">Nonlinear Effectiveness Factors:</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Elevator Factor</p>
                        <p className="text-cyan-400 font-bold">
                          {extendedResults.nonlinear.elevator_factor != null ? extendedResults.nonlinear.elevator_factor.toFixed(3) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Aileron Factor</p>
                        <p className="text-cyan-400 font-bold">
                          {extendedResults.nonlinear.aileron_factor != null ? extendedResults.nonlinear.aileron_factor.toFixed(3) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Rudder Factor</p>
                        <p className="text-cyan-400 font-bold">
                          {extendedResults.nonlinear.rudder_factor != null ? extendedResults.nonlinear.rudder_factor.toFixed(3) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {extendedResults.nonlinear.warnings && extendedResults.nonlinear.warnings.length > 0 && (
                      <div className="mt-4 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded">
                        {extendedResults.nonlinear.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-yellow-400">{w}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </ToolSection>
              )}
            </>
          )}

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
