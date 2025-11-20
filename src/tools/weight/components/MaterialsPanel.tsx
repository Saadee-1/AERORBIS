/**
 * Materials Selection Panel
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package } from 'lucide-react';
import { WeightEstimationInputs } from '../utils/weightEngine';
import { MATERIALS, getAllMaterials, getMaterialsByCategory } from '../data/materials';
import { useMemo } from 'react';

interface MaterialsPanelProps {
  inputs: WeightEstimationInputs;
  onInputChange: (path: string[], value: any) => void;
}

export function MaterialsPanel({ inputs, onInputChange }: MaterialsPanelProps) {
  const materials = inputs.materials || {};
  
  // Group materials by category for better organization
  const rcMaterials = useMemo(() => getMaterialsByCategory('rc'), []);
  const uavMaterials = useMemo(() => getMaterialsByCategory('uav'), []);
  const fullSizeMaterials = useMemo(() => getMaterialsByCategory('full-size'), []);
  const allMaterials = useMemo(() => getAllMaterials(), []);

  const handleMaterialChange = (component: string, materialId: string) => {
    onInputChange(['materials', component], materialId);
  };

  const getMaterialName = (materialId: string | undefined) => {
    if (!materialId) return 'Baseline (Aluminum 2024-T3)';
    return MATERIALS[materialId]?.name || materialId;
  };

  const getMaterialImpact = (materialId: string | undefined, componentType: 'wing' | 'fuse' | 'tail') => {
    if (!materialId) return '0%';
    const material = MATERIALS[materialId];
    if (!material) return '0%';
    
    let coeff = 1.0;
    if (componentType === 'wing') coeff = material.wingCoeff;
    else if (componentType === 'fuse') coeff = material.fuseCoeff;
    else if (componentType === 'tail') coeff = material.tailCoeff;
    
    const change = ((coeff - 1.0) * 100);
    if (change === 0) return '0%';
    return `${change > 0 ? '+' : ''}${change.toFixed(0)}%`;
  };

  return (
    <AeroCard title="Material Selection" icon={Package}>
      <div className="space-y-6">
        <div className="p-3 bg-slate-800/30 rounded border border-cyan-400/20">
          <p className="text-xs text-gray-400">
            Select materials for each component. Weight coefficients are applied automatically. 
            Baseline is Aluminum 2024-T3 (1.0 = no change).
          </p>
        </div>

        <div className="border-t border-cyan-400/20 pt-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">Primary Structures</h3>
          <div className="space-y-4">
            <AeroFormField label="Wing Material" helperText={`Impact: ${getMaterialImpact(materials.wing, 'wing')}`} htmlFor="wing-material">
              <Select
                value={materials.wing || ''}
                onValueChange={(value) => handleMaterialChange('wing', value)}
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue placeholder="Select wing material..." />
                </SelectTrigger>
                <SelectContent>
                  <div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-400">RC Materials</div>
                    {rcMaterials.map(mat => (
                      <SelectItem key={mat.id} value={mat.id}>
                        {mat.name}
                      </SelectItem>
                    ))}
                  </div>
                  <div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-400">UAV Materials</div>
                    {uavMaterials.map(mat => (
                      <SelectItem key={mat.id} value={mat.id}>
                        {mat.name}
                      </SelectItem>
                    ))}
                  </div>
                  <div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-400">Full-Size Materials</div>
                    {fullSizeMaterials.map(mat => (
                      <SelectItem key={mat.id} value={mat.id}>
                        {mat.name}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </AeroFormField>

            <AeroFormField label="Fuselage Material" helperText={`Impact: ${getMaterialImpact(materials.fuselage, 'fuse')}`} htmlFor="fuse-material">
              <Select
                value={materials.fuselage || ''}
                onValueChange={(value) => handleMaterialChange('fuselage', value)}
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue placeholder="Select fuselage material..." />
                </SelectTrigger>
                <SelectContent>
                  <div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-400">RC Materials</div>
                    {rcMaterials.map(mat => (
                      <SelectItem key={mat.id} value={mat.id}>
                        {mat.name}
                      </SelectItem>
                    ))}
                  </div>
                  <div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-400">UAV Materials</div>
                    {uavMaterials.map(mat => (
                      <SelectItem key={mat.id} value={mat.id}>
                        {mat.name}
                      </SelectItem>
                    ))}
                  </div>
                  <div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-400">Full-Size Materials</div>
                    {fullSizeMaterials.map(mat => (
                      <SelectItem key={mat.id} value={mat.id}>
                        {mat.name}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </AeroFormField>
          </div>
        </div>

        <div className="border-t border-cyan-400/20 pt-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">Tail Surfaces</h3>
          <div className="grid grid-cols-2 gap-4">
            <AeroFormField label="Horizontal Tail" helperText={`Impact: ${getMaterialImpact(materials.htail, 'tail')}`} htmlFor="htail-material">
              <Select
                value={materials.htail || ''}
                onValueChange={(value) => handleMaterialChange('htail', value)}
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {allMaterials.map(mat => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AeroFormField>

            <AeroFormField label="Vertical Tail" helperText={`Impact: ${getMaterialImpact(materials.vtail, 'tail')}`} htmlFor="vtail-material">
              <Select
                value={materials.vtail || ''}
                onValueChange={(value) => handleMaterialChange('vtail', value)}
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {allMaterials.map(mat => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AeroFormField>
          </div>
        </div>

        <div className="border-t border-cyan-400/20 pt-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">Structural Elements</h3>
          <div className="grid grid-cols-2 gap-4">
            <AeroFormField label="Spars" helperText="" htmlFor="spars-material">
              <Select
                value={materials.spars || ''}
                onValueChange={(value) => handleMaterialChange('spars', value)}
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {allMaterials.map(mat => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AeroFormField>

            <AeroFormField label="Ribs" helperText="" htmlFor="ribs-material">
              <Select
                value={materials.ribs || ''}
                onValueChange={(value) => handleMaterialChange('ribs', value)}
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {allMaterials.map(mat => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AeroFormField>
          </div>
        </div>

        <div className="border-t border-cyan-400/20 pt-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">Other Components</h3>
          <div className="grid grid-cols-2 gap-4">
            <AeroFormField label="Landing Gear" helperText="" htmlFor="gear-material">
              <Select
                value={materials.gear || ''}
                onValueChange={(value) => handleMaterialChange('gear', value)}
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {allMaterials.map(mat => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AeroFormField>

            <AeroFormField label="Nacelles/Pylons" helperText="" htmlFor="nacelle-material">
              <Select
                value={materials.nacelle || ''}
                onValueChange={(value) => handleMaterialChange('nacelle', value)}
              >
                <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {allMaterials.map(mat => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AeroFormField>
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
