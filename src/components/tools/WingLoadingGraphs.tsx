/**
 * Wing Loading Graphs Component
 * 
 * Three engineering graphs for the Wing Loading Calculator:
 * 1. Wing Loading vs Stall Speed
 * 2. Mission Envelope Wing Loading Bands
 * 3. Stall Speed vs Altitude (ISA)
 * 
 * Uses the same chart components and styling as LiftDragAnalyzer for consistency.
 */

"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { globalAxisTickStyle, globalAxisCommonProps, makeXAxisLabel, makeYAxisLabel } from "@/lib/chartAxisTheme";
import { ChartCard } from "@/components/charts/ChartCard";
import { isaAtAltitudeFeet } from "./utils/isaAtmosphere";

type MissionType = 'None' | 'UAV' | 'Trainer' | 'STOL' | 'Glider' | 'Jet';

const GRAVITY = 9.81; // m/s²
const KNOTS_TO_MS = 1.94384; // Conversion factor: 1 m/s = 1.94384 knots

interface WingLoadingGraphsProps {
  // Current calculation results
  currentWsKgm2: number;
  currentVsMs: number;
  currentVsKts: number;
  
  // Current configuration
  weightN: number;
  wingAreaM2: number;
  airDensity: number;
  clMax: number;
  missionType: MissionType;
  
  // Mission data for envelope graph
  missionData: Record<MissionType, { wsMinKg: number; wsMaxKg: number }>;
  
  // Air density mode info (for altitude graph)
  airDensityMode: 'preset' | 'altitude' | 'custom';
  airDensityPreset?: string;
  airDensityAltitude?: number;
}

/**
 * Custom tooltip for wing loading graphs
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-cyan-400/40 rounded-lg p-3 shadow-xl">
        <p className="text-cyan-400 font-semibold mb-2 text-sm">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-gray-200 font-medium" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value.toFixed(2)} ${entry.unit || ''}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function WingLoadingGraphs({
  currentWsKgm2,
  currentVsMs,
  currentVsKts,
  weightN,
  wingAreaM2,
  airDensity,
  clMax,
  missionType,
  missionData,
  airDensityMode,
  airDensityPreset,
  airDensityAltitude,
}: WingLoadingGraphsProps) {
  // Check if we have valid data for graphs
  const hasValidData = useMemo(() => {
    return (
      Number.isFinite(weightN) &&
      weightN > 0 &&
      Number.isFinite(wingAreaM2) &&
      wingAreaM2 > 0 &&
      Number.isFinite(airDensity) &&
      airDensity > 0 &&
      Number.isFinite(clMax) &&
      clMax > 0
    );
  }, [weightN, wingAreaM2, airDensity, clMax]);

  // Graph #1: Wing Loading vs Stall Speed
  // Formula: Vs = sqrt( (2 * (W/S)_N) / (rho * CL_max) )
  // where (W/S)_N = (W/S)_kg * g, and we don't need S separately
  // Units: wsKg in kg/m², wsNm2 in N/m², airDensity in kg/m³, vsMs in m/s
  const wsVsData = useMemo(() => {
    if (!hasValidData || !Number.isFinite(currentWsKgm2) || currentWsKgm2 <= 0) {
      return [];
    }

    const minWs = Math.max(5, currentWsKgm2 * 0.5);
    const maxWs = currentWsKgm2 * 2;
    const numPoints = 30;
    const data: Array<{ wsKg: number; vsMs: number; vsKts: number }> = [];

    for (let i = 0; i <= numPoints; i++) {
      const wsKg = minWs + (maxWs - minWs) * (i / numPoints); // kg/m²
      const wsNm2 = wsKg * GRAVITY; // Convert to N/m²: (kg/m²) * (m/s²) = N/m²
      // Vs = sqrt( (2 * (W/S)_N) / (rho * CL_max) )
      // No S needed here - W/S already accounts for it
      const vsMs = Math.sqrt((2 * wsNm2) / (airDensity * clMax)); // m/s
      const vsKts = vsMs * KNOTS_TO_MS; // knots
      data.push({ wsKg, vsMs, vsKts });
    }

    return data;
  }, [hasValidData, currentWsKgm2, airDensity, clMax]);

  // Graph #2: Mission Envelope Wing Loading Bands
  // Create data points for each mission showing the range
  const missionEnvelopeData = useMemo(() => {
    const missions: MissionType[] = ['UAV', 'Trainer', 'STOL', 'Glider', 'Jet'];
    const result: Array<{ mission: string; wsMinKg: number; wsMaxKg: number; wsCenter: number }> = [];
    
    missions.forEach((mission) => {
      const missionParams = missionData[mission];
      result.push({
        mission,
        wsMinKg: missionParams.wsMinKg,
        wsMaxKg: missionParams.wsMaxKg,
        wsCenter: (missionParams.wsMinKg + missionParams.wsMaxKg) / 2,
      });
    });
    
    return result;
  }, [missionData]);

  // Graph #3: Stall Speed vs Altitude (ISA)
  // Formula: Vs(h) = sqrt( (2 * W) / (rho(h) * S * CL_max) )
  // Units: weightN in N (newtons), density in kg/m³, wingAreaM2 in m², vsMs in m/s
  const altitudeData = useMemo(() => {
    if (!hasValidData) {
      return [];
    }

    const altitudes = [0, 2000, 5000, 8000, 10000, 12000, 15000]; // ft
    const data: Array<{ altitudeFt: number; vsMs: number; vsKts: number }> = [];

    for (const altFt of altitudes) {
      const { density } = isaAtAltitudeFeet(altFt); // density in kg/m³
      // Vs = sqrt( (2 * W) / (rho * S * CL_max) )
      // weightN is in N (newtons), not kg
      const vsMs = Math.sqrt((2 * weightN) / (density * wingAreaM2 * clMax)); // m/s
      const vsKts = vsMs * KNOTS_TO_MS; // knots
      data.push({ altitudeFt: altFt, vsMs, vsKts });
    }

    return data;
  }, [hasValidData, weightN, wingAreaM2, clMax]);

  // Get current altitude for reference line (if using altitude-based density)
  const currentAltitudeFt = useMemo(() => {
    if (airDensityMode === 'preset' && airDensityPreset) {
      const presetMap: Record<string, number> = {
        'ISA Sea Level': 0,
        '2000 ft': 2000,
        '5000 ft': 5000,
        '8000 ft': 8000,
        '10000 ft': 10000,
        '15000 ft': 15000,
      };
      return presetMap[airDensityPreset] ?? null;
    } else if (airDensityMode === 'altitude' && airDensityAltitude !== undefined) {
      return airDensityAltitude;
    }
    return null;
  }, [airDensityMode, airDensityPreset, airDensityAltitude]);

  if (!hasValidData) {
    return (
      <ChartCard title="Engineering Graphs" description="Enter weight and wing area to view graphs">
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Enter weight and wing area to view graphs</p>
        </div>
      </ChartCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Row: Two graphs side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph #1: Wing Loading vs Stall Speed */}
        <ChartCard
          title="Wing Loading vs Stall Speed"
          description="Relationship between wing loading and stall speed"
          height={380}
        >
        {wsVsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart
              data={wsVsData}
              margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="wsKg"
                type="number"
                {...globalAxisCommonProps}
                tick={globalAxisTickStyle}
                tickFormatter={(val) => val.toFixed(0)}
                height={34}
                label={makeXAxisLabel("Wing Loading (kg/m²)")}
                domain={[
                  (dataMin: number) => Math.max(0, dataMin * 0.9),
                  (dataMax: number) => dataMax * 1.1
                ]}
              />
              <YAxis
                {...globalAxisCommonProps}
                tick={globalAxisTickStyle}
                tickFormatter={(val) => val.toFixed(1)}
                width={70}
                label={makeYAxisLabel("Stall Speed (m/s)")}
                domain={[
                  (dataMin: number) => Math.max(0, dataMin * 0.9),
                  (dataMax: number) => dataMax * 1.1
                ]}
              />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(value: number, name: string) => {
                  if (name === 'vsMs') {
                    return [`${value.toFixed(2)} m/s (${(value * KNOTS_TO_MS).toFixed(1)} kts)`, 'Stall Speed'];
                  }
                  return [value.toFixed(2), name];
                }}
                labelFormatter={(label) => `W/S: ${label.toFixed(2)} kg/m²`}
              />
              <Line
                type="monotone"
                dataKey="vsMs"
                stroke="#22d3ee"
                strokeWidth={2.5}
                dot={false}
                name="Stall Speed"
                strokeOpacity={0.9}
              />
              {/* Highlight current design point */}
              {Number.isFinite(currentWsKgm2) && Number.isFinite(currentVsMs) && (
                <>
                  <ReferenceLine
                    x={currentWsKgm2}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    label={{ value: "Current", position: "insideTop", fill: "#10b981", fontSize: 10, fontWeight: 600 }}
                  />
                  <ReferenceLine
                    y={currentVsMs}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    label={{ value: `${currentVsMs.toFixed(1)} m/s`, position: "insideRight", fill: "#10b981", fontSize: 10, fontWeight: 600 }}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Calculate wing loading to view this graph</p>
          </div>
        )}
        </ChartCard>

        {/* Graph #2: Mission Envelope Wing Loading Bands */}
        <ChartCard
          title="Mission Wing Loading Envelopes"
          description="Typical wing loading ranges for different mission types"
          height={380}
        >
        <ResponsiveContainer width="100%" height={380}>
          <BarChart
            data={missionEnvelopeData}
            margin={{ top: 20, right: 30, bottom: 50, left: 90 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              type="number"
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              tickFormatter={(val) => val.toFixed(0)}
              height={34}
              label={makeXAxisLabel("Wing Loading (kg/m²)")}
              domain={[0, (dataMax: number) => dataMax * 1.1]}
            />
            <YAxis
              type="category"
              dataKey="mission"
              {...globalAxisCommonProps}
              tick={globalAxisTickStyle}
              width={90}
            />
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value: number, name: string) => {
                if (name === 'wsMinKg') return [value.toFixed(1), 'Min W/S (kg/m²)'];
                if (name === 'wsMaxKg') return [value.toFixed(1), 'Max W/S (kg/m²)'];
                if (name === 'wsCenter') return [value.toFixed(1), 'Center (kg/m²)'];
                return [value.toFixed(1), name];
              }}
              labelFormatter={(label) => `Mission: ${label}`}
            />
            {/* Draw range indicators using ReferenceArea for each mission */}
            {missionEnvelopeData.map((entry, index) => {
              const colors = [
                'rgba(34, 211, 238, 0.25)', // cyan-400
                'rgba(59, 130, 246, 0.25)', // blue-500
                'rgba(34, 211, 238, 0.35)', // cyan-400 brighter
                'rgba(59, 130, 246, 0.35)', // blue-500 brighter
                'rgba(34, 211, 238, 0.45)', // cyan-400 brightest
              ];
              return (
                <ReferenceArea
                  key={`range-${entry.mission}`}
                  y1={entry.mission}
                  y2={entry.mission}
                  x1={entry.wsMinKg}
                  x2={entry.wsMaxKg}
                  fill={colors[index % colors.length]}
                  stroke="rgba(34, 211, 238, 0.6)"
                  strokeWidth={1.5}
                />
              );
            })}
            {/* Show center point as bar */}
            <Bar dataKey="wsCenter" fill="#22d3ee" name="Center W/S" radius={[0, 4, 4, 0]} stroke="#06b6d4" strokeWidth={1}>
              {missionEnvelopeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#22d3ee" stroke="#06b6d4" />
              ))}
            </Bar>
            {/* Reference line for current wing loading */}
            {Number.isFinite(currentWsKgm2) && (
              <ReferenceLine
                x={currentWsKgm2}
                stroke="#10b981"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                label={{ value: `Current: ${currentWsKgm2.toFixed(1)}`, position: "insideTop", fill: "#10b981", fontSize: 10, fontWeight: 600 }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottom Row: Full width graph */}
      <div className="w-full">
        {/* Graph #3: Stall Speed vs Altitude (ISA) */}
        <ChartCard
          title="Stall Speed vs Altitude (ISA)"
          description="Effect of altitude on stall speed for current aircraft configuration"
          height={380}
        >
        {altitudeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart
              data={altitudeData}
              margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="altitudeFt"
                type="number"
                {...globalAxisCommonProps}
                tick={globalAxisTickStyle}
                tickFormatter={(val) => `${val.toFixed(0)}`}
                height={34}
                label={makeXAxisLabel("Altitude (ft)")}
                domain={[0, 15000]}
              />
              <YAxis
                {...globalAxisCommonProps}
                tick={globalAxisTickStyle}
                tickFormatter={(val) => val.toFixed(1)}
                width={70}
                label={makeYAxisLabel("Stall Speed (m/s)")}
                domain={[
                  (dataMin: number) => Math.max(0, dataMin * 0.9),
                  (dataMax: number) => dataMax * 1.1
                ]}
              />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(value: number, name: string) => {
                  if (name === 'vsMs') {
                    return [`${value.toFixed(2)} m/s (${(value * KNOTS_TO_MS).toFixed(1)} kts)`, 'Stall Speed'];
                  }
                  return [value.toFixed(2), name];
                }}
                labelFormatter={(label) => `Altitude: ${label} ft`}
              />
              <Line
                type="monotone"
                dataKey="vsMs"
                stroke="#22d3ee"
                strokeWidth={2.5}
                dot={false}
                name="Stall Speed"
                strokeOpacity={0.9}
              />
              {/* Highlight current altitude if applicable */}
              {currentAltitudeFt !== null && (
                <ReferenceLine
                  x={currentAltitudeFt}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  label={{ value: `Current: ${currentAltitudeFt} ft`, position: "insideTop", fill: "#10b981", fontSize: 10, fontWeight: 600 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Calculate stall speed to view this graph</p>
          </div>
        )}
        {airDensityMode === 'custom' && (
          <p className="mt-2 text-xs text-amber-400 italic text-center">
            Custom density – altitude curve shows ISA standard only
          </p>
        )}
        </ChartCard>
      </div>
    </div>
  );
}

