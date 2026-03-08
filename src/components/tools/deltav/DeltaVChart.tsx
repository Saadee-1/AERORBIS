"use client";

import { DeltaVBreakdown } from "./types";
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
import { AeroverseLegend, type LegendItem } from "@/components/charts/AerorbisLegend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

type UnitSystem = "SI" | "Imperial" | "Custom";

interface DeltaVChartProps {
  breakdown: DeltaVBreakdown;
  unitSystem: UnitSystem;
  customUnitName?: string;
  customFactor?: string;
}

const DeltaVChart = ({ breakdown, unitSystem, customUnitName, customFactor }: DeltaVChartProps) => {
  const formatValue = (value: number): number => {
    if (unitSystem === "Imperial") {
      return value * 3.28084; // m/s to ft/s
    } else if (unitSystem === "Custom") {
      const factor = parseFloat(customFactor || "1.0");
      if (!isNaN(factor) && factor > 0) {
        return value / factor; // Convert from SI (m/s) to custom
      }
    }
    return value; // SI (m/s)
  };

  const getUnit = (): string => {
    if (unitSystem === "SI") return "m/s";
    if (unitSystem === "Imperial") return "ft/s";
    return customUnitName || "Unit";
  };

  const unit = getUnit();

  const data = [
    {
      name: "Orbital",
      value: formatValue(breakdown.orbitalDeltaV),
      color: "#10b981",
    },
    ...(breakdown.hohmannDeltaV > 0
      ? [
          {
            name: "Hohmann",
            value: formatValue(breakdown.hohmannDeltaV),
            color: "#059669",
          },
        ]
      : []),
    ...(breakdown.planeChangeDeltaV > 0
      ? [
          {
            name: "Plane Change",
            value: formatValue(breakdown.planeChangeDeltaV),
            color: "#8b5cf6",
          },
        ]
      : []),
    {
      name: "Gravity Loss",
      value: formatValue(breakdown.gravityLoss),
      color: "#f59e0b",
    },
    {
      name: "Drag Loss",
      value: formatValue(breakdown.dragLoss),
      color: "#ef4444",
    },
    {
      name: "Steering Loss",
      value: formatValue(breakdown.steeringLoss),
      color: "#ec4899",
    },
  ];

  const totalData = [
    {
      name: "Required",
      value: formatValue(breakdown.totalRequired),
      color: "#10b981",
    },
    {
      name: "With Margin",
      value: formatValue(breakdown.totalWithMargin),
      color: "#fbbf24",
    },
    {
      name: "Achievable",
      value: formatValue(breakdown.totalAchievable),
      color: breakdown.isFeasible ? "#10b981" : "#ef4444",
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-card backdrop-blur-lg border border-primary/20 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Δv Component Breakdown
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Breakdown of required Δv by component
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="name"
                {...globalAxisCommonProps}
                tick={globalAxisTickStyle}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                {...globalAxisCommonProps}
                tick={globalAxisTickStyle}
                label={{
                  value: `Δv (${unit})`,
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
                formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, "Δv"]}
              />
              <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-slate-700/50 px-6 pb-4">
            <AeroverseLegend
              items={data.map((item): LegendItem => ({
                id: item.name.toLowerCase().replace(/\s+/g, '-'),
                name: item.name,
                color: item.color,
              }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Total Δv Comparison</CardTitle>
          <CardDescription className="text-gray-400">
            Required vs Achievable Δv
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={totalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="name"
                {...globalAxisCommonProps}
                tick={globalAxisTickStyle}
              />
              <YAxis
                {...globalAxisCommonProps}
                tick={globalAxisTickStyle}
                label={{
                  value: `Δv (${unit})`,
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
                formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, "Δv"]}
              />
              <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-slate-700/50 px-6 pb-4">
            <AeroverseLegend
              items={data.map((item): LegendItem => ({
                id: item.name.toLowerCase().replace(/\s+/g, '-'),
                name: item.name,
                color: item.color,
              }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeltaVChart;

