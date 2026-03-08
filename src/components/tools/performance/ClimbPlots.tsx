/**
 * Climb Performance Plots Component
 * 
 * Three engineering plots for climb performance analysis:
 * 1. Drag and Thrust vs Speed
 * 2. Power Required and Power Available vs Speed
 * 3. Rate of Climb and Climb Gradient vs Speed
 */

"use client";

import React, { useMemo, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { globalAxisCommonProps } from "@/lib/chartAxisTheme";
import { ChartCard } from "@/components/charts/ChartCard";
import { ChartExportButtons } from "@/components/charts/ChartExportButtons";
import { useChartExport } from "@/hooks/useChartExport";
import { AeroCard } from "@/components/common/AeroCard";
import { ClimbPoint, ClimbResult } from "./utils/climb";

// High-contrast graph styling constants
const GRAPH_STYLES = {
  dragStroke: '#ef4444', // Red for drag
  thrustStroke: '#22d3ee', // Cyan for thrust
  pReqStroke: '#f59e0b', // Amber for power required
  pAvailStroke: '#10b981', // Emerald for power available
  rocStroke: '#8b5cf6', // Purple for ROC
  gammaStroke: '#ec4899', // Pink for gradient
  curveStrokeWidth: 2.5,
  markerFill: '#ff4df0',
  markerStroke: '#fff',
  markerStrokeWidth: 1.4,
  markerRadius: 5,
  gridStroke: 'hsl(var(--border))',
  axisTickText: 'hsl(var(--muted-foreground))',
  axisLabelText: 'hsl(var(--foreground))',
  referenceLineColor: '#fbbf24', // Yellow for V_x/V_y markers
  referenceLineDash: '6 6',
  tooltipBg: 'hsl(var(--popover))',
  tooltipText: 'hsl(var(--primary))',
} as const;

interface ClimbPlotsProps {
  result: ClimbResult | null;
}

/**
 * Custom tooltip for climb plots
 */
// TODO: refine type for `CustomTooltip` — changed any -> unknown automatically by chore/typed-cleanup
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: unknown }) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl bg-popover"
      >
        <p className="font-semibold mb-2 text-sm" style={{ color: GRAPH_STYLES.tooltipText }}>
          {`Speed: ${typeof label === 'number' ? label.toFixed(1) : label || 0} m/s`}
        </p>
        {payload.map((entry: { color?: string; name?: string; value?: number; unit?: string }, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color || GRAPH_STYLES.tooltipText }}>
            {`${entry.name}: ${(entry.value ?? 0).toFixed(2)} ${entry.unit || ''}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ClimbPlots({ result }: ClimbPlotsProps) {
  // Refs for export
  const dragThrustCardRef = useRef<HTMLDivElement>(null);
  const powerCardRef = useRef<HTMLDivElement>(null);
  const rocCardRef = useRef<HTMLDivElement>(null);

  // Export hooks
  const dragThrustExport = useChartExport(dragThrustCardRef, {
    calculatorId: 'climb',
    getFileBaseName: () => 'aeroverse-climb-drag-thrust',
  });
  const powerExport = useChartExport(powerCardRef, {
    calculatorId: 'climb',
    getFileBaseName: () => 'aeroverse-climb-power',
  });
  const rocExport = useChartExport(rocCardRef, {
    calculatorId: 'climb',
    getFileBaseName: () => 'aeroverse-climb-roc-gradient',
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!result || !result.points || result.points.length === 0) {
      return [];
    }

    return result.points
      .filter(pt => pt.valid)
      .map(pt => ({
        v: pt.v,
        dragN: pt.dragN,
        thrustN: pt.tEx !== undefined ? pt.tEx + pt.dragN : undefined,
        pReq: pt.pReq,
        pAvail: pt.pAvail,
        roc: pt.roc,
        gamma: pt.gamma ? pt.gamma * 100 : undefined, // Convert to percent
      }));
  }, [result]);

  if (!result || !result.points || result.points.length === 0) {
    return (
      <AeroCard title="Climb Performance Plots">
        <div className="text-center p-8 text-gray-400">
          <p>Run a calculation to see climb performance plots</p>
        </div>
      </AeroCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plot 1: Drag and Thrust vs Speed */}
      <div ref={dragThrustCardRef}>
        <ChartCard
          title="Drag and Thrust vs Speed"
          description="Shows drag and available thrust curves with V_x and V_y markers"
          headerActions={
            <ChartExportButtons
              exportAsPng={dragThrustExport.exportAsPng}
              exportAsSvg={dragThrustExport.exportAsSvg}
            />
          }
          height={400}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRAPH_STYLES.gridStroke} />
              <XAxis
                {...globalAxisCommonProps}
                dataKey="v"
                label={{ value: 'Speed (m/s)', position: 'insideBottom', offset: -10, style: { fill: GRAPH_STYLES.axisLabelText } }}
                domain={['dataMin', 'dataMax']}
              />
              <YAxis
                {...globalAxisCommonProps}
                label={{ value: 'Force (N)', angle: -90, position: 'insideLeft', style: { fill: GRAPH_STYLES.axisLabelText } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="dragN"
                stroke={GRAPH_STYLES.dragStroke}
                strokeWidth={GRAPH_STYLES.curveStrokeWidth}
                dot={false}
                name="Drag"
                unit=" N"
              />
              {chartData[0]?.thrustN !== undefined && (
                <Line
                  type="monotone"
                  dataKey="thrustN"
                  stroke={GRAPH_STYLES.thrustStroke}
                  strokeWidth={GRAPH_STYLES.curveStrokeWidth}
                  dot={false}
                  name="Thrust"
                  unit=" N"
                />
              )}
              {result.vX !== undefined && (
                <ReferenceLine
                  x={result.vX}
                  stroke={GRAPH_STYLES.referenceLineColor}
                  strokeDasharray={GRAPH_STYLES.referenceLineDash}
                  label={{ value: 'V_x', position: 'top', fill: GRAPH_STYLES.referenceLineColor }}
                />
              )}
              {result.vY !== undefined && (
                <ReferenceLine
                  x={result.vY}
                  stroke={GRAPH_STYLES.referenceLineColor}
                  strokeDasharray={GRAPH_STYLES.referenceLineDash}
                  label={{ value: 'V_y', position: 'top', fill: GRAPH_STYLES.referenceLineColor }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Plot 2: Power Required and Power Available vs Speed */}
      <div ref={powerCardRef}>
        <ChartCard
          title="Power Required and Power Available vs Speed"
          description="Shows power curves with V_y marker (best rate of climb)"
          headerActions={
            <ChartExportButtons
              exportAsPng={powerExport.exportAsPng}
              exportAsSvg={powerExport.exportAsSvg}
            />
          }
          height={400}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRAPH_STYLES.gridStroke} />
              <XAxis
                {...globalAxisCommonProps}
                dataKey="v"
                label={{ value: 'Speed (m/s)', position: 'insideBottom', offset: -10, style: { fill: GRAPH_STYLES.axisLabelText } }}
                domain={['dataMin', 'dataMax']}
              />
              <YAxis
                {...globalAxisCommonProps}
                label={{ value: 'Power (W)', angle: -90, position: 'insideLeft', style: { fill: GRAPH_STYLES.axisLabelText } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="pReq"
                stroke={GRAPH_STYLES.pReqStroke}
                strokeWidth={GRAPH_STYLES.curveStrokeWidth}
                dot={false}
                name="Power Required"
                unit=" W"
              />
              {chartData[0]?.pAvail !== undefined && (
                <Line
                  type="monotone"
                  dataKey="pAvail"
                  stroke={GRAPH_STYLES.pAvailStroke}
                  strokeWidth={GRAPH_STYLES.curveStrokeWidth}
                  dot={false}
                  name="Power Available"
                  unit=" W"
                />
              )}
              {result.vY !== undefined && (
                <ReferenceLine
                  x={result.vY}
                  stroke={GRAPH_STYLES.referenceLineColor}
                  strokeDasharray={GRAPH_STYLES.referenceLineDash}
                  label={{ value: 'V_y', position: 'top', fill: GRAPH_STYLES.referenceLineColor }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Plot 3: ROC and Climb Gradient vs Speed */}
      <div ref={rocCardRef}>
        <ChartCard
          title="Rate of Climb and Climb Gradient vs Speed"
          description="Shows climb performance metrics with V_x and V_y markers"
          headerActions={
            <ChartExportButtons
              exportAsPng={rocExport.exportAsPng}
              exportAsSvg={rocExport.exportAsSvg}
            />
          }
          height={400}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRAPH_STYLES.gridStroke} />
              <XAxis
                {...globalAxisCommonProps}
                dataKey="v"
                label={{ value: 'Speed (m/s)', position: 'insideBottom', offset: -10, style: { fill: GRAPH_STYLES.axisLabelText } }}
                domain={['dataMin', 'dataMax']}
              />
              <YAxis
                {...globalAxisCommonProps}
                yAxisId="roc"
                label={{ value: 'ROC (m/s)', angle: -90, position: 'insideLeft', style: { fill: GRAPH_STYLES.rocStroke } }}
              />
              <YAxis
                {...globalAxisCommonProps}
                yAxisId="gamma"
                orientation="right"
                label={{ value: 'Gradient (%)', angle: 90, position: 'insideRight', style: { fill: GRAPH_STYLES.gammaStroke } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                yAxisId="roc"
                type="monotone"
                dataKey="roc"
                stroke={GRAPH_STYLES.rocStroke}
                strokeWidth={GRAPH_STYLES.curveStrokeWidth}
                dot={false}
                name="ROC"
                unit=" m/s"
              />
              {chartData[0]?.gamma !== undefined && (
                <Line
                  yAxisId="gamma"
                  type="monotone"
                  dataKey="gamma"
                  stroke={GRAPH_STYLES.gammaStroke}
                  strokeWidth={GRAPH_STYLES.curveStrokeWidth}
                  dot={false}
                  name="Gradient"
                  unit=" %"
                />
              )}
              {result.vX !== undefined && (
                <ReferenceLine
                  yAxisId="roc"
                  x={result.vX}
                  stroke={GRAPH_STYLES.referenceLineColor}
                  strokeDasharray={GRAPH_STYLES.referenceLineDash}
                  label={{ value: 'V_x', position: 'top', fill: GRAPH_STYLES.referenceLineColor }}
                />
              )}
              {result.vY !== undefined && (
                <ReferenceLine
                  yAxisId="roc"
                  x={result.vY}
                  stroke={GRAPH_STYLES.referenceLineColor}
                  strokeDasharray={GRAPH_STYLES.referenceLineDash}
                  label={{ value: 'V_y', position: 'top', fill: GRAPH_STYLES.referenceLineColor }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

