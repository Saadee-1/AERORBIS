/**
 * 3D Trajectory Visualizer - Cinematic Edition
 * Re-exports the cinematic visualizer with enhanced wrapper
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
  return (
    <AeroCard title="Cinematic 3D Visualization">
      <CinematicVisualizer
        planet={planet}
        result={result}
        mode={mode || '3D'}
        onSnapshot={(base64) => {
          console.log('Snapshot captured:', base64 ? 'Base64 data' : 'Empty');
        }}
      />
      <div className="mt-4 p-3 bg-card/30 rounded-lg border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {[
              { label: 'Boost', color: 'bg-[#ff6600]' },
              { label: 'Coast', color: 'bg-[#22d3ee]' },
              { label: 'Orbital', color: 'bg-[#10b981]' },
            ].map((phase) => (
              <span key={phase.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${phase.color}`} />
                {phase.label}
              </span>
            ))}
          </div>
          <span className="text-xs text-muted-foreground/60 ml-auto">
            Use timeline controls to scrub through the flight • Free camera mode for manual orbit
          </span>
        </div>
      </div>
    </AeroCard>
  );
}