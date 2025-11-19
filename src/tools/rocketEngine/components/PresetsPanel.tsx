/**
 * Presets Panel for Rocket Engine Calculator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import { PROPELLANT_PRESETS, ENGINE_PRESETS, PropellantPreset, EnginePreset } from '../data/propellantPresets';
import { RocketEngineInputs } from '../utils/calcEngine';
import { R_UNIVERSAL } from '../utils/constants';

interface PresetsPanelProps {
  selectedPropellantId: string;
  selectedEngineId: string;
  onPropellantChange: (id: string) => void;
  onEngineChange: (id: string) => void;
  onLoadPropellant: (preset: PropellantPreset) => void;
  onLoadEngine: (preset: EnginePreset) => void;
}

export function PresetsPanel({
  selectedPropellantId,
  selectedEngineId,
  onPropellantChange,
  onEngineChange,
  onLoadPropellant,
  onLoadEngine,
}: PresetsPanelProps) {
  const selectedPropellant = PROPELLANT_PRESETS[selectedPropellantId];
  const selectedEngine = ENGINE_PRESETS[selectedEngineId];

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <AeroCard title="Propellant Presets" icon={Database}>
        <div className="space-y-4">
          <AeroFormField label="Select Propellant">
            <Select value={selectedPropellantId} onValueChange={onPropellantChange}>
              <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PROPELLANT_PRESETS).map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name} ({preset.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AeroFormField>

          {selectedPropellant && (
            <div className="p-4 bg-slate-700/30 rounded-lg border border-cyan-400/20">
              <p className="text-sm text-gray-300 mb-2">{selectedPropellant.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
                <div>γ: {selectedPropellant.gamma.toFixed(3)}</div>
                <div>M: {selectedPropellant.M_molar.toFixed(1)} kg/kmol</div>
                <div>Pc: {(selectedPropellant.Pc_typical / 1e5).toFixed(0)} bar</div>
                <div>Tc: {selectedPropellant.Tc_typical.toFixed(0)} K</div>
              </div>
              {selectedPropellant.notes && (
                <p className="text-xs text-cyan-400 mb-3">{selectedPropellant.notes}</p>
              )}
              <Button
                onClick={() => onLoadPropellant(selectedPropellant)}
                className="w-full"
                variant="outline"
                size="sm"
              >
                Load Propellant
              </Button>
            </div>
          )}
        </div>
      </AeroCard>

      <AeroCard title="Engine Presets" icon={Database}>
        <div className="space-y-4">
          <AeroFormField label="Select Engine">
            <Select value={selectedEngineId} onValueChange={onEngineChange}>
              <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ENGINE_PRESETS).map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AeroFormField>

          {selectedEngine && (
            <div className="p-4 bg-slate-700/30 rounded-lg border border-cyan-400/20">
              <p className="text-sm text-gray-300 mb-2">{selectedEngine.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
                <div>Pc: {(selectedEngine.Pc / 1e5).toFixed(1)} bar</div>
                <div>Tc: {selectedEngine.Tc.toFixed(0)} K</div>
                <div>At: {(selectedEngine.At * 1e4).toFixed(1)} cm²</div>
                <div>ε: {selectedEngine.epsilon.toFixed(1)}</div>
              </div>
              {selectedEngine.notes && (
                <p className="text-xs text-cyan-400 mb-3">{selectedEngine.notes}</p>
              )}
              <Button
                onClick={() => onLoadEngine(selectedEngine)}
                className="w-full"
                variant="outline"
                size="sm"
              >
                Load Engine
              </Button>
            </div>
          )}
        </div>
      </AeroCard>
    </div>
  );
}

