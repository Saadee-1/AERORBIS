/**
 * Charts Panel for Stability & Control Derivatives Calculator
 */

import { ChartCard } from '@/components/charts/ChartCard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart3, Wind } from 'lucide-react';
import { StabilityResults } from '../utils/calcStability';
import { AeroverseLegend, type LegendItem } from '@/components/charts/AeroverseLegend';

interface ChartsPanelProps {
  results: StabilityResults | null;
  cgSweepData?: Array<{ x_cg: number; SM: number; C_m_alpha: number }>;
  downwashData?: Array<{ AR: number; epsilon_alpha: number }>;
}

export function ChartsPanel({ results, cgSweepData, downwashData }: ChartsPanelProps) {
  // Generate Cm vs α curve data
  const cmAlphaData = results ? (() => {
    const data = [];
    for (let alpha = -10; alpha <= 10; alpha += 0.5) {
      const alphaRad = alpha * Math.PI / 180;
      const Cm = results.C_m_alpha * alphaRad;
      data.push({ alpha, Cm });
    }
    return data;
  })() : null;

  return (
    <div className="space-y-6">
      {/* Cm vs α Curve */}
      {cmAlphaData && cmAlphaData.length > 0 && (
        <ChartCard
          title="Cm vs Angle of Attack"
          description="Pitching moment coefficient variation with angle of attack"
          icon={TrendingUp}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cmAlphaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="alpha"
                stroke="#94a3b8"
                label={{ value: 'Angle of Attack (deg)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke="#94a3b8"
                label={{ value: 'C_m', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                formatter={(value: number) => [value.toFixed(4), 'C_m']}
                labelFormatter={(label) => `α: ${label}°`}
              />
              <Line
                type="monotone"
                dataKey="Cm"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                name="C_m"
                legendType="none"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <AeroverseLegend
              items={[{
                id: 'cm',
                name: 'C_m',
                color: '#06b6d4',
              }]}
            />
          </div>
        </ChartCard>
      )}

      {/* Static Margin vs CG Position */}
      {cgSweepData && cgSweepData.length > 0 && (
        <ChartCard
          title="Static Margin vs CG Position"
          description="Stability margin variation with center of gravity position"
          icon={BarChart3}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cgSweepData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="x_cg"
                stroke="#94a3b8"
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                label={{ value: 'CG Position (% MAC)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke="#94a3b8"
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                label={{ value: 'Static Margin (% MAC)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'SM']}
                labelFormatter={(label) => `CG: ${(label * 100).toFixed(1)}% MAC`}
              />
              <Line
                type="monotone"
                dataKey="SM"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Static Margin"
                legendType="none"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <AeroverseLegend
              items={[{
                id: 'sm',
                name: 'Static Margin',
                color: '#8b5cf6',
              }]}
            />
          </div>
        </ChartCard>
      )}

      {/* Downwash vs Aspect Ratio */}
      {downwashData && downwashData.length > 0 && (
        <ChartCard
          title="Downwash vs Aspect Ratio"
          description="Downwash gradient variation with wing aspect ratio"
          icon={Wind}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={downwashData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="AR"
                stroke="#94a3b8"
                label={{ value: 'Aspect Ratio', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke="#94a3b8"
                label={{ value: 'Downwash Gradient (ε_α)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                formatter={(value: number) => [value.toFixed(4), 'ε_α']}
                labelFormatter={(label) => `AR: ${label.toFixed(1)}`}
              />
              <Line
                type="monotone"
                dataKey="epsilon_alpha"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Downwash"
                legendType="none"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <AeroverseLegend
              items={[{
                id: 'downwash',
                name: 'Downwash',
                color: '#10b981',
              }]}
            />
          </div>
        </ChartCard>
      )}

      {!cmAlphaData && !cgSweepData && !downwashData && (
        <div className="text-center text-gray-400 py-8">
          Run calculations to see charts
        </div>
      )}
    </div>
  );
}
