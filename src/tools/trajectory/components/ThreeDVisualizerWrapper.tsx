/**
 * 3D Trajectory Visualizer - Cinematic Edition
 * Re-exports the new cinematic visualizer
 */

import { AeroCard } from '@/components/common/AeroCard';
import { ThreeDVisualizer as CinematicVisualizer } from './ThreeDVisualizer/index';
import { Planet } from '../data/planets';

interface ThreeDVisualizerProps {
  planet: Planet;
  trajectory?: Array<{ position: [number, number, number]; altitude: number }>;
  currentState?: {
    position: [number, number, number];
    attitude?: unknown;
  };
  result?: unknown;
  mode?: '1D' | '2D' | '3D';
}

export function ThreeDVisualizer({ planet, trajectory, currentState, result, mode = '3D' }: ThreeDVisualizerProps) {
  // The visualizer will convert result internally, so we just pass it through
  return (
    <AeroCard title="Cinematic 3D Visualization">
      <CinematicVisualizer
        planet={planet}
        result={result}
        mode={mode || '3D'}
        onSnapshot={(base64) => {
          // Handle snapshot for PDF export
          console.log('Snapshot captured:', base64 ? 'Base64 data' : 'Empty');
        }}
      />
      <div className="mt-4 p-3 bg-card/30 rounded border border-primary/20">
        <p className="text-xs text-gray-400">
          Cinematic 3D visualizer with Earth, trajectory path, markers, and multiple camera modes. Use timeline controls to play/pause and scrub through the flight.
        </p>
      </div>
    </AeroCard>
  );
}
