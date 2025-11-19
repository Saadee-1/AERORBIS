# Rocket Engine Performance & Nozzle Flow Calculator

High-fidelity isentropic flow analysis with practical corrections for chemical and electric rocket engines.

## Overview

This tool computes thrust, mass flow, specific impulse, characteristic velocity (c*), nozzle exit Mach number and pressure, and related performance metrics using isentropic flow theory with practical correction factors.

## Physics & Formulas

### Core Calculations

1. **Characteristic Velocity (c*)**
   - Choked mass flux: `G₀ = (Pc/√Tc) * √(γ/R) * [((γ+1)/2)^{-(γ+1)/(2(γ-1))}]`
   - Mass flow: `ṁ = G₀ * At * η_c*`
   - Characteristic velocity: `c* = (Pc * At) / ṁ`

2. **Area-Mach Relation**
   - `A/A* = (1/M) * [ (2/(γ+1)) * (1 + (γ-1)/2 * M²) ]^{(γ+1)/(2(γ-1))}`
   - Solved numerically using Newton-Raphson with bisection fallback

3. **Isentropic Pressure Ratio**
   - `Pe/Pc = (1 + (γ-1)/2 * Me²)^{-γ/(γ-1)}`

4. **Exit Velocity**
   - `Ve = √[(2γ/(γ-1)) * R * Tc * (1 - (Pe/Pc)^{(γ-1)/γ})] * η_nozzle`

5. **Thrust**
   - `T = ṁ * Ve + (Pe - Pa) * Ae`
   - Thrust coefficient: `Cf = T / (Pc * At)`

6. **Specific Impulse**
   - `Isp = Ve / g₀`
   - Vacuum Isp includes pressure term: `Isp_vac = (Ve + Pe*Ae/ṁ) / g₀`

### Numerical Methods

- **Newton-Raphson Solver**: Primary method for solving area-Mach relation
- **Bisection Fallback**: Used when Newton-Raphson fails or goes out of bounds
- **Convergence**: Tolerance 1e-8 relative, max 100 iterations

### Correction Factors

- **Nozzle Efficiency (η_nozzle)**: Accounts for non-ideal energy conversion (default: 0.98)
- **c* Efficiency (η_c*)**: Combustion efficiency (default: 0.95)
- **Pressure Loss**: Fractional loss in chamber pressure (default: 0.02)

## Input Parameters

### Required
- **Pc**: Chamber pressure (Pa or bar)
- **Tc**: Chamber temperature (K)
- **At**: Throat area (m² or cm²)
- **ε or Ae**: Expansion ratio or exit area
- **Pa**: Ambient pressure (Pa or bar)
- **γ**: Ratio of specific heats
- **M_molar or R**: Molar mass (kg/kmol) or specific gas constant (J/(kg·K))

### Optional
- **η_nozzle**: Nozzle efficiency (0-1, default: 0.98)
- **η_c***: Characteristic velocity efficiency (0-1, default: 0.95)
- **pressureLossFraction**: Pressure loss (0-1, default: 0.02)
- **useCEA**: Placeholder for CEA integration (future)
- **useFrozen**: Placeholder for frozen vs equilibrium flow (future)

## Outputs

### Performance Metrics
- Mass flow rate (ṁ) - kg/s
- Characteristic velocity (c*) - m/s
- Exit Mach number (Me)
- Exit static pressure (Pe) - Pa/bar
- Exit velocity (Ve) - m/s
- Thrust (T) - N/kN
- Thrust coefficient (Cf)
- Specific impulse (Isp) - seconds
- Vacuum Isp - seconds

### Diagnostics
- Choking status
- Overexpansion/underexpansion detection
- Solver convergence diagnostics
- Warnings for unusual conditions

## Presets

### Propellants
- LOX/RP-1 (Merlin, F-1, RD-180)
- LOX/LH2 (RS-25, RL10)
- LOX/CH4 (Raptor, BE-4)
- N2O/HTPB (Hybrid)
- Hydrazine (Monopropellant)
- APCP (Solid)

### Engines
- Merlin-like (LOX/RP-1, sea-level optimized)
- RS-25-like (LOX/LH2, high-performance)
- RL10-like (LOX/LH2, vacuum-optimized)
- Raptor-like (LOX/CH4, full-flow staged)
- Small solid motor
- Small hybrid motor

## Parameter Sweeps

The tool supports three types of parameter sweeps:

1. **Altitude Sweep**: Varies ambient pressure (altitude) to show thrust vs altitude
2. **Expansion Ratio Sweep**: Varies ε to optimize Isp vs expansion ratio
3. **Chamber Pressure Sweep**: Varies Pc to show mass flow and performance trends

## Assumptions & Limitations

### Current Implementation
- **Isentropic flow**: Assumes reversible, adiabatic expansion
- **Constant γ**: Uses constant ratio of specific heats (real gases vary with temperature)
- **Ideal gas**: Assumes ideal gas behavior
- **One-dimensional**: Assumes uniform flow properties at each cross-section

### Future Enhancements
- **CEA Integration**: Real gas properties from NASA CEA
- **Variable γ**: Temperature-dependent specific heats
- **Two-phase flow**: Condensation effects
- **Multi-propellant**: Complex combustion chemistry
- **Time-dependent**: Throttling and transient analysis

## References

- **Sutton & Biblarz** - Rocket Propulsion Elements
- **Anderson** - Modern Compressible Flow
- **NASA CEA** - Chemical Equilibrium with Applications
- Standard isentropic flow relations (textbook formulas)

## Test Cases

See `tests/rocketEngine.spec.ts` for verification cases:
- Simple reference case
- Vacuum vs sea-level comparison
- Area-Mach solver accuracy
- Overexpansion detection
- Merlin-like configuration
- Solver convergence tests
- Mass flow sanity checks

## Usage Example

```typescript
import { calculateRocketEngine } from './utils/calcEngine';

const inputs = {
  Pc: 9.7e6,      // 97 bar
  Tc: 3500,       // K
  At: 0.5,        // m²
  epsilon: 16,    // Expansion ratio
  Pa: 101325,     // Sea level
  gamma: 1.22,
  M_molar: 22.0,
};

const results = calculateRocketEngine(inputs);
console.log(`Thrust: ${results.T / 1000} kN`);
console.log(`Isp: ${results.Isp} s`);
```

