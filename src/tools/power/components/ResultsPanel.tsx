/**
 * Results Panel for Power System
 */

import { AeroCard } from '@/components/common/AeroCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Battery, Sun, Zap } from 'lucide-react';
import { MissionResult } from '../utils/missionEngine';

interface ResultsPanelProps {
  result: MissionResult | null;
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  if (!result) {
    return (
      <AeroCard title="Results">
        <div className="text-center p-8 text-gray-400">
          <p>Run a simulation to see results</p>
        </div>
      </AeroCard>
    );
  }
  
  const endurance_hours = result.endurance_min / 60;
  const solarFraction_pct = result.solarFraction * 100;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AeroCard>
          <div className="p-4">
            <div className="flex items-center mb-2">
              <Battery className="w-5 h-5 text-primary mr-2" />
              <span className="text-xs text-gray-400">Endurance</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {endurance_hours.toFixed(1)} h
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {result.endurance_min.toFixed(0)} minutes
            </div>
          </div>
        </AeroCard>
        
        <AeroCard>
          <div className="p-4">
            <div className="flex items-center mb-2">
              <Sun className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-xs text-gray-400">Solar Fraction</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {solarFraction_pct.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {solarFraction_pct >= 100 ? 'Self-sustaining' : 'Battery required'}
            </div>
          </div>
        </AeroCard>
        
        <AeroCard>
          <div className="p-4">
            <div className="flex items-center mb-2">
              <Zap className="w-5 h-5 text-purple-400 mr-2" />
              <span className="text-xs text-gray-400">Min Power Margin</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {result.minPowerMargin_W.toFixed(1)} W
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {result.minPowerMargin_W >= 0 ? 'Surplus' : 'Deficit'}
            </div>
          </div>
        </AeroCard>
        
        <AeroCard>
          <div className="p-4">
            <div className="flex items-center mb-2">
              <Battery className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-xs text-gray-400">Voltage Range</span>
            </div>
            <div className="text-lg font-bold text-white">
              {result.minVoltage.toFixed(1)} - {result.maxVoltage.toFixed(1)} V
            </div>
          </div>
        </AeroCard>
      </div>
      
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((warning, i) => (
            <Alert key={i} className="bg-yellow-400/10 border-yellow-400/30">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-400">{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}
      
      {/* Success Message */}
      {result.warnings.length === 0 && result.endurance_min > 0 && (
        <Alert className="bg-green-400/10 border-green-400/30">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            Mission simulation completed successfully
          </AlertDescription>
        </Alert>
      )}
      
      {/* Mission Statistics */}
      <AeroCard title="Mission Statistics">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Duration:</span>
            <span className="text-white ml-2">{(result.totalDuration_min / 60).toFixed(2)} hours</span>
          </div>
          <div>
            <span className="text-gray-400">Endurance:</span>
            <span className="text-white ml-2">{endurance_hours.toFixed(2)} hours</span>
          </div>
          <div>
            <span className="text-gray-400">Solar Coverage:</span>
            <span className="text-white ml-2">{solarFraction_pct.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-gray-400">Power Margin:</span>
            <span className="text-white ml-2">{result.minPowerMargin_W.toFixed(1)} W</span>
          </div>
        </div>
      </AeroCard>
    </div>
  );
}
