/**
 * Results Panel for Stability & Control Derivatives Calculator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { StabilityResults } from '../utils/calcStability';
import { safeToFixed } from '@/lib/validation';

interface ResultsPanelProps {
  results: StabilityResults | null;
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  if (!results) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stability Status */}
      <Alert className={results.isStable ? "bg-green-400/10 border-green-400/30" : "bg-red-400/10 border-red-400/30"}>
        {results.isStable ? (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400" />
        )}
        <AlertDescription className={results.isStable ? "text-green-400" : "text-red-400"}>
          {results.isStable 
            ? `Aircraft is statically stable (SM = ${safeToFixed((results.SM ?? 0) * 100, 1)}% MAC)`
            : 'Aircraft is statically unstable (SM < 0)'
          }
        </AlertDescription>
      </Alert>

      {/* Warnings */}
      {results.warnings.length > 0 && (
        <Alert className="bg-yellow-400/10 border-yellow-400/30">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400">
            {results.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Lift Curve Slopes */}
      <AeroCard title="Lift Curve Slopes">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Wing (a_w)</p>
            <p className="text-white font-bold text-lg">
              {safeToFixed(results.a_w, 3)} /rad
            </p>
          </div>
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">Tail (a_t)</p>
            <p className="text-white font-bold text-lg">
              {safeToFixed(results.a_t, 3)} /rad
            </p>
          </div>
        </div>
      </AeroCard>

      {/* Longitudinal Stability */}
      <AeroCard title="Longitudinal Stability">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-lg border border-cyan-400/20">
            <p className="text-xs text-gray-400 mb-1">C_mα</p>
            <p className="text-cyan-400 font-bold text-xl">
              {safeToFixed(results.C_m_alpha, 4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Wing: {safeToFixed(results.C_m_alpha_w, 4)}
            </p>
            <p className="text-xs text-gray-500">
              Tail: {safeToFixed(results.C_m_alpha_t, 4)}
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-lg border border-purple-400/20">
            <p className="text-xs text-gray-400 mb-1">Neutral Point</p>
            <p className="text-purple-400 font-bold text-xl">
              {safeToFixed((results.x_np ?? 0) * 100, 1)}% MAC
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-lg border border-green-400/20">
            <p className="text-xs text-gray-400 mb-1">Static Margin</p>
            <p className="text-green-400 font-bold text-xl">
              {safeToFixed((results.SM ?? 0) * 100, 1)}% MAC
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-lg border border-orange-400/20">
            <p className="text-xs text-gray-400 mb-1">Tail Volume</p>
            <p className="text-orange-400 font-bold text-xl">
              {safeToFixed(results.V_H, 3)}
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-indigo-400/10 to-blue-400/10 rounded-lg border border-indigo-400/20">
            <p className="text-xs text-gray-400 mb-1">Downwash (ε_α)</p>
            <p className="text-indigo-400 font-bold text-xl">
              {safeToFixed(results.epsilon_alpha, 4)}
            </p>
          </div>
        </div>
      </AeroCard>

      {/* Control Derivatives */}
      {(results.C_m_delta_e !== undefined || results.C_l_delta_a !== undefined || results.C_n_delta_r !== undefined) && (
        <AeroCard title="Control Derivatives">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {results.C_m_delta_e !== undefined && (
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
                <p className="text-xs text-gray-400 mb-1">C_mδe</p>
                <p className="text-white font-bold text-lg">
                  {safeToFixed(results.C_m_delta_e, 4)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Elevator</p>
              </div>
            )}
            {results.C_l_delta_a !== undefined && (
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
                <p className="text-xs text-gray-400 mb-1">C_lδa</p>
                <p className="text-white font-bold text-lg">
                  {safeToFixed(results.C_l_delta_a, 4)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Aileron</p>
              </div>
            )}
            {results.C_n_delta_r !== undefined && (
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
                <p className="text-xs text-gray-400 mb-1">C_nδr</p>
                <p className="text-white font-bold text-lg">
                  {safeToFixed(results.C_n_delta_r, 4)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Rudder</p>
              </div>
            )}
          </div>
        </AeroCard>
      )}

      {/* Lateral/Directional Derivatives */}
      {(results.C_l_beta !== undefined || results.C_n_beta !== undefined) && (
        <AeroCard title="Lateral/Directional Derivatives">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {results.C_l_beta !== undefined && (
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
                <p className="text-xs text-gray-400 mb-1">C_lβ</p>
                <p className="text-white font-bold text-lg">
                  {safeToFixed(results.C_l_beta, 4)}
                </p>
              </div>
            )}
            {results.C_n_beta !== undefined && (
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
                <p className="text-xs text-gray-400 mb-1">C_nβ</p>
                <p className="text-white font-bold text-lg">
                  {safeToFixed(results.C_n_beta, 4)}
                </p>
              </div>
            )}
            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
              <p className="text-xs text-gray-400 mb-1">C_lp</p>
              <p className="text-white font-bold text-lg">
                {safeToFixed(results.C_l_p, 4)}
              </p>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
              <p className="text-xs text-gray-400 mb-1">C_nr</p>
              <p className="text-white font-bold text-lg">
                {safeToFixed(results.C_n_r, 4)}
              </p>
            </div>
          </div>
        </AeroCard>
      )}
    </div>
  );
}
