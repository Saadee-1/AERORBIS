---
name: Antenna Tier-1 Upgrades
description: Bandwidth sweep, polarization engine and link budget added to Antenna Pattern Analyzer (Phases 1-3 of upgrade roadmap)
type: feature
---
The Antenna Pattern Analyzer has three additive Tier-1 modules mounted as
tabs inside an "Advanced Analyses" card below the existing results panel.
They DO NOT modify any existing physics in `src/lib/antenna/math.ts` or
`models-enhanced.ts` (logic-freeze policy).

Files:
- `src/lib/antenna/sweep.ts` — runFrequencySweep(antennaId, geometry, fMin, fMax, opts).
  Returns { points[], summary{ peakGain, bandwidth3dB, fractionalBW, gainFlatness } }.
  Calls existing `computePatternFromRegistry` per frequency.
- `src/lib/antenna/polarization.ts` — Stokes-parameter decomposition,
  axial ratio, sense (RHCP/LHCP/Linear), XPD, and polarization-mismatch
  loss formula (ITU-R BO.1212 / Balanis §2.12).
- `src/lib/antenna/linkBudget.ts` — Friis FSPL, simplified ITU-R P.676
  (gases) and P.618 (rain), C/N₀, Eb/N₀, G/T, margin verdict
  (PASS/MARGINAL/FAIL @ 3 dB threshold). Includes 5 mission presets
  (ISS UHF, Starlink Ku, GEO Ku, Lunar X-band DSN, CubeSat LoRa).
- `src/components/tools/antenna/AdvancedAnalysisPanel.tsx` — Tabs UI.

Tab 1 polarization loss feeds into Tab 3 link budget automatically.

Roadmap reference: `.lovable/plan.md` (Phases 4-6 still pending — mutual
coupling via Carter, PO reflectors, NEC2 WASM MoM solver).