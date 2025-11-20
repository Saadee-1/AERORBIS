/**
 * Rocket Trajectory Simulator
 * 
 * High-fidelity 1D, 2D, and 3D trajectory simulation with physics engine
 */

"use client";

import { useState, useCallback, useMemo } from 'react';
import { Rocket, Play, Square } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

import { Planet, PLANETS, getPlanet } from './data/planets';
import { Stage } from './utils/physics/staging';
import { GuidanceProfile } from './utils/solver/run2d';
import { Guidance3D } from './utils/solver/run3d';
import { run1D, Trajectory1DResult } from './utils/solver/run1d';
import { run2D, Trajectory2DResult } from './utils/solver/run2d';
import { run3D, Trajectory3DResult } from './utils/solver/run3d';
import { buildTrajectoryPayload } from './utils/payloadBuilder';
import { STAGE_PRESETS, getStage } from './data/stagePresets';

import { PlanetSelector } from './components/PlanetSelector';
import { StageEditor } from './components/StageEditor';
import { GuidanceConfig } from './components/GuidanceConfig';
import { ResultsPanel } from './components/ResultsPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { ThreeDVisualizer } from './components/ThreeDVisualizerWrapper';
import { AdvancedSettingsPanel, AdvancedSettings } from './components/AdvancedSettingsPanel';

export default function TrajectorySimulator() {
  const { sendCalculationEvent, updateToolContext } = useToolContext();
  const { toast } = useToast();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  // Simulation mode
  const [mode, setMode] = useState<'1D' | '2D' | '3D'>('1D');
  
  // Planet selection
  const [selectedPlanet, setSelectedPlanet] = useState<Planet>(PLANETS.earth);
  
  // Stages
  const [stages, setStages] = useState<Stage[]>([
    {
      id: 'stage-1',
      dryMass: 1000,
      fuelMass: 5000,
      engines: [{ id: 'merlin-1d', count: 1, isp: 282, thrust: 845000 }],
      Cd: 0.5,
      area: 1.0,
    },
  ]);
  
  // Guidance (2D/3D)
  const [guidance2D, setGuidance2D] = useState<GuidanceProfile>({
    type: 'gravity_turn',
    initialPitch: 90,
  });
  const [guidance3D, setGuidance3D] = useState<Guidance3D>({});
  
  // Simulation parameters
  const [timeStep, setTimeStep] = useState(0.1);
  const [maxTime, setMaxTime] = useState(1000);
  const [maxAltitude, setMaxAltitude] = useState(1000000);
  
  // Results
  const [result1D, setResult1D] = useState<Trajectory1DResult | null>(null);
  const [result2D, setResult2D] = useState<Trajectory2DResult | null>(null);
  const [result3D, setResult3D] = useState<Trajectory3DResult | null>(null);
  
  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Advanced settings
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    enable2D: true,
    enable3D: false,
    enableAtmosphericDrag: true,
    enableHeating: false,
    enableTVC: false,
    performanceMode: 'fast',
    downsampleOutput: false,
    enableKepler: false,
    enableJ2: false,
    enableAerobraking: false,
    enableMissileBallistic: false,
    enableGuidedMissile: false,
    enableOrbitalLaunch: false,
    engineSelectionMode: 'manual',
  });

  // Validation
  const validateInputs = useCallback((): string[] => {
    const errs: string[] = [];
    
    if (stages.length === 0) {
      errs.push('At least one stage is required');
    }
    
    stages.forEach((stage, i) => {
      if (stage.dryMass <= 0) {
        errs.push(`Stage ${i + 1}: Dry mass must be positive`);
      }
      if (stage.fuelMass < 0) {
        errs.push(`Stage ${i + 1}: Fuel mass cannot be negative`);
      }
      if (stage.engines.length === 0) {
        errs.push(`Stage ${i + 1}: At least one engine is required`);
      }
      stage.engines.forEach((engine, j) => {
        if (engine.isp <= 0) {
          errs.push(`Stage ${i + 1}, Engine ${j + 1}: Isp must be positive`);
        }
        if (typeof engine.thrust === 'number' && engine.thrust <= 0) {
          errs.push(`Stage ${i + 1}, Engine ${j + 1}: Thrust must be positive`);
        }
        if (engine.count <= 0) {
          errs.push(`Stage ${i + 1}, Engine ${j + 1}: Engine count must be positive`);
        }
      });
      if (stage.Cd <= 0) {
        errs.push(`Stage ${i + 1}: Drag coefficient must be positive`);
      }
      if (stage.area <= 0) {
        errs.push(`Stage ${i + 1}: Frontal area must be positive`);
      }
    });
    
    if (timeStep <= 0) {
      errs.push('Time step must be positive');
    }
    
    if (maxTime <= 0) {
      errs.push('Max time must be positive');
    }
    
    // Advanced validation rules
    if (advancedSettings.enableMissileBallistic && advancedSettings.enableKepler) {
      errs.push('Missile mode cannot use orbital propagation');
    }
    
    if (advancedSettings.enableJ2 && selectedPlanet.id !== 'earth') {
      errs.push('J2 perturbation only applicable for Earth-like bodies');
    }
    
    if (advancedSettings.enableAerobraking && !selectedPlanet.hasAtmosphere) {
      errs.push('Aerobraking requires an atmosphere');
    }
    
    if (advancedSettings.enableGuidedMissile && !advancedSettings.enableMissileBallistic) {
      // Guided mode requires some target - this is a soft warning
      // Could add target position validation here
    }
    
    // Check T/W ratio
    if (stages.length > 0) {
      const firstStage = stages[0];
      const totalThrust = firstStage.engines.reduce((sum, eng) => {
        const thrust = typeof eng.thrust === 'number' ? eng.thrust : eng.thrust?.value || 0;
        return sum + thrust * eng.count;
      }, 0);
      const totalMass = firstStage.dryMass + firstStage.fuelMass;
      const tw = totalThrust / (totalMass * selectedPlanet.surfaceGravity);
      
      if (tw < 1.0) {
        errs.push(`Warning: Thrust-to-weight ratio is ${tw.toFixed(2)} < 1.0. Rocket may not lift off.`);
      }
    }
    
    return errs;
  }, [stages, timeStep, maxTime, selectedPlanet, advancedSettings]);

  // Run simulation
  const runSimulation = useCallback(() => {
    const validationErrors = validateInputs();
    setErrors(validationErrors.filter(e => !e.startsWith('Warning:')));
    
    if (validationErrors.length > 0 && !validationErrors.some(e => e.startsWith('Warning:'))) {
      toast({
        title: 'Validation Error',
        description: validationErrors[0],
        variant: 'destructive',
      });
      return;
    }
    
    setIsRunning(true);
    
    try {
      if (mode === '1D') {
        const result = run1D({
          planet: selectedPlanet,
          stages,
          timeStep,
          maxTime,
          maxAltitude,
        });
        setResult1D(result);
        setResult2D(null);
        setResult3D(null);
      } else if (mode === '2D') {
        const result = run2D({
          planet: selectedPlanet,
          stages,
          guidance: guidance2D,
          timeStep,
          maxTime,
          maxAltitude,
        });
        setResult1D(null);
        setResult2D(result);
        setResult3D(null);
      } else if (mode === '3D') {
        const result = run3D({
          planet: selectedPlanet,
          stages,
          guidance: guidance3D,
          timeStep,
          maxTime,
          maxAltitude,
        });
        setResult1D(null);
        setResult2D(null);
        setResult3D(result);
      }
      
      toast({
        title: 'Simulation Complete',
        description: `Trajectory calculated successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Simulation Error',
        description: error.message || 'An error occurred during simulation',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  }, [mode, selectedPlanet, stages, guidance2D, guidance3D, timeStep, maxTime, maxAltitude, validateInputs, toast]);

  // Load preset
  const loadPreset = useCallback((presetId: string) => {
    const preset = STAGE_PRESETS[presetId];
    if (preset) {
      setStages([preset]);
      toast({
        title: 'Preset Loaded',
        description: `Loaded ${preset.name}`,
      });
    }
  }, [toast]);

  // Build AI payload
  const buildAIPayload = useCallback(() => {
    if (!result1D && !result2D && !result3D) {
      return null;
    }
    
    return buildTrajectoryPayload({
      mode,
      planet: selectedPlanet,
      stages,
      guidance: mode === '2D' ? guidance2D : mode === '3D' ? guidance3D : undefined,
      result1D,
      result2D,
      result3D,
      advancedFeatures: {
        performanceMode: advancedSettings.performanceMode,
        enableJ2: advancedSettings.enableJ2,
        enableAerobraking: advancedSettings.enableAerobraking,
        enableMissileMode: advancedSettings.enableMissileBallistic,
        enableGuidedMode: advancedSettings.enableGuidedMissile,
        enableKepler: advancedSettings.enableKepler,
        enable3D: advancedSettings.enable3D,
        engineDatabaseUsed: advancedSettings.engineSelectionMode === 'database',
        downsampleOutput: advancedSettings.downsampleOutput,
      },
    }, lastRequestId || undefined);
  }, [mode, selectedPlanet, stages, guidance2D, guidance3D, result1D, result2D, result3D, lastRequestId, advancedSettings]);

  // Handle AI request
  const handleAIRequest = useCallback(async () => {
    const payload = buildAIPayload();
    if (!payload) {
      toast({
        title: 'No Results',
        description: 'Run a simulation first',
        variant: 'destructive',
      });
      return;
    }
    
    const requestId = `trajectory-${Date.now()}`;
    setLastRequestId(requestId);
    
    sendCalculationEvent({
      type: 'calculation',
      toolName: 'Rocket Trajectory Simulator',
      payload,
      requestId,
    });
    
    updateToolContext({
      toolName: 'Rocket Trajectory Simulator',
      lastCalculation: payload,
    });
  }, [buildAIPayload, sendCalculationEvent, updateToolContext, toast]);

  // Get current result for visualization
  const currentResult = useMemo(() => {
    return mode === '1D' ? result1D : mode === '2D' ? result2D : result3D;
  }, [mode, result1D, result2D, result3D]);

  // Get trajectory data for 3D visualization
  const trajectory3D = useMemo(() => {
    if (mode !== '3D' || !result3D) return undefined;
    return result3D.states.map(state => ({
      position: state.position,
      altitude: state.altitude,
    }));
  }, [mode, result3D]);

  const currentState3D = useMemo(() => {
    if (mode !== '3D' || !result3D || result3D.states.length === 0) return undefined;
    const last = result3D.states[result3D.states.length - 1];
    return {
      position: last.position,
      attitude: last.attitude,
    };
  }, [mode, result3D]);

  return (
    <ToolWrapper>
      <ToolHeader
        icon={Rocket}
        title="Rocket Trajectory Simulator"
        description="High-fidelity 1D, 2D, and 3D trajectory simulation with atmospheric flight, staging, and orbital mechanics"
      />

      {/* Mode Selection */}
      <ToolSection>
        <div className="flex items-center gap-4 mb-4">
          <Label className="text-sm font-semibold text-cyan-400">Simulation Mode:</Label>
          <Select value={mode} onValueChange={(value: '1D' | '2D' | '3D') => setMode(value)}>
            <SelectTrigger className="w-32 bg-slate-700/50 border-cyan-400/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1D">1D (Vertical)</SelectItem>
              <SelectItem value="2D">2D (Gravity Turn)</SelectItem>
              <SelectItem value="3D">3D (Full 6-DOF)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ToolSection>

      {/* Warnings */}
      {errors.length > 0 && (
        <ToolSection>
          {errors.map((error, i) => (
            <Alert key={i} className="bg-yellow-400/10 border-yellow-400/30">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-400">{error}</AlertDescription>
            </Alert>
          ))}
        </ToolSection>
      )}

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="guidance">Guidance</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <ToolSection>
            <PlanetSelector selectedPlanet={selectedPlanet} onPlanetChange={setSelectedPlanet} />
            
            <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-cyan-400/20">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Simulation Parameters</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm text-gray-400">Time Step (s)</Label>
                  <input
                    type="number"
                    value={timeStep}
                    onChange={(e) => setTimeStep(parseFloat(e.target.value) || 0.1)}
                    className="w-full mt-1 px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                    min="0.01"
                    max="1"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-400">Max Time (s)</Label>
                  <input
                    type="number"
                    value={maxTime}
                    onChange={(e) => setMaxTime(parseFloat(e.target.value) || 1000)}
                    className="w-full mt-1 px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                    min="10"
                    max="10000"
                    step="100"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-400">Max Altitude (km)</Label>
                  <input
                    type="number"
                    value={maxAltitude / 1000}
                    onChange={(e) => setMaxAltitude((parseFloat(e.target.value) || 1000) * 1000)}
                    className="w-full mt-1 px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                    min="10"
                    max="10000"
                    step="100"
                  />
                </div>
              </div>
            </div>
          </ToolSection>
        </TabsContent>

        <TabsContent value="stages">
          <ToolSection>
            <StageEditor stages={stages} onStagesChange={setStages} />
            
            <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-cyan-400/20">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Quick Presets</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(STAGE_PRESETS).map(preset => (
                  <AeroButton
                    key={preset.id}
                    onClick={() => loadPreset(preset.id)}
                    variant="outline"
                    size="sm"
                  >
                    {preset.name}
                  </AeroButton>
                ))}
              </div>
            </div>
          </ToolSection>
        </TabsContent>

        <TabsContent value="guidance">
          <ToolSection>
            <GuidanceConfig
              mode={mode}
              guidance2D={guidance2D}
              guidance3D={guidance3D}
              onGuidance2DChange={setGuidance2D}
              onGuidance3DChange={setGuidance3D}
            />
          </ToolSection>
        </TabsContent>

        <TabsContent value="advanced">
          <ToolSection>
            <AdvancedSettingsPanel
              settings={advancedSettings}
              onSettingsChange={setAdvancedSettings}
            />
          </ToolSection>
        </TabsContent>

        <TabsContent value="results">
          <ToolSection>
            <ResultsPanel
              mode={mode}
              result1D={result1D}
              result2D={result2D}
              result3D={result3D}
            />
            {mode === '3D' && result3D && (
              <div className="mt-6">
                <ThreeDVisualizer
                  planet={selectedPlanet}
                  result={result3D}
                  mode={mode}
                />
              </div>
            )}
            {/* Show visualizer for all modes if enabled */}
            {advancedSettings.enable3D && currentResult && (
              <div className="mt-6">
                <ThreeDVisualizer
                  planet={selectedPlanet}
                  result={currentResult}
                  mode={mode}
                />
              </div>
            )}
          </ToolSection>
        </TabsContent>

        <TabsContent value="charts">
          <ToolSection>
            <ChartsPanel
              mode={mode}
              result1D={result1D}
              result2D={result2D}
              result3D={result3D}
            />
          </ToolSection>
        </TabsContent>
      </Tabs>

      <ToolActions>
        <AeroButton
          onClick={runSimulation}
          disabled={isRunning}
          className="bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900"
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Simulation
            </>
          )}
        </AeroButton>

        <PDFExportButton
          toolName="Rocket Trajectory Simulator"
          payload={buildAIPayload()}
          disabled={!currentResult}
        />

        <AskAIButton
          onClick={handleAIRequest}
          disabled={!currentResult}
        />
      </ToolActions>
    </ToolWrapper>
  );
}
