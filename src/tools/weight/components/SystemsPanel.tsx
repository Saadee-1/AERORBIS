/**
 * Systems & Avionics Panel
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings } from 'lucide-react';
import { WeightEstimationInputs } from '../utils/weightEngine';

interface SystemsPanelProps {
  inputs: WeightEstimationInputs;
  // TODO: refine type for `onInputChange` — changed any -> unknown automatically by chore/typed-cleanup
  onInputChange: (path: string[], value: unknown) => void;
}

export function SystemsPanel({ inputs, onInputChange }: SystemsPanelProps) {
  const handleNumberChange = (path: string[], value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    onInputChange(path, numValue);
  };

  return (
    <AeroCard title="Systems & Avionics" icon={Settings}>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3">Crew & Basic</h3>
          <AeroFormField label="Crew Weight" helperText="N" htmlFor="W_crew">
            <Input
              id="W_crew"
              type="number"
              value={inputs.systems.W_crew || ''}
              onChange={(e) => handleNumberChange(['systems', 'W_crew'], e.target.value)}
              className="bg-slate-700/50 border-primary/30 text-white"
              min="0"
              step="100"
            />
          </AeroFormField>
        </div>

        <div className="border-t border-primary/20 pt-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Avionics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="autopilot" className="text-gray-300">
                Autopilot
              </Label>
              <Switch
                id="autopilot"
                checked={inputs.systems.avionics.autopilot ?? false}
                onCheckedChange={(checked) => onInputChange(['systems', 'avionics', 'autopilot'], checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="uavMissionComputer" className="text-gray-300">
                UAV Mission Computer
              </Label>
              <Switch
                id="uavMissionComputer"
                checked={inputs.systems.avionics.uavMissionComputer ?? false}
                onCheckedChange={(checked) => onInputChange(['systems', 'avionics', 'uavMissionComputer'], checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sensors" className="text-gray-300">
                Sensors
              </Label>
              <Switch
                id="sensors"
                checked={inputs.systems.avionics.sensors ?? false}
                onCheckedChange={(checked) => onInputChange(['systems', 'avionics', 'sensors'], checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="cameras" className="text-gray-300">
                Cameras
              </Label>
              <Switch
                id="cameras"
                checked={inputs.systems.avionics.cameras ?? false}
                onCheckedChange={(checked) => onInputChange(['systems', 'avionics', 'cameras'], checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="adsb" className="text-gray-300">
                ADS-B
              </Label>
              <Switch
                id="adsb"
                checked={inputs.systems.avionics.adsb ?? false}
                onCheckedChange={(checked) => onInputChange(['systems', 'avionics', 'adsb'], checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ifr" className="text-gray-300">
                IFR Package
              </Label>
              <Switch
                id="ifr"
                checked={inputs.systems.avionics.ifr ?? false}
                onCheckedChange={(checked) => onInputChange(['systems', 'avionics', 'ifr'], checked)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-primary/20 pt-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Flight Controls</h3>
          <div className="flex items-center justify-between">
            <Label htmlFor="isFBW" className="text-gray-300">
              Fly-by-Wire (FBW) - adds 15-25% weight
            </Label>
            <Switch
              id="isFBW"
              checked={inputs.systems.controls.isFBW ?? false}
              onCheckedChange={(checked) => onInputChange(['systems', 'controls', 'isFBW'], checked)}
            />
          </div>
        </div>

        <div className="border-t border-primary/20 pt-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Fixed Equipment</h3>
          <div className="space-y-4">
            <AeroFormField label="Number of Seats" helperText="" htmlFor="n_seats">
              <Input
                id="n_seats"
                type="number"
                value={inputs.systems.fixedEquipment.n_seats || ''}
                onChange={(e) => handleNumberChange(['systems', 'fixedEquipment', 'n_seats'], e.target.value)}
                className="bg-slate-700/50 border-primary/30 text-white"
                min="0"
                step="1"
              />
            </AeroFormField>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="isPressurized" className="text-gray-300">
                  Pressurized Cabin
                </Label>
                <Switch
                  id="isPressurized"
                  checked={inputs.systems.fixedEquipment.isPressurized ?? false}
                  onCheckedChange={(checked) => onInputChange(['systems', 'fixedEquipment', 'isPressurized'], checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="hasOxygen" className="text-gray-300">
                  Oxygen System
                </Label>
                <Switch
                  id="hasOxygen"
                  checked={inputs.systems.fixedEquipment.hasOxygen ?? false}
                  onCheckedChange={(checked) => onInputChange(['systems', 'fixedEquipment', 'hasOxygen'], checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="hasHVAC" className="text-gray-300">
                  HVAC System
                </Label>
                <Switch
                  id="hasHVAC"
                  checked={inputs.systems.fixedEquipment.hasHVAC ?? false}
                  onCheckedChange={(checked) => onInputChange(['systems', 'fixedEquipment', 'hasHVAC'], checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="telemetry" className="text-gray-300">
                  Telemetry System
                </Label>
                <Switch
                  id="telemetry"
                  checked={inputs.systems.fixedEquipment.telemetry ?? false}
                  onCheckedChange={(checked) => onInputChange(['systems', 'fixedEquipment', 'telemetry'], checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="antennaPackage" className="text-gray-300">
                  Antenna Package
                </Label>
                <Switch
                  id="antennaPackage"
                  checked={inputs.systems.fixedEquipment.antennaPackage ?? false}
                  onCheckedChange={(checked) => onInputChange(['systems', 'fixedEquipment', 'antennaPackage'], checked)}
                />
              </div>
            </div>

            {inputs.propulsion.type === 'electric' && (
              <AeroFormField label="Battery Capacity" helperText="Ah" htmlFor="batteryCapacity">
                <Input
                  id="batteryCapacity"
                  type="number"
                  value={inputs.systems.fixedEquipment.batteryCapacity || ''}
                  onChange={(e) => handleNumberChange(['systems', 'fixedEquipment', 'batteryCapacity'], e.target.value)}
                  className="bg-slate-700/50 border-primary/30 text-white"
                  min="0"
                  step="10"
                />
              </AeroFormField>
            )}
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
