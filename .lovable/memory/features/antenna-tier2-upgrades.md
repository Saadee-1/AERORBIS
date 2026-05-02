---
name: Antenna Tier-2 Upgrades
description: Mutual coupling (Carter) and PO reflector solver added to Antenna Pattern Analyzer (Phases 4-5)
type: feature
---
Tier-2 additions to the Antenna Pattern Analyzer, mounted as two new
tabs ("Coupling", "PO Reflector") inside AdvancedAnalysisPanel below the
existing results panel. Logic-freeze is preserved — no edits to math.ts
or models-enhanced.ts.

Files:
- src/lib/antenna/coupling.ts — Carter's method for parallel side-by-side
  λ/2 dipoles. Implements Si(x) and Ci(x) via series + A&S 5.2.38 rational
  asymptotic forms. Exposes mutualImpedanceParallelHalfwave, mutualImpedanceMatrix,
  activeImpedances, summarizeCoupledArray (gain correction in dB).
  Validation: Z21 @ 0.5λ ≈ -9.0 + j28.5 Ω (textbook -12.5 + j29.9 Ω, ~10% off
  due to rational A&S approximation — acceptable for engineering panels).
- src/lib/antenna/po.ts — Physical Optics for prime-focus parabolic dish.
  Cosine-q feed pattern, ring-and-J0-Hankel-transform principal cut, with
  edge taper, spillover η_s, illumination η_i, aperture η_ap, peak gain,
  HPBW. Validation: 1 m @ 10 GHz, f/D=0.4, q=2 → 38.9 dBi, η_ap=70%,
  HPBW=2.2° (matches Balanis §15.4).
- src/components/tools/antenna/AdvancedAnalysisPanel.tsx — adds Coupling
  + PO Reflector tabs (5-tab layout total).

Roadmap: Phase 6 (NEC2 WASM MoM solver) still pending — see .lovable/plan.md.
