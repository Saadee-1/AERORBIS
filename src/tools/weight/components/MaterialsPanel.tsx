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
  onInputChange: (path: string[], value: unknown) => void;
}

export function MaterialsPanel({ inputs, onInputChange }: MaterialsPanelProps) {
  const materials = inputs.materials || {};
  
  const rcMaterials = useMemo(() => getMaterialsByCategory('rc'), []);
  const uavMaterials = useMemo(() => getMaterialsByCategory('uav'), []);
  const fullSizeMaterials = useMemo(() => getMaterialsByCategory('full-size'), []);
  const allMaterials = useMemo(() => getAllMaterials(), []);

  const handleMaterialChange = (component: string, materialId: string) => {
    onInputChange(['materials', component], materialId);
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

  const renderMaterialSelect = (label: string, component: string, impact: string, htmlFor: string, materialsArr: typeof allMaterials, grouped = false) => (
    <AeroFormField label={label} helperText={impact ? `Impact: ${impact}` : ''} htmlFor={htmlFor}>
      <Select value={materials[component] || ''} onValueChange={(value) => handleMaterialChange(component, value)}>
        <SelectTrigger><SelectValue placeholder="Select material..." /></SelectTrigger>
        <SelectContent>
          {grouped ? (
            <>
              <div><div className="px-2 py-1 text-xs font-semibold text-muted-foreground">RC Materials</div>
                {rcMaterials.map(mat => <SelectItem key={mat.id} value={mat.id}>{mat.name}</SelectItem>)}
              </div>
              <div><div className="px-2 py-1 text-xs font-semibold text-muted-foreground">UAV Materials</div>
                {uavMaterials.map(mat => <SelectItem key={mat.id} value={mat.id}>{mat.name}</SelectItem>)}
              </div>
              <div><div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Full-Size Materials</div>
                {fullSizeMaterials.map(mat => <SelectItem key={mat.id} value={mat.id}>{mat.name}</SelectItem>)}
              </div>
            </>
          ) : (
            materialsArr.map(mat => <SelectItem key={mat.id} value={mat.id}>{mat.name}</SelectItem>)
          )}
        </SelectContent>
      </Select>
    </AeroFormField>
  );

  return (
    <AeroCard title="Material Selection" icon={Package}>
      <div className="space-y-6">
        <div className="p-3 bg-muted/30 rounded border border-border">
          <p className="text-xs text-muted-foreground">
            Select materials for each component. Weight coefficients are applied automatically. 
            Baseline is Aluminum 2024-T3 (1.0 = no change).
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Primary Structures</h3>
          <div className="space-y-4">
            {renderMaterialSelect('Wing Material', 'wing', getMaterialImpact(materials.wing, 'wing'), 'wing-material', allMaterials, true)}
            {renderMaterialSelect('Fuselage Material', 'fuselage', getMaterialImpact(materials.fuselage, 'fuse'), 'fuse-material', allMaterials, true)}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Tail Surfaces</h3>
          <div className="grid grid-cols-2 gap-4">
            {renderMaterialSelect('Horizontal Tail', 'htail', getMaterialImpact(materials.htail, 'tail'), 'htail-material', allMaterials)}
            {renderMaterialSelect('Vertical Tail', 'vtail', getMaterialImpact(materials.vtail, 'tail'), 'vtail-material', allMaterials)}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Structural Elements</h3>
          <div className="grid grid-cols-2 gap-4">
            {renderMaterialSelect('Spars', 'spars', '', 'spars-material', allMaterials)}
            {renderMaterialSelect('Ribs', 'ribs', '', 'ribs-material', allMaterials)}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Other Components</h3>
          <div className="grid grid-cols-2 gap-4">
            {renderMaterialSelect('Landing Gear', 'gear', '', 'gear-material', allMaterials)}
            {renderMaterialSelect('Nacelles/Pylons', 'nacelle', '', 'nacelle-material', allMaterials)}
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
