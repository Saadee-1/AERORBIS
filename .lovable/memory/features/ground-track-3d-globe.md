---
name: 3D Ground Track Globe
description: Mini rotating 3D Earth inset on the 2D ground track that expands to a fullscreen interactive globe with the orbital track wrapped around the sphere
type: feature
---

The Orbital Visualizer ground track has a 140×140 mini 3D globe inset in the top-right corner that auto-rotates and previews the orbital track wrapped around a procedurally shaded Earth (no external textures, pure Three.js shader with land/ocean/ice noise + atmosphere fresnel halo).

**Click the inset → fullscreen 3D globe**:
- Drag-to-rotate (pointer events, no OrbitControls dep)
- Scroll-to-zoom (clamped 1.6× – 6×)
- Auto-rotate toggle button
- "Back to 2D" button restores the flat Mercator view
- Stars background (1500 points) only in fullscreen for performance
- TubeGeometry tracks with additive-blended outer glow
- Pulsing halo ring on the selected launch pad
- Red sphere = live satellite sub-point (driven by same `currentTrueAnomaly` as the 2D map)

**File**: `src/components/tools/GroundTrack3DGlobe.tsx`. Uses plain `three@^0.160` (no @react-three/fiber dependency — keeps the bundle lean and matches the existing OrbitalVisualizer pattern). Inset and fullscreen are the SAME component with a `mode: 'inset' | 'fullscreen'` prop.

**Integration**: `OrbitalGroundTrack.tsx` keeps the existing 2D Mercator untouched (purely additive). The 3D inset is mounted in absolute position over the SVG; fullscreen is a portal-like overlay (`fixed inset-0 z-50`).

**Logic-freeze policy**: ✓. The 3D globe consumes the SAME tracks/sites computed by the existing 2D propagation — no orbital math is duplicated or re-derived.

**Performance**: 96-segment sphere in fullscreen, 48 in inset; geometries/materials disposed on unmount; resize observer for responsive canvas.
