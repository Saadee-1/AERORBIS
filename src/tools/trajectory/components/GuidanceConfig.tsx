/**
 * Guidance Configuration Panel
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Navigation } from 'lucide-react';
import { GuidanceProfile } from '../utils/solver/run2d';
import { Guidance3D } from '../utils/solver/run3d';

interface GuidanceConfigProps {
  mode: '1D' | '2D' | '3D';
  guidance2D?: GuidanceProfile;
  guidance3D?: Guidance3D;
  onGuidance2DChange?: (guidance: GuidanceProfile) => void;
  onGuidance3DChange?: (guidance: Guidance3D) => void;
}

export function GuidanceConfig({ 
  mode, 
  guidance2D, 
  guidance3D, 
  onGuidance2DChange,
  onGuidance3DChange 
}: GuidanceConfigProps) {
  if (mode === '1D') {
    return (
      <AeroCard title="Guidance" icon={Navigation}>
        <div className="p-3 bg-slate-800/30 rounded border border-cyan-400/20">
          <p className="text-sm text-gray-400">
            1D mode: Vertical ascent only. No guidance required.
          </p>
        </div>
      </AeroCard>
    );
  }

  if (mode === '2D' && guidance2D && onGuidance2DChange) {
    return (
      <AeroCard title="2D Guidance Profile" icon={Navigation}>
        <div className="space-y-4">
          <AeroFormField label="Guidance Type" helperText="" htmlFor="guidance-type">
            <Select
              value={guidance2D.type}
              onValueChange={(value: string) => onGuidance2DChange({ ...guidance2D, type: value as 'manual' | 'gravity_turn' | 'constant_pitch_rate' | 'orbital_insertion' })}
            >
              <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Pitch Program</SelectItem>
                <SelectItem value="gravity_turn">Gravity Turn</SelectItem>
                <SelectItem value="constant_pitch_rate">Constant Pitch Rate</SelectItem>
                <SelectItem value="orbital_insertion">Orbital Insertion</SelectItem>
              </SelectContent>
            </Select>
          </AeroFormField>

          {guidance2D.type === 'gravity_turn' && (
            <AeroFormField label="Initial Pitch" helperText="degrees" htmlFor="initial-pitch">
              <Input
                id="initial-pitch"
                type="number"
                value={guidance2D.initialPitch || 90}
                onChange={(e) => onGuidance2DChange({ 
                  ...guidance2D, 
                  initialPitch: parseFloat(e.target.value) || 90 
                })}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                min="0"
                max="90"
                step="1"
              />
            </AeroFormField>
          )}

          {guidance2D.type === 'constant_pitch_rate' && (
            <>
              <AeroFormField label="Initial Pitch" helperText="degrees" htmlFor="initial-pitch">
                <Input
                  id="initial-pitch"
                  type="number"
                  value={guidance2D.initialPitch || 90}
                  onChange={(e) => onGuidance2DChange({ 
                    ...guidance2D, 
                    initialPitch: parseFloat(e.target.value) || 90 
                  })}
                  className="bg-slate-700/50 border-cyan-400/30 text-white"
                  min="0"
                  max="90"
                  step="1"
                />
              </AeroFormField>
              <AeroFormField label="Pitch Rate" helperText="deg/s" htmlFor="pitch-rate">
                <Input
                  id="pitch-rate"
                  type="number"
                  value={guidance2D.pitchRate || 1}
                  onChange={(e) => onGuidance2DChange({ 
                    ...guidance2D, 
                    pitchRate: parseFloat(e.target.value) || 1 
                  })}
                  className="bg-slate-700/50 border-cyan-400/30 text-white"
                  min="0"
                  max="10"
                  step="0.1"
                />
              </AeroFormField>
            </>
          )}

          {guidance2D.type === 'orbital_insertion' && (
            <AeroFormField label="Target Altitude" helperText="m" htmlFor="target-altitude">
              <Input
                id="target-altitude"
                type="number"
                value={guidance2D.targetAltitude || 200000}
                onChange={(e) => onGuidance2DChange({ 
                  ...guidance2D, 
                  targetAltitude: parseFloat(e.target.value) || 200000 
                })}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                min="0"
                step="1000"
              />
            </AeroFormField>
          )}

          <div className="p-3 bg-slate-800/30 rounded border border-cyan-400/20">
            <p className="text-xs text-gray-400">
              {guidance2D.type === 'gravity_turn' && 'Pitch automatically follows flight path angle'}
              {guidance2D.type === 'constant_pitch_rate' && 'Pitch decreases at constant rate'}
              {guidance2D.type === 'orbital_insertion' && 'Pitch program optimized for orbital insertion'}
              {guidance2D.type === 'manual' && 'Use pitch table for custom program'}
            </p>
          </div>
        </div>
      </AeroCard>
    );
  }

  if (mode === '3D' && guidance3D && onGuidance3DChange) {
    return (
      <AeroCard title="3D Guidance Profile" icon={Navigation}>
        <div className="space-y-4">
          <div className="p-3 bg-slate-800/30 rounded border border-cyan-400/20">
            <p className="text-sm text-gray-400">
              3D mode: Configure pitch, yaw, and roll programs. Attitude controlled via quaternion.
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Advanced 3D guidance configuration coming soon. Currently uses default attitude control.
          </p>
        </div>
      </AeroCard>
    );
  }

  return null;
}
