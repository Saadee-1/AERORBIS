// Cached proxy to The Space Devs Launch Library 2 API (free tier: 15 req/hr).
// We cache responses in-memory for 30 minutes to stay well under the rate limit.
// Public endpoint — no auth required from the client.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface LaunchEntry {
  id: string;
  name: string;
  net: string;             // launch net date ISO
  status: string;
  rocket: string;
  pad: string;
  pad_lat: number | null;
  pad_lon: number | null;
  mission: string | null;
  image: string | null;
}

interface CacheEntry {
  data: LaunchEntry[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
let cache: CacheEntry | null = null;

async function fetchUpcoming(): Promise<LaunchEntry[]> {
  const url = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`LL2 upstream ${res.status}`);
  }
  const json = await res.json() as { results?: any[] };
  const results = json.results ?? [];
  return results.map((r): LaunchEntry => ({
    id: String(r.id ?? ""),
    name: String(r.name ?? "Unknown launch"),
    net: String(r.net ?? ""),
    status: String(r.status?.name ?? r.status?.abbrev ?? "TBD"),
    rocket: String(r.rocket?.configuration?.name ?? r.rocket?.configuration?.full_name ?? ""),
    pad: String(r.pad?.name ?? ""),
    pad_lat: r.pad?.latitude != null ? Number(r.pad.latitude) : null,
    pad_lon: r.pad?.longitude != null ? Number(r.pad.longitude) : null,
    mission: r.mission?.name ? String(r.mission.name) : null,
    image: r.image ? String(r.image) : null,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const now = Date.now();
    const cacheValid = cache && now - cache.fetchedAt < CACHE_TTL_MS;

    if (!cacheValid) {
      try {
        const data = await fetchUpcoming();
        cache = { data, fetchedAt: now };
      } catch (e) {
        // If upstream fails but we have stale cache, serve it.
        if (!cache) throw e;
      }
    }

    return new Response(
      JSON.stringify({
        launches: cache!.data,
        cachedAt: new Date(cache!.fetchedAt).toISOString(),
        cacheAgeSec: Math.round((now - cache!.fetchedAt) / 1000),
        ttlSec: CACHE_TTL_MS / 1000,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
    );
  }
});
