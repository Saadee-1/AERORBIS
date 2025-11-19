/**
 * Input Panel for Stability & Control Derivatives Calculator
 * 
 * Accepts inputs object and handles safe number conversion
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2 } from 'lucide-react';
import { StabilityInputs } from '../utils/calcStability';
import { safeNumber } from '../utils/safeNumbers';

interface InputPanelProps {
  inputs: StabilityInputs;
  onInputChange: (field: keyof StabilityInputs, value: any) => void;
}

export function InputPanel({ inputs, onInputChange }: InputPanelProps) {
  // Helper to convert string to number safely
  const handleNumberChange = (field: keyof StabilityInputs, value: string) => {
    const numValue = value === '' ? undefined : safeNumber(value);
    onInputChange(field, numValue);
  };

  // Helper to get string value for input (convert number to string, handle undefined)
  const getStringValue = (value: number | undefined): string => {
    return value === undefined ? '' : String(value);
  };

  return (
    <AeroCard title="Aircraft Configuration" icon={Settings2}>
      <Tabs defaultValue="geometry" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="geometry">Geometry</TabsTrigger>
          <TabsTrigger value="aerodynamics">Aerodynamics</TabsTrigger>
          <TabsTrigger value="control">Control</TabsTrigger>
        </TabsList>

        {/* Geometry Tab */}
        <TabsContent value="geometry" className="space-y-4 mt-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400">Wing Geometry</h3>
            
            <AeroFormField label="Wing Area (m²)" helperText="Total wing planform area">
              <Input
                type="number"
                value={getStringValue(inputs.S_w)}
                onChange={(e) => handleNumberChange('S_w', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 15"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Aspect Ratio" helperText="Wing aspect ratio (b²/S)">
              <Input
                type="number"
                value={getStringValue(inputs.AR)}
                onChange={(e) => handleNumberChange('AR', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 7"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Mean Aerodynamic Chord (m)" helperText="MAC or c̄">
              <Input
                type="number"
                value={getStringValue(inputs.c_bar)}
                onChange={(e) => handleNumberChange('c_bar', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 1.5"
                step="0.01"
              />
            </AeroFormField>

            <AeroFormField label="Wing AC Position (% MAC)" helperText="Aerodynamic center location">
              <Input
                type="number"
                value={getStringValue(inputs.x_ac_w)}
                onChange={(e) => handleNumberChange('x_ac_w', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 25"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="CG Position (% MAC)" helperText="Center of gravity location">
              <Input
                type="number"
                value={getStringValue(inputs.x_cg)}
                onChange={(e) => handleNumberChange('x_cg', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 28"
                step="0.1"
              />
            </AeroFormField>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400">Horizontal Tail</h3>
            
            <AeroFormField label="Tail Area (m²)" helperText="Horizontal tail planform area">
              <Input
                type="number"
                value={getStringValue(inputs.S_t)}
                onChange={(e) => handleNumberChange('S_t', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 4"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Tail Aspect Ratio" helperText="Horizontal tail AR">
              <Input
                type="number"
                value={getStringValue(inputs.AR_t)}
                onChange={(e) => handleNumberChange('AR_t', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 4.5"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Tail Arm (m)" helperText="Distance from wing AC to tail AC">
              <Input
                type="number"
                value={getStringValue(inputs.l_t)}
                onChange={(e) => handleNumberChange('l_t', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 4.5"
                step="0.1"
              />
            </AeroFormField>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400">Vertical Tail (Optional)</h3>
            
            <AeroFormField label="Vertical Tail Area (m²)" helperText="Optional, for directional stability">
              <Input
                type="number"
                value={getStringValue(inputs.S_v)}
                onChange={(e) => handleNumberChange('S_v', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 2.5"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Vertical Tail Arm (m)" helperText="Distance from CG to vertical tail AC">
              <Input
                type="number"
                value={getStringValue(inputs.l_v)}
                onChange={(e) => handleNumberChange('l_v', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 4.5"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Wing Span (m)" helperText="Total wing span">
              <Input
                type="number"
                value={getStringValue(inputs.b_w)}
                onChange={(e) => handleNumberChange('b_w', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 10"
                step="0.1"
              />
            </AeroFormField>
          </div>
        </TabsContent>

        {/* Aerodynamics Tab */}
        <TabsContent value="aerodynamics" className="space-y-4 mt-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400">Aerodynamic Properties</h3>
            
            <AeroFormField label="Airfoil Lift Curve Slope (rad⁻¹)" helperText="a₀, typically 2π ≈ 6.28">
              <Input
                type="number"
                value={getStringValue(inputs.a0)}
                onChange={(e) => handleNumberChange('a0', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="6.28"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Wing Efficiency Factor" helperText="e, typically 0.7-0.95">
              <Input
                type="number"
                value={getStringValue(inputs.e)}
                onChange={(e) => handleNumberChange('e', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="0.90"
                step="0.01"
                min="0"
                max="1"
              />
            </AeroFormField>

            <AeroFormField label="Tail Efficiency Factor" helperText="e_t, typically 0.7-0.95">
              <Input
                type="number"
                value={getStringValue(inputs.e_t)}
                onChange={(e) => handleNumberChange('e_t', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="0.85"
                step="0.01"
                min="0"
                max="1"
              />
            </AeroFormField>

            <AeroFormField label="Tail Effectiveness Factor" helperText="η_t, typically 0.9">
              <Input
                type="number"
                value={getStringValue(inputs.eta_t)}
                onChange={(e) => handleNumberChange('eta_t', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="0.90"
                step="0.01"
                min="0"
                max="1"
              />
            </AeroFormField>

            <AeroFormField label="Downwash Model">
              <Select 
                value={inputs.useRoskamDownwash ? 'Roskam' : 'DATCOM'} 
                onValueChange={(value) => onInputChange('useRoskamDownwash', value === 'Roskam')}
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DATCOM">USAF DATCOM</SelectItem>
                  <SelectItem value="Roskam">Roskam Empirical</SelectItem>
                </SelectContent>
              </Select>
            </AeroFormField>
          </div>
        </TabsContent>

        {/* Control Tab */}
        <TabsContent value="control" className="space-y-4 mt-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400">Elevator</h3>
            
            <AeroFormField label="Elevator Area (m²)" helperText="Optional">
              <Input
                type="number"
                value={getStringValue(inputs.S_e)}
                onChange={(e) => handleNumberChange('S_e', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 1.2"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Elevator Effectiveness" helperText="τ_e, typically 0.3-0.6">
              <Input
                type="number"
                value={getStringValue(inputs.tau_e)}
                onChange={(e) => handleNumberChange('tau_e', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="0.45"
                step="0.01"
                min="0"
                max="1"
              />
            </AeroFormField>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400">Aileron</h3>
            
            <AeroFormField label="Aileron Area (m²)" helperText="Optional">
              <Input
                type="number"
                value={getStringValue(inputs.S_a)}
                onChange={(e) => handleNumberChange('S_a', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 2.0"
                step="0.1"
              />
            </AeroFormField>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400">Rudder</h3>
            
            <AeroFormField label="Rudder Area (m²)" helperText="Optional">
              <Input
                type="number"
                value={getStringValue(inputs.S_r)}
                onChange={(e) => handleNumberChange('S_r', e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 0.8"
                step="0.1"
              />
            </AeroFormField>
          </div>
        </TabsContent>
      </Tabs>
    </AeroCard>
  );
}
