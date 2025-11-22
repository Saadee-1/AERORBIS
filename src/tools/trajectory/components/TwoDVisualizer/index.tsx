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

export const TwoDVisualizer = memo(function TwoDVisualizer({
  trajectoryData,
  mode,
  title = '2D Trajectory Visualizer',
}: TwoDVisualizerProps) {
  const frames = trajectoryData?.frames ?? [];
  const metadata = trajectoryData?.metadata;

  useEffect(() => {
    if (!IS_DEV) return;
    console.debug('TwoDVisualizer', {
      frames: frames.length,
      mode,
    });
  }, [frames.length, mode]);

  if (frames.length === 0) {
    return (
      <AeroCard title={title}>
        <div className="relative w-full min-h-[360px] flex items-center justify-center text-gray-400">
          <p>No trajectory data. Run a simulation to visualize.</p>
        </div>
      </AeroCard>
    );
  }

  const { polylinePoints, extremes } = useMemo(() => {
    const planetRadius = metadata?.planetRadius ?? 0;
    const points = frames.map((frame) => {
      const xAxis =
        mode === '1D'
          ? frame.t
          : frame.x;
      const yAxis =
        mode === '1D'
          ? frame.z - planetRadius
          : frame.z - planetRadius;
      return {
        xAxis,
        yAxis,
      };
    });

    const xs = points.map((p) => p.xAxis);
    const ys = points.map((p) => p.yAxis);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = 800;
    const height = 360;

    const normalizedPoints = points.map((point) => {
      const xRange = maxX - minX || 1;
      const yRange = maxY - minY || 1;
      const normX = ((point.xAxis - minX) / xRange) * (width - 40) + 20;
      const normY = height - (((point.yAxis - minY) / yRange) * (height - 40) + 20);
      return `${normX.toFixed(2)},${normY.toFixed(2)}`;
    });

    return {
      polylinePoints: normalizedPoints.join(' '),
      extremes: {
        minX,
        maxX,
        minY,
        maxY,
      },
    };
  }, [frames, metadata, mode]);

  return (
    <AeroCard title={title}>
      <div className="relative w-full min-h-[360px]">
        <svg viewBox="0 0 800 360" role="img" aria-label="2D trajectory visualization">
          <defs>
            <linearGradient id="trajectoryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <rect width="800" height="360" fill="#0f172a" />
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="url(#trajectoryGradient)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        {DEBUG_VIS && (
          <div className="absolute top-4 left-4 text-xs bg-slate-950/70 text-cyan-200 px-3 py-2 rounded shadow">
            <div>frames: {frames.length}</div>
            <div>
              x-range: {extremes.minX.toFixed(1)} → {extremes.maxX.toFixed(1)}
            </div>
            <div>
              y-range: {extremes.minY.toFixed(1)} → {extremes.maxY.toFixed(1)}
            </div>
          </div>
        )}
      </div>
    </AeroCard>
  );
});
