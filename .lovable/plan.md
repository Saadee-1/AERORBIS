
# Antenna Pattern Analyzer — Upgrade Roadmap

Goal: take the analyzer from **7.2/10 (closed-form analytic)** to **9.5/10 (research-grade numerical EM)** without breaking existing physics (logic-freeze policy applies — we only **add** layers, never refactor existing Balanis formulas).

Execution is split into **3 tiers / 6 phases**. Each phase is independently shippable and gated behind a UI mode toggle so beginner users still see the simple analyzer.

---

## Tier 1 — Engineering Quick Wins (Phases 1–3)

Pure JS/TS, no WASM, low risk. Big perceived value.

### Phase 1 — Frequency Sweep & Bandwidth Analysis
**What**: Instead of one frequency, sweep across a band (e.g. 2.0–3.0 GHz, 50 points) and plot Gain / HPBW / SLL vs frequency.

**Files**
- `src/lib/antenna/sweep.ts` *(new)* — `runFrequencySweep(antennaId, params, fMin, fMax, steps)`
- `src/components/tools/antenna/FrequencySweepPanel.tsx` *(new)* — Chart.js line chart with 3 series (Gain, HPBW, FBR)
- `src/components/tools/AntennaPatternAnalyzer.tsx` — add "Bandwidth Analysis" tab (Expert mode only)

**Outputs**: −3 dB bandwidth, fractional bandwidth %, gain flatness.

### Phase 2 — Polarization Engine (RHCP/LHCP, Axial Ratio)
**What**: Decompose far-field into Eθ and Eφ complex components, compute axial ratio, tilt angle, and CP purity. Currently polarization is just a string label.

**Files**
- `src/lib/antenna/polarization.ts` *(new)* — `decomposePolarization(Etheta, Ephi)` returns `{axialRatio_dB, tiltAngle_deg, sense: 'RHCP'|'LHCP'|'Linear', xpd_dB}`
- `src/lib/antenna/models-enhanced.ts` — extend `AntennaPatternResult` with optional `polarization: { axialRatio[][], sense, xpd }` (additive, non-breaking)
- `src/components/tools/antenna/PolarizationPanel.tsx` *(new)* — axial-ratio contour + Poincaré sphere (Three.js, reuse existing scene)

### Phase 3 — Link Budget Integration (Friis + ITU-R P.618)
**What**: Connect computed EIRP to a full link budget — free space path loss, atmospheric absorption, rain fade, antenna noise temperature → C/N₀ and Eb/N₀.

**Files**
- `src/lib/antenna/linkBudget.ts` *(new)* — Friis equation + ITU-R P.676 (gaseous) + P.618 (rain) + G/T calc
- `src/components/tools/antenna/LinkBudgetPanel.tsx` *(new)* — inputs: distance, RX antenna G/T, modulation; outputs: margin (dB), max range
- Cross-link to **Orbital Visualizer** (slant range from selected satellite) via `useToolContext` — auto-fill distance when satellite selected.

---

## Tier 2 — Advanced Engineering (Phases 4–5)

Higher fidelity, still pure JS. This is where rating jumps to ~8.7/10.

### Phase 4 — Mutual Coupling for Arrays (Carter's Method)
**What**: Currently arrays assume isolated elements (gain = element × array factor). Real arrays have mutual impedance between elements, which detunes them and reduces gain at scan angles. Implement Carter's closed-form mutual impedance for parallel dipoles.

**Files**
- `src/lib/antenna/coupling.ts` *(new)*
  - `mutualImpedanceMatrix(N, spacing_λ)` → N×N complex matrix using Carter's sine/cosine integrals (Si, Ci)
  - `activeElementPattern(Z, excitation)` → corrected element excitations
- `src/lib/antenna/models-enhanced.ts` — wire into `phasedArray` and `dipoleArray` types (gated by `options.includeMutualCoupling`)
- `src/components/tools/AntennaPatternAnalyzer.tsx` — checkbox "Include mutual coupling (Carter)" in Expert mode

**Validation**: cross-check against Balanis Table 8.8 (2-element λ/2 dipole, d=0.5λ → Z₂₁ = -12.52 + j29.91 Ω).

### Phase 5 — Physical Optics (PO) for Reflectors
**What**: Parabolic / Cassegrain reflector patterns currently use aperture approximation (sinc²). Replace with proper PO surface-current integration: feed illuminates reflector → induced currents Js = 2n̂×Hi → far-field via radiation integral.

**Files**
- `src/lib/antenna/po.ts` *(new)*
  - `meshReflector(diameter, focalLength, type)` → triangular surface mesh
  - `computeInducedCurrents(mesh, feedPattern, freq)` → Js per facet
  - `radiateFarField(currents, observationGrid)` → E(θ,φ)
- Integrate behind `computeMode: "accurate"` for parabolic / Cassegrain / offset-fed types
- Add **edge taper**, **spillover efficiency**, **aperture efficiency** outputs

**Performance**: mesh capped at ~2000 facets; run in a Web Worker (`src/workers/antennaPO.worker.ts`) to keep UI smooth. Show progress bar (reuse existing CalculationOverlay).

---

## Tier 3 — Research-Grade Numerical EM (Phase 6)

This is the leap to **9.5/10** — true Maxwell solver in the browser.

### Phase 6 — NEC2 Method-of-Moments via WebAssembly
**What**: Compile **NEC2C** (open-source C port of Numerical Electromagnetics Code, the same kernel EZNEC and 4nec2 use) to WASM. User can input wire geometry → solver computes current distribution by solving the Pocklington/Hallén integral equation → exact pattern, impedance, S-parameters, VSWR.

**Approach**
- Use existing Lovable WASM workflow (see `<exec-webassembly>`): `nix shell nixpkgs#emscripten` → `emcc nec2c/*.c -O3 -sMODULARIZE -sEXPORT_ES6 -sWASM_BIGINT=1 -o src/lib/wasm/nec2.js`
- Output binary to `public/wasm/nec2_bg.wasm` (~400 KB after `wasm-opt -Oz`)
- Source: `https://github.com/KJ7LNW/nec2c` (GPL-compatible)

**Files**
- `public/wasm/nec2.wasm` — compiled binary
- `src/lib/wasm/nec2/index.ts` — TS wrapper, lazy-loaded
- `src/lib/antenna/nec2Adapter.ts` — convert antenna registry params → NEC2 card deck (GW wire cards, EX excitation, FR frequency, RP radiation pattern)
- `src/workers/nec2.worker.ts` — runs solver off main thread
- `src/components/tools/antenna/MoMPanel.tsx` — Expert-only "MoM Solver" tab with:
  - Impedance plot (R+jX vs frequency)
  - VSWR / S11 (Smith chart via custom canvas)
  - Current distribution along wire
  - Comparison overlay: analytic vs MoM pattern

**Scope limit**: only enable for wire antennas (dipole, Yagi, log-periodic, loop, helix). Aperture / horn / reflector types stay on PO from Phase 5.

**Validation**: half-wave dipole at 300 MHz → Zin ≈ 73 + j42 Ω, gain = 2.15 dBi (textbook reference).

---

## Cross-cutting work

### Mode gating (applies to all phases)
The Antenna Analyzer follows the existing **Beginner / University / Expert** tier pattern (see `mem://features/orbital-visualizer-mode-tiers`):
- **Beginner**: only Phase 1 visible (gain vs freq slider, no jargon)
- **University**: Phases 1–3 (sweep, polarization, link budget)
- **Expert**: Phases 1–6 unlocked, including MoM solver and PO mesh viewer

### Memory updates (after each phase)
Create `mem://features/antenna-{phase-name}` with the formulas added, and update `mem://index.md`.

### Logic freeze compliance
**No existing function in `math.ts` or `models-enhanced.ts` is modified.** All new physics goes into new files and is opt-in via flags. The current 7.2/10 analyzer remains untouched as the default fast path.

---

## Suggested rollout order

| Phase | Effort | Rating after | Ship as |
|---|---|---|---|
| 1 — Frequency sweep | S | 7.6 | PR #1 |
| 2 — Polarization engine | M | 8.0 | PR #2 |
| 3 — Link budget | M | 8.4 | PR #3 |
| 4 — Mutual coupling | M | 8.7 | PR #4 |
| 5 — PO reflectors | L | 9.0 | PR #5 (worker) |
| 6 — NEC2 WASM | XL | 9.5 | PR #6 (WASM build) |

---

## What I'd like confirmed before starting

1. **Start with Phase 1 only?** Or batch Phases 1–3 (Tier 1) into a single delivery since they share the new "Antenna Tabs" UI shell?
2. **Phase 6 licensing**: NEC2C is GPL. Acceptable to ship as WASM in your project, or do you prefer the more permissive **MININEC** kernel (less accurate but BSD-licensed)?
3. **Default compute mode**: should Expert mode default to MoM (slower, accurate) or stay on analytic with MoM as a "Run high-fidelity" button?
