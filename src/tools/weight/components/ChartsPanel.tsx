/**
 * Charts Panel for Weight Estimator
 */

import { AeroCard } from '@/components/common/AeroCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ComponentWeights } from '../utils/weightEngine';
import { IterationResult } from '../utils/iteration';

interface ChartsPanelProps {
  components: ComponentWeights;
  W_empty: number;
  W_fuel: number;
  W_to: number;
  iteration: IterationResult;
  cg?: {
    x_cg: number;
    x_cg_MAC: number;
    MAC: number;
  };
}

const COLORS = ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9'];

export function ChartsPanel({ components, W_empty, W_fuel, W_to, iteration, cg }: ChartsPanelProps) {
  // Component weights bar chart data
  const componentData = [
    { name: 'Wing', weight: components.wing / 9.81 },
    { name: 'Fuselage', weight: components.fuselage / 9.81 },
    { name: 'H. Tail', weight: components.horizontalTail / 9.81 },
    { name: 'V. Tail', weight: components.verticalTail / 9.81 },
    { name: 'L. Gear', weight: components.landingGear.total / 9.81 },
    { name: 'Engine', weight: components.engine / 9.81 },
    { name: 'Fuel Sys', weight: components.fuelSystem / 9.81 },
    { name: 'Controls', weight: components.controls / 9.81 },
    { name: 'Avionics', weight: components.avionics / 9.81 },
    { name: 'Fixed Equip', weight: components.fixedEquipment / 9.81 },
  ];

  // Weight breakdown pie chart data
  const pieData = [
    { name: 'Empty Weight', value: W_empty / 9.81 },
    { name: 'Fuel Weight', value: W_fuel / 9.81 },
    { name: 'Payload', value: components.payload / 9.81 },
  ];

  // Iteration convergence data
  const iterationData = iteration.history.map(h => ({
    iteration: h.iteration,
    W_to: h.W_to / 9.81,
    error: h.error * 100,
  }));

  // Wing loading vs W_TO (if we have wing area)
  const wingLoading = W_to / (components.wing > 0 ? components.wing : 1); // N/m²

  return (
    <div className="space-y-6">
      {/* Component Weights Bar Chart */}
      <AeroCard title="Component Weight Breakdown">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={componentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(1)} kg`}
            />
            <Legend />
            <Bar dataKey="weight" fill="#22d3ee" name="Weight (kg)" />
          </BarChart>
        </ResponsiveContainer>
      </AeroCard>

      {/* Weight Distribution Pie Chart */}
      <AeroCard title="Weight Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(1)} kg`}
            />
          </PieChart>
        </ResponsiveContainer>
      </AeroCard>

      {/* Iteration Convergence */}
      <AeroCard title="W_TO Iteration Convergence">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={iterationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="iteration" stroke="#94a3b8" fontSize={12} label={{ value: 'Iteration', position: 'insideBottom', offset: -5 }} />
            <YAxis stroke="#94a3b8" fontSize={12} label={{ value: 'W_TO (kg)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee', borderRadius: '8px' }}
              formatter={(value: number) => `${value.toFixed(1)} kg`}
            />
            <Legend />
            <Line type="monotone" dataKey="W_to" stroke="#22d3ee" strokeWidth={2} name="Takeoff Weight (kg)" />
          </LineChart>
        </ResponsiveContainer>
      </AeroCard>

      {/* CG Position on MAC */}
      {cg && (
        <AeroCard title="CG Position on MAC">
          <div className="p-4">
            <div className="relative h-8 bg-slate-700/50 rounded border border-cyan-400/30">
              <div 
                className="absolute top-0 bottom-0 w-1 bg-cyan-400"
                style={{ left: `${cg.x_cg_MAC * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                <span className="absolute left-0">0%</span>
                <span className="absolute right-0">100%</span>
                <span className="absolute" style={{ left: `${cg.x_cg_MAC * 100}%`, transform: 'translateX(-50%)' }}>
                  CG: {(cg.x_cg_MAC * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              MAC = {cg.MAC.toFixed(2)} m, CG = {cg.x_cg.toFixed(2)} m from nose
            </p>
          </div>
        </AeroCard>
      )}

      {/* Wing Loading */}
      <AeroCard title="Wing Loading">
        <div className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-400">
              {(wingLoading / 9.81).toFixed(1)} kg/m²
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Wing Loading = W_TO / S_w
            </p>
          </div>
        </div>
      </AeroCard>
    </div>
  );
}
