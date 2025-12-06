import type { MissionId } from "@/types/missionRecommendations";

export interface MissionMeta {
  id: MissionId;
  label: string;
  description: string;
}

export const MISSIONS: MissionMeta[] = [
  {
    id: "trainer_ga",
    label: "Trainer / GA",
    description: "Stable Cessna-like trainer, forgiving stall and predictable handling.",
  },
  {
    id: "stol_hauler",
    label: "STOL / Bush",
    description: "Short takeoff and landing, high lift and soft stall for rough strips.",
  },
  {
    id: "uav_endurance",
    label: "UAV – Endurance",
    description: "Long-loiter fixed-wing UAV with best L/D at mission Reynolds.",
  },
  {
    id: "racer_highspeed",
    label: "High-Speed Racer",
    description: "Low drag at higher speeds for pylon racers or fast RC aircraft.",
  },
  {
    id: "aerobatic_symmetric",
    label: "Aerobatic / Symmetric",
    description: "Symmetric profiles for aerobatics and inverted flight.",
  },
  {
    id: "glider_sailplane",
    label: "Glider / Sailplane",
    description: "Efficient polars and high L/D for soaring and thermal gliders.",
  },
  {
    id: "wind_turbine",
    label: "Wind Turbine",
    description: "High torque and off-design performance for turbine blades.",
  },
  {
    id: "transport_supercrit",
    label: "Transport / Supercritical",
    description: "Supercritical-style airfoils for efficient transport wings.",
  },
  {
    id: "micro_uav_lowre",
    label: "Micro UAV – Low Re",
    description: "Low Reynolds number performance for small fixed-wing UAVs.",
  },
];

