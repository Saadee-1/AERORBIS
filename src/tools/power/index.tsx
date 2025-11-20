/**
 * Advanced Battery & Solar Power System Tool
 * 
 * Ultra-high-fidelity energy modeling for UAVs, aircraft, rockets, and CubeSats
 */

"use client";

import { useState, useCallback, useMemo } from 'react';
import { Battery, Calculator } from 'lucide-react';
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
import { BatteryPack, BatteryState } from './utils/batteryModel';
import { SolarConfig } from './utils/solarModel';
import { PowerLoad, MissionPhase, simulateMission, MissionResult } from './utils/missionEngine';
import { validatePowerSystemInputs } from './validation/schema';
import { buildPowerSystemPayload } from './utils/payloadBuilder';
import { getBatteryChemistry } from './data/batteryChemistries';
import { BatteryPackForm } from './components/BatteryPackForm';
import { SolarConfig as SolarConfigComponent } from './components/SolarConfig';
import { LoadProfile } from './components/LoadProfile';
import { MissionTimeline } from './components/MissionTimeline';
import { ResultsPanel } from './components/ResultsPanel';
import { ChartsPanel } from './components/ChartsPanel';

export default function PowerSystemCalculator() {
  const { sendCalculationEvent, updateToolContext } = useToolContext();
  const { toast } = useToast();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  
  // Battery state
  const [pack, setPack] = useState<BatteryPack>(() => {
    const chemistry = getBatteryChemistry('lipo');
    if (!chemistry) throw new Error('Default battery chemistry not found');
    return {
      chemistry,
      capacity_mAh: 5000,
      S_count: 4,
      P_count: 1,
      cycles: 0,
      temperature: 25,
    };
  });
  
  // Solar state
  const [solarConfig, setSolarConfig] = useState<SolarConfig>({
    area_m2: 0.5,
    efficiency: 0.22,
    mpptEfficiency: 0.95,
    tilt: 30,
    azimuth: 180, // South-facing
  });
  
  // Load state
  const [loads, setLoads] = useState<PowerLoad>({
    propulsion: 200,
    avionics: 10,
    servos: 5,
    cameras: 5,
    telemetry: 2,
  });
  
  // Mission state
  const [phases, setPhases] = useState<MissionPhase[]>([
    {
      name: 'Takeoff',
      startTime: 0,
      duration: 2,
      loadMultiplier: 2.0,
      solarAvailable: true,
      altitude: 0,
    },
    {
      name: 'Cruise',
      startTime: 2,
      duration: 60,
      loadMultiplier: 1.0,
      solarAvailable: true,
      altitude: 1000,
    },
  ]);
  
  // Location state
  const [location, setLocation] = useState({
    latitude: 40.0,
    longitude: -74.0,
    altitude: 0,
  });
  
  const [dayOfYear, setDayOfYear] = useState(180); // Mid-year (summer)
  
  // Results state
  const [result, setResult] = useState<MissionResult | null>(null);
  
  // Calculate mission
  const handleCalculate = useCallback(() => {
    try {
      // Validate inputs
      const validation = validatePowerSystemInputs({
        battery: {
          chemistryId: pack.chemistry.id,
          capacity_mAh: pack.capacity_mAh,
          S_count: pack.S_count,
          P_count: pack.P_count,
          cycles: pack.cycles,
          temperature: pack.temperature,
        },
        solar: solarConfig,
        loads,
        location,
        dayOfYear,
      });
      
      if (!validation.valid) {
        toast({
          title: 'Validation Error',
          description: validation.errors.join(', '),
          variant: 'destructive',
        });
        return;
      }
      
      // Show warnings
      if (validation.warnings.length > 0) {
        validation.warnings.forEach((warning) => {
          toast({
            title: 'Warning',
            description: warning,
            variant: 'default',
          });
        });
      }
      
      // Run simulation
      const missionResult = simulateMission(
        pack,
        solarConfig,
        loads,
        phases,
        location,
        dayOfYear,
        1 // 1 minute time steps
      );
      
      setResult(missionResult);
      
      // Build AI payload
      const requestId = `power-${Date.now()}`;
      setLastRequestId(requestId);
      const payload = buildPowerSystemPayload(
        pack,
        solarConfig,
        loads,
        location,
        dayOfYear,
        missionResult,
        requestId
      );
      
      // Update tool context
      updateToolContext({
        toolName: 'Battery & Solar Power System',
        lastCalculation: payload,
      });
      
      // Send calculation event
      sendCalculationEvent({
        type: 'calculation',
        toolName: 'Battery & Solar Power System',
        requestId,
        payload,
      });
      
      toast({
        title: 'Simulation Complete',
        description: `Endurance: ${(missionResult.endurance_min / 60).toFixed(1)} hours`,
      });
    } catch (error) {
      console.error('Power system calculation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Calculation Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [pack, solarConfig, loads, phases, location, dayOfYear, toast, sendCalculationEvent, updateToolContext]);
  
  return (
    <ToolWrapper>
      <ToolHeader
        title="Battery & Solar Power System"
        description="Ultra-high-fidelity energy modeling for UAVs, aircraft, rockets, and CubeSats"
        icon={Battery}
      />
      
      <Tabs defaultValue="battery" className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-slate-800/50">
          <TabsTrigger value="battery">Battery</TabsTrigger>
          <TabsTrigger value="solar">Solar</TabsTrigger>
          <TabsTrigger value="loads">Loads</TabsTrigger>
          <TabsTrigger value="mission">Mission</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="battery">
          <ToolSection>
            <BatteryPackForm pack={pack} onPackChange={setPack} />
          </ToolSection>
        </TabsContent>
        
        <TabsContent value="solar">
          <ToolSection>
            <SolarConfigComponent config={solarConfig} onConfigChange={setSolarConfig} />
          </ToolSection>
        </TabsContent>
        
        <TabsContent value="loads">
          <ToolSection>
            <LoadProfile loads={loads} onLoadsChange={setLoads} />
          </ToolSection>
        </TabsContent>
        
        <TabsContent value="mission">
          <ToolSection>
            <MissionTimeline phases={phases} onPhasesChange={setPhases} />
          </ToolSection>
        </TabsContent>
        
        <TabsContent value="environment">
          <ToolSection>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Latitude (°)</label>
                  <input
                    type="number"
                    value={location.latitude}
                    onChange={(e) => setLocation({ ...location, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                    min="-90"
                    max="90"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Longitude (°)</label>
                  <input
                    type="number"
                    value={location.longitude}
                    onChange={(e) => setLocation({ ...location, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                    min="-180"
                    max="180"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Altitude (m)</label>
                  <input
                    type="number"
                    value={location.altitude}
                    onChange={(e) => setLocation({ ...location, altitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                    min="0"
                    step="100"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Day of Year (1-365)</label>
                <input
                  type="number"
                  value={dayOfYear}
                  onChange={(e) => setDayOfYear(Math.max(1, Math.min(365, parseInt(e.target.value) || 180)))}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                  min="1"
                  max="365"
                  step="1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Day 1 = Jan 1, Day 180 = June 29 (summer), Day 365 = Dec 31
                </p>
              </div>
            </div>
          </ToolSection>
        </TabsContent>
        
        <TabsContent value="results">
          <ToolSection>
            <ResultsPanel result={result} />
          </ToolSection>
          
          {result && (
            <ToolSection>
              <ChartsPanel result={result} />
            </ToolSection>
          )}
        </TabsContent>
      </Tabs>
      
      <ToolActions>
        <AeroButton onClick={handleCalculate} icon={Calculator}>
          Run Simulation
        </AeroButton>
        {result && (
          <>
            <AskAIButton requestId={lastRequestId || undefined} />
            <PDFExportButton toolName="Battery & Solar Power System" requestId={lastRequestId || undefined} />
          </>
        )}
      </ToolActions>
    </ToolWrapper>
  );
}
