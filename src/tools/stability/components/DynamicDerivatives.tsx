"use client";

/**
 * Dynamic Derivatives Panel
 * 
 * Displays pitch, roll, and yaw damping derivatives
 */

import { AeroCard } from '@/components/common/AeroCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { DynamicDerivatives } from '../utils/calcDynamicDerivatives';

interface DynamicDerivativesPanelProps {
  derivatives: DynamicDerivatives | null;
  enabled: boolean;
}

export function DynamicDerivativesPanel({ derivatives, enabled }: DynamicDerivativesPanelProps) {
  if (!enabled || !derivatives) {
    return null;
  }

  return (
    <AeroCard title="Dynamic Derivatives">
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Dynamic derivatives describe aircraft response to angular rates (pitch, roll, yaw).
            Negative values indicate damping (stable response).
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Pitch Damping */}
          <div className="p-4 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-lg border border-cyan-400/20">
            <p className="text-xs text-gray-400 mb-1">C_mq</p>
            <p className="text-cyan-400 font-bold text-xl">
              {derivatives.C_m_q.toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Pitch Damping</p>
            {derivatives.pitch_damping_ratio !== undefined && (
              <p className="text-xs text-gray-500">
                ζ: {derivatives.pitch_damping_ratio.toFixed(3)}
              </p>
            )}
          </div>

          {/* Roll Damping */}
          <div className="p-4 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-lg border border-purple-400/20">
            <p className="text-xs text-gray-400 mb-1">C_lp</p>
            <p className="text-purple-400 font-bold text-xl">
              {derivatives.C_l_p.toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Roll Damping</p>
            {derivatives.roll_damping_ratio !== undefined && (
              <p className="text-xs text-gray-500">
                ζ: {derivatives.roll_damping_ratio.toFixed(3)}
              </p>
            )}
          </div>

          {/* Yaw Damping */}
          <div className="p-4 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-lg border border-green-400/20">
            <p className="text-xs text-gray-400 mb-1">C_nr</p>
            <p className="text-green-400 font-bold text-xl">
              {derivatives.C_n_r.toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Yaw Damping</p>
            {derivatives.yaw_damping_ratio !== undefined && (
              <p className="text-xs text-gray-500">
                ζ: {derivatives.yaw_damping_ratio.toFixed(3)}
              </p>
            )}
          </div>

          {/* Cross-Coupling */}
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">C_lr</p>
            <p className="text-white font-bold text-lg">
              {derivatives.C_l_r.toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Roll due to Yaw</p>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">C_np</p>
            <p className="text-white font-bold text-lg">
              {derivatives.C_n_p.toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Yaw due to Roll</p>
          </div>
        </div>
      </div>
    </AeroCard>
  );
}

