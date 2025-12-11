/**
 * Geometry Input Panel
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Ruler } from 'lucide-react';
import { WeightEstimationInputs } from '../utils/weightEngine';

interface GeometryPanelProps {
  inputs: WeightEstimationInputs;
  // TODO: refine type for `onInputChange` — changed any -> unknown automatically by chore/typed-cleanup
  onInputChange: (path: string[], value: unknown) => void;
}

export function GeometryPanel({ inputs, onInputChange }: GeometryPanelProps) {
  const handleNumberChange = (path: string[], value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    onInputChange(path, numValue);
  };

  return (
    <AeroCard title="Geometry" icon={Ruler}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <AeroFormField label="Wing Area (S_w)" helperText="m²" htmlFor="S_w">
            <Input
              id="S_w"
              type="number"
              value={inputs.geometry.S_w || ''}
              onChange={(e) => handleNumberChange(['geometry', 'S_w'], e.target.value)}
              className="bg-slate-700/50 border-cyan-400/30 text-white"
              min="0"
              step="0.1"
            />
          </AeroFormField>

          <AeroFormField label="Aspect Ratio (AR)" helperText="" htmlFor="AR">
            <Input
              id="AR"
              type="number"
              value={inputs.geometry.AR || ''}
              onChange={(e) => handleNumberChange(['geometry', 'AR'], e.target.value)}
              className="bg-slate-700/50 border-cyan-400/30 text-white"
              min="0"
              step="0.1"
            />
          </AeroFormField>

          <AeroFormField label="Taper Ratio (λ)" helperText="" htmlFor="lambda">
            <Input
              id="lambda"
              type="number"
              value={inputs.geometry.lambda || ''}
              onChange={(e) => handleNumberChange(['geometry', 'lambda'], e.target.value)}
              className="bg-slate-700/50 border-cyan-400/30 text-white"
              min="0"
              max="1"
              step="0.01"
            />
          </AeroFormField>

          <AeroFormField label="Thickness/Chord (t/c)" helperText="" htmlFor="t_c">
            <Input
              id="t_c"
              type="number"
              value={inputs.geometry.t_c || ''}
              onChange={(e) => handleNumberChange(['geometry', 't_c'], e.target.value)}
              className="bg-slate-700/50 border-cyan-400/30 text-white"
              min="0.01"
              max="0.5"
              step="0.01"
            />
          </AeroFormField>

          <AeroFormField label="Wing Span (b)" helperText="m" htmlFor="b">
            <Input
              id="b"
              type="number"
              value={inputs.geometry.b || ''}
              onChange={(e) => handleNumberChange(['geometry', 'b'], e.target.value)}
              className="bg-slate-700/50 border-cyan-400/30 text-white"
              min="0"
              step="0.1"
            />
          </AeroFormField>
        </div>

        <div className="border-t border-cyan-400/20 pt-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">Tail Geometry</h3>
          <div className="grid grid-cols-2 gap-4">
            <AeroFormField label="Horizontal Tail Area (S_ht)" helperText="m²" htmlFor="S_ht">
              <Input
                id="S_ht"
                type="number"
                value={inputs.geometry.S_ht || ''}
                onChange={(e) => handleNumberChange(['geometry', 'S_ht'], e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                min="0"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="HT Aspect Ratio" helperText="" htmlFor="AR_ht">
              <Input
                id="AR_ht"
                type="number"
                value={inputs.geometry.AR_ht || ''}
                onChange={(e) => handleNumberChange(['geometry', 'AR_ht'], e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                min="0"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Vertical Tail Area (S_vt)" helperText="m²" htmlFor="S_vt">
              <Input
                id="S_vt"
                type="number"
                value={inputs.geometry.S_vt || ''}
                onChange={(e) => handleNumberChange(['geometry', 'S_vt'], e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                min="0"
                step="0.1"
              />
            </AeroFormField>
          </div>
        </div>

        <div className="border-t border-cyan-400/20 pt-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">Fuselage Geometry</h3>
          <div className="grid grid-cols-2 gap-4">
            <AeroFormField label="Wetted Area (S_fuse)" helperText="m²" htmlFor="S_fuse">
              <Input
                id="S_fuse"
                type="number"
                value={inputs.geometry.S_fuse || ''}
                onChange={(e) => handleNumberChange(['geometry', 'S_fuse'], e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                min="0"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Fuselage Length (L_fuse)" helperText="m" htmlFor="L_fuse">
              <Input
                id="L_fuse"
                type="number"
                value={inputs.geometry.L_fuse || ''}
                onChange={(e) => handleNumberChange(['geometry', 'L_fuse'], e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                min="0"
                step="0.1"
              />
            </AeroFormField>
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
