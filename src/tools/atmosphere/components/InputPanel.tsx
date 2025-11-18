/**
 * Input Panel for Standard Atmosphere Calculator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Mountain } from 'lucide-react';

interface InputPanelProps {
  altitude: string;
  onAltitudeChange: (value: string) => void;
  velocity: string;
  onVelocityChange: (value: string) => void;
  unitSystem: 'SI' | 'Imperial';
  onUnitSystemChange: (value: 'SI' | 'Imperial') => void;
  altitudeUnit: 'm' | 'ft' | 'km';
  velocityUnit: 'm/s' | 'ft/s' | 'km/h' | 'knots';
}

export function InputPanel({
  altitude,
  onAltitudeChange,
  velocity,
  onVelocityChange,
  unitSystem,
  onUnitSystemChange,
  altitudeUnit,
  velocityUnit,
}: InputPanelProps) {
  return (
    <AeroCard
      title="Atmospheric Conditions"
      description="Enter geopotential altitude and optional velocity"
      icon={Mountain}
    >
      <div className="space-y-4">
        {/* Unit System Selector */}
        <AeroFormField label="Unit System">
          <RadioGroup
            value={unitSystem}
            onValueChange={(value) => onUnitSystemChange(value as 'SI' | 'Imperial')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="SI" id="unit-si" />
              <Label htmlFor="unit-si" className="cursor-pointer">SI (metric)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Imperial" id="unit-imp" />
              <Label htmlFor="unit-imp" className="cursor-pointer">Imperial</Label>
            </div>
          </RadioGroup>
        </AeroFormField>

        {/* Altitude Input */}
        <AeroFormField
          label={`Geopotential Altitude (${altitudeUnit === 'm' ? 'meters' : altitudeUnit === 'ft' ? 'feet' : 'kilometers'})`}
          helperText="Range: 0 to 86,000 m (0 to 86 km)"
          htmlFor="altitude"
        >
          <Input
            id="altitude"
            type="number"
            value={altitude}
            onChange={(e) => onAltitudeChange(e.target.value)}
            placeholder={unitSystem === 'SI' ? "0 - 86000" : "0 - 282000"}
            className="bg-slate-700/50 border-cyan-400/30 text-white"
          />
        </AeroFormField>

        {/* Velocity Input (Optional) */}
        <AeroFormField
          label={`Velocity (${velocityUnit}) - Optional`}
          helperText="For dynamic pressure calculation"
          htmlFor="velocity"
        >
          <Input
            id="velocity"
            type="number"
            value={velocity}
            onChange={(e) => onVelocityChange(e.target.value)}
            placeholder="0"
            className="bg-slate-700/50 border-cyan-400/30 text-white"
            min="0"
          />
        </AeroFormField>
      </div>
    </AeroCard>
  );
}

