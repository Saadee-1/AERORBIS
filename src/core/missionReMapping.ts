/**
 * Mission to Reynolds number mapping
 * Defines the target Reynolds number for each mission type
 */

import type { MissionId } from "@/types/missionRecommendations";

/**
 * Get the target Reynolds number for a given mission
 */
export function getTargetReForMission(missionId: MissionId): number {
  switch (missionId) {
    case "micro_uav_lowre":
      return 100000;
    case "uav_endurance":
    case "trainer_ga":
    case "stol_hauler":
      return 500000;
    case "glider_sailplane":
      return 1000000;
    case "racer_highspeed":
    case "transport_supercrit":
      return 3000000;
    case "wind_turbine":
      return 500000; // mid-low Re for turbines
    case "aerobatic_symmetric":
      return 1000000; // moderate Re for aerobatic
    default:
      return 500000;
  }
}

