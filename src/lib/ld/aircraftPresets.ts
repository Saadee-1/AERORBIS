/**
 * L/D Analyzer — Aircraft Presets (Phase 3)
 * Representative geometry / aero data. Public-domain approximations.
 */

export interface AircraftPreset {
  id: string;
  name: string;
  category: 'Sailplane' | 'GA' | 'Airliner' | 'UAV' | 'Fighter';
  airfoil: string;       // AirfoilKey hint
  wingArea: number;      // m²
  wingSpan: number;      // m
  oswaldEfficiency: number;
  airspeed: number;      // m/s (cruise)
  airDensity: number;    // kg/m³
  angleOfAttack: number; // deg
  TSFC?: number;         // 1/s
  BSFC?: number;         // kg/(W·s)
  eta_prop?: number;
  W0_N?: number;
  W1_N?: number;
  notes: string;
}

export const AIRCRAFT_PRESETS: AircraftPreset[] = [
  {
    id: 'asw27', name: 'Schleicher ASW 27 (Sailplane)', category: 'Sailplane',
    airfoil: 'DU 91-W2-250', wingArea: 9.0, wingSpan: 15.0, oswaldEfficiency: 0.92,
    airspeed: 30, airDensity: 1.225, angleOfAttack: 2,
    W0_N: 5000, W1_N: 5000,
    notes: 'High-performance 15 m sailplane, AR≈25, L/D ≈ 48',
  },
  {
    id: 'c172', name: 'Cessna 172 Skyhawk', category: 'GA',
    airfoil: 'NACA 2412', wingArea: 16.2, wingSpan: 11.0, oswaldEfficiency: 0.80,
    airspeed: 62, airDensity: 1.0, angleOfAttack: 3,
    BSFC: 7.5e-8, eta_prop: 0.80, W0_N: 11120, W1_N: 9000,
    notes: 'Classic trainer, cruise ~120 kt @ 8000 ft',
  },
  {
    id: 'b737', name: 'Boeing 737-800', category: 'Airliner',
    airfoil: 'Supercritical', wingArea: 124.6, wingSpan: 35.8, oswaldEfficiency: 0.78,
    airspeed: 230, airDensity: 0.38, angleOfAttack: 2,
    TSFC: 1.7e-5, W0_N: 750000, W1_N: 550000,
    notes: 'Narrow-body airliner, M0.78 @ FL350',
  },
  {
    id: 'rq4', name: 'RQ-4 Global Hawk (HALE UAV)', category: 'UAV',
    airfoil: 'FX 63-137', wingArea: 50.2, wingSpan: 39.9, oswaldEfficiency: 0.85,
    airspeed: 165, airDensity: 0.12, angleOfAttack: 2,
    TSFC: 1.5e-5, W0_N: 145000, W1_N: 70000,
    notes: 'High-altitude long-endurance, AR≈31',
  },
  {
    id: 'f16', name: 'F-16 Fighting Falcon', category: 'Fighter',
    airfoil: 'NACA 64A010', wingArea: 27.9, wingSpan: 9.96, oswaldEfficiency: 0.70,
    airspeed: 250, airDensity: 0.66, angleOfAttack: 2,
    TSFC: 2.5e-5, W0_N: 120000, W1_N: 95000,
    notes: 'Multirole fighter, low AR delta-wing influence',
  },
];