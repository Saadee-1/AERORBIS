/**
 * Results Panel for Rocket Engine Calculator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { RocketEngineResults } from '../utils/calcEngine';

interface ResultsPanelProps {
  results: RocketEngineResults | null;
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  if (!results) {
    return null;
  }

  const hasValidPerformance =
    Number.isFinite(results.Pe) &&
    results.Pe > 0 &&
    Number.isFinite(results.T) &&
    Number.isFinite(results.mdot) &&
    results.mdot > 0;

  const showNozzleWarning = hasValidPerformance && (results.isOverExpanded || results.isUnderExpanded);

  const nozzleStatusIcon = showNozzleWarning ? (
    <AlertTriangle className="h-4 w-4 text-yellow-400" />
  ) : (
    <CheckCircle2 className="h-4 w-4 text-green-400" />
  );

  const nozzleStatusClasses = showNozzleWarning
    ? "bg-yellow-400/10 border-yellow-400/30"
    : "bg-green-400/10 border-green-400/30";

  const nozzleStatusTextClasses = showNozzleWarning ? "text-yellow-400" : "text-green-400";

  const nozzleStatusMessage = !hasValidPerformance
    ? "Awaiting valid performance data"
    : showNozzleWarning
    ? results.isOverExpanded
      ? "Nozzle is overexpanded: Pe > Pa. Internal shock waves may form."
      : "Nozzle is underexpanded: Pe < Pa. Expansion continues outside the nozzle."
    : "Nozzle exit pressure matches ambient (Pe ≈ Pa)";

  const displayWarnings = hasValidPerformance ? results.warnings : [];

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      <Alert className={nozzleStatusClasses}>
        {nozzleStatusIcon}
        <AlertDescription className={nozzleStatusTextClasses}>
          {nozzleStatusMessage}
        </AlertDescription>
      </Alert>

      {/* Warnings */}
      {displayWarnings.length > 0 && (
        <Alert className="bg-yellow-400/10 border-yellow-400/30">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400">
            {displayWarnings.map((w, i) => (
              <div key={i} className="text-sm">{w}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Mass Flow & Characteristic Velocity */}
      <AeroCard title="Mass Flow & Characteristic Velocity">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Mass Flow (ṁ)</p>
            <p className="text-cyan-400 font-bold text-xl">
              {results.mdot.toFixed(3)} kg/s
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ideal: {results.mdot_ideal.toFixed(3)} kg/s
            </p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">c*</p>
            <p className="text-purple-400 font-bold text-xl">
              {results.cStar.toFixed(1)} m/s
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ideal: {results.cStar_ideal.toFixed(1)} m/s
            </p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Exit Mach (Me)</p>
            <p className="text-green-400 font-bold text-xl">
              {results.Me.toFixed(3)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {results.isChoked ? 'Choked' : 'Not choked'}
            </p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Exit Pressure (Pe)</p>
            <p className="text-orange-400 font-bold text-xl">
              {(results.Pe / 1e5).toFixed(2)} bar
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ratio: {(results.Pe_Pc * 100).toFixed(2)}% of Pc
            </p>
          </div>
        </div>
      </AeroCard>

      {/* Performance Metrics */}
      <AeroCard title="Performance Metrics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-lg border border-cyan-400/20">
            <p className="text-xs text-gray-400 mb-1">Exit Velocity (Ve)</p>
            <p className="text-cyan-400 font-bold text-xl">
              {results.Ve.toFixed(1)} m/s
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ideal: {results.Ve_ideal.toFixed(1)} m/s
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-lg border border-purple-400/20">
            <p className="text-xs text-gray-400 mb-1">Thrust (T)</p>
            <p className="text-purple-400 font-bold text-xl">
              {(results.T / 1000).toFixed(1)} kN
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Vacuum: {(results.T_vacuum / 1000).toFixed(1)} kN
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-lg border border-green-400/20">
            <p className="text-xs text-gray-400 mb-1">Thrust Coefficient (Cf)</p>
            <p className="text-green-400 font-bold text-xl">
              {results.Cf.toFixed(3)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ideal: {results.Cf_ideal.toFixed(3)}
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-yellow-400/10 to-amber-400/10 rounded-lg border border-yellow-400/20">
            <p className="text-xs text-gray-400 mb-1">Specific Impulse (Isp)</p>
            <p className="text-yellow-400 font-bold text-xl">
              {results.Isp.toFixed(1)} s
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Vacuum: {results.Isp_vacuum.toFixed(1)} s
            </p>
          </div>
        </div>
      </AeroCard>

      {/* Nozzle Geometry */}
      <AeroCard title="Nozzle Geometry">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Throat Area (At)</p>
            <p className="text-white font-bold text-lg">
              {(results.Ae / results.epsilon * 1e4).toFixed(2)} cm²
            </p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Exit Area (Ae)</p>
            <p className="text-white font-bold text-lg">
              {(results.Ae * 1e4).toFixed(2)} cm²
            </p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Expansion Ratio (ε)</p>
            <p className="text-white font-bold text-lg">
              {results.epsilon.toFixed(2)}
            </p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Solver Iterations</p>
            <p className="text-white font-bold text-lg">
              {results.solverResult.iterations}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Residual: {results.solverResult.residual.toExponential(2)}
            </p>
          </div>
        </div>
      </AeroCard>
    </div>
  );
}

