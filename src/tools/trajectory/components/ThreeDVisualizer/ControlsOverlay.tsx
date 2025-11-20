/**
 * Controls Overlay Component
 * Settings panel with toggles
 */

import { Settings, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VisualizerSettings } from './useVisualizerState';

interface ControlsOverlayProps {
  settings: VisualizerSettings;
  onUpdateSetting: <K extends keyof VisualizerSettings>(
    key: K,
    value: VisualizerSettings[K]
  ) => void;
  onScreenshot: () => void;
}

export function ControlsOverlay({
  settings,
  onUpdateSetting,
  onScreenshot,
}: ControlsOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button
        className="absolute top-4 right-4 bg-slate-900/90 border border-cyan-400/30 text-cyan-400"
        onClick={() => setIsOpen(true)}
      >
        <Settings className="w-4 h-4 mr-2" />
        Settings
      </Button>
    );
  }

  return (
    <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-lg border border-cyan-400/30 rounded-lg p-4 w-80 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-cyan-400">Visualizer Settings</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Earth & Atmosphere */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Earth & Atmosphere</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Show Earth</Label>
              <Switch
                checked={settings.showEarth}
                onCheckedChange={(checked) => onUpdateSetting('showEarth', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Show Atmosphere</Label>
              <Switch
                checked={settings.showAtmosphere}
                onCheckedChange={(checked) => onUpdateSetting('showAtmosphere', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Show Clouds</Label>
              <Switch
                checked={settings.showClouds}
                onCheckedChange={(checked) => onUpdateSetting('showClouds', checked)}
              />
            </div>
          </div>
        </div>

        {/* Visualization */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Visualization</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Show Trajectory</Label>
              <Switch
                checked={settings.showTrajectory}
                onCheckedChange={(checked) => onUpdateSetting('showTrajectory', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Show Markers</Label>
              <Switch
                checked={settings.showMarkers}
                onCheckedChange={(checked) => onUpdateSetting('showMarkers', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Show Staging</Label>
              <Switch
                checked={settings.showStaging}
                onCheckedChange={(checked) => onUpdateSetting('showStaging', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Show Exhaust</Label>
              <Switch
                checked={settings.showExhaust}
                onCheckedChange={(checked) => onUpdateSetting('showExhaust', checked)}
              />
            </div>
          </div>
        </div>

        {/* Effects */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Effects</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Bloom</Label>
              <Switch
                checked={settings.showBloom}
                onCheckedChange={(checked) => onUpdateSetting('showBloom', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Depth of Field</Label>
              <Switch
                checked={settings.showDOF}
                onCheckedChange={(checked) => onUpdateSetting('showDOF', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Motion Blur</Label>
              <Switch
                checked={settings.showMotionBlur}
                onCheckedChange={(checked) => onUpdateSetting('showMotionBlur', checked)}
              />
            </div>
          </div>
        </div>

        {/* Camera */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Camera</h4>
          <Select
            value={settings.cameraMode}
            onValueChange={(value: VisualizerSettings['cameraMode']) =>
              onUpdateSetting('cameraMode', value)
            }
          >
            <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="follow">Follow</SelectItem>
              <SelectItem value="chase">Chase</SelectItem>
              <SelectItem value="ground">Ground</SelectItem>
              <SelectItem value="orbital">Orbital</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="cinematic">Cinematic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Performance */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Performance</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Simple Mode</Label>
              <Switch
                checked={settings.simpleMode}
                onCheckedChange={(checked) => onUpdateSetting('simpleMode', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Low Power Mode</Label>
              <Switch
                checked={settings.lowPowerMode}
                onCheckedChange={(checked) => onUpdateSetting('lowPowerMode', checked)}
              />
            </div>
          </div>
        </div>

        {/* Export */}
        <div>
          <Button
            onClick={onScreenshot}
            className="w-full bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30"
            size="sm"
          >
            Screenshot
          </Button>
        </div>
      </div>
    </div>
  );
}
