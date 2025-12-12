"use client";

/**
 * Stability Criteria Panel (MIL-F-8785C)
 * 
 * Evaluates aircraft handling qualities
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { StabilityCriteria } from '../utils/criteria';

interface StabilityCriteriaPanelProps {
  criteria: StabilityCriteria | null;
  enabled: boolean;
  category: 'A' | 'B' | 'C';
  onCategoryChange: (category: 'A' | 'B' | 'C') => void;
  phase: 'cruise' | 'approach' | 'landing' | 'takeoff';
  onPhaseChange: (phase: 'cruise' | 'approach' | 'landing' | 'takeoff') => void;
}

export function StabilityCriteriaPanel({
  criteria,
  enabled,
  category,
  onCategoryChange,
  phase,
  onPhaseChange,
}: StabilityCriteriaPanelProps) {
  if (!enabled || !criteria) {
    return null;
  }

  const getLevelColor = (level: 1 | 2 | 3) => {
    switch (level) {
      case 1:
        return 'text-green-400';
      case 2:
        return 'text-yellow-400';
      case 3:
        return 'text-red-400';
    }
  };

  const getLevelIcon = (level: 1 | 2 | 3) => {
    switch (level) {
      case 1:
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 2:
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 3:
        return <XCircle className="h-4 w-4 text-red-400" />;
    }
  };

  return (
    <AeroCard title="Stability Criteria (MIL-F-8785C)">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <AeroFormField label="Aircraft Category">
            <Select value={category} onValueChange={(value) => onCategoryChange(value as 'A' | 'B' | 'C')}>
              <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Category A: Fighter</SelectItem>
                <SelectItem value="B">Category B: Transport</SelectItem>
                <SelectItem value="C">Category C: Trainer</SelectItem>
              </SelectContent>
            </Select>
          </AeroFormField>

          <AeroFormField label="Flight Phase">
            <Select value={phase} onValueChange={(value) => onPhaseChange(value as unknown)}>
              <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cruise">Cruise</SelectItem>
                <SelectItem value="approach">Approach</SelectItem>
                <SelectItem value="landing">Landing</SelectItem>
                <SelectItem value="takeoff">Takeoff</SelectItem>
              </SelectContent>
            </Select>
          </AeroFormField>
        </div>

        {/* Overall Rating */}
        <div className="p-4 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-lg border border-cyan-400/20">
          <div className="flex items-center gap-2 mb-2">
            {getLevelIcon(criteria.overall_level)}
            <p className={`text-lg font-bold ${getLevelColor(criteria.overall_level)}`}>
              {criteria.overall_rating}
            </p>
          </div>
        </div>

        {/* Longitudinal */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <div className="flex items-center gap-2 mb-2">
            {getLevelIcon(criteria.longitudinal_level)}
            <p className={`font-semibold ${getLevelColor(criteria.longitudinal_level)}`}>
              Longitudinal: {criteria.longitudinal_rating}
            </p>
          </div>
          {criteria.phugoid_damping_ratio !== undefined && criteria.phugoid_damping_ratio != null && (
            <p className="text-xs text-gray-400 mt-1">
              Phugoid damping: {(criteria.phugoid_damping_ratio ?? 0).toFixed(3)}
            </p>
          )}
        </div>

        {/* Lateral */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <div className="flex items-center gap-2 mb-2">
            {getLevelIcon(criteria.lateral_level)}
            <p className={`font-semibold ${getLevelColor(criteria.lateral_level)}`}>
              Lateral: {criteria.lateral_rating}
            </p>
          </div>
          <div className="text-xs text-gray-400 space-y-1 mt-2">
            {criteria.dutch_roll_damping_ratio !== undefined && criteria.dutch_roll_damping_ratio != null && (
              <div>Dutch roll damping: {(criteria.dutch_roll_damping_ratio ?? 0).toFixed(3)}</div>
            )}
            {criteria.roll_mode_time_constant !== undefined && criteria.roll_mode_time_constant != null && (
              <div>Roll time constant: {(criteria.roll_mode_time_constant ?? 0).toFixed(2)} s</div>
            )}
            <div>Spiral stability: {criteria.spiral_stability}</div>
          </div>
        </div>

        {/* Criteria Checklist */}
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/20">
          <p className="text-sm font-semibold text-white mb-2">Criteria Checklist</p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              {criteria.criteria_met.longitudinal_stability ? (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              <span className={criteria.criteria_met.longitudinal_stability ? 'text-green-400' : 'text-red-400'}>
                Longitudinal stability
              </span>
            </div>
            <div className="flex items-center gap-2">
              {criteria.criteria_met.lateral_stability ? (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              <span className={criteria.criteria_met.lateral_stability ? 'text-green-400' : 'text-red-400'}>
                Lateral stability
              </span>
            </div>
            <div className="flex items-center gap-2">
              {criteria.criteria_met.roll_response ? (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              <span className={criteria.criteria_met.roll_response ? 'text-green-400' : 'text-red-400'}>
                Roll response
              </span>
            </div>
            <div className="flex items-center gap-2">
              {criteria.criteria_met.yaw_response ? (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              <span className={criteria.criteria_met.yaw_response ? 'text-green-400' : 'text-red-400'}>
                Yaw response
              </span>
            </div>
            <div className="flex items-center gap-2">
              {criteria.criteria_met.spiral_stability ? (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              <span className={criteria.criteria_met.spiral_stability ? 'text-green-400' : 'text-red-400'}>
                Spiral stability
              </span>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {criteria.warnings.length > 0 && (
          <Alert className="bg-yellow-400/10 border-yellow-400/30">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-400">
              {criteria.warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AeroCard>
  );
}

