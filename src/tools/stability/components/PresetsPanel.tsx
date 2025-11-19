/**
 * Presets Panel for Stability Calculator
 * 
 * Allows selection of aircraft configuration presets
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Database, Plane } from 'lucide-react';
import { AIRCRAFT_PRESETS, AircraftPreset } from '../data/presets';

interface PresetsPanelProps {
  selectedPresetId: string;
  onPresetChange: (id: string) => void;
  onLoadPreset: (preset: AircraftPreset) => void;
}

export function PresetsPanel({
  selectedPresetId,
  onPresetChange,
  onLoadPreset,
}: PresetsPanelProps) {
  const selectedPreset = AIRCRAFT_PRESETS[selectedPresetId];

  return (
    <AeroCard title="Aircraft Presets" icon={Database}>
      <div className="space-y-4">
        <AeroFormField label="Select Aircraft Type">
          <Select value={selectedPresetId} onValueChange={onPresetChange}>
            <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(AIRCRAFT_PRESETS).map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AeroFormField>

        {selectedPreset && (
          <div className="p-4 bg-slate-700/30 rounded-lg border border-cyan-400/20">
            <p className="text-sm text-gray-300 mb-2">{selectedPreset.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
              <div>Category: {selectedPreset.category}</div>
              <div>S_w: {selectedPreset.S_w.toFixed(1)} m²</div>
              <div>AR: {selectedPreset.AR.toFixed(1)}</div>
              <div>V_H: {((selectedPreset.S_t * selectedPreset.l_t) / (selectedPreset.S_w * selectedPreset.c_bar)).toFixed(3)}</div>
            </div>
            {selectedPreset.notes && (
              <p className="text-xs text-cyan-400 mb-3">{selectedPreset.notes}</p>
            )}
            <Button
              onClick={() => onLoadPreset(selectedPreset)}
              className="w-full"
              variant="outline"
              size="sm"
            >
              <Plane className="w-4 h-4 mr-2" />
              Load Configuration
            </Button>
          </div>
        )}
      </div>
    </AeroCard>
  );
}
