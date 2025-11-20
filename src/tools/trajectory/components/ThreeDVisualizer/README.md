# Cinematic 3D Trajectory Visualizer

High-fidelity 3D visualization system for rocket trajectory simulations.

## Features

- **Earth Rendering**: Realistic Earth sphere with textures, atmosphere glow, and clouds
- **Rocket Animation**: GLTF model support with procedural fallback
- **Trajectory Path**: Spline-based path visualization with colored segments
- **Event Markers**: Max-Q, MECO, stage separation, and custom markers
- **Camera Modes**: Follow, Chase, Ground, Orbital, Free, and Cinematic
- **Timeline Controls**: Play/pause, speed control, scrubbing, frame stepping
- **Post-Processing**: Bloom, depth of field, motion blur (when available)
- **Performance Modes**: Simple mode and low-power mode for older devices
- **Export**: Screenshot capture for PDF integration

## Usage

```tsx
import { ThreeDVisualizer } from './components/ThreeDVisualizer';

<ThreeDVisualizer
  planet={planet}
  result={simulationResult}
  mode="3D"
  onSnapshot={(base64) => {
    // Handle screenshot
  }}
/>
```

## Data Contract

The visualizer consumes `TrajectoryData`:

```typescript
interface TrajectoryFrame {
  t: number;
  pos: [number, number, number];
  vel: [number, number, number];
  attitude?: [number, number, number, number];
  mass?: number;
  stageIndex?: number;
  events?: string[];
}

interface TrajectoryData {
  frames: TrajectoryFrame[];
  metadata: {
    planet: string;
    coordFrame: 'ECEF' | 'ENU' | 'inertial';
    planetRadius?: number;
  };
}
```

## Custom Rocket Models

To use custom GLTF rocket models:

1. Place model files in `/public/models/rocket.gltf`
2. Name stage meshes: `stage0`, `stage1`, `booster0`, etc.
3. The visualizer will automatically map stages for separation animations

## Performance Tips

- Use `simpleMode` for low-end devices
- Enable `lowPowerMode` to disable post-processing
- Trajectory paths are automatically downsampled to 1000 points
- Earth geometry uses LOD based on camera distance

## Camera Modes

- **Follow**: Cinematic camera behind rocket
- **Chase**: Close-up trailing camera
- **Ground**: Fixed ground camera tracking rocket
- **Orbital**: Free orbital view
- **Free**: Manual orbit controls
- **Cinematic**: Pre-computed cinematic angles

## Settings Persistence

All visualizer settings are saved to `localStorage` under `trajectoryVisualizerSettings`.

## Future Enhancements

- Web Worker for geometry generation
- GPU particle systems for exhaust
- Animated recording (WebM export)
- Custom shader effects
- Multi-rocket support
