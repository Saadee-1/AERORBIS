/**
 * Solar Panel Configuration Form
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SolarConfig } from '../utils/solarModel';
import { SOLAR_PRESETS, getSolarPreset } from '../data/solarPresets';

interface SolarConfigProps {
  config: SolarConfig;
  onConfigChange: (config: SolarConfig) => void;
}

export function SolarConfig({ config, onConfigChange }: SolarConfigProps) {
  const handlePresetChange = (presetId: string) => {
    const preset = getSolarPreset(presetId);
    if (preset) {
      onConfigChange({
        area_m2: preset.area,
        efficiency: preset.efficiency,
        mpptEfficiency: preset.mpptEfficiency,
        tilt: config.tilt,
        azimuth: config.azimuth,
      });
    }
  };
  
  const maxPower_W = config.area_m2 * config.efficiency * config.mpptEfficiency * 1361; // Solar constant
  
  return (
    <AeroCard title="Solar Panel Configuration">
      <div className="space-y-6">
        {/* Preset Selection */}
        <AeroFormField label="Solar Panel Preset">
          <Select onValueChange={handlePresetChange}>
            <SelectTrigger className="bg-slate-700/50 border-cyan-400/30">
              <SelectValue placeholder="Select preset or configure manually" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(SOLAR_PRESETS).map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AeroFormField>
        
        {/* Panel Parameters */}
        <div className="grid grid-cols-2 gap-4">
          <AeroFormField label="Panel Area (m²)">
            <input
              type="number"
              value={config.area_m2}
              onChange={(e) => onConfigChange({ ...config, area_m2: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
              min="0"
              step="0.1"
            />
          </AeroFormField>
          
          <AeroFormField label="Panel Efficiency (%)">
            <input
              type="number"
              value={config.efficiency * 100}
              onChange={(e) => onConfigChange({ ...config, efficiency: (parseFloat(e.target.value) || 0) / 100 })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
              min="0"
              max="100"
              step="0.1"
            />
          </AeroFormField>
          
          <AeroFormField label="MPPT Efficiency (%)">
            <input
              type="number"
              value={config.mpptEfficiency * 100}
              onChange={(e) => onConfigChange({ ...config, mpptEfficiency: (parseFloat(e.target.value) || 0) / 100 })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
              min="0"
              max="100"
              step="0.1"
            />
          </AeroFormField>
        </div>
        
        {/* Panel Orientation */}
        <div className="grid grid-cols-2 gap-4">
          <AeroFormField label="Panel Tilt (degrees)">
            <input
              type="number"
              value={config.tilt}
              onChange={(e) => onConfigChange({ ...config, tilt: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
              min="0"
              max="90"
              step="1"
            />
            <p className="text-xs text-gray-400 mt-1">0° = horizontal, 90° = vertical</p>
          </AeroFormField>
          
          <AeroFormField label="Panel Azimuth (degrees)">
            <input
              type="number"
              value={config.azimuth}
              onChange={(e) => onConfigChange({ ...config, azimuth: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
              min="0"
              max="360"
              step="1"
            />
            <p className="text-xs text-gray-400 mt-1">0° = North, 90° = East, 180° = South, 270° = West</p>
          </AeroFormField>
        </div>
        
        {/* Summary */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Solar System Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">Max Power (ideal):</span>
              <span className="text-white ml-2">{maxPower_W.toFixed(1)} W</span>
            </div>
            <div>
              <span className="text-gray-400">Panel Area:</span>
              <span className="text-white ml-2">{config.area_m2.toFixed(2)} m²</span>
            </div>
            <div>
              <span className="text-gray-400">Efficiency:</span>
              <span className="text-white ml-2">{(config.efficiency * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-400">MPPT Efficiency:</span>
              <span className="text-white ml-2">{(config.mpptEfficiency * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
