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
import { globalAxisTickStyle, globalAxisCommonProps } from "@/lib/chartAxisTheme";
import { AeroverseLegend, type LegendItem } from "@/components/charts/AerorbisLegend";
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
  const chartData = stageResults.map((result, index) => ({
    name: result.stage.name || `Stage ${index + 1}`,
    dryMass: result.dryMass / 1000,
    propellantMass: result.propellantMass / 1000,
    interstageMass: (result.stage.interstageMass || 0) / 1000,
  }));

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

  const totalLiftoffMass =
    stageResults.reduce((sum, r) => sum + r.initialMass, 0) + payloadMass;

  return (
    <Card className="bg-card backdrop-blur-lg border border-primary/20 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Mass Breakdown
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Stage mass distribution (stacked)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-primary/10">
          <p className="text-sm text-muted-foreground">
            Total Liftoff Mass:{" "}
            <span className="text-primary font-bold text-lg">
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
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
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
                border: "1px solid #10b98140",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`${value.toFixed(2)} t`, ""]}
            />
            <Bar dataKey="dryMass" stackId="a" fill="#10b981" name="Dry Mass" />
            <Bar
              dataKey="propellantMass"
              stackId="a"
              fill="#059669"
              name="Propellant"
            />
            <Bar
              dataKey="interstageMass"
              stackId="a"
              fill="#8b5cf6"
              name="Interstage"
            />
            <Bar dataKey="payloadMass" stackId="a" fill="#f59e0b" name="Payload" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-slate-700/50 px-6 pb-4">
          <AeroverseLegend
            items={[
              { id: 'dry-mass', name: 'Dry Mass', color: '#10b981' },
              { id: 'propellant', name: 'Propellant', color: '#059669' },
              { id: 'interstage', name: 'Interstage', color: '#8b5cf6' },
              { id: 'payload', name: 'Payload', color: '#f59e0b' },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default MassBreakdownChart;
