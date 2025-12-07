import type { MissionId } from "@/types/missionRecommendations";

/**
 * Mission preset with enhanced UX metadata
 */
export interface MissionPreset {
  id: MissionId; // Maps to existing MissionId for scoring compatibility
  label: string; // Full display label
  emoji: string; // Emoji icon
  shortLabel: string; // Compact label for chips/badges
  description: string; // 1-line friendly description
  engineeringHint: string; // Used by engineering mode for wording
}

/**
 * Mission presets with enhanced UX
 * These map to existing MissionId values to maintain scoring compatibility
 */
export const MISSION_PRESETS: MissionPreset[] = [
  {
    id: "trainer_ga",
    label: "Trainer / GA",
    emoji: "🛩️",
    shortLabel: "Trainer",
    description: "Stable Cessna-like trainer with forgiving stall and predictable handling.",
    engineeringHint: "Balanced L/D and gentle stall for predictable handling",
  },
  {
    id: "stol_hauler",
    label: "STOL / Slow UAV",
    emoji: "🛬",
    shortLabel: "STOL",
    description: "High lift at low speed, strong climb and short-field capability.",
    engineeringHint: "High CLmax and soft stall for short-field operations",
  },
  {
    id: "glider_sailplane",
    label: "Glider / Endurance",
    emoji: "🕊️",
    shortLabel: "Glider",
    description: "Maximize L/D and low drag for long-duration cruise.",
    engineeringHint: "Maximum L/D and low drag for endurance",
  },
  {
    id: "racer_highspeed",
    label: "Fast Cruise",
    emoji: "✈️",
    shortLabel: "Fast Cruise",
    description: "Laminar, low drag at higher speeds, moderate stall margin.",
    engineeringHint: "Low drag and laminar flow for high-speed efficiency",
  },
  {
    id: "aerobatic_symmetric",
    label: "Acro / Symmetric",
    emoji: "🎯",
    shortLabel: "Acro",
    description: "Symmetric, predictable behavior in positive/negative alpha.",
    engineeringHint: "Symmetric profile with stable pitching moment",
  },
  {
    id: "uav_endurance",
    label: "UAV Endurance",
    emoji: "🛸",
    shortLabel: "UAV",
    description: "Long-loiter fixed-wing UAV with best L/D at mission Reynolds.",
    engineeringHint: "High L/D at target Reynolds for long endurance",
  },
  {
    id: "micro_uav_lowre",
    label: "Micro UAV",
    emoji: "🐝",
    shortLabel: "Micro UAV",
    description: "Low Reynolds number performance for small fixed-wing UAVs.",
    engineeringHint: "Good lift and L/D at very low Reynolds numbers",
  },
  {
    id: "wind_turbine",
    label: "Wind Turbine",
    emoji: "🌪️",
    shortLabel: "Turbine",
    description: "High torque and off-design performance for turbine blades.",
    engineeringHint: "Strong lift with reasonable drag for turbine applications",
  },
  {
    id: "transport_supercrit",
    label: "Transport / Supercritical",
    emoji: "🛫",
    shortLabel: "Transport",
    description: "Supercritical-style airfoils for efficient transport wings.",
    engineeringHint: "Low drag and stable pitching moment for transport efficiency",
  },
];

/**
 * Get a mission preset by its ID
 */
export function getMissionById(id: MissionId): MissionPreset | undefined {
  return MISSION_PRESETS.find(preset => preset.id === id);
}

/**
 * Legacy MissionMeta interface for backward compatibility
 * @deprecated Use MissionPreset instead
 */
export interface MissionMeta {
  id: MissionId;
  label: string;
  description: string;
}

/**
 * Legacy MISSIONS array for backward compatibility
 * @deprecated Use MISSION_PRESETS instead
 */
export const MISSIONS: MissionMeta[] = MISSION_PRESETS.map(preset => ({
  id: preset.id,
  label: preset.label,
  description: preset.description,
}));
