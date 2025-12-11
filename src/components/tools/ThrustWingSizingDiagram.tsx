/**
 * T/W vs W/S Sizing Diagram Component
 * 
 * Engineering sizing diagram showing:
 * - Climb constraint line (horizontal): T/W = 1/(L/D) + gamma
 * - Current design point (W/S, T/W)
 * 
 * Expert mode only - requires W/S from designSession and T/W from calculation
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
  ReferenceDot,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { globalAxisCommonProps, globalAxisTickStyle, makeXAxisLabel, makeYAxisLabel } from "@/lib/chartAxisTheme";
import { ChartCard } from "@/components/charts/ChartCard";
import * as htmlToImage from 'html-to-image';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

// High-contrast graph styling constants (same as ThrustLoadingGraphs)
const GRAPH_STYLES = {
  gridStroke: 'rgba(255,255,255,0.12)',
  axisTickText: 'rgba(255,255,255,0.85)',
  axisLabelText: '#fff',
  constraintLineColor: '#fbbf24', // Yellow for constraint lines
  constraintLineDash: '6 6',
  constraintLineWidth: 2.5,
  designPointColor: '#f97316', // Orange for design point
  designPointFill: '#f97316',
  designPointStroke: '#fff',
  designPointRadius: 6,
  tooltipBg: 'rgba(20, 20, 20, 0.92)',
  tooltipText: '#00eaff',
} as const;

// Graph domain configuration
const GRAPH_DOMAINS = {
  margin: { top: 20, right: 20, bottom: 60, left: 70 },
  yAxis: {
    tick: {
      fontSize: 10,
      fill: GRAPH_STYLES.axisTickText,
    },
    tickFormatter: (value: number) => value.toFixed(2),
  },
} as const;

interface SizingPoint {
  ws: number;        // W/S (kg/m²)
  twClimb?: number;  // required T/W for climb
  twCruise?: number; // required T/W for cruise
  twTakeoff?: number; // required T/W for takeoff
  twRequired?: number; // combined required T/W from all applicable constraints at this W/S
}

interface ThrustWingSizingDiagramProps {
  // Current design point
  wingLoadingKgm2?: number; // W/S from designSession (kg/m²)
  thrustToWeight?: number; // T/W from current calculation
  
  // Climb constraint parameters (Expert mode)
  ldClimb?: number; // L/D during climb
  gammaReq: number; // Required climb gradient (dimensionless)
  
  // Cruise constraint parameters (Expert mode)
  cd0?: number; // Zero-lift drag coefficient
  k?: number; // Induced drag factor
  vCruiseMs?: number; // Cruise speed in m/s
  densityKgM3?: number; // Air density in kg/m³
  
  // Stall constraint parameters (from Wing Loading via designSession)
  stallSpeedMs?: number; // Stall speed in m/s
  clMaxUsed?: number; // Maximum lift coefficient used
  
  // Takeoff constraint parameters (Expert mode)
  takeoffRunwayMeters?: number; // Required takeoff distance in meters
  clTo?: number; // Takeoff lift coefficient
  muRoll?: number; // Rolling friction coefficient
  
  // Calculator mode
  calculatorMode: 'Beginner' | 'University' | 'Expert';
}

/**
 * Compute required T/W for climb constraint
 * T/W = 1/(L/D) + gamma
 */
function computeClimbTwRequired(ldClimb: number, gammaReq: number): number {
  if (!isFinite(ldClimb) || ldClimb <= 0) return NaN;
  return 1 / ldClimb + gammaReq;
}

/**
 * Custom tooltip for sizing diagram
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
          {`W/S = ${label.toFixed(1)} kg/m²`}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color || GRAPH_STYLES.tooltipText }}>
            {`${entry.name}: ${entry.value.toFixed(3)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ThrustWingSizingDiagram: React.FC<ThrustWingSizingDiagramProps> = ({
  wingLoadingKgm2,
  thrustToWeight,
  ldClimb,
  gammaReq,
  cd0,
  k,
  vCruiseMs,
  densityKgM3,
  stallSpeedMs,
  clMaxUsed,
  takeoffRunwayMeters,
  clTo,
  muRoll,
  calculatorMode,
}) => {
  const graphRef = useRef<HTMLDivElement>(null);

  // Only show in Expert mode
  if (calculatorMode !== 'Expert') {
    return null;
  }

  // Determine effective L/D for climb
  const ldClimbEffective = ldClimb && ldClimb > 0 ? ldClimb : undefined;

  // Calculate climb constraint T/W
  const twClimbRequired = useMemo(() => {
    if (!ldClimbEffective || !isFinite(gammaReq)) return NaN;
    return computeClimbTwRequired(ldClimbEffective, gammaReq);
  }, [ldClimbEffective, gammaReq]);

  // Validate cruise inputs
  const hasCruiseInputs =
    typeof cd0 === 'number' &&
    cd0 > 0 &&
    typeof k === 'number' &&
    k > 0 &&
    typeof vCruiseMs === 'number' &&
    vCruiseMs > 0 &&
    typeof densityKgM3 === 'number' &&
    densityKgM3 > 0;

  // Validate takeoff inputs
  const hasTakeoffInputs =
    typeof densityKgM3 === 'number' &&
    densityKgM3 > 0 &&
    typeof takeoffRunwayMeters === 'number' &&
    takeoffRunwayMeters > 0 &&
    typeof clTo === 'number' &&
    clTo > 0 &&
    typeof muRoll === 'number' &&
    muRoll >= 0 &&
    muRoll < 0.3;

  // Constants for takeoff calculation
  const g = 9.81;
  const rho0 = 1.225;
  const sigma = useMemo(() => {
    if (typeof densityKgM3 === 'number' && densityKgM3 > 0) {
      return densityKgM3 / rho0;
    }
    return 1.0;
  }, [densityKgM3]);
  const K_TO = 20; // Aggregated empirical constant (Raymer-inspired)

  // Compute dynamic pressure for cruise
  const q = useMemo(() => {
    if (!hasCruiseInputs) return NaN;
    return 0.5 * densityKgM3! * vCruiseMs! * vCruiseMs!;
  }, [hasCruiseInputs, densityKgM3, vCruiseMs]);

  // Compute stall-based W/S limit
  const wsStallMax = useMemo(() => {
    if (
      typeof densityKgM3 === 'number' &&
      densityKgM3 > 0 &&
      typeof stallSpeedMs === 'number' &&
      stallSpeedMs > 0 &&
      typeof clMaxUsed === 'number' &&
      clMaxUsed > 0
    ) {
      // Compute in N/m² first: W/S = 0.5 * rho * V_s² * C_Lmax
      const wsStallMaxN = 0.5 * densityKgM3 * stallSpeedMs * stallSpeedMs * clMaxUsed;
      // Convert from N/m² to kg/m²
      const g = 9.81;
      return wsStallMaxN / g;
    }
    return undefined;
  }, [densityKgM3, stallSpeedMs, clMaxUsed]);

  // Determine W/S range
  const wsDesign = wingLoadingKgm2 && wingLoadingKgm2 > 0 ? wingLoadingKgm2 : undefined;
  let wsMin = wsDesign ? Math.max(10, wsDesign * 0.4) : 20;
  let wsMax = wsDesign ? wsDesign * 1.8 : 200;
  
  // Adjust range to include stall limit if valid
  if (wsStallMax !== undefined && Number.isFinite(wsStallMax)) {
    wsMin = Math.min(wsMin, wsStallMax * 0.6);
    wsMax = Math.max(wsMax, wsStallMax * 1.4);
  }

  // Generate chart data: horizontal constraint line and cruise curve
  const chartData = useMemo((): SizingPoint[] => {
    if (!isFinite(twClimbRequired)) return [];
    
    const numPoints = 50;
    const wsStep = (wsMax - wsMin) / numPoints;
    const data: SizingPoint[] = [];
    const g = 9.81; // Gravitational acceleration
    
    for (let i = 0; i <= numPoints; i++) {
      const wsKg = wsMin + i * wsStep;
      const point: SizingPoint = {
        ws: wsKg,
        twClimb: twClimbRequired,
      };
      
      // Compute cruise T/W if inputs are valid
      if (hasCruiseInputs && Number.isFinite(q)) {
        const wsN = wsKg * g; // Convert W/S from kg/m² to N/m²
        const twCruise = cd0! * q / wsN + k! * wsN / q;
        if (Number.isFinite(twCruise) && twCruise > 0) {
          point.twCruise = twCruise;
        }
      }
      
      // Compute takeoff T/W if inputs are valid
      if (hasTakeoffInputs) {
        const wsN = wsKg * g; // Convert W/S from kg/m² to N/m²
        const numerator = wsN; // W/S_N
        const denominator = sigma * clTo! * K_TO * takeoffRunwayMeters!;
        const twTakeoff = muRoll! + (denominator > 0 ? numerator / denominator : NaN);
        
        if (Number.isFinite(twTakeoff) && twTakeoff > 0) {
          point.twTakeoff = twTakeoff;
        }
      }
      
      // Compute combined required T/W as maximum of all valid constraints
      let twReq = -Infinity;
      
      // Only consider valid constraints
      if (typeof point.twClimb === 'number' && Number.isFinite(point.twClimb) && point.twClimb > 0) {
        twReq = Math.max(twReq, point.twClimb);
      }
      
      if (typeof point.twCruise === 'number' && Number.isFinite(point.twCruise) && point.twCruise > 0) {
        twReq = Math.max(twReq, point.twCruise);
      }
      
      if (typeof point.twTakeoff === 'number' && Number.isFinite(point.twTakeoff) && point.twTakeoff > 0) {
        twReq = Math.max(twReq, point.twTakeoff);
      }
      
      if (twReq > 0 && Number.isFinite(twReq)) {
        point.twRequired = twReq;
      }
      
      data.push(point);
    }
    
    return data;
  }, [wsMin, wsMax, twClimbRequired, hasCruiseInputs, q, cd0, k, hasTakeoffInputs, sigma, clTo, takeoffRunwayMeters, muRoll]);

  // Determine axis ranges
  const twMin = isFinite(twClimbRequired) 
    ? Math.max(0, twClimbRequired * 0.5)
    : (thrustToWeight && thrustToWeight > 0 ? Math.max(0, thrustToWeight * 0.5) : 0);
  const twMax = Math.max(
    isFinite(twClimbRequired) ? twClimbRequired * 1.5 : 0,
    thrustToWeight && thrustToWeight > 0 ? thrustToWeight * 1.5 : 0.5
  );

  // Export function
  const handleExport = async () => {
    if (!graphRef.current) return;
    
    try {
      const dataUrl = await htmlToImage.toPng(graphRef.current, {
        backgroundColor: '#0f172a',
        pixelRatio: 2,
      });
      
      const link = document.createElement('a');
      link.download = `T_W_vs_W_S_Sizing_Diagram.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export graph:', error);
    }
  };

  // Check if we have valid data to show
  const hasValidData = isFinite(twClimbRequired) && chartData.length > 0;
  const hasDesignPoint = wsDesign && thrustToWeight && isFinite(thrustToWeight);
  
  // Compute climb pass/fail status
  const currentTw = thrustToWeight && isFinite(thrustToWeight) ? thrustToWeight : undefined;
  const currentWs = wsDesign;
  
  let climbStatus: 'unknown' | 'pass' | 'fail' = 'unknown';
  if (Number.isFinite(twClimbRequired) && currentTw !== undefined && Number.isFinite(currentTw)) {
    climbStatus = currentTw + 1e-6 >= twClimbRequired ? 'pass' : 'fail';
  }
  
  // Compute stall pass/fail status
  let stallStatus: 'unknown' | 'pass' | 'fail' = 'unknown';
  if (wsStallMax !== undefined && Number.isFinite(wsStallMax) && wsDesign !== undefined) {
    stallStatus = wsDesign <= wsStallMax + 1e-6 ? 'pass' : 'fail';
  }

  // Evaluate combined requirement and margin at design point
  let twRequiredAtDesign: number | undefined;
  let twClimbAtDesign: number | undefined;
  let twCruiseAtDesign: number | undefined;
  let twTakeoffAtDesign: number | undefined;

  if (
    wsDesign !== undefined &&
    Number.isFinite(wsDesign) &&
    chartData.length > 0
  ) {
    let closestPoint = chartData[0];
    let minDelta = Math.abs(chartData[0].ws - wsDesign);

    for (const p of chartData) {
      const delta = Math.abs(p.ws - wsDesign);
      if (delta < minDelta) {
        minDelta = delta;
        closestPoint = p;
      }
    }

    twRequiredAtDesign = closestPoint.twRequired;
    twClimbAtDesign = closestPoint.twClimb;
    twCruiseAtDesign = closestPoint.twCruise;
    twTakeoffAtDesign = closestPoint.twTakeoff;
  }

  // Compute margin
  let twMargin: number | undefined = undefined;

  if (
    typeof thrustToWeight === 'number' &&
    Number.isFinite(thrustToWeight) &&
    typeof twRequiredAtDesign === 'number' &&
    Number.isFinite(twRequiredAtDesign)
  ) {
    twMargin = thrustToWeight - twRequiredAtDesign;
  }

  // Identify limiting constraint
  type LimitingConstraint = 'climb' | 'cruise' | 'takeoff' | 'none' | 'unknown';

  let limitingConstraint: LimitingConstraint = 'unknown';

  if (twRequiredAtDesign !== undefined && Number.isFinite(twRequiredAtDesign)) {
    let maxTw = -Infinity;
    let which: LimitingConstraint = 'none';

    if (twClimbAtDesign && Number.isFinite(twClimbAtDesign) && twClimbAtDesign > 0) {
      if (twClimbAtDesign > maxTw) {
        maxTw = twClimbAtDesign;
        which = 'climb';
      }
    }

    if (twCruiseAtDesign && Number.isFinite(twCruiseAtDesign) && twCruiseAtDesign > 0) {
      if (twCruiseAtDesign > maxTw) {
        maxTw = twCruiseAtDesign;
        which = 'cruise';
      }
    }

    if (twTakeoffAtDesign && Number.isFinite(twTakeoffAtDesign) && twTakeoffAtDesign > 0) {
      if (twTakeoffAtDesign > maxTw) {
        maxTw = twTakeoffAtDesign;
        which = 'takeoff';
      }
    }

    limitingConstraint = which === 'none' ? 'unknown' : which;
  }

  if (!hasValidData) {
    return (
      <ChartCard
        title="Sizing Diagram: T/W vs W/S"
        description="Early sizing view using current wing loading, thrust loading, and climb requirements."
        height={260}
      >
        <div className="flex items-center justify-center h-full py-12">
          <p className="text-xs text-slate-300">
            Enter a valid climb L/D and compute thrust loading to view the sizing diagram.
          </p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Sizing Diagram: T/W vs W/S"
      description="Early sizing view using current wing loading, thrust loading, and climb requirements."
      height={400}
      headerActions={
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      }
    >
      <div ref={graphRef} className="w-full pb-12">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={GRAPH_DOMAINS.margin}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRAPH_STYLES.gridStroke} />
            
            <XAxis
              {...globalAxisCommonProps}
              dataKey="ws"
              type="number"
              domain={[wsMin, wsMax]}
              tick={GRAPH_DOMAINS.yAxis.tick}
              label={{
                value: 'Wing Loading W/S (kg/m²)',
                position: 'insideBottom',
                dy: 22,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            
            <YAxis
              {...globalAxisCommonProps}
              type="number"
              domain={[twMin, twMax]}
              tick={GRAPH_DOMAINS.yAxis.tick}
              tickFormatter={GRAPH_DOMAINS.yAxis.tickFormatter}
              width={80}
              label={{
                value: 'Thrust-to-Weight Ratio (T/W)',
                angle: -90,
                position: 'insideLeft',
                dy: -12,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            
            <Tooltip 
              content={<CustomTooltip />}
              contentStyle={{
                background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(30, 30, 35, 0.92) 100%)',
                borderColor: `${GRAPH_STYLES.tooltipText}30`,
              }}
            />
            
            {/* Feasible region shading above climb constraint line */}
            {isFinite(twClimbRequired) && (
              <ReferenceArea
                y1={twClimbRequired}
                y2={twMax}
                fill="rgba(34, 197, 94, 0.08)"
                stroke="none"
              />
            )}
            
            {/* Stall limit vertical line and shading */}
            {wsStallMax !== undefined && Number.isFinite(wsStallMax) && (
              <>
                {/* Vertical stall/landing W/S limit */}
                <ReferenceLine
                  x={wsStallMax}
                  stroke="#fb7185"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'Stall limit',
                    position: 'insideTop',
                    fill: '#fecaca',
                    fontSize: 10,
                  }}
                />
                
                {/* Shading to the right of the stall limit */}
                <ReferenceArea
                  x1={wsStallMax}
                  x2={wsMax}
                  y1={twMin}
                  y2={twMax}
                  fill="rgba(248, 113, 113, 0.08)"
                  stroke="none"
                />
              </>
            )}
            
            {/* Climb constraint line (horizontal) */}
            <Line
              type="monotone"
              dataKey="twClimb"
              stroke={GRAPH_STYLES.constraintLineColor}
              strokeDasharray={GRAPH_STYLES.constraintLineDash}
              strokeWidth={GRAPH_STYLES.constraintLineWidth}
              dot={false}
              name="Climb Constraint"
              isAnimationActive={false}
            />
            
            {/* Cruise constraint curve */}
            {hasCruiseInputs && (
              <Line
                type="monotone"
                dataKey="twCruise"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                name="Cruise Constraint"
                isAnimationActive={false}
              />
            )}
            
            {/* Takeoff constraint curve */}
            {hasTakeoffInputs && (
              <Line
                type="monotone"
                dataKey="twTakeoff"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                name="Takeoff Constraint"
                isAnimationActive={false}
              />
            )}
            
            {/* Combined required T/W envelope */}
            <Line
              type="monotone"
              dataKey="twRequired"
              stroke="#e5e7eb"
              strokeWidth={2.5}
              dot={false}
              name="Required T/W (combined)"
              strokeDasharray="6 3"
              isAnimationActive={false}
            />
            
            {/* Current design point marker */}
            {hasDesignPoint && (
              <ReferenceDot
                x={wsDesign}
                y={thrustToWeight}
                r={GRAPH_STYLES.designPointRadius}
                fill={climbStatus === 'pass' ? '#22c55e' : climbStatus === 'fail' ? '#ef4444' : GRAPH_STYLES.designPointFill}
                stroke={climbStatus === 'pass' ? '#4ade80' : climbStatus === 'fail' ? '#fb7185' : GRAPH_STYLES.designPointStroke}
                strokeWidth={2}
                label={{
                  value: climbStatus === 'pass' ? 'Design point' : climbStatus === 'fail' ? 'Below climb line' : 'Design point',
                  position: 'insideTop',
                  fill: climbStatus === 'pass' ? '#4ade80' : climbStatus === 'fail' ? '#fca5a5' : GRAPH_STYLES.designPointFill,
                  fontSize: 10,
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="mt-6 mb-2 flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 border-t-2"
              style={{
                borderColor: GRAPH_STYLES.constraintLineColor,
                borderStyle: 'dashed',
              }}
            />
            <span className="text-gray-300">
              Climb Constraint: T/W ≥ {twClimbRequired.toFixed(3)}
            </span>
          </div>
          {hasCruiseInputs && (
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 border-t-2"
                style={{
                  borderColor: '#f97316',
                  borderStyle: 'solid',
                }}
              />
              <span className="text-gray-300">
                Cruise Constraint
              </span>
            </div>
          )}
          {hasTakeoffInputs && (
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 border-t-2"
                style={{
                  borderColor: '#38bdf8',
                  borderStyle: 'solid',
                }}
              />
              <span className="text-gray-300">
                Takeoff Constraint
              </span>
            </div>
          )}
          {hasDesignPoint && (
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{
                  backgroundColor: climbStatus === 'pass' ? '#22c55e' : climbStatus === 'fail' ? '#ef4444' : GRAPH_STYLES.designPointFill,
                  borderColor: climbStatus === 'pass' ? '#4ade80' : climbStatus === 'fail' ? '#fb7185' : GRAPH_STYLES.designPointStroke,
                }}
              />
              <span className="text-gray-300">
                Design Point: W/S = {wsDesign.toFixed(1)} kg/m², T/W = {thrustToWeight.toFixed(3)}
              </span>
            </div>
          )}
        </div>
        
        {/* Pass/Fail Caption */}
        <div className="mt-3 text-sm">
          {climbStatus === 'pass' && (
            <p className="text-emerald-300">
              ✓ Current T/W meets or exceeds the climb requirement at this wing loading.
            </p>
          )}
          
          {climbStatus === 'fail' && (
            <p className="text-rose-300">
              ✕ Current T/W is below the climb requirement at this wing loading. Consider increasing thrust or reducing W/S.
            </p>
          )}
          
          {climbStatus === 'unknown' && (
            <p className="text-slate-400">
              Compute T/W and provide a valid climb L/D to evaluate climb feasibility.
            </p>
          )}
          
          {hasCruiseInputs && (
            <p className="mt-1 text-[0.7rem] text-slate-400">
              Cruise curve shows T/W required to balance drag at the selected speed and drag polar.
            </p>
          )}
          
          {hasTakeoffInputs && (
            <p className="mt-1 text-[0.7rem] text-slate-400">
              Takeoff curve shows T/W required to meet the runway length with the selected C_L_TO and rolling friction.
            </p>
          )}
        </div>
        
        {/* Stall Constraint Caption */}
        <div className="mt-1 text-[0.7rem]">
          {stallStatus === 'pass' && wsStallMax !== undefined && Number.isFinite(wsStallMax) && (
            <p className="text-emerald-300">
              ✓ Current wing loading is within the stall/landing limit.
            </p>
          )}
          
          {stallStatus === 'fail' && wsStallMax !== undefined && Number.isFinite(wsStallMax) && (
            <p className="text-rose-300">
              ✕ Current wing loading exceeds the stall/landing-based W/S limit. Consider increasing wing area or CL_max, or accepting a higher stall/approach speed.
            </p>
          )}
          
          {stallStatus === 'unknown' && (
            <p className="text-slate-400">
              Run the Wing Loading calculator to provide stall speed, CL_max, and density for stall/landing constraints.
            </p>
          )}
        </div>
        
        {/* Combined constraint summary */}
        <div className="mt-2 text-[0.75rem]">
          {twMargin !== undefined &&
            twRequiredAtDesign !== undefined &&
            Number.isFinite(twRequiredAtDesign) &&
            Number.isFinite(twMargin) &&
            thrustToWeight !== undefined &&
            Number.isFinite(thrustToWeight) && (
              <>
                {twMargin >= 0 ? (
                  <p className="text-emerald-300">
                    ✓ At W/S ≈ {wsDesign?.toFixed(1)} kg/m², combined required T/W is{' '}
                    {twRequiredAtDesign.toFixed(3)}, current T/W is{' '}
                    {thrustToWeight.toFixed(3)}, margin ≈ {twMargin.toFixed(3)}.
                  </p>
                ) : (
                  <p className="text-rose-300">
                    ✕ At W/S ≈ {wsDesign?.toFixed(1)} kg/m², combined required T/W is{' '}
                    {twRequiredAtDesign.toFixed(3)}, current T/W is{' '}
                    {thrustToWeight.toFixed(3)}, deficit ≈ {Math.abs(twMargin).toFixed(3)}.
                  </p>
                )}

                {limitingConstraint === 'climb' && (
                  <p className="text-slate-300">
                    Most limiting constraint at this W/S: climb performance.
                  </p>
                )}
                {limitingConstraint === 'cruise' && (
                  <p className="text-slate-300">
                    Most limiting constraint at this W/S: cruise drag requirement.
                  </p>
                )}
                {limitingConstraint === 'takeoff' && (
                  <p className="text-slate-300">
                    Most limiting constraint at this W/S: takeoff runway requirement.
                  </p>
                )}
                {limitingConstraint === 'unknown' && (
                  <p className="text-slate-400">
                    Combined constraint could not be classified. Check that climb, cruise, or takeoff inputs are valid.
                  </p>
                )}
              </>
            )}

          {twMargin === undefined && (
            <p className="text-slate-400">
              Compute T/W and provide valid climb, cruise, and takeoff inputs to see the combined T/W requirement and margin at the current wing loading.
            </p>
          )}
        </div>
      </div>
    </ChartCard>
  );
};

