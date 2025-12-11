"use client";

/**
 * Polar Charts Panel
 * 
 * Professional aerodynamic polar charts (CL, CD, CM vs α)
 * with multi-airfoil comparison and stall visualization
 */

import React, { useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import { AeroButton } from "@/components/common/AeroButton";
import { Download, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
 * Check if a polar file appears to be placeholder/dummy data
 */
function isPlaceholderPolar(polar: PolarData): boolean {
  // Check meta.source or meta.notes for placeholder indicators
  if (polar.meta) {
    const source = (polar.meta.source || '').toLowerCase();
    const notes = (polar.meta.notes || '').toLowerCase();
    
    if (source.includes('todo') || source.includes('placeholder') || source.includes('stub') ||
        notes.includes('todo') || notes.includes('placeholder') || notes.includes('stub')) {
      return true;
    }
  }
  
  // Check if arrays have < 15 data points
  const alphaCount = polar.alpha?.length || 0;
  const clCount = polar.cl?.length || 0;
  const cdCount = polar.cd?.length || 0;
  
  if (alphaCount < 15 || clCount < 15 || cdCount < 15) {
    return true;
  }
  
  return false;
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
      {payload.map((entry: unknown, index: number) => (
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

type ChartMode = "cl" | "cd" | "cm" | "dragPolar";

export function PolarChartsPanel({ polars, reynoldsNumber }: PolarChartsPanelProps) {
  const { toast } = useToast();
  const [chartMode, setChartMode] = useState<ChartMode>("cl");
  const clChartRef = useRef<HTMLDivElement>(null);
  const cdChartRef = useRef<HTMLDivElement>(null);
  const cmChartRef = useRef<HTMLDivElement>(null);
  const dragPolarChartRef = useRef<HTMLDivElement>(null);

  if (!polars || polars.length === 0) {
    return null;
  }

  // Calculate axis ranges
  const polarDataOnly = polars.map(p => p.data);
  const [clMin, clMax] = calculateClRange(polarDataOnly);
  const [cdMin, cdMax] = calculateCdRange(polarDataOnly);
  const [cmMin, cmMax] = calculateCmRange(polarDataOnly);

  // Prepare chart data
  // TODO: refine type for chart data arrays — changed any -> unknown automatically by chore/typed-cleanup
  const clChartData: unknown[] = [];
  const cdChartData: unknown[] = [];
  const cmChartData: unknown[] = [];

  // Use the first polar's alpha grid as reference
  const alphaGrid = polars[0]?.data?.alpha;
  
  if (alphaGrid && alphaGrid.length > 0) {
    for (let i = 0; i < alphaGrid.length; i++) {
      const alpha = alphaGrid[i];
      // TODO: refine type for chart points — changed any -> unknown automatically by chore/typed-cleanup
      const clPoint: Record<string, unknown> = { alpha };
      const cdPoint: Record<string, unknown> = { alpha };
      const cmPoint: Record<string, unknown> = { alpha };

      // Add data for each airfoil
      polars.forEach((polar) => {
        if (polar.data && polar.data.alpha && polar.data.cl && polar.data.cd) {
          const alphaIdx = polar.data.alpha.findIndex(a => Math.abs(a - alpha) < 0.1);
          if (alphaIdx >= 0) {
            clPoint[polar.id] = polar.data.cl[alphaIdx];
            cdPoint[polar.id] = polar.data.cd[alphaIdx];
            cmPoint[polar.id] = polar.data.cm?.[alphaIdx] ?? 0;
          }
        }
      });

      clChartData.push(clPoint);
      cdChartData.push(cdPoint);
      cmChartData.push(cmPoint);
    }
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

  // TODO: Currently all polars are dummy/placeholder for educational purposes
  // When real experimental/XFOIL polars are added, change this to:
  // const hasPlaceholderPolar = polars.some(p => isPlaceholderPolar(p.data));
  const hasPlaceholderPolar = true; // Always show badge until real polars are added
  
  // Placeholder warning badge component
  const PlaceholderBadge = () => (
    <div 
      className="bg-amber-600/20 text-amber-300 border border-amber-500/50 text-xs px-2 py-0.5 rounded-md"
      title="Placeholder data – real experimental/XFOIL polars coming soon."
    >
      ⚠ Placeholder
    </div>
  );

  // Prepare drag polar data (CD vs CL)
  // Create a unified data structure where each point has CL and CD values for each airfoil
  // TODO: refine type for `dragPolarData` — changed any -> unknown automatically by chore/typed-cleanup
  const dragPolarData: unknown[] = [];
  const allClValues: number[] = [];
  const allCdValues: number[] = [];

  // Only calculate drag polar data if we have polars
  if (polars && polars.length > 0) {
    // Collect all unique CL values across all airfoils
    const clSet = new Set<number>();
    polars.forEach((polar) => {
      if (polar.data && polar.data.cl && polar.data.cd) {
        polar.data.cl.forEach(cl => {
          if (cl !== null && cl !== undefined && !isNaN(cl)) {
            clSet.add(Math.round(cl * 1000) / 1000); // Round to 3 decimals for grouping
            allClValues.push(cl);
          }
        });
        polar.data.cd.forEach(cd => {
          if (cd !== null && cd !== undefined && !isNaN(cd)) {
            allCdValues.push(cd);
          }
        });
      }
    });

    // Create data points for each unique CL value
    const sortedClValues = Array.from(clSet).sort((a, b) => a - b);
    
    sortedClValues.forEach(cl => {
      const point: any = { cl };
      
      // For each airfoil, find the closest CD value for this CL
      polars.forEach((polar) => {
        if (polar.data && polar.data.cl && polar.data.cd) {
          let closestCd: number | null = null;
          let closestAlpha: number | null = null;
          let minDiff = Infinity;
          
          for (let i = 0; i < polar.data.cl.length && i < polar.data.cd.length; i++) {
            const polarCl = polar.data.cl[i];
            const polarCd = polar.data.cd[i];
            if (polarCl !== null && polarCl !== undefined && polarCd !== null && polarCd !== undefined && 
                !isNaN(polarCl) && !isNaN(polarCd)) {
              const diff = Math.abs(polarCl - cl);
              if (diff < minDiff) {
                minDiff = diff;
                closestCd = polarCd;
                closestAlpha = polar.data.alpha?.[i] ?? null;
              }
            }
          }
          
          if (closestCd !== null && minDiff < 0.01) { // Only use if CL is very close
            point[polar.id] = closestCd;
            point[`${polar.id}_cl`] = cl;
            point[`${polar.id}_alpha`] = closestAlpha;
          }
        }
      });
      
      // Only add point if at least one airfoil has data
      if (Object.keys(point).length > 1) {
        dragPolarData.push(point);
      }
    });
  }

  // Calculate domains for drag polar with safe defaults
  const dragPolarClMin = allClValues.length > 0 ? Math.max(0, Math.min(...allClValues) - 0.1) : 0;
  const dragPolarClMax = allClValues.length > 0 ? Math.max(...allClValues) + 0.1 : 1;
  const dragPolarCdMin = 0; // Always start from 0
  const dragPolarCdMax = allCdValues.length > 0 ? Math.max(...allCdValues) * 1.05 : 0.1;

  // Custom tooltip for drag polar
  // TODO: refine type for `DragPolarTooltip` — changed any -> unknown automatically by chore/typed-cleanup
  const DragPolarTooltip = ({ active, payload }: { active?: boolean; payload?: unknown[] }) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    return (
      <div className="bg-slate-800 border border-cyan-400/30 rounded-lg p-3 shadow-lg">
        {payload.map((entry: unknown, index: number) => {
          const airfoilId = entry.dataKey;
          const polar = polars.find(p => p.id === airfoilId);
          const point = entry.payload;
          const cl = point?.[`${airfoilId}_cl`] ?? point?.cl;
          const cd = entry.value;
          const alpha = point?.[`${airfoilId}_alpha`];

          return (
            <div key={index} className="mb-2 last:mb-0">
              <p className="text-cyan-400 font-semibold mb-1">
                {polar?.name || airfoilId}
              </p>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300">CL:</span>
                  <span className="text-white font-semibold">{cl?.toFixed(3) ?? 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-300">CD:</span>
                  <span className="text-white font-semibold">{cd?.toFixed(4) ?? 'N/A'}</span>
                </div>
                {alpha !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">α:</span>
                    <span className="text-white font-semibold">{alpha?.toFixed(1)}°</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-slate-300">Re:</span>
                  <span className="text-white font-semibold">{reDisplay}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <Tabs value={chartMode} onValueChange={(value) => setChartMode(value as ChartMode)}>
        <TabsList className="bg-slate-700/50 border border-cyan-400/30">
          <TabsTrigger value="cl" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
            CL vs α
          </TabsTrigger>
          <TabsTrigger value="cd" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
            CD vs α
          </TabsTrigger>
          <TabsTrigger value="cm" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
            CM vs α
          </TabsTrigger>
          <TabsTrigger value="dragPolar" className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300">
            Drag Polar (CD vs CL)
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {/* CL vs α Chart */}
          <TabsContent value="cl">
            <div ref={clChartRef}>
        <ChartCard
          title={`Lift Coefficient (Cl) vs Angle of Attack — Re = ${reDisplay}`}
          height={400}
          titleBadge={hasPlaceholderPolar ? <PlaceholderBadge /> : undefined}
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
          </TabsContent>

          {/* CD vs α Chart */}
          <TabsContent value="cd">
            <div ref={cdChartRef}>
        <ChartCard
          title={`Drag Coefficient (Cd) vs Angle of Attack — Re = ${reDisplay}`}
          height={400}
          titleBadge={hasPlaceholderPolar ? <PlaceholderBadge /> : undefined}
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
          </TabsContent>

          {/* CM vs α Chart (only if CM data available) */}
          <TabsContent value="cm">
            {polars.some(p => p.data.cm && p.data.cm.length > 0) ? (
              <div ref={cmChartRef}>
          <ChartCard
            title={`Pitching Moment Coefficient (Cm) vs Angle of Attack — Re = ${reDisplay}`}
            height={400}
            titleBadge={hasPlaceholderPolar ? <PlaceholderBadge /> : undefined}
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
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>CM data not available for selected airfoils</p>
              </div>
            )}
          </TabsContent>

          {/* Drag Polar Chart (CD vs CL) */}
          <TabsContent value="dragPolar">
            <div ref={dragPolarChartRef}>
              <ChartCard
                title={`Drag Polar (CD vs CL) — Re = ${reDisplay}`}
                height={400}
                titleBadge={hasPlaceholderPolar ? <PlaceholderBadge /> : undefined}
                headerActions={
                  <div className="flex gap-2">
                    <AeroButton
                      variant="outline"
                      onClick={() => handleExport(dragPolarChartRef, `DragPolar_CD_vs_CL_Re${reDisplay}.png`, 'png')}
                      icon={Download}
                    >
                      PNG
                    </AeroButton>
                    <AeroButton
                      variant="outline"
                      onClick={() => handleExport(dragPolarChartRef, `DragPolar_CD_vs_CL_Re${reDisplay}.svg`, 'svg')}
                      icon={ImageIcon}
                    >
                      SVG
                    </AeroButton>
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dragPolarData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      type="number"
                      dataKey="cl"
                      domain={[dragPolarClMin, dragPolarClMax]}
                      stroke="#94a3b8"
                      label={{ value: "Lift Coefficient, CL", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
                      tickFormatter={(val) => val.toFixed(2)}
                    />
                    <YAxis
                      type="number"
                      domain={[dragPolarCdMin, dragPolarCdMax]}
                      stroke="#94a3b8"
                      label={{ value: "Drag Coefficient, CD", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                      tickFormatter={(val) => val.toFixed(4)}
                    />
                    <Tooltip
                      content={<DragPolarTooltip />}
                      cursor={{ strokeDasharray: '3 3' }}
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
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

