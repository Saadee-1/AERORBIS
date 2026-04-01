/**
 * CG & Inertia Panel
 * Allows users to input component locations for CG and inertia calculation
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Target } from 'lucide-react';
import { ComponentLocation } from '../utils/cg';
import { ComponentWeights } from '../utils/weightEngine';
import { useEffect } from 'react';

interface CGInertiaPanelProps {
  componentWeights: ComponentWeights;
  componentLocations: ComponentLocation[];
  onLocationsChange: (locations: ComponentLocation[]) => void;
  onCalculateCG: () => void;
  cg?: {
    x_cg: number;
    x_cg_MAC: number;
    MAC: number;
  };
  inertia?: {
    Ixx: number;
    Iyy: number;
    Izz: number;
  };
}

export function CGInertiaPanel({
  componentWeights,
  componentLocations,
  onLocationsChange,
  onCalculateCG,
  cg,
  inertia,
}: CGInertiaPanelProps) {
  const defaultComponents = [
    { name: 'Wing', weight: componentWeights.wing },
    { name: 'Fuselage', weight: componentWeights.fuselage },
    { name: 'Horizontal Tail', weight: componentWeights.horizontalTail },
    { name: 'Vertical Tail', weight: componentWeights.verticalTail },
    { name: 'Landing Gear', weight: componentWeights.landingGear.total },
    { name: 'Engine', weight: componentWeights.engine },
    { name: 'Fuel System', weight: componentWeights.fuelSystem },
    { name: 'Controls', weight: componentWeights.controls },
    { name: 'Avionics', weight: componentWeights.avionics },
    { name: 'Fixed Equipment', weight: componentWeights.fixedEquipment },
    { name: 'Payload', weight: componentWeights.payload },
  ].filter(c => c.weight > 0);

  useEffect(() => {
    if (componentLocations.length > 0) {
      const updatedLocations = componentLocations.map(loc => {
        const matchingComponent = defaultComponents.find(c => c.name === loc.name);
        if (matchingComponent) {
          return { ...loc, weight: matchingComponent.weight };
        }
        return loc;
      });
      const weightsChanged = updatedLocations.some((loc, i) => 
        loc.weight !== componentLocations[i].weight
      );
      if (weightsChanged) {
        onLocationsChange(updatedLocations);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentWeights.wing, componentWeights.fuselage, componentWeights.horizontalTail, 
      componentWeights.verticalTail, componentWeights.landingGear.total, componentWeights.engine,
      componentWeights.fuelSystem, componentWeights.controls, componentWeights.avionics,
      componentWeights.fixedEquipment, componentWeights.payload]);

  const handleInitializeLocations = () => {
    if (componentLocations.length === 0) {
      const initialLocations: ComponentLocation[] = defaultComponents.map((comp, i) => ({
        name: comp.name,
        weight: comp.weight,
        x_position: 0,
      }));
      onLocationsChange(initialLocations);
    }
  };

  const handleAutoPopulate = () => {
    const autoLocations: ComponentLocation[] = defaultComponents.map((comp) => {
      let x_pos = 0;
      const L_fuse = 8.0;
      switch (comp.name) {
        case 'Wing': x_pos = L_fuse * 0.4; break;
        case 'Fuselage': x_pos = L_fuse * 0.5; break;
        case 'Horizontal Tail': x_pos = L_fuse * 0.85; break;
        case 'Vertical Tail': x_pos = L_fuse * 0.88; break;
        case 'Landing Gear': x_pos = L_fuse * 0.45; break;
        case 'Engine': x_pos = L_fuse * 0.2; break;
        case 'Fuel System': x_pos = L_fuse * 0.42; break;
        case 'Controls': x_pos = L_fuse * 0.5; break;
        case 'Avionics': x_pos = L_fuse * 0.3; break;
        case 'Fixed Equipment': x_pos = L_fuse * 0.5; break;
        case 'Payload': x_pos = L_fuse * 0.45; break;
        default: x_pos = L_fuse * 0.5;
      }
      return { name: comp.name, weight: comp.weight, x_position: x_pos };
    });
    onLocationsChange(autoLocations);
  };

  const handleLocationChange = (index: number, field: 'name' | 'x_position', value: string | number) => {
    const newLocations = [...componentLocations];
    if (field === 'x_position') {
      newLocations[index].x_position = typeof value === 'number' ? value : parseFloat(value as string) || 0;
    } else {
      newLocations[index].name = value as string;
    }
    onLocationsChange(newLocations);
  };

  const handleAddLocation = () => {
    onLocationsChange([...componentLocations, { name: 'Component', weight: 0, x_position: 0 }]);
  };

  const handleRemoveLocation = (index: number) => {
    onLocationsChange(componentLocations.filter((_, i) => i !== index));
  };

  if (componentLocations.length === 0 && defaultComponents.length > 0) {
    handleInitializeLocations();
  }

  return (
    <AeroCard title="CG & Inertia Calculation" icon={Target}>
      <div className="space-y-6">
        <div className="p-4 bg-muted/30 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground mb-2">
            Enter the X position (distance from nose) for each component to calculate CG and moments of inertia.
          </p>
          <div className="flex gap-2 mt-3">
            <Button type="button" variant="outline" size="sm" onClick={handleAutoPopulate}
              className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20">
              Auto-Populate Typical Positions
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleInitializeLocations}
              className="bg-muted/50 border-border text-muted-foreground hover:bg-muted/70">
              Initialize All Components
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-primary">Component Locations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/20">
                  <th className="text-left p-2 text-muted-foreground">Component</th>
                  <th className="text-left p-2 text-muted-foreground">Weight (kg)</th>
                  <th className="text-left p-2 text-muted-foreground">X Position (m)</th>
                  <th className="text-left p-2 text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {componentLocations.map((loc, i) => {
                  const weight_kg = loc.weight / 9.81;
                  return (
                    <tr key={i} className="border-b border-border/30">
                      <td className="p-2">
                        <Input type="text" value={loc.name} onChange={(e) => handleLocationChange(i, 'name', e.target.value)}
                          className="bg-muted/50 border-primary/30 text-foreground text-sm" />
                      </td>
                      <td className="p-2 text-muted-foreground">{weight_kg.toFixed(2)}</td>
                      <td className="p-2">
                        <Input type="number" value={loc.x_position} onChange={(e) => handleLocationChange(i, 'x_position', e.target.value)}
                          className="bg-muted/50 border-primary/30 text-foreground text-sm w-24" min="0" step="0.1" />
                      </td>
                      <td className="p-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveLocation(i)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddLocation}
            className="mt-2 bg-muted/50 border-border text-muted-foreground hover:bg-muted/70">
            <Plus className="h-4 w-4 mr-1" />
            Add Component
          </Button>
        </div>

        <div className="flex justify-center pt-4">
          <Button type="button" onClick={onCalculateCG}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
            Calculate CG & Inertia
          </Button>
        </div>

        {cg && (
          <div className="p-4 bg-muted/30 rounded-lg border border-primary/20">
            <h3 className="text-sm font-semibold text-primary mb-3">CG Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">CG Position</p>
                <p className="text-primary font-semibold text-lg">{cg.x_cg.toFixed(2)} m from nose</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">CG on MAC</p>
                <p className="text-primary font-semibold text-lg">{(cg.x_cg_MAC * 100).toFixed(1)}%</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Mean Aerodynamic Chord</p>
                <p className="text-muted-foreground text-sm">{cg.MAC.toFixed(2)} m</p>
              </div>
            </div>
          </div>
        )}

        {inertia && (
          <div className="p-4 bg-muted/30 rounded-lg border border-primary/20">
            <h3 className="text-sm font-semibold text-primary mb-3">Moments of Inertia</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ixx (Roll)</p>
                <p className="text-primary font-semibold">{inertia.Ixx.toFixed(1)} kg·m²</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Iyy (Pitch)</p>
                <p className="text-primary font-semibold">{inertia.Iyy.toFixed(1)} kg·m²</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Izz (Yaw)</p>
                <p className="text-primary font-semibold">{inertia.Izz.toFixed(1)} kg·m²</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AeroCard>
  );
}
