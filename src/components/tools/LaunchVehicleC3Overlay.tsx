/**
 * Launch Vehicle C3 Capability Overlay
 * Shows mass-to-C3 curves for Falcon 9, Atlas V, SLS
 */

import { useState } from 'react';
import { AeroCard } from '@/components/common/AeroCard';
import { AeroButton } from '@/components/common/AeroButton';
import { Rocket } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AeroFormField } from '@/components/forms/AeroFormField';

// Launch vehicle C3 performance data (approx payload mass in kg at given C3 in km²/s²)
// Sources: NASA Launch Services Program, SpaceX user guides (publicly available approximations)
export interface LaunchVehicleData {
  name: string;
  color: string;
  // Array of [C3 (km²/s²), payload_kg]
  curve: [number, number][];
}

export const LAUNCH_VEHICLES: LaunchVehicleData[] = [
  {
    name: 'Falcon 9 (expendable)',
    color: '#3b82f6',
    curve: [
      [0, 4020], [5, 3500], [10, 3000], [15, 2520], [20, 2080],
      [25, 1680], [30, 1310], [40, 700], [50, 250], [60, 0],
    ],
  },
  {
    name: 'Falcon Heavy (expendable)',
    color: '#10b981',
    curve: [
      [0, 16800], [10, 13200], [20, 10100], [30, 7500], [40, 5400],
      [50, 3700], [60, 2300], [80, 800], [100, 0],
    ],
  },
  {
    name: 'Atlas V 551',
    color: '#f59e0b',
    curve: [
      [0, 8900], [5, 7800], [10, 6700], [15, 5700], [20, 4800],
      [25, 4000], [30, 3300], [40, 2000], [50, 1000], [60, 300], [70, 0],
    ],
  },
  {
    name: 'SLS Block 1',
    color: '#ef4444',
    curve: [
      [0, 27000], [10, 23000], [20, 19500], [30, 16500], [40, 13800],
      [50, 11200], [60, 8800], [80, 5000], [100, 2000], [120, 0],
    ],
  },
  {
    name: 'SLS Block 2',
    color: '#a855f7',
    curve: [
      [0, 46000], [10, 40000], [20, 34500], [30, 29500], [40, 25000],
      [50, 21000], [60, 17500], [80, 11000], [100, 6000], [120, 2500], [140, 0],
    ],
  },
];

function interpolatePayload(curve: [number, number][], c3: number): number {
  if (c3 <= curve[0][0]) return curve[0][1];
  if (c3 >= curve[curve.length - 1][0]) return 0;
  for (let i = 0; i < curve.length - 1; i++) {
    if (c3 >= curve[i][0] && c3 <= curve[i + 1][0]) {
      const frac = (c3 - curve[i][0]) / (curve[i + 1][0] - curve[i][0]);
      return curve[i][1] + frac * (curve[i + 1][1] - curve[i][1]);
    }
  }
  return 0;
}

const CHART_W = 460;
const CHART_H = 280;
const CM = { top: 25, right: 20, bottom: 45, left: 60 };

interface LaunchVehicleC3OverlayProps {
  missionC3?: number;
  missionName?: string;
}

export function LaunchVehicleC3Overlay({ missionC3, missionName }: LaunchVehicleC3OverlayProps) {
  const [targetC3, setTargetC3] = useState(missionC3?.toFixed(1) ?? '');
  const [showChart, setShowChart] = useState(false);

  const c3Val = parseFloat(targetC3) || missionC3 || 0;

  const maxC3 = 150;
  const maxPayload = 50000;

  const renderChart = () => {
    const plotW = CHART_W - CM.left - CM.right;
    const plotH = CHART_H - CM.top - CM.bottom;

    const scaleX = (c3: number) => CM.left + (c3 / maxC3) * plotW;
    const scaleY = (kg: number) => CM.top + plotH - (kg / maxPayload) * plotH;

    return (
      <svg width={CHART_W} height={CHART_H} className="rounded-lg border border-border bg-[hsl(var(--muted))]">
        {/* Grid */}
        {[0, 25, 50, 75, 100, 125, 150].map(c3 => (
          <line key={`gx-${c3}`} x1={scaleX(c3)} y1={CM.top} x2={scaleX(c3)} y2={CM.top + plotH}
            stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="3,3" />
        ))}
        {[0, 10000, 20000, 30000, 40000, 50000].map(kg => (
          <line key={`gy-${kg}`} x1={CM.left} y1={scaleY(kg)} x2={CM.left + plotW} y2={scaleY(kg)}
            stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="3,3" />
        ))}

        {/* Axes */}
        <line x1={CM.left} y1={CM.top} x2={CM.left} y2={CM.top + plotH} stroke="hsl(var(--foreground))" strokeWidth={1} />
        <line x1={CM.left} y1={CM.top + plotH} x2={CM.left + plotW} y2={CM.top + plotH} stroke="hsl(var(--foreground))" strokeWidth={1} />

        {/* X labels */}
        {[0, 50, 100, 150].map(c3 => (
          <text key={`xl-${c3}`} x={scaleX(c3)} y={CM.top + plotH + 15} fill="hsl(var(--muted-foreground))" fontSize={9} textAnchor="middle" fontFamily="monospace">{c3}</text>
        ))}
        <text x={CM.left + plotW / 2} y={CHART_H - 4} fill="hsl(var(--muted-foreground))" fontSize={10} textAnchor="middle">C₃ (km²/s²)</text>

        {/* Y labels */}
        {[0, 10000, 20000, 30000, 40000, 50000].map(kg => (
          <text key={`yl-${kg}`} x={CM.left - 5} y={scaleY(kg) + 3} fill="hsl(var(--muted-foreground))" fontSize={9} textAnchor="end" fontFamily="monospace">{(kg / 1000).toFixed(0)}t</text>
        ))}
        <text x={14} y={CM.top + plotH / 2} fill="hsl(var(--muted-foreground))" fontSize={10} textAnchor="middle" transform={`rotate(-90,14,${CM.top + plotH / 2})`}>Payload (tonnes)</text>

        {/* Vehicle curves */}
        {LAUNCH_VEHICLES.map((v, vi) => {
          const pts = v.curve.filter(([c3]) => c3 <= maxC3).map(([c3, kg]) => `${scaleX(c3)},${scaleY(kg)}`).join(' ');
          return (
            <g key={vi}>
              <polyline points={pts} fill="none" stroke={v.color} strokeWidth={2} strokeLinejoin="round" />
              {/* Label at first point */}
              <text x={scaleX(v.curve[0][0]) + 3} y={scaleY(v.curve[0][1]) - 5} fill={v.color} fontSize={8} fontWeight="bold">{v.name}</text>
            </g>
          );
        })}

        {/* Mission C3 line */}
        {c3Val > 0 && c3Val <= maxC3 && (
          <>
            <line x1={scaleX(c3Val)} y1={CM.top} x2={scaleX(c3Val)} y2={CM.top + plotH}
              stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6,3" />
            <text x={scaleX(c3Val)} y={CM.top - 5} fill="hsl(var(--primary))" fontSize={9} textAnchor="middle" fontWeight="bold">
              {missionName || 'Mission'} C₃={c3Val.toFixed(1)}
            </text>
          </>
        )}

        {/* Title */}
        <text x={CHART_W / 2} y={14} fill="hsl(var(--foreground))" fontSize={11} textAnchor="middle" fontWeight="bold">
          Launch Vehicle C₃ Capability Comparison
        </text>
      </svg>
    );
  };

  // Feasibility table
  const feasibilityRows = LAUNCH_VEHICLES.map(v => ({
    name: v.name,
    color: v.color,
    payload: interpolatePayload(v.curve, c3Val),
    maxC3: v.curve[v.curve.length - 1][0],
  }));

  return (
    <AeroCard title="Launch Vehicle C₃ Capability" icon={Rocket}>
      <p className="text-xs text-muted-foreground mb-3">
        Compare payload mass delivered to a given C₃ across major launch vehicles. 
        Essential for mission feasibility assessment.
      </p>

      <div className="flex gap-3 mb-3 items-end">
        <AeroFormField label="Mission C₃ (km²/s²)">
          <Input type="number" value={targetC3} onChange={e => setTargetC3(e.target.value)} placeholder="10" className="bg-muted/50 w-32" step="0.5" />
        </AeroFormField>
        <AeroButton onClick={() => setShowChart(true)} variant="primary" icon={Rocket}>
          Show Capability Chart
        </AeroButton>
      </div>

      {showChart && (
        <div className="space-y-3">
          <div className="flex justify-center">
            {renderChart()}
          </div>

          {c3Val > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground">Feasibility at C₃ = {c3Val.toFixed(1)} km²/s²</h4>
              <div className="grid gap-2">
                {feasibilityRows.map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="text-xs font-semibold text-foreground">{row.name}</span>
                    </div>
                    <div className="text-right">
                      {row.payload > 0 ? (
                        <span className="text-xs font-mono font-bold text-primary">
                          {row.payload.toFixed(0)} kg ({(row.payload / 1000).toFixed(1)} t)
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-destructive font-bold">
                          ✗ Exceeds capability (max C₃ = {row.maxC3})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2.5 rounded-md bg-primary/5 border border-primary/10 mt-2">
                <div className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">Mission Feasibility</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  At C₃ = {c3Val.toFixed(1)} km²/s², {feasibilityRows.filter(r => r.payload > 0).length} of {feasibilityRows.length} vehicles 
                  can deliver payload. {feasibilityRows[0].payload > 0 ? `Falcon 9 can deliver ${feasibilityRows[0].payload.toFixed(0)} kg.` : 'Falcon 9 cannot reach this C₃.'}{' '}
                  {feasibilityRows[3].payload > 0 ? `SLS Block 1 can deliver ${feasibilityRows[3].payload.toFixed(0)} kg — ideal for heavy spacecraft.` : ''}
                  {' '}Lower C₃ means more available payload mass, which is why mission designers optimize for minimum-energy transfer windows.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </AeroCard>
  );
}
