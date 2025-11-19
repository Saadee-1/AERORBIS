"use client";

/**
 * Control Mixing Panel
 * 
 * Handles aileron differential, flaperons, spoilerons, and quadcopter motor mixing
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap } from 'lucide-react';
import { ControlMixing } from '../utils/controlMixing';
import { MIXING_PRESETS } from '../data/mixingMatrices';

interface ControlMixingPanelProps {
  mixingType: string;
  onMixingTypeChange: (type: string) => void;
  aileronDifferentialRatio?: number;
  onAileronDifferentialChange: (ratio: number) => void;
  flaperonMix?: number;
  onFlaperonMixChange: (mix: number) => void;
  spoileronMix?: number;
  onSpoileronMixChange: (mix: number) => void;
  motorMixingPreset?: string;
  onMotorMixingPresetChange: (preset: string) => void;
  mixingResults?: ControlMixing;
}

export function ControlMixingPanel({
  mixingType,
  onMixingTypeChange,
  aileronDifferentialRatio,
  onAileronDifferentialChange,
  flaperonMix,
  onFlaperonMixChange,
  spoileronMix,
  onSpoileronMixChange,
  motorMixingPreset,
  onMotorMixingPresetChange,
  mixingResults,
}: ControlMixingPanelProps) {
  return (
    <AeroCard title="Control Mixing" icon={Zap}>
      <div className="space-y-4">
        <AeroFormField label="Mixing Type">
          <Select value={mixingType} onValueChange={onMixingTypeChange}>
            <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="aileron-differential">Aileron Differential</SelectItem>
              <SelectItem value="flaperons">Flaperons</SelectItem>
              <SelectItem value="spoilerons">Spoilerons</SelectItem>
              <SelectItem value="elevator-aileron">Elevator-Aileron Mix</SelectItem>
              <SelectItem value="rudder-aileron">Rudder-Aileron Mix</SelectItem>
              <SelectItem value="quadcopter">Quadcopter Motor Mixing</SelectItem>
            </SelectContent>
          </Select>
        </AeroFormField>

        {/* Aileron Differential */}
        {mixingType === 'aileron-differential' && (
          <AeroFormField label="Differential Ratio" helperText="Up/down aileron ratio (0.5-0.7 typical)">
            <div className="space-y-2">
              <Slider
                value={[aileronDifferentialRatio || 0.6]}
                onValueChange={(value) => onAileronDifferentialChange(value[0])}
                min={0.3}
                max={1.0}
                step={0.05}
                className="w-full"
              />
              <p className="text-xs text-gray-400 text-center">
                {((aileronDifferentialRatio || 0.6) * 100).toFixed(0)}%
              </p>
            </div>
          </AeroFormField>
        )}

        {/* Flaperons */}
        {mixingType === 'flaperons' && (
          <AeroFormField label="Flaperon Mix" helperText="Mix ratio (0-1)">
            <div className="space-y-2">
              <Slider
                value={[flaperonMix || 0.5]}
                onValueChange={(value) => onFlaperonMixChange(value[0])}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-gray-400 text-center">
                {((flaperonMix || 0.5) * 100).toFixed(0)}%
              </p>
            </div>
          </AeroFormField>
        )}

        {/* Spoilerons */}
        {mixingType === 'spoilerons' && (
          <AeroFormField label="Spoileron Mix" helperText="Mix ratio (0-1)">
            <div className="space-y-2">
              <Slider
                value={[spoileronMix || 0.5]}
                onValueChange={(value) => onSpoileronMixChange(value[0])}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-gray-400 text-center">
                {((spoileronMix || 0.5) * 100).toFixed(0)}%
              </p>
            </div>
          </AeroFormField>
        )}

        {/* Quadcopter Motor Mixing */}
        {mixingType === 'quadcopter' && (
          <div className="space-y-4">
            <AeroFormField label="Motor Mixing Preset">
              <Select value={motorMixingPreset || 'quadcopter-x'} onValueChange={onMotorMixingPresetChange}>
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MIXING_PRESETS).map(([id, preset]) => (
                    <SelectItem key={id} value={id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AeroFormField>

            {mixingResults?.motor_mixing_matrix && (
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Motor Mixing Matrix</p>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="font-semibold">Motor</div>
                  <div className="font-semibold">Pitch</div>
                  <div className="font-semibold">Roll</div>
                  <div className="font-semibold">Yaw</div>
                  <div className="font-semibold">Thrust</div>
                  {mixingResults.motor_mixing_matrix.map((row, i) => (
                    <div key={i} className="contents">
                      <div className="text-gray-400">M{i + 1}</div>
                      {row.map((val, j) => (
                        <div key={j} className="text-white">
                          {val > 0 ? '+' : ''}{val.toFixed(1)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mixing Results */}
        {mixingResults && mixingResults.warnings.length > 0 && (
          <Alert className="bg-yellow-400/10 border-yellow-400/30">
            <AlertDescription className="text-yellow-400">
              {mixingResults.warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AeroCard>
  );
}

