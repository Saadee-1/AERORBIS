/**
 * AERORBIS Legend Component
 * 
 * Shared legend component for all calculator charts.
 * Provides consistent, non-overlapping legend layout across all tools.
 */

export interface LegendItem {
  id: string;
  name: string;
  role?: string;
  color: string; // line color used in the chart
}

export interface AerorbisLegendProps {
  items: LegendItem[];
  className?: string;
}

/**
 * Standardized legend component for all AERORBIS calculator charts.
 * 
 * Features:
 * - Non-overlapping flexbox layout with wrapping
 * - Consistent spacing and typography
 * - Supports up to 5+ series cleanly
 * - Compact but readable design
 */
export function AerorbisLegend({ items, className = "" }: AerorbisLegendProps) {
  if (!items || items.length === 0) return null;
  
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1.5 items-center justify-start text-xs leading-tight ${className}`}>
      {items.map((item) => (
        <div key={item.id} className="inline-flex items-center whitespace-nowrap">
          <div
            className="w-3.5 h-0.5 mr-1.5 flex-shrink-0"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-slate-300">
            {item.role ? `${item.name} · ${item.role}` : item.name}
          </span>
        </div>
      ))}
    </div>
  );
}

// Backwards compatibility alias
export const AeroverseLegend = AerorbisLegend;
export type AeroverseLegendProps = AerorbisLegendProps;

