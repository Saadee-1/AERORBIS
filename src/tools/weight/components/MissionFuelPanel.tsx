/**
 * Mission Fuel Panel
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Fuel } from 'lucide-react';
import { MissionProfile, createStandardMissionProfile } from '../utils/iteration';

interface MissionFuelPanelProps {
  profile: MissionProfile;
  onProfileChange: (profile: MissionProfile) => void;
}

export function MissionFuelPanel({ profile, onProfileChange }: MissionFuelPanelProps) {
  const handleNumberChange = (field: string, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value) || 0;
    
    if (field === 'range') {
      const newProfile = createStandardMissionProfile({
        range: numValue,
        loiterTime: profile.phases.find(p => p.name === 'Loiter') ? 
          (1 - profile.phases.find(p => p.name === 'Loiter')!.weightFraction) / 0.015 : 0,
        includeAlternate: profile.alternate,
        reserve: profile.reserve,
      });
      onProfileChange(newProfile);
    } else if (field === 'loiterTime') {
      const newProfile = createStandardMissionProfile({
        range: 1000, // Default
        loiterTime: numValue,
        includeAlternate: profile.alternate,
        reserve: profile.reserve,
      });
      onProfileChange(newProfile);
    } else if (field === 'reserve') {
      onProfileChange({
        ...profile,
        reserve: numValue / 100, // Convert percentage to fraction
      });
    }
  };

  return (
    <AeroCard title="Mission Fuel Profile" icon={Fuel}>
      <div className="space-y-4">
        <AeroFormField label="Cruise Range" helperText="km" htmlFor="range">
          <Input
            id="range"
            type="number"
            value={1000} // Default, will be calculated from profile
            onChange={(e) => handleNumberChange('range', e.target.value)}
            className="bg-muted/50 border-primary/30 text-foreground"
            min="0"
            step="100"
          />
        </AeroFormField>

        <AeroFormField label="Loiter Time" helperText="hours" htmlFor="loiterTime">
          <Input
            id="loiterTime"
            type="number"
            value={profile.phases.find(p => p.name === 'Loiter') ? 
              ((1 - profile.phases.find(p => p.name === 'Loiter')!.weightFraction) / 0.015).toFixed(1) : '0'}
            onChange={(e) => handleNumberChange('loiterTime', e.target.value)}
            className="bg-muted/50 border-primary/30 text-foreground"
            min="0"
            step="0.5"
          />
        </AeroFormField>

        <AeroFormField label="Reserve Fuel" helperText="%" htmlFor="reserve">
          <Input
            id="reserve"
            type="number"
            value={(profile.reserve || 0) * 100}
            onChange={(e) => handleNumberChange('reserve', e.target.value)}
            className="bg-slate-700/50 border-cyan-400/30 text-white"
            min="0"
            max="20"
            step="1"
          />
        </AeroFormField>

        <div className="flex items-center justify-between pt-2">
          <Label htmlFor="includeAlternate" className="text-gray-300">
            Include Alternate Airport Fuel
          </Label>
          <Switch
            id="includeAlternate"
            checked={profile.alternate ?? true}
            onCheckedChange={(checked) => onProfileChange({ ...profile, alternate: checked })}
          />
        </div>

        <div className="border-t border-cyan-400/20 pt-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">Mission Phases</h3>
          <div className="space-y-2">
            {profile.phases.map((phase, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                <span className="text-sm text-gray-300">{phase.name}</span>
                <span className="text-sm text-cyan-400">
                  {(1 - phase.weightFraction) * 100}% fuel used
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
