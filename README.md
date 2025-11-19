# Aircraft Stability & Control Derivatives Calculator

High-fidelity stability analysis based on Raymer, Roskam, Anderson, and USAF DATCOM formulations.

## Overview

This tool computes aerodynamic stability derivatives used in aircraft design, including longitudinal stability (pitching moment derivatives, neutral point, static margin), lateral/directional stability, and control surface effectiveness.

## Features

- **Longitudinal Stability**: C_mα, neutral point, static margin, tail volume coefficient
- **Lift Curve Slopes**: Wing and tail lift curve slopes with finite wing corrections
- **Downwash Analysis**: USAF DATCOM and Roskam empirical models
- **Control Derivatives**: Elevator, aileron, and rudder effectiveness
- **Tail Sizing**: Analysis and recommendations for tail volume
- **Performance Charts**: Cm vs α, stability margin vs CG, tail volume sizing
- **Aircraft Presets**: Common configurations (UAV, trainer, fighter, transport)
- **AI Integration**: Structured payloads for AI assistant explanations
- **PDF Export**: Complete calculation reports

## Physics & Formulas

### Core Calculations

#### 1. Wing Lift Curve Slope (Finite Wing)

```
a_w = a0 / (1 + a0/(π*e*AR))
```

Where:
- `a0` = Airfoil lift curve slope (typically 2π per radian)
- `AR` = Aspect ratio
- `e` = Wing efficiency (Oswald efficiency, 0.7-0.95)

#### 2. Tail Lift Curve Slope

```
a_t = η * a0 / (1 + a0/(π*e_t*AR_t))
```

Where:
- `η` = Tail effectiveness factor (typically 0.9)
- `e_t` = Tail efficiency
- `AR_t` = Tail aspect ratio

#### 3. Downwash Gradient

**USAF DATCOM:**
```
ε_α = 2*a_w / (π*AR)
```

**Roskam Empirical:**
```
ε_α = a_w / (π*AR) * (1.1 + AR/(AR+4))
```

#### 4. Tail Volume Coefficient

```
V_H = (S_t * l_t) / (S_w * c̄)
```

Where:
- `S_t` = Tail area (m²)
- `l_t` = Tail arm (m)
- `S_w` = Wing area (m²)
- `c̄` = Mean aerodynamic chord (m)

#### 5. Pitching Moment Derivative

**Wing contribution:**
```
C_mα,w = a_w * (x_cg - x_ac,w) / c̄
```

**Tail contribution:**
```
C_mα,t = -a_t * (1 - ε_α) * (S_t/S_w) * (l_t/c̄)
```

**Total:**
```
C_mα = C_mα,w + C_mα,t
```

#### 6. Neutral Point

```
x_np = x_ac,w + (a_t/a_w) * (1 - ε_α) * V_H * c̄
```

#### 7. Static Margin

```
SM = (x_np - x_cg) / c̄
```

Aircraft is stable if SM > 0.

#### 8. Control Derivatives

**Elevator:**
```
C_mδe = -η_t * a_t * (S_t/S_w) * (l_t/c̄) * τ_e
```

**Aileron (simplified DATCOM):**
```
C_lδa = K_a * (S_a/S_w)
```

**Rudder (simplified DATCOM):**
```
C_nδr = K_r * (S_r/S_v)
```

## Input Parameters

### Required

- **Wing Geometry**: S_w, AR, c̄, x_ac,w, x_cg
- **Tail Geometry**: S_t, AR_t, l_t

### Optional

- **Wing**: sweep_w, taper_w, b_w (for lateral stability)
- **Tail**: sweep_t, taper_t
- **Vertical Tail**: S_v, l_v (for directional stability)
- **Aerodynamics**: a0, e_w, e_t, η_t, downwash model
- **Control Surfaces**: S_e, τ_e, S_a, K_a, S_r, K_r

## Output Parameters

### Longitudinal Stability

- **a_w**: Wing lift curve slope (per rad)
- **a_t**: Tail lift curve slope (per rad)
- **ε_α**: Downwash gradient
- **V_H**: Tail volume coefficient
- **C_mα**: Total pitching moment derivative (per rad)
- **x_np**: Neutral point position (m)
- **SM**: Static margin

### Control Derivatives

- **C_mδe**: Elevator effectiveness (per rad)
- **C_lδa**: Aileron effectiveness (per rad)
- **C_nδr**: Rudder effectiveness (per rad)

### Lateral/Directional (Estimated)

- **C_lβ**: Lateral stability derivative (per rad)
- **C_nβ**: Directional stability derivative (per rad)

## Aircraft Presets

| Preset | Category | S_w (m²) | AR | V_H | Notes |
|--------|----------|----------|----|----|-------|
| Small UAV | UAV | 0.5 | 8 | ~0.6 | Representative small UAV |
| Trainer | Trainer | 15 | 7 | ~0.7 | Cessna 172-like |
| Fighter | Fighter | 50 | 3.5 | ~0.48 | F-16-like |
| Transport | Transport | 200 | 10 | ~0.9 | Boeing 737-like |
| General Aviation | GA | 20 | 7.5 | ~0.75 | Typical GA aircraft |

## Validation & Warnings

The tool validates inputs and provides warnings for:

- **Unstable Configuration**: SM < 0 → "Aircraft is statically unstable"
- **Marginal Stability**: |C_mα| < 0.05 → "Marginal stability detected"
- **Tail Volume**: V_H outside 0.5-1.2 range
- **CG Position**: Very far forward or aft relative to wing AC
- **Efficiency Factors**: Outside typical ranges

## Charts

- **Cm vs α**: Pitching moment coefficient vs angle of attack
- **Stability Margin vs CG**: SM variation with CG position
- **Tail Volume Sizing**: SM vs tail volume coefficient

## Assumptions & Limitations

### Current Implementation

- **Constant Lift Curve Slopes**: Assumes linear lift curves (no stall effects)
- **Simplified Downwash**: Uses DATCOM or Roskam models (not full 3D flow)
- **Ideal Tail**: Assumes tail operates in clean flow (no interference)
- **Control Surfaces**: Simplified DATCOM-style estimates (not detailed hinge moment analysis)
- **Lateral/Directional**: Simplified estimates (not full 6-DOF analysis)

### Future Enhancements

- **Nonlinear Effects**: Stall, compressibility, Mach effects
- **3D Flow Analysis**: Full downwash field calculation
- **Interference Effects**: Wing-tail interference, fuselage effects
- **Dynamic Derivatives**: C_mq, C_lp, C_nr with full calculations
- **Control Hinge Moments**: Detailed control surface analysis

## References

- **Raymer** - Aircraft Design: A Conceptual Approach
- **Roskam** - Airplane Design (Parts I-VIII)
- **Anderson** - Fundamentals of Aerodynamics
- **USAF DATCOM** - USAF Stability and Control DATCOM
- Standard stability and control theory (textbook formulas)

## File Structure

```
src/tools/stability/
├── index.tsx                 # Main tool UI
├── components/
│   ├── InputPanel.tsx       # Input form (tabbed)
│   ├── ResultsPanel.tsx     # Results display
│   ├── TailSizingPanel.tsx # Tail sizing analysis
│   └── ChartsPanel.tsx      # Performance charts
├── utils/
│   ├── calcStability.ts     # Core stability calculations
│   ├── aerodynamics.ts      # Aerodynamic relations
│   ├── units.ts             # Unit conversions
│   └── payloadBuilder.ts   # AI payload builder
├── data/
│   └── presets.ts           # Aircraft presets
├── validation/
│   └── schema.ts            # Input validation
└── tests/
    └── stability.spec.ts    # Unit tests
```

## Usage Example

```typescript
import { calculateStability } from './utils/calcStability';

const inputs = {
  S_w: 15,        // m²
  AR: 7,
  c_bar: 1.5,     // m
  x_ac_w: 0.375,  // m
  x_cg: 0.4,      // m
  S_t: 3.5,       // m²
  AR_t: 4.5,
  l_t: 4.5,       // m
};

const result = calculateStability(inputs);

console.log(`Static Margin: ${result.SM}`);
console.log(`Neutral Point: ${result.x_np} m`);
console.log(`C_mα: ${result.C_m_alpha} /rad`);
```

## Notes

- All calculations use SI units internally
- Results are engineering-accurate for preliminary design
- For production design, use validated tools or wind tunnel testing
- This tool is intended for educational and preliminary design purposes

