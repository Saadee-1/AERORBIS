/**
 * useLiveSatellites — fetches TLEs from the live-satellites edge function and
 * propagates each satellite to its current sub-point (lat/lon/alt) every second
 * using satellite.js SGP4. Returns derived eclipse status too.
 *
 * The hook is OFF by default: pass `enabled={true}` to start fetching/propagating.
 * TLEs are cached for the lifetime of the hook — propagation is local & cheap.
 */

import { useEffect, useRef, useState } from 'react';
import * as satellite from 'satellite.js';
import { supabase } from '@/integrations/supabase/client';
import { isEclipsed, sunDirectionECI } from '../utils/liveLayerMath';

export interface LiveSatellite {
  name: string;
  group: 'iss' | 'starlink';
  lat: number; // deg
  lon: number; // deg
  altKm: number;
  inEclipse: boolean;
}

interface RawTLE {
  name: string;
  line1: string;
  line2: string;
  group: 'iss' | 'starlink';
}

interface UseLiveSatellitesOptions {
  enabled: boolean;
  /** Filter which catalogue groups to include */
  groups?: { iss: boolean; starlink: boolean };
  /** Propagation tick rate in ms (default 1000) */
  intervalMs?: number;
}

export function useLiveSatellites({
  enabled,
  groups = { iss: true, starlink: true },
  intervalMs = 1000,
}: UseLiveSatellitesOptions) {
  const [tles, setTles] = useState<RawTLE[]>([]);
  const [satellites, setSatellites] = useState<LiveSatellite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordsRef = useRef<Array<{ rec: satellite.SatRec; raw: RawTLE }>>([]);

  // Fetch TLEs once when enabled
  useEffect(() => {
    if (!enabled || tles.length > 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('live-satellites');
        if (cancelled) return;
        if (error) throw error;
        const list = (data?.satellites ?? []) as RawTLE[];
        setTles(list);
        recordsRef.current = list
          .map((raw) => {
            try {
              const rec = satellite.twoline2satrec(raw.line1, raw.line2);
              return { rec, raw };
            } catch {
              return null;
            }
          })
          .filter((x): x is { rec: satellite.SatRec; raw: RawTLE } => x !== null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load satellites');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, tles.length]);

  // Propagate every tick while enabled
  useEffect(() => {
    if (!enabled || recordsRef.current.length === 0) {
      setSatellites([]);
      return;
    }

    const tick = () => {
      const now = new Date();
      const gmst = satellite.gstime(now);
      const sunUnit = sunDirectionECI(now);
      const out: LiveSatellite[] = [];
      for (const { rec, raw } of recordsRef.current) {
        if (raw.group === 'iss' && !groups.iss) continue;
        if (raw.group === 'starlink' && !groups.starlink) continue;
        const pv = satellite.propagate(rec, now);
        const pos = pv.position;
        if (!pos || typeof pos === 'boolean') continue;
        const geo = satellite.eciToGeodetic(pos, gmst);
        const lat = satellite.degreesLat(geo.latitude);
        const lon = satellite.degreesLong(geo.longitude);
        const altKm = geo.height;
        const eclipse = isEclipsed([pos.x, pos.y, pos.z], sunUnit);
        out.push({ name: raw.name, group: raw.group, lat, lon, altKm, inEclipse: eclipse });
      }
      setSatellites(out);
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, groups.iss, groups.starlink, intervalMs, tles.length]);

  return { satellites, loading, error };
}