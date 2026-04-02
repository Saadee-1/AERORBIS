/**
 * 2D Trajectory Visualizer - Cinematic Edition
 * SVG visualization with grid, glow effects, event markers, and altitude bands
 */

"use client";

import { memo, useEffect, useMemo } from 'react';
import { TrajectoryData } from '../../utils/three/threeUtils';
import { AeroCard } from '@/components/common/AeroCard';
import { isDevEnv, isVisualizerDebug } from '@/lib/env';

interface TwoDVisualizerProps {
  trajectoryData?: TrajectoryData;
  mode: '1D' | '2D' | '3D';
  title?: string;
}

const DEBUG_VIS = isVisualizerDebug();
const IS_DEV = isDevEnv();

const WIDTH = 900;
const HEIGHT = 420;
const PAD = { top: 30, right: 30, bottom: 50, left: 65 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

// Format number for axis labels
function formatAxis(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (Math.abs(value) >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

import type { TrajectoryFrame } from '../../utils/three/threeUtils';

const EMPTY_ARRAY: TrajectoryFrame[] = [];

export const TwoDVisualizer = memo(function TwoDVisualizer({
  trajectoryData,
  mode,
  title = '2D Trajectory Visualizer',
}: TwoDVisualizerProps) {
  const frames = trajectoryData?.frames ?? EMPTY_ARRAY;
  const metadata = trajectoryData?.metadata;

  const sanitize = (value: number, fallback = 0) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

  useEffect(() => {
    if (!IS_DEV) return;
    console.debug('TwoDVisualizer', { frames: frames.length, mode });
  }, [frames.length, mode]);

  const vizData = useMemo(() => {
    const planetRadius = metadata?.planetRadius ?? 0;

    const points = frames.map((frame) => {
      const xAxis = mode === '1D' ? sanitize(frame.t) : sanitize(frame.x);
      const altitude = sanitize(frame.z - planetRadius);
      return { xAxis, yAxis: altitude, t: sanitize(frame.t), mass: frame.mass };
    });

    const xs = points.map((p) => p.xAxis).filter(Number.isFinite);
    const ys = points.map((p) => p.yAxis).filter(Number.isFinite);
    const minX = xs.length ? Math.min(...xs) : 0;
    const maxX = xs.length ? Math.max(...xs) : 1;
    const minY = ys.length ? Math.min(0, Math.min(...ys)) : 0;
    const maxY = ys.length ? Math.max(...ys) : 1;

    const xRange = maxX - minX || 1;
    const yRange = maxY - minY || 1;

    const toSvg = (xVal: number, yVal: number) => ({
      sx: PAD.left + ((xVal - minX) / xRange) * PLOT_W,
      sy: PAD.top + PLOT_H - ((yVal - minY) / yRange) * PLOT_H,
    });

    // Build polyline
    const svgPoints = points.map((p) => {
      const { sx, sy } = toSvg(p.xAxis, p.yAxis);
      return `${sx.toFixed(2)},${sy.toFixed(2)}`;
    });

    // Find max altitude point
    let maxAltIdx = 0;
    points.forEach((p, i) => {
      if (p.yAxis > points[maxAltIdx].yAxis) maxAltIdx = i;
    });

    // Detect max Q (simplified: highest dynamic pressure proxy = early high velocity)
    let maxQIdx = 0;
    let maxQVal = 0;
    points.forEach((p, i) => {
      // Proxy: altitude between 10-20 km with highest index rate of change
      if (i > 0 && p.yAxis > 5000 && p.yAxis < 30000) {
        const vel = Math.abs(p.yAxis - points[i - 1].yAxis);
        if (vel > maxQVal) {
          maxQVal = vel;
          maxQIdx = i;
        }
      }
    });

    // Generate grid lines
    const xTicks = 6;
    const yTicks = 5;
    const xGridLines = Array.from({ length: xTicks + 1 }, (_, i) => {
      const val = minX + (xRange / xTicks) * i;
      return { val, sx: PAD.left + (i / xTicks) * PLOT_W };
    });
    const yGridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
      const val = minY + (yRange / yTicks) * i;
      return { val, sy: PAD.top + PLOT_H - (i / yTicks) * PLOT_H };
    });

    // Altitude bands
    const karmánLine = 100000; // 100 km
    const karmánSy = minY <= karmánLine && maxY >= karmánLine
      ? PAD.top + PLOT_H - ((karmánLine - minY) / yRange) * PLOT_H
      : null;

    return {
      polylinePoints: svgPoints.join(' '),
      fillPoints: svgPoints.join(' ') + ` ${PAD.left + PLOT_W},${PAD.top + PLOT_H} ${PAD.left},${PAD.top + PLOT_H}`,
      extremes: { minX, maxX, minY, maxY },
      maxAlt: maxAltIdx < points.length ? {
        ...toSvg(points[maxAltIdx].xAxis, points[maxAltIdx].yAxis),
        value: points[maxAltIdx].yAxis,
      } : null,
      maxQ: maxQIdx > 0 && maxQIdx < points.length ? {
        ...toSvg(points[maxQIdx].xAxis, points[maxQIdx].yAxis),
        value: points[maxQIdx].yAxis,
      } : null,
      xGridLines,
      yGridLines,
      karmánSy,
    };
  }, [frames, metadata, mode]);

  if (frames.length === 0) {
    return (
      <AeroCard title={title}>
        <div className="relative w-full min-h-[420px] flex items-center justify-center text-muted-foreground bg-card/20 rounded-lg border border-border/30">
          <p className="text-sm">Run a simulation to visualize trajectory</p>
        </div>
      </AeroCard>
    );
  }

  const xLabel = mode === '1D' ? 'Time (s)' : 'Downrange (m)';
  const yLabel = 'Altitude (m)';

  return (
    <AeroCard title={title}>
      <div className="relative w-full min-h-[420px]">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="2D trajectory visualization" className="w-full h-auto">
          <defs>
            {/* Trajectory gradient */}
            <linearGradient id="trajGrad2d" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff6600" />
              <stop offset="30%" stopColor="#ffcc00" />
              <stop offset="60%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            {/* Area fill gradient */}
            <linearGradient id="trajFill2d" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="trajGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Marker glow */}
            <filter id="markerGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={WIDTH} height={HEIGHT} rx="8" fill="#0a0f1a" />

          {/* Plot area bg */}
          <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill="#0d1420" rx="4" />

          {/* Grid lines */}
          {vizData.xGridLines.map((tick, i) => (
            <g key={`xg-${i}`}>
              <line
                x1={tick.sx} y1={PAD.top} x2={tick.sx} y2={PAD.top + PLOT_H}
                stroke="#1a2540" strokeWidth="1"
              />
              <text x={tick.sx} y={PAD.top + PLOT_H + 18} textAnchor="middle"
                fill="#5a6a8a" fontSize="10" fontFamily="Rajdhani, sans-serif">
                {formatAxis(tick.val)}
              </text>
            </g>
          ))}
          {vizData.yGridLines.map((tick, i) => (
            <g key={`yg-${i}`}>
              <line
                x1={PAD.left} y1={tick.sy} x2={PAD.left + PLOT_W} y2={tick.sy}
                stroke="#1a2540" strokeWidth="1"
              />
              <text x={PAD.left - 8} y={tick.sy + 4} textAnchor="end"
                fill="#5a6a8a" fontSize="10" fontFamily="Rajdhani, sans-serif">
                {formatAxis(tick.val)}
              </text>
            </g>
          ))}

          {/* Kármán line (100 km) */}
          {vizData.karmánSy !== null && (
            <g>
              <line
                x1={PAD.left} y1={vizData.karmánSy}
                x2={PAD.left + PLOT_W} y2={vizData.karmánSy}
                stroke="#ff4444" strokeWidth="1" strokeDasharray="6 4" opacity="0.4"
              />
              <text x={PAD.left + PLOT_W - 4} y={vizData.karmánSy - 6}
                textAnchor="end" fill="#ff6666" fontSize="9" fontFamily="Rajdhani, sans-serif" opacity="0.7">
                Kármán Line (100 km)
              </text>
            </g>
          )}

          {/* Area fill under trajectory */}
          <polygon
            points={vizData.fillPoints}
            fill="url(#trajFill2d)"
          />

          {/* Trajectory glow (behind main line) */}
          <polyline
            points={vizData.polylinePoints}
            fill="none"
            stroke="url(#trajGrad2d)"
            strokeWidth="6"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.3"
            filter="url(#trajGlow)"
          />

          {/* Main trajectory line */}
          <polyline
            points={vizData.polylinePoints}
            fill="none"
            stroke="url(#trajGrad2d)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Max altitude marker */}
          {vizData.maxAlt && (
            <g filter="url(#markerGlow)">
              <circle cx={vizData.maxAlt.sx} cy={vizData.maxAlt.sy} r="5" fill="#10b981" opacity="0.8" />
              <circle cx={vizData.maxAlt.sx} cy={vizData.maxAlt.sy} r="8" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.4" />
              <text x={vizData.maxAlt.sx + 12} y={vizData.maxAlt.sy - 8}
                fill="#10b981" fontSize="10" fontFamily="Rajdhani, sans-serif" fontWeight="600">
                APOGEE {(vizData.maxAlt.value / 1000).toFixed(1)} km
              </text>
            </g>
          )}

          {/* Max Q marker */}
          {vizData.maxQ && (
            <g filter="url(#markerGlow)">
              <circle cx={vizData.maxQ.sx} cy={vizData.maxQ.sy} r="4" fill="#f59e0b" opacity="0.8" />
              <circle cx={vizData.maxQ.sx} cy={vizData.maxQ.sy} r="7" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.4" />
              <text x={vizData.maxQ.sx + 12} y={vizData.maxQ.sy + 4}
                fill="#f59e0b" fontSize="9" fontFamily="Rajdhani, sans-serif" fontWeight="600">
                MAX Q
              </text>
            </g>
          )}

          {/* Axis labels */}
          <text x={PAD.left + PLOT_W / 2} y={HEIGHT - 6}
            textAnchor="middle" fill="#7a8aaa" fontSize="11" fontFamily="Rajdhani, sans-serif" letterSpacing="0.05em">
            {xLabel}
          </text>
          <text x={14} y={PAD.top + PLOT_H / 2}
            textAnchor="middle" fill="#7a8aaa" fontSize="11" fontFamily="Rajdhani, sans-serif"
            transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`} letterSpacing="0.05em">
            {yLabel}
          </text>

          {/* Phase legend */}
          <g transform={`translate(${PAD.left + 10}, ${PAD.top + 10})`}>
            <rect width="130" height="60" rx="4" fill="#0a0f1a" fillOpacity="0.8" stroke="#1a2540" />
            {[
              { label: 'Boost', color: '#ff6600' },
              { label: 'Coast', color: '#22d3ee' },
              { label: 'Orbital', color: '#10b981' },
            ].map((item, i) => (
              <g key={item.label} transform={`translate(10, ${14 + i * 17})`}>
                <circle cx="5" cy="0" r="4" fill={item.color} opacity="0.9" />
                <text x="16" y="4" fill="#8899bb" fontSize="10" fontFamily="Rajdhani, sans-serif">
                  {item.label}
                </text>
              </g>
            ))}
          </g>

          {/* Plot border */}
          <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H}
            fill="none" stroke="#1e2d4a" strokeWidth="1" rx="4" />
        </svg>

        {DEBUG_VIS && (
          <div className="absolute top-4 left-4 text-xs bg-background/70 text-primary/80 px-3 py-2 rounded shadow">
            <div>frames: {frames.length}</div>
            <div>x: {sanitize(vizData.extremes.minX).toFixed(1)} → {sanitize(vizData.extremes.maxX).toFixed(1)}</div>
            <div>y: {sanitize(vizData.extremes.minY).toFixed(1)} → {sanitize(vizData.extremes.maxY).toFixed(1)}</div>
          </div>
        )}
      </div>
    </AeroCard>
  );
});