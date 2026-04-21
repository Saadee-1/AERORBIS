// Live satellites — fetches TLEs from CelesTrak for ISS + a small Starlink subset.
// Cached in-memory for 30 min so we stay well below CelesTrak's polite-use limits
// and to keep client payloads small. No auth required (public catalog data).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TLE {
  name: string;
  line1: string;
  line2: string;
  group: 'iss' | 'starlink';
}

interface CacheEntry {
  data: TLE[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
let cache: CacheEntry | null = null;

// Parse 3-line-element format (NAME / L1 / L2 repeated)
function parseTLE(text: string, group: 'iss' | 'starlink'): TLE[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const out: TLE[] = [];
  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i];
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (l1?.startsWith('1 ') && l2?.startsWith('2 ')) {
      out.push({ name, line1: l1, line2: l2, group });
    }
  }
  return out;
}

async function fetchAll(): Promise<TLE[]> {
  // ISS (Zarya) — single object
  const issRes = await fetch(
    'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle',
  );
  const issText = issRes.ok ? await issRes.text() : '';
  const iss = parseTLE(issText, 'iss');

  // Starlink full group — we cap to first 30 for performance
  const slRes = await fetch(
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
  );
  const slText = slRes.ok ? await slRes.text() : '';
  const starlink = parseTLE(slText, 'starlink').slice(0, 30);

  return [...iss, ...starlink];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const now = Date.now();
    if (!cache || now - cache.fetchedAt > CACHE_TTL_MS) {
      try {
        const data = await fetchAll();
        if (data.length > 0) {
          cache = { data, fetchedAt: now };
        }
      } catch (err) {
        console.error('CelesTrak fetch failed', err);
        // fall through to stale cache below
      }
    }

    if (!cache) {
      return new Response(
        JSON.stringify({ error: 'No TLE data available' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        satellites: cache.data,
        cachedAt: cache.fetchedAt,
        cacheAgeSec: Math.round((now - cache.fetchedAt) / 1000),
        ttlSec: CACHE_TTL_MS / 1000,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});