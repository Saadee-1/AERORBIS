/**
 * Mission Timeline Configuration
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { MissionPhase } from '../data/missionPresets';
import { MISSION_PRESETS, getMissionPreset } from '../data/missionPresets';

interface MissionTimelineProps {
  phases: MissionPhase[];
  onPhasesChange: (phases: MissionPhase[]) => void;
}

export function MissionTimeline({ phases, onPhasesChange }: MissionTimelineProps) {
  const handlePresetChange = (presetId: string) => {
    const preset = getMissionPreset(presetId);
    if (preset) {
      onPhasesChange(preset.phases);
    }
  };
  
  const addPhase = () => {
    const lastPhase = phases[phases.length - 1];
    const startTime = lastPhase ? lastPhase.startTime + lastPhase.duration : 0;
    onPhasesChange([
      ...phases,
      {
        name: `Phase ${phases.length + 1}`,
        startTime,
        duration: 10,
        loadMultiplier: 1.0,
        solarAvailable: true,
        altitude: 0,
      },
    ]);
  };
  
  const removePhase = (index: number) => {
    onPhasesChange(phases.filter((_, i) => i !== index));
  };
  
  const updatePhase = (index: number, updates: Partial<MissionPhase>) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], ...updates };
    onPhasesChange(newPhases);
  };
  
  const totalDuration = phases.length > 0
    ? phases[phases.length - 1].startTime + phases[phases.length - 1].duration
    : 0;
  
  return (
    <AeroCard title="Mission Timeline">
      <div className="space-y-6">
        {/* Preset Selection */}
        <AeroFormField label="Mission Preset">
          <Select onValueChange={handlePresetChange}>
            <SelectTrigger className="bg-slate-700/50 border-cyan-400/30">
              <SelectValue placeholder="Select preset or configure manually" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(MISSION_PRESETS).map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name} - {preset.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AeroFormField>
        
        {/* Mission Phases */}
        <div className="space-y-4">
          {phases.map((phase, index) => (
            <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-cyan-400">Phase {index + 1}: {phase.name}</h4>
                {phases.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePhase(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <AeroFormField label="Phase Name">
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhase(index, { name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                  />
                </AeroFormField>
                
                <AeroFormField label="Start Time (min)">
                  <input
                    type="number"
                    value={phase.startTime}
                    onChange={(e) => updatePhase(index, { startTime: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                    min="0"
                    step="1"
                  />
                </AeroFormField>
                
                <AeroFormField label="Duration (min)">
                  <input
                    type="number"
                    value={phase.duration}
                    onChange={(e) => updatePhase(index, { duration: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                    min="0"
                    step="1"
                  />
                </AeroFormField>
                
                <AeroFormField label="Load Multiplier">
                  <input
                    type="number"
                    value={phase.loadMultiplier}
                    onChange={(e) => updatePhase(index, { loadMultiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-400 mt-1">1.0 = 100% of base load</p>
                </AeroFormField>
                
                <AeroFormField label="Altitude (m)">
                  <input
                    type="number"
                    value={phase.altitude || 0}
                    onChange={(e) => updatePhase(index, { altitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
                    min="0"
                    step="100"
                  />
                </AeroFormField>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={phase.solarAvailable}
                    onChange={(e) => updatePhase(index, { solarAvailable: e.target.checked })}
                    className="w-4 h-4 text-cyan-400 bg-slate-700 border-cyan-400/30 rounded"
                  />
                  <Label className="text-sm text-gray-300">Solar Available</Label>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Add Phase Button */}
        <Button
          onClick={addPhase}
          variant="outline"
          className="w-full border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Phase
        </Button>
        
        {/* Summary */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Mission Summary</h4>
          <div className="text-sm text-gray-300">
            <div>Total Duration: {totalDuration.toFixed(1)} minutes ({(totalDuration / 60).toFixed(2)} hours)</div>
            <div>Number of Phases: {phases.length}</div>
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
