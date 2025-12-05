"use client";

/**
 * Polar Charts Panel
 * 
 * Professional aerodynamic polar charts (CL, CD, CM vs α)
 * with multi-airfoil comparison and stall visualization
 */

import { useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import { AeroButton } from "@/components/common/AeroButton";
import { Download, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AIRFOIL_COLORS,
  calculateClRange,
  calculateCdRange,
  calculateCmRange,
  formatTooltipValue,
  splitPolarAtStall,
  exportChartAsPNG,
  exportChartAsSVG,
} from "@/lib/polarChartUtils";
import type { PolarData } from "@/lib/pdfExport";
import { AIRFOIL_DESCRIPTIONS } from "@/data/airfoilDescriptions";
import { AeroverseLegend, type LegendItem } from "@/components/charts/AeroverseLegend";

interface PolarChartsPanelProps {
  polars: Array<{
    id: string;
    name: string;
    data: PolarData;
  }>;
  reynoldsNumber: number;
}

/**
 * Get clean airfoil name without role in parentheses
 */
const getAirfoilName = (airfoilName: string): string => {
  return airfoilName.replace(/\s*\([^)]+\)\s*/, '').trim();
};

/**
 * Extract role from airfoil name or description
 */
const getAirfoilRole = (airfoilId: string, airfoilName: string): string | undefined => {
  // Try to extract role from name (text in parentheses)
  const roleMatch = airfoilName.match(/\(([^)]+)\)/);
  if (roleMatch) {
    return roleMatch[1];
  }
  
  // Try to get role from airfoil descriptions (first application)
  const description = AIRFOIL_DESCRIPTIONS[airfoilId];
  if (description?.applications && description.applications.length > 0) {
    const firstApp = description.applications[0];
    // Extract key words (e.g., "General aviation aircraft" -> "GA")
    // Only return a role if we can match it to a known short tag
    if (firstApp.toLowerCase().includes('general aviation')) return 'GA';
    else if (firstApp.toLowerCase().includes('training')) return 'Trainer';
    else if (firstApp.toLowerCase().includes('uav')) return 'UAV';
    else if (firstApp.toLowerCase().includes('glider')) return 'Glider';
    else if (firstApp.toLowerCase().includes('racer') || firstApp.toLowerCase().includes('racing')) return 'Racer';
    else if (firstApp.toLowerCase().includes('aerobatic')) return 'Aerobatic';
    else if (firstApp.toLowerCase().includes('wind turbine')) return 'Wind Turbine';
    else if (firstApp.toLowerCase().includes('high-speed')) return 'High-Speed';
    else if (firstApp.toLowerCase().includes('control surface')) return 'Control';
    else if (firstApp.toLowerCase().includes('tail')) return 'Tail';
    else if (firstApp.toLowerCase().includes('supersonic')) return 'Supersonic';
    else if (firstApp.toLowerCase().includes('rotor')) return 'Rotor';
    else if (firstApp.toLowerCase().includes('sport')) return 'Sport';
    else if (firstApp.toLowerCase().includes('bush')) return 'Bush';
    else if (firstApp.toLowerCase().includes('stol')) return 'STOL';
    else if (firstApp.toLowerCase().includes('pattern')) return 'Pattern';
  }
  
  return undefined;
};

/**
 * Extract role from airfoil name or description
 * Format: "{name} · {role}" or just "{name}" if no role found
 */
const getAirfoilLegendLabel = (airfoilId: string, airfoilName: string): string => {
  const name = getAirfoilName(airfoilName);
  const role = getAirfoilRole(airfoilId, airfoilName);
  
  if (role) {
    return `${name} · ${role}`;
  }
  
  return name;
};

/**
 * Custom tooltip for polar charts
 */
const CustomTooltip = ({ active, payload, label, chartType }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-slate-800 border border-cyan-400/30 rounded-lg p-3 shadow-lg">
      <p className="text-cyan-400 font-semibold mb-2">α = {label}°</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="text-white font-semibold">
            {formatTooltipValue(entry.value, chartType)}
          </span>
        </div>
      ))}
    </div>
  );
};

export function PolarChartsPanel({ polars, reynoldsNumber }: PolarChartsPanelProps) {
  const { toast } = useToast();
  const clChartRef = useRef<HTMLDivElement>(null);
  const cdChartRef = useRef<HTMLDivElement>(null);
  const cmChartRef = useRef<HTMLDivElement>(null);

  if (!polars || polars.length === 0) {
    return null;
  }

  // Calculate axis ranges
  const polarDataOnly = polars.map(p => p.data);
  const [clMin, clMax] = calculateClRange(polarDataOnly);
  const [cdMin, cdMax] = calculateCdRange(polarDataOnly);
  const [cmMin, cmMax] = calculateCmRange(polarDataOnly);

  // Prepare chart data
  const clChartData: any[] = [];
  const cdChartData: any[] = [];
  const cmChartData: any[] = [];

  // Use the first polar's alpha grid as reference
  const alphaGrid = polars[0].data.alpha;

  for (let i = 0; i < alphaGrid.length; i++) {
    const alpha = alphaGrid[i];
    const clPoint: any = { alpha };
    const cdPoint: any = { alpha };
    const cmPoint: any = { alpha };

    // Add data for each airfoil
    polars.forEach((polar) => {
      const alphaIdx = polar.data.alpha.findIndex(a => Math.abs(a - alpha) < 0.1);
      if (alphaIdx >= 0) {
        clPoint[polar.id] = polar.data.cl[alphaIdx];
        cdPoint[polar.id] = polar.data.cd[alphaIdx];
        cmPoint[polar.id] = polar.data.cm?.[alphaIdx] ?? 0;
      }
    });

    clChartData.push(clPoint);
    cdChartData.push(cdPoint);
    cmChartData.push(cmPoint);
  }

  // Handle export
  const handleExport = async (chartRef: React.RefObject<HTMLDivElement>, filename: string, format: 'png' | 'svg') => {
    if (!chartRef.current) {
      toast({
        title: "Error",
        description: "Chart element not found",
        variant: "destructive",
      });
      return;
    }

    try {
      if (format === 'png') {
        await exportChartAsPNG(chartRef.current, filename);
      } else {
        await exportChartAsSVG(chartRef.current, filename);
      }
      toast({
        title: "Success",
        description: `Chart exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to export chart: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Format Reynolds number for display
  const reDisplay = reynoldsNumber >= 1000000 
    ? `${(reynoldsNumber / 1000000).toFixed(1)}M` 
    : `${(reynoldsNumber / 1000).toFixed(0)}k`;

  return (
    <div className="space-y-6">
      {/* CL vs α Chart */}
      <div ref={clChartRef}>
        <ChartCard
          title={`Lift Coefficient (Cl) vs Angle of Attack — Re = ${reDisplay}`}
          height={400}
          headerActions={
            <div className="flex gap-2">
              <AeroButton
                variant="outline"
                onClick={() => handleExport(clChartRef, `CL_vs_Alpha_Re${reDisplay}.png`, 'png')}
                icon={Download}
              >
                PNG
              </AeroButton>
              <AeroButton
                variant="outline"
                onClick={() => handleExport(clChartRef, `CL_vs_Alpha_Re${reDisplay}.svg`, 'svg')}
                icon={ImageIcon}
              >
                SVG
              </AeroButton>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={clChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="alpha"
                stroke="#94a3b8"
                label={{ value: "Angle of Attack, α (degrees)", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
              />
              <YAxis
                stroke="#94a3b8"
                domain={[clMin, clMax]}
                label={{ value: "Lift Coefficient, Cl", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                tickFormatter={(val) => val.toFixed(2)}
              />
              <Tooltip
                content={<CustomTooltip chartType="cl" />}
              />
              
              {/* Render lines for each airfoil */}
              {polars.map((polar, index) => {
                const stallData = splitPolarAtStall(polar.data);
                const color = AIRFOIL_COLORS[index % AIRFOIL_COLORS.length];

                return (
                  <Line
                    key={polar.id}
                    type="monotone"
                    dataKey={polar.id}
                    name={polar.name}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    legendType="none"
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
          
          {/* Custom Legend - Outside Chart Area */}
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <AeroverseLegend
              items={polars.map((polar, index): LegendItem => ({
                id: polar.id,
                name: getAirfoilName(polar.name),
                role: getAirfoilRole(polar.id, polar.name),
                color: AIRFOIL_COLORS[index % AIRFOIL_COLORS.length],
              }))}
            />
          </div>
          
          <p className="text-xs text-slate-400 mt-2 text-center">
            Aeroverse Polar Dataset — {polars.map(p => p.name).join(', ')}
          </p>
        </ChartCard>
      </div>

      {/* CD vs α Chart */}
      <div ref={cdChartRef}>
        <ChartCard
          title={`Drag Coefficient (Cd) vs Angle of Attack — Re = ${reDisplay}`}
          height={400}
          headerActions={
            <div className="flex gap-2">
              <AeroButton
                variant="outline"
                onClick={() => handleExport(cdChartRef, `CD_vs_Alpha_Re${reDisplay}.png`, 'png')}
                icon={Download}
              >
                PNG
              </AeroButton>
              <AeroButton
                variant="outline"
                onClick={() => handleExport(cdChartRef, `CD_vs_Alpha_Re${reDisplay}.svg`, 'svg')}
                icon={ImageIcon}
              >
                SVG
              </AeroButton>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={cdChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="alpha"
                stroke="#94a3b8"
                label={{ value: "Angle of Attack, α (degrees)", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
              />
              <YAxis
                stroke="#94a3b8"
                domain={[cdMin, cdMax]}
                label={{ value: "Drag Coefficient, Cd", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                tickFormatter={(val) => val.toFixed(4)}
              />
              <Tooltip
                content={<CustomTooltip chartType="cd" />}
              />
              
              {/* Render lines for each airfoil */}
              {polars.map((polar, index) => {
                const color = AIRFOIL_COLORS[index % AIRFOIL_COLORS.length];

                return (
                  <Line
                    key={polar.id}
                    type="monotone"
                    dataKey={polar.id}
                    name={polar.name}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    legendType="none"
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
          
          {/* Custom Legend - Outside Chart Area */}
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <AeroverseLegend
              items={polars.map((polar, index): LegendItem => ({
                id: polar.id,
                name: getAirfoilName(polar.name),
                role: getAirfoilRole(polar.id, polar.name),
                color: AIRFOIL_COLORS[index % AIRFOIL_COLORS.length],
              }))}
            />
          </div>
          
          <p className="text-xs text-slate-400 mt-2 text-center">
            Aeroverse Polar Dataset — {polars.map(p => p.name).join(', ')}
          </p>
        </ChartCard>
      </div>

      {/* CM vs α Chart (only if CM data available) */}
      {polars.some(p => p.data.cm && p.data.cm.length > 0) && (
        <div ref={cmChartRef}>
          <ChartCard
            title={`Pitching Moment Coefficient (Cm) vs Angle of Attack — Re = ${reDisplay}`}
            height={400}
            headerActions={
              <div className="flex gap-2">
                <AeroButton
                  variant="outline"
                  onClick={() => handleExport(cmChartRef, `CM_vs_Alpha_Re${reDisplay}.png`, 'png')}
                  icon={Download}
                >
                  PNG
                </AeroButton>
                <AeroButton
                  variant="outline"
                  onClick={() => handleExport(cmChartRef, `CM_vs_Alpha_Re${reDisplay}.svg`, 'svg')}
                  icon={ImageIcon}
                >
                  SVG
                </AeroButton>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={cmChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="alpha"
                  stroke="#94a3b8"
                  label={{ value: "Angle of Attack, α (degrees)", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  domain={[cmMin, cmMax]}
                  label={{ value: "Pitching Moment Coefficient, Cm", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                  tickFormatter={(val) => val.toFixed(3)}
                />
                <Tooltip
                  content={<CustomTooltip chartType="cm" />}
                />
                
                {/* Render zero line */}
                <Line
                  type="monotone"
                  dataKey={() => 0}
                  stroke="#64748b"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Zero"
                  legendType="none"
                />
                
                {/* Render lines for each airfoil */}
                {polars.map((polar, index) => {
                  const color = AIRFOIL_COLORS[index % AIRFOIL_COLORS.length];

                  return (
                    <Line
                      key={polar.id}
                      type="monotone"
                      dataKey={polar.id}
                      name={polar.name}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      legendType="none"
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
            
            {/* Custom Legend - Outside Chart Area */}
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <AeroverseLegend
                items={polars.map((polar, index): LegendItem => {
                  const label = getAirfoilLegendLabel(polar.id, polar.name);
                  // If label contains " · ", split it into name and role
                  const parts = label.split(' · ');
                  return {
                    id: polar.id,
                    name: parts[0],
                    role: parts[1],
                    color: AIRFOIL_COLORS[index % AIRFOIL_COLORS.length],
                  };
                })}
              />
            </div>
            
            <p className="text-xs text-slate-400 mt-2 text-center">
              Aeroverse Polar Dataset — {polars.map(p => p.name).join(', ')}
            </p>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

