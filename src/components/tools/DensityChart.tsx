"use client";

import { Material, UnitSystem } from "./types";
import { convertDensityToImperial } from "./unitConversion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { globalAxisTickStyle, globalAxisCommonProps } from "@/lib/chartAxisTheme";
import { AeroverseLegend, type LegendItem } from "@/components/charts/AeroverseLegend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface DensityChartProps {
  materials: Material[];
  unitSystem: UnitSystem;
}

const DensityChart = ({ materials, unitSystem }: DensityChartProps) => {
  if (materials.length === 0) {
    return (
      <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-cyan-400/30" />
            <p className="text-gray-400">Select materials to compare densities</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Limit to top 10 materials for readability
  const displayMaterials = materials.slice(0, 10);
  
  const chartData = displayMaterials.map((material) => ({
    name: material.name.length > 15 ? material.name.substring(0, 15) + "..." : material.name,
    fullName: material.name,
    density: unitSystem === "SI" 
      ? material.density 
      : convertDensityToImperial(material.density),
    category: material.category,
  }));

  return (
    <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Density Comparison
        </CardTitle>
        <CardDescription className="text-gray-400">
          Comparing {displayMaterials.length} material{displayMaterials.length !== 1 ? "s" : ""}
          {materials.length > 10 && ` (showing top 10)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                value: `Density (${unitSystem === "SI" ? "kg/m³" : "lb/ft³"})`,
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
              formatter={(value: number) => [
                `${value.toLocaleString('en-US', { maximumFractionDigits: unitSystem === "SI" ? 0 : 2 })} ${unitSystem === "SI" ? "kg/m³" : "lb/ft³"}`,
                "Density",
              ]}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullName;
                }
                return label;
              }}
            />
            <Bar
              dataKey="density"
              fill="#22d3ee"
              radius={[4, 4, 0, 0]}
              name="Density"
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-slate-700/50 px-6 pb-4">
          <AeroverseLegend
            items={[{
              id: 'density',
              name: 'Density',
              role: unitSystem === "SI" ? "kg/m³" : "lb/ft³",
              color: '#22d3ee',
            }]}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DensityChart;

