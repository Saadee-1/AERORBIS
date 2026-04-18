---
name: Launch Site Intelligence
description: Beginner tooltips + efficiency-ranked launch site dropdown + selected pad highlight on ground track
type: feature
---

OrbitalVisualizer launch site features:
- Beginner mode: HelpCircle tooltips on Periapsis Altitude, Eccentricity, Inclination inputs (plain-English copy for school students).
- University + Expert: "Launch Site (Efficiency Ranked)" AeroCard with Select dropdown sorted by net Δv advantage for the current target inclination.
- Ranking helper: src/components/tools/utils/launchSiteEfficiency.ts (`rankLaunchSites`, `starsLabel`). Heuristic: rotation bonus = 465·cos(lat)·cos(i_target − lat); plane-change penalty = 2·v_LEO·sin(Δi/2). Stars 1–5 mapped across sorted band.
- LAUNCH_SITES is now exported from OrbitalGroundTrack.tsx (do not duplicate the list).
- Selected pad: passed as `selectedLaunchSiteName` to OrbitalGroundTrack — renders a pulsing cyan ring (animate r 6→14, opacity 0.9→0.1, dur 2.2s) around the marker.
- No external launch APIs used (logic-freeze: no paid/external dependencies). Free APIs (LL2, SpaceX) intentionally NOT integrated — see Launchpad data instead derived from static curated list.
