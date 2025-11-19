/**
 * Input Panel for Stability & Control Derivatives Calculator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2 } from 'lucide-react';

interface InputPanelProps {
  // Geometry
  S_w: string;
  onS_wChange: (value: string) => void;
  AR: string;
  onARChange: (value: string) => void;
  c_bar: string;
  onC_barChange: (value: string) => void;
  x_cg: string;
  onX_cgChange: (value: string) => void;
  x_ac_w: string;
  onX_ac_wChange: (value: string) => void;
  
  // Tail
  S_t: string;
  onS_tChange: (value: string) => void;
  AR_t: string;
  onAR_tChange: (value: string) => void;
  l_t: string;
  onL_tChange: (value: string) => void;
  
  // Vertical tail
  S_v: string;
  onS_vChange: (value: string) => void;
  l_v: string;
  onL_vChange: (value: string) => void;
  b_w: string;
  onB_wChange: (value: string) => void;
  
  // Aerodynamics
  a0: string;
  onA0Change: (value: string) => void;
  e: string;
  onEChange: (value: string) => void;
  e_t: string;
  onE_tChange: (value: string) => void;
  eta_t: string;
  onEta_tChange: (value: string) => void;
  downwashModel: 'DATCOM' | 'Roskam';
  onDownwashModelChange: (value: 'DATCOM' | 'Roskam') => void;
  
  // Control surfaces
  S_e: string;
  onS_eChange: (value: string) => void;
  tau_e: string;
  onTau_eChange: (value: string) => void;
  S_a: string;
  onS_aChange: (value: string) => void;
  K_a: string;
  onK_aChange: (value: string) => void;
  S_r: string;
  onS_rChange: (value: string) => void;
  K_r: string;
  onK_rChange: (value: string) => void;
  
  // Lateral
  dihedralAngle: string;
  onDihedralAngleChange: (value: string) => void;
}

export function InputPanel({
  S_w,
  onS_wChange,
  AR,
  onARChange,
  c_bar,
  onC_barChange,
  x_cg,
  onX_cgChange,
  x_ac_w,
  onX_ac_wChange,
  S_t,
  onS_tChange,
  AR_t,
  onAR_tChange,
  l_t,
  onL_tChange,
  S_v,
  onS_vChange,
  l_v,
  onL_vChange,
  b_w,
  onB_wChange,
  a0,
  onA0Change,
  e,
  onEChange,
  e_t,
  onE_tChange,
  eta_t,
  onEta_tChange,
  downwashModel,
  onDownwashModelChange,
  S_e,
  onS_eChange,
  tau_e,
  onTau_eChange,
  S_a,
  onS_aChange,
  K_a,
  onK_aChange,
  S_r,
  onS_rChange,
  K_r,
  onK_rChange,
  dihedralAngle,
  onDihedralAngleChange,
}: InputPanelProps) {
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
                value={S_w}
                onChange={(e) => onS_wChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 15"
              />
            </AeroFormField>

            <AeroFormField label="Aspect Ratio" helperText="Wing aspect ratio (b²/S)">
              <Input
                type="number"
                value={AR}
                onChange={(e) => onARChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 7"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Mean Aerodynamic Chord (m)" helperText="MAC or c̄">
              <Input
                type="number"
                value={c_bar}
                onChange={(e) => onC_barChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 1.5"
                step="0.01"
              />
            </AeroFormField>

            <AeroFormField label="Wing AC Position (% MAC)" helperText="Aerodynamic center location">
              <Input
                type="number"
                value={x_ac_w}
                onChange={(e) => onX_ac_wChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 25"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="CG Position (% MAC)" helperText="Center of gravity location">
              <Input
                type="number"
                value={x_cg}
                onChange={(e) => onX_cgChange(e.target.value)}
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
                value={S_t}
                onChange={(e) => onS_tChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 4"
              />
            </AeroFormField>

            <AeroFormField label="Tail Aspect Ratio" helperText="Horizontal tail AR">
              <Input
                type="number"
                value={AR_t}
                onChange={(e) => onAR_tChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 4.5"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Tail Arm (m)" helperText="Distance from wing AC to tail AC">
              <Input
                type="number"
                value={l_t}
                onChange={(e) => onL_tChange(e.target.value)}
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
                value={S_v}
                onChange={(e) => onS_vChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 2.5"
              />
            </AeroFormField>

            <AeroFormField label="Vertical Tail Arm (m)" helperText="Distance from CG to vertical tail AC">
              <Input
                type="number"
                value={l_v}
                onChange={(e) => onL_vChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 4.5"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Wing Span (m)" helperText="Total wing span">
              <Input
                type="number"
                value={b_w}
                onChange={(e) => onB_wChange(e.target.value)}
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
                value={a0}
                onChange={(e) => onA0Change(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="6.28"
                step="0.1"
              />
            </AeroFormField>

            <AeroFormField label="Wing Efficiency Factor" helperText="e, typically 0.7-0.95">
              <Input
                type="number"
                value={e}
                onChange={(e) => onEChange(e.target.value)}
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
                value={e_t}
                onChange={(e) => onE_tChange(e.target.value)}
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
                value={eta_t}
                onChange={(e) => onEta_tChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="0.90"
                step="0.01"
                min="0"
                max="1"
              />
            </AeroFormField>

            <AeroFormField label="Downwash Model">
              <Select value={downwashModel} onValueChange={onDownwashModelChange}>
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DATCOM">USAF DATCOM</SelectItem>
                  <SelectItem value="Roskam">Roskam Empirical</SelectItem>
                </SelectContent>
              </Select>
            </AeroFormField>

            <AeroFormField label="Dihedral Angle (deg)" helperText="Positive = dihedral, negative = anhedral">
              <Input
                type="number"
                value={dihedralAngle}
                onChange={(e) => onDihedralAngleChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 5"
                step="0.5"
              />
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
                value={S_e}
                onChange={(e) => onS_eChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 1.2"
              />
            </AeroFormField>

            <AeroFormField label="Elevator Effectiveness" helperText="τ_e, typically 0.3-0.6">
              <Input
                type="number"
                value={tau_e}
                onChange={(e) => onTau_eChange(e.target.value)}
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
                value={S_a}
                onChange={(e) => onS_aChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 2.0"
              />
            </AeroFormField>

            <AeroFormField label="Aileron Constant K_a" helperText="Typically 0.3-0.5">
              <Input
                type="number"
                value={K_a}
                onChange={(e) => onK_aChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="0.40"
                step="0.01"
                min="0"
                max="1"
              />
            </AeroFormField>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400">Rudder</h3>
            
            <AeroFormField label="Rudder Area (m²)" helperText="Optional">
              <Input
                type="number"
                value={S_r}
                onChange={(e) => onS_rChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="e.g., 0.8"
              />
            </AeroFormField>

            <AeroFormField label="Rudder Constant K_r" helperText="Typically 0.2-0.4">
              <Input
                type="number"
                value={K_r}
                onChange={(e) => onK_rChange(e.target.value)}
                className="bg-slate-700/50 border-cyan-400/30 text-white"
                placeholder="0.30"
                step="0.01"
                min="0"
                max="1"
              />
            </AeroFormField>
          </div>
        </TabsContent>
      </Tabs>
    </AeroCard>
  );
}
