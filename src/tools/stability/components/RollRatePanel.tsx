"use client";

/**
 * Roll Rate Estimation Panel
 * 
 * Computes and displays roll rate from aileron deflection
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { RollRateResult } from '../utils/rollRateEstimator';

interface RollRatePanelProps {
  rollRateResult: RollRateResult | null;
  enabled: boolean;
  deltaA: number;
  onDeltaAChange: (value: number) => void;
  velocity: number;
  onVelocityChange: (value: number) => void;
  I_x: number;
  onIxChange: (value: number) => void;
}

export function RollRatePanel({
  rollRateResult,
  enabled,
  deltaA,
  onDeltaAChange,
  velocity,
  onVelocityChange,
  I_x,
  onIxChange,
}: RollRatePanelProps) {
  if (!enabled) {
    return null;
  }

  return (
    <AeroCard title="Roll Rate Estimation">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <AeroFormField label="Aileron Deflection" helperText="degrees" htmlFor="delta-a">
            <Input
              id="delta-a"
              type="number"
              value={deltaA}
              onChange={(e) => onDeltaAChange(parseFloat(e.target.value) || 0)}
              className="bg-slate-700/50 border-cyan-400/30 text-white"
              min="-30"
              max="30"
              step="1"
            />
          </AeroFormField>

          <AeroFormField label="Velocity" helperText="m/s" htmlFor="velocity">
            <Input
              id="velocity"
              type="number"
              value={velocity}
              onChange={(e) => onVelocityChange(parseFloat(e.target.value) || 0)}
              className="bg-slate-700/50 border-cyan-400/30 text-white"
              min="0"
              step="1"
            />
          </AeroFormField>

          <AeroFormField label="Roll Moment of Inertia" helperText="kg·m²" htmlFor="I-x">
            <Input
              id="I-x"
              type="number"
              value={I_x}
              onChange={(e) => onIxChange(parseFloat(e.target.value) || 0)}
              className="bg-slate-700/50 border-cyan-400/30 text-white"
              min="0"
              step="0.1"
            />
          </AeroFormField>
        </div>

        {rollRateResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-lg border border-cyan-400/20">
                <p className="text-xs text-gray-400 mb-1">Roll Rate</p>
                <p className="text-cyan-400 font-bold text-xl">
                  {(rollRateResult.p_deg ?? 0).toFixed(1)} deg/s
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(rollRateResult.p ?? 0).toFixed(3)} rad/s
                </p>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
                <p className="text-xs text-gray-400 mb-1">Time Constant</p>
                <p className="text-white font-bold text-lg">
                  {(rollRateResult.roll_time_constant ?? 0).toFixed(2)} s
                </p>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
                <p className="text-xs text-gray-400 mb-1">Rate per Degree</p>
                <p className="text-white font-bold text-lg">
                  {(rollRateResult.roll_rate_per_degree ?? 0).toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">deg/s per deg</p>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
                <p className="text-xs text-gray-400 mb-1">360° Roll Time</p>
                <p className="text-white font-bold text-lg">
                  {Math.abs(rollRateResult.p_deg ?? 0) > 0 ? (360 / Math.abs(rollRateResult.p_deg ?? 1)).toFixed(2) : '∞'} s
                </p>
              </div>
            </div>

            {rollRateResult.warnings && rollRateResult.warnings.length > 0 && (
              <Alert className="bg-yellow-400/10 border-yellow-400/30">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-400">
                  {rollRateResult.warnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </AeroCard>
  );
}

