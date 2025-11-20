/**
 * Battery Pack Configuration Form
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BatteryChemistry, getAllBatteryChemistries, getBatteryChemistry } from '../data/batteryChemistries';
import { BatteryPack } from '../utils/batteryModel';

interface BatteryPackFormProps {
  pack: BatteryPack;
  onPackChange: (pack: BatteryPack) => void;
}

export function BatteryPackForm({ pack, onPackChange }: BatteryPackFormProps) {
  const chemistries = getAllBatteryChemistries();
  const selectedChemistry = getBatteryChemistry(pack.chemistry.id);
  
  const handleChemistryChange = (chemistryId: string) => {
    const chemistry = getBatteryChemistry(chemistryId);
    if (chemistry) {
      onPackChange({
        ...pack,
        chemistry,
      });
    }
  };
  
  const packVoltage = pack.chemistry.nominalVoltage * pack.S_count;
  const packCapacity_mAh = pack.capacity_mAh * pack.P_count;
  const packEnergy_Wh = (packVoltage * packCapacity_mAh) / 1000;
  
  return (
    <AeroCard title="Battery Pack Configuration">
      <div className="space-y-6">
        {/* Chemistry Selection */}
        <AeroFormField label="Battery Chemistry">
          <Select value={pack.chemistry.id} onValueChange={handleChemistryChange}>
            <SelectTrigger className="bg-slate-700/50 border-cyan-400/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {chemistries.map((chem) => (
                <SelectItem key={chem.id} value={chem.id}>
                  {chem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedChemistry && (
            <p className="text-xs text-gray-400 mt-1">{selectedChemistry.notes}</p>
          )}
        </AeroFormField>
        
        {/* Cell Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <AeroFormField label="Cell Capacity (mAh)">
            <input
              type="number"
              value={pack.capacity_mAh}
              onChange={(e) => onPackChange({ ...pack, capacity_mAh: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
              min="0"
              step="100"
            />
          </AeroFormField>
          
          <AeroFormField label="Series Cells (S)">
            <input
              type="number"
              value={pack.S_count}
              onChange={(e) => onPackChange({ ...pack, S_count: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
              min="1"
              step="1"
            />
          </AeroFormField>
          
          <AeroFormField label="Parallel Cells (P)">
            <input
              type="number"
              value={pack.P_count}
              onChange={(e) => onPackChange({ ...pack, P_count: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
              min="1"
              step="1"
            />
          </AeroFormField>
          
          <AeroFormField label="Temperature (°C)">
            <input
              type="number"
              value={pack.temperature}
              onChange={(e) => onPackChange({ ...pack, temperature: parseFloat(e.target.value) || 25 })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-cyan-400/30 rounded text-white"
              min="-50"
              max="100"
              step="1"
            />
          </AeroFormField>
        </div>
        
        {/* Pack Summary */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Pack Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">Pack Voltage:</span>
              <span className="text-white ml-2">{packVoltage.toFixed(1)} V</span>
            </div>
            <div>
              <span className="text-gray-400">Pack Capacity:</span>
              <span className="text-white ml-2">{packCapacity_mAh.toFixed(0)} mAh</span>
            </div>
            <div>
              <span className="text-gray-400">Pack Energy:</span>
              <span className="text-white ml-2">{packEnergy_Wh.toFixed(1)} Wh</span>
            </div>
            <div>
              <span className="text-gray-400">Cell Voltage:</span>
              <span className="text-white ml-2">{pack.chemistry.nominalVoltage.toFixed(2)} V</span>
            </div>
          </div>
        </div>
        
        {/* Chemistry Properties */}
        {selectedChemistry && (
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <h4 className="text-sm font-semibold text-cyan-400 mb-2">Chemistry Properties</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
              <div>Energy Density: {selectedChemistry.energyDensityWhKg} Wh/kg</div>
              <div>Power Density: {selectedChemistry.powerDensityWKg} W/kg</div>
              <div>Continuous C-Rate: {selectedChemistry.cRateContinuous}C</div>
              <div>Burst C-Rate: {selectedChemistry.cRateBurst}C</div>
              <div>Life Cycles: {selectedChemistry.lifeCycles}</div>
              <div>Temp Range: {selectedChemistry.temperatureRange[0]}°C to {selectedChemistry.temperatureRange[1]}°C</div>
            </div>
          </div>
        )}
      </div>
    </AeroCard>
  );
}
