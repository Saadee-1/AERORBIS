/**
 * Thrust Loading Graphs Component
 * 
 * Two engineering graphs for the Thrust Loading Calculator:
 * 1. T/W vs Climb Rate (Expert mode only)
 * 2. Mission Thrust Loading Envelopes
 * 
 * Uses the same chart components and styling as WingLoadingGraphs for consistency.
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
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { globalAxisCommonProps } from "@/lib/chartAxisTheme";
import { ChartCard } from "@/components/charts/ChartCard";
import * as htmlToImage from 'html-to-image';
import { Button } from "@/components/ui/button";

type MissionType = 'None' | 'UAV' | 'Trainer' | 'STOL' | 'Glider' | 'Jet';

// High-contrast graph styling constants (same as WingLoadingGraphs)
const GRAPH_STYLES = {
  curveStroke: '#ff4df0', // Magenta/pink
  curveStrokeWidth: 2.8,
  markerFill: '#ff4df0',
  markerStroke: '#fff',
  markerStrokeWidth: 1.4,
  markerRadius: 5.5,
  gridStroke: 'rgba(255,255,255,0.12)',
  axisTickText: 'rgba(255,255,255,0.85)',
  axisLabelText: '#fff',
  referenceLineColor: '#fbbf24', // Yellow for dotted lines
  referenceLineDash: '6 6',
  referenceMarkerStroke: '#ff4df0',
  referenceMarkerFill: '#ff4df0',
  tooltipBg: 'rgba(20, 20, 20, 0.92)',
  tooltipText: '#00eaff',
  currentLabelColor: '#22d3ee', // Cyan for "Current" label
  valueLabelColor: '#22d3ee', // Cyan for value labels
  envelopeBarColor: '#8b5cf6', // Purple for mission envelope bars
} as const;

interface ThrustLoadingGraphsProps {
  // Current calculation results
  currentTW: number;
  currentROC?: number; // Expert mode: current rate of climb (m/s)
  
  // Expert mode climb inputs
  vClimb?: number; // Climb velocity (m/s)
  ldClimb?: number; // Lift-to-drag ratio during climb
  
  // Mission data for envelope graph
  missionThrustData: Record<MissionType, { twMin: number; twMax: number }>;
  missionType: MissionType;
  
  // Calculator mode
  calculatorMode: 'Beginner' | 'University' | 'Expert';
}

/**
 * Custom tooltip for thrust loading graphs
 */
// TODO: refine type for `CustomTooltip` — changed any -> unknown automatically by chore/typed-cleanup
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: unknown }) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="backdrop-blur-sm border rounded-lg p-3 shadow-xl"
        style={{ 
          background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(30, 30, 35, 0.92) 100%)',
          borderColor: `${GRAPH_STYLES.tooltipText}30`
        }}
      >
        <p className="font-semibold mb-2 text-sm" style={{ color: GRAPH_STYLES.tooltipText }}>
          {`${label}`}
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

/**
 * High-contrast axis tick style
 */
const highContrastAxisTickStyle = {
  fontSize: 10,
  fill: GRAPH_STYLES.axisTickText,
};

/**
 * High-contrast axis label style
 */
const makeHighContrastXAxisLabel = (text: string) => ({
  value: text,
  position: "insideBottom" as const,
  offset: -2,
  style: {
    textAnchor: "middle" as const,
    fontSize: 11,
    fill: GRAPH_STYLES.axisLabelText,
  },
});

const makeHighContrastYAxisLabel = (text: string) => ({
  value: text,
  angle: -90,
  position: "insideLeft" as const,
  offset: -4,
  style: {
    textAnchor: "middle" as const,
    fontSize: 11,
    fill: GRAPH_STYLES.axisLabelText,
  },
});

export function ThrustLoadingGraphs({
  currentTW,
  currentROC,
  vClimb,
  ldClimb,
  missionThrustData,
  missionType,
  calculatorMode,
}: ThrustLoadingGraphsProps) {
  
  // Graph A: T/W vs Climb Rate (Expert mode only, requires valid climb inputs)
  const hasValidClimbInputs = useMemo(() => {
    return (
      calculatorMode === 'Expert' &&
      vClimb !== undefined &&
      vClimb > 0 &&
      ldClimb !== undefined &&
      ldClimb > 0 &&
      Number.isFinite(vClimb) &&
      Number.isFinite(ldClimb)
    );
  }, [calculatorMode, vClimb, ldClimb]);

  const twRocData = useMemo(() => {
    if (!hasValidClimbInputs || !Number.isFinite(currentTW) || currentTW <= 0) {
      return [];
    }

    const minTw = Math.max(0.05, currentTW * 0.5);
    const maxTw = currentTW * 2;
    const numPoints = 30;
    const data: Array<{ tw: number; rocMs: number }> = [];

    for (let i = 0; i <= numPoints; i++) {
      const tw = minTw + (maxTw - minTw) * (i / numPoints);
      // gamma = T/W - 1/(L/D) (climb gradient in radians, small angle approximation)
      const gamma = Math.max(0, tw - (1 / ldClimb!));
      // ROC = V_climb * sin(gamma)
      // For small angles, sin(gamma) ≈ gamma, so ROC ≈ V_climb * gamma
      const rocMs = gamma > 0 ? vClimb! * Math.sin(gamma) : 0;
      data.push({ tw, rocMs });
    }

    return data;
  }, [hasValidClimbInputs, currentTW, vClimb, ldClimb]);

  // Graph B: Mission Thrust Loading Envelopes
  const missionEnvelopeData = useMemo(() => {
    const missions: Exclude<MissionType, 'None'>[] = ['UAV', 'Trainer', 'STOL', 'Glider', 'Jet'];
    const result: Array<{ mission: string; twMin: number; twMax: number; twCenter: number; twRange: number }> = [];
    
    missions.forEach((mission) => {
      const missionParams = missionThrustData[mission];
      result.push({
        mission,
        twMin: missionParams.twMin,
        twMax: missionParams.twMax,
        twCenter: (missionParams.twMin + missionParams.twMax) / 2,
        twRange: missionParams.twMax - missionParams.twMin,
      });
    });
    
    return result;
  }, [missionThrustData]);

  // Calculate max T/W for X-axis domain
  const maxTw = useMemo(() => {
    if (missionEnvelopeData.length === 0) return 1.0;
    return Math.max(...missionEnvelopeData.map(m => m.twMax)) * 1.1;
  }, [missionEnvelopeData]);

  // Graph export handlers - refs for each graph
  const graph1Ref = useRef<HTMLDivElement | null>(null);
  const graph2Ref = useRef<HTMLDivElement | null>(null);

  const handleSavePng = (graphRef: React.RefObject<HTMLDivElement>, title: string) => {
    if (!graphRef.current) return;
    htmlToImage.toPng(graphRef.current).then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    }).catch((err) => {
      console.error('PNG export error:', err);
    });
  };

  const handleSaveSvg = (graphRef: React.RefObject<HTMLDivElement>, title: string) => {
    if (!graphRef.current) return;
    htmlToImage.toSvg(graphRef.current).then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}.svg`;
      link.href = dataUrl;
      link.click();
    }).catch((err) => {
      console.error('SVG export error:', err);
    });
  };

  const ExportButtons = ({ graphRef, title }: { graphRef: React.RefObject<HTMLDivElement>; title: string }) => (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleSavePng(graphRef, title)}
        className="h-7 px-2 text-xs border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10"
      >
        📥 PNG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleSaveSvg(graphRef, title)}
        className="h-7 px-2 text-xs border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10"
      >
        💾 SVG
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Graph B: Mission Thrust Loading Envelopes (University and Expert modes) */}
      {(calculatorMode === 'University' || calculatorMode === 'Expert') && (
        <ChartCard
          title="Mission Thrust Loading Envelopes"
          description="Typical T/W ranges for different mission types"
          height={350}
          headerActions={<ExportButtons graphRef={graph2Ref} title="Mission_Thrust_Loading_Envelopes" />}
        >
        <div ref={graph2Ref}>
          {missionEnvelopeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={missionEnvelopeData}
                layout="vertical"
                margin={{ top: 20, right: 30, bottom: 50, left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRAPH_STYLES.gridStroke} />
                <XAxis
                  type="number"
                  {...globalAxisCommonProps}
                  tick={highContrastAxisTickStyle}
                  tickFormatter={(val) => val.toFixed(2)}
                  domain={[0, maxTw]}
                  label={makeHighContrastXAxisLabel("Thrust-to-Weight Ratio (T/W)")}
                />
                <YAxis
                  type="category"
                  dataKey="mission"
                  {...globalAxisCommonProps}
                  tick={highContrastAxisTickStyle}
                  width={70}
                  label={makeHighContrastYAxisLabel("Mission Type")}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: "rgba(10, 15, 25, 0.92)",
                    border: "1px solid rgba(168, 85, 247, 0.45)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    boxShadow: "0 0 8px rgba(168, 85, 247, 0.4)"
                  }}
                  labelStyle={{ color: "#22d3ee", fontWeight: 600 }}
                  itemStyle={{ color: "#c084fc", fontWeight: 500 }}
                  formatter={(value: number, name: string, props: { payload?: { twMin: number; twMax: number } }) => {
                    if (name === 'twRange' && props.payload) {
                      return [`${props.payload.twMin.toFixed(2)}–${props.payload.twMax.toFixed(2)}`, 'T/W Range'];
                    }
                    return [value.toFixed(2), name];
                  }}
                  labelFormatter={(label) => `Mission: ${label}`}
                />
                {/* Bar showing the range - positioned at twMin with width = twRange */}
                <Bar
                  dataKey="twRange"
                  barSize={18}
                  radius={[0, 4, 4, 0]}
                >
                  {missionEnvelopeData.map((entry, index) => {
                    const isSelected = entry.mission === missionType;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isSelected ? '#c084fc' : GRAPH_STYLES.envelopeBarColor}
                        opacity={isSelected ? 0.85 : 0.65}
                      />
                    );
                  })}
                </Bar>
                {/* Reference line for current T/W */}
                {Number.isFinite(currentTW) && currentTW > 0 && (
                  <ReferenceLine
                    x={currentTW}
                    stroke={GRAPH_STYLES.referenceLineColor}
                    strokeDasharray={GRAPH_STYLES.referenceLineDash}
                    label={{
                      value: "Current",
                      position: "top",
                      fill: GRAPH_STYLES.currentLabelColor,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>No mission data available</p>
            </div>
          )}
        </div>
      </ChartCard>
      )}

      {/* Graph A: T/W vs Climb Rate (Expert mode only) */}
      {calculatorMode === 'Expert' && (
        <ChartCard
          title="Thrust-to-Weight vs Climb Rate"
          description="Relationship between T/W and climb performance (approximate)"
          height={380}
          headerActions={hasValidClimbInputs ? <ExportButtons graphRef={graph1Ref} title="Thrust_to_Weight_vs_Climb_Rate" /> : undefined}
        >
          {hasValidClimbInputs && twRocData.length > 0 ? (
            <div ref={graph1Ref}>
              <ResponsiveContainer width="100%" height={380}>
                <LineChart
                  data={twRocData}
                  margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRAPH_STYLES.gridStroke} />
                  <XAxis
                    dataKey="tw"
                    type="number"
                    {...globalAxisCommonProps}
                    tick={highContrastAxisTickStyle}
                    tickFormatter={(val) => val.toFixed(2)}
                    height={34}
                    label={makeHighContrastXAxisLabel("Thrust-to-Weight Ratio (T/W)")}
                    domain={[
                      (dataMin: number) => Math.max(0, dataMin * 0.9),
                      (dataMax: number) => dataMax * 1.1
                    ]}
                  />
                  <YAxis
                    {...globalAxisCommonProps}
                    tick={highContrastAxisTickStyle}
                    tickFormatter={(val) => val.toFixed(1)}
                    width={60}
                    label={makeHighContrastYAxisLabel("Climb Rate (m/s)")}
                    domain={[
                      (dataMin: number) => Math.max(0, dataMin * 0.9),
                      (dataMax: number) => dataMax * 1.1
                    ]}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    contentStyle={{
                      backgroundColor: GRAPH_STYLES.tooltipBg,
                      border: `1px solid ${GRAPH_STYLES.tooltipText}30`,
                      borderRadius: '8px',
                    }}
                    labelStyle={{
                      color: GRAPH_STYLES.tooltipText,
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                    itemStyle={{
                      color: GRAPH_STYLES.tooltipText,
                      fontSize: '11px',
                    }}
                    formatter={(value: number) => [value.toFixed(2), 'ROC (m/s)']}
                    labelFormatter={(label) => `T/W: ${parseFloat(label).toFixed(3)}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="rocMs"
                    stroke={GRAPH_STYLES.curveStroke}
                    strokeWidth={GRAPH_STYLES.curveStrokeWidth}
                    dot={false}
                    activeDot={{ r: GRAPH_STYLES.markerRadius }}
                  />
                  {/* Reference line at current T/W */}
                  {Number.isFinite(currentTW) && currentTW > 0 && (
                    <ReferenceLine
                      x={currentTW}
                      stroke={GRAPH_STYLES.referenceLineColor}
                      strokeDasharray={GRAPH_STYLES.referenceLineDash}
                      label={{
                        value: "Current",
                        position: "top",
                        fill: GRAPH_STYLES.currentLabelColor,
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    />
                  )}
                  {/* Reference line at current ROC */}
                  {currentROC !== undefined && Number.isFinite(currentROC) && currentROC > 0 && (
                    <ReferenceLine
                      y={currentROC}
                      stroke={GRAPH_STYLES.referenceLineColor}
                      strokeDasharray={GRAPH_STYLES.referenceLineDash}
                      label={{
                        value: `${currentROC.toFixed(1)} m/s`,
                        position: "right",
                        fill: GRAPH_STYLES.valueLabelColor,
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Enter climb speed and L/D in Expert mode to see this graph.</p>
            </div>
          )}
        </ChartCard>
      )}
    </div>
  );
}

