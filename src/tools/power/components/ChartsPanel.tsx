/**
 * Charts Panel for Power System
 */

import { AeroCard } from '@/components/common/AeroCard';
import { MissionResult } from '../utils/missionEngine';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface ChartsPanelProps {
  result: MissionResult | null;
}

export function ChartsPanel({ result }: ChartsPanelProps) {
  if (!result || result.frames.length === 0) {
    return (
      <AeroCard title="Charts">
        <div className="text-center p-8 text-gray-400">
          <p>Run a simulation to see charts</p>
        </div>
      </AeroCard>
    );
  }
  
  // Downsample for performance (show every Nth point)
  const downsampleFactor = Math.max(1, Math.floor(result.frames.length / 500));
  const chartData = result.frames.filter((_, i) => i % downsampleFactor === 0);
  
  return (
    <div className="space-y-6">
      {/* State of Charge */}
      <AeroCard title="Battery State of Charge">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_min"
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
              stroke="#9ca3af"
            />
            <YAxis
              label={{ value: 'SOC (%)', angle: -90, position: 'insideLeft' }}
              stroke="#9ca3af"
              domain={[0, 100]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee' }}
              formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'SOC']}
            />
            <Area
              type="monotone"
              dataKey="batteryState.soc"
              stroke="#22d3ee"
              fill="#22d3ee"
              fillOpacity={0.3}
              name="State of Charge"
            />
          </AreaChart>
        </ResponsiveContainer>
      </AeroCard>
      
      {/* Power Load vs Solar */}
      <AeroCard title="Power Load vs Solar Generation">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_min"
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
              stroke="#9ca3af"
            />
            <YAxis
              label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }}
              stroke="#9ca3af"
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee' }}
              formatter={(value: number) => [`${value.toFixed(1)} W`, '']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="load_W"
              stroke="#ef4444"
              name="Load"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="solarState.power_W"
              stroke="#fbbf24"
              name="Solar"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="netPower_W"
              stroke="#22d3ee"
              name="Net (Solar - Load)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </AeroCard>
      
      {/* Voltage */}
      <AeroCard title="Battery Voltage">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_min"
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
              stroke="#9ca3af"
            />
            <YAxis
              label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft' }}
              stroke="#9ca3af"
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee' }}
              formatter={(value: number) => [`${value.toFixed(2)} V`, 'Voltage']}
            />
            <Line
              type="monotone"
              dataKey="batteryState.voltage"
              stroke="#10b981"
              name="Voltage"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </AeroCard>
      
      {/* Energy Remaining */}
      <AeroCard title="Energy Remaining">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_min"
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
              stroke="#9ca3af"
            />
            <YAxis
              label={{ value: 'Energy (Wh)', angle: -90, position: 'insideLeft' }}
              stroke="#9ca3af"
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee' }}
              formatter={(value: number) => [`${value.toFixed(2)} Wh`, 'Energy']}
            />
            <Area
              type="monotone"
              dataKey="energyRemaining_Wh"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.3}
              name="Energy Remaining"
            />
          </AreaChart>
        </ResponsiveContainer>
      </AeroCard>
      
      {/* Sun Elevation */}
      <AeroCard title="Sun Elevation">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_min"
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
              stroke="#9ca3af"
            />
            <YAxis
              label={{ value: 'Elevation (degrees)', angle: -90, position: 'insideLeft' }}
              stroke="#9ca3af"
              domain={[-10, 90]}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee' }}
              formatter={(value: number) => [`${value.toFixed(1)}°`, 'Elevation']}
            />
            <Line
              type="monotone"
              dataKey="solarState.sunVector.elevation"
              stroke="#f59e0b"
              name="Sun Elevation"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </AeroCard>
    </div>
  );
}
