/**
 * Results Panel for Trajectory Simulator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface ResultsPanelProps {
  mode: '1D' | '2D' | '3D';
  result1D?: unknown;
  result2D?: unknown;
  result3D?: unknown;
}

export function ResultsPanel({ mode, result1D, result2D, result3D }: ResultsPanelProps) {
  const result = mode === '1D' ? result1D : mode === '2D' ? result2D : result3D;
  
  if (!result) {
    return (
      <AeroCard title="Results">
        <div className="text-center p-8 text-gray-400">
          <p>Run a simulation to see results</p>
        </div>
      </AeroCard>
    );
  }

  const formatNumber = (value: number | undefined | null, decimals: number = 1) => {
    if (value === undefined || value === null || isNaN(value) || typeof value !== 'number' || !isFinite(value)) {
      return 'N/A';
    }
    if (value >= 1000000) return `${(value / 1000000).toFixed(decimals)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(decimals)}k`;
    return value.toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <AeroCard title="Trajectory Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {result.maxQ && result.maxQ.value != null && (
            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
              <p className="text-xs text-gray-400 mb-1">Max Q</p>
              <p className="text-cyan-400 font-bold text-xl">
                {formatNumber(result.maxQ.value / 1000)} kPa
              </p>
              <p className="text-xs text-gray-500 mt-1">
                @ {result.maxQ.altitude != null ? (result.maxQ.altitude / 1000).toFixed(1) : 'N/A'} km
              </p>
            </div>
          )}

          {result.burnout && result.burnout.altitude != null && (
            <>
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
                <p className="text-xs text-gray-400 mb-1">Burnout Altitude</p>
                <p className="text-purple-400 font-bold text-xl">
                  {formatNumber(result.burnout.altitude != null ? result.burnout.altitude / 1000 : null)} km
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  t = {result.burnout.time != null && typeof result.burnout.time === 'number' ? result.burnout.time.toFixed(1) : 'N/A'} s
                </p>
              </div>

              {result.burnout.velocity != null && (
                <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
                  <p className="text-xs text-gray-400 mb-1">Burnout Velocity</p>
                  <p className="text-green-400 font-bold text-xl">
                    {formatNumber(result.burnout.velocity)} m/s
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNumber(result.burnout.velocity / 1000)} km/s
                  </p>
                </div>
              )}
            </>
          )}

          {mode === '2D' && result.burnout && result.burnout.downrange != null && (
            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
              <p className="text-xs text-gray-400 mb-1">Downrange</p>
              <p className="text-yellow-400 font-bold text-xl">
                {formatNumber(result.burnout.downrange / 1000)} km
              </p>
            </div>
          )}

          {result.states && result.states.length > 0 && result.states[result.states.length - 1].altitude != null && (
            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
              <p className="text-xs text-gray-400 mb-1">Final Altitude</p>
              <p className="text-cyan-400 font-bold text-xl">
                {formatNumber(result.states[result.states.length - 1].altitude / 1000)} km
              </p>
              <p className="text-xs text-gray-500 mt-1">
                t = {result.states[result.states.length - 1].t != null && typeof result.states[result.states.length - 1].t === 'number' ? result.states[result.states.length - 1].t.toFixed(1) : 'N/A'} s
              </p>
            </div>
          )}
        </div>
      </AeroCard>

      {/* Staging Events */}
      {result.stagingEvents && result.stagingEvents.length > 0 && (
        <AeroCard title="Staging Events">
          <div className="space-y-2">
            {result.stagingEvents.map((event: unknown, i: number) => (
              <div key={i} className="p-3 bg-slate-700/30 rounded border border-slate-600/20">
                <div className="flex justify-between items-center">
                  <span className="text-cyan-400 font-semibold">
                    Stage {event.stageIndex + 1} Separation
                  </span>
                  <span className="text-gray-400 text-sm">
                    t = {event.time != null && typeof event.time === 'number' ? event.time.toFixed(1) : 'N/A'} s
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Altitude: {event.altitude != null && typeof event.altitude === 'number' ? (event.altitude / 1000).toFixed(1) : 'N/A'} km, 
                  Velocity: {formatNumber(event.velocity)} m/s
                </div>
              </div>
            ))}
          </div>
        </AeroCard>
      )}

      {/* Losses (2D only) */}
      {mode === '2D' && result.losses && (
        <AeroCard title="Velocity Losses">
          <div className="grid grid-cols-3 gap-4">
            {result.losses.gravity != null && (
              <div className="p-3 bg-slate-700/30 rounded">
                <p className="text-xs text-gray-400">Gravity Loss</p>
                <p className="text-red-400 font-semibold">{formatNumber(result.losses.gravity)} m/s</p>
              </div>
            )}
            {result.losses.drag != null && (
              <div className="p-3 bg-slate-700/30 rounded">
                <p className="text-xs text-gray-400">Drag Loss</p>
                <p className="text-orange-400 font-semibold">{formatNumber(result.losses.drag)} m/s</p>
              </div>
            )}
            {result.losses.steering != null && (
              <div className="p-3 bg-slate-700/30 rounded">
                <p className="text-xs text-gray-400">Steering Loss</p>
                <p className="text-yellow-400 font-semibold">{formatNumber(result.losses.steering)} m/s</p>
              </div>
            )}
          </div>
        </AeroCard>
      )}

      {/* Warnings */}
      {result.maxQ && result.maxQ.value > 80000 && (
        <Alert className="bg-yellow-400/10 border-yellow-400/30">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400">
            Max Q exceeds 80 kPa. Structural loads may be high.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
