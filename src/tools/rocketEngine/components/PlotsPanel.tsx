/**
 * Plots Panel for Rocket Engine Calculator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Rocket } from 'lucide-react';

interface PlotsPanelProps {
  altitudeSweep?: Array<{ Pa: number; T: number; Isp: number; mdot: number; Pe: number }>;
  expansionSweep?: Array<{ epsilon: number; Isp: number; T: number; Cf: number; Me: number }>;
  pressureSweep?: Array<{ Pc: number; mdot: number; T: number; Isp: number; cStar: number }>;
}

export function PlotsPanel({ altitudeSweep, expansionSweep, pressureSweep }: PlotsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Thrust vs Ambient Pressure (Altitude) */}
      {altitudeSweep && altitudeSweep.length > 0 && (
        <AeroCard title="Thrust vs Ambient Pressure" icon={Rocket}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={altitudeSweep}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="Pa" 
                stroke="#9ca3af"
                tickFormatter={(value) => `${(value / 1e5).toFixed(2)} bar`}
              />
              <YAxis 
                stroke="#9ca3af"
                tickFormatter={(value) => `${(value / 1000).toFixed(1)} kN`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                formatter={(value: number) => [`${(value / 1000).toFixed(2)} kN`, 'Thrust']}
                labelFormatter={(label) => `Pa: ${(label / 1e5).toFixed(3)} bar`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="T" 
                stroke="#06b6d4" 
                strokeWidth={2}
                dot={{ fill: '#06b6d4', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </AeroCard>
      )}

      {/* Isp vs Expansion Ratio */}
      {expansionSweep && expansionSweep.length > 0 && (
        <AeroCard title="Isp vs Expansion Ratio" icon={Rocket}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={expansionSweep}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="epsilon" 
                stroke="#9ca3af"
              />
              <YAxis 
                stroke="#9ca3af"
                tickFormatter={(value) => `${value.toFixed(0)} s`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                formatter={(value: number) => [`${value.toFixed(1)} s`, 'Isp']}
                labelFormatter={(label) => `ε: ${label.toFixed(1)}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Isp" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </AeroCard>
      )}

      {/* Mass Flow vs Chamber Pressure */}
      {pressureSweep && pressureSweep.length > 0 && (
        <AeroCard title="Mass Flow vs Chamber Pressure" icon={Rocket}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={pressureSweep}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="Pc" 
                stroke="#9ca3af"
                tickFormatter={(value) => `${(value / 1e5).toFixed(0)} bar`}
              />
              <YAxis 
                stroke="#9ca3af"
                tickFormatter={(value) => `${value.toFixed(2)} kg/s`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                formatter={(value: number) => [`${value.toFixed(3)} kg/s`, 'Mass Flow']}
                labelFormatter={(label) => `Pc: ${(label / 1e5).toFixed(1)} bar`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="mdot" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </AeroCard>
      )}

      {(!altitudeSweep || altitudeSweep.length === 0) && 
       (!expansionSweep || expansionSweep.length === 0) && 
       (!pressureSweep || pressureSweep.length === 0) && (
        <AeroCard title="Performance Plots" icon={Rocket}>
          <p className="text-gray-400 text-sm">
            Use the sweep options in the calculation panel to generate performance plots.
          </p>
        </AeroCard>
      )}
    </div>
  );
}

