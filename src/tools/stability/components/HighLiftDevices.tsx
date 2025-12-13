"use client";

/**
 * High-Lift Devices Panel
 * 
 * Configure flaps, slats, and spoilers
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { HighLiftDevice } from '../utils/highLiftEffects';
import { HIGH_LIFT_PRESETS } from '../data/highLiftData';

interface HighLiftDevicesPanelProps {
  devices: HighLiftDevice[];
  onDevicesChange: (devices: HighLiftDevice[]) => void;
  onPresetLoad: (preset: HighLiftDevice[]) => void;
}

export function HighLiftDevicesPanel({
  devices,
  onDevicesChange,
  onPresetLoad,
}: HighLiftDevicesPanelProps) {
  const addDevice = () => {
    onDevicesChange([
      ...devices,
      {
        type: 'plain-flap',
        deflection: 20,
        span_fraction: 0.6,
        chord_fraction: 0.25,
        position: 'trailing-edge',
      },
    ]);
  };

  const removeDevice = (index: number) => {
    onDevicesChange(devices.filter((_, i) => i !== index));
  };

  const updateDevice = (index: number, updates: Partial<HighLiftDevice>) => {
    const updated = [...devices];
    updated[index] = { ...updated[index], ...updates };
    onDevicesChange(updated);
  };

  return (
    <AeroCard title="High-Lift Devices">
      <div className="space-y-4">
        <AeroFormField label="Load Preset">
          <Select onValueChange={(value) => {
            const preset = HIGH_LIFT_PRESETS[value];
            if (preset) {
              onPresetLoad(preset);
            }
          }}>
            <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
              <SelectValue placeholder="Select preset..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(HIGH_LIFT_PRESETS).map(([id, preset]) => (
                <SelectItem key={id} value={id}>
                  {id === 'none' ? 'None' : `${id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ')}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AeroFormField>

        {devices.map((device, index) => (
          <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">Device {index + 1}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeDevice(index)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AeroFormField label="Type">
                <Select
                  value={device.type}
                  onValueChange={(value: string) => updateDevice(index, { type: value as 'fowler-flap' | 'plain-flap' | 'slat' | 'slotted-flap' | 'spoiler' })}
                >
                  <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plain-flap">Plain Flap</SelectItem>
                    <SelectItem value="slotted-flap">Slotted Flap</SelectItem>
                    <SelectItem value="fowler-flap">Fowler Flap</SelectItem>
                    <SelectItem value="slat">Slat</SelectItem>
                    <SelectItem value="spoiler">Spoiler</SelectItem>
                  </SelectContent>
                </Select>
              </AeroFormField>

              <AeroFormField label="Deflection" helperText="degrees">
                <Input
                  type="number"
                  value={device.deflection}
                  onChange={(e) => updateDevice(index, { deflection: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-700/50 border-cyan-400/30 text-white"
                  min="0"
                  max="60"
                  step="1"
                />
              </AeroFormField>

              <AeroFormField label="Span Fraction" helperText="0-1">
                <Input
                  type="number"
                  value={device.span_fraction}
                  onChange={(e) => updateDevice(index, { span_fraction: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-700/50 border-cyan-400/30 text-white"
                  min="0"
                  max="1"
                  step="0.01"
                />
              </AeroFormField>

              <AeroFormField label="Chord Fraction" helperText="0-1">
                <Input
                  type="number"
                  value={device.chord_fraction}
                  onChange={(e) => updateDevice(index, { chord_fraction: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-700/50 border-cyan-400/30 text-white"
                  min="0"
                  max="1"
                  step="0.01"
                />
              </AeroFormField>

              <AeroFormField label="Position">
                <Select
                  value={device.position}
                  onValueChange={(value: string) => updateDevice(index, { position: value as 'leading-edge' | 'trailing-edge' })}
                >
                  <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leading-edge">Leading Edge</SelectItem>
                    <SelectItem value="trailing-edge">Trailing Edge</SelectItem>
                  </SelectContent>
                </Select>
              </AeroFormField>
            </div>
          </div>
        ))}

        <Button
          onClick={addDevice}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </Button>
      </div>
    </AeroCard>
  );
}

