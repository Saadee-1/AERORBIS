/**
 * Flight Conditions Panel
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Gauge } from 'lucide-react';
import { WeightEstimationInputs } from '../utils/weightEngine';

interface FlightConditionsPanelProps {
  inputs: WeightEstimationInputs;
  onInputChange: (path: string[], value: any) => void;
}

export function FlightConditionsPanel({ inputs, onInputChange }: FlightConditionsPanelProps) {
  const handleNumberChange = (path: string[], value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    onInputChange(path, numValue);
  };

  return (
    <AeroCard title="Flight Conditions" icon={Gauge}>
      <div className="space-y-4">
        <AeroFormField label="Dynamic Pressure (q)" helperText="Pa" htmlFor="q">
          <Input
            id="q"
            type="number"
            value={inputs.flight.q || ''}
            onChange={(e) => handleNumberChange(['flight', 'q'], e.target.value)}
            className="bg-slate-700/50 border-cyan-400/30 text-white"
            min="0"
            step="100"
          />
        </AeroFormField>

        <AeroFormField label="Ultimate Load Factor (N_ult)" helperText="" htmlFor="N_ult">
          <Input
            id="N_ult"
            type="number"
            value={inputs.flight.N_ult || ''}
            onChange={(e) => handleNumberChange(['flight', 'N_ult'], e.target.value)}
            className="bg-slate-700/50 border-cyan-400/30 text-white"
            min="1"
            step="0.1"
          />
        </AeroFormField>

        <div className="flex items-center justify-between pt-2">
          <Label htmlFor="hasThrustRelief" className="text-gray-300">
            Thrust Relief (reduces wing bending)
          </Label>
          <Switch
            id="hasThrustRelief"
            checked={inputs.flight.hasThrustRelief ?? false}
            onCheckedChange={(checked) => onInputChange(['flight', 'hasThrustRelief'], checked)}
          />
        </div>
      </div>
    </AeroCard>
  );
}
