/**
 * Tail Sizing Panel for Stability Calculator
 * 
 * Provides tail sizing analysis and recommendations
 */

import { AeroCard } from '@/components/common/AeroCard';
import { StabilityResults } from '../utils/calcStability';

interface TailSizingPanelProps {
  results: StabilityResults | null;
  S_t: number;
  S_w: number;
  l_t: number;
  c_bar: number;
}

export function TailSizingPanel({
  results,
  S_t,
  S_w,
  l_t,
  c_bar,
}: TailSizingPanelProps) {
  if (!results) {
    return null;
  }

  // Calculate required tail area for target static margin
  const targetSM = 0.10; // 10% static margin
  const required_x_np = results.x_np; // Current neutral point
  // For sizing: V_H_req = (targetSM * c_bar + x_cg - x_ac_w) / (a_t/a_w * (1-ε_α) * l_t/c_bar)
  // Simplified: estimate based on current V_H and SM
  const V_H_current = results.V_H;
  const SM_current = results.SM;
  const V_H_target = V_H_current * (targetSM / Math.max(SM_current, 0.01));

  return (
    <AeroCard title="Tail Sizing Analysis">
      <div className="space-y-4">
        {/* Current Configuration */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Current Configuration</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">Tail Area:</span>
              <span className="text-white ml-2">{S_t.toFixed(2)} m²</span>
            </div>
            <div>
              <span className="text-gray-400">Tail Volume:</span>
              <span className="text-white ml-2">{results.V_H.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-gray-400">Static Margin:</span>
              <span className="text-white ml-2">{results.SM.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-gray-400">Tail Arm:</span>
              <span className="text-white ml-2">{l_t.toFixed(2)} m</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Recommendations</h4>
          <div className="space-y-2 text-sm text-gray-300">
            {results.V_H < 0.5 && (
              <p className="text-yellow-400">
                ⚠ Tail volume coefficient is low (&lt;0.5). Consider increasing tail area or tail arm.
              </p>
            )}
            {results.V_H > 1.2 && (
              <p className="text-yellow-400">
                ⚠ Tail volume coefficient is high (&gt;1.2). Tail may be oversized.
              </p>
            )}
            {results.SM < 0.05 && results.SM > 0 && (
              <p className="text-yellow-400">
                ⚠ Static margin is marginal (&lt;0.05). Consider increasing tail size for better stability.
              </p>
            )}
            {results.SM < 0 && (
              <p className="text-red-400">
                ✗ Aircraft is unstable. Increase tail area or move CG forward.
              </p>
            )}
            {results.SM >= 0.05 && results.SM <= 0.15 && results.V_H >= 0.5 && results.V_H <= 1.2 && (
              <p className="text-green-400">
                ✓ Tail sizing appears appropriate for stable flight.
              </p>
            )}
          </div>
        </div>

        {/* Typical Ranges */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Typical Ranges</h4>
          <div className="space-y-1 text-xs text-gray-400">
            <p>Tail Volume Coefficient: 0.5 - 1.2 (typical: 0.6 - 0.9)</p>
            <p>Static Margin: 0.05 - 0.15 (typical: 0.08 - 0.12)</p>
            <p>Tail Area Ratio (S_t/S_w): 0.15 - 0.35</p>
          </div>
        </div>
      </div>
    </AeroCard>
  );
}
