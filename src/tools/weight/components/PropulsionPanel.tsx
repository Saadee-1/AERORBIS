/**
 * Propulsion Input Panel
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Zap } from 'lucide-react';
import { WeightEstimationInputs } from '../utils/weightEngine';

interface PropulsionPanelProps {
  inputs: WeightEstimationInputs;
  // TODO: refine type for `onInputChange` — changed any -> unknown automatically by chore/typed-cleanup
  onInputChange: (path: string[], value: unknown) => void;
}

export function PropulsionPanel({ inputs, onInputChange }: PropulsionPanelProps) {
  const handleNumberChange = (path: string[], value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    onInputChange(path, numValue);
  };

  return (
    <AeroCard title="Propulsion" icon={Zap}>
      <div className="space-y-4">
        <AeroFormField label="Engine Type" helperText="" htmlFor="engineType">
          <Select
            value={inputs.propulsion.type}
            onValueChange={(value) => onInputChange(['propulsion', 'type'], value)}
          >
            <SelectTrigger className="bg-slate-700/50 border-primary/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="piston">Piston Engine</SelectItem>
              <SelectItem value="turbofan">Turbofan</SelectItem>
              <SelectItem value="turbojet">Turbojet</SelectItem>
              <SelectItem value="electric">Electric Motor</SelectItem>
            </SelectContent>
          </Select>
        </AeroFormField>

        <div className="grid grid-cols-2 gap-4">
          <AeroFormField 
            label={inputs.propulsion.type === 'electric' ? 'Power' : inputs.propulsion.type === 'piston' ? 'Power' : 'Thrust'} 
            helperText={inputs.propulsion.type === 'electric' ? 'W' : inputs.propulsion.type === 'piston' ? 'W' : 'N'} 
            htmlFor="power"
          >
            <Input
              id="power"
              type="number"
              value={inputs.propulsion.power || ''}
              onChange={(e) => handleNumberChange(['propulsion', 'power'], e.target.value)}
              className="bg-slate-700/50 border-primary/30 text-white"
              min="0"
              step="1000"
            />
          </AeroFormField>

          <AeroFormField label="Number of Engines" helperText="" htmlFor="n_engines">
            <Input
              id="n_engines"
              type="number"
              value={inputs.propulsion.n_engines || ''}
              onChange={(e) => handleNumberChange(['propulsion', 'n_engines'], e.target.value)}
              className="bg-slate-700/50 border-primary/30 text-white"
              min="1"
              step="1"
            />
          </AeroFormField>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="includeNacelle" className="text-gray-300">
              Include Nacelle Weight
            </Label>
            <Switch
              id="includeNacelle"
              checked={inputs.propulsion.includeNacelle ?? true}
              onCheckedChange={(checked) => onInputChange(['propulsion', 'includeNacelle'], checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="includePylon" className="text-gray-300">
              Include Pylon Weight
            </Label>
            <Switch
              id="includePylon"
              checked={inputs.propulsion.includePylon ?? true}
              onCheckedChange={(checked) => onInputChange(['propulsion', 'includePylon'], checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="includeMounts" className="text-gray-300">
              Include Engine Mounts
            </Label>
            <Switch
              id="includeMounts"
              checked={inputs.propulsion.includeMounts ?? true}
              onCheckedChange={(checked) => onInputChange(['propulsion', 'includeMounts'], checked)}
            />
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
