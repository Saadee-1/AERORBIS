/**
 * Results Panel for Weight Estimator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { ComponentWeights } from '../utils/weightEngine';
import { IterationResult } from '../utils/iteration';
import { AircraftClassification } from '../utils/classification';

interface ResultsPanelProps {
  components: ComponentWeights;
  W_empty: number;
  W_fuel: number;
  W_to: number;
  iteration: IterationResult;
  classification: AircraftClassification;
  cg?: {
    x_cg: number;
    x_cg_MAC: number;
    MAC: number;
  };
}

export function ResultsPanel({ 
  components, 
  W_empty, 
  W_fuel, 
  W_to, 
  iteration,
  classification,
  cg 
}: ResultsPanelProps) {
  const formatWeight = (weightN: number) => {
    const kg = weightN / 9.81;
    if (kg < 1) return `${(kg * 1000).toFixed(1)} g`;
    if (kg < 1000) return `${kg.toFixed(1)} kg`;
    return `${(kg / 1000).toFixed(2)} t`;
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <AeroCard title="Weight Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Empty Weight</p>
            <p className="text-cyan-400 font-bold text-xl">
              {formatWeight(W_empty)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatPercent(W_empty / W_to)} of W_TO
            </p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Fuel Weight</p>
            <p className="text-purple-400 font-bold text-xl">
              {formatWeight(W_fuel)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatPercent(W_fuel / W_to)} of W_TO
            </p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Payload Weight</p>
            <p className="text-green-400 font-bold text-xl">
              {formatWeight(components.payload)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatPercent(components.payload / W_to)} of W_TO
            </p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Takeoff Weight</p>
            <p className="text-yellow-400 font-bold text-xl">
              {formatWeight(W_to)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Iterations: {iteration.iterations}
            </p>
          </div>
        </div>
      </AeroCard>

      {/* Component Weights */}
      <AeroCard title="Component Weights">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
            <p className="text-xs text-gray-400">Wing</p>
            <p className="text-cyan-400 font-semibold">{formatWeight(components.wing)}</p>
          </div>
          <div className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
            <p className="text-xs text-gray-400">Fuselage</p>
            <p className="text-cyan-400 font-semibold">{formatWeight(components.fuselage)}</p>
          </div>
          <div className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
            <p className="text-xs text-gray-400">Horizontal Tail</p>
            <p className="text-cyan-400 font-semibold">{formatWeight(components.horizontalTail)}</p>
          </div>
          <div className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
            <p className="text-xs text-gray-400">Vertical Tail</p>
            <p className="text-cyan-400 font-semibold">{formatWeight(components.verticalTail)}</p>
          </div>
          <div className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
            <p className="text-xs text-gray-400">Landing Gear</p>
            <p className="text-cyan-400 font-semibold">{formatWeight(components.landingGear.total)}</p>
          </div>
          <div className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
            <p className="text-xs text-gray-400">Engine</p>
            <p className="text-cyan-400 font-semibold">{formatWeight(components.engine)}</p>
          </div>
          <div className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
            <p className="text-xs text-gray-400">Fuel System</p>
            <p className="text-cyan-400 font-semibold">{formatWeight(components.fuelSystem)}</p>
          </div>
          <div className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
            <p className="text-xs text-gray-400">Controls</p>
            <p className="text-cyan-400 font-semibold">{formatWeight(components.controls)}</p>
          </div>
          <div className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
            <p className="text-xs text-gray-400">Avionics</p>
            <p className="text-cyan-400 font-semibold">{formatWeight(components.avionics)}</p>
          </div>
          <div className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
            <p className="text-xs text-gray-400">Fixed Equipment</p>
            <p className="text-cyan-400 font-semibold">{formatWeight(components.fixedEquipment)}</p>
          </div>
        </div>
      </AeroCard>

      {/* Iteration Status */}
      <Alert className={iteration.converged 
        ? "bg-green-400/10 border-green-400/30" 
        : "bg-yellow-400/10 border-yellow-400/30"}>
        {iteration.converged ? (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
        )}
        <AlertDescription className={iteration.converged ? "text-green-400" : "text-yellow-400"}>
          {iteration.converged 
            ? `Takeoff weight converged in ${iteration.iterations} iterations`
            : `Takeoff weight did not converge after ${iteration.iterations} iterations`}
        </AlertDescription>
      </Alert>

      {/* Classification */}
      <AeroCard title="Aircraft Classification">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-400 mb-1">Aircraft Class</p>
            <p className="text-cyan-400 font-semibold text-lg">{classification.aircraftClass}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Classification Reason</p>
            <p className="text-gray-300 text-sm">{classification.classificationReason}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Recommended Design Guidelines</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
              {classification.recommendedDesignGuidelines.map((guideline, i) => (
                <li key={i}>{guideline}</li>
              ))}
            </ul>
          </div>
        </div>
      </AeroCard>

      {/* CG Position */}
      {cg && (
        <AeroCard title="Center of Gravity">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">CG Position</p>
                <p className="text-cyan-400 font-semibold">{cg.x_cg.toFixed(2)} m from nose</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">CG on MAC</p>
                <p className="text-cyan-400 font-semibold">{formatPercent(cg.x_cg_MAC)}</p>
              </div>
            </div>
            {cg.x_cg_MAC < 0.05 || cg.x_cg_MAC > 0.45 ? (
              <Alert className="bg-yellow-400/10 border-yellow-400/30">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-400">
                  CG position is outside typical range (5-45% MAC). Review design.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </AeroCard>
      )}
    </div>
  );
}
