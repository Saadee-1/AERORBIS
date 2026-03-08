/**
 * Markers Component
 * Renders event markers as billboards
 */

import { Html } from '@react-three/drei';
import { TrajectoryFrame } from '../../utils/three/threeUtils';

interface Marker {
  name: string;
  t: number;
  pos: [number, number, number];
  frame: TrajectoryFrame;
}

interface MarkersProps {
  markers: Marker[];
  showMarkers?: boolean;
  onMarkerClick?: (marker: Marker) => void;
}

const MARKER_ICONS: Record<string, string> = {
  maxQ: '⚡',
  MECO: '🔥',
  stageSep: '🚀',
  fairingSep: '🛡️',
  apoapsis: '⬆️',
  periapsis: '⬇️',
};

const MARKER_COLORS: Record<string, string> = {
  maxQ: '#f59e0b',
  MECO: '#ef4444',
  stageSep: '#059669',
  fairingSep: '#8b5cf6',
  apoapsis: '#10b981',
  periapsis: '#34d399',
};

export function Markers({ markers, showMarkers = true, onMarkerClick }: MarkersProps) {
  if (!showMarkers || markers.length === 0) {
    return null;
  }

  return (
    <>
      {markers.map((marker, index) => (
        <Html
          key={`${marker.name}-${index}`}
          position={marker.pos}
          center
          distanceFactor={10}
        >
          <div
            className="cursor-pointer transition-all hover:scale-110"
            onClick={() => onMarkerClick?.(marker)}
            style={{
              backgroundColor: MARKER_COLORS[marker.name] || '#10b981',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
            title={`${marker.name} at t=${marker.t.toFixed(1)}s`}
          >
            {MARKER_ICONS[marker.name] || '📍'} {marker.name}
          </div>
        </Html>
      ))}
    </>
  );
}
