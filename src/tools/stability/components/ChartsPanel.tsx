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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Gauge, BarChart3 } from 'lucide-react';

interface ChartsPanelProps {
  cmAlphaData?: Array<{ alpha: number; Cm: number }>;
  stabilityMarginData?: Array<{ x_cg: number; SM: number; C_m_alpha: number }>;
  tailVolumeData?: Array<{ V_H: number; SM: number; C_m_alpha: number }>;
  downwashData?: Array<{ AR: number; epsilon_alpha: number }>;
}

export function ChartsPanel({
  cmAlphaData,
  stabilityMarginData,
  tailVolumeData,
  downwashData,
}: ChartsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Cm vs Alpha */}
      {cmAlphaData && cmAlphaData.length > 0 && (
        <ChartCard
          title="Pitching Moment vs Angle of Attack"
          description="Cm vs α curve showing static stability"
          icon={TrendingUp}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cmAlphaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="alpha"
                stroke="#94a3b8"
                tickFormatter={(value) => `${(value * 180 / Math.PI).toFixed(1)}°`}
                label={{ value: 'Angle of Attack (deg)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke="#94a3b8"
                label={{ value: 'C_m', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                formatter={(value: number) => [value.toFixed(4), 'C_m']}
                labelFormatter={(label) => `α: ${(label * 180 / Math.PI).toFixed(2)}°`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Cm"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                name="C_m"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Stability Margin vs CG */}
      {stabilityMarginData && stabilityMarginData.length > 0 && (
        <ChartCard
          title="Stability Margin vs CG Position"
          description="Static margin variation with center of gravity"
          icon={Gauge}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stabilityMarginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="x_cg"
                stroke="#94a3b8"
                tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                label={{ value: 'CG Position (% MAC)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke="#94a3b8"
                label={{ value: 'Static Margin', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                formatter={(value: number) => [value.toFixed(3), 'SM']}
                labelFormatter={(label) => `CG: ${(label * 100).toFixed(1)}% MAC`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="SM"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Static Margin"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Tail Volume Sizing */}
      {tailVolumeData && tailVolumeData.length > 0 && (
        <ChartCard
          title="Tail Volume Sizing Curves"
          description="Static margin vs tail volume coefficient"
          icon={BarChart3}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tailVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="V_H"
                stroke="#94a3b8"
                label={{ value: 'Tail Volume Coefficient (V_H)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke="#94a3b8"
                label={{ value: 'Static Margin', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                formatter={(value: number) => [value.toFixed(3), 'SM']}
                labelFormatter={(label) => `V_H: ${label.toFixed(3)}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="SM"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Static Margin"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Downwash vs AR */}
      {downwashData && downwashData.length > 0 && (
        <ChartCard
          title="Downwash Gradient vs Aspect Ratio"
          description="Downwash variation with wing aspect ratio"
          icon={TrendingUp}
        >
          <ResponsiveContainer width="100%" height="100%">
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
                labelFormatter={(label) => `AR: ${label.toFixed(2)}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="epsilon_alpha"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Downwash Gradient"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {!cmAlphaData && !stabilityMarginData && !tailVolumeData && !downwashData && (
        <div className="text-center text-gray-400 py-8">
          Run calculations and enable sweeps to see charts
        </div>
      )}
    </div>
  );
}
