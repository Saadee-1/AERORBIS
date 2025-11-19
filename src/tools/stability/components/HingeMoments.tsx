"use client";

/**
 * Hinge Moments Panel
 * 
 * Displays hinge moment coefficients and servo torque requirements
 */

import { AeroCard } from '@/components/common/AeroCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { HingeMoments } from '../utils/calcHingeMoments';

interface HingeMomentsPanelProps {
  hingeMoments: HingeMoments | null;
  enabled: boolean;
}

export function HingeMomentsPanel({ hingeMoments, enabled }: HingeMomentsPanelProps) {
  if (!enabled || !hingeMoments) {
    return null;
  }

  return (
    <AeroCard title="Hinge Moment Coefficients">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* C_h0 */}
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">C_h0</p>
            <p className="text-white font-bold text-lg">
              {(hingeMoments.C_h_0 ?? 0).toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Zero-lift</p>
          </div>

          {/* C_hα */}
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">C_hα</p>
            <p className="text-white font-bold text-lg">
              {(hingeMoments.C_h_alpha ?? 0).toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Due to α</p>
          </div>

          {/* C_hδ */}
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">C_hδ</p>
            <p className="text-white font-bold text-lg">
              {(hingeMoments.C_h_delta ?? 0).toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Due to δ</p>
          </div>

          {/* C_hq */}
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
            <p className="text-xs text-gray-400 mb-1">C_hq</p>
            <p className="text-white font-bold text-lg">
              {(hingeMoments.C_h_q ?? 0).toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Due to q</p>
          </div>
        </div>

        {/* Servo Torque */}
        {(hingeMoments.T_max !== undefined || hingeMoments.T_at_deflection !== undefined) && (
          <div className="p-4 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-lg border border-orange-400/20">
            <p className="text-sm text-gray-300 mb-2">Servo Torque Requirements</p>
            <div className="grid grid-cols-2 gap-4">
              {hingeMoments.T_max !== undefined && hingeMoments.T_max != null && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Maximum Torque</p>
                  <p className="text-orange-400 font-bold text-lg">
                    {(hingeMoments.T_max ?? 0).toFixed(2)} N·m
                  </p>
                </div>
              )}
              {hingeMoments.T_at_deflection !== undefined && hingeMoments.T_at_deflection != null && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">At 15° Deflection</p>
                  <p className="text-orange-400 font-bold text-lg">
                    {(hingeMoments.T_at_deflection ?? 0).toFixed(2)} N·m
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warnings */}
        {hingeMoments.warnings && hingeMoments.warnings.length > 0 && (
          <Alert className="bg-yellow-400/10 border-yellow-400/30">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-400">
              {hingeMoments.warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AeroCard>
  );
}

