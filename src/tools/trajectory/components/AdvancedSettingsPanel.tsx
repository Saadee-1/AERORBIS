/**
 * Advanced Settings Panel
 * UI toggles for all advanced simulation features
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Zap, Rocket, Target, Orbit } from 'lucide-react';

export interface AdvancedSettings {
  // Main Features
  enable2D: boolean;
  enable3D: boolean;
  enableAtmosphericDrag: boolean;
  enableHeating: boolean;
  enableTVC: boolean;

  // Performance
  performanceMode: 'fast' | 'accurate' | 'high-fidelity';
  downsampleOutput: boolean;

  // Physics Extensions
  enableKepler: boolean;
  enableJ2: boolean;
  enableAerobraking: boolean;

  // Mission Types
  enableMissileBallistic: boolean;
  enableGuidedMissile: boolean;
  enableOrbitalLaunch: boolean;

  // Engines
  engineSelectionMode: 'manual' | 'database';
}

interface AdvancedSettingsPanelProps {
  settings: AdvancedSettings;
  onSettingsChange: (settings: AdvancedSettings) => void;
}

export function AdvancedSettingsPanel({ settings, onSettingsChange }: AdvancedSettingsPanelProps) {
  const updateSetting = <K extends keyof AdvancedSettings>(
    key: K,
    value: AdvancedSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <AeroCard title="Advanced Simulation Modules" icon={Settings}>
      <div className="space-y-6">
        {/* Main Features */}
        <div>
          <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
            <Rocket className="w-5 h-5 mr-2" />
            Main Features
          </h3>
          <div className="space-y-3 pl-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-2d" className="text-sm text-gray-300">
                Enable 2D Gravity Turn
              </Label>
              <Switch
                id="enable-2d"
                checked={settings.enable2D}
                onCheckedChange={(checked) => updateSetting('enable2D', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-3d" className="text-sm text-gray-300">
                Enable 3D Flight Rotation
              </Label>
              <Switch
                id="enable-3d"
                checked={settings.enable3D}
                onCheckedChange={(checked) => updateSetting('enable3D', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-drag" className="text-sm text-gray-300">
                Enable Atmospheric Drag
              </Label>
              <Switch
                id="enable-drag"
                checked={settings.enableAtmosphericDrag}
                onCheckedChange={(checked) => updateSetting('enableAtmosphericDrag', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-heating" className="text-sm text-gray-300">
                Enable Heating
              </Label>
              <Switch
                id="enable-heating"
                checked={settings.enableHeating}
                onCheckedChange={(checked) => updateSetting('enableHeating', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-tvc" className="text-sm text-gray-300">
                Enable Thrust Vector Control
              </Label>
              <Switch
                id="enable-tvc"
                checked={settings.enableTVC}
                onCheckedChange={(checked) => updateSetting('enableTVC', checked)}
              />
            </div>
          </div>
        </div>

        {/* Performance */}
        <div>
          <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Performance
          </h3>
          <div className="space-y-3 pl-2">
            <AeroFormField label="Simulation Mode" helperText="" htmlFor="performance-mode">
              <Select
                value={settings.performanceMode}
                onValueChange={(value: 'fast' | 'accurate' | 'high-fidelity') =>
                  updateSetting('performanceMode', value)
                }
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast Mode (RK4 + no heating)</SelectItem>
                  <SelectItem value="accurate">Accurate Mode (RKF45 + heating + drag table)</SelectItem>
                  <SelectItem value="high-fidelity">High Fidelity Mode (RKF45 + J2 + full atmosphere + TVC)</SelectItem>
                </SelectContent>
              </Select>
            </AeroFormField>
            <div className="flex items-center justify-between">
              <Label htmlFor="downsample" className="text-sm text-gray-300">
                Downsample Output
              </Label>
              <Switch
                id="downsample"
                checked={settings.downsampleOutput}
                onCheckedChange={(checked) => updateSetting('downsampleOutput', checked)}
              />
            </div>
          </div>
        </div>

        {/* Physics Extensions */}
        <div>
          <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
            <Orbit className="w-5 h-5 mr-2" />
            Physics Extensions
          </h3>
          <div className="space-y-3 pl-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-kepler" className="text-sm text-gray-300">
                Enable Kepler Orbit Propagation
              </Label>
              <Switch
                id="enable-kepler"
                checked={settings.enableKepler}
                onCheckedChange={(checked) => updateSetting('enableKepler', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-j2" className="text-sm text-gray-300">
                Enable J2 Perturbation
              </Label>
              <Switch
                id="enable-j2"
                checked={settings.enableJ2}
                onCheckedChange={(checked) => updateSetting('enableJ2', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-aerobraking" className="text-sm text-gray-300">
                Enable Aerobraking
              </Label>
              <Switch
                id="enable-aerobraking"
                checked={settings.enableAerobraking}
                onCheckedChange={(checked) => updateSetting('enableAerobraking', checked)}
              />
            </div>
          </div>
        </div>

        {/* Mission Types */}
        <div>
          <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Mission Types
          </h3>
          <div className="space-y-3 pl-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-missile" className="text-sm text-gray-300">
                Enable Missile Ballistic Mode
              </Label>
              <Switch
                id="enable-missile"
                checked={settings.enableMissileBallistic}
                onCheckedChange={(checked) => updateSetting('enableMissileBallistic', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-guided" className="text-sm text-gray-300">
                Enable Guided Missile Mode
              </Label>
              <Switch
                id="enable-guided"
                checked={settings.enableGuidedMissile}
                onCheckedChange={(checked) => updateSetting('enableGuidedMissile', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-orbital" className="text-sm text-gray-300">
                Enable Orbital Launch Mode
              </Label>
              <Switch
                id="enable-orbital"
                checked={settings.enableOrbitalLaunch}
                onCheckedChange={(checked) => updateSetting('enableOrbitalLaunch', checked)}
              />
            </div>
          </div>
        </div>

        {/* Engines */}
        <div>
          <h3 className="text-lg font-semibold text-cyan-400 mb-3">Engines</h3>
          <div className="pl-2">
            <AeroFormField label="Engine Selection" helperText="" htmlFor="engine-mode">
              <Select
                value={settings.engineSelectionMode}
                onValueChange={(value: 'manual' | 'database') =>
                  updateSetting('engineSelectionMode', value)
                }
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Engine Entry</SelectItem>
                  <SelectItem value="database">Engine Database</SelectItem>
                </SelectContent>
              </Select>
            </AeroFormField>
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
