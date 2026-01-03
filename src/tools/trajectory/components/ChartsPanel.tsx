/**
 * Charts Panel for Trajectory Simulator
 */

import { useRef } from 'react';
import { AeroCard } from '@/components/common/AeroCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { globalAxisTickStyle, globalAxisCommonProps } from '@/lib/chartAxisTheme';
import { useChartExport } from '@/hooks/useChartExport';
import { ChartExportButtons } from '@/components/charts/ChartExportButtons';
import { AeroverseLegend } from '@/components/charts/AerorbisLegend';
import type { TrajectoryResult, TrajectoryState } from '../types';
import { getScalarVelocity } from '../types';

interface ChartsPanelProps {
  mode: '1D' | '2D' | '3D';
  result1D?: TrajectoryResult;
  result2D?: TrajectoryResult;
  result3D?: TrajectoryResult;
}

export function ChartsPanel({ mode, result1D, result2D, result3D }: ChartsPanelProps) {
  const result = mode === '1D' ? result1D : mode === '2D' ? result2D : result3D;
  
  // Refs for each chart card
  const altitudeRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef<HTMLDivElement>(null);
  const pressureRef = useRef<HTMLDivElement>(null);
  const trajectory2dRef = useRef<HTMLDivElement>(null);
  const massRef = useRef<HTMLDivElement>(null);

  // Export hooks
  const altitudeExport = useChartExport(altitudeRef, { calculatorId: 'trajectory', getFileBaseName: () => 'aeroverse-trajectory-altitude' });
  const velocityExport = useChartExport(velocityRef, { calculatorId: 'trajectory', getFileBaseName: () => 'aeroverse-trajectory-velocity' });
  const pressureExport = useChartExport(pressureRef, { calculatorId: 'trajectory', getFileBaseName: () => 'aeroverse-trajectory-pressure' });
  const trajectory2dExport = useChartExport(trajectory2dRef, { calculatorId: 'trajectory', getFileBaseName: () => 'aeroverse-trajectory-2d' });
  const massExport = useChartExport(massRef, { calculatorId: 'trajectory', getFileBaseName: () => 'aeroverse-trajectory-mass' });

  if (!result || !result.states || result.states.length === 0) {
    return (
      <AeroCard title="Charts">
        <div className="text-center p-8 text-gray-400">
          <p>Run a simulation to see charts</p>
        </div>
      </AeroCard>
    );
  }

  // Prepare chart data from states
  const chartData = result.states.map((state: TrajectoryState) => ({
    time: state.t,
    altitude: state.altitude / 1000, // Convert to km
    velocity: getScalarVelocity(state.velocity) / 1000, // Convert to km/s
    mass: (state.mass ?? 0) / 1000, // Convert to tonnes
    dynamicPressure: state.dynamicPressure ? state.dynamicPressure / 1000 : 0, // Convert to kPa
    downrange: state.downrange ? state.downrange / 1000 : 0, // Convert to km
  }));

  return (
    <div className="space-y-6">
      {/* Altitude vs Time */}
      <div ref={altitudeRef}>
        <AeroCard 
          title="Altitude vs Time"
          headerActions={<ChartExportButtons exportAsPng={altitudeExport.exportAsPng} exportAsSvg={altitudeExport.exportAsSvg} />}
        >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" {...globalAxisCommonProps} tick={globalAxisTickStyle} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
            <YAxis {...globalAxisCommonProps} tick={globalAxisTickStyle} label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(2)} km`}
            />
            <Line type="monotone" dataKey="altitude" stroke="#22d3ee" strokeWidth={2} name="Altitude (km)" legendType="none" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <AeroverseLegend
            items={[{
              id: 'altitude',
              name: 'Altitude',
              role: 'km',
              color: '#22d3ee',
            }]}
          />
        </div>
      </AeroCard>
      </div>

      {/* Velocity vs Time */}
      <div ref={velocityRef}>
        <AeroCard 
          title="Velocity vs Time"
          headerActions={<ChartExportButtons exportAsPng={velocityExport.exportAsPng} exportAsSvg={velocityExport.exportAsSvg} />}
        >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" {...globalAxisCommonProps} tick={globalAxisTickStyle} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
            <YAxis {...globalAxisCommonProps} tick={globalAxisTickStyle} label={{ value: 'Velocity (km/s)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(2)} km/s`}
            />
            <Line type="monotone" dataKey="velocity" stroke="#06b6d4" strokeWidth={2} name="Velocity (km/s)" legendType="none" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <AeroverseLegend
            items={[{
              id: 'velocity',
              name: 'Velocity',
              role: 'km/s',
              color: '#06b6d4',
            }]}
          />
        </div>
      </AeroCard>
      </div>

      {/* Dynamic Pressure vs Altitude */}
      <div ref={pressureRef}>
        <AeroCard 
          title="Dynamic Pressure (Max Q)"
          headerActions={<ChartExportButtons exportAsPng={pressureExport.exportAsPng} exportAsSvg={pressureExport.exportAsSvg} />}
        >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="altitude" {...globalAxisCommonProps} tick={globalAxisTickStyle} label={{ value: 'Altitude (km)', position: 'insideBottom', offset: -5 }} />
            <YAxis {...globalAxisCommonProps} tick={globalAxisTickStyle} label={{ value: 'Dynamic Pressure (kPa)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(2)} kPa`}
            />
            <Line type="monotone" dataKey="dynamicPressure" stroke="#f59e0b" strokeWidth={2} name="Q (kPa)" legendType="none" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <AeroverseLegend
            items={[{
              id: 'q',
              name: 'Q',
              role: 'kPa',
              color: '#f59e0b',
            }]}
          />
        </div>
      </AeroCard>
      </div>

      {/* 2D Trajectory Plot */}
      {mode === '2D' && (
        <div ref={trajectory2dRef}>
          <AeroCard 
            title="2D Trajectory (Altitude vs Downrange)"
            headerActions={<ChartExportButtons exportAsPng={trajectory2dExport.exportAsPng} exportAsSvg={trajectory2dExport.exportAsSvg} />}
          >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="downrange" {...globalAxisCommonProps} tick={globalAxisTickStyle} label={{ value: 'Downrange (km)', position: 'insideBottom', offset: -5 }} />
              <YAxis {...globalAxisCommonProps} tick={globalAxisTickStyle} label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
                formatter={(value: number, name: string) => {
                  if (name === 'altitude') return `${value.toFixed(2)} km`;
                  return `${value.toFixed(2)} km`;
                }}
              />
              <Line type="monotone" dataKey="altitude" stroke="#22d3ee" strokeWidth={2} name="Altitude (km)" legendType="none" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <AeroverseLegend
              items={[{
                id: 'altitude-2d',
                name: 'Altitude',
                role: 'km',
                color: '#22d3ee',
              }]}
            />
          </div>
        </AeroCard>
        </div>
      )}

      {/* Mass vs Time */}
      <div ref={massRef}>
        <AeroCard 
          title="Mass vs Time"
          headerActions={<ChartExportButtons exportAsPng={massExport.exportAsPng} exportAsSvg={massExport.exportAsSvg} />}
        >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" {...globalAxisCommonProps} tick={globalAxisTickStyle} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
            <YAxis {...globalAxisCommonProps} tick={globalAxisTickStyle} label={{ value: 'Mass (t)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(2)} t`}
            />
            <Line type="monotone" dataKey="mass" stroke="#8b5cf6" strokeWidth={2} name="Mass (t)" legendType="none" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <AeroverseLegend
            items={[{
              id: 'mass',
              name: 'Mass',
              role: 't',
              color: '#8b5cf6',
            }]}
          />
        </div>
      </AeroCard>
      </div>
    </div>
  );
}
