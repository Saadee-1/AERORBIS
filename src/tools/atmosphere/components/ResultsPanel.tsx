/**
 * Results Panel for Standard Atmosphere Calculator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { ChartCard } from '@/components/charts/ChartCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { AtmosphereResult } from '../utils/calcAtmosphere';
import { getUnitLabels, convertTemperatureFromSI, convertPressureFromSI, convertDensityFromSI, convertAltitudeFromSI, convertVelocityFromSI } from '../utils/units';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ResultsPanelProps {
  result: AtmosphereResult | null;
  unitSystem: 'SI' | 'Imperial';
  velocity?: number;
  altitudeHistory?: Array<{ altitude: number; value: number }>;
}

export function ResultsPanel({ result, unitSystem, velocity }: ResultsPanelProps) {
  if (!result) {
    return null;
  }

  const units = getUnitLabels(unitSystem);

  const formatTemperature = (tempK: number) => {
    const converted = convertTemperatureFromSI(tempK, unitSystem === 'Imperial' ? 'F' : 'C');
    return unitSystem === 'Imperial' 
      ? `${converted.toFixed(2)} °F` 
      : `${converted.toFixed(2)} °C (${tempK.toFixed(2)} K)`;
  };

  const formatPressure = (pressurePa: number) => {
    const converted = convertPressureFromSI(pressurePa, unitSystem === 'Imperial' ? 'psi' : 'Pa');
    if (unitSystem === 'Imperial') {
      return `${converted.toFixed(4)} psi`;
    } else {
      if (pressurePa >= 1000) {
        return `${(pressurePa / 1000).toFixed(2)} kPa`;
      }
      return `${pressurePa.toFixed(2)} Pa`;
    }
  };

  const formatDensity = (densityKgM3: number) => {
    const converted = convertDensityFromSI(densityKgM3, unitSystem === 'Imperial' ? 'slug/ft³' : 'kg/m³');
    return `${converted.toExponential(4)} ${units.density}`;
  };

  const formatAltitude = (altitudeM: number) => {
    const converted = convertAltitudeFromSI(altitudeM, unitSystem === 'Imperial' ? 'ft' : 'km');
    if (unitSystem === 'Imperial') {
      return `${converted.toFixed(0)} ft (${(altitudeM / 1000).toFixed(2)} km)`;
    } else {
      return `${converted.toFixed(2)} km (${altitudeM.toFixed(0)} m)`;
    }
  };

  const formatSpeedOfSound = (speedMps: number) => {
    const converted = convertVelocityFromSI(speedMps, unitSystem === 'Imperial' ? 'ft/s' : 'm/s');
    return `${converted.toFixed(2)} ${units.speedOfSound}`;
  };

  const formatVelocity = (velMps: number) => {
    const converted = convertVelocityFromSI(velMps, unitSystem === 'Imperial' ? 'ft/s' : 'm/s');
    return `${converted.toFixed(2)} ${units.velocity}`;
  };

  const formatViscosity = (viscPaS: number) => {
    if (unitSystem === 'Imperial') {
      return `${(viscPaS * 0.020885434).toExponential(4)} lb·s/ft²`;
    }
    return `${viscPaS.toExponential(4)} Pa·s`;
  };

  const formatDynamicPressure = (qPa: number) => {
    if (unitSystem === 'Imperial') {
      return `${(qPa * 0.020885434).toFixed(2)} psf`;
    }
    return `${(qPa / 1000).toFixed(2)} kPa`;
  };

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Alert className="bg-yellow-400/10 border-yellow-400/30">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400">
            {result.warnings.join('; ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Primary Results */}
      <AeroCard title="Atmospheric Properties">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Temperature */}
          <div className="p-4 bg-gradient-to-br from-primary/10 to-emerald-400/10 rounded-lg border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Temperature</p>
            <p className="text-primary font-bold text-xl">
              {formatTemperature(result.temperature)}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">Ratio: {result.temperatureRatio.toFixed(4)}</p>
          </div>

          {/* Pressure */}
          <div className="p-4 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-lg border border-purple-400/20">
            <p className="text-xs text-muted-foreground mb-1">Pressure</p>
            <p className="text-purple-400 font-bold text-xl">
              {formatPressure(result.pressure)}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">Ratio: {result.pressureRatio.toExponential(4)}</p>
          </div>

          {/* Density */}
          <div className="p-4 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-lg border border-green-400/20">
            <p className="text-xs text-muted-foreground mb-1">Density</p>
            <p className="text-green-400 font-bold text-xl">
              {formatDensity(result.density)}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">Ratio: {result.densityRatio.toExponential(4)}</p>
          </div>

          {/* Speed of Sound */}
          <div className="p-4 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-lg border border-orange-400/20">
            <p className="text-xs text-muted-foreground mb-1">Speed of Sound</p>
            <p className="text-orange-400 font-bold text-xl">
              {formatSpeedOfSound(result.speedOfSound)}
            </p>
          </div>

          {/* Viscosity */}
          <div className="p-4 bg-gradient-to-br from-indigo-400/10 to-primary/10 rounded-lg border border-indigo-400/20">
            <p className="text-xs text-muted-foreground mb-1">Dynamic Viscosity</p>
            <p className="text-indigo-400 font-bold text-xl">
              {formatViscosity(result.viscosity)}
            </p>
          </div>

          {/* Gravity */}
          <div className="p-4 bg-gradient-to-br from-primary/10 to-teal-400/10 rounded-lg border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Gravity</p>
            <p className="text-primary font-bold text-xl">
              {result.gravity.toFixed(4)} {units.gravity}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">Ratio: {(result.gravity / 9.80665).toFixed(4)}</p>
          </div>

          {/* Dynamic Pressure (if velocity provided) */}
          {result.dynamicPressure !== undefined && (
            <div className="p-4 bg-gradient-to-br from-yellow-400/10 to-amber-400/10 rounded-lg border border-yellow-400/20">
              <p className="text-xs text-muted-foreground mb-1">Dynamic Pressure</p>
              <p className="text-yellow-400 font-bold text-xl">
                {formatDynamicPressure(result.dynamicPressure)}
              </p>
              {velocity !== undefined && (
                <p className="text-xs text-muted-foreground/70 mt-1">V = {formatVelocity(velocity)}</p>
              )}
            </div>
          )}

          {/* Layer */}
          <div className="p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-1">Atmospheric Layer</p>
            <p className="text-muted-foreground font-bold text-xl">
              {result.layerName}
            </p>
          </div>

          {/* Altitude Info */}
          <div className="p-4 bg-gradient-to-br from-violet-400/10 to-purple-400/10 rounded-lg border border-violet-400/20">
            <p className="text-xs text-muted-foreground mb-1">Altitude</p>
            <p className="text-violet-400 font-bold text-xl">
              {formatAltitude(result.geopotentialAltitude)}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Geometric: {convertAltitudeFromSI(result.geometricAltitude, unitSystem === 'Imperial' ? 'ft' : 'km').toFixed(2)} {unitSystem === 'Imperial' ? 'ft' : 'km'}
            </p>
          </div>
        </div>
      </AeroCard>
    </div>
  );
}
