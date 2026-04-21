/**
 * LiveLayersPanel — floating control panel with 4 toggleable real-time layers:
 *   1. ISS / Starlink overlay (CelesTrak TLE → SGP4)
 *   2. Coverage cone / footprint shading
 *   3. Eclipse / sunlight shading on satellite
 *   4. Ground-station link visualization
 *
 * Settings are persisted to localStorage (`aerorbis_live_layers_v1`).
 */

import { useEffect, useState } from 'react';
import { Activity, Radio, Sun, Satellite, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export interface LiveLayersState {
  liveSats: boolean;
  liveSatsIss: boolean;
  liveSatsStarlink: boolean;
  coverage: boolean;
  eclipse: boolean;
  gsLinks: boolean;
}

const STORAGE_KEY = 'aerorbis_live_layers_v1';

const DEFAULTS: LiveLayersState = {
  liveSats: false,
  liveSatsIss: true,
  liveSatsStarlink: false,
  coverage: true,
  eclipse: true,
  gsLinks: true,
};

function loadState(): LiveLayersState {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LiveLayersState>) };
  } catch {
    return DEFAULTS;
  }
}

export function useLiveLayersState() {
  const [state, setState] = useState<LiveLayersState>(loadState);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);
  const update = (patch: Partial<LiveLayersState>) => setState((s) => ({ ...s, ...patch }));
  return { state, update };
}

interface LiveLayersPanelProps {
  state: LiveLayersState;
  onChange: (patch: Partial<LiveLayersState>) => void;
  liveSatCount?: number;
  liveSatLoading?: boolean;
  liveSatError?: string | null;
}

export function LiveLayersPanel({
  state,
  onChange,
  liveSatCount = 0,
  liveSatLoading = false,
  liveSatError = null,
}: LiveLayersPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const activeCount =
    (state.liveSats ? 1 : 0) +
    (state.coverage ? 1 : 0) +
    (state.eclipse ? 1 : 0) +
    (state.gsLinks ? 1 : 0);

  return (
    <div className="absolute bottom-2 right-2 z-20 w-[230px] bg-background/90 backdrop-blur-md border border-primary/30 rounded-lg shadow-xl text-xs select-none">
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-2 border-b border-border/50 hover:bg-muted/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold text-foreground tracking-wide text-[11px]">LIVE LAYERS</span>
          <span className="text-[9px] text-muted-foreground">({activeCount}/4)</span>
        </div>
        {collapsed ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <div className="p-3 space-y-2.5">
          {/* Live satellites */}
          <div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Satellite className="w-3 h-3 text-[hsl(190,90%,60%)]" />
                <span className="text-foreground font-medium">Live satellites</span>
              </label>
              <Switch
                checked={state.liveSats}
                onCheckedChange={(v) => onChange({ liveSats: v })}
              />
            </div>
            {state.liveSats && (
              <div className="mt-1.5 ml-4 space-y-1">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px] text-muted-foreground">ISS</span>
                  <Switch
                    checked={state.liveSatsIss}
                    onCheckedChange={(v) => onChange({ liveSatsIss: v })}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px] text-muted-foreground">Starlink (top 30)</span>
                  <Switch
                    checked={state.liveSatsStarlink}
                    onCheckedChange={(v) => onChange({ liveSatsStarlink: v })}
                  />
                </label>
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  {liveSatLoading && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {liveSatError ? (
                    <span className="text-destructive">⚠ {liveSatError}</span>
                  ) : liveSatLoading ? (
                    <span>Fetching TLEs…</span>
                  ) : (
                    <span>● {liveSatCount} tracked · CelesTrak SGP4</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Coverage cone */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-primary/60 bg-primary/15" />
              <span className="text-foreground font-medium">Coverage cone</span>
            </span>
            <Switch
              checked={state.coverage}
              onCheckedChange={(v) => onChange({ coverage: v })}
            />
          </label>

          {/* Eclipse */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Sun className="w-3 h-3 text-[hsl(45,95%,60%)]" />
              <span className="text-foreground font-medium">Eclipse shading</span>
            </span>
            <Switch
              checked={state.eclipse}
              onCheckedChange={(v) => onChange({ eclipse: v })}
            />
          </label>

          {/* GS links */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-[hsl(145,70%,55%)]" />
              <span className="text-foreground font-medium">GS link lines</span>
            </span>
            <Switch
              checked={state.gsLinks}
              onCheckedChange={(v) => onChange({ gsLinks: v })}
            />
          </label>
        </div>
      )}
    </div>
  );
}