## Plan: Beginner Tooltips + Real-Time Launchpad Intelligence

Two enhancements to the Orbital Path Visualizer.

### Part 1 — Beginner Mode Tooltips

Add small `(?)` icon next to each input label in Beginner mode (Periapsis Altitude, Eccentricity, Inclination). Uses existing shadcn `Tooltip` component (already in `src/components/ui/tooltip.tsx`).

Plain-English copy for school students:

- **Periapsis Altitude**: "The lowest point of the orbit above Earth's surface. Lower = faster satellite, more atmospheric drag."
- **Eccentricity**: "How stretched the orbit is. 0 = perfect circle, closer to 1 = long oval. Most satellites use ~0."
- **Inclination**: "The tilt of the orbit relative to the equator. 0° = equatorial, 90° = polar (passes over both poles), 51.6° = ISS."

Tooltips render only when `calculatorMode === 'Beginner'` to keep advanced UI clean.

### Part 2 — Launch Site Dropdown with Efficiency Ranking

Add a new "Launch Site" `AeroCard` in the inputs panel (visible in University + Expert modes; optional in Beginner with a simplified label).

**Data source**: Reuse the `LAUNCH_SITES` constant already defined in `src/components/tools/OrbitalGroundTrack.tsx` (Kennedy, Baikonur, Kourou, Vandenberg, Tanegashima, Sriharikota, Wenchou, etc.). Will export it from that file so `OrbitalVisualizer.tsx` can import.

**Efficiency ranking logic** (deterministic, no external API):
For a given target inclination `i`, the minimum required Δv penalty for a plane change at launch is approximately:

```
penalty = |cos(launch_latitude) - cos(i)| + max(0, launch_latitude - i)
```

Plus an Earth-rotation bonus for eastward launches near the equator: `bonus = cos(launch_latitude) × cos(i)` (lower latitude + prograde = more free Δv from Earth's spin, ~465 m/s at equator).

Combined score: `efficiency = bonus - penalty` → sort descending. Display as:

```
🇫🇷 Kourou, French Guiana          ★★★★★  (best — equatorial, +463 m/s assist)
🇺🇸 Kennedy Space Center, USA      ★★★★☆  (+390 m/s assist)
🇰🇿 Baikonur, Kazakhstan           ★★★☆☆  (latitude penalty for low-i orbits)
...
```

**Selecting a launch site** auto-fills the minimum achievable inclination (= site latitude) as a hint and highlights that pad on the 3D globe + ground track map.

### Part 3 — Real-Time Launchpad Data on Ground Track

Currently `OrbitalGroundTrack.tsx` shows static launch site dots. Enhance to show live telemetry:

- **Local time** at each pad (computed from longitude offset, no API)
- **Day/night status** (already computed via `computeTerminator`)
- **Next launch window** for the currently selected orbit: simple calculation of when Earth rotation brings the pad's latitude under the orbital plane (LAN crossing). Display as countdown "Next window in: 02h 14m"
- **Selected pad highlight**: pulsing cyan ring + label panel showing lat/lon/local time/window

No external API needed (no paid APIs per logic-freeze policy). All derived from existing orbital math + Date object.

### Files touched

- `src/components/tools/OrbitalVisualizer.tsx` — add tooltips, Launch Site card, pass selectedLaunchSite to ground track
- `src/components/tools/OrbitalGroundTrack.tsx` — export `LAUNCH_SITES`, add `selectedLaunchSiteId` prop, add real-time telemetry overlay for selected pad
- New helper `src/components/tools/utils/launchSiteEfficiency.ts` — pure ranking function
- `mem://features/launch-site-intelligence` — new memory documenting the feature
- `mem://index.md` — add reference

### Out of scope

- No external launch APIs (LL2, SpaceX API) — stays self-contained per "no paid APIs" rule
- No changes to physics/Kepler propagation
- No new tool routes  
  
  
  
and what if we add free api keys, and look for free api keys and tell me