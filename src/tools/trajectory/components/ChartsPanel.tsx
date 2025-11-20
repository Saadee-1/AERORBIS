/**
 * Charts Panel for Trajectory Simulator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartsPanelProps {
  mode: '1D' | '2D' | '3D';
  result1D?: any;
  result2D?: any;
  result3D?: any;
}

export function ChartsPanel({ mode, result1D, result2D, result3D }: ChartsPanelProps) {
  const result = mode === '1D' ? result1D : mode === '2D' ? result2D : result3D;
  
  if (!result || !result.states || result.states.length === 0) {
    return (
      <AeroCard title="Charts">
        <div className="text-center p-8 text-gray-400">
          <p>Run a simulation to see charts</p>
        </div>
      </AeroCard>
    );
  }

  // Prepare chart data (downsample if too many points)
  const maxPoints = 500;
  const step = Math.max(1, Math.floor(result.states.length / maxPoints));
  const chartData = result.states.filter((_: any, i: number) => i % step === 0).map((state: any) => ({
    time: state.t,
    altitude: state.altitude / 1000, // km
    velocity: state.velocity / 1000, // km/s
    dynamicPressure: state.dynamicPressure / 1000, // kPa
    acceleration: state.acceleration,
    mass: state.mass / 1000, // t
    thrustToWeight: state.thrustToWeight,
    downrange: mode === '2D' ? (state.downrange || 0) / 1000 : undefined,
  }));

  return (
    <div className="space-y-6">
      {/* Altitude vs Time */}
      <AeroCard title="Altitude vs Time">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
            <YAxis stroke="#94a3b8" fontSize={12} label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(2)} km`}
            />
            <Legend />
            <Line type="monotone" dataKey="altitude" stroke="#22d3ee" strokeWidth={2} name="Altitude (km)" />
          </LineChart>
        </ResponsiveContainer>
      </AeroCard>

      {/* Velocity vs Time */}
      <AeroCard title="Velocity vs Time">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
            <YAxis stroke="#94a3b8" fontSize={12} label={{ value: 'Velocity (km/s)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(2)} km/s`}
            />
            <Legend />
            <Line type="monotone" dataKey="velocity" stroke="#06b6d4" strokeWidth={2} name="Velocity (km/s)" />
          </LineChart>
        </ResponsiveContainer>
      </AeroCard>

      {/* Dynamic Pressure vs Altitude */}
      <AeroCard title="Dynamic Pressure (Max Q)">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="altitude" stroke="#94a3b8" fontSize={12} label={{ value: 'Altitude (km)', position: 'insideBottom', offset: -5 }} />
            <YAxis stroke="#94a3b8" fontSize={12} label={{ value: 'Dynamic Pressure (kPa)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(2)} kPa`}
            />
            <Legend />
            <Line type="monotone" dataKey="dynamicPressure" stroke="#f59e0b" strokeWidth={2} name="Q (kPa)" />
          </LineChart>
        </ResponsiveContainer>
      </AeroCard>

      {/* 2D Trajectory Plot */}
      {mode === '2D' && (
        <AeroCard title="2D Trajectory (Altitude vs Downrange)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="downrange" stroke="#94a3b8" fontSize={12} label={{ value: 'Downrange (km)', position: 'insideBottom', offset: -5 }} />
              <YAxis stroke="#94a3b8" fontSize={12} label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
                formatter={(value: number, name: string) => {
                  if (name === 'altitude') return `${value.toFixed(2)} km`;
                  return `${value.toFixed(2)} km`;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="altitude" stroke="#22d3ee" strokeWidth={2} name="Altitude (km)" />
            </LineChart>
          </ResponsiveContainer>
        </AeroCard>
      )}

      {/* Mass vs Time */}
      <AeroCard title="Mass vs Time">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
            <YAxis stroke="#94a3b8" fontSize={12} label={{ value: 'Mass (t)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(2)} t`}
            />
            <Legend />
            <Line type="monotone" dataKey="mass" stroke="#8b5cf6" strokeWidth={2} name="Mass (t)" />
          </LineChart>
        </ResponsiveContainer>
      </AeroCard>
    </div>
  );
}
