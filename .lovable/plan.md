
## Plan: Add Beginner / University / Expert Modes to Orbital Path Visualizer

Mirror the exact pattern used in Wing Loading, L/D, Thrust Loading, and Climb Performance calculators — physics stays frozen (per logic-freeze policy), only UI complexity changes by mode.

### Mode definitions

**Beginner** — for school / freshman students
- Inputs shown: Periapsis Altitude, Eccentricity, Inclination only (RAAN, ω, ν auto-default to 0)
- Hide: Central body radius / GM (locked to Earth), Target altitude / Hohmann section
- Results: Orbital Period, Apoapsis, Periapsis, Orbital Velocity — with plain-English one-line explanations
- Hide: `OrbitalGroundTrack`, `OrbitalAdvancedPanel`, save/load presets
- 3D view: keep (it's the visual hook for beginners) but with simplified label overlay

**University** — default mode
- All Keplerian inputs (a, e, i, Ω, ω, ν), unit selector, presets (LEO/GEO/Molniya), save/load
- Show: 3D view + `OrbitalGroundTrack` + Hohmann transfer calculator
- Hide: `OrbitalAdvancedPanel` (J2, Lambert, gravity assist, Gauss OD, low-thrust, pork-chop)
- Results include step-by-step derivations

**Expert** — research / professional
- Everything in University **plus** full `OrbitalAdvancedPanel` (J2 perturbations, plane changes, bi-elliptic, phasing, Lambert solver, interplanetary Hohmann, pork-chop plot, gravity assist, launch C3, low-thrust optimizer, Gauss orbit determination with Monte Carlo)

### Implementation (single file: `src/components/tools/OrbitalVisualizer.tsx`)

1. Add `type CalculatorMode = 'Beginner' | 'University' | 'Expert'` and `useState` (default `'University'`), persisted to `localStorage` with `aerorbis_` prefix per memory standard.
2. Add a "Calculator Mode" `AeroCard` with `Select` at the top of inputs — same copy/layout as `WingLoadingCalculator` lines 1016-1040 for visual consistency.
3. Wrap conditional sections:
   - Beginner-only defaults: force RAAN/ω/ν inputs hidden, set values to "0" internally
   - `{calculatorMode !== 'Beginner' && <Hohmann transfer card />}`
   - `{calculatorMode !== 'Beginner' && <OrbitalGroundTrack />}` (line ~1432)
   - `{calculatorMode === 'Expert' && <OrbitalAdvancedPanel />}` (line ~1463)
   - Save/Load presets dialog: hidden in Beginner
4. Add a small "Plain English" interpretation block in the results card that only renders in Beginner mode (e.g. "Your satellite circles Earth once every X minutes at an average height of Y km").
5. **No physics changes** — all formulas, Three.js scene, Kepler propagation, shaders untouched (logic-freeze policy).
6. Save a memory note: `mem://features/orbital-visualizer-mode-tiers` documenting the three-tier breakdown so it stays consistent with sibling calculators.

### Files touched
- `src/components/tools/OrbitalVisualizer.tsx` (UI gating + mode selector + localStorage)
- `mem://features/orbital-visualizer-mode-tiers` (new memory)
- `mem://index.md` (add reference line)

### Out of scope
- No changes to `OrbitalAdvancedPanel.tsx`, `OrbitalGroundTrack.tsx`, or any physics utility
- No new tool routes — single tool, three views
