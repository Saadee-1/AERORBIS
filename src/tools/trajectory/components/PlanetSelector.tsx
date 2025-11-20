/**
 * Planet Selection Panel
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { Planet, PLANETS } from '../data/planets';

interface PlanetSelectorProps {
  selectedPlanet: Planet;
  onPlanetChange: (planet: Planet) => void;
}

export function PlanetSelector({ selectedPlanet, onPlanetChange }: PlanetSelectorProps) {
  return (
    <AeroCard title="Planet Selection" icon={Globe}>
      <div className="space-y-4">
        <AeroFormField label="Planet" helperText="" htmlFor="planet">
          <Select
            value={selectedPlanet.id}
            onValueChange={(value) => {
              const planet = PLANETS[value];
              if (planet) {
                onPlanetChange(planet);
              }
            }}
          >
            <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PLANETS).map(planet => (
                <SelectItem key={planet.id} value={planet.id}>
                  {planet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AeroFormField>

        <div className="p-3 bg-slate-800/30 rounded border border-cyan-400/20">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Surface Gravity:</span>
              <span className="text-cyan-400">{selectedPlanet.surfaceGravity.toFixed(2)} m/s²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Radius:</span>
              <span className="text-cyan-400">{(selectedPlanet.radius / 1000).toFixed(0)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Atmosphere:</span>
              <span className="text-cyan-400">{selectedPlanet.hasAtmosphere ? 'Yes' : 'No'}</span>
            </div>
            {selectedPlanet.hasAtmosphere && selectedPlanet.atmosphere && (
              <div className="flex justify-between">
                <span className="text-gray-400">Surface Density:</span>
                <span className="text-cyan-400">
                  {selectedPlanet.atmosphere.rho0?.toFixed(3) || 'N/A'} kg/m³
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
