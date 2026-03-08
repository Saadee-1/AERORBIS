/**
 * Presets Panel for Weight Estimator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database } from 'lucide-react';
import { AIRCRAFT_PRESETS, AircraftPreset } from '../data/presets';
import { WeightEstimationInputs } from '../utils/weightEngine';

interface PresetsPanelProps {
  inputs: WeightEstimationInputs;
  onLoadPreset: (preset: AircraftPreset) => void;
}

export function PresetsPanel({ inputs, onLoadPreset }: PresetsPanelProps) {
  const presets = Object.values(AIRCRAFT_PRESETS);
  const categories = Array.from(new Set(presets.map(p => p.category)));

  return (
    <AeroCard title="Aircraft Presets" icon={Database}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Load a preset configuration to quickly start with typical aircraft parameters.
          </p>
          <Select
            onValueChange={(value) => {
              const preset = AIRCRAFT_PRESETS[value];
              if (preset) onLoadPreset(preset);
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select a preset..." /></SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <div key={category}>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{category}</div>
                  {presets.filter(p => p.category === category).map(preset => (
                    <SelectItem key={preset.id} value={preset.id}>{preset.name}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {presets.map(preset => (
            <Button
              key={preset.id}
              variant="outline"
              onClick={() => onLoadPreset(preset)}
              className="justify-start text-left h-auto p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary">{preset.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </AeroCard>
  );
}
