

## Plan: Rewrite Welcome Animation (Pure CSS/Framer Motion)

### Problem
The current `HeroIntro` uses Three.js (`@react-three/fiber`, `Canvas`, `Sphere`, `MeshDistortMaterial`) for a 3D globe, which is heavy and likely causing the blank screen on mobile devices. The Three.js canvas may fail to initialize silently.

### Solution
Replace `HeroIntro.tsx` with a lightweight, purely CSS + Framer Motion based welcome animation that is reliable across all devices. No Three.js dependency.

### Animation Sequence (4.5s total)

1. **Phase 1 (0-0.8s)**: Dark background fades in with particle field and scan grid
2. **Phase 2 (0.5-1.5s)**: Aerorbis logo scales in with a glowing pulse ring expanding outward
3. **Phase 3 (1.0-2.0s)**: "AERORBIS" title types in letter-by-letter with holographic flicker, glowing underline sweeps across
4. **Phase 4 (1.5-2.5s)**: Slogan "Where Aerospace Minds Connect" fades up with tracking animation
5. **Phase 5 (2.0-3.5s)**: Orbital ring CSS animation spins around the logo, boot sequence text appears
6. **Phase 6 (3.5-4.5s)**: Everything fades out with scale + blur, transitions to main app

### Visual Elements (no Three.js)
- **CSS orbital rings**: Animated `border` circles rotating via CSS transforms around the logo
- **Particle dots**: Small animated dots floating upward (Framer Motion)
- **Glow pulse**: Radial gradient behind logo that pulses
- **HUD frame**: Corner brackets + system status text (keep existing)
- **Scan line**: Horizontal sweep (keep existing)
- **Loading bar**: Segmented progress indicator

### Files to Modify
1. **`src/components/HeroIntro.tsx`** — Full rewrite removing all Three.js imports, replacing with pure Framer Motion + CSS animations. Keep the same props interface and integration with App.tsx.

### Technical Notes
- Removes dependency on `Canvas`, `useFrame`, `Sphere`, `MeshDistortMaterial`, `THREE` from this component
- Uses only `framer-motion` and `gsap` (both already installed)
- The logo asset `@/assets/aerorbis-logo-refined.png` is kept
- App.tsx integration stays the same (no changes needed there)

