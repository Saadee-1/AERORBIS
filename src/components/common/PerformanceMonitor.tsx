/**
 * Performance Monitor UI Component
 * Displays real-time performance metrics
 */

"use client";

import { useState } from 'react';
import { Activity, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePerformanceMonitor, PerformanceMetrics } from '@/lib/performance';

interface PerformanceMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

export function PerformanceMonitor({
  enabled = false,
  position = 'top-right',
  compact = false,
}: PerformanceMonitorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const metrics = usePerformanceMonitor(enabled && isOpen);

  if (!enabled) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (compact) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-900/90 border-primary/30 text-primary"
        >
          <Activity className="w-3 h-3 mr-1" />
          <span className={getFPSColor(metrics.fps)}>{metrics.fps} FPS</span>
        </Button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="bg-slate-900/90 border-primary/30 text-primary"
        >
          <Activity className="w-4 h-4 mr-2" />
          Performance
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 bg-slate-900/95 backdrop-blur-lg border border-cyan-400/30 rounded-lg p-3 w-64`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-cyan-400">Performance</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">FPS</span>
          <span className={getFPSColor(metrics.fps)}>{metrics.fps}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Frame Time</span>
          <span className="text-white">{metrics.frameTime.toFixed(1)} ms</span>
        </div>
        {metrics.simulationTime > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Simulation</span>
            <span className="text-white">{metrics.simulationTime.toFixed(1)} ms</span>
          </div>
        )}
        {metrics.memoryUsage !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-400">Memory</span>
            <span className="text-white">{metrics.memoryUsage.toFixed(1)} MB</span>
          </div>
        )}
        {metrics.workerLoad !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-400">Worker Load</span>
            <span className="text-white">{metrics.workerLoad.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
