/**
 * Nicolai weight estimation models
 * Based on "Fundamentals of Aircraft and Airship Design" by Leland M. Nicolai
 */

/**
 * Nicolai fixed equipment weight
 * Includes seating, oxygen, pressurization, HVAC, batteries, etc.
 */
export interface NicolaiFixedEquipmentInputs {
  n_seats: number; // Number of seats
  isPressurized: boolean;
  hasOxygen: boolean;
  hasHVAC: boolean;
  batteryCapacity?: number; // Ah (for electric aircraft)
  telemetry?: boolean;
  antennaPackage?: boolean;
  W_to: number; // Takeoff weight (N)
}

/**
 * Calculate fixed equipment weight using Nicolai models
 */
export function calculateNicolaiFixedEquipmentWeight(inputs: NicolaiFixedEquipmentInputs): number {
  const { n_seats, isPressurized, hasOxygen, hasHVAC, batteryCapacity, telemetry, antennaPackage, W_to } = inputs;
  
  const W_to_lbf = W_to / 4.44822;
  let W_equip_lbf = 0;
  
  // Seating weight
  W_equip_lbf += n_seats * 15; // ~15 lbf per seat (typical)
  
  // Pressurization system
  if (isPressurized) {
    W_equip_lbf += 0.02 * W_to_lbf; // ~2% of takeoff weight
  }
  
  // Oxygen system
  if (hasOxygen) {
    W_equip_lbf += n_seats * 5; // ~5 lbf per person
  }
  
  // HVAC system
  if (hasHVAC) {
    W_equip_lbf += 0.015 * W_to_lbf; // ~1.5% of takeoff weight
  }
  
  // Battery weight (for electric aircraft)
  if (batteryCapacity) {
    // Typical Li-ion: ~150 Wh/kg = ~0.15 kWh/kg
    // Weight = capacity (Ah) * voltage (V) / (0.15 kWh/kg * 2.2 lb/kg)
    // Assuming 48V system
    const batteryWeight_kg = (batteryCapacity * 48) / (0.15 * 1000);
    W_equip_lbf += batteryWeight_kg * 2.20462;
  }
  
  // Telemetry system
  if (telemetry) {
    W_equip_lbf += 20; // ~20 lbf
  }
  
  // Antenna package
  if (antennaPackage) {
    W_equip_lbf += 15; // ~15 lbf
  }
  
  return W_equip_lbf * 4.44822;
}

/**
 * Nicolai engine weight (alternative models)
 */
export function calculateNicolaiEngineWeight(
  power: number, // Power (W) or Thrust (N)
  engineType: 'piston' | 'turbofan' | 'turbojet' | 'electric',
  includeNacelle: boolean = true,
  includePylon: boolean = true,
  includeMounts: boolean = true
): number {
  let W_eng_N = 0;
  
  if (engineType === 'piston') {
    // Piston: W = 2.575 * P^0.922 (P in hp, W in lbf)
    const P_hp = power / 745.7; // W to hp
    const W_eng_lbf = 2.575 * Math.pow(P_hp, 0.922);
    W_eng_N = W_eng_lbf * 4.44822;
  } else if (engineType === 'turbofan' || engineType === 'turbojet') {
    // Turbofan/Turbojet: W = 0.521 * T^0.9 (T in lbf, W in lbf)
    const T_lbf = power / 4.44822; // N to lbf
    const W_eng_lbf = 0.521 * Math.pow(T_lbf, 0.9);
    W_eng_N = W_eng_lbf * 4.44822;
  } else if (engineType === 'electric') {
    // Electric motor: ~2-4 kg/kW (lightweight)
    const P_kW = power / 1000;
    const specificWeight = 3.0; // kg/kW (typical)
    W_eng_N = P_kW * specificWeight * 9.81;
  }
  
  // Add nacelle weight (~10-15% of engine weight)
  if (includeNacelle) {
    W_eng_N *= 1.12;
  }
  
  // Add pylon weight (~5% of engine weight)
  if (includePylon) {
    W_eng_N *= 1.05;
  }
  
  // Add engine mounts (~3% of engine weight)
  if (includeMounts) {
    W_eng_N *= 1.03;
  }
  
  return W_eng_N;
}
