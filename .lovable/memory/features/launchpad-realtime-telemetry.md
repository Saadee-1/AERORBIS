---
name: Launchpad Real-Time Telemetry
description: Local solar time + Day/Night badge on selected launch site card, plus optional Expert-mode upcoming launches feed via cached LL2 edge function
type: feature
---

OrbitalVisualizer launchpad live data:

**Local time + Day/Night badge** (all modes, in selected pad detail panel)
- Helper: `src/components/tools/utils/launchSiteLocalTime.ts` → `computeLaunchPadClock(lat, lon, now)` returns `{ localTimeStr, isDay, sunAltitudeDeg }`.
- Local solar time = UTC + lon/15h (no timezone DB needed).
- Day/Night via solar altitude using Cooper's declination formula + hour angle. `isDay = sunAltitudeDeg > 0`.
- 1 Hz tick: `clockTick` setInterval only runs while a pad is selected (cleanup on unselect).
- Badge: amber Sun icon for Day, indigo Moon for Night, with altitude in degrees.

**Upcoming Real Launches** (Expert mode only, optional toggle)
- Edge function: `supabase/functions/upcoming-launches/index.ts` proxies The Space Devs LL2 (`https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list`).
- In-memory cache, TTL 30 min — stays well under LL2 free tier 15 req/hr.
- Stale-cache fallback: if upstream fails but cache exists, serve stale.
- `verify_jwt = false` in `supabase/config.toml` (public read-only proxy).
- UI: Switch toggle inside Expert-only AeroCard. Lists rocket, status badge, NET (UTC), pad. Shows cache age footer.
- Invoked via `supabase.functions.invoke("upcoming-launches")` — no direct fetch from client.

This is the ONLY external API integration in OrbitalVisualizer (LL2 is free, no key required). Keeps the rest of the tool deterministic and offline-capable.
