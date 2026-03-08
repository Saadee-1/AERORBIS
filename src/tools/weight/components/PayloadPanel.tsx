/**
 * Payload Panel
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Package } from 'lucide-react';
import { WeightEstimationInputs } from '../utils/weightEngine';

interface PayloadPanelProps {
  inputs: WeightEstimationInputs;
  onInputChange: (path: string[], value: unknown) => void;
}

export function PayloadPanel({ inputs, onInputChange }: PayloadPanelProps) {
  const handleNumberChange = (path: string[], value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    onInputChange(path, numValue);
  };

  return (
    <AeroCard title="Payload" icon={Package}>
      <div className="space-y-4">
        <AeroFormField label="Payload Weight" helperText="N" htmlFor="W_payload">
          <Input
            id="W_payload"
            type="number"
            value={inputs.W_payload || ''}
            onChange={(e) => handleNumberChange(['W_payload'], e.target.value)}
            min="0"
            step="100"
          />
        </AeroFormField>

        <div className="p-3 bg-muted/30 rounded border border-border">
          <p className="text-xs text-muted-foreground">
            Payload includes cargo, passengers (beyond crew), weapons, sensors, or any mission-specific equipment.
          </p>
        </div>
      </div>
    </AeroCard>
  );
}
