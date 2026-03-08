/**
 * Power Load Profile Configuration
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PowerLoad } from '../utils/missionEngine';
import { LOAD_PRESETS, getLoadPreset } from '../data/loadPresets';

interface LoadProfileProps {
  loads: PowerLoad;
  onLoadsChange: (loads: PowerLoad) => void;
}

export function LoadProfile({ loads, onLoadsChange }: LoadProfileProps) {
  const handlePresetChange = (presetId: string) => {
    const preset = getLoadPreset(presetId);
    if (preset) {
      onLoadsChange(preset.loads);
    }
  };
  
  const totalLoad = Object.values(loads).reduce((sum, val) => sum + (val || 0), 0);
  
  return (
    <AeroCard title="Power Load Profile">
      <div className="space-y-6">
        {/* Preset Selection */}
        <AeroFormField label="Load Preset">
          <Select onValueChange={handlePresetChange}>
            <SelectTrigger className="bg-slate-700/50 border-primary/30">
              <SelectValue placeholder="Select preset or configure manually" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(LOAD_PRESETS).map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name} - {preset.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AeroFormField>
        
        {/* Flight Loads */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <h4 className="text-sm font-semibold text-primary mb-3">Flight Loads</h4>
          <div className="grid grid-cols-2 gap-4">
            <AeroFormField label="Propulsion (W)">
              <input
                type="number"
                value={loads.propulsion || 0}
                onChange={(e) => onLoadsChange({ ...loads, propulsion: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-primary/30 rounded text-white"
                min="0"
                step="10"
              />
            </AeroFormField>
            
            <AeroFormField label="Avionics (W)">
              <input
                type="number"
                value={loads.avionics || 0}
                onChange={(e) => onLoadsChange({ ...loads, avionics: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-primary/30 rounded text-white"
                min="0"
                step="1"
              />
            </AeroFormField>
            
            <AeroFormField label="Servos (W)">
              <input
                type="number"
                value={loads.servos || 0}
                onChange={(e) => onLoadsChange({ ...loads, servos: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-primary/30 rounded text-white"
                min="0"
                step="1"
              />
            </AeroFormField>
            
            <AeroFormField label="Cameras (W)">
              <input
                type="number"
                value={loads.cameras || 0}
                onChange={(e) => onLoadsChange({ ...loads, cameras: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-primary/30 rounded text-white"
                min="0"
                step="1"
              />
            </AeroFormField>
            
            <AeroFormField label="Telemetry (W)">
              <input
                type="number"
                value={loads.telemetry || 0}
                onChange={(e) => onLoadsChange({ ...loads, telemetry: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-primary/30 rounded text-white"
                min="0"
                step="0.5"
              />
            </AeroFormField>
            
            <AeroFormField label="Payload (W)">
              <input
                type="number"
                value={loads.payload || 0}
                onChange={(e) => onLoadsChange({ ...loads, payload: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-primary/30 rounded text-white"
                min="0"
                step="5"
              />
            </AeroFormField>
            
            <AeroFormField label="Thermal (W)">
              <input
                type="number"
                value={loads.thermal || 0}
                onChange={(e) => onLoadsChange({ ...loads, thermal: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-primary/30 rounded text-white"
                min="0"
                step="5"
              />
            </AeroFormField>
          </div>
        </div>
        
        {/* CubeSat Loads */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <h4 className="text-sm font-semibold text-primary mb-3">CubeSat Loads</h4>
          <div className="grid grid-cols-2 gap-4">
            <AeroFormField label="ADCS (W)">
              <input
                type="number"
                value={loads.adcs || 0}
                onChange={(e) => onLoadsChange({ ...loads, adcs: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-primary/30 rounded text-white"
                min="0"
                step="0.1"
              />
            </AeroFormField>
            
            <AeroFormField label="Transmitter (W)">
              <input
                type="number"
                value={loads.transmitter || 0}
                onChange={(e) => onLoadsChange({ ...loads, transmitter: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-primary/30 rounded text-white"
                min="0"
                step="0.5"
              />
            </AeroFormField>
            
            <AeroFormField label="OBC (W)">
              <input
                type="number"
                value={loads.obc || 0}
                onChange={(e) => onLoadsChange({ ...loads, obc: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-primary/30 rounded text-white"
                min="0"
                step="0.1"
              />
            </AeroFormField>
          </div>
        </div>
        
        {/* Total Load Summary */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <h4 className="text-sm font-semibold text-primary mb-2">Total Load</h4>
          <div className="text-2xl font-bold text-white">
            {totalLoad.toFixed(1)} W
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
