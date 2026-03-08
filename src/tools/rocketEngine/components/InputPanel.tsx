/**
 * Input Panel for Rocket Engine Calculator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Zap, Gauge } from 'lucide-react';
import { RocketEngineInputs } from '../utils/calcEngine';
import { barToPa, cm2ToM2 } from '../utils/units';

interface InputPanelProps {
  inputs: RocketEngineInputs;
  onInputChange: (field: keyof RocketEngineInputs, value: unknown) => void;
  useBar?: boolean;
  useCm2?: boolean;
}

export function InputPanel({ inputs, onInputChange, useBar = true, useCm2 = true }: InputPanelProps) {
  const handleNumberChange = (field: keyof RocketEngineInputs, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value) || 0;
    onInputChange(field, numValue);
  };

  const getStringValue = (value: number | undefined): string => {
    return value === undefined ? '' : String(value);
  };

  const Pc_display = useBar && inputs.Pc ? inputs.Pc / 1e5 : inputs.Pc;
  const Pa_display = useBar && inputs.Pa ? inputs.Pa / 1e5 : inputs.Pa;
  const At_display = useCm2 && inputs.At ? inputs.At * 1e4 : inputs.At;
  const Ae_display = useCm2 && inputs.Ae ? inputs.Ae * 1e4 : inputs.Ae;

  const handlePcChange = (value: string) => {
    const num = parseFloat(value) || 0;
    onInputChange('Pc', useBar ? barToPa(num) : num);
  };

  const handlePaChange = (value: string) => {
    const num = parseFloat(value) || 0;
    onInputChange('Pa', useBar ? barToPa(num) : num);
  };

  const handleAtChange = (value: string) => {
    const num = parseFloat(value) || 0;
    onInputChange('At', useCm2 ? cm2ToM2(num) : num);
  };

  const handleAeChange = (value: string) => {
    const num = parseFloat(value) || 0;
    onInputChange('Ae', useCm2 ? cm2ToM2(num) : num);
  };

  return (
    <AeroCard title="Engine Configuration" icon={Settings2}>
      <Tabs defaultValue="chamber" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chamber">Chamber</TabsTrigger>
          <TabsTrigger value="nozzle">Nozzle</TabsTrigger>
          <TabsTrigger value="gas">Gas Properties</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="chamber" className="space-y-4 mt-4">
          <AeroFormField label="Chamber Pressure" helperText={useBar ? 'bar' : 'Pa'} htmlFor="Pc">
            <Input id="Pc" type="number" value={Pc_display || ''} onChange={(e) => handlePcChange(e.target.value)} min="0" step={useBar ? "1" : "1000"} placeholder={useBar ? "e.g., 100" : "e.g., 10000000"} />
          </AeroFormField>
          <AeroFormField label="Chamber Temperature" helperText="K" htmlFor="Tc">
            <Input id="Tc" type="number" value={getStringValue(inputs.Tc)} onChange={(e) => handleNumberChange('Tc', e.target.value)} min="0" step="10" placeholder="e.g., 3500" />
          </AeroFormField>
          <AeroFormField label="Ambient Pressure" helperText={useBar ? 'bar (0 for vacuum)' : 'Pa'} htmlFor="Pa">
            <Input id="Pa" type="number" value={Pa_display || ''} onChange={(e) => handlePaChange(e.target.value)} min="0" step={useBar ? "0.01" : "100"} placeholder={useBar ? "1.013" : "101325"} />
          </AeroFormField>
        </TabsContent>

        <TabsContent value="nozzle" className="space-y-4 mt-4">
          <AeroFormField label="Throat Area" helperText={useCm2 ? 'cm²' : 'm²'} htmlFor="At">
            <Input id="At" type="number" value={At_display || ''} onChange={(e) => handleAtChange(e.target.value)} min="0" step={useCm2 ? "0.1" : "0.0001"} placeholder={useCm2 ? "e.g., 50" : "e.g., 0.005"} />
          </AeroFormField>
          <AeroFormField label="Expansion Ratio (ε)" helperText="Ae/At (optional if Ae provided)" htmlFor="epsilon">
            <Input id="epsilon" type="number" value={getStringValue(inputs.epsilon)} onChange={(e) => handleNumberChange('epsilon', e.target.value)} min="1" step="0.1" placeholder="e.g., 16" />
          </AeroFormField>
          <AeroFormField label="Exit Area" helperText={useCm2 ? 'cm² (optional if ε provided)' : 'm²'} htmlFor="Ae">
            <Input id="Ae" type="number" value={Ae_display || ''} onChange={(e) => handleAeChange(e.target.value)} min="0" step={useCm2 ? "0.1" : "0.0001"} placeholder="Optional" />
          </AeroFormField>
        </TabsContent>

        <TabsContent value="gas" className="space-y-4 mt-4">
          <AeroFormField label="Gamma (γ)" helperText="Ratio of specific heats" htmlFor="gamma">
            <Input id="gamma" type="number" value={getStringValue(inputs.gamma)} onChange={(e) => handleNumberChange('gamma', e.target.value)} min="1.01" max="1.5" step="0.01" placeholder="1.22" />
          </AeroFormField>
          <AeroFormField label="Molar Mass" helperText="kg/kmol (optional if R provided)" htmlFor="M_molar">
            <Input id="M_molar" type="number" value={getStringValue(inputs.M_molar)} onChange={(e) => handleNumberChange('M_molar', e.target.value)} min="0" step="0.1" placeholder="e.g., 22" />
          </AeroFormField>
          <AeroFormField label="Gas Constant (R)" helperText="J/(kg·K) (optional if M_molar provided)" htmlFor="R">
            <Input id="R" type="number" value={getStringValue(inputs.R)} onChange={(e) => handleNumberChange('R', e.target.value)} min="0" step="1" placeholder="e.g., 378" />
          </AeroFormField>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-4">
          <AeroFormField label="Nozzle Efficiency" helperText="0-1 (default: 0.98)" htmlFor="nozzleEfficiency">
            <Input id="nozzleEfficiency" type="number" value={getStringValue(inputs.nozzleEfficiency)} onChange={(e) => handleNumberChange('nozzleEfficiency', e.target.value)} min="0" max="1" step="0.01" placeholder="0.98" />
          </AeroFormField>
          <AeroFormField label="c* Efficiency" helperText="0-1 (default: 0.95)" htmlFor="cStarEfficiency">
            <Input id="cStarEfficiency" type="number" value={getStringValue(inputs.cStarEfficiency)} onChange={(e) => handleNumberChange('cStarEfficiency', e.target.value)} min="0" max="1" step="0.01" placeholder="0.95" />
          </AeroFormField>
          <AeroFormField label="Pressure Loss Fraction" helperText="0-1 (default: 0.02)" htmlFor="pressureLossFraction">
            <Input id="pressureLossFraction" type="number" value={getStringValue(inputs.pressureLossFraction)} onChange={(e) => handleNumberChange('pressureLossFraction', e.target.value)} min="0" max="0.1" step="0.001" placeholder="0.02" />
          </AeroFormField>
          <AeroFormField label="Advanced Options">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch checked={inputs.useCEA || false} onCheckedChange={(checked) => onInputChange('useCEA', checked)} />
                <Label className="text-sm text-muted-foreground">Use CEA (Chemical Equilibrium) - placeholder</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={inputs.useFrozen || false} onCheckedChange={(checked) => onInputChange('useFrozen', checked)} />
                <Label className="text-sm text-muted-foreground">Frozen flow (vs equilibrium) - placeholder</Label>
              </div>
            </div>
          </AeroFormField>
        </TabsContent>
      </Tabs>
    </AeroCard>
  );
}
