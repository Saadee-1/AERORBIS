"use client";

import { StageResult } from "./types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AeroverseLegend, type LegendItem } from "@/components/charts/AeroverseLegend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

interface MassBreakdownChartProps {
  stageResults: StageResult[];
  payloadMass: number;
}

const MassBreakdownChart = ({
  stageResults,
  payloadMass,
}: MassBreakdownChartProps) => {
  // Prepare data for stacked bar chart
  const chartData = stageResults.map((result, index) => ({
    name: result.stage.name || `Stage ${index + 1}`,
    dryMass: result.dryMass / 1000, // Convert to tonnes
    propellantMass: result.propellantMass / 1000,
    interstageMass: (result.stage.interstageMass || 0) / 1000,
  }));

  // Add payload as separate entry
  const totalData = [
    ...chartData,
    {
      name: "Payload",
      dryMass: 0,
      propellantMass: 0,
      interstageMass: 0,
      payloadMass: payloadMass / 1000,
    },
  ];

  // Calculate total liftoff mass
  const totalLiftoffMass =
    stageResults.reduce((sum, r) => sum + r.initialMass, 0) + payloadMass;

  return (
    <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          Mass Breakdown
        </CardTitle>
        <CardDescription className="text-gray-400">
          Stage mass distribution (stacked)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
          <p className="text-sm text-gray-400">
            Total Liftoff Mass:{" "}
            <span className="text-cyan-400 font-bold text-lg">
              {(totalLiftoffMass / 1000).toFixed(1)} t
            </span>
          </p>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={totalData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8" }}
              label={{
                value: "Mass (t)",
                angle: -90,
                position: "insideLeft",
                fill: "#94a3b8",
              }}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #22d3ee40",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`${value.toFixed(2)} t`, ""]}
            />
            <Bar dataKey="dryMass" stackId="a" fill="#22d3ee" name="Dry Mass" />
            <Bar
              dataKey="propellantMass"
              stackId="a"
              fill="#3b82f6"
              name="Propellant"
            />
            <Bar
              dataKey="interstageMass"
              stackId="a"
              fill="#8b5cf6"
              name="Interstage"
            />
            <Bar dataKey="payloadMass" stackId="a" fill="#10b981" name="Payload" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-slate-700/50 px-6 pb-4">
          <AeroverseLegend
            items={[
              { id: 'dry-mass', name: 'Dry Mass', color: '#22d3ee' },
              { id: 'propellant', name: 'Propellant', color: '#3b82f6' },
              { id: 'interstage', name: 'Interstage', color: '#8b5cf6' },
              { id: 'payload', name: 'Payload', color: '#10b981' },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default MassBreakdownChart;

