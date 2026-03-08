/**
 * Pork-Chop Plot — C₃ Contour visualization
 * Departure date vs Arrival date for interplanetary mission planning
 */

import { useState, useMemo, useRef } from 'react';
import { AeroCard } from '@/components/common/AeroCard';
import { AeroButton } from '@/components/common/AeroButton';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Globe, Download } from 'lucide-react';
import { PLANETS, GM_SUN, AU_KM } from '@/lib/advancedOrbitalMechanics';

interface PorkChopPlotProps {
  onExportData?: (data: PorkChopData) => void;
}

export interface PorkChopData {
  departPlanet: string;
  arrivePlanet: string;
  departureDates: string[];
  arrivalDates: string[];
  c3Grid: number[][];
  tofGrid: number[][];
  minC3: number;
  minC3Depart: string;
  minC3Arrive: string;
}

// Simplified Lambert C3 for grid — fast approximation using Hohmann-like estimate with TOF correction
function computeC3ForTransfer(
  r1_AU: number, r2_AU: number, tof_days: number
): { c3_depart: number; c3_arrive: number; c3_total: number } {
  const r1 = r1_AU * AU_KM;
  const r2 = r2_AU * AU_KM;
  const mu = GM_SUN;
  const tof_s = tof_days * 86400;

  // Hohmann reference
  const a_h = (r1 + r2) / 2;
  const T_h = Math.PI * Math.sqrt(Math.pow(a_h, 3) / mu);

  // Adjust transfer semi-major axis based on TOF ratio to Hohmann
  const ratio = tof_s / T_h;
  // For non-Hohmann TOF, approximate using energy method
  // a_t ≈ a_h * ratio^(2/3) (from Kepler's third law scaling)
  const a_t = a_h * Math.pow(Math.max(ratio, 0.3), 2 / 3);

  const v1_planet = Math.sqrt(mu / r1);
  const v2_planet = Math.sqrt(mu / r2);

  // Vis-viva at departure and arrival
  const term1 = 2 / r1 - 1 / a_t;
  const term2 = 2 / r2 - 1 / a_t;

  if (term1 < 0 || term2 < 0) {
    return { c3_depart: 999, c3_arrive: 999, c3_total: 1998 };
  }

  const v1_t = Math.sqrt(mu * term1);
  const v2_t = Math.sqrt(mu * term2);

  const v_inf_d = Math.abs(v1_t - v1_planet);
  const v_inf_a = Math.abs(v2_planet - v2_t);

  return {
    c3_depart: v_inf_d * v_inf_d,
    c3_arrive: v_inf_a * v_inf_a,
    c3_total: v_inf_d * v_inf_d + v_inf_a * v_inf_a,
  };
}

function dateToString(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const PLOT_SIZE = 400;
const MARGIN = { top: 30, right: 60, bottom: 50, left: 60 };

export function PorkChopPlot({ onExportData }: PorkChopPlotProps) {
  const [departPlanet, setDepartPlanet] = useState('earth');
  const [arrivePlanet, setArrivePlanet] = useState('mars');
  const [departStart, setDepartStart] = useState('2026-01-01');
  const [departEnd, setDepartEnd] = useState('2026-12-31');
  const [arriveStart, setArriveStart] = useState('2026-06-01');
  const [arriveEnd, setArriveEnd] = useState('2027-06-01');
  const [resolution, setResolution] = useState('30');
  const [plotData, setPlotData] = useState<PorkChopData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const computePlot = () => {
    const p1 = PLANETS[departPlanet];
    const p2 = PLANETS[arrivePlanet];
    if (!p1 || !p2 || departPlanet === arrivePlanet) return;

    const res = parseInt(resolution) || 30;
    const dStart = new Date(departStart);
    const dEnd = new Date(departEnd);
    const aStart = new Date(arriveStart);
    const aEnd = new Date(arriveEnd);

    const dRange = (dEnd.getTime() - dStart.getTime()) / 86400000;
    const aRange = (aEnd.getTime() - aStart.getTime()) / 86400000;
    const dStep = Math.max(1, Math.floor(dRange / res));
    const aStep = Math.max(1, Math.floor(aRange / res));

    const departureDates: string[] = [];
    const arrivalDates: string[] = [];
    for (let d = new Date(dStart); d <= dEnd; d = addDays(d, dStep)) departureDates.push(dateToString(d));
    for (let a = new Date(aStart); a <= aEnd; a = addDays(a, aStep)) arrivalDates.push(dateToString(a));

    const c3Grid: number[][] = [];
    const tofGrid: number[][] = [];
    let minC3 = Infinity;
    let minI = 0, minJ = 0;

    for (let i = 0; i < departureDates.length; i++) {
      c3Grid[i] = [];
      tofGrid[i] = [];
      const dDate = new Date(departureDates[i]);
      for (let j = 0; j < arrivalDates.length; j++) {
        const aDate = new Date(arrivalDates[j]);
        const tof = (aDate.getTime() - dDate.getTime()) / 86400000;
        tofGrid[i][j] = tof;

        if (tof < 30) {
          c3Grid[i][j] = 999;
          continue;
        }

        const { c3_total } = computeC3ForTransfer(p1.a_AU, p2.a_AU, tof);
        c3Grid[i][j] = c3_total;

        if (c3_total < minC3) {
          minC3 = c3_total;
          minI = i;
          minJ = j;
        }
      }
    }

    const data: PorkChopData = {
      departPlanet: p1.name,
      arrivePlanet: p2.name,
      departureDates,
      arrivalDates,
      c3Grid,
      tofGrid,
      minC3,
      minC3Depart: departureDates[minI],
      minC3Arrive: arrivalDates[minJ],
    };

    setPlotData(data);
    onExportData?.(data);
    renderPlot(data);
  };

  const renderPlot = (data: PorkChopData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = PLOT_SIZE + MARGIN.left + MARGIN.right;
    const H = PLOT_SIZE + MARGIN.top + MARGIN.bottom;
    canvas.width = W * 2; // retina
    canvas.height = H * 2;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);

    const { departureDates, arrivalDates, c3Grid, minC3 } = data;
    const rows = departureDates.length;
    const cols = arrivalDates.length;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const cellW = PLOT_SIZE / cols;
    const cellH = PLOT_SIZE / rows;

    // Find color range
    const maxC3Display = Math.min(200, Math.max(...c3Grid.flat().filter(v => v < 500)));

    // Draw cells
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const val = c3Grid[i][j];
        if (val >= 500) {
          ctx.fillStyle = '#1e293b';
        } else {
          const t = Math.min(1, (val - minC3) / (maxC3Display - minC3 + 1));
          ctx.fillStyle = c3ToColor(t);
        }
        ctx.fillRect(MARGIN.left + j * cellW, MARGIN.top + i * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // C3 Contour lines
    const contourLevels = [minC3 * 1.1, minC3 * 1.5, minC3 * 2, minC3 * 3, minC3 * 5];
    ctx.lineWidth = 1;
    for (const level of contourLevels) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      for (let i = 0; i < rows - 1; i++) {
        for (let j = 0; j < cols - 1; j++) {
          const v00 = c3Grid[i][j];
          const v10 = c3Grid[i + 1][j];
          const v01 = c3Grid[i][j + 1];
          if ((v00 < level) !== (v10 < level) || (v00 < level) !== (v01 < level)) {
            const cx = MARGIN.left + (j + 0.5) * cellW;
            const cy = MARGIN.top + (i + 0.5) * cellH;
            ctx.moveTo(cx - cellW / 2, cy);
            ctx.lineTo(cx + cellW / 2, cy);
          }
        }
      }
      ctx.stroke();
    }

    // ═══ TOF Contour Lines (100, 200, 300 days) ═══
    const tofLevels = [100, 200, 300];
    const tofColors = ['rgba(0,200,255,0.7)', 'rgba(255,200,0,0.7)', 'rgba(255,100,100,0.7)'];
    const tofDashes = [[6, 3], [8, 4], [4, 4]];
    for (let li = 0; li < tofLevels.length; li++) {
      const tofTarget = tofLevels[li];
      ctx.strokeStyle = tofColors[li];
      ctx.lineWidth = 1.5;
      ctx.setLineDash(tofDashes[li]);
      ctx.beginPath();
      let started = false;
      // TOF iso-line: find j for each row i where TOF = tofTarget
      for (let i = 0; i < rows; i++) {
        const dDate = new Date(departureDates[i]).getTime();
        // tof = (arriveDate - departDate) / 86400000 = tofTarget
        // arriveDate = departDate + tofTarget * 86400000
        const targetArriveMs = dDate + tofTarget * 86400000;
        const aStartMs = new Date(arrivalDates[0]).getTime();
        const aEndMs = new Date(arrivalDates[cols - 1]).getTime();
        if (targetArriveMs < aStartMs || targetArriveMs > aEndMs) {
          started = false;
          continue;
        }
        const frac = (targetArriveMs - aStartMs) / (aEndMs - aStartMs);
        const px = MARGIN.left + frac * PLOT_SIZE;
        const py = MARGIN.top + (i + 0.5) * cellH;
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Label the TOF line
      // Find midpoint of the line
      const midI = Math.floor(rows / 2);
      const dDateMid = new Date(departureDates[midI]).getTime();
      const targetArriveMsMid = dDateMid + tofTarget * 86400000;
      const aStartMs2 = new Date(arrivalDates[0]).getTime();
      const aEndMs2 = new Date(arrivalDates[cols - 1]).getTime();
      if (targetArriveMsMid >= aStartMs2 && targetArriveMsMid <= aEndMs2) {
        const frac2 = (targetArriveMsMid - aStartMs2) / (aEndMs2 - aStartMs2);
        const lx = MARGIN.left + frac2 * PLOT_SIZE;
        const ly = MARGIN.top + (midI + 0.5) * cellH;
        ctx.fillStyle = tofColors[li];
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${tofTarget}d`, lx + 3, ly - 4);
      }
    }

    // Mark minimum
    const minI = departureDates.indexOf(data.minC3Depart);
    const minJ = arrivalDates.indexOf(data.minC3Arrive);
    const mx = MARGIN.left + (minJ + 0.5) * cellW;
    const my = MARGIN.top + (minI + 0.5) * cellH;
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#10b981';
    ctx.fill();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    // X-axis labels (arrival dates)
    const xLabelStep = Math.max(1, Math.floor(cols / 6));
    for (let j = 0; j < cols; j += xLabelStep) {
      const x = MARGIN.left + (j + 0.5) * cellW;
      ctx.save();
      ctx.translate(x, MARGIN.top + PLOT_SIZE + 8);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(arrivalDates[j].slice(5), 0, 0);
      ctx.restore();
    }

    // Y-axis labels (departure dates)
    const yLabelStep = Math.max(1, Math.floor(rows / 6));
    ctx.textAlign = 'right';
    for (let i = 0; i < rows; i += yLabelStep) {
      const y = MARGIN.top + (i + 0.5) * cellH;
      ctx.fillText(departureDates[i].slice(5), MARGIN.left - 5, y + 3);
    }

    // Title
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${data.departPlanet} → ${data.arrivePlanet} C₃ Pork-Chop Plot`, W / 2, 18);

    // Axis titles
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('Arrival Date', W / 2, H - 4);
    ctx.save();
    ctx.translate(12, MARGIN.top + PLOT_SIZE / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Departure Date', 0, 0);
    ctx.restore();

    // Color bar
    const barX = MARGIN.left + PLOT_SIZE + 10;
    const barW = 15;
    const barH = PLOT_SIZE;
    for (let y = 0; y < barH; y++) {
      const t = y / barH;
      ctx.fillStyle = c3ToColor(t);
      ctx.fillRect(barX, MARGIN.top + y, barW, 1.5);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${minC3.toFixed(0)}`, barX + barW + 3, MARGIN.top + 8);
    ctx.fillText(`${maxC3Display.toFixed(0)}`, barX + barW + 3, MARGIN.top + barH);
    ctx.fillText('km²/s²', barX + barW + 3, MARGIN.top + barH / 2);
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `porkchop_${departPlanet}_${arrivePlanet}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <AeroCard title="Pork-Chop Plot — C₃ Contour Map" icon={Globe}>
      <p className="text-xs text-muted-foreground mb-3">
        Visualize departure C₃ + arrival C₃ as a function of departure and arrival dates. 
        The minimum energy transfer (green dot) shows the optimal launch window.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <AeroFormField label="Departure Planet">
          <Select value={departPlanet} onValueChange={setDepartPlanet}>
            <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PLANETS).map(([k, p]) => (
                <SelectItem key={k} value={k}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AeroFormField>
        <AeroFormField label="Arrival Planet">
          <Select value={arrivePlanet} onValueChange={setArrivePlanet}>
            <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PLANETS).filter(([k]) => k !== departPlanet).map(([k, p]) => (
                <SelectItem key={k} value={k}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AeroFormField>
        <AeroFormField label="Departure Start">
          <Input type="date" value={departStart} onChange={e => setDepartStart(e.target.value)} className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Departure End">
          <Input type="date" value={departEnd} onChange={e => setDepartEnd(e.target.value)} className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Arrival Start">
          <Input type="date" value={arriveStart} onChange={e => setArriveStart(e.target.value)} className="bg-muted/50" />
        </AeroFormField>
        <AeroFormField label="Arrival End">
          <Input type="date" value={arriveEnd} onChange={e => setArriveEnd(e.target.value)} className="bg-muted/50" />
        </AeroFormField>
      </div>
      <div className="flex gap-3 mb-4">
        <AeroFormField label="Grid Resolution">
          <Input type="number" value={resolution} onChange={e => setResolution(e.target.value)} min="10" max="80" className="bg-muted/50 w-24" />
        </AeroFormField>
      </div>
      <AeroButton onClick={computePlot} variant="primary" icon={Globe} className="w-full mb-4">
        Generate Pork-Chop Plot
      </AeroButton>

      {/* Canvas */}
      <div className="flex flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-border"
          style={{ width: PLOT_SIZE + MARGIN.left + MARGIN.right, height: PLOT_SIZE + MARGIN.top + MARGIN.bottom }}
        />
        {plotData && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <span className="text-primary font-bold">Optimal:</span>{' '}
                Depart {plotData.minC3Depart}, Arrive {plotData.minC3Arrive}{' '}
                (C₃ = {plotData.minC3.toFixed(2)} km²/s²)
              </div>
              <AeroButton size="sm" variant="outline" icon={Download} onClick={exportPNG}>
                Export PNG
              </AeroButton>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/30 border border-border">
                <div className="text-muted-foreground">TOF at Optimum</div>
                <div className="font-mono font-bold text-foreground">
                  {((new Date(plotData.minC3Arrive).getTime() - new Date(plotData.minC3Depart).getTime()) / 86400000).toFixed(0)} days
                </div>
              </div>
              <div className="p-2 rounded bg-muted/30 border border-border">
                <div className="text-muted-foreground">Min C₃</div>
                <div className="font-mono font-bold text-primary">{plotData.minC3.toFixed(2)} km²/s²</div>
              </div>
              <div className="p-2 rounded bg-muted/30 border border-border">
                <div className="text-muted-foreground">v∞ (depart)</div>
                <div className="font-mono font-bold text-foreground">{Math.sqrt(plotData.minC3 / 2).toFixed(2)} km/s</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AeroCard>
  );
}

// Color mapping: 0 = green (low C3), 0.5 = yellow, 1 = red (high C3)
function c3ToColor(t: number): string {
  t = Math.max(0, Math.min(1, t));
  const r = Math.floor(t < 0.5 ? t * 2 * 255 : 255);
  const g = Math.floor(t < 0.5 ? 255 : (1 - (t - 0.5) * 2) * 255);
  const b = Math.floor(t < 0.3 ? (0.3 - t) / 0.3 * 80 : 0);
  return `rgb(${r},${g},${b})`;
}
