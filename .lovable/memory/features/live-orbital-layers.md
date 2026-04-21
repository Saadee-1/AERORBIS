---
name: Live Orbital Layers (Phase 2)
description: Four toggleable real-time layers on the Orbital Ground Track (2D + 3D) — live ISS/Starlink overlay via CelesTrak SGP4, coverage cone, eclipse shading, and ground-station link lines, all controlled via a floating panel
type: feature
---

The Orbital Ground Track (2D Mercator + 3D globe) supports four independently toggleable, real-time visualization layers controlled via a floating `LiveLayersPanel` in the bottom-right corner. Settings persist in `localStorage` under `aerorbis_live_layers_v1`.

## The 4 layers

1. **Live satellites (ISS / Starlink)** — fetches TLE elements from a Supabase edge function (`live-satellites`) which proxies CelesTrak (`gp.php?CATNR=25544` for ISS + `GROUP=starlink` for Starlink, capped at top 30). Edge function caches TLEs in-memory for 30 min. Client-side `useLiveSatellites` hook propagates each satellite to its current sub-point (lat/lon/alt) every 1 s using `satellite.js` SGP4 (`twoline2satrec` → `propagate` → `eciToGeodetic`). ISS rendered as a larger pulsing cyan dot with label; Starlink as small purple dots. Sub-toggles for ISS and Starlink independently.

2. **Coverage cone / footprint** — for the user's primary computed orbit. Spherical-cap polygon using `ρ = acos(R_E / (R_E + h))`. On 2D map: dashed translucent polygon. On 3D globe: a translucent triangle-fan cone from the satellite down to the surface ring + a bright outline ring on the surface.

3. **Eclipse shading** — cylindrical Earth-shadow test using a J2000-based sun unit vector (mean longitude + mean anomaly + obliquity, no SPICE dependency). Both the user's primary satellite marker and live ISS/Starlink dots dim and recolor to twilight blue when in umbra. Sub-satellite point shows a `☀ SUNLIT` / `☾ ECLIPSE` badge on the 2D map.

4. **GS link lines** — when the user's primary satellite is in line-of-sight of a ground station (above its `minElev`), a green dashed link line is drawn (2D) or a solid bright-green line (3D) from station to satellite. Re-uses the existing 10-station catalog.

## Architecture

- **`supabase/functions/live-satellites/index.ts`** — public, no-auth edge function (`verify_jwt = false`). Returns `{ satellites: TLE[], cachedAt, cacheAgeSec, ttlSec }`. Falls back to stale cache on upstream failure.
- **`src/components/tools/utils/liveLayerMath.ts`** — pure math: `sunDirectionECI`, `isEclipsed`, `coverageHalfAngle`, `footprintPolygon`, `elevationAngle`, `geodeticToECI`. No React, no Three.js.
- **`src/components/tools/hooks/useLiveSatellites.ts`** — fetch-once + 1 Hz local SGP4 propagation, with eclipse computed inline.
- **`src/components/tools/LiveLayersPanel.tsx`** — floating panel + `useLiveLayersState` hook (localStorage persisted).
- **`src/components/tools/OrbitalGroundTrack.tsx`** — wires panel/hook into 2D SVG; gates existing footprint + GS lines behind their toggles; adds live SGP4 markers to the SVG; passes everything to `<GroundTrack3DGlobe>`.
- **`src/components/tools/GroundTrack3DGlobe.tsx`** — accepts `liveLayers`, `liveSats`, `groundStations`, `userSatEclipsed` props. Renders all live overlays into a dedicated `liveGroup` that rotates with the earth/track/pins groups.

## Logic-freeze policy ✓

No orbital propagation math is duplicated. SGP4 comes from the standard `satellite.js` library; the user's primary orbit Kepler propagation in `OrbitalGroundTrack.tsx` is unchanged; the 3D globe still consumes the same `tracks` array.

## Performance

- TLEs fetched once on enable (30 min server cache, infinite client cache via hook ref).
- SGP4 propagation only runs while `liveSats` toggle is on; tick rate 1 Hz.
- Three.js `liveGroup` children are disposed on every rebuild (geometries + materials).
- Cone uses 36 steps in inset, 64 in fullscreen.

## Free / no-key APIs only

CelesTrak `gp.php` endpoint is free, public, and does not require an API key. Stays within the project's "no paid APIs" rule.