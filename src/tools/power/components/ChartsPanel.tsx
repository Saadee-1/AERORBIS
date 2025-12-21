/**
 * Charts Panel for Power System
 */

import { useRef } from 'react';
import { AeroCard } from '@/components/common/AeroCard';
import { MissionResult } from '../utils/missionEngine';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { AeroverseLegend, type LegendItem } from '@/components/charts/AeroverseLegend';
import { useChartExport } from '@/hooks/useChartExport';
import { ChartExportButtons } from '@/components/charts/ChartExportButtons';
import { globalAxisTickStyle, globalAxisCommonProps } from '@/lib/chartAxisTheme';

interface ChartsPanelProps {
  result: MissionResult | null;
}

export function ChartsPanel({ result }: ChartsPanelProps) {
  // Refs for each chart card
  const socCardRef = useRef<HTMLDivElement>(null);
  const powerCardRef = useRef<HTMLDivElement>(null);
  const voltageCardRef = useRef<HTMLDivElement>(null);
  const energyCardRef = useRef<HTMLDivElement>(null);
  const sunCardRef = useRef<HTMLDivElement>(null);

  // Export hooks for each chart
  const socExport = useChartExport(socCardRef, {
    calculatorId: 'power',
    getFileBaseName: () => 'aeroverse-power-soc',
  });
  const powerExport = useChartExport(powerCardRef, {
    calculatorId: 'power',
    getFileBaseName: () => 'aeroverse-power-load-vs-solar',
  });
  const voltageExport = useChartExport(voltageCardRef, {
    calculatorId: 'power',
    getFileBaseName: () => 'aeroverse-power-voltage',
  });
  const energyExport = useChartExport(energyCardRef, {
    calculatorId: 'power',
    getFileBaseName: () => 'aeroverse-power-energy',
  });
  const sunExport = useChartExport(sunCardRef, {
    calculatorId: 'power',
    getFileBaseName: () => 'aeroverse-power-sun-elevation',
  });

  if (!result || result.frames.length === 0) {
    return (
      <AeroCard title="Charts">
        <div className="text-center p-8 text-gray-400">
          <p>Run a simulation to see charts</p>
        </div>
      </AeroCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* State of Charge */}
      <AeroCard 
        title="Battery State of Charge"
        headerActions={<ChartExportButtons exportAsPng={socExport.exportAsPng} exportAsSvg={socExport.exportAsSvg} />}
      >
        <div ref={socCardRef} className="graph-export-target pt-2">
          <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_min"
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              label={{ value: 'SOC (%)', angle: -90, position: 'insideLeft' }}
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
        </div>
      </AeroCard>
      
      {/* Power Load vs Solar */}
      <AeroCard 
        title="Power Load vs Solar Generation"
        headerActions={<ChartExportButtons exportAsPng={powerExport.exportAsPng} exportAsSvg={powerExport.exportAsSvg} />}
      >
        <div ref={powerCardRef} className="graph-export-target pt-2">
          <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_min"
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee' }}
              formatter={(value: number) => [`${value.toFixed(1)} W`, '']}
            />
            <Line
              type="monotone"
              dataKey="load_W"
              stroke="#ef4444"
              name="Load"
              dot={false}
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="solarState.power_W"
              stroke="#fbbf24"
              name="Solar"
              dot={false}
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="netPower_W"
              stroke="#22d3ee"
              name="Net (Solar - Load)"
              dot={false}
              legendType="none"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <AeroverseLegend
            items={[
              { id: 'load', name: 'Load', color: '#ef4444' },
              { id: 'solar', name: 'Solar', color: '#fbbf24' },
              { id: 'net', name: 'Net', role: 'Solar - Load', color: '#22d3ee' },
            ]}
          />
        </div>
        </div>
      </AeroCard>
      
      {/* Voltage */}
      <AeroCard 
        title="Battery Voltage"
        headerActions={<ChartExportButtons exportAsPng={voltageExport.exportAsPng} exportAsSvg={voltageExport.exportAsSvg} />}
      >
        <div ref={voltageCardRef} className="graph-export-target pt-2">
          <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_min"
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft' }}
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
              legendType="none"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <AeroverseLegend
            items={[{
              id: 'voltage',
              name: 'Voltage',
              color: '#10b981',
            }]}
          />
        </div>
        </div>
      </AeroCard>
      
      {/* Energy Remaining */}
      <AeroCard 
        title="Energy Remaining"
        headerActions={<ChartExportButtons exportAsPng={energyExport.exportAsPng} exportAsSvg={energyExport.exportAsSvg} />}
      >
        <div ref={energyCardRef} className="graph-export-target pt-2">
          <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_min"
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              label={{ value: 'Energy (Wh)', angle: -90, position: 'insideLeft' }}
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
        </div>
      </AeroCard>
      
      {/* Sun Elevation */}
      <AeroCard 
        title="Sun Elevation"
        headerActions={<ChartExportButtons exportAsPng={sunExport.exportAsPng} exportAsSvg={sunExport.exportAsSvg} />}
      >
        <div ref={sunCardRef} className="graph-export-target pt-2">
          <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_min"
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              label={{ value: 'Elevation (degrees)', angle: -90, position: 'insideLeft' }}
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
              legendType="none"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <AeroverseLegend
            items={[{
              id: 'sun-elevation',
              name: 'Sun Elevation',
              color: '#f59e0b',
            }]}
          />
        </div>
        </div>
      </AeroCard>
    </div>
  );
}
